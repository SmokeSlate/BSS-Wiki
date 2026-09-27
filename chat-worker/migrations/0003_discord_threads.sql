ALTER TABLE conversations
  ADD COLUMN discord_thread_id TEXT;

ALTER TABLE conversations
  ADD COLUMN discord_starter_message_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_discord_thread
  ON conversations (discord_thread_id)
  WHERE discord_thread_id IS NOT NULL;
