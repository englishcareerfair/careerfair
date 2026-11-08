import http.server
import socketserver
import threading
import json
import time
import subprocess
import os
import sys
import urllib.request
import asyncio
import websockets

sys.stdout.reconfigure(encoding='utf-8')

PORT = 8975
DIRECTORY = r'D:\TANMAY\careerfair\careerfair\public'

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        pass  # suppress normal logs

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
            pass

    def do_GET(self):
        if not '.' in self.path or any(self.path.startswith(r) for r in ['/speak', '/hero', '/games', '/careers', '/quiz']):
            self.path = '/index.html'
        return super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/tts'):
            self.send_response(200)
            self.send_header('Content-Type', 'audio/mpeg')
            self.send_header('x-pre-recorded', 'true')
            self.end_headers()
            self.wfile.write(b'\xff\xfb\x90\x64' * 100)
            return
        elif self.path.startswith('/api/'):
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"success": true, "scores": []}')
            return
        return super().do_POST()

def run_server():
    with socketserver.TCPServer(("", PORT), QuietHandler) as httpd:
        httpd.serve_forever()

server_thread = threading.Thread(target=run_server, daemon=True)
server_thread.start()
print(f"Local test server running on port {PORT}")

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
CDP_PORT = 9395
USER_DATA_DIR = r"D:\TANMAY\careerfair\careerfair\tmp_chrome_dossier_test2"

chrome_cmd = [
    CHROME_PATH,
    f"--remote-debugging-port={CDP_PORT}",
    f"--user-data-dir={USER_DATA_DIR}",
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-extensions",
    "--autoplay-policy=no-user-gesture-required",
    "about:blank"
]

print("Launching Chrome...")
proc = subprocess.Popen(chrome_cmd)
time.sleep(3)

async def run_cdp_tests():
    targets_url = f"http://localhost:{CDP_PORT}/json/list"
    req = urllib.request.Request(targets_url)
    with urllib.request.urlopen(req) as resp:
        targets = json.loads(resp.read().decode())
    
    page_target = next(t for t in targets if t.get('type') == 'page')
    ws_url = page_target['webSocketDebuggerUrl']
    print(f"Connected to Chrome Page CDP: {ws_url}")

    async with websockets.connect(ws_url) as ws:
        msg_id = 0
        pending_requests = {}
        console_logs = []

        async def reader():
            while True:
                try:
                    raw = await ws.recv()
                    data = json.loads(raw)
                    if 'id' in data and data['id'] in pending_requests:
                        pending_requests[data['id']].set_result(data)
                    elif data.get('method') == 'Runtime.consoleAPICalled':
                        args = data.get('params', {}).get('args', [])
                        t = data.get('params', {}).get('type')
                        text = " ".join([str(a.get('value', '')) for a in args])
                        console_logs.append((t, text))
                except Exception as e:
                    break

        reader_task = asyncio.create_task(reader())

        async def send(method, params=None):
            nonlocal msg_id
            msg_id += 1
            cur_id = msg_id
            payload = {'id': cur_id, 'method': method, 'params': params or {}}
            fut = asyncio.get_event_loop().create_future()
            pending_requests[cur_id] = fut
            await ws.send(json.dumps(payload))
            return await fut

        await send("Page.enable")
        await send("Runtime.enable")

        async def eval_js(expression):
            res = await send("Runtime.evaluate", {
                "expression": expression,
                "returnByValue": True,
                "awaitPromise": True
            })
            val = res.get('result', {}).get('result', {}).get('value')
            return val

        # Navigate to application
        nav_res = await send("Page.navigate", {"url": f"http://localhost:{PORT}/"})
        print("Page.navigate result:", nav_res)
        for i in range(40):
            url = await eval_js("window.location.href")
            has_loader = await eval_js("!!document.getElementById('loader-tips-panel')")
            if has_loader:
                break
            await asyncio.sleep(0.1)

        print("\n--- TEST 1: Check Loader Screen & Verify NO Listen Button in Tips ---")
        loader_check = await eval_js("""
            (() => {
                const panel = document.getElementById('loader-tips-panel');
                const text = document.getElementById('loader-tutorial-text')?.textContent?.trim();
                const nextBtn = !!document.getElementById('btn-loader-next-tip');
                const prevBtn = !!document.getElementById('btn-loader-prev-tip');
                const audioBtn = !!document.getElementById('btn-loader-tutorial-audio');
                const enterBtn = !!document.getElementById('btn-loader-enter');
                return { hasPanel: !!panel, text, nextBtn, prevBtn, hasAudioBtn: audioBtn, enterBtn };
            })()
        """)
        print(f"Loader Check: {loader_check}")
        assert loader_check['hasPanel'], "Loader panel missing"
        assert loader_check['nextBtn'] and loader_check['prevBtn'], "Loader tips nav buttons missing"
        assert not loader_check['hasAudioBtn'], "FAIL: Listen button in loader tips was NOT removed!"
        print("PASS: Listen button in loading tips is completely removed!")

        # Dismiss loader via enter button
        print("Dismissing loader via enter button...")
        await eval_js("document.getElementById('btn-loader-enter')?.click();")
        await asyncio.sleep(1)

        print("\n--- TEST 2: Check Header Buttons (Start Tutorial & Dossier) ---")
        header_check = await eval_js("""
            (() => {
                const dossierBtn = document.getElementById('btn-header-dossier');
                const tutorialBtn = document.getElementById('btn-header-tutorial');
                const greetingBtn = document.getElementById('btn-greeting');
                const greetingVisible = greetingBtn ? (greetingBtn.offsetWidth > 0 && greetingBtn.offsetHeight > 0 && window.getComputedStyle(greetingBtn).display !== 'none') : false;
                return {
                    hasDossier: !!dossierBtn,
                    dossierText: dossierBtn?.textContent?.trim(),
                    hasTutorial: !!tutorialBtn,
                    tutorialText: tutorialBtn?.textContent?.trim(),
                    greetingVisible: greetingVisible
                };
            })()
        """)
        print(f"Header Buttons Check: {header_check}")
        assert header_check['hasDossier'], "Career Dossier button missing from header"
        assert "Start Tutorial" in header_check['tutorialText'], f"Expected 'Start Tutorial', got: {header_check['tutorialText']}"
        assert not header_check['greetingVisible'], "Redundant Greeting button should not be visible"
        print("PASS: Header buttons configured properly (Start Tutorial prominent, greeting hidden)!")

        print("\n--- TEST 3: Start In-Website Tutorial & Verify In-Website HUD (Not a Modal Box) ---")
        # Ensure fresh state (clear pinned career for testing waiting response)
        await eval_js("localStorage.removeItem('cf_chosen_career');")
        
        await eval_js("document.getElementById('btn-header-tutorial')?.click();")
        await asyncio.sleep(0.5)

        hud_check = await eval_js("""
            (() => {
                const hud = document.getElementById('tutorial-hud');
                const isHudActive = hud?.classList.contains('active');
                const oldModal = document.getElementById('tutorial-modal');
                const isOldModalPresent = !!oldModal;
                const badge = document.getElementById('tutorial-hud-badge')?.textContent?.trim();
                const title = document.getElementById('tutorial-hud-title')?.textContent?.trim();
                const instruction = document.getElementById('tutorial-hud-instruction')?.textContent?.trim();
                const nextBtnText = document.getElementById('btn-tutorial-next')?.textContent?.trim();
                const pauseBtn = !!document.getElementById('btn-tutorial-pause');
                const stopBtn = !!document.getElementById('btn-tutorial-stop');
                const headerBtnText = document.getElementById('btn-header-tutorial')?.textContent?.trim();
                return {
                    isHudActive,
                    isOldModalPresent,
                    badge,
                    title,
                    instruction,
                    nextBtnText,
                    pauseBtn,
                    stopBtn,
                    headerBtnText
                };
            })()
        """)
        print(f"In-Website Tutorial HUD Check: {hud_check}")
        assert hud_check['isHudActive'], "In-Website Tutorial HUD is not active"
        assert not hud_check['isOldModalPresent'], "Old modal box must not exist"
        assert "STEP 1 OF 5" in hud_check['badge'], f"Expected STEP 1, got: {hud_check['badge']}"
        assert "waiting for you to pin a career" in hud_check['instruction'].lower(), "Instruction should state it is waiting for user to pin a career"
        assert "Waiting for Pin" in hud_check['nextBtnText'], f"Expected Waiting for Pin button, got: {hud_check['nextBtnText']}"
        assert "Stop" in hud_check['headerBtnText'], "Header button should show Stop Tutorial while active"
        print("PASS: In-Website Tutorial HUD is active on page with easy English instructions!")

        print("\n--- TEST 4: Test Pause and Resume Tutorial Controls ---")
        pause_test = await eval_js("""
            (() => {
                const pauseBtn = document.getElementById('btn-tutorial-pause');
                pauseBtn.click();
                const pausedText = pauseBtn.textContent.trim();
                const isPaused = window.isTutorialPaused;
                
                // Now resume
                pauseBtn.click();
                const resumedText = pauseBtn.textContent.trim();
                const isResumed = !window.isTutorialPaused;
                
                return { pausedText, isPaused: Boolean(isPaused), resumedText, isResumed: Boolean(isResumed) };
            })()
        """)
        print(f"Pause/Resume Test: {pause_test}")
        assert "Resume" in pause_test['pausedText'], f"Pause button did not switch to Resume: {pause_test['pausedText']}"
        assert pause_test['isPaused'], "Tutorial state not paused"
        assert "Pause" in pause_test['resumedText'], f"Resume button did not switch back to Pause: {pause_test['resumedText']}"
        assert pause_test['isResumed'], "Tutorial state not resumed"
        print("PASS: User can pause and resume the tutorial at will!")

        print("\n--- TEST 5: Wait for User's Response & Integration with Career Dossier ---")
        pin_interaction_test = await eval_js("""
            (() => {
                // Find first career pin button and click it
                const pinBtns = document.querySelectorAll('.btn-pin-career');
                if (!pinBtns.length) return { error: 'No career pin buttons' };
                const firstBtn = pinBtns[0];
                const careerTitle = firstBtn.dataset.title;
                firstBtn.click();
                
                const chosen = JSON.parse(localStorage.getItem('cf_chosen_career') || '{}');
                const reactionEl = document.getElementById('tutorial-hud-reaction');
                const reactionVisible = reactionEl && reactionEl.style.display !== 'none';
                const reactionText = reactionEl?.textContent?.trim();
                const nextBtnText = document.getElementById('btn-tutorial-next')?.textContent?.trim();
                const instructionText = document.getElementById('tutorial-hud-instruction')?.textContent?.trim();
                
                return {
                    careerTitle,
                    chosenTitle: chosen.title,
                    reactionVisible,
                    reactionText,
                    nextBtnText,
                    instructionText
                };
            })()
        """)
        print(f"User Response & Dossier Integration Test: {pin_interaction_test}")
        assert pin_interaction_test['careerTitle'] == pin_interaction_test['chosenTitle'], "Career was not pinned"
        assert pin_interaction_test['reactionVisible'], "Reaction badge not displayed"
        assert "Career Pinned" in pin_interaction_test['reactionText'], f"Reaction badge text missing confirmation: {pin_interaction_test['reactionText']}"
        assert "Next Exhibit" in pin_interaction_test['nextBtnText'], f"Next button did not activate: {pin_interaction_test['nextBtnText']}"
        print("PASS: Tutorial waited for user response and reacted immediately upon career dossier pinning!")

        print("\n--- TEST 6: Step Through Exhibits to Completion ---")
        step_through = await eval_js("""
            (async () => {
                const nextBtn = document.getElementById('btn-tutorial-next');
                const steps = [];
                for (let s = 1; s <= 4; s++) {
                    nextBtn.click();
                    await new Promise(r => setTimeout(r, 200));
                    steps.push({
                        badge: document.getElementById('tutorial-hud-badge')?.textContent?.trim(),
                        title: document.getElementById('tutorial-hud-title')?.textContent?.trim(),
                        instruction: document.getElementById('tutorial-hud-instruction')?.textContent?.trim()
                    });
                }
                const hasDownloadBtn = document.getElementById('btn-tutorial-dossier-download')?.style.display !== 'none';
                return { steps, hasDownloadBtn };
            })()
        """)
        print(f"Step Through: {step_through}")
        assert len(step_through['steps']) == 4, "Did not step through all 4 remaining exhibits"
        assert "STEP 5 OF 5" in step_through['steps'][-1]['badge'], f"Final step not Step 5: {step_through['steps'][-1]['badge']}"
        assert step_through['hasDownloadBtn'], "Final step should show Download Dossier PDF button"
        print("PASS: Stepped through all tutorial exhibits to final Dossier download step!")

        print("\n--- TEST 7: Stop Tutorial Controls ---")
        stop_test = await eval_js("""
            (() => {
                const stopBtn = document.getElementById('btn-tutorial-stop');
                stopBtn.click();
                const hud = document.getElementById('tutorial-hud');
                const isHudActive = hud?.classList.contains('active');
                const headerText = document.getElementById('btn-header-tutorial')?.textContent?.trim();
                return { isHudActive, headerText };
            })()
        """)
        print(f"Stop Test: {stop_test}")
        assert not stop_test['isHudActive'], "Tutorial HUD did not close on stop"
        assert "Start Tutorial" in stop_test['headerText'], f"Header button did not reset text: {stop_test['headerText']}"
        print("PASS: Stop button closes tutorial HUD and resets controls cleanly!")

        print("\n--- TEST 8: Career Dossier PDF Generation & Content Quality ---")
        pdf_test = await eval_js("""
            (async () => {
                try {
                    let generatedPages = 0;
                    let textCalls = [];
                    const origJsPDF = window.jspdf.jsPDF;
                    
                    window.jspdf.jsPDF = function(...args) {
                        const instance = new origJsPDF(...args);
                        const origAddPage = instance.addPage.bind(instance);
                        generatedPages = 1;
                        instance.addPage = function(...pArgs) {
                            generatedPages++;
                            return origAddPage(...pArgs);
                        };
                        const origText = instance.text.bind(instance);
                        instance.text = function(text, x, y, options) {
                            if (typeof text === 'string') {
                                textCalls.push(text);
                            } else if (Array.isArray(text)) {
                                textCalls.push(...text);
                            }
                            return origText(text, x, y, options);
                        };
                        instance.save = function(filename) {
                            return this;
                        };
                        return instance;
                    };
                    
                    await window.DossierPDF.generate();
                    await new Promise(r => setTimeout(r, 600));
                    
                    window.jspdf.jsPDF = origJsPDF; // restore
                    
                    // Check for corrupted characters or developer jargon
                    const joinedText = textCalls.join(' ');
                    const hasGarbledStar = joinedText.includes('&  DOSSIER') || joinedText.includes('& DOSSIER');
                    const hasGarbledBullet = joinedText.includes('%Ï') || joinedText.includes('\uFFFD');
                    const hasDeveloperJargon = joinedText.toLowerCase().includes('tesseract') || joinedText.toLowerCase().includes('canvas completion');
                    const hasVerifiedSeal = joinedText.includes('VERIFIED BY ENGLISH DEPARTMENT 2026');
                    const hasEndorsement = joinedText.includes('OFFICIAL FAIR ENDORSEMENT');
                    const hasBusinessCard = joinedText.includes('OFFICIAL STUDENT AMBASSADOR');
                    
                    return {
                        success: true,
                        generatedPages,
                        textCallCount: textCalls.length,
                        hasGarbledStar,
                        hasGarbledBullet,
                        hasDeveloperJargon,
                        hasVerifiedSeal,
                        hasEndorsement,
                        hasBusinessCard
                    };
                } catch (err) {
                    return { success: false, error: String(err) };
                }
            })()
        """)
        print(f"Career Dossier PDF Test: {pdf_test}")
        assert pdf_test['success'], f"PDF Generation failed: {pdf_test.get('error')}"
        assert pdf_test['generatedPages'] == 2, f"Expected exactly 2 pages, got: {pdf_test.get('generatedPages')}"
        assert not pdf_test['hasGarbledStar'], "FAIL: PDF has corrupted star '& DOSSIER' text!"
        assert not pdf_test['hasGarbledBullet'], "FAIL: PDF has corrupted bullet '%Ï' text!"
        assert not pdf_test['hasDeveloperJargon'], "FAIL: PDF has developer jargon ('tesseract' / 'canvas completion')!"
        assert pdf_test['hasVerifiedSeal'], "FAIL: Verified seal text missing"
        assert pdf_test['hasEndorsement'], "FAIL: Official institutional endorsement missing"
        assert pdf_test['hasBusinessCard'], "FAIL: Student ambassador business card missing"
        print("PASS: Career Dossier PDF generated 2 pristine, executive pages free of corrupted glyphs and developer jargon!")

        print("\n--- TEST 9: Check Console Errors ---")
        console_errors = [msg for (t, msg) in console_logs if t == 'error' and not any(x in msg for x in ['favicon', 'manifest', 'WebSocket', '404'])]
        print(f"Total Console Errors: {len(console_errors)}")
        if console_errors:
            for err in console_errors:
                print(f"  [ERROR] {err}")
        assert len(console_errors) == 0, f"Found console errors: {console_errors}"

        reader_task.cancel()
        print("\n=======================================================")
        print("ALL 9 DEEP VERIFICATION TESTS PASSED WITH 100% SUCCESS!")
        print("=======================================================")

try:
    asyncio.run(run_cdp_tests())
finally:
    proc.terminate()
    print("Test finished and server cleaned up.")
