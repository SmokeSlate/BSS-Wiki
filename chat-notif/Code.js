function doPost(e) { doGet(e) }

function doGet(e) {
  if (!isAuthorized(e)) {
    return ContentService.createTextOutput("failed").setMimeType(ContentService.MimeType.TEXT)
  }
  const payload = parsePayload(e)
  if (!payload || !payload.text) {
    return ContentService.createTextOutput("failed").setMimeType(ContentService.MimeType.TEXT)
  }
  const silent = Boolean(payload.silent) || payload.senderId == "support" || payload.role == "support"
  message(
    payload.text,
    payload.senderName /*+ " (" + payload.senderId + ")"*/,
    payload.senderAvatar,
    silent
  )
  return ContentService.createTextOutput("success").setMimeType(ContentService.MimeType.TEXT)
}

function isAuthorized(e) {
  const authKey = PropertiesService.getScriptProperties().getProperty('authKey')
  return Boolean(e && e.queryString && e.queryString == authKey)
}

function parsePayload(e) {
  const raw = e && e.postData && e.postData.contents ? e.postData.contents : ""
  if (!raw) {
    return null
  }
  let data = {}
  try {
    data = JSON.parse(raw)
  } catch (error) {
    return null
  }

  const legacy = data && data.data && data.data.message && data.data.message.data
  if (legacy && legacy.entities && legacy.entities.sender && legacy.entities.sender.entity) {
    const sender = legacy.entities.sender.entity
    return {
      text: legacy.text || "",
      senderName: sender.name || "Support Bot",
      senderAvatar: sender.avatar || "https://wiki.sm0ke.org/assets/logo.png",
      senderId: sender.uid || "",
      role: legacy.role || ""
    }
  }

  const message = typeof data.message === "object" && data.message ? data.message : data
  return {
    text: message.text || message.content || message.message || "",
    senderName: message.senderName || message.name || "Support Bot",
    senderAvatar: message.senderAvatar || message.avatar || "https://wiki.sm0ke.org/assets/logo.png",
    senderId: message.senderId || message.uid || "",
    role: message.role || "",
    silent: message.silent || false
  }
}

function message(message, name = "Support Bot", avatar = "https://wiki.sm0ke.org/assets/logo.png", silent = false) {
  const payloads = silent ? JSON.stringify({ content: message, username: name, avatar_url: avatar, flags: 4096 }) : JSON.stringify({ content: message, username: name, avatar_url: avatar })
  UrlFetchApp.fetch(PropertiesService.getScriptProperties().getProperty('webhook'), {
    method: "post",
    contentType: "application/json",
    payload: payloads
  });
}
