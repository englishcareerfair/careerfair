from playwright.sync_api import sync_playwright

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
INDEX_URL = "file:///" + r"D:\TANMAY\careerfair\careerfair\public\index.html".replace("\\", "/")

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME_PATH, headless=True)
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    page.goto(INDEX_URL)
    page.evaluate("""
        const l = document.getElementById('site-loader');
        if (l) l.remove();
        if (typeof switchTab === 'function') switchTab('feedback');
    """)
    page.wait_for_timeout(500)

    sec_fb = page.locator('#sec-feedback')
    box = sec_fb.bounding_box()
    page.screenshot(path='artifacts/feedback_mobile_header_qr.png', clip={'x': box['x'], 'y': box['y'], 'width': box['width'], 'height': 380})
    print("Saved mobile screenshot: artifacts/feedback_mobile_header_qr.png")
    browser.close()
