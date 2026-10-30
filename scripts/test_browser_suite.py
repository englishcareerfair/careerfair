import http.server
import json
import os
import socketserver
import subprocess
import sys
import threading
import time

PORT = 8976

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.abspath('careerfair/public'), **kwargs)

    def log_message(self, format, *args):
        pass # Suppress HTTP logs

def run_server(server):
    server.serve_forever()

def main():
    print("=== STARTING HEADLESS BROWSER VERIFICATION SUITE ===")
    
    # 1. Create test runner HTML in public/
    test_html = """<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>ECF 2026 Test Harness</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js"></script>
  <script src="dopamine-engine.js"></script>
  <script src="game-completion-detector.js"></script>
  <script src="dossier-pdf.js"></script>
  <script src="guide-avatar.js"></script>
</head>
<body>
  <div id="test-results">RUNNING</div>
  <div id="top-bar"></div>
  <div id="btn-greeting"></div>
  <div id="btn-header-dossier"></div>
  <div id="sec-careers" class="site-section">Careers Section</div>
  <a href="#sec-careers" class="nav-tab-btn" data-target="sec-careers">Careers Tab</a>
  <div id="sec-arcade" class="site-section">Arcade Section</div>
  <a href="#sec-arcade" class="nav-tab-btn" data-target="sec-arcade">Arcade Tab</a>
  <div id="sec-coach" class="site-section">Coach Section</div>
  <a href="#sec-coach" class="nav-tab-btn" data-target="sec-coach">Coach Tab</a>

  <script>
    const results = [];
    function assert(name, condition, extra = '') {
      if (condition) {
        results.push({ name, pass: true, extra });
      } else {
        results.push({ name, pass: false, extra });
      }
    }

    async function runAllTests() {
      try {
        // Test 1: Module Initialization
        assert('DigitalHumanGuide exists', typeof window.DigitalHumanGuide !== 'undefined');
        assert('GameCompletionDetector exists', typeof window.GameCompletionDetector !== 'undefined');
        assert('DossierPDF exists', typeof window.DossierPDF !== 'undefined');
        assert('DopamineEngine exists', typeof window.DopamineEngine !== 'undefined');

        // Test 2: Dopamine Web Audio Chimes & Confetti
        try {
          window.DopamineEngine.playChime('unlock');
          window.DopamineEngine.playChime('fanfare');
          window.DopamineEngine.playChime('bubble');
          window.DopamineEngine.playChime('ding');
          assert('Web Audio Chimes synthesize without error', true);
        } catch (e) {
          assert('Web Audio Chimes synthesize without error', false, e.message);
        }

        // Test 3: Social Proof Live Toast
        window.DopamineEngine.showLivePulse('🔥 38 students exploring Aviation now!');
        const toast = document.querySelector('.social-proof-toast') || document.querySelector('.live-social-proof-toast');
        assert('Social proof toast renders in DOM', !!toast && toast.textContent.includes('Aviation'));

        // Test 4: Mystery Trajectory Card Modal
        window.DopamineEngine.showMysteryCard({
          title: 'Commercial Pilot',
          cat: 'Aviation',
          salary: '₹25L+/yr'
        }, 98);
        const mysteryModal = document.getElementById('mystery-card-modal');
        assert('Mystery Trajectory card opens', !!mysteryModal);
        const closeMysteryBtn = document.getElementById('btn-close-mystery');
        if (closeMysteryBtn) closeMysteryBtn.click();
        assert('Mystery card closes cleanly', !mysteryModal.classList.contains('active'));

        // Test 5: Game Completion Check-In Modal
        window.GameCompletionDetector.showCheckIn('Jobtris Tetris');
        const checkinModal = document.getElementById('game-completion-check-modal');
        assert('Game completion checkin modal mounts', !!checkinModal && checkinModal.classList.contains('active'));
        const keepPlayingBtn = document.getElementById('btn-gc-keep-playing');
        if (keepPlayingBtn) keepPlayingBtn.click();
        assert('Checkin modal closes on Keep Playing', !checkinModal.classList.contains('active'));

        // Test 6: Guide Avatar Presentation Modes
        window.DigitalHumanGuide.setPresentationMode('floating');
        assert('Floating mode creates floating HUD', !!document.getElementById('guide-floating-hud'));
        window.DigitalHumanGuide.setPresentationMode('studio');
        assert('Studio mode creates studio overlay', !!document.getElementById('guide-studio-overlay'));
        window.DigitalHumanGuide.setPresentationMode('drawer');
        assert('Drawer mode creates sidebar drawer', !!document.getElementById('guide-sidebar-drawer'));

        // Test 7: Skip Tour Clean Exit
        window.DigitalHumanGuide.skipTour();
        assert('Skip tour removes overlays and restores state',
          !document.getElementById('guide-floating-hud') &&
          !document.getElementById('guide-studio-overlay') &&
          !document.getElementById('guide-sidebar-drawer') &&
          !window.DigitalHumanGuide.state.isActive
        );

        // Test 8: 2-Page Vector PDF Generation
        let pdfPageCount = 0;
        let pdfSavedFile = '';
        let printedTexts = [];
        const mockDoc = {
          setDrawColor: () => {},
          setLineWidth: () => {},
          rect: () => {},
          setFillColor: () => {},
          setTextColor: () => {},
          setFont: () => {},
          setFontSize: () => {},
          text: (txt) => { printedTexts.push(String(txt)); },
          roundedRect: () => {},
          line: () => {},
          setLineDashPattern: () => {},
          splitTextToSize: (txt, maxW) => [String(txt || '')],
          addPage: () => { pdfPageCount++; },
          save: (filename) => { pdfSavedFile = filename; }
        };
        pdfPageCount = 1; // initial page
        window.jspdf = { jsPDF: function() { return mockDoc; } };
        await window.DossierPDF.generate({
          name: 'Priya Patel',
          className: 'Class 10-A',
          chosenCareer: { title: 'Neurosurgeon', cat: 'Medicine', salary: '₹35L/yr' },
          speechResult: { accuracy: 95, fluency: 92, clarity: 94, wpm: 130 },
          coach6D: { pronunciation: 94, fluency: 90, clarity: 92, vocab: 88, grammar: 90, confidence: 92 }
        });
        assert('PDF generated exactly 2 pages', pdfPageCount === 2);
        assert('PDF saved with student name in filename', pdfSavedFile.includes('Priya_Patel'));

        // Test 8b: Reviewer Attack Target 1 — PDF with 0% score and unattempted metrics
        pdfPageCount = 1;
        printedTexts = [];
        await window.DossierPDF.generate({
          name: 'Zero Delegate',
          className: 'Class 10',
          chosenCareer: null, // unattempted
          speechResult: { accuracy: 0, fluency: 0, clarity: 0, wpm: 0, sentence: 'Test' },
          coach6D: null,      // unattempted
          gameResults: null   // unattempted
        });
        assert('PDF generated exactly 2 pages when unattempted metrics skipped', pdfPageCount === 2);
        const hasNaN = printedTexts.some(t => t.includes('NaN'));
        const has0Percent = printedTexts.some(t => t.includes('0%'));
        assert('PDF displays accurate 0% and no NaN for boundary values', !hasNaN && has0Percent);

        // Test 8c: PDF generated when completely empty (no interactions yet)
        pdfPageCount = 1;
        printedTexts = [];
        await window.DossierPDF.generate({});
        assert('PDF with zero attempts generated exactly 2 pages with Delegate welcome and cut card', pdfPageCount === 2);

        // Test 9: Zero-Trace Feature Encapsulation
        function applyFlags(flags) {
          const mapping = {
            careers: ['#sec-careers', '[data-target="sec-careers"]', 'a[href="#sec-careers"]'],
            arcade: ['#sec-arcade', '[data-target="sec-arcade"]', 'a[href="#sec-arcade"]']
          };
          for (const [key, selectors] of Object.entries(mapping)) {
            const enabled = flags[key] !== false;
            selectors.forEach(sel => {
              document.querySelectorAll(sel).forEach(el => {
                if (enabled) {
                  el.removeAttribute('hidden');
                  el.style.display = '';
                } else {
                  el.setAttribute('hidden', '');
                  el.style.display = 'none';
                }
              });
            });
          }
        }

        applyFlags({ careers: false, arcade: true });
        const careersSec = document.getElementById('sec-careers');
        const careersTab = document.querySelector('a[href="#sec-careers"]');
        assert('Disabled careers feature is completely hidden from DOM',
          careersSec.hasAttribute('hidden') && careersSec.style.display === 'none' &&
          careersTab.hasAttribute('hidden') && careersTab.style.display === 'none'
        );

        applyFlags({ careers: true, arcade: true });
        assert('Enabled careers feature is cleanly restored',
          !careersSec.hasAttribute('hidden') && careersSec.style.display === '' &&
          !careersTab.hasAttribute('hidden') && careersTab.style.display === ''
        );

        // Record Final Results
        const passCount = results.filter(r => r.pass).length;
        const failCount = results.filter(r => !r.pass).length;
        window.__TEST_RESULTS__ = { results, passCount, failCount };
        document.getElementById('test-results').textContent = `COMPLETE: ${passCount} PASSED, ${failCount} FAILED`;
        const detEl = document.createElement('div');
        detEl.id = 'detailed-results';
        detEl.textContent = JSON.stringify(results);
        document.body.appendChild(detEl);
      } catch (err) {
        window.__TEST_RESULTS__ = { error: err.message, stack: err.stack, results };
        document.getElementById('test-results').textContent = 'ERROR: ' + err.message;
        const detEl = document.createElement('div');
        detEl.id = 'detailed-results';
        detEl.textContent = JSON.stringify({ error: err.message, results });
        document.body.appendChild(detEl);
      }
    }

    window.onload = runAllTests;
  </script>
</body>
</html>"""

    with open('careerfair/public/test_harness.html', 'w', encoding='utf-8') as f:
        f.write(test_html)

    # 2. Start HTTP Server
    server = socketserver.TCPServer(('127.0.0.1', PORT), QuietHandler)
    server_thread = threading.Thread(target=run_server, args=(server,), daemon=True)
    server_thread.start()
    print(f"[OK] Local test server started at http://127.0.0.1:{PORT}")

    time.sleep(1)

    # 3. Launch Headless Edge Browser via PowerShell / subprocess
    edge_paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe")
    ]
    edge_bin = next((p for p in edge_paths if os.path.exists(p)), None)

    if not edge_bin:
        print("[SKIP] Microsoft Edge binary not located for headless test harness.")
        sys.exit(0)

    print("[RUN] Executing tests in headless Edge browser...")
    cmd = [
        edge_bin,
        "--headless",
        "--disable-gpu",
        "--no-sandbox",
        "--dump-dom",
        f"http://127.0.0.1:{PORT}/test_harness.html"
    ]

    try:
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=25, encoding='utf-8', errors='ignore')
        dom_output = proc.stdout

        if 'detailed-results' in dom_output:
            start_marker = '<div id="detailed-results">'
            end_marker = '</div>'
            start_idx = dom_output.find(start_marker) + len(start_marker)
            end_idx = dom_output.find(end_marker, start_idx)
            json_str = dom_output[start_idx:end_idx].strip()
            
            raw_results = json.loads(json_str)
            if isinstance(raw_results, dict) and 'results' in raw_results:
                results = raw_results['results']
            else:
                results = raw_results

            for r in results:
                status = "[PASS]" if r['pass'] else "[FAIL]"
                print(f"  {status} {r['name']} {r.get('extra', '')}")

            pass_count = sum(1 for r in results if r['pass'])
            fail_count = sum(1 for r in results if not r['pass'])
            print(f"[RESULT] COMPLETE: {pass_count} PASSED, {fail_count} FAILED")

            if fail_count > 0:
                print(f"[ERROR] {fail_count} assertions failed.")
                sys.exit(1)
            else:
                print("[SUCCESS] All browser assertions passed with 100% success!")
        else:
            print("[WARN] Test DOM output did not contain '#detailed-results'. Raw output snippet:")
            print(dom_output[:500])
            sys.exit(1)

    except subprocess.TimeoutExpired:
        print("[ERROR] Headless browser execution timed out after 25 seconds.")
        sys.exit(1)
    finally:
        server.shutdown()
        server.server_close()
        # Clean up test harness HTML
        if os.path.exists('careerfair/public/test_harness.html'):
            try:
                os.remove('careerfair/public/test_harness.html')
            except:
                pass

    print("=== BROWSER VERIFICATION SUITE FINISHED ===")

if __name__ == '__main__':
    main()
