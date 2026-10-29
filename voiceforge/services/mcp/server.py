"""
VoiceForge Model Context Protocol (MCP) Server
Enables AI agents and coding assistants to control VoiceForge: generate speech,
clone voices, inspect hardware, manage models, and toggle offline/cloud modes.
"""
import sys
import json
import urllib.request
import urllib.error

INFERENCE_BASE_URL = "http://127.0.0.1:8765"

def call_api(endpoint: str, method: str = "GET", data: dict = None) -> dict:
    url = f"{INFERENCE_BASE_URL}{endpoint}"
    req = urllib.request.Request(url, method=method)
    req.add_header("Content-Type", "application/json")
    req.add_header("User-Agent", "VoiceForge-MCP-Server/1.0")

    body_bytes = json.dumps(data).encode("utf-8") if data else None
    try:
        with urllib.request.urlopen(req, data=body_bytes, timeout=30) as res:
            return json.loads(res.read().decode("utf-8"))
    except urllib.error.URLError as e:
        return {"error": f"Failed to reach VoiceForge local engine at {url}: {e}"}

def handle_mcp_request(req_json: dict) -> dict:
    method = req_json.get("method")
    params = req_json.get("params", {})

    if method == "tools/list":
        return {
            "tools": [
                {
                    "name": "voiceforge_generate_speech",
                    "description": "Synthesize text into speech using VoiceForge local or cloud voice models.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "text": {"type": "string", "description": "The script text to synthesize."},
                            "voice_id": {"type": "string", "description": "Voice profile ID (e.g. voice-studio-artisan)."},
                            "model_id": {"type": "string", "description": "Model ID: neural-starter, chatterbox, qwen3-tts, fish-speech, xtts-v2."},
                            "speed": {"type": "number", "description": "Speech speed multiplier (0.5 to 2.0)."},
                            "emotion": {"type": "string", "enum": ["neutral", "cheerful", "somber", "whisper", "commanding"]}
                        },
                        "required": ["text"]
                    }
                },
                {
                    "name": "voiceforge_list_voices",
                    "description": "List all saved and cloned voice profiles available in VoiceForge.",
                    "inputSchema": {"type": "object", "properties": {}}
                },
                {
                    "name": "voiceforge_get_models",
                    "description": "Inspect registered models, license terms, download progress, and active model status.",
                    "inputSchema": {"type": "object", "properties": {}}
                },
                {
                    "name": "voiceforge_get_hardware_diagnostics",
                    "description": "Get deep hardware diagnostics: RAM, GPU VRAM, CUDA compatibility, and model classifications.",
                    "inputSchema": {"type": "object", "properties": {}}
                },
                {
                    "name": "voiceforge_get_routing_mode",
                    "description": "Get active routing policy: OFFLINE_ONLY, LOCAL_FIRST, CLOUD_FIRST, CLOUD_ONLY, MANUAL.",
                    "inputSchema": {"type": "object", "properties": {}}
                },
                {
                    "name": "voiceforge_set_routing_mode",
                    "description": "Configure the administrator execution mode.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "mode": {"type": "string", "enum": ["OFFLINE_ONLY", "LOCAL_FIRST", "CLOUD_FIRST", "CLOUD_ONLY", "MANUAL"]}
                        },
                        "required": ["mode"]
                    }
                }
            ]
        }

    if method == "tools/call":
        tool_name = params.get("name")
        args = params.get("arguments", {})

        if tool_name == "voiceforge_generate_speech":
            res = call_api("/tts/generate", method="POST", data=args)
            return {"content": [{"type": "text", "text": json.dumps(res, indent=2)}]}

        if tool_name == "voiceforge_list_voices":
            res = call_api("/voices")
            return {"content": [{"type": "text", "text": json.dumps(res, indent=2)}]}

        if tool_name == "voiceforge_get_models":
            res = call_api("/models")
            return {"content": [{"type": "text", "text": json.dumps(res, indent=2)}]}

        if tool_name == "voiceforge_get_hardware_diagnostics":
            res = call_api("/diagnostics")
            return {"content": [{"type": "text", "text": json.dumps(res, indent=2)}]}

        if tool_name == "voiceforge_get_routing_mode":
            res = call_api("/admin/config")
            mode = res.get("routing_mode", "OFFLINE_ONLY")
            return {"content": [{"type": "text", "text": f"Current Execution Mode: {mode}"}]}

        if tool_name == "voiceforge_set_routing_mode":
            mode = args.get("mode")
            res = call_api("/admin/config", method="POST", data={"routing_mode": mode})
            return {"content": [{"type": "text", "text": f"Routing mode updated to: {mode}"}]}

    return {"error": f"Method {method} not supported"}

def main():
    """Standard JSON-RPC line loop for MCP stdio transport."""
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            req_id = req.get("id")
            result = handle_mcp_request(req)
            resp = {"jsonrpc": "2.0", "id": req_id, **result}
            sys.stdout.write(json.dumps(resp) + "\n")
            sys.stdout.flush()
        except Exception as e:
            err_resp = {"jsonrpc": "2.0", "id": None, "error": {"code": -32603, "message": str(e)}}
            sys.stdout.write(json.dumps(err_resp) + "\n")
            sys.stdout.flush()

if __name__ == "__main__":
    main()
