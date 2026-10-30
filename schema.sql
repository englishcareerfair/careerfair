-- ============================================================================
-- Career Fair: Every Career Speaks English — D1 Database Schema
-- Cloudflare D1 (SQLite) initialization script
-- ============================================================================

-- Key-Value store for dynamic runtime settings and feature toggles
CREATE TABLE IF NOT EXISTS kv (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);

-- Leaderboard scores for voice assessments & games
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

-- Visitor feedback & reviews from fair attendees (students, parents, teachers)
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
  ts INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_ts ON feedback(ts DESC);

-- Initial configuration seeds
INSERT OR IGNORE INTO kv (k, v) VALUES ('pass', '70');
INSERT OR IGNORE INTO kv (k, v) VALUES ('banner', 'Welcome to English Careers Forum 2026 · Explore 32+ Careers Where English Opens Doors!');
INSERT OR IGNORE INTO kv (k, v) VALUES ('timer', '0');
INSERT OR IGNORE INTO kv (k, v) VALUES ('theme', 'cinematic');
INSERT OR IGNORE INTO kv (k, v) VALUES ('school_branding', '1');
INSERT OR IGNORE INTO kv (k, v) VALUES ('school_name', 'Kanakia International School Mira Road');
INSERT OR IGNORE INTO kv (k, v) VALUES ('flags', '{"guide_enabled":true,"guide_presentation_mode":"floating","guide_ml_engine":"client","ocr_enabled":true,"gdrive_sync":true,"pdf_export":true,"dopamine_fx":true,"speechLab":true,"mockInterview":true,"anchorMode":true,"roleplay":true,"debate":true,"careers":true,"colleges":true,"exams":true,"games":true,"roadmap":true,"quiz":true,"leaderboard":true,"feedback":true}');
INSERT OR IGNORE INTO kv (k, v) VALUES ('rclone_remote', 'gdrive:careerfair_telemetry');

-- Granular Scoped API Keys for External Integrations & Leaderboard API
CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_hash TEXT UNIQUE NOT NULL,
  prefix TEXT NOT NULL,
  label TEXT NOT NULL,
  scopes TEXT NOT NULL, -- JSON array: ['read:leaderboard', 'write:scores', ...]
  created_at INTEGER NOT NULL,
  last_used INTEGER,
  revoked INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

-- Visitor Telemetry & Pure Google Drive Storage Archive
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

-- User Inquiries & Glitch Rectification Tracking
CREATE TABLE IF NOT EXISTS user_issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT DEFAULT '',
  visitor_name TEXT DEFAULT '',
  issue_type TEXT DEFAULT 'general',
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open', -- 'open' | 'resolved'
  resolution_notes TEXT DEFAULT '',
  created_at INTEGER NOT NULL,
  resolved_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_user_issues_status ON user_issues(status);

