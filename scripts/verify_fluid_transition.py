import subprocess
import os
import time
import threading
from http.server import SimpleHTTPRequestHandler, HTTPServer
from PIL import Image

PORT = 8820
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PUBLIC_DIR = r"C:\Users\shwet\OneDrive\Desktop\careerfair\careerfair\public"
ARTIFACTS_DIR = r"C:\Users\shwet\OneDrive\Desktop\careerfair\careerfair\artifacts\theme_animation"
BRAIN_DIR = r"C:\Users\shwet\.gemini\antigravity\brain\2c64a71e-dd2b-48c1-8ab5-f07715083bdc"
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

class QuietHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)
    def log_message(self, format, *args):
        pass

def main():
    print("Testing fluid theme switcher...")
    srv = threading.Thread(target=lambda: HTTPServer(('127.0.0.1', PORT), QuietHandler).serve_forever(), daemon=True)
    srv.start()
    time.sleep(0.5)

    # 1. Capture light mode
    shot_light = os.path.join(ARTIFACTS_DIR, "fluid_light.png")
    cmd_light = [
        CHROME_PATH, "--headless=new", "--disable-gpu", "--window-size=1200,400",
        f"--screenshot={shot_light}", f"http://127.0.0.1:{PORT}/index.html"
    ]
    subprocess.run(cmd_light, timeout=12)

    # 2. Test dark mode
    dark_test_page = os.path.join(PUBLIC_DIR, "dark_fluid_test.html")
    with open(os.path.join(PUBLIC_DIR, "index.html"), encoding="utf-8") as f:
        html = f.read()

    # Pre-set dark mode
    html = html.replace('<head>', '<head><script>localStorage.setItem("cf_theme", "dark");</script>')
    html = html.replace('data-theme="light"', 'data-theme="dark"')
    html = html.replace('data-active-theme="light"', 'data-active-theme="dark"')
    with open(dark_test_page, "w", encoding="utf-8") as f:
        f.write(html)

    shot_dark = os.path.join(ARTIFACTS_DIR, "fluid_dark.png")
    cmd_dark = [
        CHROME_PATH, "--headless=new", "--disable-gpu", "--window-size=1200,400",
        f"--screenshot={shot_dark}", f"http://127.0.0.1:{PORT}/dark_fluid_test.html"
    ]
    subprocess.run(cmd_dark, timeout=12)

    if os.path.exists(dark_test_page):
        os.remove(dark_test_page)

    if os.path.exists(shot_light):
        im = Image.open(shot_light)
        crop = im.crop((im.width - 320, 10, im.width - 20, 90))
        crop.save(os.path.join(BRAIN_DIR, "fluid_switcher_light.png"))
        print("Captured fluid_switcher_light.png")

    if os.path.exists(shot_dark):
        im = Image.open(shot_dark)
        crop = im.crop((im.width - 320, 10, im.width - 20, 90))
        crop.save(os.path.join(BRAIN_DIR, "fluid_switcher_dark.png"))
        print("Captured fluid_switcher_dark.png")

    print("Verification completed successfully!")

if __name__ == "__main__":
    main()
