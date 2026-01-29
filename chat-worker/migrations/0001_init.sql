CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  name TEXT,
  created_at INTEGER NOT NULL,
  last_message_at INTEGER NOT NULL,
  last_message_preview TEXT,
  last_message_role TEXT,
  last_message_sender_name TEXT,
  token TEXT
);

CREATE INDEX IF NOT EXISTS idx_conversations_last_message
  ON conversations (last_message_at);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT,
  text TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  edited_at INTEGER,
  edited_by TEXT,
  deleted_at INTEGER,
  deleted_by TEXT,
  original_text TEXT
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages (conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_deleted
  ON messages (conversation_id, deleted_at);

CREATE TABLE IF NOT EXISTS snippets (
  key TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  dynamic INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS presence (
  id TEXT PRIMARY KEY,
  name TEXT,
  status TEXT,
  last_seen INTEGER
);
