import subprocess
import os
import time
import threading
from http.server import SimpleHTTPRequestHandler, HTTPServer
from PIL import Image

PORT = 8815
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PUBLIC_DIR = r"C:\Users\shwet\OneDrive\Desktop\careerfair\careerfair\public"
BRAIN_DIR = r"C:\Users\shwet\.gemini\antigravity\brain\2c64a71e-dd2b-48c1-8ab5-f07715083bdc"

class QuietHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)
    def log_message(self, format, *args):
        pass

def main():
    srv = threading.Thread(target=lambda: HTTPServer(('127.0.0.1', PORT), QuietHandler).serve_forever(), daemon=True)
    srv.start()
    time.sleep(0.5)

    dark_page = os.path.join(PUBLIC_DIR, "index_dark_test.html")
    with open(os.path.join(PUBLIC_DIR, "index.html"), encoding="utf-8") as f:
        c = f.read()

    # Inject localStorage dark theme before app.js boots
    c = c.replace('<head>', '<head><script>localStorage.setItem("cf_theme", "dark");</script>')
    c = c.replace('data-theme="light"', 'data-theme="dark"')
    c = c.replace('data-active-theme="light"', 'data-active-theme="dark"')

    with open(dark_page, "w", encoding="utf-8") as f:
        f.write(c)

    raw_dark = os.path.join(PUBLIC_DIR, "raw_actual_dark.png")
    cmd = [
        CHROME_PATH, "--headless=new", "--disable-gpu", "--window-size=1200,400",
        f"--screenshot={raw_dark}", f"http://127.0.0.1:{PORT}/index_dark_test.html"
    ]
    subprocess.run(cmd, timeout=12)

    if os.path.exists(raw_dark):
        im = Image.open(raw_dark)
        crop = im.crop((im.width - 320, 10, im.width - 20, 90))
        target_dark = os.path.join(BRAIN_DIR, "theme_switcher_actual_dark.png")
        crop.save(target_dark)
        print("Saved theme_switcher_actual_dark.png")
        os.remove(raw_dark)

    if os.path.exists(dark_page):
        os.remove(dark_page)

    light_crop_path = os.path.join(BRAIN_DIR, "theme_switcher_animated.png")
    dark_crop_path = os.path.join(BRAIN_DIR, "theme_switcher_actual_dark.png")

    if os.path.exists(light_crop_path) and os.path.exists(dark_crop_path):
        im_l = Image.open(light_crop_path).convert("RGBA")
        im_d = Image.open(dark_crop_path).convert("RGBA")

        if im_l.size != im_d.size:
            im_d = im_d.resize(im_l.size)

        frames = []
        for _ in range(8): frames.append(im_l.convert("RGB"))
        for i in range(1, 7):
            alpha = i / 7.0
            blend = Image.blend(im_l.convert("RGB"), im_d.convert("RGB"), alpha)
            frames.append(blend)
        for _ in range(8): frames.append(im_d.convert("RGB"))
        for i in range(1, 7):
            alpha = i / 7.0
            blend = Image.blend(im_d.convert("RGB"), im_l.convert("RGB"), alpha)
            frames.append(blend)

        gif_out = os.path.join(BRAIN_DIR, "theme_switcher_toggle_comparison.gif")
        frames[0].save(gif_out, save_all=True, append_images=frames[1:], duration=140, loop=0)
        print("Saved theme_switcher_toggle_comparison.gif")

if __name__ == "__main__":
    main()
