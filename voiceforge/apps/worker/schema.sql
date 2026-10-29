-- VoiceForge Production Cloudflare D1 Database Schema
-- Compatible with SQLite & Cloudflare D1

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS voice_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  model_id TEXT NOT NULL,
  is_cloned INTEGER NOT NULL DEFAULT 0,
  reference_audio_url TEXT,
  conditioning_json TEXT,
  consent_confirmed INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS generation_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  prompt_text TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  route_taken TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  status TEXT NOT NULL,
  audio_url TEXT,
  audio_format TEXT NOT NULL DEFAULT 'wav',
  duration_ms INTEGER,
  error_message TEXT,
  created_at INTEGER NOT NULL,
  completed_at INTEGER
);

CREATE TABLE IF NOT EXISTS admin_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  action TEXT NOT NULL,
  user_id TEXT,
  details TEXT,
  ip_address TEXT
);

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT,
  class_info TEXT,
  comment TEXT NOT NULL,
  r_useful INTEGER DEFAULT 5,
  r_games INTEGER DEFAULT 5,
  r_speaking INTEGER DEFAULT 5,
  approved INTEGER DEFAULT 1,
  ts INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  pack TEXT NOT NULL,
  level INTEGER NOT NULL,
  acc INTEGER NOT NULL,
  fluency INTEGER DEFAULT 0,
  clarity INTEGER DEFAULT 0,
  wpm INTEGER DEFAULT 130,
  class_name TEXT,
  target_career TEXT,
  ts INTEGER NOT NULL
);

-- Indices for rapid filtering & global export
CREATE INDEX IF NOT EXISTS idx_jobs_created ON generation_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_ts ON feedback(ts DESC);
CREATE INDEX IF NOT EXISTS idx_scores_ts ON scores(ts DESC);
