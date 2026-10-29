"""
VoiceForge Release Packager
Compiles the complete clean source, manifests, tests, docs, and scripts into 'voiceforge.zip'.
Excludes bulky virtual environments, node_modules, and cache files.
"""
import os
import sys
import zipfile
from pathlib import Path

# Force UTF-8 encoding
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

root_dir = Path(__file__).resolve().parent.parent
output_zip = root_dir.parent / "voiceforge.zip"

EXCLUDE_DIRS = {
    ".venv", "venv", "node_modules", ".git", "__pycache__", ".pytest_cache", "dist"
}

EXCLUDE_EXTS = {
    ".pyc", ".pyo", ".tmp", ".log"
}

def create_release_zip():
    print(f"Packaging VoiceForge into {output_zip}...")
    file_count = 0

    with zipfile.ZipFile(output_zip, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(root_dir):
            # Prune excluded directories
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

            for file in files:
                ext = os.path.splitext(file)[1]
                if ext in EXCLUDE_EXTS:
                    continue

                abs_path = Path(root) / file
                rel_path = abs_path.relative_to(root_dir.parent)

                zf.write(abs_path, str(rel_path))
                file_count += 1

    zip_size_mb = output_zip.stat().st_size / (1024 * 1024)
    print(f"[SUCCESS] Packaged {file_count} files into '{output_zip.name}' ({zip_size_mb:.2f} MB)")

if __name__ == "__main__":
    create_release_zip()
