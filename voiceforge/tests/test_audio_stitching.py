"""
Unit tests for VoiceForge Audio Stitching Engine
"""
import sys
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from services.inference.audio_utils import (
    create_wav_bytes,
    extract_pcm_from_wav,
    stitch_audio_chunks,
    calculate_wav_duration_ms
)

def test_wav_creation_and_extraction():
    pcm = b'\x00\x10' * 2400 # 2400 samples = 0.1s at 24000 Hz
    wav_bytes = create_wav_bytes(pcm, sample_rate=24000)
    assert len(wav_bytes) > len(pcm)
    assert wav_bytes[:4] == b'RIFF'
    assert wav_bytes[8:12] == b'WAVE'

    extracted_pcm, sr, ch = extract_pcm_from_wav(wav_bytes)
    assert extracted_pcm == pcm
    assert sr == 24000
    assert ch == 1

def test_chunk_stitching_and_duration():
    chunk1_pcm = b'\x05\x00' * 4800 # 0.2s
    chunk2_pcm = b'\x0a\x00' * 4800 # 0.2s
    wav1 = create_wav_bytes(chunk1_pcm, sample_rate=24000)
    wav2 = create_wav_bytes(chunk2_pcm, sample_rate=24000)

    stitched = stitch_audio_chunks([wav1, wav2], target_sample_rate=24000, pause_ms=50)
    dur_ms = calculate_wav_duration_ms(stitched)
    # Total should be approx 200ms + 200ms + 50ms pause = ~450ms
    assert 400 <= dur_ms <= 500

if __name__ == "__main__":
    test_wav_creation_and_extraction()
    test_chunk_stitching_and_duration()
    print("[PASS] test_audio_stitching passed all assertions.")
