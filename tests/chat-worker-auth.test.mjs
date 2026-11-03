import test from 'node:test';
import assert from 'node:assert/strict';
import { createDb, envFor, request, seed, message, worker } from './helpers/chat-worker.mjs';

const adminRoutes = [
  ['/api/conversations', {}],
  ['/api/snippets', {}],
  ['/api/snippets', { method: 'POST', body: { key: 'test', content: 'test' } }],
  ['/api/snippets', { method: 'DELETE', body: { key: 'test' } }],
  ['/api/presence', { method: 'POST', body: { adminId: 'admin' } }],
  ['/api/messages', { method: 'POST', body: { conversationId: 'chat', senderId: 'support', role: 'support', text: 'support reply' } }],
];

for (const configured of [undefined, '', '   ', 'admin-secret']) {
  test(`admin routes fail closed with ADMIN_KEY=${JSON.stringify(configured)}`, async () => {
    const DB = await createDb();
    const env = envFor(DB, { ADMIN_KEY: configured });
    await seed(DB, { messages: [message('private', { originalText: 'private history' })] });
    for (const [path, options] of adminRoutes) {
      for (const supplied of [undefined, '', 'wrong', 'admin-secret']) {
        const response = await request(env, path, { ...options, admin: supplied });
        const expected = configured === 'admin-secret' ? (supplied === configured ? 200 : 403) : 503;
        assert.equal(response.status, expected, `${path} ${options.method || 'GET'} supplied=${supplied}`);
      }
    }
    for (const suffix of ['', '&adminKey=wrong', '&adminKey=admin-secret']) {
      const response = await request(env, `/api/messages?conversationId=chat${suffix}`);
      assert.equal(response.status, configured === 'admin-secret' && suffix.includes('admin-secret') ? 200 : 403);
    }
    for (const method of ['PATCH', 'DELETE']) {
      const response = await request(env, '/api/messages', { method, body: { conversationId: 'chat', messageId: 'private', text: 'hacked', senderId: 'visitor' } });
      assert.equal(response.status, 403);
    }
    const presence = await request(env, '/api/presence');
    assert.equal(presence.status, 200);
    assert.equal('agents' in presence.data, false);
    // A visitor's own token keeps working even when administration is disabled.
    const own = await request(env, '/api/messages?conversationId=chat&token=visitor-token');
    assert.equal(own.status, 200);
    assert.equal('originalText' in own.data.messages[0], false);
    const stream = await worker.fetch(new Request('https://chat.test/api/stream?conversationId=chat&adminKey=wrong'), env, {});
    assert.equal(stream.status, 403);
    DB.sqlite.close();
  });
}

test('bot and Discord configured-secret checks remain independent of admin configuration', async () => {
  const DB = await createDb();
  await seed(DB);
  const cases = [
    ['/api/bot/inbox', 'BOT_API_KEY', {}],
    ['/api/discord/replies', 'DISCORD_BRIDGE_KEY', { method: 'POST', body: { threadId: 'thread', messageId: 'discord1', senderId: 'agent', text: 'reply' } }],
  ];
  for (const [path, key, options] of cases) {
    for (const value of [undefined, '', '   ']) {
      assert.equal((await request(envFor(DB, { [key]: value }), path, options)).status, 503);
    }
    assert.equal((await request(envFor(DB), path, { ...options, bot: 'wrong' })).status, 401);
  }
  assert.equal((await request(envFor(DB), '/api/bot/inbox', { bot: 'bot-secret' })).status, 200);
  assert.equal((await request(envFor(DB), cases[1][0], { ...cases[1][2], bot: 'discord-secret' })).status, 201);
  DB.sqlite.close();
});

test('unknown roles do not bypass support authorization', async () => {
  const DB = await createDb();
  assert.equal((await request(envFor(DB), '/api/messages', { method: 'POST', body: { conversationId: 'chat', senderId: 'visitor', text: 'pretend', role: 'admin' } })).status, 400);
  DB.sqlite.close();
});
