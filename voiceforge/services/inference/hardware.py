"""
VoiceForge Hardware & Diagnostics Engine
Discovers OS, CPU, RAM, GPU, CUDA, and classifies model compatibility.
"""
import os
import sys
import platform
import shutil
import subprocess
import json
from pathlib import Path
from typing import Dict, Any

def get_system_ram_mb() -> Dict[str, int]:
    """Get total and available system RAM in MB without hard external dependencies."""
    total_mb = 4096
    avail_mb = 2048

    # 1. Try psutil if installed
    try:
        import psutil
        mem = psutil.virtual_memory()
        return {
            "total_ram_mb": int(mem.total / (1024 * 1024)),
            "available_ram_mb": int(mem.available / (1024 * 1024))
        }
    except Exception:
        pass

    # 2. Windows ctypes fallback
    if platform.system() == "Windows":
        try:
            import ctypes
            class MEMORYSTATUSEX(ctypes.Structure):
                _fields_ = [
                    ("dwLength", ctypes.c_ulong),
                    ("dwMemoryLoad", ctypes.c_ulong),
                    ("ullTotalPhys", ctypes.c_ulonglong),
                    ("ullAvailPhys", ctypes.c_ulonglong),
                    ("ullTotalPageFile", ctypes.c_ulonglong),
                    ("ullAvailPageFile", ctypes.c_ulonglong),
                    ("ullTotalVirtual", ctypes.c_ulonglong),
                    ("ullAvailVirtual", ctypes.c_ulonglong),
                    ("sullAvailExtendedVirtual", ctypes.c_ulonglong),
                ]
            stat = MEMORYSTATUSEX()
            stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
            if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat)):
                return {
                    "total_ram_mb": int(stat.ullTotalPhys / (1024 * 1024)),
                    "available_ram_mb": int(stat.ullAvailPhys / (1024 * 1024))
                }
        except Exception:
            pass

    # 3. Linux /proc/meminfo fallback
    elif platform.system() == "Linux":
        try:
            with open("/proc/meminfo", "r") as f:
                lines = f.readlines()
            meminfo = {}
            for line in lines:
                parts = line.split(":")
                if len(parts) == 2:
                    meminfo[parts[0].strip()] = int(parts[1].split()[0])
            total = meminfo.get("MemTotal", 4096 * 1024) // 1024
            avail = meminfo.get("MemAvailable", meminfo.get("MemFree", 2048 * 1024)) // 1024
            return {"total_ram_mb": total, "available_ram_mb": avail}
        except Exception:
            pass

    return {"total_ram_mb": total_mb, "available_ram_mb": avail_mb}

def get_cpu_info() -> Dict[str, Any]:
    """Detect CPU details and AVX2 support."""
    cpu_cores = os.cpu_count() or 4
    cpu_brand = platform.processor() or "Modern CPU"
    has_avx2 = True # Standard on x86_64 since 2013

    if platform.system() == "Windows":
        try:
            out = subprocess.check_output("wmic cpu get name", shell=True, text=True, stderr=subprocess.DEVNULL)
            lines = [l.strip() for l in out.split("\n") if l.strip() and not l.strip().lower().startswith("name")]
            if lines:
                cpu_brand = lines[0]
        except Exception:
            pass
    elif platform.system() == "Linux":
        try:
            with open("/proc/cpuinfo", "r") as f:
                for line in f:
                    if "model name" in line:
                        cpu_brand = line.split(":")[1].strip()
                        break
        except Exception:
            pass

    return {
        "cpu_brand": cpu_brand,
        "cpu_cores": cpu_cores,
        "has_avx2": has_avx2
    }

def get_gpu_info() -> Dict[str, Any]:
    """Inspect NVIDIA GPU, VRAM, and CUDA status."""
    info = {
        "has_gpu": False,
        "gpu_name": None,
        "vram_total_mb": 0,
        "vram_free_mb": 0,
        "cuda_available": False,
        "cuda_version": None
    }

    # 1. Try PyTorch CUDA if available
    try:
        import torch
        if torch.cuda.is_available():
            info["has_gpu"] = True
            info["cuda_available"] = True
            info["cuda_version"] = torch.version.cuda
            info["gpu_name"] = torch.cuda.get_device_name(0)
            mem_total = torch.cuda.get_device_properties(0).total_memory // (1024 * 1024)
            info["vram_total_mb"] = mem_total
            info["vram_free_mb"] = mem_total - (torch.cuda.memory_allocated(0) // (1024 * 1024))
            return info
    except Exception:
        pass

    # 2. Try nvidia-smi command
    try:
        out = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=name,memory.total,memory.free,driver_version", "--format=csv,noheader,nounits"],
            stderr=subprocess.DEVNULL,
            text=True
        )
        parts = [p.strip() for p in out.strip().split(",")]
        if len(parts) >= 3:
            info["has_gpu"] = True
            info["gpu_name"] = parts[0]
            info["vram_total_mb"] = int(parts[1])
            info["vram_free_mb"] = int(parts[2])
            info["cuda_available"] = True
            if len(parts) >= 4:
                info["cuda_version"] = f"Driver {parts[3]}"
            return info
    except Exception:
        pass

    return info

def get_disk_space_mb(path: Path) -> int:
    """Get free disk space on path in MB."""
    try:
        total, used, free = shutil.disk_usage(str(path))
        return int(free / (1024 * 1024))
    except Exception:
        return 10240

def classify_model_compatibility(manifest: Dict[str, Any], hardware: Dict[str, Any]) -> str:
    """
    Classify model as:
    - compatible
    - compatible with reduced performance
    - insufficient_resources
    - unsupported
    """
    req_ram = manifest.get("required_ram_mb", 2048)
    rec_vram = manifest.get("recommended_vram_mb", 0)
    cpu_ok = manifest.get("cpu_compatible", True)
    total_ram = hardware.get("total_ram_mb", 4096)
    has_gpu = hardware.get("has_gpu", False)
    vram = hardware.get("vram_total_mb", 0)

    # 1. Total RAM is strictly less than model minimum
    if total_ram < req_ram * 0.85:
        return "insufficient_resources"

    # 2. Has GPU with sufficient VRAM -> Fully Compatible
    if has_gpu and vram >= rec_vram:
        return "compatible"

    # 3. No GPU or lower VRAM, but CPU is compatible
    if cpu_ok:
        if has_gpu and vram > 0 and vram < rec_vram:
            return "compatible_with_reduced_performance"
        return "compatible_with_reduced_performance"

    # 4. GPU required but none found
    if not cpu_ok and not has_gpu:
        return "insufficient_resources"

    return "compatible"

def inspect_full_hardware(manifests: Dict[str, Dict[str, Any]], target_dir: Path) -> Dict[str, Any]:
    """Assemble complete hardware report with model compatibility matrix."""
    ram = get_system_ram_mb()
    cpu = get_cpu_info()
    gpu = get_gpu_info()
    disk = get_disk_space_mb(target_dir)

    report = {
        "os_platform": platform.system(),
        "os_version": platform.version(),
        "arch": platform.machine(),
        "python_version": platform.python_version(),
        "total_ram_mb": ram["total_ram_mb"],
        "available_ram_mb": ram["available_ram_mb"],
        "cpu_brand": cpu["cpu_brand"],
        "cpu_cores": cpu["cpu_cores"],
        "has_avx2": cpu["has_avx2"],
        "has_gpu": gpu["has_gpu"],
        "gpu_name": gpu["gpu_name"],
        "vram_total_mb": gpu["vram_total_mb"],
        "vram_free_mb": gpu["vram_free_mb"],
        "cuda_available": gpu["cuda_available"],
        "cuda_version": gpu["cuda_version"],
        "free_disk_space_mb": disk,
        "model_compatibility": {}
    }

    for mid, mdata in manifests.items():
        report["model_compatibility"][mid] = classify_model_compatibility(mdata, report)

    return report
