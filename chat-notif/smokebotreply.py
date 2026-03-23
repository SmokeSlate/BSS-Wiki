CHAT_API_BASE = "https://bsm-api.sm0ke.org"
ADMIN_KEY = "2cbde912cd3bc69f2a82e4e39e592bdce5d18aafab71d24ab493ba5893a5b550"
SUCCESS_REACTION = "✅"
FAIL_REACTION = "⚠️"
META_PATTERN = r"(?is)(?:^|\r?\n)\s*(?:-#\s*)?bss-chat\s+conversation=(\S+)\s+message=(\S+)(?:\s+role=(\S+))?(?=\s*$|\r?\n)"


def strip_metadata(text):
    return re.sub(META_PATTERN, "", str(text or "")).strip()


def extract_metadata(text):
    match = re.search(META_PATTERN, str(text or ""))
    if not match:
        return None

    return {
        "conversation_id": match.group(1),
        "message_id": match.group(2),
        "role": match.group(3) or "user",
    }


def build_metadata_line(conversation_id, message_id, role="support"):
    return f"-# bss-chat conversation={conversation_id} message={message_id} role={role}"


def build_outbound_text():
    base = strip_metadata(message.content or "")
    attachment_urls = []
    for attachment in (message.attachments or []):
        url = attachment.url
        if not url:
            continue
        attachment_urls.append(str(url))

    if attachment_urls:
        suffix = "\n".join(attachment_urls)
        if base:
            return f"{base}\n{suffix}".strip()
        return suffix

    return base


async def bridge_reply():
    async def temp_react(emoji):
        await react(emoji)
        await asyncio.sleep(10)
        await remove_reaction(emoji)

    async def succeed_bridge():
        await react(SUCCESS_REACTION)
        await asyncio.sleep(10)
        await remove_reaction(SUCCESS_REACTION)

    async def fail_bridge():
        await temp_react(FAIL_REACTION)

    if author.bot:
        return

    if not referenced_message:
        return

    reference_content = str(referenced_message.content or "")
    metadata = extract_metadata(reference_content)
    if not metadata:
        return

    text = build_outbound_text()
    if not text:
        await fail_bridge()
        return

    clean_base = CHAT_API_BASE.rstrip("/")
    if not clean_base or ADMIN_KEY == "REPLACE_WITH_CHAT_ADMIN_KEY":
        await fail_bridge()
        return

    avatar = ""
    display_avatar = author.display_avatar
    if display_avatar is not None:
        avatar = str(display_avatar.url or "")

    payload = {
        "conversationId": metadata["conversation_id"],
        "senderId": f"discord:{author.id}",
        "senderName": author.display_name or str(author),
        "senderAvatar": avatar,
        "role": "support",
        "text": text,
        "skipWebhook": True,
    }
    headers = {
        "Content-Type": "application/json",
        "X-Admin-Key": ADMIN_KEY,
    }

    result = await http_request(
        f"{clean_base}/api/messages",
        method="POST",
        headers=headers,
        json_body=payload,
        timeout=20,
    )

    if not result.get("ok"):
        await fail_bridge()
        return

    await succeed_bridge()


__script_async_entry__ = bridge_reply
