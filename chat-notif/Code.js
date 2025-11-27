function doPost(e) {doGet(e)}

function doGet(e) {
  if (e.queryString != PropertiesService.getScriptProperties().getProperty('authKey')) return ContentService.createTextOutput("failed").setMimeType(ContentService.MimeType.TEXT)
  const messageData = JSON.parse(e.postData.contents).data.message.data;
  const messageSender = messageData.entities.sender.entity;
  const silent = messageSender.uid == "support";
  message(
    messageData.text,
    messageSender.name /*+ " (" + messageSender.uid + ")"*/,
    messageSender.avatar,
    silent
  )
  return ContentService.createTextOutput("success").setMimeType(ContentService.MimeType.TEXT)
}

function message(message, name = "Support Bot", avatar = "https://wiki.sm0ke.org/assets/logo.png", silent = false) {
  const payloads = silent ? JSON.stringify({ content: message, username: name, avatar_url: avatar, flags: 4096 }) : JSON.stringify({ content: message, username: name, avatar_url: avatar })
  UrlFetchApp.fetch(PropertiesService.getScriptProperties().getProperty('webhook'), {
    method: "post",
    contentType: "application/json",
    payload: payloads
  });
}