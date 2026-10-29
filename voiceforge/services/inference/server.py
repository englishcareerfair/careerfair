"""
VoiceForge Local Inference Engine Server
Self-contained multi-threaded HTTP API bound strictly to localhost (127.0.0.1).
Zero public internet exposure by default.
"""
import os
import sys
import json
import time
import uuid
import threading
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

from .config import HOST, PORT, OUTPUT_DIR, VOICES_DIR, CACHE_DIR, MANIFESTS_DIR
from .hardware import inspect_full_hardware
from .registry import ModelRegistry
from .chunker import split_text_into_chunks
from .audio_utils import stitch_audio_chunks, calculate_wav_duration_ms

registry = ModelRegistry()
active_jobs = {}
cancellation_flags = {}

# In-memory admin settings with persistence
CONFIG_PATH = Path.home() / ".voiceforge" / "admin_config.json"
CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)

DEFAULT_CONFIG = {
    "routing_mode": "OFFLINE_ONLY",
    "cloud_enabled": False,
    "cloud_fallback_enabled": False,
    "cloud_storage_enabled": False,
    "cloud_history_enabled": False,
    "anonymous_analytics": False,
    "default_route": "local",
    "allowed_model_ids": ["neural-starter", "chatterbox", "qwen3-tts", "fish-speech", "xtts-v2"],
    "max_text_length": 15000,
    "max_upload_size_mb": 25,
    "max_local_concurrency": 2,
    "generation_timeout_seconds": 120,
    "allow_user_voice_cloning": True,
    "active_model_id": "neural-starter",
    "rate_limit_rpm": 60,
    "retention_days": 30,
    "updated_at": int(time.time() * 1000)
}

def load_admin_config():
    if CONFIG_PATH.exists():
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                return {**DEFAULT_CONFIG, **json.load(f)}
        except Exception:
            pass
    return DEFAULT_CONFIG.copy()

def save_admin_config(cfg):
    try:
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2)
    except Exception:
        pass

current_admin_config = load_admin_config()

class VoiceForgeHandler(BaseHTTPRequestHandler):
    def _send_json(self, data, status=200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-token")
        self.end_headers()
        self.wfile.write(body)

    def _send_audio(self, filepath: Path):
        if not filepath.exists():
            self._send_json({"error": "Audio file not found"}, 404)
            return
        data = filepath.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "audio/wav")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-token")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")
        if not path:
            path = "/"

        if path == "/health":
            self._send_json({
                "status": "ok",
                "engine": "VoiceForge Offline-First Engine",
                "version": "1.0.0",
                "routing_mode": current_admin_config["routing_mode"],
                "active_model": registry.active_model_id
            })
            return

        if path == "/diagnostics":
            diag = inspect_full_hardware(registry.manifests, CACHE_DIR)
            self._send_json(diag)
            return

        if path == "/models":
            self._send_json(registry.get_models_status())
            return

        if path == "/admin/config":
            self._send_json(current_admin_config)
            return

        if path == "/voices":
            voices = self._list_voices()
            self._send_json({"voices": voices})
            return

        if path.startswith("/jobs/"):
            job_id = path.split("/jobs/")[1]
            job = active_jobs.get(job_id)
            if job:
                self._send_json(job)
            else:
                self._send_json({"error": "Job not found"}, 404)
            return

        if path.startswith("/audio/"):
            filename = os.path.basename(path)
            # Path traversal prevention
            safe_path = OUTPUT_DIR / filename
            if OUTPUT_DIR in safe_path.resolve().parents or safe_path.parent == OUTPUT_DIR:
                self._send_audio(safe_path)
            else:
                self._send_json({"error": "Forbidden"}, 403)
            return

        self._send_json({"error": f"Endpoint '{path}' not found"}, 404)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")
        content_length = int(self.headers.get("Content-Length", 0))
        body_bytes = self.rfile.read(content_length) if content_length > 0 else b""
        data = {}
        if body_bytes:
            try:
                data = json.loads(body_bytes.decode("utf-8"))
            except Exception:
                pass

        if path == "/admin/config":
            global current_admin_config
            current_admin_config.update(data)
            current_admin_config["updated_at"] = int(time.time() * 1000)
            save_admin_config(current_admin_config)
            self._send_json({"ok": True, "config": current_admin_config})
            return

        if path.startswith("/models/") and path.endswith("/download"):
            mid = path.split("/models/")[1].split("/download")[0]
            try:
                res = registry.simulate_download(mid)
                self._send_json(res)
            except Exception as e:
                self._send_json({"error": str(e)}, 400)
            return

        if path.startswith("/models/") and path.endswith("/activate"):
            mid = path.split("/models/")[1].split("/activate")[0]
            ok = registry.activate_model(mid)
            if ok:
                current_admin_config["active_model_id"] = mid
                save_admin_config(current_admin_config)
                self._send_json({"ok": True, "active_model_id": mid})
            else:
                self._send_json({"error": f"Model '{mid}' not found"}, 404)
            return

        if path.startswith("/models/") and path.endswith("/delete"):
            mid = path.split("/models/")[1].split("/delete")[0]
            confirm = data.get("confirm", False)
            try:
                registry.remove_model(mid, confirm=confirm)
                self._send_json({"ok": True, "deleted": mid})
            except Exception as e:
                self._send_json({"error": str(e)}, 400)
            return

        if path == "/voices":
            voice = self._save_voice(data)
            self._send_json({"ok": True, "voice": voice})
            return

        if path == "/tts/generate":
            job = self._start_tts_generation(data)
            self._send_json(job)
            return

        if path.startswith("/jobs/") and path.endswith("/cancel"):
            job_id = path.split("/jobs/")[1].split("/cancel")[0]
            if job_id in cancellation_flags:
                cancellation_flags[job_id]["cancelled"] = True
                if job_id in active_jobs:
                    active_jobs[job_id]["status"] = "cancelled"
                self._send_json({"ok": True, "job_id": job_id, "status": "cancelled"})
            else:
                self._send_json({"error": "Job not active or not cancellable"}, 404)
            return

        self._send_json({"error": f"POST endpoint '{path}' not found"}, 404)

    def _list_voices(self):
        voices = []
        # Built-in default studio profiles
        voices.append({
            "id": "voice-studio-artisan",
            "name": "Aarav Studio (Articulate Indian/Global English)",
            "description": "Crisp, balanced narrative voice for technical and professional scripts.",
            "language": "en-IN",
            "model_id": "neural-starter",
            "is_cloned": False,
            "created_at": 1793280000000,
            "consent_confirmed": True
        })
        voices.append({
            "id": "voice-studio-aditi",
            "name": "Aditi Warmth (Engaging Conversational)",
            "description": "Warm, engaging acoustic timbre for presentations, tutorials, and speeches.",
            "language": "en-IN",
            "model_id": "neural-starter",
            "is_cloned": False,
            "created_at": 1793280000000,
            "consent_confirmed": True
        })

        # Load user saved/cloned voices from VOICES_DIR
        for p in VOICES_DIR.glob("*.json"):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    voices.append(json.load(f))
            except Exception:
                pass
        return voices

    def _save_voice(self, data):
        voice_id = data.get("id") or f"voice-{uuid.uuid4().hex[:8]}"
        name = data.get("name", "Custom Voice")
        ref_audio_b64 = data.get("reference_audio_base64")
        transcript = data.get("reference_transcript", "")
        consent = data.get("consent_confirmed", False)

        if not consent:
            raise ValueError("Explicit voice cloning consent required.")

        model_id = data.get("model_id") or registry.active_model_id
        adapter = registry.adapters.get(model_id) or registry.get_active_adapter()

        conditioning = {}
        if ref_audio_b64:
            import base64
            ref_bytes = base64.b64decode(ref_audio_b64)
            conditioning = adapter.clone_voice(ref_bytes, transcript)

        voice = {
            "id": voice_id,
            "name": name,
            "description": data.get("description", "User-cloned acoustic profile"),
            "language": data.get("language", "en"),
            "model_id": model_id,
            "sample_rate": 24000,
            "is_cloned": bool(ref_audio_b64),
            "conditioning_data": conditioning,
            "consent_confirmed": True,
            "created_at": int(time.time() * 1000),
            "updated_at": int(time.time() * 1000)
        }

        with open(VOICES_DIR / f"{voice_id}.json", "w", encoding="utf-8") as f:
            json.dump(voice, f, indent=2)

        return voice

    def _start_tts_generation(self, data):
        text = (data.get("text") or "").strip()
        if not text:
            raise ValueError("Prompt text cannot be empty.")

        model_id = data.get("model_id") or registry.active_model_id
        voice_id = data.get("voice_id") or "voice-studio-artisan"
        speed = float(data.get("speed", 1.0))
        pitch = float(data.get("pitch", 0.0))
        emotion = data.get("emotion", "neutral")

        # Long-form chunking
        chunks = split_text_into_chunks(text, max_chars=400)
        job_id = f"job-{uuid.uuid4().hex[:12]}"
        
        job = {
            "id": job_id,
            "created_at": int(time.time() * 1000),
            "text": text,
            "voice_id": voice_id,
            "model_id": model_id,
            "route_taken": "local",
            "provider_name": f"VoiceForge Local ({model_id})",
            "status": "processing",
            "progress": 5,
            "total_chunks": len(chunks),
            "completed_chunks": 0,
            "audio_format": "wav"
        }
        active_jobs[job_id] = job
        cancellation_flags[job_id] = {"cancelled": False}

        # Resolve voice profile
        voice_profile = None
        voice_path = VOICES_DIR / f"{voice_id}.json"
        if voice_path.exists():
            try:
                with open(voice_path, "r", encoding="utf-8") as f:
                    voice_profile = json.load(f)
            except Exception:
                pass

        # Asynchronous generation thread
        def worker():
            token = cancellation_flags[job_id]
            adapter = registry.adapters.get(model_id) or registry.get_active_adapter()
            chunk_wavs = []

            try:
                for idx, chunk_text in enumerate(chunks):
                    if token["cancelled"]:
                        job["status"] = "cancelled"
                        return

                    wav_bytes = adapter.generate(
                        text=chunk_text,
                        voice_profile=voice_profile,
                        speed=speed,
                        pitch=pitch,
                        emotion=emotion,
                        cancellation_token=token
                    )
                    chunk_wavs.append(wav_bytes)
                    job["completed_chunks"] = idx + 1
                    job["progress"] = int(((idx + 1) / len(chunks)) * 90)

                # Stitch chunks with zero-pop smoothing
                final_wav = stitch_audio_chunks(chunk_wavs, target_sample_rate=24000)
                out_filename = f"{job_id}.wav"
                out_path = OUTPUT_DIR / out_filename
                out_path.write_bytes(final_wav)

                job["status"] = "completed"
                job["progress"] = 100
                job["completed_at"] = int(time.time() * 1000)
                job["audio_url"] = f"http://{HOST}:{PORT}/audio/{out_filename}"
                job["duration_ms"] = calculate_wav_duration_ms(final_wav)

            except Exception as e:
                job["status"] = "failed"
                job["error"] = str(e)

        t = threading.Thread(target=worker, daemon=True)
        t.start()
        return job

def run_server():
    server = HTTPServer((HOST, PORT), VoiceForgeHandler)
    print(f"==================================================")
    print(f" VoiceForge Local Inference Engine Server Active")
    print(f" URL: http://{HOST}:{PORT}")
    print(f" Bound strictly to localhost (Zero Public Exposure)")
    print(f" Mode: {current_admin_config['routing_mode']}")
    print(f" Models Loaded: {list(registry.manifests.keys())}")
    print(f"==================================================")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down VoiceForge engine gracefully...")
        server.server_close()

if __name__ == "__main__":
    run_server()
