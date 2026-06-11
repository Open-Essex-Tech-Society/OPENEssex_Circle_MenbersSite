-- Migration: Add call notifications and fix previous issues
-- Run: npx wrangler d1 execute open-essex-db --remote --file=./schema_calls.sql

-- 1. ユーザーの最終確認（既にある場合はエラーを無視してください）
-- ALTER TABLE profiles ADD COLUMN last_seen DATETIME;
-- UPDATE profiles SET last_seen = CURRENT_TIMESTAMP WHERE last_seen IS NULL;

-- 2. 通話通知テーブル
CREATE TABLE IF NOT EXISTS call_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caller_uid TEXT NOT NULL,
  caller_name TEXT NOT NULL,
  target_uid TEXT NOT NULL,
  room_name TEXT NOT NULL,
  status TEXT DEFAULT 'ringing', -- ringing, accepted, rejected, cancelled, ended
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. アクティブなルームの作成（既にある場合は無視）
CREATE TABLE IF NOT EXISTS active_rooms (
  room_name TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  member_count INTEGER DEFAULT 1,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_heartbeat DATETIME DEFAULT CURRENT_TIMESTAMP
);
