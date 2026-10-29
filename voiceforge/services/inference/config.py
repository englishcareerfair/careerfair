"""
VoiceForge Inference Engine Configuration
"""
import os
import secrets
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
MODELS_DIR = BASE_DIR / "models"
MANIFESTS_DIR = MODELS_DIR / "manifests"

# Local cache for downloaded weights (configurable via VOICEFORGE_CACHE)
CACHE_DIR = Path(os.environ.get("VOICEFORGE_CACHE", Path.home() / ".voiceforge" / "models"))
OUTPUT_DIR = Path(os.environ.get("VOICEFORGE_OUTPUT", BASE_DIR / "storage" / "outputs"))
VOICES_DIR = Path(os.environ.get("VOICEFORGE_VOICES", BASE_DIR / "storage" / "voices"))

CACHE_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
VOICES_DIR.mkdir(parents=True, exist_ok=True)

# Network binding: strictly localhost by default for security
HOST = os.environ.get("VOICEFORGE_HOST", "127.0.0.1")
PORT = int(os.environ.get("VOICEFORGE_PORT", "8765"))

# Optional local API token for authenticated local-to-cloud proxying
API_TOKEN = os.environ.get("VOICEFORGE_API_TOKEN", "")

# Max concurrency for heavy model inference
MAX_CONCURRENCY = int(os.environ.get("VOICEFORGE_CONCURRENCY", "2"))
DEFAULT_SAMPLE_RATE = 24000
