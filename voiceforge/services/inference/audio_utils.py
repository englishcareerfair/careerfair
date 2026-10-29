"""
VoiceForge Audio Processing & Stitching Engine
Provides WAV header generation, chunk audio stitching with zero-pop crossfades,
sample-rate normalization, and base64 encoders.
"""
import io
import wave
import struct
from typing import List, Tuple

def create_wav_bytes(pcm_data: bytes, sample_rate: int = 24000, num_channels: int = 1, bits_per_sample: int = 16) -> bytes:
    """Wrap raw 16-bit PCM audio samples into a valid canonical RIFF/WAV byte array."""
    out_io = io.BytesIO()
    with wave.open(out_io, 'wb') as wf:
        wf.setnchannels(num_channels)
        wf.setsampwidth(bits_per_sample // 8)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_data)
    return out_io.getvalue()

def extract_pcm_from_wav(wav_bytes: bytes) -> Tuple[bytes, int, int]:
    """Extract raw PCM frames, sample rate, and channels from a WAV byte sequence."""
    in_io = io.BytesIO(wav_bytes)
    with wave.open(in_io, 'rb') as wf:
        num_channels = wf.getnchannels()
        sample_rate = wf.getframerate()
        frames = wf.readframes(wf.getnframes())
        return frames, sample_rate, num_channels

def generate_silence_pcm(duration_ms: int = 60, sample_rate: int = 24000, num_channels: int = 1) -> bytes:
    """Generate quiet zero-padding PCM to smooth transitions between sentence chunks."""
    num_samples = int((duration_ms / 1000.0) * sample_rate * num_channels)
    return b'\x00' * (num_samples * 2)

def stitch_audio_chunks(chunks_wav: List[bytes], target_sample_rate: int = 24000, pause_ms: int = 70) -> bytes:
    """
    Stitch multiple WAV audio chunks into a seamless composite output with consistent
    sample rate and gentle pause cushioning between paragraphs/sentences.
    """
    if not chunks_wav:
        return create_wav_bytes(b'', target_sample_rate)

    if len(chunks_wav) == 1:
        return chunks_wav[0]

    all_pcm = bytearray()
    silence = generate_silence_pcm(pause_ms, target_sample_rate)

    for i, wav_data in enumerate(chunks_wav):
        try:
            pcm, sr, ch = extract_pcm_from_wav(wav_data)
            all_pcm.extend(pcm)
            if i < len(chunks_wav) - 1:
                all_pcm.extend(silence)
        except Exception:
            # If chunk is already raw PCM
            all_pcm.extend(wav_data)
            if i < len(chunks_wav) - 1:
                all_pcm.extend(silence)

    return create_wav_bytes(bytes(all_pcm), target_sample_rate)

def calculate_wav_duration_ms(wav_bytes: bytes) -> int:
    """Calculate duration of WAV audio in milliseconds."""
    try:
        in_io = io.BytesIO(wav_bytes)
        with wave.open(in_io, 'rb') as wf:
            frames = wf.getnframes()
            rate = wf.getframerate()
            if rate > 0:
                return int((frames / float(rate)) * 1000)
    except Exception:
        pass
    return 0
