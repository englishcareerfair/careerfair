from playwright.sync_api import sync_playwright
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
INDEX_URL = "file:///" + r"D:\TANMAY\careerfair\careerfair\public\index.html".replace("\\", "/")

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME_PATH, headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    page.goto(INDEX_URL)
    page.evaluate("""
        const l = document.getElementById('site-loader');
        if (l) l.remove();
        if (typeof switchTab === 'function') switchTab('feedback');
    """)

    # 1. Verify QR code mount location
    qr_in_header = page.locator('.feedback-section-head #feedback-qr-mount')
    assert qr_in_header.count() == 1, "feedback-qr-mount not found in .feedback-section-head"
    print("PASS: feedback-qr-mount successfully located inside .feedback-section-head!")

    qr_box = page.locator('.feedback-section-head #fb-qr-code-box')
    assert qr_box.count() == 1, "fb-qr-code-box not found in header mount"
    print("PASS: fb-qr-code-box successfully present inside header mount!")

    # Check that old form card header does NOT have feedback-qr-mount
    old_card_qr = page.locator('.feedback-form-card .feedback-card-header #feedback-qr-mount')
    assert old_card_qr.count() == 0, "Old feedback-qr-mount still inside feedback-card-header"
    print("PASS: Old form card does not contain duplicate QR code!")

    # 2. Check admin rename functions exist on window
    has_rename_fb = page.evaluate("typeof window.adminChangeFeedbackName === 'function'")
    has_rename_sc = page.evaluate("typeof window.adminChangeScoreName === 'function'")
    assert has_rename_fb, "window.adminChangeFeedbackName is not a function"
    assert has_rename_sc, "window.adminChangeScoreName is not a function"
    print("PASS: Both window.adminChangeFeedbackName and window.adminChangeScoreName are defined!")

    # 3. Simulate Admin login to check buttons render on feedback and leaderboard
    page.evaluate("""
        STATE.adminKey = 'mock_admin_key';
        localStorage.setItem('cf_admin_key', 'mock_admin_key');
        if (typeof loadFeedbackWall === 'function') loadFeedbackWall();
        if (typeof loadLeaderboard === 'function') loadLeaderboard();
        if (typeof renderAdminModeration === 'function') renderAdminModeration();
    """)
    page.wait_for_timeout(500)

    # Screenshot feedback section
    sec_fb = page.locator('#sec-feedback')
    box = sec_fb.bounding_box()
    page.screenshot(path='artifacts/feedback_header_qr_relocated.png', clip={'x': box['x'], 'y': box['y'], 'width': box['width'], 'height': 350})
    print("Saved screenshot of relocated Feedback header QR code: artifacts/feedback_header_qr_relocated.png")

    browser.close()

print("\n>>> ALL CHECKS PASSED: FEEDBACK QR RELOCATED & ADMIN RENAME FUNCTIONS VERIFIED! <<<")
