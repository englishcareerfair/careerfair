# VoiceForge Cloudflare Deployment & D1 Setup

VoiceForge includes an optional enterprise Cloudflare Worker gateway for multi-device sync, administrative auditing, rate limiting, and global database storage.

## 1. Wrangler Configuration (`apps/worker/wrangler.toml`)

```toml
name = "voiceforge-worker"
main = "src/index.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[vars]
ENVIRONMENT = "production"
DEFAULT_ROUTING_MODE = "OFFLINE_ONLY"

[[d1_databases]]
binding = "DB"
database_name = "careerfair-db"
database_id = "f92d8dd7-b120-4011-b176-3c31665631ed"
```

## 2. Deploy Database Schema

To apply the production schema to Cloudflare D1:
```bash
npx wrangler d1 execute careerfair-db --file=apps/worker/schema.sql
```

## 3. Deploy Worker Gateway

```bash
cd apps/worker
npx wrangler deploy
```

## 4. Running 100% Without Cloudflare

VoiceForge operates completely independently without Cloudflare. By simply running `scripts/start_inference.bat` and `scripts/start_web.bat`, all voice synthesis, cloning, chunking, and playback run locally on `127.0.0.1`.
