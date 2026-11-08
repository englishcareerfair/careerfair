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

PORT = 8970
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
CDP_PORT = 9392
USER_DATA_DIR = r"D:\TANMAY\careerfair\careerfair\tmp_chrome_dossier_verify"

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

        # Navigate freshly to application
        nav_res = await send("Page.navigate", {"url": f"http://localhost:{PORT}/"})
        print("Page.navigate result:", nav_res)
        for i in range(40):
            url = await eval_js("window.location.href")
            state = await eval_js("document.readyState")
            has_loader = await eval_js("!!document.getElementById('loader-tips-panel')")
            if i % 5 == 0:
                print(f"  poll {i}: url={url}, state={state}, has_loader={has_loader}")
            if has_loader:
                break
            await asyncio.sleep(0.1)

        print("Final HTML slice:", await eval_js("document.documentElement ? document.documentElement.outerHTML.slice(0, 300) : 'no doc'"))
        print("site-loader outerHTML:", await eval_js("document.getElementById('site-loader') ? document.getElementById('site-loader').outerHTML : 'NO SITE LOADER'"))

        print("\n--- TEST 1: Check Loader Tutorial Panel & Enter Button ---")
        loader_check = await eval_js("""
            (() => {
                const panel = document.getElementById('loader-tips-panel');
                const text = document.getElementById('loader-tutorial-text')?.textContent?.trim();
                const nextBtn = !!document.getElementById('btn-loader-next-tip');
                const prevBtn = !!document.getElementById('btn-loader-prev-tip');
                const audioBtn = !!document.getElementById('btn-loader-tutorial-audio');
                const enterBtn = !!document.getElementById('btn-loader-enter');
                return { hasPanel: !!panel, text, nextBtn, prevBtn, audioBtn, enterBtn };
            })()
        """)
        print(f"Loader Check: {loader_check}")
        assert loader_check['hasPanel'], "Loader panel missing"
        assert loader_check['nextBtn'] and loader_check['prevBtn'], "Loader tips nav buttons missing"
        assert loader_check['enterBtn'], "Loader enter button missing"
        assert loader_check['audioBtn'], "Loader tutorial audio button missing"

        # Dismiss loader via enter button
        print("Dismissing loader via enter button...")
        await eval_js("document.getElementById('btn-loader-enter')?.click();")
        await asyncio.sleep(1)

        print("\n--- TEST 2: Check Header Buttons (Dossier & Tutorial) ---")
        header_check = await eval_js("""
            (() => {
                const dossierBtn = document.getElementById('btn-header-dossier');
                const tutorialBtn = document.getElementById('btn-header-tutorial');
                const greetingBtn = document.getElementById('btn-greeting');
                return {
                    hasDossier: !!dossierBtn,
                    dossierText: dossierBtn?.textContent?.trim(),
                    hasTutorial: !!tutorialBtn,
                    tutorialText: tutorialBtn?.textContent?.trim(),
                    hasGreeting: !!greetingBtn
                };
            })()
        """)
        print(f"Header Buttons Check: {header_check}")
        assert header_check['hasDossier'], "Career Dossier button missing from header"
        assert header_check['hasTutorial'], "Tutorial button missing from header"
        assert header_check['hasGreeting'], "Greeting button missing from header"

        print("\n--- TEST 3: Open and Interact with Tutorial Modal ---")
        await eval_js("document.getElementById('btn-header-tutorial')?.click();")
        await asyncio.sleep(0.5)

        tutorial_modal_check = await eval_js("""
            (() => {
                const modal = document.getElementById('tutorial-modal');
                const isActive = modal?.classList.contains('active');
                const tabsCount = document.querySelectorAll('.tutorial-nav-tab').length;
                const activeTab = document.querySelector('.tutorial-nav-tab.active')?.textContent?.trim();
                const cardBody = document.getElementById('tutorial-card-body')?.textContent?.trim();
                const voiceName = document.getElementById('tutorial-voice-badge-name')?.textContent?.trim();
                const audioBtn = document.getElementById('btn-tutorial-audio-toggle');
                return {
                    isActive,
                    tabsCount,
                    activeTab,
                    hasCardBody: !!cardBody,
                    voiceName,
                    hasAudioBtn: !!audioBtn
                };
            })()
        """)
        print(f"Tutorial Modal Check: {tutorial_modal_check}")
        assert tutorial_modal_check['isActive'], "Tutorial modal did not open"
        assert tutorial_modal_check['tabsCount'] == 5, f"Expected 5 tutorial step tabs, got {tutorial_modal_check['tabsCount']}"

        # Test Step navigation
        print("Testing Next Exhibit navigation...")
        await eval_js("document.getElementById('btn-tutorial-next-step')?.click();")
        step2_check = await eval_js("""
            (() => {
                const activeTab = document.querySelector('.tutorial-nav-tab.active')?.textContent?.trim();
                const counter = document.getElementById('tutorial-step-counter')?.textContent?.trim();
                return { activeTab, counter };
            })()
        """)
        print(f"Step 2: {step2_check}")
        assert "Step 2 of 5" in step2_check['counter'], "Did not advance to step 2"

        print("\n--- TEST 4: Pre-recorded Tutorial Audio Playback & Toggle ---")
        audio_test = await eval_js("""
            (async () => {
                const btn = document.getElementById('btn-tutorial-audio-toggle');
                const headerBtn = document.getElementById('btn-header-tutorial');
                
                // Trigger play from modal
                btn.click();
                await new Promise(r => setTimeout(r, 600));
                
                const isPlaying = window.currentTtsAudio && !window.currentTtsAudio.paused;
                const headerIsPlaying = headerBtn.classList.contains('playing');
                const btnText = document.getElementById('tutorial-audio-text')?.textContent?.trim();
                const audioSrc = window.currentTtsAudio ? window.currentTtsAudio.src : '';
                
                // Close modal and test header button toggle stop
                document.getElementById('btn-close-tutorial')?.click();
                await new Promise(r => setTimeout(r, 300));
                
                // Header button should show Stop Audio
                const headerTextBefore = headerBtn.textContent.trim();
                
                // Click header button to stop
                headerBtn.click();
                await new Promise(r => setTimeout(r, 400));
                
                const stopped = !window.currentTtsAudio || window.currentTtsAudio.paused;
                const headerTextAfter = headerBtn.textContent.trim();
                
                return {
                    isPlaying,
                    headerIsPlaying,
                    btnText,
                    audioSrc,
                    headerTextBefore,
                    headerTextAfter,
                    stopped
                };
            })()
        """)
        print(f"Tutorial Audio Play/Stop Test: {audio_test}")
        assert "tutorial" in audio_test['audioSrc'], f"Expected pre-recorded tutorial audio URL, got: {audio_test['audioSrc']}"
        assert "Stop" in audio_test['headerTextBefore'], f"Header button did not show Stop text while playing: {audio_test['headerTextBefore']}"
        assert audio_test['stopped'], "Audio did not stop when clicking header button"
        assert "Tutorial" in audio_test['headerTextAfter'], f"Header button did not reset text after stop: {audio_test['headerTextAfter']}"

        modal_closed = await eval_js("!document.getElementById('tutorial-modal')?.classList.contains('active')")
        assert modal_closed, "Tutorial modal did not close"

        print("\n--- TEST 5: Career Dossier (PDF Export & Career Cards) ---")
        dossier_js_check = await eval_js("""
            (() => {
                return {
                    hasDossierPDF: typeof window.DossierPDF !== 'undefined',
                    hasGenerate: typeof window.DossierPDF?.generate === 'function'
                };
            })()
        """)
        print(f"DossierPDF API: {dossier_js_check}")
        assert dossier_js_check['hasGenerate'], "window.DossierPDF.generate is not a function"

        # Navigate to careers tab and verify Pin to My Career Dossier buttons
        print("Navigating to careers tab...")
        await eval_js("window.switchTab('careers');")
        await asyncio.sleep(1)

        careers_pin_check = await eval_js("""
            (() => {
                const pinBtns = document.querySelectorAll('.btn-pin-career');
                if (!pinBtns.length) return { count: 0 };
                const firstBtn = pinBtns[0];
                const title = firstBtn.dataset.title;
                firstBtn.click();
                const chosen = JSON.parse(localStorage.getItem('cf_chosen_career') || '{}');
                return {
                    count: pinBtns.length,
                    firstTitle: title,
                    chosenTitle: chosen.title
                };
            })()
        """)
        print(f"Career Pin Check: {careers_pin_check}")
        assert careers_pin_check['count'] > 0, "No 'Pin to My Career Dossier' buttons found on career cards"
        assert careers_pin_check['firstTitle'] == careers_pin_check['chosenTitle'], "Career pin did not save to localStorage"

        # Test Dossier PDF generation execution (with mock save to verify no errors)
        print("Testing Dossier PDF generation execution...")
        pdf_gen_result = await eval_js("""
            (async () => {
                try {
                    let savedFileName = '';
                    const origJsPDF = window.jspdf.jsPDF;
                    window.jspdf.jsPDF = function(...args) {
                        const instance = new origJsPDF(...args);
                        instance.save = function(filename) {
                            savedFileName = filename;
                            return this;
                        };
                        return instance;
                    };
                    
                    window.DossierPDF.generate();
                    await new Promise(r => setTimeout(r, 600));
                    
                    window.jspdf.jsPDF = origJsPDF; // restore
                    return { success: true, savedFileName };
                } catch (err) {
                    return { success: false, error: String(err) };
                }
            })()
        """)
        print(f"PDF Generation Result: {pdf_gen_result}")
        assert pdf_gen_result['success'], f"PDF Generation failed: {pdf_gen_result.get('error')}"
        assert pdf_gen_result['savedFileName'].startswith('ECF2026_CareerDossier_'), f"Unexpected PDF filename: {pdf_gen_result.get('savedFileName')}"

        print("\n--- TEST 6: Guide Avatar Checklist & Indicator ---")
        guide_check = await eval_js("""
            (() => {
                const avatar = window.GuideAvatar || window.DigitalHumanGuide;
                if (!avatar) return { hasAvatar: false, g: typeof window.GuideAvatar, d: typeof window.DigitalHumanGuide };
                avatar.renderGuideUI();
                const indicator = document.getElementById('dg-step-indicator')?.textContent?.trim();
                avatar.setPresentationMode('drawer');
                const checkItems = document.querySelectorAll('.dg-check-item');
                const lastCheckText = checkItems.length ? checkItems[checkItems.length - 1].textContent.trim() : '';
                
                // Click Step 10 (2-Page Printable Dossier) in checklist
                if (checkItems.length >= 10) {
                    checkItems[9].click();
                }
                const activeStepAfterClick = avatar.currentStep;

                return {
                    hasAvatar: true,
                    indicator,
                    checkItemsCount: checkItems.length,
                    lastCheckText,
                    activeStepAfterClick
                };
            })()
        """)
        print(f"Guide Avatar Check: {guide_check}")
        if guide_check.get('hasAvatar'):
            assert "10" in guide_check.get('indicator', ''), f"Expected Step 1/10 indicator, got: {guide_check.get('indicator')}"
            assert "Dossier" in guide_check.get('lastCheckText', ''), f"Expected Step 10 Dossier in checklist, got: {guide_check.get('lastCheckText')}"
            assert guide_check.get('activeStepAfterClick') == 9, f"Clicking step 10 in checklist did not jump to step index 9: {guide_check.get('activeStepAfterClick')}"

        print("\n--- TEST 7: Check Console Errors ---")
        console_errors = [msg for (t, msg) in console_logs if t == 'error' and not any(x in msg for x in ['favicon', 'manifest', 'WebSocket', '404'])]
        print(f"Total Console Errors: {len(console_errors)}")
        if console_errors:
            for err in console_errors:
                print(f"  [ERROR] {err}")
        assert len(console_errors) == 0, f"Found console errors: {console_errors}"

        reader_task.cancel()
        print("\n=======================================================")
        print("ALL END-TO-END DEEP VERIFICATION TESTS PASSED PERFECTLY!")
        print("=======================================================")

try:
    asyncio.run(run_cdp_tests())
finally:
    proc.terminate()
    print("Test finished and server cleaned up.")
