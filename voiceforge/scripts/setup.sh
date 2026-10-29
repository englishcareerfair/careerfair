#!/usr/bin/env bash
set -e

echo "============================================================"
echo "  VoiceForge — Offline-First AI Voice Studio Setup (Linux/macOS)"
echo "============================================================"

if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 is not installed or not in your PATH."
    exit 1
fi

echo "[1/3] Creating Python virtual environment (.venv)..."
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi

echo "[2/3] Activating virtual environment..."
source .venv/bin/activate

echo "[3/3] Installing lightweight dependencies..."
pip install --upgrade pip
pip install -r services/inference/requirements.txt

echo ""
echo "============================================================"
echo "  VoiceForge setup completed successfully!"
echo "  Run './scripts/start_inference.sh' to launch local engine."
echo "  Run './scripts/start_web.sh' to launch Studio UI."
echo "============================================================"
