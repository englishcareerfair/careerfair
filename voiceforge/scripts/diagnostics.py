"""
VoiceForge CLI Diagnostics Command
Inspects hardware, system RAM, CPU, NVIDIA GPU/VRAM, and model readiness.
"""
import sys
import os
from pathlib import Path

# Force UTF-8 encoding on Windows cp1252
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Add project root to path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from services.inference.hardware import inspect_full_hardware
from services.inference.registry import ModelRegistry
from services.inference.config import CACHE_DIR

def run_diagnostics():
    registry = ModelRegistry()
    report = inspect_full_hardware(registry.manifests, CACHE_DIR)

    print("============================================================")
    print("  VOICEFORGE SYSTEM HARDWARE & DIAGNOSTICS REPORT")
    print("============================================================")
    print(f"OS Platform:          {report['os_platform']} ({report['os_version']}) [{report['arch']}]")
    print(f"Python Runtime:       {report['python_version']}")
    print(f"Processor (CPU):      {report['cpu_brand']} ({report['cpu_cores']} cores, AVX2: {report['has_avx2']})")
    print(f"System RAM:           {report['total_ram_mb']} MB Total ({report['available_ram_mb']} MB Available)")
    print(f"Free Disk Storage:    {report['free_disk_space_mb']} MB available in model cache")
    print("------------------------------------------------------------")
    if report['has_gpu']:
        print(f"NVIDIA GPU:           {report['gpu_name']}")
        print(f"VRAM Memory:          {report['vram_total_mb']} MB Total ({report['vram_free_mb']} MB Free)")
        print(f"CUDA Status:          Available ({report['cuda_version']})")
    else:
        print("NVIDIA GPU:           None detected (CPU execution fallback active)")
        print("CUDA Status:          Unavailable (CPU mode)")
    print("------------------------------------------------------------")
    print("MODEL COMPATIBILITY EVALUATION:")
    for mid, status in report['model_compatibility'].items():
        symbol = "[OK] " if status == "compatible" else ("[WARN]" if "reduced" in status else "[FAIL]")
        print(f"  {symbol} [{status.upper()}] {mid}")
    print("============================================================")

if __name__ == "__main__":
    run_diagnostics()
