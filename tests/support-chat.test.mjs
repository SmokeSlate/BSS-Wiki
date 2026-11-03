import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import { JSDOM } from 'jsdom';

const html = await readFile(new URL('../docs/public/support/index.html', import.meta.url), 'utf8');
const legacyHtml = await readFile(new URL('../docs/public/support/old_index.html', import.meta.url), 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
};
const response = (body, status = 200) => ({ ok: status < 400, statusText: 'Request failed', text: async () => JSON.stringify(body) });
const message = (id = 'm1', changeSeq = 1, text = 'Original message', role = 'user') => ({
  id, changeSeq, createdSeq: changeSeq, text, role, senderId: role === 'user' ? 'visitor' : 'agent',
  conversationId: 'visitor', createdAt: 1700000000000 + changeSeq,
});

// Execute the production inline script, with every network and clock boundary mocked.
// No scripts/resources are downloaded and no real support/upload requests are sent.
function harness(t, options = {}) {
  const dom = new JSDOM(html, { url: 'https://wiki.example/support/', runScripts: 'outside-only' });
  const { window } = dom;
  const calls = [], streams = [], timers = new Map(), analytics = [], notifications = [];
  let timerId = 0;
  window.localStorage.setItem('supportChatUserId', 'visitor');
  if (options.token !== false) window.localStorage.setItem('supportChatToken', 'synthetic-token');
  window.gtag = (...args) => analytics.push(args);
  window.setTimeout = (fn, delay) => { timers.set(++timerId, { fn, delay }); return timerId; };
  window.clearTimeout = id => timers.delete(id);
  window.confirm = () => true;
  window.prompt = () => 'Edited locally';
  window.Notification = class {
    static permission = 'granted';
    constructor(title, details) { notifications.push({ title, ...details }); }
  };
  if (options.sse !== false) {
    window.EventSource = class {
      listeners = new Map();
      closed = false;
      constructor(url) { this.url = new URL(url); streams.push(this); }
      addEventListener(type, callback) { this.listeners.set(type, callback); }
      emit(payload) { this.listeners.get('messages')({ data: JSON.stringify(payload) }); }
      close() { this.closed = true; }
    };
  }
  window.fetch = async (url, init = {}) => {
    const call = { url: new URL(url), method: init.method || 'GET', init };
    if (typeof init.body === 'string') call.body = JSON.parse(init.body);
    calls.push(call);
    if (call.url.pathname === '/api/presence') return options.presence ? options.presence(call) : response({ online: false, count: 0 });
    if (call.url.pathname === '/api/messages' && call.method === 'GET') return options.history ? options.history(call) : response({ messages: [], cursor: 0, hasMore: false });
    if (call.url.pathname === '/api/messages' && call.method === 'POST' && options.post) return options.post(call);
    if (call.url.pathname === '/api/messages' && call.method === 'PATCH' && options.patch) return options.patch(call);
    if (call.url.pathname === '/api/messages' && call.method === 'DELETE' && options.remove) return options.remove(call);
    if (call.url.pathname === '/api/uploads' && options.upload) return options.upload(call);
    throw new Error(`Unexpected synthetic request: ${call.method} ${call.url.pathname}`);
  };
  const script = [...window.document.scripts].find(script => script.textContent.includes('(function initSupportChat()'));
  assert.ok(script, 'Production chat script must be present');
  window.eval(script.textContent);
  const find = id => window.document.getElementById(id);
  const input = find('message-input');
  const enter = (extra = {}) => input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...extra }));
  const type = text => { input.value = text; input.dispatchEvent(new window.Event('input', { bubbles: true })); };
  const upload = (files = [new window.File(['synthetic'], 'image.png', { type: 'image/png' })]) => {
    Object.defineProperty(find('imgur-input'), 'files', { configurable: true, value: files });
    find('imgur-input').dispatchEvent(new window.Event('change'));
  };
  const hide = () => window.dispatchEvent(new window.PageTransitionEvent('pagehide'));
  const restore = () => window.dispatchEvent(new window.PageTransitionEvent('pageshow', { persisted: true }));
  t.after(() => { hide(); window.close(); });
  return {
    window, find, input, type, enter, upload, calls, streams, timers, analytics, notifications, hide, restore,
    posts: () => calls.filter(call => call.method === 'POST' && call.url.pathname === '/api/messages'),
    gets: () => calls.filter(call => call.method === 'GET' && call.url.pathname === '/api/messages'),
    messages: () => [...window.document.querySelectorAll('.message')],
    async tick(delay) {
      const entry = [...timers].find(([, timer]) => timer.delay === delay);
      assert.ok(entry, `Expected a scheduled ${delay}ms timer`);
      timers.delete(entry[0]);
      entry[1].fn();
      await flush();
    },
  };
}

test('delayed send clears only the unchanged submitted draft and rejects repeated Enter/click/upload', async t => {
  const pending = deferred();
  const h = harness(t, { post: () => pending.promise });
  await flush();
  h.type('  First draft  ');
  h.enter(); h.enter({ repeat: true });
  h.find('send-button').dispatchEvent(new h.window.Event('click'));
  h.upload();
  assert.equal(h.posts().length, 1);
  assert.equal(h.posts()[0].body.text, 'First draft');
  assert.equal(h.input.disabled, false, 'Text stays editable while sending');
  assert.equal(h.find('send-button').disabled, true);
  pending.resolve(response({ message: message('m1', 1, 'First draft') }));
  await flush();
  assert.equal(h.input.value, '');
  assert.equal(h.find('send-button').disabled, false);
  assert.equal(h.messages().length, 1);
});

test('an older send response preserves a newer draft, including whitespace', async t => {
  const pending = deferred();
  const h = harness(t, { post: () => pending.promise });
  await flush();
  h.type('First'); h.enter();
  h.type('  Newer unsent draft\n');
  pending.resolve(response({ message: message('m1', 1, 'First') }));
  await flush();
  assert.equal(h.input.value, '  Newer unsent draft\n');
});

test('typing away and back to the same draft still counts as a newer revision', async t => {
  const pending = deferred();
  const h = harness(t, { post: () => pending.promise });
  await flush();
  h.type('Same text'); h.enter(); h.type('Other text'); h.type('Same text');
  pending.resolve(response({ message: message() }));
  await flush();
  assert.equal(h.input.value, 'Same text');
});

test('failed send preserves the draft and releases the lock for an explicit retry', async t => {
  let attempt = 0;
  const h = harness(t, { post: () => ++attempt === 1 ? Promise.reject(new Error('Synthetic outage')) : response({ message: message() }) });
  await flush();
  h.type('Keep this'); h.enter(); await flush();
  assert.equal(h.input.value, 'Keep this');
  assert.equal(h.find('send-button').disabled, false);
  assert.match(h.find('input-hint').textContent, /Send failed.*retry/);
  h.enter(); await flush();
  assert.equal(h.posts().length, 2);
  assert.equal(h.input.value, '');
});

for (const [name, result] of [
  ['missing acknowledgement', response({})],
  ['incomplete message', response({ message: { id: 'missing-text' } })],
  ['HTML error page', { ok: true, text: async () => '<html>Proxy error</html>' }],
  ['empty body', { ok: true, text: async () => '' }],
]) {
  test(`successful HTTP status with ${name} does not clear the unsent draft`, async t => {
    const h = harness(t, { post: () => result });
    await flush(); h.type('Keep this'); h.enter(); await flush();
    assert.equal(h.input.value, 'Keep this');
    assert.equal(h.find('status-pill').textContent, 'Send failed');
    assert.equal(h.messages().length, 0);
    assert.equal(h.find('send-button').disabled, false);
  });
}

test('failed earlier send never replaces newer input and Shift+Enter/IME do not send', async t => {
  const pending = deferred();
  const h = harness(t, { post: () => pending.promise });
  await flush();
  h.type('First');
  h.enter({ shiftKey: true }); h.enter({ isComposing: true });
  assert.equal(h.posts().length, 0);
  h.enter(); h.type('Second'); pending.reject(new Error('Synthetic failure')); await flush();
  assert.equal(h.input.value, 'Second');
  assert.equal(h.posts().length, 1);
});

test('first-send token is persisted before POST and survives a lost response for retry', async t => {
  let attempts = 0;
  const h = harness(t, { token: false, post: call => {
    const token = h.window.localStorage.getItem('supportChatToken');
    assert.match(token, /^[a-f0-9]{64}$/);
    assert.equal(call.body.clientToken, token);
    assert.equal(call.init.headers['X-Client-Token'], token);
    return ++attempts === 1 ? Promise.reject(new Error('Synthetic lost response')) : response({ message: message(), clientToken: token });
  } });
  await flush();
  assert.equal(h.window.localStorage.getItem('supportChatToken'), null);
  h.type('First'); h.enter(); await flush();
  const token = h.window.localStorage.getItem('supportChatToken');
  assert.match(token, /^[a-f0-9]{64}$/);
  h.enter(); await flush();
  assert.equal(h.posts().length, 2);
  assert.equal(h.posts()[1].body.clientToken, token);
  assert.equal(h.input.value, '');
});

test('tokenless existing history is not assigned replacement credentials or posted to after a denied GET', async t => {
  const h = harness(t, { token: false, history: () => response({ error: 'Unauthorized' }, 403) });
  await flush(); h.type('Draft'); h.enter(); await flush();
  assert.equal(h.posts().length, 0);
  assert.equal(h.window.localStorage.getItem('supportChatToken'), null);
  assert.equal(h.input.value, 'Draft');
  assert.equal(h.find('send-button').disabled, false);
});

test('delayed initial history cannot erase a message sent while connecting', async t => {
  const history = deferred();
  const h = harness(t, { history: () => history.promise, post: () => response({ message: message('new', 2, 'New') }) });
  h.type('New'); h.enter(); await flush();
  history.resolve(response({ messages: [message('old', 1, 'Old')], cursor: 1 })); await flush();
  assert.deepEqual(h.messages().map(node => node.dataset.id), ['old', 'new']);
});

test('uploaded image with rejected message POST stays retryable and is never called sent', async t => {
  const link = 'https://allthepics.net/synthetic.png';
  let attempt = 0;
  const h = harness(t, {
    upload: () => response({ url: link }),
    post: () => ++attempt === 1 ? response({ error: 'Synthetic send rejection' }, 503) : response({ message: message('img', 1, link) }),
  });
  await flush(); h.upload(); await flush();
  assert.equal(h.input.value, link);
  assert.match(h.find('input-hint').textContent, /uploaded, but send failed.*retry/);
  assert.equal(h.find('input-hint').classList.contains('error'), true);
  assert.equal(h.find('send-button').disabled, false);
  assert.equal(h.input.disabled, false);
  assert.equal(h.find('tool-image').disabled, false);
  assert.equal(h.analytics.some(([, name, data]) => name === 'support_chat_image_upload_complete' && data.delivery === 'sent'), false);
  assert.equal([...h.timers.values()].some(timer => timer.delay === 2500), false, 'Failure remains visible until retry');
  h.enter(); await flush();
  assert.equal(h.posts().length, 2);
  assert.equal(h.posts()[1].body.text, link);
  assert.equal(h.calls.filter(call => call.url.pathname === '/api/uploads').length, 1);
  assert.equal(h.input.value, '');
});

test('an unacknowledged image POST preserves its uploaded URL instead of claiming success', async t => {
  const link = 'https://allthepics.net/unacknowledged.png';
  const h = harness(t, { upload: () => response({ url: link }), post: () => response({}) });
  await flush(); h.upload(); await flush();
  assert.equal(h.input.value, link);
  assert.match(h.find('input-hint').textContent, /send failed/);
  assert.equal(h.messages().length, 0);
});

test('image send failure preserves a newer draft and repeated events share the upload lock', async t => {
  const pending = deferred();
  const link = 'https://allthepics.net/synthetic.png';
  const h = harness(t, { upload: () => response({ url: link }), post: () => pending.promise });
  await flush(); h.upload(); await flush();
  h.upload(); h.enter(); h.find('send-button').dispatchEvent(new h.window.Event('click'));
  h.type('Newer draft');
  pending.reject(new Error('Synthetic failure')); await flush();
  assert.equal(h.posts().length, 1);
  assert.equal(h.calls.filter(call => call.url.pathname === '/api/uploads').length, 1);
  assert.equal(h.input.value, `Newer draft ${link}`);
});

test('upload with existing text adds to draft without a POST, and a later upload failure preserves it', async t => {
  const link = 'https://allthepics.net/first.png';
  let uploads = 0;
  const h = harness(t, { upload: () => ++uploads === 1 ? response({ url: link }) : Promise.reject(new Error('Synthetic upload failure')) });
  await flush(); h.type('Draft'); h.upload(); await flush();
  assert.equal(h.input.value, `Draft ${link}`);
  assert.equal(h.posts().length, 0);
  assert.match(h.find('input-hint').textContent, /Image added/);
  h.upload(); await flush();
  assert.match(h.find('input-hint').textContent, /Image upload failed/);
  assert.equal(h.input.value, `Draft ${link}`);
  assert.equal(h.input.disabled, false);
});

test('partial multi-image upload retains successful URLs when a later file fails', async t => {
  let uploads = 0;
  const link = 'https://allthepics.net/first.png';
  const h = harness(t, { upload: () => ++uploads === 1 ? response({ url: link }) : response({ error: 'Synthetic upload failure' }, 503) });
  await flush();
  const files = ['one.png', 'two.png'].map(name => new h.window.File(['synthetic'], name, { type: 'image/png' }));
  h.upload(files); await flush();
  assert.equal(h.input.value, link);
  assert.equal(h.posts().length, 0);
  assert.match(h.find('input-hint').textContent, /Already uploaded images are in your draft/);
  assert.equal(h.find('send-button').disabled, false);
});

test('successful image send reports success only after POST completes', async t => {
  const pending = deferred();
  const link = 'https://allthepics.net/synthetic.png';
  const h = harness(t, { upload: () => response({ url: link }), post: () => pending.promise });
  await flush(); h.upload(); await flush();
  assert.notEqual(h.find('input-hint').textContent, 'Image sent.');
  pending.resolve(response({ message: message('img', 1, link) })); await flush();
  assert.equal(h.find('input-hint').textContent, 'Image sent.');
  assert.equal(h.messages()[0].querySelector('img').src, link);
  assert.equal(h.input.value, '');
});

test('presence loads, refreshes online/offline, reports unknown on failure, and recovers independently of transport', async t => {
  const first = deferred();
  let count = 0;
  const h = harness(t, { presence: () => {
    count++;
    if (count === 1) return first.promise;
    if (count === 2) return response({ online: false, count: 0 });
    if (count === 3) return Promise.reject(new Error('Synthetic outage'));
    return response({ online: true, count: 1 });
  } });
  assert.equal(h.find('presence-pill').textContent, 'Checking support…');
  first.resolve(response({ online: true, count: 1 })); await flush();
  assert.equal(h.find('presence-pill').textContent, 'Support online');
  await h.tick(30000);
  assert.equal(h.find('presence-pill').textContent, 'Support offline');
  await h.tick(30000);
  assert.equal(h.find('presence-pill').textContent, 'Support status unavailable');
  assert.equal(h.find('status-pill').textContent, 'Online');
  await h.tick(30000);
  assert.equal(h.find('presence-pill').textContent, 'Support online');
  assert.equal(h.calls.filter(call => call.url.pathname === '/api/presence').every(call => call.method === 'GET' && !call.init.headers), true);
});

test('malformed presence does not claim support is offline', async t => {
  const h = harness(t, { presence: () => response({ online: 'false' }) });
  await flush();
  assert.equal(h.find('presence-pill').textContent, 'Support status unavailable');
});

test('incremental polling upserts edits, applies tombstones, and drains revision pages without creation-time filtering', async t => {
  let get = 0;
  const initial = message('old', 1, 'Original', 'support');
  const h = harness(t, { sse: false, token: true, history: call => {
    get++;
    if (get === 1) return response({ messages: [initial], cursor: 1, hasMore: false });
    if (get === 2) {
      assert.equal(call.url.searchParams.get('cursor'), '1');
      assert.equal(call.url.searchParams.has('after'), false);
      return response({ messages: [{ ...initial, text: 'Edited', changeSeq: 2 }], cursor: 2, hasMore: true });
    }
    assert.equal(call.url.searchParams.get('cursor'), '2');
    return response({ messages: [{ id: 'old', deleted: true, changeSeq: 3 }], cursor: 3, hasMore: false });
  } });
  await flush();
  assert.match(h.messages()[0].textContent, /Original/);
  await h.tick(4000);
  assert.equal(h.gets().length, 3);
  assert.equal(h.messages().length, 0);
  assert.equal(h.window.document.querySelectorAll('.day-divider').length, 0);
  assert.equal(h.find('empty-state').style.display, 'block');
  assert.equal(h.notifications.length, 0, 'Edits/deletions never re-notify');
});

test('SSE upserts known IDs, rejects stale/repeated edits and tombstone resurrection, and uses returned cursor', async t => {
  const original = message('old', 4, 'Original', 'support');
  const h = harness(t, { token: true, history: () => response({ messages: [original], cursor: 4 }) });
  await flush();
  const stream = h.streams[0];
  assert.equal(stream.url.searchParams.get('cursor'), '4');
  assert.equal(stream.url.searchParams.has('after'), false);
  stream.emit({ messages: [{ ...original, text: 'Edited', changeSeq: 5 }], cursor: 5 });
  stream.emit({ messages: [original], cursor: 4 });
  assert.match(h.messages()[0].textContent, /Edited/);
  assert.equal(h.messages().length, 1);
  stream.emit({ messages: [{ id: 'old', deleted: true, changeSeq: 6 }], cursor: 6 });
  stream.emit({ messages: [{ ...original, text: 'Stale edit', changeSeq: 5 }], cursor: 5 });
  assert.equal(h.messages().length, 0);
  assert.equal(h.notifications.length, 0);
  stream.onerror();
  await h.tick(4000);
  assert.equal(h.gets().at(-1).url.searchParams.get('cursor'), '6');
});

test('new SSE replies notify once; known edits do not notify and chronological/day ordering stays valid', async t => {
  const old = message('old', 1, 'Old', 'support');
  const newer = { ...message('new', 2, 'New', 'support'), createdAt: old.createdAt + 86400000 };
  const h = harness(t, { token: true, history: () => response({ messages: [old], cursor: 1 }) });
  await flush();
  h.streams[0].emit({ messages: [newer], cursor: 2 });
  h.streams[0].emit({ messages: [newer], cursor: 2 });
  h.streams[0].emit({ messages: [{ ...old, text: 'Edited old', changeSeq: 3 }], cursor: 3 });
  assert.deepEqual(h.messages().map(node => node.dataset.id), ['old', 'new']);
  assert.equal(h.window.document.querySelectorAll('.day-divider').length, 2);
  assert.equal(h.notifications.length, 1);
  h.streams[0].emit({ messages: [{ id: 'old', deleted: true, changeSeq: 4 }], cursor: 4 });
  assert.equal(h.window.document.querySelectorAll('.day-divider').length, 1);
});

test('same-millisecond messages use immutable creation order even when delivered out of order or edited', async t => {
  const question = { ...message('z-question', 1, 'Question'), createdAt: 1700000000000 };
  const reply = { ...message('a-reply', 2, 'Reply', 'support'), createdAt: question.createdAt };
  const h = harness(t, { token: true, history: () => response({ messages: [reply, question], cursor: 2 }) });
  await flush();
  assert.deepEqual(h.messages().map(node => node.dataset.id), ['z-question', 'a-reply']);
  h.streams[0].emit({ messages: [{ ...question, text: 'Edited question', changeSeq: 3 }], cursor: 3 });
  assert.deepEqual(h.messages().map(node => node.dataset.id), ['z-question', 'a-reply']);
});

test('local edit/delete responses share revision merge and cannot be undone by a delayed SSE batch', async t => {
  const own = message();
  const h = harness(t, { token: true,
    history: () => response({ messages: [own], cursor: 1 }),
    patch: () => response({ message: { ...own, text: 'Edited locally', changeSeq: 2 } }),
    remove: () => response({ message: { id: own.id, deleted: true, changeSeq: 3 } }),
  });
  await flush();
  h.messages()[0].querySelector('.message-action').click(); await flush();
  h.streams[0].emit({ messages: [own], cursor: 1 });
  assert.match(h.messages()[0].textContent, /Edited locally/);
  h.messages()[0].querySelectorAll('.message-action')[1].click(); await flush();
  h.streams[0].emit({ messages: [{ ...own, text: 'Edited locally', changeSeq: 2 }], cursor: 2 });
  assert.equal(h.messages().length, 0);
});

test('pagehide closes streams, aborts pending requests, clears timers, and ignores late callbacks', async t => {
  const pending = deferred();
  const h = harness(t, { token: true, post: () => pending.promise });
  await flush();
  const stream = h.streams[0];
  h.type('Pending'); h.enter();
  const status = h.find('status-pill').textContent;
  h.hide();
  assert.equal(stream.closed, true);
  assert.equal(h.timers.size, 0);
  assert.equal(h.calls.every(call => call.init.signal.aborted), true);
  pending.resolve(response({ message: message() }));
  stream.emit({ messages: [message('late')], cursor: 1 });
  stream.onopen(); stream.onerror(); await flush();
  assert.equal(h.timers.size, 0);
  assert.equal(h.messages().length, 0);
  assert.equal(h.find('status-pill').textContent, status);
  assert.equal(h.input.value, 'Pending');
});

test('pagehide during bootstrap/poll/presence prevents rescheduling, and BFCache restore safely resumes', async t => {
  const initial = deferred(), presence = deferred();
  let gets = 0, presences = 0;
  const h = harness(t, { token: true,
    history: () => ++gets === 1 ? initial.promise : response({ messages: [message()], cursor: 1 }),
    presence: () => ++presences === 1 ? presence.promise : response({ online: true }),
  });
  h.hide(); h.restore(); await flush();
  initial.resolve(response({ messages: [message('stale', 8, 'Stale history')], cursor: 8 }));
  presence.resolve(response({ online: false })); await flush();
  assert.deepEqual(h.messages().map(node => node.dataset.id), ['m1']);
  assert.equal(h.find('presence-pill').textContent, 'Support online');
  assert.equal(h.streams.length, 1);
  assert.equal(h.streams[0].url.searchParams.get('cursor'), '1');
  h.hide(); assert.equal(h.timers.size, 0);
});

test('pagehide during an incremental poll ignores its late response and schedules no new timers', async t => {
  const pending = deferred();
  let gets = 0;
  const h = harness(t, { sse: false, history: () => ++gets === 1 ? response({ messages: [], cursor: 0 }) : pending.promise });
  await flush(); await h.tick(4000); h.hide();
  pending.resolve(response({ messages: [message()], cursor: 1 })); await flush();
  assert.equal(h.messages().length, 0);
  assert.equal(h.timers.size, 0);
});

for (const action of ['edit', 'delete', 'upload-send']) {
  test(`interrupted ${action} cannot change restored page state, token, hints, or timers`, async t => {
    const pending = deferred();
    const own = message();
    const link = 'https://allthepics.net/interrupted.png';
    const h = harness(t, { token: true,
      history: () => response({ messages: [own], cursor: 1 }),
      patch: () => pending.promise,
      remove: () => pending.promise,
      upload: () => response({ url: link }),
      post: () => pending.promise,
    });
    await flush();
    if (action === 'upload-send') { h.upload(); await flush(); }
    else h.messages()[0].querySelectorAll('.message-action')[action === 'edit' ? 0 : 1].click();
    h.hide();
    assert.equal(h.timers.size, 0);
    h.restore(); await flush();
    const hint = h.find('input-hint').textContent;
    const timerCount = h.timers.size;
    pending.resolve(response({ clientToken: 'stale-token', message: action === 'delete'
      ? { id: own.id, deleted: true, changeSeq: 2 }
      : { ...own, text: 'Stale operation', changeSeq: 2 } }));
    await flush();
    assert.equal(h.messages().length, 1);
    assert.match(h.messages()[0].textContent, /Original message/);
    assert.equal(h.window.localStorage.getItem('supportChatToken'), 'synthetic-token');
    assert.equal(h.find('input-hint').textContent, hint);
    assert.equal(h.timers.size, timerCount);
    if (action === 'upload-send') assert.equal(h.input.value, link, 'Uploaded link survives interruption for explicit retry');
  });
}

test('rejected edit/delete after disposal cannot restart timers', async t => {
  const pending = deferred();
  const h = harness(t, { token: true, history: () => response({ messages: [message()], cursor: 1 }), patch: () => pending.promise });
  await flush(); h.messages()[0].querySelector('.message-action').click(); h.hide();
  pending.reject(new Error('Synthetic abort')); await flush();
  assert.equal(h.timers.size, 0);
});

test('legacy support URL is a noindex redirect preserving query/hash, with no retired sidebar fetch or chat copy', () => {
  const dom = new JSDOM(legacyHtml);
  const { document } = dom.window;
  assert.equal(document.querySelector('meta[name="robots"]').content, 'noindex');
  assert.equal(document.querySelector('a[href="/"]').textContent, 'Return to the wiki');
  assert.doesNotMatch(legacyHtml, /_sidebar\.md|fetch\(|api\/messages|docsify/);
  const replacements = [];
  const location = {
    href: 'http://wiki.sm0ke.org/support/old_index.html?topic=quest#reply',
    search: '?topic=quest', hash: '#reply', replace: url => replacements.push(url),
  };
  vm.runInNewContext(document.scripts[0].textContent, { document, location, URL });
  assert.deepEqual(replacements, ['https://wiki.sm0ke.org/support/?topic=quest#reply']);
  assert.equal(document.getElementById('support-link').href, replacements[0]);
  const current = new JSDOM(html);
  assert.equal(current.window.document.querySelector('meta[name="robots"]').content, 'noindex');
  current.window.close();
  dom.window.close();
});

const redirectOrigins = [
  ['http://sm0ke.org', true],
  ['http://wiki.sm0ke.org', true],
  ['http://preview.wiki.sm0ke.org:8080', true],
  ['http://WIKI.SM0KE.ORG', true],
  ['http://evilsm0ke.org', false],
  ['http://not-sm0ke.org', false],
  ['http://sm0ke.org.evil.example', false],
  ['http://wiki.sm0ke.org.evil.example', false],
  ['http://example.org', false],
  ['http://localhost:8080', false],
  ['http://127.0.0.1:8080', false],
  ['https://sm0ke.org', false],
  ['https://wiki.sm0ke.org', false],
];

test('support HTTPS upgrade matches only the apex domain or a dot-delimited subdomain', () => {
  const dom = new JSDOM(html);
  const script = [...dom.window.document.scripts].find(script => script.textContent.includes('location.replace('));
  assert.ok(script, 'The HTTPS redirect script exists');
  for (const [origin, upgrade] of redirectOrigins) {
    const url = new URL(`${origin}/support/?topic=quest&return=https%3A%2F%2Fexample.org#reply`);
    const replacements = [];
    const location = {
      protocol: url.protocol, hostname: url.hostname, host: url.host,
      pathname: url.pathname, search: url.search, hash: url.hash,
      replace: destination => replacements.push(destination),
    };
    vm.runInNewContext(script.textContent, { location });
    if (upgrade) url.protocol = 'https:';
    assert.deepEqual(replacements, upgrade ? [url.href] : [], origin);
  }
  dom.window.close();
});

test('legacy support redirects remain on the same host and upgrade only the intended domain', () => {
  for (const [origin, upgrade] of redirectOrigins) {
    const dom = new JSDOM(legacyHtml);
    const { document } = dom.window;
    const url = new URL(`${origin}/support/old_index.html?topic=quest&return=https%3A%2F%2Fexample.org#reply`);
    const replacements = [];
    const location = { href: url.href, search: url.search, hash: url.hash, replace: destination => replacements.push(destination) };
    vm.runInNewContext(document.scripts[0].textContent, { document, location, URL });
    url.pathname = '/support/';
    if (upgrade) url.protocol = 'https:';
    assert.deepEqual(replacements, [url.href], origin);
    assert.equal(document.getElementById('support-link').href, url.href, origin);
    dom.window.close();
  }
});
