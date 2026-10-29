# VoiceForge Architecture & System Specification

VoiceForge is a production-grade, self-hostable, offline-first voice cloning and speech synthesis studio designed as an open-source alternative to proprietary voice platforms.

## 1. High-Level System Architecture

```
                       ┌──────────────────────────────────────────────┐
                       │           VoiceForge Studio (PWA)            │
                       │    React + TypeScript + Vite + Web Audio     │
                       └──────────────────────┬───────────────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      │                                               │
           [Strict OFFLINE / Local]                      [Optional Cloud Gateway]
                      │                                               │
                      ▼                                               ▼
     ┌─────────────────────────────────┐             ┌─────────────────────────────────┐
     │  Local Inference Engine Server  │             │    Cloudflare Worker Gateway    │
     │      Python 3.10+ (127.0.0.1)   │             │   Routing Engine & Auth Policy  │
     │  - Hardware Diagnostics Engine  │             │   - D1 Database (careerfair-db) │
     │  - Phonetic Text Chunker        │             │   - Global Data Synchronization │
     │  - Model Registry & Downloader  │             │   - Cloud Provider Adapters     │
     │  - Zero-Pop Audio Stitcher      │             │   - R2 Object Storage (Optional)│
     └────────────────┬────────────────┘             └────────────────┬────────────────┘
                      │                                               │
       ┌──────────────┴──────────────┐                 ┌──────────────┴──────────────┐
       ▼                             ▼                 ▼                             ▼
┌──────────────┐             ┌──────────────┐   ┌──────────────┐             ┌──────────────┐
│ Neural       │             │ Resemble AI  │   │ Qwen3-TTS    │             │ Fish Speech  │
│ Starter (MIT)│             │ Chatterbox   │   │ & XTTS-v2    │             │ GPU Endpoints│
└──────────────┘             └──────────────┘   └──────────────┘             └──────────────┘
```

## 2. Component Responsibilities

### A. Frontend Studio (`apps/web`)
* **Technology:** React 18, TypeScript, Vite, Web Audio API, Service Worker.
* **Capabilities:** Multiline text editor, character & word counters, chunk estimator, voice profile selection, reference microphone recording & file upload, consent confirmation, audio waveform preview, and dual WAV/MP3 downloads.
* **Offline PWA:** Service worker caches application shell assets. (Note: UI shell caching does not run multi-gigabyte PyTorch models in browser memory).

### B. Cloudflare Gateway Worker (`apps/worker`)
* **Technology:** Cloudflare Workers, TypeScript, Cloudflare D1 SQL database (`careerfair-db`).
* **Routing Policies:**
  * `OFFLINE_ONLY`: Refuses all cloud requests; zero data ever leaves the local computer.
  * `LOCAL_FIRST`: Prefers local engine; fails over to cloud only if explicitly enabled with disclosure.
  * `CLOUD_FIRST`: Prefers cloud provider; local engine fallback.
  * `CLOUD_ONLY`: Exclusively remote cloud inference.
  * `MANUAL`: Per-generation route selection.
* **Database & Persistence:** Stores audit logs, feedback, generation metadata, and leaderboards permanently in Cloudflare D1 with global JSON/CSV export.

### C. Local Inference Engine (`services/inference`)
* **Technology:** Python 3.10-3.13, bound strictly to `127.0.0.1:8765`.
* **Hardware Engine:** Probes CPU brand, RAM, NVIDIA GPU, VRAM, and CUDA status via `pynvml`/`torch`/`wmic` with zero-dependency fallbacks.
* **Text Chunker:** Splits scripts along paragraphs, sentence boundaries, and clause markers without cutting words.
* **Audio Stitcher:** Concatenates multi-chunk audio outputs with zero-pop smoothing.

### D. Model Context Protocol Server (`services/mcp`)
* Implements the official Model Context Protocol (MCP) enabling AI agents to generate speech, inspect hardware, clone voices, and switch execution modes.
