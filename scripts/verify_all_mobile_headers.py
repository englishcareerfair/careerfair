from playwright.sync_api import sync_playwright

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
INDEX_URL = "file:///" + r"D:\TANMAY\careerfair\careerfair\public\index.html".replace("\\", "/")

viewports = [
    (360, 800, "Standard Android 360 (Galaxy A / Redmi)"),
    (375, 667, "iPhone SE / 8"),
    (390, 844, "iPhone 13 / 14 / 15"),
    (412, 915, "Pixel 7 / Samsung Galaxy S23"),
    (430, 932, "iPhone 14 / 15 Pro Max")
]

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME_PATH, headless=True)
    
    for w, h, name in viewports:
        page = browser.new_page(viewport={'width': w, 'height': h})
        page.goto(INDEX_URL)
        page.evaluate("""
            const l = document.getElementById('site-loader');
            if (l) l.remove();
        """)
        
        scroll_w = page.evaluate('() => document.querySelector(".site-header .brand-copy .brand-name").scrollWidth')
        client_w = page.evaluate('() => document.querySelector(".site-header .brand-copy .brand-name").clientWidth')
        is_trunc = (scroll_w > client_w)
        box = page.locator('.site-header .brand-copy .brand-name').bounding_box()
        actions_box = page.locator('.site-header .header-actions-row').bounding_box()
        overlap = (box['x'] + box['width'] > actions_box['x'])
        
        print(f"[{name} - {w}x{h}] Truncated: {is_trunc} (scroll={scroll_w}, client={client_w}) | Overlap: {overlap} | Brand Right={box['x']+box['width']:.1f} vs Actions Left={actions_box['x']:.1f}")
        assert not is_trunc, f"Truncated on {name}"
        assert not overlap, f"Overlapping on {name}"
        page.screenshot(path=f'artifacts/mobile_header_{w}.png', clip={'x': 0, 'y': 0, 'width': w, 'height': 70})
        page.close()

    browser.close()

print("\n>>> ALL MOBILE PHONES PASSED: 2026 TEXT 100% VISIBLE WITH ZERO OVERLAP! <<<")
