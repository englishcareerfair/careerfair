import os
import sys
from pathlib import Path

# Force UTF-8 encoding
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Determine careerfair root
script_dir = Path(__file__).resolve().parent
careerfair_root = script_dir.parent

functions_file = careerfair_root / "functions" / "api" / "[[path]].js"
html_file = careerfair_root / "public" / "index.html"
app_file = careerfair_root / "public" / "app.js"

# 1. Add /api/export/data to functions/api/[[path]].js
with open(functions_file, "r", encoding="utf-8") as f:
    func_code = f.read()

export_endpoint = """  // ── 12. GET /export/data (Permanent Cloudflare D1 Dated Data Export) ─────────
  if ((path === '/export/data' || path === '/export-data') && method === 'GET') {
    const format = url.searchParams.get('format') || 'json';
    let feedbackRows = [];
    let scoreRows = [];

    if (db) {
      try {
        const fb = await db.prepare('SELECT * FROM feedback ORDER BY ts DESC').all();
        feedbackRows = fb.results || [];
        const sc = await db.prepare('SELECT * FROM scores ORDER BY ts DESC').all();
        scoreRows = sc.results || [];
      } catch (e) {
        console.error('D1 Export error:', e);
      }
    }

    if (format === 'csv') {
      let csv = 'Record_Type,ID,Name,Detail,Metric,Timestamp,ISO_Date\\n';
      for (const f of feedbackRows) {
        csv += `Feedback,"${f.id}","${(f.name || '').replace(/"/g, '""')}","${(f.comment || '').replace(/"/g, '""')}",${f.r_useful || 5},${f.ts},"${new Date(Number(f.ts)).toISOString()}"\\n`;
      }
      for (const s of scoreRows) {
        csv += `Score,"${s.id}","${(s.name || '').replace(/"/g, '""')}","${s.pack} Level ${s.level} (Accuracy ${s.acc}%)",${s.acc},${s.ts},"${new Date(Number(s.ts)).toISOString()}"\\n`;
      }
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="careerfair_global_data_${Date.now()}.csv"`,
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    return json({
      export_timestamp: Date.now(),
      export_date_iso: new Date().toISOString(),
      database: 'careerfair-db (Cloudflare D1)',
      total_feedback: feedbackRows.length,
      total_scores: scoreRows.length,
      feedback: feedbackRows,
      scores: scoreRows
    });
  }
"""

if '/export/data' not in func_code:
    # Insert right before 404 handler
    func_code = func_code.replace("  return json({ error: 'Endpoint not found' }, 404);", export_endpoint + "\n  return json({ error: 'Endpoint not found' }, 404);")
    with open(functions_file, "w", encoding="utf-8", newline="") as f:
        f.write(func_code)
    print("Added /api/export/data endpoint to [[path]].js")

# 2. Add Export buttons & VoiceForge engine option to index.html
with open(html_file, "r", encoding="utf-8") as f:
    html_code = f.read()

# Add VoiceForge engine to voice selector in index.html
if 'VoiceForge Local Engine' not in html_code:
    html_code = html_code.replace(
        '<option value="">-- Auto-detect Best Studio Voice (Free Tier Compatible) --</option>',
        '<option value="">-- Auto-detect Best Studio Voice (Free Tier Compatible) --</option>\n              <option value="voiceforge-local">⚡ VoiceForge Local Studio Engine (Offline-First 127.0.0.1:8765)</option>'
    )
    print("Added VoiceForge engine option in voice selector in index.html")

# Add Global D1 archive download block to Moderation view
download_block = """          <!-- 3. Global Exhibition Data Archive & Download -->
          <div style="background:var(--surface-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:16px 20px;margin-bottom:20px;box-shadow:var(--card-shadow);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
              <div>
                <h4 style="font-size:16px;margin:0 0 4px 0;display:flex;align-items:center;gap:8px;">
                  <span>💾</span> <span>Global Dated Data Archive (Cloudflare D1 careerfair-db)</span>
                  <span class="badge-pill" style="background:rgba(16,185,129,0.15);color:var(--accent-green, #10b981);border:1px solid rgba(16,185,129,0.3);font-size:11px;">Permanent Storage</span>
                </h4>
                <p style="font-size:12.5px;color:var(--text-muted);margin:0;">
                  All leaderboard scores, visitor reviews, speech metrics, and timestamps are globally stored forever. Download full exhibition archives anytime.
                </p>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn btn-primary btn-sm" id="btn-download-d1-json" type="button">⬇ Download Global JSON</button>
                <button class="btn btn-secondary btn-sm" id="btn-download-d1-csv" type="button">⬇ Download Global CSV</button>
              </div>
            </div>
          </div>
"""

if 'id="btn-download-d1-json"' not in html_code:
    html_code = html_code.replace('<!-- 1. Visitor Reflections Moderation -->', download_block + '\n          <!-- 1. Visitor Reflections Moderation -->')
    with open(html_file, "w", encoding="utf-8", newline="") as f:
        f.write(html_code)
    print("Added Global D1 download block to index.html")

# 3. Add wiring in app.js
with open(app_file, "r", encoding="utf-8") as f:
    app_code = f.read()

d1_download_wiring = """
  // Global D1 Exhibition Data Downloader Wiring
  $('#btn-download-d1-json')?.addEventListener('click', () => {
    window.open(getApiUrl('api/export/data?format=json'), '_blank');
  });

  $('#btn-download-d1-csv')?.addEventListener('click', () => {
    window.open(getApiUrl('api/export/data?format=csv'), '_blank');
  });
"""

if 'btn-download-d1-json' not in app_code:
    app_code = app_code.replace("initAdminWorkspace();", "initAdminWorkspace();\n" + d1_download_wiring)
    with open(app_file, "w", encoding="utf-8", newline="") as f:
        f.write(app_code)
    print("Wired download buttons in app.js")

print("VoiceForge integration and Global D1 export successfully applied.")
