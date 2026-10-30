import http.server
import json
import os
import socketserver
import subprocess
import sys
import threading
import time

PORT = 8979

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.abspath('careerfair/public'), **kwargs)

    def log_message(self, format, *args):
        pass

def main():
    print("=== TESTING HIERARCHICAL DEEP LINKING ROUTER ===")
    
    server = socketserver.TCPServer(("127.0.0.1", PORT), QuietHandler)
    server_thread = threading.Thread(target=server.serve_forever)
    server_thread.daemon = True
    server_thread.start()
    print(f"[OK] Test server running at http://127.0.0.1:{PORT}")

    edge_paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    ]
    edge_bin = next((p for p in edge_paths if os.path.exists(p)), None)
    if not edge_bin:
        print("[ERROR] Microsoft Edge binary not found.")
        sys.exit(1)

    # Inject test script into public/
    test_runner_html = """<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Router Verification</title>
</head>
<body>
  <div id="results">RUNNING</div>
  <iframe id="app-frame" src="index.html" style="width:1280px;height:900px;border:none;"></iframe>
  <script>
    const frame = document.getElementById('app-frame');
    const log = [];
    function assert(name, pass, extra = '') {
      log.push({ name, pass: !!pass, extra });
    }

    frame.onload = async () => {
      const win = frame.contentWindow;
      const doc = frame.contentDocument;

      await new Promise(r => setTimeout(r, 1200));

      try {
        // 1. Router exists & slugify works
        assert('AppRouter exists globally', typeof win.AppRouter !== 'undefined');
        assert('slugify exists globally', typeof win.slugify === 'function');
        assert('slugify formats correctly', win.slugify('Commercial Airline Pilot') === 'commercial-airline-pilot');
        assert('slugify handles symbols', win.slugify('Chief Surgeon & Medical Resident') === 'chief-surgeon-and-medical-resident');

        // 2. Tab Navigation
        win.AppRouter.navigate('/careers');
        await new Promise(r => setTimeout(r, 200));
        assert('Navigate to /careers activates careers section', !doc.getElementById('sec-careers').hidden);
        assert('Router state reflects careers', win.AppRouter.current.tab === 'careers');

        // 3. Careers Subtab & Specific Card
        win.AppRouter.navigate('/careers/aviation/commercial-airline-pilot');
        await new Promise(r => setTimeout(r, 300));
        const activeCat = doc.querySelector('#career-category-filters .filter-chip.active');
        assert('Aviation filter chip is active', activeCat && activeCat.dataset.cat === 'Aviation');
        const pilotCard = doc.querySelector('[data-career-slug="commercial-airline-pilot"]');
        assert('Targeted career card exists in DOM', !!pilotCard);

        // 4. Games Tab & Jobtris
        win.AppRouter.navigate('/games/jobtris');
        await new Promise(r => setTimeout(r, 200));
        assert('Games section active', !doc.getElementById('sec-games').hidden);
        const jobtrisChip = doc.querySelector('#game-picker-tabs .filter-chip.active');
        assert('Jobtris filter chip is active', jobtrisChip && jobtrisChip.dataset.game === 'jobtris');

        // 5. Gaming Hall & Specific Quest
        win.AppRouter.navigate('/games/gaming-hall/scribe');
        await new Promise(r => setTimeout(r, 200));
        const indicator = doc.getElementById('arc-indicator');
        assert('Gaming hall indicator displays The Scribe', indicator && indicator.textContent.includes('The Scribe'));

        // 6. Word Blitz & Grammar Slap
        win.AppRouter.navigate('/games/blitz');
        await new Promise(r => setTimeout(r, 200));
        assert('Word Blitz mount active', !!doc.querySelector('.blitz-arena'));

        win.AppRouter.navigate('/games/slap');
        await new Promise(r => setTimeout(r, 200));
        assert('Grammar Slap mount active', !!doc.querySelector('.slap-arena'));

        // 7. Colleges & Region
        win.AppRouter.navigate('/colleges/panindia');
        await new Promise(r => setTimeout(r, 200));
        assert('Colleges section active', !doc.getElementById('sec-colleges').hidden);
        const activeRegion = doc.querySelector('#college-region-filters .filter-chip.active');
        assert('PanIndia region chip active', activeRegion && activeRegion.dataset.region === 'PanIndia');

        // 8. Exams Tab
        win.AppRouter.navigate('/exams/cuet');
        await new Promise(r => setTimeout(r, 200));
        assert('Exams section active', !doc.getElementById('sec-exams').hidden);

        // 9. Speak Studio & Pack & Level
        win.AppRouter.navigate('/speak/law/3');
        await new Promise(r => setTimeout(r, 200));
        assert('Speak section active', !doc.getElementById('sec-speak').hidden);
        const activePack = doc.querySelector('#speak-pack-filters .filter-chip.active');
        assert('Law pack chip active', activePack && activePack.dataset.pack === 'Law');

        // 10. Roadmap Tools (Bizcard, MyPlan, Quiz)
        win.AppRouter.navigate('/roadmap/quiz');
        await new Promise(r => setTimeout(r, 200));
        assert('Roadmap section active', !doc.getElementById('sec-roadmap').hidden);
        const activeTool = doc.querySelector('#plan-tools-tabs .filter-chip.active');
        assert('Quiz tool chip active', activeTool && activeTool.dataset.tool === 'quiz');

        // 11. Leaderboard & Pack
        win.AppRouter.navigate('/leaderboard/journalism');
        await new Promise(r => setTimeout(r, 200));
        assert('Leaderboard section active', !doc.getElementById('sec-leaderboard').hidden);

        // 12. Normalization & Shareable URL
        assert('normalizePath handles hash and clean paths', win.AppRouter.normalizePath('#/games/jobtris') === '/games/jobtris');
        assert('normalizePath handles root and trailing slashes', win.AppRouter.normalizePath('/careers/aviation/') === '/careers/aviation');
        assert('getShareableUrl produces valid URL', win.AppRouter.getShareableUrl('/games/jobtris').includes('/games/jobtris'));

      } catch (e) {
        assert('Test Execution Crash', false, e.message);
      }

      document.getElementById('results').textContent = JSON.stringify(log);
    };
  </script>
</body>
</html>
"""
    test_file_path = os.path.abspath('careerfair/public/_test_router.html')
    with open(test_file_path, 'w', encoding='utf-8') as f:
        f.write(test_runner_html)

    dump_file = os.path.abspath('careerfair/public/_router_dump.html')
    url = f"http://127.0.0.1:{PORT}/_test_router.html"

    cmd = [
        edge_bin,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--virtual-time-budget=10000",
        f"--dump-dom",
        url
    ]

    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', timeout=25)
        output = proc.stdout
        
        # Extract results
        start_tag = '<div id="results">'
        end_tag = '</div>'
        if start_tag in output:
            res_str = output.split(start_tag, 1)[1].split(end_tag, 1)[0].strip()
            tests = json.loads(res_str)
            passed = 0
            failed = 0
            for t in tests:
                if t['pass']:
                    passed += 1
                    print(f"  [PASS] {t['name']}")
                else:
                    failed += 1
                    print(f"  [FAIL] {t['name']} - {t.get('extra', '')}")
            print(f"\n[SUMMARY] {passed} Passed, {failed} Failed out of {len(tests)} tests.")
            if failed > 0:
                sys.exit(1)
        else:
            print("[ERROR] Could not find results tag in DOM dump.")
            print(output[:500])
            sys.exit(1)
    finally:
        server.shutdown()
        if os.path.exists(test_file_path):
            os.remove(test_file_path)

    print("=== DEEP LINKING ROUTER VERIFICATION COMPLETE ===")

if __name__ == '__main__':
    main()
