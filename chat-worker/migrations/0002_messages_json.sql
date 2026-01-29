ALTER TABLE conversations
  ADD COLUMN messages_json TEXT NOT NULL DEFAULT '[]';
