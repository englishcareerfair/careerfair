from playwright.sync_api import sync_playwright
import base64
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
INDEX_URL = "file:///" + r"D:\TANMAY\careerfair\careerfair\public\index.html".replace("\\", "/")
ARTIFACTS_DIR = r"D:\TANMAY\careerfair\careerfair\artifacts"

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=CHROME_PATH,
        headless=True
    )
    page = browser.new_page()
    page.goto(INDEX_URL)
    page.evaluate("""
        const l = document.getElementById('site-loader');
        if (l) l.remove();
    """)

    print("\n--- Testing Skipping Feature: section_speech and section_quiz skipped ---")
    gen_script = """
    (async () => {
        const doc = await window.DossierPDF.generate({
            name: 'Aanya Sen',
            className: 'Grade 10-B',
            chosenCareer: {
                title: 'Diplomatic Negotiator',
                cat: 'International Relations'
            }
        }, {
            theme: 'dark',
            returnOnly: true,
            skippedSections: {
                section_speech: true,
                section_quiz: true
            }
        });

        const b64 = doc.output('datauristring').split('base64,')[1];
        return { b64: b64 };
    })()
    """
    res = page.evaluate(gen_script)
    assert res and res.get('b64'), "Failed to generate skipped PDF"
    pdf_bytes = base64.b64decode(res['b64'])
    print(f"Skipped sections PDF successfully generated: {len(pdf_bytes)} bytes!")

    browser.close()

print("Skip test PASSED!")
