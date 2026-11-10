/**
 * Cloudflare Pages Edge Middleware
 * High-Performance Anti-DDoS, Edge Rate Limiter & Zero-Usage Shield
 * 
 * Features:
 * 1. Global in-memory rate-limiter (Sliding Window per IP).
 * 2. Instant Zero-Usage Drop (HTTP 429 / 403 with 0 bytes body, Connection: close)
 *    so attacks NEVER hit functions, consume D1 reads, or exhaust execution time.
 * 3. In-memory TTL cache for D1 ban list (refreshed every 60s instead of EVERY request).
 * 4. Bot & malformed probe heuristics (empty UA probes, scanner paths like .env, wp-login, etc.)
 */

// ── In-Memory Edge State (persists across requests on the same Cloudflare Edge isolate) ──
const IP_RATE_LIMITS = new Map(); // ip -> { count: number, resetAt: number, penaltyLevel: number }
const AUTO_BANNED_IPS = new Map(); // ip -> banExpiresAt (timestamp)

let CACHED_BLOCKED_SET = new Set();
let LAST_BLOCKED_FETCH_MS = 0;
const CACHE_TTL_MS = 60 * 1000; // 60s memory cache for D1 ban list

// ── DDoS Defense Thresholds (Tailored for Career Fair Exhibition) ──
const RATE_WINDOW_MS = 10 * 1000;      // 10-second sliding inspection window
const MAX_REQUESTS_PER_WINDOW = 60;    // Max 60 requests per 10s (~6 req/s is normal human surfing)
const BURST_BAN_THRESHOLD = 120;       // >120 requests in 10s = automated DDoS attack -> instant 2-hour auto-ban
const BAN_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours temporary ban

// Malicious scanning path triggers (common automated exploit scanners)
const SUSPICIOUS_PATTERNS = [
  /\/\.env/i,
  /\/wp-admin/i,
  /\/wp-login/i,
  /\/xmlrpc\.php/i,
  /\/\.git/i,
  /\/actuator/i,
  /\/swagger/i,
  /\/cgi-bin/i,
  /\/etc\/passwd/i,
  /\/phpinfo/i
];

function resolveMiddlewareD1(env) {
  if (!env || typeof env !== 'object') return null;
  const candidateKeys = [
    'DB', 'db', 'DATABASE', 'database', 'D1', 'd1',
    'careerfair', 'CAREERFAIR', 'careerfair_db', 'careerfair-db',
    'CAREERFAIR_DB', 'careerfairdb', 'CAREERFAIRDB',
    'career_fair', 'career-fair', 'CAREER_FAIR',
    'career_fair_db', 'career-fair-db', 'CAREER_FAIR_DB'
  ];
  for (const k of candidateKeys) {
    try {
      const val = env[k];
      if (val && typeof val === 'object' && typeof val.prepare === 'function') {
        return val;
      }
    } catch {}
  }
  return null;
}

function getEdgeClientIp(req) {
  const raw = req.headers.get('cf-connecting-ip')
    || (req.headers.get('x-forwarded-for') || '').split(',')[0]
    || req.headers.get('x-real-ip')
    || '';
  return raw.trim();
}

/**
 * Periodically sync with D1 without querying on every single request
 */
async function getBlockedSetCached(db) {
  const now = Date.now();
  if (now - LAST_BLOCKED_FETCH_MS < CACHE_TTL_MS && CACHED_BLOCKED_SET.size > 0) {
    return CACHED_BLOCKED_SET;
  }

  if (!db) return CACHED_BLOCKED_SET;

  try {
    const rows = await db
      .prepare("SELECT k, v FROM kv WHERE k IN ('banned_ips', 'admin_blocked_ips')")
      .all();
    const freshSet = new Set();
    for (const row of (rows?.results || [])) {
      if (!row?.v) continue;
      try {
        const parsed = JSON.parse(row.v);
        if (Array.isArray(parsed)) {
          for (const ip of parsed) {
            if (typeof ip === 'string' && ip.trim()) freshSet.add(ip.trim());
          }
        }
      } catch {}
    }
    CACHED_BLOCKED_SET = freshSet;
    LAST_BLOCKED_FETCH_MS = now;
  } catch {
    // Fail silently, keep existing set
  }
  return CACHED_BLOCKED_SET;
}

export async function onRequest(context) {
  const { request, env, next } = context;

  // Never block CORS preflight
  if (request.method === 'OPTIONS') {
    return next();
  }

  const clientIp = getEdgeClientIp(request);
  const now = Date.now();

  if (clientIp) {
    // ─────────────────────────────────────────────────────────────
    // 1. FAST-DROP: Check Temporary DDoS Auto-Ban in Memory
    // ─────────────────────────────────────────────────────────────
    const autoBanUntil = AUTO_BANNED_IPS.get(clientIp);
    if (autoBanUntil) {
      if (now < autoBanUntil) {
        // Drop with 0 bytes body to save bandwidth and compute
        return new Response(null, {
          status: 429,
          statusText: "Too Many Requests - DDoS Protection Triggered",
          headers: {
            "Connection": "close",
            "Retry-After": "7200",
            "Cache-Control": "no-store",
            "X-DDoS-Protection": "Auto-Banned"
          }
        });
      } else {
        // Ban expired
        AUTO_BANNED_IPS.delete(clientIp);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. SCANNER / PROBE TRAP: Immediate Drop
    // ─────────────────────────────────────────────────────────────
    const url = new URL(request.url);
    const pathname = url.pathname;
    const isScanner = SUSPICIOUS_PATTERNS.some(pat => pat.test(pathname));
    if (isScanner) {
      AUTO_BANNED_IPS.set(clientIp, now + BAN_DURATION_MS);
      return new Response(null, {
        status: 403,
        statusText: "Forbidden",
        headers: { "Connection": "close", "Cache-Control": "no-store" }
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 3. SLIDING-WINDOW DDoS RATE LIMITER (In-Memory, 0 DB Reads)
    // ─────────────────────────────────────────────────────────────
    let tracker = IP_RATE_LIMITS.get(clientIp);
    if (!tracker || now > tracker.resetAt) {
      tracker = { count: 1, resetAt: now + RATE_WINDOW_MS, penaltyLevel: tracker?.penaltyLevel || 0 };
      IP_RATE_LIMITS.set(clientIp, tracker);
    } else {
      tracker.count++;
      
      // Clean up old entries from map to prevent memory leak
      if (IP_RATE_LIMITS.size > 2000) {
        for (const [ipKey, entry] of IP_RATE_LIMITS.entries()) {
          if (now > entry.resetAt) IP_RATE_LIMITS.delete(ipKey);
        }
      }

      // Check if requests exceed extreme DDoS flood limit -> AUTO-BAN
      if (tracker.count > BURST_BAN_THRESHOLD) {
        AUTO_BANNED_IPS.set(clientIp, now + BAN_DURATION_MS);
        return new Response(null, {
          status: 429,
          statusText: "Too Many Requests - DDoS Auto-Ban Triggered",
          headers: {
            "Connection": "close",
            "Retry-After": "7200",
            "Cache-Control": "no-store"
          }
        });
      }

      // Check if requests exceed normal high-rate window limit -> SOFT THROTTLE
      if (tracker.count > MAX_REQUESTS_PER_WINDOW) {
        return new Response(
          JSON.stringify({
            error: "Too many requests. Please slow down to protect system resources.",
            retry_after_seconds: Math.ceil((tracker.resetAt - now) / 1000)
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(Math.ceil((tracker.resetAt - now) / 1000)),
              "Cache-Control": "no-store"
            }
          }
        );
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 4. PERSISTENT BAN CHECK (From D1 cached with 60s TTL)
    // ─────────────────────────────────────────────────────────────
    const db = resolveMiddlewareD1(env);
    if (db) {
      const blockedSet = await getBlockedSetCached(db);
      if (blockedSet.has(clientIp)) {
        if (pathname.startsWith('/api/')) {
          return new Response(
            JSON.stringify({
              error: `Access Denied: Your IP address (${clientIp}) has been restricted across this site.`,
              banned: true
            }),
            {
              status: 403,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-store'
              }
            }
          );
        }

        // Return empty 403 with Connection: close to drop attacker immediately
        return new Response(null, {
          status: 403,
          statusText: "Forbidden",
          headers: {
            "Connection": "close",
            "Cache-Control": "no-store"
          }
        });
      }
    }
  }

  return next();
}
