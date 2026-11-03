-- Reconcile the original row-per-message history with the JSON store introduced
-- by 0002. Keep the original table as a recovery copy. This backfill is safe to
-- rerun: current JSON wins by ID, audit fields are retained, and assigned change
-- cursors are never renumbered. Apply with writes paused before the new Worker.

-- Preserve even legacy histories with no remaining conversation metadata.
INSERT INTO conversations (id, name, created_at, last_message_at, messages_json)
SELECT conversation_id, '', MIN(created_at), MAX(created_at), '[]'
FROM messages
GROUP BY conversation_id
ON CONFLICT(id) DO NOTHING;

UPDATE conversations AS c
SET messages_json = (
  WITH current_messages AS (
    SELECT j.value AS record, json_extract(j.value, '$.id') AS id, CAST(j.key AS INTEGER) + 1 AS source_order
    FROM json_each(c.messages_json) AS j
    WHERE json_type(j.value) = 'object'
      AND COALESCE(json_extract(j.value, '$.id'), '') <> ''
      AND CAST(j.key AS INTEGER) = (
        SELECT MAX(CAST(other.key AS INTEGER))
        FROM json_each(c.messages_json) AS other
        WHERE json_extract(other.value, '$.id') = json_extract(j.value, '$.id')
      )
  ), legacy_messages AS (
    SELECT id, json_object(
      'id', id, 'conversationId', conversation_id,
      'senderId', sender_id, 'senderName', COALESCE(sender_name, ''),
      'text', text, 'role', role, 'createdAt', created_at,
      'editedAt', edited_at, 'editedBy', COALESCE(edited_by, ''),
      'deletedAt', deleted_at, 'deletedBy', COALESCE(deleted_by, ''),
      'originalText', COALESCE(original_text, ''),
      'replyToMessageId', '', 'requestId', ''
    ) AS record
    FROM messages WHERE conversation_id = c.id
  ), merged AS (
    SELECT json_set(
      json_patch(COALESCE(l.record, '{}'), m.record),
      '$.originalText', COALESCE(NULLIF(json_extract(m.record, '$.originalText'), ''), json_extract(l.record, '$.originalText'), ''),
      '$.editedAt', COALESCE(json_extract(m.record, '$.editedAt'), json_extract(l.record, '$.editedAt')),
      '$.editedBy', COALESCE(NULLIF(json_extract(m.record, '$.editedBy'), ''), json_extract(l.record, '$.editedBy'), ''),
      '$.deletedAt', COALESCE(json_extract(m.record, '$.deletedAt'), json_extract(l.record, '$.deletedAt')),
      '$.deletedBy', COALESCE(NULLIF(json_extract(m.record, '$.deletedBy'), ''), json_extract(l.record, '$.deletedBy'), '')
    ) AS record, m.source_order
    FROM current_messages AS m LEFT JOIN legacy_messages AS l ON l.id = m.id
    UNION ALL
    SELECT l.record, 0 AS source_order FROM legacy_messages AS l
    WHERE NOT EXISTS (SELECT 1 FROM current_messages AS m WHERE m.id = l.id)
  ), numbered AS (
    SELECT record,
      ROW_NUMBER() OVER (ORDER BY json_extract(record, '$.createdAt'), COALESCE(json_extract(record, '$.createdSeq'), source_order), json_extract(record, '$.id')) AS position,
      MAX(COALESCE(json_extract(record, '$.changeSeq'), 0)) OVER () AS max_seq
    FROM merged
  )
  SELECT COALESCE(json_group_array(json(final_record)), '[]') FROM (
    SELECT json_set(record,
      '$.changeSeq', CASE WHEN COALESCE(json_extract(record, '$.changeSeq'), 0) > 0 THEN json_extract(record, '$.changeSeq') ELSE max_seq + position END,
      '$.createdSeq', CASE WHEN COALESCE(json_extract(record, '$.createdSeq'), 0) > 0 THEN json_extract(record, '$.createdSeq') ELSE position END
    ) AS final_record
    FROM numbered
    ORDER BY json_extract(final_record, '$.createdAt'), json_extract(final_record, '$.createdSeq'), json_extract(final_record, '$.id')
  )
)
WHERE json_valid(c.messages_json) AND json_type(c.messages_json) = 'array';

-- Rebuild inbox previews from the reconciled visible history. Deliberately do
-- not alter tokens, names, Discord links, or legacy message rows.
UPDATE conversations AS c
SET last_message_at = COALESCE((
      SELECT json_extract(value, '$.createdAt') FROM json_each(c.messages_json)
      WHERE NOT COALESCE(json_extract(value, '$.deletedAt'), 0)
      ORDER BY json_extract(value, '$.createdAt') DESC, json_extract(value, '$.createdSeq') DESC, json_extract(value, '$.id') DESC LIMIT 1
    ), 0),
    last_message_preview = COALESCE((
      SELECT substr(json_extract(value, '$.text'), 1, 80) FROM json_each(c.messages_json)
      WHERE NOT COALESCE(json_extract(value, '$.deletedAt'), 0)
      ORDER BY json_extract(value, '$.createdAt') DESC, json_extract(value, '$.createdSeq') DESC, json_extract(value, '$.id') DESC LIMIT 1
    ), ''),
    last_message_role = COALESCE((
      SELECT json_extract(value, '$.role') FROM json_each(c.messages_json)
      WHERE NOT COALESCE(json_extract(value, '$.deletedAt'), 0)
      ORDER BY json_extract(value, '$.createdAt') DESC, json_extract(value, '$.createdSeq') DESC, json_extract(value, '$.id') DESC LIMIT 1
    ), ''),
    last_message_sender_name = COALESCE((
      SELECT json_extract(value, '$.senderName') FROM json_each(c.messages_json)
      WHERE NOT COALESCE(json_extract(value, '$.deletedAt'), 0)
      ORDER BY json_extract(value, '$.createdAt') DESC, json_extract(value, '$.createdSeq') DESC, json_extract(value, '$.id') DESC LIMIT 1
    ), '')
WHERE json_valid(c.messages_json) AND json_type(c.messages_json) = 'array';
