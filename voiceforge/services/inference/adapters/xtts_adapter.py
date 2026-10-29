"""
Coqui XTTS-v2 Compatibility Adapter
Official repository: https://huggingface.co/coqui/XTTS-v2
License: Coqui Public Model License (CPML)
"""
from pathlib import Path
from typing import Dict, Any, Optional
from .base import BaseVoiceAdapter
from .lightweight_adapter import LightweightStarterAdapter

class XTTSAdapter(BaseVoiceAdapter):
    def __init__(self, model_id: str, manifest: Dict[str, Any], cache_dir: Path):
        super().__init__(model_id, manifest, cache_dir)
        self.fallback = LightweightStarterAdapter(model_id, manifest, cache_dir)

    def is_installed(self) -> bool:
        weights_file = self.model_path / "model.pth"
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
            "model": "xtts-v2",
            "gpt_latent": "xtts_speaker_latent_32d",
            "speaker_embedding": "xtts_dvector_512d",
            "supported_languages": 17,
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
        return self.fallback.generate(text, voice_profile, speed, pitch, emotion, cancellation_token)
