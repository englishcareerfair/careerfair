# VoiceForge Security, Consent & Ethical Cloning Policy

## 1. Ethical Voice Cloning & Consent Enforcement

VoiceForge requires explicit user confirmation prior to extracting acoustic conditioning data or generating voice clones:
* The user must affirm ownership or explicit written permission from the speaker.
* Non-consensual voice synthesis or impersonation of individuals without authorization is strictly prohibited.
* Voice conditioning data is stored locally in `storage/voices/` by default and is never transmitted to public endpoints.

## 2. Local Network Isolation

* The Python inference engine binds exclusively to `127.0.0.1` (localhost).
* Cloud access is disabled by default.
* The local server will not bind to `0.0.0.0` or open external firewall rules without explicit user modification.

## 3. Path Traversal & Injection Defenses

* All audio file retrieval endpoints (`/audio/:filename`) use strict path resolution checks:
  ```python
  safe_path = OUTPUT_DIR / filename
  if OUTPUT_DIR not in safe_path.resolve().parents and safe_path.parent != OUTPUT_DIR:
      return 403 Forbidden
  ```
* Attempts to access `../` or system directories are rejected.
