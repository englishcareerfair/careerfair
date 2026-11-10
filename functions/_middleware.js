/**
 * Cloudflare Pages Edge Middleware
 * Enforces site-wide IP blocking across HTML pages, assets, and API routes
 * using `banned_ips` and `admin_blocked_ips` stored in D1 `kv`.
 */

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
  try {
    for (const key in env) {
      const val = env[key];
      if (val && typeof val === 'object' && typeof val.prepare === 'function') {
        return val;
      }
    }
  } catch {}
  return null;
}

function getEdgeClientIp(req) {
  const raw = req.headers.get('cf-connecting-ip')
    || (req.headers.get('x-forwarded-for') || '').split(',')[0]
    || req.headers.get('x-real-ip')
    || '';
  return raw.trim();
}

function escapeHtmlBasic(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function onRequest(context) {
  const { request, env, next } = context;

  // Never block CORS preflight or service worker unregistration fetches if needed
  if (request.method === 'OPTIONS') {
    return next();
  }

  const clientIp = getEdgeClientIp(request);
  if (clientIp) {
    // 0 CPU / 0 DB Read Instant Perimeter Drop:
    // Drop known banned attackers immediately with 0 bytes response and 0 D1 reads
    const FAST_BLOCKED_IPS = new Set(["157.119.203.129"]);
    if (FAST_BLOCKED_IPS.has(clientIp)) {
      return new Response(null, {
        status: 403,
        statusText: "Forbidden",
        headers: { "Connection": "close", "Cache-Control": "no-store" }
      });
    }

    const db = resolveMiddlewareD1(env);
    if (db) {
      try {
        const rows = await db
          .prepare("SELECT k, v FROM kv WHERE k IN ('banned_ips', 'admin_blocked_ips')")
          .all();
        const blockedSet = new Set(FAST_BLOCKED_IPS);
        for (const row of (rows?.results || [])) {
          if (!row?.v) continue;
          try {
            const parsed = JSON.parse(row.v);
            if (Array.isArray(parsed)) {
              for (const ip of parsed) {
                if (typeof ip === 'string' && ip.trim()) blockedSet.add(ip.trim());
              }
            }
          } catch {}
        }

        if (blockedSet.has(clientIp)) {
          const url = new URL(request.url);
          if (url.pathname.startsWith('/api/')) {
            return new Response(
              JSON.stringify({
                error: `Access Denied: Your IP address (${clientIp}) has been blocked across this site by administrators.`,
                banned: true,
                admin_revoked: true
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

          const safeIp = escapeHtmlBasic(clientIp);
          return new Response(
            `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Access Restricted · Career Fair 2026</title>
  <style>
    body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#070b14;color:#e2e8f0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:24px;box-sizing:border-box;}
    .card{max-width:480px;width:100%;background:#0f172a;border:1px solid rgba(239,68,68,0.45);border-radius:16px;padding:32px 28px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.6);}
    .icon{font-size:48px;margin-bottom:12px;}
    h1{margin:0 0 10px 0;font-size:22px;color:#f87171;}
    p{margin:0 0 16px 0;font-size:14.5px;line-height:1.55;color:#94a3b8;}
    .ip{display:inline-block;padding:6px 12px;border-radius:8px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.35);color:#fca5a5;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🚫</div>
    <h1>Site Access Blocked</h1>
    <p>Your device IP address has been restricted from accessing this exhibition website and its services by an administrator.</p>
    <div class="ip">Blocked IP: ${safeIp}</div>
  </div>
</body>
</html>`,
            {
              status: 403,
              headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-store'
              }
            }
          );
        }
      } catch {
        // Fail open if kv table isn't initialized yet
      }
    }
  }

  return next();
}
