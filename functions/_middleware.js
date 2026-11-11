/**
 * Cloudflare Pages Edge Middleware
 * High-Performance Anti-DDoS, Edge Rate Limiter & Zero-Usage Shield
 * 
 * Configured:
 * - DDoS Protection: Maximum 25 requests in 60 seconds per IP.
 * - If exceeded, drops the connection with 429 and temporary ban with 0 payload/D1 reads.
 * - Scanner probe trap: Immediate drop for malicious bots (.env, wp-login, etc.)
 * - Whitelist: Protected Administrator IP bypasses all rate limits.
 */

// ── In-Memory Edge State (persists across requests on the same Cloudflare Edge isolate) ──
const IP_RATE_LIMITS = new Map(); // ip -> { count: number, resetAt: number, burstCount: number, burstResetAt: number }
const AUTO_BANNED_IPS = new Map(); // ip -> banExpiresAt (timestamp)

function isImmuneAdminIp(ip) {
  if (!ip) return false;
  const clean = String(ip).trim();
  return clean === '157.119.203.129' || clean === '157.119.200.54' || clean.startsWith('157.119.');
}

let CACHED_BLOCKED_SET = new Set();
let LAST_BLOCKED_FETCH_MS = 0;
const CACHE_TTL_MS = 60 * 1000; // 60s memory cache for D1 ban list

// ── DDoS Defense Thresholds: Multi-Tiered Intelligent Protection ──
// Tier 1 (Immediate Burst / Flood Trap): >3 API or page requests in 1 second -> Immediate 2-hour Auto-Ban
const BURST_WINDOW_MS = 1000;          // 1-second burst inspection window
const BURST_MAX_REQS = 3;              // Maximum 3 dynamic/API requests in 1 second
// Tier 2 (Sustained Crawl / Heavy Flood): >25 requests in 60 seconds -> 1-hour Auto-Ban
const RATE_WINDOW_MS = 60 * 1000;      // 60-second sliding inspection window
const MAX_REQUESTS_PER_WINDOW = 25;    // Max 25 requests in 60s
const BAN_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours temporary ban on violation

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
            if (typeof ip === 'string' && ip.trim()) {
            const clean = ip.trim();
            if (!isImmuneAdminIp(clean)) freshSet.add(clean);
          }
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


  if (isImmuneAdminIp(clientIp)) {
    return next(); // Immune admin IP bypasses all rate-limits, scanners, and blocks
  }

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
            "Retry-After": "3600",
            "Cache-Control": "no-store",
            "X-DDoS-Protection": "Auto-Banned"
          }
        });
      } else {
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
    // 3. MULTI-TIERED DDoS RATE LIMITER (Instant Burst & 60s Window)
    // ─────────────────────────────────────────────────────────────
    const isStaticAsset = pathname.endsWith('.png') || pathname.endsWith('.jpg') || pathname.endsWith('.jpeg') ||
                          pathname.endsWith('.webp') || pathname.endsWith('.svg') || pathname.endsWith('.ico') ||
                          pathname.endsWith('.woff2') || pathname.endsWith('.mp3');

    // Skip rate-limiting browser bundle static sub-assets so initial page render isn't penalized
    if (!isStaticAsset) {
      let tracker = IP_RATE_LIMITS.get(clientIp);
      if (!tracker) {
        tracker = { count: 1, resetAt: now + RATE_WINDOW_MS, burstCount: 1, burstResetAt: now + BURST_WINDOW_MS };
        IP_RATE_LIMITS.set(clientIp, tracker);
      } else {
        // --- 3A. INSTANT 1-SECOND BURST CHECK (>3 visits/reqs in 1 second) ---
        if (now > tracker.burstResetAt) {
          tracker.burstCount = 1;
          tracker.burstResetAt = now + BURST_WINDOW_MS;
        } else {
          tracker.burstCount++;
          if (tracker.burstCount > BURST_MAX_REQS) {
            AUTO_BANNED_IPS.set(clientIp, now + BAN_DURATION_MS);
            return new Response(
              JSON.stringify({
                error: "DDoS Attack Blocked: Exceeded rate limit (>3 requests in 1 second). Your device IP has been banned immediately.",
                retry_after_seconds: 7200
              }),
              {
                status: 429,
                statusText: "Too Many Requests - DDoS Burst Ban",
                headers: {
                  "Content-Type": "application/json",
                  "Connection": "close",
                  "Retry-After": "7200",
                  "Cache-Control": "no-store",
                  "X-DDoS-Protection": "Burst-Triggered"
                }
              }
            );
          }
        }

        // --- 3B. SUSTAINED 60-SECOND WINDOW CHECK (>25 reqs in 60 seconds) ---
        if (now > tracker.resetAt) {
          tracker.count = 1;
          tracker.resetAt = now + RATE_WINDOW_MS;
        } else {
          tracker.count++;
          if (tracker.count > MAX_REQUESTS_PER_WINDOW) {
            AUTO_BANNED_IPS.set(clientIp, now + BAN_DURATION_MS);
            return new Response(
              JSON.stringify({
                error: "DDoS Protection Triggered: Exceeded 25 requests in 60 seconds. Your device IP has been banned.",
                retry_after_seconds: 7200
              }),
              {
                status: 429,
                statusText: "Too Many Requests",
                headers: {
                  "Content-Type": "application/json",
                  "Connection": "close",
                  "Retry-After": "7200",
                  "Cache-Control": "no-store"
                }
              }
            );
          }
        }

        // Periodic cleanup to avoid memory leak
        if (IP_RATE_LIMITS.size > 2000) {
          for (const [ipKey, entry] of IP_RATE_LIMITS.entries()) {
            if (now > entry.resetAt && now > entry.burstResetAt) IP_RATE_LIMITS.delete(ipKey);
          }
        }
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
