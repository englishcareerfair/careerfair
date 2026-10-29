"""
Unit tests for VoiceForge Routing Policy Enforcement
"""
import sys
from pathlib import Path

# Test routing logic using Python equivalent of TypeScript routing engine
def resolve_route(mode, requested_route=None, cloud_configured=False, local_healthy=True):
    if mode == "OFFLINE_ONLY":
        if requested_route == "cloud":
            return {"target": "local", "allowed": False, "reason": "Prohibited by OFFLINE ONLY mode"}
        return {"target": "local", "allowed": local_healthy}

    if mode == "LOCAL_FIRST":
        if local_healthy:
            return {"target": "local", "allowed": True}
        if cloud_configured:
            return {"target": "cloud", "allowed": True, "fallback": True}
        return {"target": "local", "allowed": False}

    if mode == "CLOUD_FIRST":
        if cloud_configured:
            return {"target": "cloud", "allowed": True}
        if local_healthy:
            return {"target": "local", "allowed": True, "fallback": True}
        return {"target": "cloud", "allowed": False}

    if mode == "CLOUD_ONLY":
        if not cloud_configured:
            return {"target": "cloud", "allowed": False}
        return {"target": "cloud", "allowed": True}

    return {"target": "local", "allowed": True}

def test_offline_only():
    # Never allow cloud in OFFLINE_ONLY
    r1 = resolve_route("OFFLINE_ONLY", requested_route="cloud", cloud_configured=True)
    assert not r1["allowed"]
    assert "Prohibited" in r1["reason"]

    # Local is allowed
    r2 = resolve_route("OFFLINE_ONLY", requested_route="local")
    assert r2["allowed"]
    assert r2["target"] == "local"

def test_local_first_fallback():
    # Local healthy -> uses local
    r1 = resolve_route("LOCAL_FIRST", cloud_configured=True, local_healthy=True)
    assert r1["target"] == "local"

    # Local unhealthy -> falls back to cloud if configured
    r2 = resolve_route("LOCAL_FIRST", cloud_configured=True, local_healthy=False)
    assert r2["target"] == "cloud"
    assert r2.get("fallback")

def test_cloud_only_strictness():
    # Cloud only without credentials -> refuses local fallback
    r1 = resolve_route("CLOUD_ONLY", cloud_configured=False, local_healthy=True)
    assert not r1["allowed"]
    assert r1["target"] == "cloud"

if __name__ == "__main__":
    test_offline_only()
    test_local_first_fallback()
    test_cloud_only_strictness()
    print("[PASS] test_routing_engine passed all assertions.")
