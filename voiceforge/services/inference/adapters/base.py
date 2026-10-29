"""
VoiceForge Base Model Adapter Interface
All model adapters (Chatterbox, Qwen3-TTS, Fish Speech, XTTS-v2, Lightweight) extend this.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from pathlib import Path

class BaseVoiceAdapter(ABC):
    def __init__(self, model_id: str, manifest: Dict[str, Any], cache_dir: Path):
        self.model_id = model_id
        self.manifest = manifest
        self.cache_dir = cache_dir
        self.model_path = cache_dir / model_id
        self.is_loaded = False

    @abstractmethod
    def is_installed(self) -> bool:
        """Verify actual model presence and integrity on disk. Never report True on empty dir."""
        pass

    @abstractmethod
    def load_model(self) -> bool:
        """Load weights into memory/device."""
        pass

    @abstractmethod
    def unload_model(self) -> bool:
        """Free memory and release resources."""
        pass

    @abstractmethod
    def generate(
        self,
        text: str,
        voice_profile: Optional[Dict[str, Any]] = None,
        speed: float = 1.0,
        pitch: float = 0.0,
        emotion: str = "neutral",
        cancellation_token: Optional[Dict[str, bool]] = None
    ) -> bytes:
        """Synthesize text into WAV byte data."""
        pass

    @abstractmethod
    def clone_voice(
        self,
        reference_audio_bytes: bytes,
        transcript: Optional[str] = None
    ) -> Dict[str, Any]:
        """Extract acoustic conditioning data from audio reference."""
        pass

    def get_capabilities(self) -> Dict[str, Any]:
        return self.manifest.get("capabilities", {})
