import os
from PIL import Image

screenshots_dir = r"D:\TANMAY\careerfair\careerfair\artifacts\mobile_emulation\screenshots"
output_gif = r"D:\TANMAY\careerfair\careerfair\artifacts\mobile_emulation\mobile_emulator_recording.gif"

frame_files = [
    "01_hero_mobile.png",
    "02_careers_mobile.png",
    "03_speech_lab_mobile.png",
    "04_games_mobile.png",
    "05_leaderboard_mobile.png",
    "07_admin_voice_mobile.png"
]

images = []
for f in frame_files:
    p = os.path.join(screenshots_dir, f)
    if os.path.exists(p):
        im = Image.open(p).convert("RGB")
        # Resize slightly for optimized gif file size while preserving high visual quality
        im_resized = im.resize((360, int(360 * im.height / im.width)), Image.Resampling.LANCZOS)
        images.append(im_resized)
        print(f"Loaded frame: {f} ({im.size} -> {im_resized.size})")

if images:
    images[0].save(
        output_gif,
        save_all=True,
        append_images=images[1:],
        duration=1800, # 1.8s per slide
        loop=0,
        optimize=True
    )
    print(f"SUCCESS: Generated animated GIF recording at {output_gif} ({os.path.getsize(output_gif)} bytes)")
else:
    print("ERROR: No images found")
