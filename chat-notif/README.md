# Discord support bridge

The support chat sends Discord work through the hosted SmokeBot API. It does not use a webhook, and the Worker never stores the Discord bot token.

When a visitor sends the first web message, the Worker posts a short information message in the configured support channel, creates a public thread from that message, and posts the visitor's message inside the thread. Later web messages use the saved thread ID.

`smokebotreply.py` is a hosted SmokeBot `message_all` script trigger. It sends human messages from managed Discord threads back to the matching web chat. It checks the thread's parent channel before making an HTTP request, and the Worker rejects thread IDs that are not mapped to a web conversation.

## Discord bot permissions

The bot needs these permissions in the support channel:

- View Channel
- Send Messages
- Create Public Threads
- Send Messages in Threads
- Read Message History

Enable the Message Content intent for SmokeBot so the script trigger can read staff replies and attachments.

## Worker configuration

Set these values in Cloudflare before deploying:

```sh
npx wrangler secret put DISCORD_BRIDGE_KEY
```

Set `SMOKEBOT_API_URL` as a Worker variable. `DISCORD_BRIDGE_KEY` must be a separate random secret shared only with SmokeBot. SmokeBot itself owns the Discord token and support-channel ID.

Create the trigger at [bot.sm0ke.org/scripts](https://bot.sm0ke.org/scripts/) with these settings:

- Name: `wiki-support-chat`
- Event: `message_all`
- Pattern: empty
- Match type: `contains`
- Allowed channels: empty, because each conversation creates a new thread
- Enabled: yes

Paste the script into the editor and replace its bridge-key placeholder there. Keep the checked-in placeholder unchanged so the key does not enter Git history.

After deployment, delete the retired `DISCORD_WEBHOOK_URL` Worker secret.
