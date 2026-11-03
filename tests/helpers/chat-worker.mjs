import fs from 'node:fs/promises';
import initSqlJs from 'sql.js';
import { webcrypto, timingSafeEqual } from 'node:crypto';

// Cloudflare exposes timingSafeEqual on SubtleCrypto; Node exposes it separately.
if (!globalThis.crypto) globalThis.crypto = webcrypto;
if (!crypto.subtle.timingSafeEqual) crypto.subtle.timingSafeEqual = (a, b) => timingSafeEqual(Buffer.from(a), Buffer.from(b));
const source = await fs.readFile(new URL('../../chat-worker/worker.js', import.meta.url), 'utf8');
export const worker = (await import(`data:text/javascript;base64,${Buffer.from(source + '\n//# sourceURL=chat-worker-under-test.js').toString('base64')}`)).default;
const SQL = await initSqlJs();

export async function migration(number) {
  const names = await fs.readdir(new URL('../../chat-worker/migrations/', import.meta.url));
  const name = names.find((item) => item.startsWith(String(number).padStart(4, '0')));
  return fs.readFile(new URL(`../../chat-worker/migrations/${name}`, import.meta.url), 'utf8');
}

export async function createDb({ through = 4 } = {}) {
  const sqlite = new SQL.Database();
  for (let number = 1; number <= through; number++) sqlite.run(await migration(number));
  const db = {
    sqlite,
    // A test hook pauses completed reads, so concurrent requests genuinely read
    // the same snapshot before their SQL writes contend. SQL is never mocked.
    async batch(statements) {
      sqlite.run('BEGIN');
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        sqlite.run('COMMIT');
        return results;
      } catch (error) { sqlite.run('ROLLBACK'); throw error; }
    },
    afterRead: null,
    beforeWrite: null,
    prepare(sql) {
      let params = [];
      const execute = () => {
        const statement = sqlite.prepare(sql);
        try {
          statement.bind(params);
          const results = [];
          while (statement.step()) results.push(statement.getAsObject());
          return { results, meta: { changes: sqlite.getRowsModified() } };
        } finally { statement.free(); }
      };
      return {
        bind(...values) { params = values; return this; },
        async all() {
          if (!/^\s*SELECT/i.test(sql) && db.beforeWrite) await db.beforeWrite(sql, params);
          const result = execute();
          if (/^\s*SELECT/i.test(sql) && db.afterRead) await db.afterRead(sql, params, result);
          return result;
        },
        async first() { return (await this.all()).results[0] || null; },
        async run() { return this.all(); },
      };
    },
  };
  return db;
}

export function envFor(DB, extra = {}) {
  return { DB, ADMIN_KEY: 'admin-secret', BOT_API_KEY: 'bot-secret', DISCORD_BRIDGE_KEY: 'discord-secret', ...extra };
}

export async function request(env, path, { method = 'GET', body, admin, bot, headers = {} } = {}) {
  const response = await worker.fetch(new Request(`https://chat.test${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(admin ? { 'X-Admin-Key': admin } : {}), ...(bot ? { Authorization: `Bearer ${bot}` } : {}), ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }), env, { waitUntil() { throw new Error('External work must not be scheduled in these fixtures'); } });
  return { status: response.status, data: await response.json() };
}

export async function seed(DB, { id = 'chat', token = 'visitor-token', messages = [], discordThread = 'thread' } = {}) {
  await DB.prepare(`INSERT INTO conversations (id, name, created_at, last_message_at, token, messages_json, discord_thread_id)
    VALUES (?, 'Visitor', 1, 1, ?, ?, ?)`).bind(id, token, JSON.stringify(messages), discordThread).run();
}

export function message(id, values = {}) {
  return { id, conversationId: 'chat', senderId: 'visitor', senderName: 'Visitor', text: id, role: 'user', createdAt: 100, changeSeq: 1, ...values };
}

export async function history(DB, id = 'chat') {
  const row = await DB.prepare('SELECT messages_json FROM conversations WHERE id = ?').bind(id).first();
  return row ? JSON.parse(row.messages_json) : [];
}

export function readBarrier(DB, count) {
  let arrivals = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  DB.afterRead = async (sql) => {
    if (!sql.includes('messages_json as messagesJson') || arrivals >= count) return;
    arrivals++;
    if (arrivals === count) release();
    await gate;
  };
}

export function writeBarrier(DB, count) {
  let arrivals = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  DB.beforeWrite = async (sql) => {
    if (!/UPDATE conversations\s+SET messages_json/.test(sql) || arrivals >= count) return;
    arrivals++;
    if (arrivals === count) release();
    await gate;
  };
}

export async function openStream(t, env, suffix = '?conversationId=chat&token=visitor-token&cursor=0', headers = {}) {
  const timeouts = new Map();
  const intervals = new Map();
  let timerId = 0;
  t.mock.method(globalThis, 'setTimeout', (fn) => { const id = ++timerId; timeouts.set(id, fn); return id; });
  t.mock.method(globalThis, 'clearTimeout', (id) => timeouts.delete(id));
  t.mock.method(globalThis, 'setInterval', (fn) => { const id = ++timerId; intervals.set(id, fn); return id; });
  t.mock.method(globalThis, 'clearInterval', (id) => intervals.delete(id));
  const response = await worker.fetch(new Request(`https://chat.test/api/stream${suffix}`, { headers }), env, {});
  const reader = response.body.getReader();
  if (response.status !== 200) return { response, reader };
  await reader.read(); // retry
  await reader.read(); // connected
  return {
    response,
    reader,
    async tick() {
      const entry = timeouts.entries().next().value;
      if (!entry) throw new Error('No scheduled stream poll');
      timeouts.delete(entry[0]);
      await entry[1]();
    },
    async event() {
      let text = '';
      while (!text.includes('\n\n')) text += new TextDecoder().decode((await reader.read()).value);
      const data = text.match(/^data: (.+)$/m);
      return { text, data: data ? JSON.parse(data[1]) : null };
    },
    timers: { timeouts, intervals },
  };
}
