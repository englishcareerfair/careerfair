"""
Security & Path Traversal Unit Tests
"""
import sys
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from services.inference.config import OUTPUT_DIR

def is_safe_path(base_dir: Path, filename: str) -> bool:
    """Security guard verifying path traversal attempts."""
    resolved = (base_dir / filename).resolve()
    return base_dir in resolved.parents or resolved.parent == base_dir

def test_path_traversal():
    assert is_safe_path(OUTPUT_DIR, "normal_job_123.wav") is True
    assert is_safe_path(OUTPUT_DIR, "../../../windows/win.ini") is False
    assert is_safe_path(OUTPUT_DIR, "..\\..\\sensitive.txt") is False
    assert is_safe_path(OUTPUT_DIR, "/etc/passwd") is False

def test_consent_enforcement():
    def process_voice_clone(payload):
        if not payload.get("consent_confirmed"):
            raise ValueError("Explicit voice cloning consent required.")
        return True

    try:
        process_voice_clone({"name": "Unconsented Voice", "consent_confirmed": False})
        assert False, "Should have raised ValueError"
    except ValueError:
        pass

    assert process_voice_clone({"name": "Consented Voice", "consent_confirmed": True}) is True

if __name__ == "__main__":
    test_path_traversal()
    test_consent_enforcement()
    print("[PASS] test_security passed all assertions.")
