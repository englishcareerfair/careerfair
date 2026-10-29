import os
import sys
import subprocess
import time
import threading
from http.server import SimpleHTTPRequestHandler, HTTPServer
from PIL import Image

PORT = 8799
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
CAREERFAIR_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PUBLIC_DIR = os.path.join(CAREERFAIR_ROOT, "public")
ARTIFACTS_DIR = os.path.join(CAREERFAIR_ROOT, "artifacts", "theme_animation")
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

class QuietHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)
    def log_message(self, format, *args):
        pass

def start_server():
    httpd = HTTPServer(('127.0.0.1', PORT), QuietHandler)
    httpd.serve_forever()

def main():
    print("Verifying theme animation files...")
    html_path = os.path.join(PUBLIC_DIR, "index.html")
    css_path = os.path.join(PUBLIC_DIR, "styles.css")
    js_path = os.path.join(PUBLIC_DIR, "app.js")

    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()
    with open(css_path, "r", encoding="utf-8") as f:
        css = f.read()
    with open(js_path, "r", encoding="utf-8") as f:
        js = f.read()

    assert "theme-switcher-slider" in html, "Missing slider element in index.html"
    assert "theme-btn-icon" in html, "Missing icon wrapper in index.html"
    assert "styles.css?v=6.7" in html, "Missing cache buster v=6.7 for styles.css"
    assert "app.js?v=6.7" in html, "Missing cache buster v=6.7 for app.js"

    assert ".theme-switcher-slider" in css, "Missing .theme-switcher-slider CSS"
    assert "sliderElasticRight" in css, "Missing sliderElasticRight animation"
    assert "sliderElasticLeft" in css, "Missing sliderElasticLeft animation"
    assert "prefers-reduced-motion" in css, "Missing prefers-reduced-motion in styles.css"

    assert "data-active-theme" in js, "Missing data-active-theme in app.js"
    assert "theme-switching" in js, "Missing theme-switching in app.js"
    assert "document.startViewTransition" in js, "Missing View Transitions API in app.js"
    print("Static code assertions: ALL PASSED!")

    # Start test server
    srv_thread = threading.Thread(target=start_server, daemon=True)
    srv_thread.start()
    time.sleep(1)

    # Capture Light mode header screenshot
    light_shot = os.path.join(ARTIFACTS_DIR, "theme_light.png")
    dark_shot = os.path.join(ARTIFACTS_DIR, "theme_dark.png")

    print("Capturing theme switcher in Chrome...")
    cmd_light = [
        CHROME_PATH,
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--window-size=1200,400",
        f"--screenshot={light_shot}",
        f"http://127.0.0.1:{PORT}"
    ]
    subprocess.run(cmd_light, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=12)

    if os.path.exists(light_shot):
        print(f"Captured Light Mode screenshot: {light_shot} ({os.path.getsize(light_shot)} bytes)")
    else:
        print("Warning: light mode screenshot could not be captured")

    print("Theme switcher verification finished successfully.")

if __name__ == "__main__":
    main()
