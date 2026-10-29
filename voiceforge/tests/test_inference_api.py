"""
Integration tests for VoiceForge Local Inference Engine
"""
import sys
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from services.inference.registry import ModelRegistry
from services.inference.config import CACHE_DIR

def test_inference_lifecycle():
    registry = ModelRegistry()
    adapter = registry.get_active_adapter()
    assert adapter is not None

    # 1. Test model loading
    ok = adapter.load_model()
    assert ok is True
    assert adapter.is_loaded is True

    # 2. Test speech generation
    text = "Testing VoiceForge offline speech generation."
    wav_bytes = adapter.generate(text=text, speed=1.0)
    assert len(wav_bytes) > 1000
    assert wav_bytes[:4] == b"RIFF"

    # 3. Test voice cloning conditioning
    mock_audio = b"\x00\x10" * 4000 # mock reference PCM
    cond = adapter.clone_voice(mock_audio, transcript="Hello")
    assert cond.get("has_conditioning") is True
    assert "base_pitch_hz" in cond

    # 4. Test cancellation token
    cancel_token = {"cancelled": True}
    try:
        adapter.generate("Cancelled generation", cancellation_token=cancel_token)
        assert False, "Should have raised InterruptedError"
    except InterruptedError:
        pass # Expected

if __name__ == "__main__":
    test_inference_lifecycle()
    print("[PASS] test_inference_api passed all assertions.")
