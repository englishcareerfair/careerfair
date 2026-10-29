#!/usr/bin/env bash
set -e
echo "Launching VoiceForge Studio Interface (http://localhost:3000)..."
python3 -m http.server 3000 --directory apps/web/public
