# VoiceForge Hardware Compatibility & System Matrix

## 1. Operating System Support

| Operating System | Support Level | Hardware Acceleration | Notes |
| :--- | :--- | :--- | :--- |
| **Windows 10 / 11 (x64)** | **Tier 1 (Full)** | NVIDIA CUDA 11.8 - 12.4 | Out-of-the-box support with batch launchers |
| **Ubuntu / Debian Linux (x64)** | **Tier 1 (Full)** | NVIDIA CUDA & ROCm | Automated bash scripts & systemd service |
| **macOS (Apple Silicon M1/M2/M3)** | **Tier 2 (Supported)** | MPS (Metal Performance Shaders) | Supported via Python PyTorch MPS backend |

## 2. Model Requirements & Resource Allocation

| Model ID | Model Name | Minimum System RAM | Recommended VRAM | CPU Fallback | Estimated Disk Size |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `neural-starter` | VoiceForge Neural Starter | 512 MB | 0 MB (CPU) | Yes (Real-time) | 0 MB (Embedded) |
| `chatterbox` | Resemble AI Chatterbox | 3 GB | 4 GB | Yes (1.2x real-time) | ~1.15 GB |
| `qwen3-tts` | Qwen3-TTS Expressive | 8 GB | 8 GB | Yes (Reduced speed) | ~3.80 GB |
| `fish-speech` | Fish Speech 1.5 Dual-AR | 8 GB | 8 GB | Yes (Reduced speed) | ~4.20 GB |
| `xtts-v2` | Coqui XTTS-v2 | 6 GB | 6 GB | Yes (0.8x real-time) | ~3.50 GB |

## 3. Classification Criteria

* **COMPATIBLE:** System possesses dedicated GPU with VRAM exceeding the model recommendation.
* **COMPATIBLE (REDUCED PERFORMANCE):** Model runs on CPU or GPU with lower VRAM using quantized weights or multi-pass generation.
* **INSUFFICIENT RESOURCES:** Available system RAM or disk space is below safety margins.
