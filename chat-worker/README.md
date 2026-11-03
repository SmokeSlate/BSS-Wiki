# Support chat Worker

## Local verification

From the repository root, install the locked development dependencies and run:

```sh
npm ci
npm test
```

The `tests/chat-worker*.test.mjs` suites run the actual Worker against SQLite
(sql.js), including forced overlapping reads/writes. Stream tests use controlled
local timers; no production database, Discord API, or upload API is contacted.

## Authentication

Set `ADMIN_KEY` as a Worker secret before using administration. A missing, empty,
or whitespace-only key disables administration (HTTP 503), rather than trusting
anonymous requests. A wrong or missing supplied key returns HTTP 403 when an
admin key is configured. Visitor tokens continue to protect individual chats.
`BOT_API_KEY` and `DISCORD_BRIDGE_KEY` remain separate secrets with their existing
configured-secret and authorization checks. Do not put any keys in source files.

## Message changes and reconnects

`GET /api/messages?conversationId=…` returns a snapshot of the latest 200 visible
messages, a numeric `cursor`, and `hasMore: false`. Administrators may also see
soft-deleted messages and audit fields. The cursor tracks committed conversation
mutations, not a creation timestamp.

Subsequent requests use `cursor=N` and return `{ messages, cursor, hasMore }`.
Changed states are ordered by `changeSeq`, with at most 200 per page. Follow the
returned cursor while `hasMore` is true. `cursor=0` can retrieve all stored states,
including older history, in pages. Multiple edits between polls may coalesce into
one latest state. Do not advance a polling cursor from a POST/PATCH/DELETE reply:
other changes may have committed before that reply and still need fetching.

`GET /api/stream?conversationId=…&cursor=N` emits the same object in `messages`
events. The SSE `id` contains the emitted page cursor. `Last-Event-ID` takes
precedence over the URL cursor on reconnect. If a page has more changes, later
polls continue from that page, never the newest database revision.

Merge by message ID and ignore updates with an older or equal `changeSeq`.
Sort the timeline by `createdAt`, then immutable `createdSeq` for same-millisecond
messages. Editing a message changes `changeSeq`, never its creation order.
Visitor deletion deltas contain only:

```json
{ "id": "message-id", "conversationId": "chat-id", "deleted": true, "changeSeq": 8 }
```

Remove that message from the UI while retaining its last revision to prevent a
stale replay from restoring it. Visitor GET, SSE, POST, PATCH and DELETE responses
share one explicit allowlist. They never expose original text, moderator/editor
identities, deleted bodies, or internal request IDs. Admin streams retain audit
records.

The legacy `after` timestamp parameter remains available for older clients and
returns earliest matching newly created messages first. It cannot make same-millisecond updates
reliable; clients should upgrade to `cursor` and reset to a fresh snapshot when
switching conversation/account.

## Storage and migration 0004

The original `messages` table was left behind by migration 0002. Migration 0004
merges that legacy history into each conversation's JSON store, preserving IDs,
timestamps, edits, deletion metadata, newer JSON-only messages and existing
revisions. For duplicate IDs the current JSON state wins, with missing audit
fields recovered from the legacy row. It retains the original table as a recovery
copy and creates admin-readable metadata for orphaned legacy histories. Repeating
the backfill does not duplicate messages or renumber assigned cursors.

All appends, edits and deletes use one atomic SQLite compare-and-swap statement
against the exact stored JSON snapshot. A conflict rereads and revalidates the
mutation. A saturated conversation returns HTTP 503 instead of acknowledging an
uncommitted write. Bot/Discord request-ID deduplication is checked again on every
retry. Visitors racing to create a chat cannot replace its token.

Writes no longer truncate history at 200 messages. The API still limits page size.
This avoids silently losing older messages and bot idempotency records. Monitor
conversation size against D1's value/row limits; very large or long-lived chats
will eventually need archival or row-per-message storage. A storage error fails
the request, rather than reporting success for a lost write.

### Deployment checklist (manual, not performed by the tests)

1. Export/backup the D1 database and verify the backup before any migration.
2. Pause all message writers, including the old Worker, bot, and Discord bridge.
   Do not run old and new writers together: the old code does not use CAS and
   truncates history. Inspect invalid JSON histories before migrating; the
   migration leaves malformed JSON unchanged for manual recovery.
3. Apply pending migrations through 0004 to the intended database. Compare unique
   message IDs and audit metadata from both stores before and after. Verify that
   visitor tokens, names and Discord links are unchanged.
4. Deploy the new Worker and cursor-aware clients, then resume writers. Reload
   existing clients to establish a fresh cursor after historical backfill.
5. Verify admin rejection with missing/wrong credentials, visitor isolation,
   simultaneous sends, edits/deletes and SSE reconnect using non-sensitive test
   conversations.

Do not roll back to the old writer after new writes without a fresh backup and a
reconciliation plan: its 200-message truncation and unguarded replacements can
lose newly recovered history. No deployment configuration or credentials are
changed by this patch.
