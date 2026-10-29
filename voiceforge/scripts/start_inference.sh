#!/usr/bin/env bash
set -e
echo "Starting VoiceForge Local Inference Engine (127.0.0.1:8765)..."
if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
fi
python3 -m services.inference.server
