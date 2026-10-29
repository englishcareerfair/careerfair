# VoiceForge Offline-First Operation Guide

VoiceForge is engineered from the ground up for strict, zero-leak offline environments (air-gapped workstations, private studios, educational exhibitions).

## 1. Zero Network Leakage Guarantee

When **`OFFLINE ONLY`** mode is active:
* No text prompts are ever transmitted to any remote server or third party.
* No reference audio or voice cloning recordings leave your machine.
* The local Python inference engine binds strictly to `127.0.0.1` (localhost).
* The web studio UI loads entirely from local memory or service worker cache.
* Cloud fallback is physically blocked at the routing layer.

## 2. Air-Gapped Setup Workflow

1. **Pre-Download Weights:**
   On a connected machine, run:
   ```bash
   python scripts/download_model.py chatterbox
   ```
   Or use the bundled `neural-starter` engine which requires zero initial downloads.

2. **Transfer to Air-Gapped Machine:**
   Copy the `voiceforge` directory and the `~/.voiceforge/models` folder to the target computer.

3. **Launch Offline:**
   * **Windows:**
     ```cmd
     scripts\start_inference.bat
     scripts\start_web.bat
     ```
   * **Linux:**
     ```bash
     ./scripts/start_inference.sh
     ./scripts/start_web.sh
     ```

4. **Verify Offline Isolation:**
   Open the **Admin** tab and verify the persistent badge shows **`MODE: OFFLINE ONLY`**.
