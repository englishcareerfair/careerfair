# VoiceForge Model Manifest Registry

This directory contains declarative metadata specifications for all supported offline and self-hosted voice models in VoiceForge.

## Registered Models

| Model ID | Name | Architecture | License | Disk Size | Target Languages | Recommended Hardware |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `neural-starter` | VoiceForge Neural Starter | Lightweight Neural Synthesizer | MIT | 0 MB (Embedded) | Multilingual (10+) | Standard CPU / Any Laptop |
| `chatterbox` | Resemble AI Chatterbox | Flow-Matching Diffusion / Fast Conv | Apache-2.0 | ~1.15 GB | English | 4 GB VRAM or Modern CPU |
| `qwen3-tts` | Qwen3-TTS | Large Audio-Language Model | Apache-2.0 | ~3.80 GB | Multilingual (8+) | 8 GB VRAM (CUDA 12+) |
| `fish-speech` | Fish Speech 1.5 | Dual-AR + VQ-GAN Acoustic Tokens | Apache-2.0 | ~4.20 GB | Multilingual (7+) | 8 GB VRAM / High-RAM CPU |
| `xtts-v2` | Coqui XTTS-v2 | Autoregressive GPT + HiFi-GAN | CPML | ~3.50 GB | 17 Languages | 6 GB VRAM or Fast CPU |

Weights are **never committed** to source control or bundled in git releases. They are downloaded directly from their official distribution endpoints via the VoiceForge Model Manager or CLI scripts (`python scripts/download_model.py <model-id>`).
