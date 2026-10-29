# VoiceForge Model Context Protocol (MCP) Server

This MCP server exposes the VoiceForge AI Voice Studio tools to any compliant MCP client, AI agent, or IDE (Antigravity, Claude Desktop, Cursor, Cline).

## Capabilities

- `voiceforge_generate_speech`: Generate WAV audio from text scripts using local or cloud models.
- `voiceforge_list_voices`: List saved and cloned voice profiles.
- `voiceforge_get_models`: Inspect installed models, sizes, licenses, and download progress.
- `voiceforge_get_hardware_diagnostics`: Inspect system RAM, GPU VRAM, CUDA version, and model compatibility ratings.
- `voiceforge_get_routing_mode` & `voiceforge_set_routing_mode`: Audit or toggle execution mode (`OFFLINE_ONLY`, `LOCAL_FIRST`, `CLOUD_FIRST`, `CLOUD_ONLY`, `MANUAL`).

## Configuration for Claude Desktop / Antigravity

Add the following block to your MCP configuration file:

```json
{
  "mcpServers": {
    "voiceforge": {
      "command": "python",
      "args": ["<PATH_TO_VOICEFORGE>/services/mcp/server.py"]
    }
  }
}
```
