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
INSERT OR IGNORE INTO kv (k, v) VALUES ('banner', 'Welcome to SUPW Career Fair · Explore 32+ Careers Where English Opens Doors!');
INSERT OR IGNORE INTO kv (k, v) VALUES ('timer', '0');
INSERT OR IGNORE INTO kv (k, v) VALUES ('theme', 'cinematic');
INSERT OR IGNORE INTO kv (k, v) VALUES ('school_branding', '1');
INSERT OR IGNORE INTO kv (k, v) VALUES ('school_name', 'Kanakia International School Mira Road');
INSERT OR IGNORE INTO kv (k, v) VALUES ('flags', '{"speechLab":true,"mockInterview":true,"anchorMode":true,"roleplay":true,"debate":true,"careers":true,"colleges":true,"exams":true,"games":true,"roadmap":true,"quiz":true,"leaderboard":true,"feedback":true}');
