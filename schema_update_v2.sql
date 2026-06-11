-- Migration: Add last_seen to profiles and create active_rooms table (Fixed for SQLite)
-- Run: npx wrangler d1 execute open-essex-db --remote --file=./schema_update_v2.sql

ALTER TABLE profiles ADD COLUMN last_seen DATETIME;

UPDATE profiles SET last_seen = CURRENT_TIMESTAMP WHERE last_seen IS NULL;

CREATE TABLE IF NOT EXISTS active_rooms (
  room_name TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  member_count INTEGER DEFAULT 1,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_heartbeat DATETIME DEFAULT CURRENT_TIMESTAMP
);
