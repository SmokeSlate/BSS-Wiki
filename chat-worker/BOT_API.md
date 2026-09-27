# AI support bot API

The bot API gives a support bot three focused operations. It can find chats waiting for a reply, read one chat, and send a reply. It never exposes the visitor's client token or the admin key.

## Setup

Store a separate bot key as a Worker secret:

```sh
npx wrangler secret put BOT_API_KEY
```

Send it as a bearer token on every `/api/bot/*` request:

```http
Authorization: Bearer YOUR_BOT_API_KEY
```

`X-Bot-Key` is also accepted for clients that cannot set an `Authorization` header.

## Poll the inbox

```http
GET /api/bot/inbox?limit=25
```

The inbox only returns conversations whose latest message is from a visitor. Results use oldest-first order so the bot handles requests fairly. An unanswered conversation stays in the inbox, so a failed bot run cannot lose it.

```json
{
  "conversations": [
    {
      "id": "abc123",
      "name": "Guest (abc123)",
      "createdAt": 1790520000000,
      "lastMessageAt": 1790520060000,
      "lastMessagePreview": "Beat Saber crashes when I open it",
      "lastMessageSenderName": "Guest (abc123)"
    }
  ],
  "hasMore": false
}
```

`limit` defaults to 25 and cannot exceed 100.

## Read a conversation

```http
GET /api/bot/conversations/abc123?limit=200
```

The endpoint returns the most recent messages up to `limit`, which defaults to 200. Deleted messages and the private client token are omitted. `hasMore` tells the bot when older messages were left out.

## Send a reply

```http
POST /api/bot/replies
Content-Type: application/json

{
  "conversationId": "abc123",
  "text": "Which Beat Saber version are you using?",
  "requestId": "run-98f2:abc123:message-1",
  "replyToMessageId": "optional-message-id",
  "botId": "bss-helper",
  "botName": "BSS Helper"
}
```

`conversationId`, `text`, and `requestId` are required. Keep `requestId` stable when retrying the same reply. The API returns the existing message with `"duplicate": true` instead of adding it again. A new reply returns HTTP 201. A retry returns HTTP 200.

Bot replies appear as support messages in the visitor's live chat. They also use the existing Discord notification path when it is configured.

The full machine-readable contract is in [openapi.yaml](./openapi.yaml).

## Suggested bot loop

1. Poll the inbox.
2. Read each returned conversation.
3. Generate a reply from the visible history and wiki knowledge.
4. Send the reply with a stable request ID.
5. Do not reply when the latest message is already from support.

Use a short polling interval with backoff after empty responses. Treat HTTP 401 as a bad key, 404 as a chat that no longer exists, and 503 as a missing Worker secret.
