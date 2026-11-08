import os, sys, http.server, socketserver, threading, asyncio, json, urllib.request

PORT = 8976
DIRECTORY = r'D:\TANMAY\careerfair\careerfair\public'

VOICES = [
    ('default', 'tutorial_default.mp3', 'River (Studio Default)'),
    ('SAz9YHcvj6GT2YYXdXww', 'tutorial_SAz9YHcvj6GT2YYXdXww.mp3', 'River (Informative Studio)'),
    ('JBFqnCBsd6RMkjVDRZzb', 'tutorial_JBFqnCBsd6RMkjVDRZzb.mp3', 'George (Warm Storyteller)'),
    ('EXAVITQu4vr4xnSDxMaL', 'tutorial_EXAVITQu4vr4xnSDxMaL.mp3', 'Sarah (Mature Reassuring)'),
    ('Xb7hH8MSUJpSbSDYk0k2', 'tutorial_Xb7hH8MSUJpSbSDYk0k2.mp3', 'Alice (Engaging Educator)'),
    ('IKne3meq5aSn9XLyUdCD', 'tutorial_IKne3meq5aSn9XLyUdCD.mp3', 'Charlie (Confident Energetic)')
]

def test_static_audio_assets():
    print("\n=== STEP 1: Verify All Pre-recorded Tutorial & Greeting Audio Assets ===")
    for vid, fname, name in VOICES:
        path = os.path.join(DIRECTORY, 'audio', 'tutorial', fname)
        assert os.path.exists(path), f"Missing tutorial audio file: {path}"
        size = os.path.getsize(path)
        assert size > 500000, f"Tutorial audio file too small ({size} bytes): {path}"
        with open(path, 'rb') as f:
            header = f.read(3)
            assert header == b'ID3', f"Invalid MP3 ID3 header in: {path}"
        print(f"  [OK] Tutorial audio valid for {vid} ({name}): {fname} ({size:,} bytes)")

    for vid, _, _ in VOICES:
        gname = f"greeting_{vid}.mp3" if vid != 'default' else "greeting_default.mp3"
        path = os.path.join(DIRECTORY, 'audio', 'greeting', gname)
        assert os.path.exists(path), f"Missing greeting audio file: {path}"
        size = os.path.getsize(path)
        assert size > 300000, f"Greeting audio file too small ({size} bytes): {path}"
        print(f"  [OK] Greeting audio valid for {vid}: {gname} ({size:,} bytes)")

def test_local_server_routes():
    print("\n=== STEP 2: Verify HTTP Serving of Tutorial Assets ===")
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=DIRECTORY, **kwargs)
        def log_message(self, format, *args):
            pass

    httpd = socketserver.TCPServer(('127.0.0.1', PORT), Handler)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()

    try:
        for vid, fname, name in VOICES:
            url = f"http://127.0.0.1:{PORT}/audio/tutorial/{fname}"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req) as resp:
                assert resp.status == 200, f"Failed GET {url}: status {resp.status}"
                data = resp.read()
                assert len(data) > 500000, f"Response data too short for {url}"
                print(f"  [OK] HTTP GET 200 OK: /audio/tutorial/{fname} ({len(data):,} bytes)")
    finally:
        httpd.shutdown()

if __name__ == '__main__':
    test_static_audio_assets()
    test_local_server_routes()
    print("\n=======================================================")
    print("ALL STATIC AUDIO ASSETS & HTTP ROUTES VERIFIED CLEANLY!")
    print("=======================================================")
