CHAT_API_BASE = "https://bsm-api.sm0ke.org"
DISCORD_BRIDGE_KEY = "REPLACE_WITH_DISCORD_BRIDGE_KEY"
SUCCESS_REACTION = "✅"
FAIL_REACTION = "⚠️"


def build_outbound_text():
    base = str(message.content or "").strip()
    attachment_urls = []
    for attachment in (message.attachments or []):
        url = attachment.url
        if url:
            attachment_urls.append(str(url))

    if not attachment_urls:
        return base

    suffix = "\n".join(attachment_urls)
    return f"{base}\n{suffix}".strip() if base else suffix


async def bridge_thread_message():
    async def temp_react(emoji):
        await react(emoji)
        await asyncio.sleep(10)
        await remove_reaction(emoji)

    if author.bot:
        return

    channel_info = await get_channel_info()
    if not channel_info or str(channel_info.get("parent_id") or "") != "1441397893570232411":
        return

    thread_id = str(channel_info.get("id") or "")
    message_id = str(message.id or "")
    text = build_outbound_text()
    clean_base = CHAT_API_BASE.rstrip("/")
    if not thread_id or not message_id or not text:
        return
    if not clean_base or DISCORD_BRIDGE_KEY == "REPLACE_WITH_DISCORD_BRIDGE_KEY":
        await temp_react(FAIL_REACTION)
        return

    avatar = ""
    display_avatar = author.display_avatar
    if display_avatar is not None:
        avatar = str(display_avatar.url or "")

    payload = {
        "threadId": thread_id,
        "messageId": message_id,
        "senderId": str(author.id),
        "senderName": author.display_name or str(author),
        "senderAvatar": avatar,
        "text": text,
    }
    result = await http_request(
        f"{clean_base}/api/discord/replies",
        method="POST",
        headers={
            "Authorization": f"Bearer {DISCORD_BRIDGE_KEY}",
            "Content-Type": "application/json",
        },
        json_body=payload,
        timeout=20,
    )

    if result is not None and result.get("ok"):
        await temp_react(SUCCESS_REACTION)
        return

    status = result.get("status") if result is not None else 0
    if status == 404:
        return
    await temp_react(FAIL_REACTION)


__script_async_entry__ = bridge_thread_message()
