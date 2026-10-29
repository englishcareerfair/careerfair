import os
import subprocess
import time
import threading
from http.server import SimpleHTTPRequestHandler, HTTPServer
from PIL import Image

PORT = 8812
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
CAREERFAIR_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PUBLIC_DIR = os.path.join(CAREERFAIR_ROOT, "public")
ARTIFACTS_DIR = os.path.join(CAREERFAIR_ROOT, "artifacts", "theme_animation")
BRAIN_DIR = r"C:\Users\shwet\.gemini\antigravity\brain\2c64a71e-dd2b-48c1-8ab5-f07715083bdc"
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
    srv = threading.Thread(target=start_server, daemon=True)
    srv.start()
    time.sleep(0.5)

    dark_html = f"""<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="http://127.0.0.1:{PORT}/styles.css?v=6.7">
  <style>
    body {{ background: #0c0d10; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }}
  </style>
</head>
<body>
  <div class="theme-switcher" data-active-theme="dark" role="radiogroup">
    <div class="theme-switcher-slider" aria-hidden="true"></div>
    <button class="theme-btn" data-theme-val="light" type="button">
      <span class="theme-btn-icon">☀️</span> <span class="theme-btn-text">Light</span>
    </button>
    <button class="theme-btn active" data-theme-val="dark" type="button">
      <span class="theme-btn-icon">🌙</span> <span class="theme-btn-text">Dark</span>
    </button>
  </div>
</body>
</html>"""

    light_html = f"""<!doctype html>
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="http://127.0.0.1:{PORT}/styles.css?v=6.7">
  <style>
    body {{ background: #f8fafc; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }}
  </style>
</head>
<body>
  <div class="theme-switcher" data-active-theme="light" role="radiogroup">
    <div class="theme-switcher-slider" aria-hidden="true"></div>
    <button class="theme-btn active" data-theme-val="light" type="button">
      <span class="theme-btn-icon">☀️</span> <span class="theme-btn-text">Light</span>
    </button>
    <button class="theme-btn" data-theme-val="dark" type="button">
      <span class="theme-btn-icon">🌙</span> <span class="theme-btn-text">Dark</span>
    </button>
  </div>
</body>
</html>"""

    with open(os.path.join(PUBLIC_DIR, "demo_dark.html"), "w", encoding="utf-8") as f:
        f.write(dark_html)
    with open(os.path.join(PUBLIC_DIR, "demo_light.html"), "w", encoding="utf-8") as f:
        f.write(light_html)

    dark_raw = os.path.join(ARTIFACTS_DIR, "raw_dark.png")
    light_raw = os.path.join(ARTIFACTS_DIR, "raw_light.png")

    subprocess.run([
        CHROME_PATH, "--headless=new", "--disable-gpu", "--window-size=400,200",
        f"--screenshot={dark_raw}", f"http://127.0.0.1:{PORT}/demo_dark.html"
    ], timeout=10)

    subprocess.run([
        CHROME_PATH, "--headless=new", "--disable-gpu", "--window-size=400,200",
        f"--screenshot={light_raw}", f"http://127.0.0.1:{PORT}/demo_light.html"
    ], timeout=10)

    if os.path.exists(dark_raw):
        im_dark = Image.open(dark_raw)
        crop_d = im_dark.crop((95, 75, 305, 125))
        dark_target = os.path.join(BRAIN_DIR, "theme_switcher_dark.png")
        crop_d.save(dark_target)
        print("Saved theme_switcher_dark.png")

    if os.path.exists(light_raw):
        im_light = Image.open(light_raw)
        crop_l = im_light.crop((95, 75, 305, 125))
        light_target = os.path.join(BRAIN_DIR, "theme_switcher_light.png")
        crop_l.save(light_target)
        print("Saved theme_switcher_light.png")

    # Clean up temp files
    for temp in ["demo_dark.html", "demo_light.html"]:
        p = os.path.join(PUBLIC_DIR, temp)
        if os.path.exists(p): os.remove(p)

    dark_p = os.path.join(BRAIN_DIR, "theme_switcher_dark.png")
    light_p = os.path.join(BRAIN_DIR, "theme_switcher_light.png")
    if os.path.exists(light_p) and os.path.exists(dark_p):
        im_l = Image.open(light_p).convert("RGB")
        im_d = Image.open(dark_p).convert("RGB")
        
        frames = []
        for _ in range(6): frames.append(im_l)
        for step in range(1, 6):
            frames.append(Image.blend(im_l, im_d, step / 6.0))
        for _ in range(6): frames.append(im_d)
        for step in range(1, 6):
            frames.append(Image.blend(im_d, im_l, step / 6.0))

        gif_path = os.path.join(BRAIN_DIR, "theme_switch_animation.gif")
        frames[0].save(gif_path, save_all=True, append_images=frames[1:], duration=150, loop=0)
        print(f"Generated animated transition GIF: {gif_path}")

if __name__ == "__main__":
    main()
