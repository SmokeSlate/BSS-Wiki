import test from 'node:test';
import assert from 'node:assert/strict';
import { createDb, envFor, request, seed, message, history, migration } from './helpers/chat-worker.mjs';

async function insertLegacy(DB, { id, conversationId = 'chat', text = id, createdAt = 10, editedAt = null, deletedAt = null, originalText = null }) {
  await DB.prepare(`INSERT INTO messages (id, conversation_id, sender_id, sender_name, text, role, created_at, edited_at, edited_by, deleted_at, deleted_by, original_text)
    VALUES (?, ?, 'visitor', 'Visitor', ?, 'user', ?, ?, ?, ?, ?, ?)`)
    .bind(id, conversationId, text, createdAt, editedAt, editedAt ? 'old-editor' : null, deletedAt, deletedAt ? 'old-moderator' : null, originalText).run();
}

test('upgrade from 0001 recovers original message text, IDs, timestamps and audit history', async () => {
  const DB = await createDb({ through: 1 });
  await DB.prepare("INSERT INTO conversations (id, name, created_at, last_message_at, token) VALUES ('chat', 'Original name', 1, 30, 'visitor-token')").run();
  await insertLegacy(DB, { id: 'edited', text: 'edited content', editedAt: 20, originalText: 'before edit' });
  await insertLegacy(DB, { id: 'deleted', createdAt: 30, deletedAt: 40, originalText: 'deleted original' });
  DB.sqlite.run(await migration(2));
  DB.sqlite.run(await migration(3));
  DB.sqlite.run(await migration(4));
  const stored = await history(DB);
  assert.equal(stored.length, 2);
  assert.deepEqual(stored.map((item) => item.id), ['edited', 'deleted']);
  assert.equal(stored[0].text, 'edited content');
  assert.equal(stored[0].createdAt, 10);
  assert.equal(stored[0].editedAt, 20);
  assert.equal(stored[0].editedBy, 'old-editor');
  assert.equal(stored[0].originalText, 'before edit');
  assert.equal(stored[1].deletedAt, 40);
  assert.equal(stored[1].deletedBy, 'old-moderator');
  const visible = await request(envFor(DB), '/api/messages?conversationId=chat&token=visitor-token');
  assert.deepEqual(visible.data.messages.map((item) => item.id), ['edited']);
  assert.equal(JSON.stringify(visible.data).includes('before edit'), false);
  const admin = await request(envFor(DB), '/api/messages?conversationId=chat', { admin: 'admin-secret' });
  assert.equal(admin.data.messages.length, 2);
  assert.equal(admin.data.messages[1].originalText, 'deleted original');
  assert.equal((await DB.prepare('SELECT COUNT(*) AS count FROM messages').first()).count, 2);
  DB.sqlite.close();
});

test('mixed legacy/new history merges by ID without loss and repeated backfill retains cursors', async () => {
  const DB = await createDb({ through: 3 });
  await seed(DB, { messages: [
    message('duplicate', { text: 'new authoritative text', createdAt: 10, editedAt: 70, changeSeq: 40 }),
    message('json-only', { createdAt: 50, changeSeq: 0, replyToMessageId: 'duplicate', requestId: 'bot-request' }),
  ] });
  await insertLegacy(DB, { id: 'duplicate', text: 'old text', originalText: 'oldest text', editedAt: 25 });
  await insertLegacy(DB, { id: 'legacy-only', createdAt: 20 });
  await insertLegacy(DB, { id: 'legacy-deleted', createdAt: 30, deletedAt: 35 });
  await insertLegacy(DB, { id: 'orphan', conversationId: 'orphan-chat', createdAt: 5 });
  const backfill = await migration(4);
  DB.sqlite.run(backfill);
  const before = await history(DB);
  assert.equal(before.length, 4);
  assert.equal(new Set(before.map((item) => item.id)).size, 4);
  const duplicate = before.find((item) => item.id === 'duplicate');
  assert.equal(duplicate.text, 'new authoritative text');
  assert.equal(duplicate.originalText, 'oldest text');
  assert.equal(duplicate.editedAt, 70);
  assert.equal(duplicate.changeSeq, 40);
  assert.ok(before.filter((item) => item.id !== 'duplicate').every((item) => item.changeSeq > 40));
  assert.equal(before.find((item) => item.id === 'json-only').requestId, 'bot-request');
  assert.equal((await history(DB, 'orphan-chat'))[0].id, 'orphan');
  assert.equal((await request(envFor(DB), '/api/messages?conversationId=orphan-chat')).status, 403);
  DB.sqlite.run(backfill);
  assert.deepEqual(await history(DB), before);
  const row = await DB.prepare("SELECT token, discord_thread_id, last_message_at FROM conversations WHERE id = 'chat'").first();
  assert.equal(row.token, 'visitor-token');
  assert.equal(row.discord_thread_id, 'thread');
  assert.equal(row.last_message_at, 50);
  const posted = await request(envFor(DB), '/api/messages', { method: 'POST', body: { conversationId: 'chat', senderId: 'visitor', clientToken: 'visitor-token', text: 'post migration' } });
  assert.equal(posted.status, 200);
  assert.ok(posted.data.message.changeSeq > Math.max(...before.map((item) => item.changeSeq)));
  const afterAppend = await history(DB);
  DB.sqlite.run(backfill);
  assert.deepEqual(await history(DB), afterAppend);
  DB.sqlite.close();
});

test('backfill does not overwrite a malformed JSON store', async () => {
  const DB = await createDb({ through: 3 });
  await seed(DB);
  await insertLegacy(DB, { id: 'recoverable' });
  await DB.prepare("UPDATE conversations SET messages_json = 'corrupt' WHERE id = 'chat'").run();
  DB.sqlite.run(await migration(4));
  assert.equal((await DB.prepare("SELECT messages_json FROM conversations WHERE id = 'chat'").first()).messages_json, 'corrupt');
  assert.equal((await DB.prepare('SELECT COUNT(*) AS count FROM messages').first()).count, 1);
  DB.sqlite.close();
});

test('backfill retains known same-timestamp JSON creation order and existing immutable sequence', async () => {
  const DB = await createDb({ through: 3 });
  await seed(DB, { messages: [
    message('zz-first', { createdAt: 10, changeSeq: 1 }),
    message('aa-second', { createdAt: 10, changeSeq: 2, role: 'support' }),
  ] });
  DB.sqlite.run(await migration(4));
  const stored = await history(DB);
  assert.deepEqual(stored.map((item) => item.id), ['zz-first', 'aa-second']);
  assert.deepEqual(stored.map((item) => item.createdSeq), [1, 2]);
  assert.equal((await request(envFor(DB), '/api/bot/inbox', { bot: 'bot-secret' })).data.conversations.length, 0);
  DB.sqlite.run(await migration(4));
  assert.deepEqual(await history(DB), stored);
  DB.sqlite.close();
});
