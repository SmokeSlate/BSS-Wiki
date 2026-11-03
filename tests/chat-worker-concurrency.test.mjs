import test from 'node:test';
import assert from 'node:assert/strict';
import { createDb, envFor, request, seed, message, history, writeBarrier } from './helpers/chat-worker.mjs';

const append = (env, text, options = {}) => request(env, '/api/messages', {
  method: 'POST', body: { conversationId: 'chat', senderId: 'visitor', text, clientToken: 'visitor-token', ...options },
  ...(options.role === 'support' ? { admin: 'admin-secret' } : {}),
});
const edit = (env, id, text) => request(env, '/api/messages', { method: 'PATCH', body: { conversationId: 'chat', messageId: id, senderId: 'visitor', clientToken: 'visitor-token', text } });
const remove = (env, id) => request(env, '/api/messages', { method: 'DELETE', body: { conversationId: 'chat', messageId: id, senderId: 'visitor', clientToken: 'visitor-token' } });

test('SQLite CAS preserves concurrent acknowledged appends with identical clocks', async (t) => {
  const DB = await createDb();
  const env = envFor(DB);
  await seed(DB);
  t.mock.method(Date, 'now', () => 1234);
  writeBarrier(DB, 12);
  const responses = await Promise.all(Array.from({ length: 12 }, (_, i) => append(env, `parallel ${i}`)));
  assert.ok(responses.every((response) => response.status === 200));
  const stored = await history(DB);
  assert.equal(stored.length, 12);
  assert.equal(new Set(stored.map((item) => item.id)).size, 12);
  assert.deepEqual(stored.map((item) => item.changeSeq).sort((a, b) => a - b), Array.from({ length: 12 }, (_, i) => i + 1));
  for (const response of responses) assert.ok(stored.some((item) => item.id === response.data.message.id));
  DB.sqlite.close();
});

test('append, edit, and delete retry one shared SQLite snapshot without reverting each other', async () => {
  const DB = await createDb();
  const env = envFor(DB);
  await seed(DB, { messages: [message('edit-me', { changeSeq: 1 }), message('delete-me', { changeSeq: 2 })] });
  writeBarrier(DB, 3);
  const responses = await Promise.all([append(env, 'new'), edit(env, 'edit-me', 'new edit'), remove(env, 'delete-me')]);
  assert.ok(responses.every((response) => response.status === 200));
  const stored = await history(DB);
  assert.equal(stored.length, 3);
  assert.equal(stored.find((item) => item.id === 'edit-me').text, 'new edit');
  assert.equal(stored.find((item) => item.id === 'edit-me').originalText, 'edit-me');
  assert.ok(stored.find((item) => item.id === 'delete-me').deletedAt);
  assert.equal(new Set(stored.map((item) => item.changeSeq)).size, 3);
  DB.sqlite.close();
});

test('concurrent edits and deletion never resurrect or erase a deletion', async () => {
  const DB = await createDb();
  const env = envFor(DB);
  await seed(DB, { messages: [message('target')] });
  writeBarrier(DB, 2);
  const responses = await Promise.all([edit(env, 'target', 'edited'), remove(env, 'target')]);
  assert.equal(responses[1].status, 200);
  assert.ok([200, 409].includes(responses[0].status));
  const [stored] = await history(DB);
  assert.ok(stored.deletedAt);
  assert.equal(stored.originalText, 'target');
  assert.equal((await edit(env, 'target', 'resurrect')).status, 409);
  DB.sqlite.close();
});

test('bot request IDs deduplicate atomically under concurrency and survive 200 later messages', async () => {
  const DB = await createDb();
  const env = envFor(DB);
  await seed(DB, { messages: [message('question')] });
  const reply = () => request(env, '/api/bot/replies', { method: 'POST', bot: 'bot-secret', body: { conversationId: 'chat', text: 'reply', requestId: 'request-once', replyToMessageId: 'question' } });
  writeBarrier(DB, 2);
  const responses = await Promise.all([reply(), reply()]);
  assert.deepEqual(responses.map((response) => response.status).sort(), [200, 201]);
  assert.equal(responses[0].data.message.id, responses[1].data.message.id);
  assert.equal((await history(DB)).length, 2);
  for (let i = 0; i < 201; i++) assert.equal((await append(env, `message ${i}`)).status, 200);
  assert.equal((await reply()).data.duplicate, true);
  assert.equal((await history(DB)).length, 203);
  DB.sqlite.close();
});

test('racing first senders cannot overwrite or share a newly generated visitor token', async () => {
  const DB = await createDb();
  const env = envFor(DB);
  const post = (name) => request(env, '/api/messages', { method: 'POST', body: { conversationId: 'chat', senderId: name, text: name } });
  const responses = await Promise.all([post('first'), post('second')]);
  assert.deepEqual(responses.map((response) => response.status).sort(), [200, 403]);
  const successful = responses.find((response) => response.status === 200);
  assert.ok(successful.data.clientToken);
  assert.equal((await history(DB)).length, 1);
  DB.sqlite.close();
});

test('corrupt history fails closed instead of acknowledging a destructive overwrite', async () => {
  const DB = await createDb();
  const env = envFor(DB);
  await seed(DB);
  await DB.prepare("UPDATE conversations SET messages_json = 'not json' WHERE id = 'chat'").run();
  assert.equal((await append(env, 'would erase')).status, 500);
  assert.equal((await DB.prepare("SELECT messages_json FROM conversations WHERE id = 'chat'").first()).messages_json, 'not json');
  DB.sqlite.close();
});

test('same-millisecond creation order keeps inbox state correct and edits cannot reorder it', async (t) => {
  const DB = await createDb();
  const env = envFor(DB);
  await seed(DB, { messages: [message('zzzzz', { createdAt: 1234, changeSeq: 1 })] });
  t.mock.method(Date, 'now', () => 1234);
  const support = await append(env, 'support answered', { role: 'support', senderId: 'support' });
  assert.equal(support.status, 200);
  assert.equal((await request(env, '/api/bot/inbox', { bot: 'bot-secret' })).data.conversations.length, 0);
  assert.equal((await history(DB)).at(-1).id, support.data.message.id);
  assert.equal((await edit(env, 'zzzzz', 'old edited')).status, 200);
  assert.equal((await request(env, '/api/bot/inbox', { bot: 'bot-secret' })).data.conversations.length, 0);
  const followup = await append(env, 'visitor follow-up');
  assert.equal(followup.status, 200);
  const inbox = await request(env, '/api/bot/inbox', { bot: 'bot-secret' });
  assert.equal(inbox.data.conversations.length, 1);
  assert.equal(inbox.data.conversations[0].lastMessagePreview, 'visitor follow-up');
  const stored = await history(DB);
  assert.deepEqual(stored.map((item) => item.id), ['zzzzz', support.data.message.id, followup.data.message.id]);
  assert.equal(stored[0].createdSeq, 1);
  assert.equal(stored[0].changeSeq, 3);
  DB.sqlite.close();
});

test('conflict exhaustion reports failure instead of acknowledging a lost message', async () => {
  const DB = await createDb();
  const env = envFor(DB);
  await seed(DB, { messages: [message('keep')] });
  let conflicts = 0;
  DB.beforeWrite = async (sql) => {
    if (!/UPDATE conversations\s+SET messages_json/.test(sql)) return;
    conflicts++;
    // A valid concurrent persisted change makes each expected raw snapshot stale.
    DB.sqlite.run("UPDATE conversations SET messages_json = messages_json || ' ' WHERE id = 'chat'");
  };
  const response = await append(env, 'not committed');
  assert.equal(response.status, 503);
  assert.equal(conflicts, 32);
  assert.deepEqual((await history(DB)).map((item) => item.id), ['keep']);
  DB.sqlite.close();
});

test('retry revalidates a bot reply target deleted after its first snapshot', async () => {
  const DB = await createDb();
  const env = envFor(DB);
  await seed(DB, { messages: [message('question')] });
  let signal;
  const reachedWrite = new Promise((resolve) => { signal = resolve; });
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let paused = false;
  DB.beforeWrite = async (sql, params) => {
    if (!/UPDATE conversations\s+SET messages_json/.test(sql) || paused || !params[0].includes('bot-race')) return;
    paused = true;
    signal();
    await gate;
  };
  const pending = request(env, '/api/bot/replies', { method: 'POST', bot: 'bot-secret', body: { conversationId: 'chat', text: 'reply', requestId: 'bot-race', replyToMessageId: 'question' } });
  await reachedWrite;
  assert.equal((await remove(env, 'question')).status, 200);
  release();
  assert.equal((await pending).status, 400);
  const stored = await history(DB);
  assert.equal(stored.length, 1);
  assert.ok(stored[0].deletedAt);
  DB.sqlite.close();
});

test('pre-persisted visitor tokens keep first sends retryable after a lost response', async () => {
  const DB = await createDb();
  const env = envFor(DB);
  const first = await append(env, 'first');
  assert.equal(first.status, 200);
  assert.equal(first.data.clientToken, 'visitor-token');
  const retry = await append(env, 'retry after network loss');
  assert.equal(retry.status, 200);
  assert.equal(retry.data.clientToken, 'visitor-token');
  assert.equal((await history(DB)).length, 2);
  DB.sqlite.close();
});
