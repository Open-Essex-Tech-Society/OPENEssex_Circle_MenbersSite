-- Migration: Add last_seen to profiles and create active_rooms table
-- Run: npx wrangler d1 execute open-essex-db --local --file=./schema_update_v2.sql

ALTER TABLE profiles ADD COLUMN last_seen DATETIME DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS active_rooms (
  room_name TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  member_count INTEGER DEFAULT 1,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_heartbeat DATETIME DEFAULT CURRENT_TIMESTAMP
);
