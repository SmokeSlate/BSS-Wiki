import test from 'node:test';
import assert from 'node:assert/strict';
import { createDb, envFor, request, seed, message, openStream } from './helpers/chat-worker.mjs';

const forbidden = ['originalText', 'deletedAt', 'deletedBy', 'editedBy', 'requestId'];
function assertVisitorSafe(messages) {
  for (const item of messages) {
    for (const key of forbidden) assert.equal(key in item, false, `visitor received ${key}`);
    if (item.deleted) assert.deepEqual(Object.keys(item).sort(), ['changeSeq', 'conversationId', 'deleted', 'id']);
  }
}

test('visitor GET and SSE use identical safe projections, while admin keeps audit records', async (t) => {
  const DB = await createDb();
  const env = envFor(DB);
  await seed(DB, { messages: [
    message('edited', { text: 'current', originalText: 'SECRET original', editedAt: 101, editedBy: 'SECRET editor', requestId: 'SECRET request' }),
    message('deleted', { text: 'SECRET deleted', originalText: 'SECRET history', deletedAt: 102, deletedBy: 'SECRET moderator', changeSeq: 2 }),
  ] });
  const get = await request(env, '/api/messages?conversationId=chat&token=visitor-token&cursor=0');
  assert.equal(get.status, 200);
  assertVisitorSafe(get.data.messages);
  assert.equal(JSON.stringify(get.data).includes('SECRET'), false);
  const stream = await openStream(t, env);
  assert.equal(stream.response.status, 200);
  await stream.tick();
  const streamed = await stream.event();
  assert.deepEqual(streamed.data, get.data);
  assert.match(streamed.text, /^id: 2\n/);
  await stream.reader.cancel();
  assert.equal(stream.timers.timeouts.size, 0);
  assert.equal(stream.timers.intervals.size, 0);
  t.mock.restoreAll();
  const adminGet = await request(env, '/api/messages?conversationId=chat&cursor=0', { admin: 'admin-secret' });
  const adminStream = await openStream(t, env, '?conversationId=chat&cursor=0&adminKey=admin-secret');
  await adminStream.tick();
  assert.deepEqual((await adminStream.event()).data, adminGet.data);
  assert.equal(adminGet.data.messages[0].originalText, 'SECRET original');
  assert.equal(adminGet.data.messages[1].deletedBy, 'SECRET moderator');
  await adminStream.reader.cancel();
  DB.sqlite.close();
});

test('polling and SSE deliver old-message edits and privacy-safe deletions without new creates', async (t) => {
  const DB = await createDb();
  const env = envFor(DB);
  await seed(DB, { messages: [message('old'), message('newer', { changeSeq: 2, createdAt: 200 })] });
  const initial = await request(env, '/api/messages?conversationId=chat&token=visitor-token');
  assert.equal(initial.data.cursor, 2);
  const stream = await openStream(t, env, '?conversationId=chat&token=visitor-token&cursor=2');
  t.mock.method(Date, 'now', () => 999); // edit and delete share a clock tick
  const edited = await request(env, '/api/messages', { method: 'PATCH', body: { conversationId: 'chat', messageId: 'old', senderId: 'visitor', clientToken: 'visitor-token', text: 'updated old message' } });
  assert.equal(edited.status, 200);
  assertVisitorSafe([edited.data.message]);
  await stream.tick();
  const editEvent = await stream.event();
  assert.equal(editEvent.data.cursor, 3);
  assert.equal(editEvent.data.messages[0].id, 'old');
  assert.equal(editEvent.data.messages[0].text, 'updated old message');
  const deleted = await request(env, '/api/messages', { method: 'DELETE', admin: 'admin-secret', body: { conversationId: 'chat', messageId: 'newer' } });
  assert.equal(deleted.status, 200);
  const polled = await request(env, '/api/messages?conversationId=chat&token=visitor-token&cursor=3');
  await stream.tick();
  const deleteEvent = await stream.event();
  assert.deepEqual(deleteEvent.data, polled.data);
  assert.deepEqual(polled.data.messages, [{ id: 'newer', conversationId: 'chat', deleted: true, changeSeq: 4 }]);
  assert.equal((await request(env, '/api/messages?conversationId=chat&token=visitor-token')).data.messages.length, 1);
  await stream.reader.cancel();
  DB.sqlite.close();
});

test('more than 200 equal-timestamp mutations paginate without gaps across GET and SSE reconnect', async (t) => {
  const DB = await createDb();
  const env = envFor(DB);
  await seed(DB, { messages: Array.from({ length: 451 }, (_, i) => message(`id-${String(i + 1).padStart(3, '0')}`, { changeSeq: i + 1, ...(i % 7 === 0 ? { deletedAt: 110 } : {}) })) });
  const first = await request(env, '/api/messages?conversationId=chat&token=visitor-token&cursor=0');
  assert.equal(first.data.messages.length, 200);
  assert.equal(first.data.cursor, 200);
  assert.equal(first.data.hasMore, true);
  const stream = await openStream(t, env, '?conversationId=chat&token=visitor-token&cursor=0', { 'Last-Event-ID': '200' });
  await stream.tick();
  const second = (await stream.event()).data;
  assert.equal(second.messages.length, 200);
  assert.equal(second.cursor, 400);
  assert.equal(second.hasMore, true);
  await stream.tick();
  const third = (await stream.event()).data;
  assert.equal(third.messages.length, 51);
  assert.equal(third.cursor, 451);
  assert.equal(third.hasMore, false);
  const ids = [...first.data.messages, ...second.messages, ...third.messages].map((item) => item.id);
  assert.equal(new Set(ids).size, 451);
  assertVisitorSafe([...first.data.messages, ...second.messages, ...third.messages]);
  await stream.reader.cancel();
  const done = await request(env, '/api/messages?conversationId=chat&token=visitor-token&cursor=451');
  assert.deepEqual(done.data, { messages: [], cursor: 451, hasMore: false });
  DB.sqlite.close();
});

test('legacy after pagination returns earliest new messages and validates new cursors', async () => {
  const DB = await createDb();
  const env = envFor(DB);
  await seed(DB, { messages: [1, 2, 3].map((n) => message(`id${n}`, { createdAt: n + 1, changeSeq: n })) });
  const result = await request(env, '/api/messages?conversationId=chat&token=visitor-token&after=1&limit=2');
  assert.deepEqual(result.data.messages.map((item) => item.id), ['id1', 'id2']);
  assert.equal(result.data.cursor, 2);
  for (const cursor of ['-1', 'wat', '1.5', 'Infinity', '9007199254740992']) {
    assert.equal((await request(env, `/api/messages?conversationId=chat&token=visitor-token&cursor=${cursor}`)).status, 400);
  }
  DB.sqlite.close();
});

test('legacy timestamp polling cannot be trapped behind edits to old messages', async () => {
  const DB = await createDb();
  const env = envFor(DB);
  await seed(DB, { messages: [
    message('old-edited', { createdAt: 1, editedAt: 200, changeSeq: 3 }),
    message('new', { createdAt: 101, changeSeq: 2 }),
  ] });
  const result = await request(env, '/api/messages?conversationId=chat&token=visitor-token&after=100&limit=1');
  assert.deepEqual(result.data.messages.map((item) => item.id), ['new']);
  const changes = await request(env, '/api/messages?conversationId=chat&token=visitor-token&cursor=2');
  assert.deepEqual(changes.data.messages.map((item) => item.id), ['old-edited']);
  DB.sqlite.close();
});
