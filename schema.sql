-- Career Fair 2026 D1 Schema
-- Easy Run Guide:
--   Dashboard: Cloudflare Dashboard -> D1 -> your DB -> Console -> Paste all -> Execute
--   CLI:       npx wrangler d1 execute careerfair-db --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS kv (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL COLLATE NOCASE,
  pack TEXT NOT NULL DEFAULT 'Everyday',
  level INTEGER NOT NULL DEFAULT 1,
  acc INTEGER NOT NULL DEFAULT 0,
  fluency INTEGER NOT NULL DEFAULT 0,
  clarity INTEGER NOT NULL DEFAULT 0,
  wpm INTEGER NOT NULL DEFAULT 0,
  class_name TEXT DEFAULT 'Class 10',
  target_career TEXT DEFAULT '',
  ts INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scores_name ON scores(name);
CREATE INDEX IF NOT EXISTS idx_scores_level_acc ON scores(level DESC, acc DESC);
CREATE INDEX IF NOT EXISTS idx_scores_pack ON scores(pack);

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Student',
  class_info TEXT DEFAULT '',
  r_useful INTEGER NOT NULL DEFAULT 5,
  r_games INTEGER NOT NULL DEFAULT 5,
  r_speaking INTEGER NOT NULL DEFAULT 5,
  comment TEXT DEFAULT '',
  approved INTEGER NOT NULL DEFAULT 1,
  pinned INTEGER NOT NULL DEFAULT 0,
  ts INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_ts ON feedback(ts DESC);

CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_hash TEXT UNIQUE NOT NULL,
  prefix TEXT NOT NULL,
  label TEXT NOT NULL,
  scopes TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_used INTEGER,
  revoked INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

CREATE TABLE IF NOT EXISTS telemetry_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT UNIQUE NOT NULL,
  visitor_name TEXT DEFAULT 'Visitor',
  device_info TEXT DEFAULT '',
  interactions_count INTEGER DEFAULT 0,
  has_camera_feed INTEGER DEFAULT 0,
  has_mic_feed INTEGER DEFAULT 0,
  has_screen_feed INTEGER DEFAULT 0,
  gdrive_folder_id TEXT DEFAULT '',
  gdrive_file_urls TEXT DEFAULT '[]',
  logs TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_telemetry_created ON telemetry_sessions(created_at DESC);

CREATE TABLE IF NOT EXISTS user_issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT DEFAULT '',
  visitor_name TEXT DEFAULT '',
  issue_type TEXT DEFAULT 'general',
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  resolution_notes TEXT DEFAULT '',
  created_at INTEGER NOT NULL,
  resolved_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_user_issues_status ON user_issues(status);

INSERT OR IGNORE INTO kv (k, v) VALUES ('pass', '70');
INSERT OR IGNORE INTO kv (k, v) VALUES ('banner', 'Welcome to English Careers Forum 2026 · Explore 32+ Careers Where English Opens Doors!');
INSERT OR IGNORE INTO kv (k, v) VALUES ('timer', '0');
INSERT OR IGNORE INTO kv (k, v) VALUES ('theme', 'cinematic');
INSERT OR IGNORE INTO kv (k, v) VALUES ('school_branding', '1');
INSERT OR IGNORE INTO kv (k, v) VALUES ('school_name', 'Kanakia International School Mira Road');
INSERT OR IGNORE INTO kv (k, v) VALUES ('flags', '{"guide_enabled":true,"guide_presentation_mode":"floating","ocr_enabled":true,"pdf_export":true,"dopamine_fx":true,"speechLab":true,"anchorMode":true,"careers":true,"colleges":true,"exams":true,"games":true,"roadmap":true,"leaderboard":true,"feedback":true}');
INSERT OR IGNORE INTO kv (k, v) VALUES ('rclone_remote', 'gdrive:careerfair_telemetry');
INSERT OR IGNORE INTO kv (k, v) VALUES ('stream_url', 'https://www.youtube.com/watch?v=jfKfPfyJRdk');
INSERT OR IGNORE INTO kv (k, v) VALUES ('stream_title', 'Career Fair 2026 — Live Stage Broadcast');
INSERT OR IGNORE INTO kv (k, v) VALUES ('stream_active', '1');
INSERT OR IGNORE INTO kv (k, v) VALUES ('banned_ips', '[]');
INSERT OR IGNORE INTO kv (k, v) VALUES ('admin_blocked_ips', '[]');
INSERT OR IGNORE INTO kv (k, v) VALUES ('admin_devices', '[]');
INSERT OR IGNORE INTO kv (k, v) VALUES ('brute_force_tracker', '{}');
INSERT OR IGNORE INTO kv (k, v) VALUES ('brute_force_bans', '{}');
