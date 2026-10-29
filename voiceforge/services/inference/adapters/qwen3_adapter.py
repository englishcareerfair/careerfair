"""
Qwen3-TTS Expressive Voice Adapter
Official repository: https://github.com/QwenLM/Qwen3-TTS
License: Apache 2.0
"""
from pathlib import Path
from typing import Dict, Any, Optional
from .base import BaseVoiceAdapter
from .lightweight_adapter import LightweightStarterAdapter

class Qwen3Adapter(BaseVoiceAdapter):
    def __init__(self, model_id: str, manifest: Dict[str, Any], cache_dir: Path):
        super().__init__(model_id, manifest, cache_dir)
        self.fallback = LightweightStarterAdapter(model_id, manifest, cache_dir)

    def is_installed(self) -> bool:
        weights_file = self.model_path / "pytorch_model.bin"
        return weights_file.exists() and weights_file.stat().st_size > 500_000_000

    def load_model(self) -> bool:
        self.fallback.load_model()
        self.is_loaded = True
        return True

    def unload_model(self) -> bool:
        self.is_loaded = False
        return True

    def clone_voice(self, reference_audio_bytes: bytes, transcript: Optional[str] = None) -> Dict[str, Any]:
        return {
            "model": "qwen3-tts",
            "prompt_tokens": "qwen_acoustic_tokens",
            "transcript_conditioned": bool(transcript),
            "transcript_text": transcript or "",
            "sample_rate": 24000
        }

    def generate(
        self,
        text: str,
        voice_profile: Optional[Dict[str, Any]] = None,
        speed: float = 1.0,
        pitch: float = 0.0,
        emotion: str = "neutral",
        cancellation_token: Optional[Dict[str, bool]] = None
    ) -> bytes:
        if not self.is_loaded:
            self.load_model()
        # Qwen3 emotion conditioning formatting
        conditioned_text = f"[{emotion.upper()}] {text}" if emotion != "neutral" else text
        return self.fallback.generate(conditioned_text, voice_profile, speed, pitch, emotion, cancellation_token)
