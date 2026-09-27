const MAX_MESSAGES = 200;
const MAX_MESSAGE_LENGTH = 8000;
const MAX_BOT_INBOX_LIMIT = 100;
const MAX_REQUEST_ID_LENGTH = 128;
const PRESENCE_TTL_MS = 120000;
const ALLTHEPICS_UPLOAD_URL = "https://allthepics.net/api/1/upload";
const DISCORD_MESSAGE_LENGTH = 2000;

const DEFAULT_SNIPPETS = {
  wiki: {
    content:
      "## Beat Saber Standalone Modding Wiki!\n*Look at tutorials, resources and more at*\n**<https://wiki.sm0ke.org>**\n-# You can use `!wiki` to show this message",
    dynamic: false,
  },
  crgen: {
    content:
      "**CrashReporter AutoConfig**\n> Download this for the version your on:\n> **http://bsquest.xyz/crgen/crgen.html?usr={1}**\n> Then check for crashes here:\n> **https://analyzer.questmodding.com/crashes?userId={1}**",
    dynamic: true,
  },
  bsv: {
    content: "**Youtube video tutorial: *https://www.youtube.com/watch?v=44cTnUTbGaM***",
    dynamic: false,
  },
  help: {
    content:
      "-# **|| ||**\n# Support Macros\n- `!crgen` makes a crash reporter auto config url\n    - **Requires** a username, eg: `!crgen SmokeSlate`\n- `!bsv` is the link to the Beat Saber Video\n- `!wiki` is the wiki url\n- `!faq` shows frequently asked questions\n- `!check` explains how to share logs and get an AI diagnosis\n- `!diag <code>` opens the AI diagnosis page for a shared log\n- `!help` shows this\n\n\n> **Tip:** if you reply to a message, it will ping the author of the message.\n-# You can see this message with `!help`",
    dynamic: false,
  },
  faq: {
    content:
      "If you're having problems:\n# Frequently asked Questions \n**Q: How can I mod without a computer or phone?\nA: Use my tutorial!** Send a message with `!bsv` to get a link.\n\nQ: `Mobile VR Station` is missing scoped storage actions!\nA: Try uninstalling and reinstalling it. [Read this for more info.](<https://wiki.sm0ke.org/#/quest?id=_2-installing-and-updating-mvrs>)\n\nQ: Do I lose any purchased tracks when I uninstall Beat Saber / mod the game?\nA: No, you keep all purchased items when modding, but you can't play songs introduced in the version after the one you downgrade to.\n\nQ: Go to settings isn't working.\nA: Use [Quest Settings Opener](<https://github.com/SmokeSlate/QuestDevSettings/releases/download/2.0/OpenSettings.apk>). [Steps on how here.](<https://wiki.sm0ke.org/#/quest?id=_5-using-dev-tools-opener-to-enable-developer-mode>)\n\nQ: Does it work with multiple accounts?\nA: There is *limited to **no*** support with multiple accounts.\n\nQ: **I can't find `VR Android File Manager`!**\nA: Download `Mobile VR Station` and go to your library, click on the `...` and then `Settings` then `Release Channels` then select the one that is not selected (NOT `live`) and then click `Confirm`. Go back to your library and click the `...` again and then click `Update`. Once updated open the app navigate to `All Folders > Android > data` then click on `Scoped Actions` then `Request Permission`. Then install your apks.\n\n\n### Troubleshooting\n**Try this:**\n- Do you have multiple accounts?\n- Are you on the latest version?\n- Have you tried restarting your headset?\n- Did you uninstall \u2192 reinstall Beat Saber?\n- What have you done so far/when did it break?\n- **Take screenshots of what\u2019s wrong or errors!** this helps us diagnose.\n-# Send this with `!faq`",
    dynamic: false,
  },
  macro: {
    content:
      "** **\n# Support Macros\n- `!crgen` makes a crash reporter auto config url\n    - **Requires** a username, eg: `!crgen SmokeSlate`\n- `!bsv` is the link to the Beat Saber Video\n- `!wiki` is the wiki url\n- `!faq` shows frequently asked questions\n- `!check` explains how to share logs and get an AI diagnosis\n- `!diag <code>` opens the AI diagnosis page for a shared log\n- `!macro` shows this\n\n\n> **Tip:** if you reply to a message, it will ping the author of the message.\n-# You can see this message with `!macro`",
    dynamic: false,
  },
  h: {
    content:
      "** **\n# Support Macros\n- `!crgen` makes a crash reporter auto config url\n    - **Requires** a username, eg: `!crgen SmokeSlate`\n- `!bsv` is the link to the Beat Saber Video\n- `!wiki` is the wiki url\n- `!faq` shows frequently asked questions\n- `!check` explains how to share logs and get an AI diagnosis\n- `!diag <code>` opens the AI diagnosis page for a shared log\n- `!h` shows this\n\n\n> **Tip:** if you reply to a message, it will ping the author of the message.\n-# You can see this message with `!h`",
    dynamic: false,
  },
  mvrs: {
    content: "Use: https://www.youtube.com/watch?v=XykK278Lhfs",
    dynamic: false,
  },
  "1.37": {
    content:
      "**Downgrading to 1.37**\n**Make sure you have Beat Saber installed**, in your library, click the `\u2026` and then click `Settings`. In settings click `Release channels` and select 1.37, then click `Done` and mod like in the tutorial. Once done go back to release channels and go back to default, just don\u2019t update.\n-# You can see this with `!1.37`.",
    dynamic: false,
  },
  gts: {
    content:
      "**Download [OpenSettings.apk](https://github.com/SmokeSlate/QuestDevSettings/releases/download/2.0/OpenSettings.apk)** and click \u201cOpen Settings\u201d then \u201cOpen\u201d then you can follow the tutorial\n-# You can use `!gts` to see this",
    dynamic: false,
  },
  csabers: {
    content:
      "**Custom Sabers**\nTo get custom sabers make sure to:\n### 1.40+\n> Download `Custom Models` inside MBF\n### 1.37\n> Qosmetics is broken due to a dependency update. It will not be fixed. Upgrade to 1.40.8 or purchase Reesabers through the BeatLeader patreon if you want custom sabers on 1.37.\n> You can find ReeSabers at <https://patreon.com/beatleader>\n\n\nAnd to install custom sabers in MBF Launcher: **<https://youtu.be/08r6Llfiugo>**\n> *Make sure to have `CX File Explorer` bundled in https://bsmd.sm0ke.org/ !*\n\nFind sabers at: **https://questsaber.com**\n-# You can see this with: `!csabers`",
    dynamic: false,
  },
  dg: {
    content:
      "**Downgrading to different versions**\n### Normally with MBF (Launcher)\nWhen you are unmodded, (you can unmod by uninstalling and reinstalling Beat Saber) open MBF and (after setup) it should have a `Mod my Game` button. There should be some blue text saying `Select Version`, click that and select your version and click `Confirm Downgrade`. Then mod like normal\n\n### If that doesn't work\n**Make sure you have Beat Saber installed**, in your library, click the `\u2026` and then click `Settings`. In settings click `Release channels` and select 1.37, then click `Done` and then you can follow the directions above. \nOnce done go back to release channels and go back to default, just don\u2019t update.\n-# You can see this with `!dg`.",
    dynamic: false,
  },
  t: {
    content:
      "{1} {2} {3} {4} {5} {6} {7} {8} {9} {10} {11} {12} {13} {14} {15} {16} {17} {18} {19} {20} {21} {22} {23} {24} {25} {26} {27} {28} {29} {30} {31} {32} {33} {34} {35} {36} {37} {38} {39} {40} {41} {42} {43} {44} {45} {46} {47} {48} {49} {50} {51} {52} {53} {54} {55} {56} {57} {58} {59} {60} {61} {62} {63} {64} {65} {66} {67} {68} {69} {70} {71} {72} {73} {74} {75} {76} {77} {78} {79} {80} {81} {82} {83} {84} {85} {86} {87} {88} {89} {90} {91} {92} {93} {94} {95} {96} {97} {98} {99} {100} {101} {102} {103} {104} {105} {106} {107} {108} {109} {110} {111} {112} {113} {114} {115} {116} {117} {118} {119} {120} {121} {122} {123} {124} {125} {126} {127} {128} {129} {130} {131} {132} {133} {134} {135} {136} {137} {138} {139} {140} {141} {142} {143} {144} {145} {146} {147} {148} {149} {150} {151} {152} {153} {154} {155} {156} {157} {158} {159} {160} {161} {162} {163} {164} {165} {166} {167} {168} {169} {170} {171} {172} {173} {174} {175} {176} {177} {178} {179} {180} {181} {182} {183} {184} {185} {186} {187} {188} {189} {190} {191} {192} {193} {194} {195} {196} {197} {198} {199} {200} {201} {202} {203} {204} {205} {206} {207} {208} {209} {210} {211} {212} {213} {214} {215} {216} {217} {218} {219} {220} {221} {222} {223} {224} {225} {226} {227} {228} {229} {230} {231} {232} {233} {234} {235} {236} {237} {238} {239} {240} {241} {242} {243} {244} {245} {246} {247} {248} {249} {250} {251} {252} {253} {254} {255} {256} {257} {258} {259} {260} {261} {262} {263} {264} {265} {266} {267} {268} {269} {270} {271} {272} {273} {274} {275} {276} {277} {278} {279} {280} {281} {282} {283} {284} {285} {286} {287} {288} {289} {290} {291} {292} {293} {294} {295} {296} {297} {298} {299} {300} {301} {302} {303} {304} {305} {306} {307} {308} {309} {310} {311} {312} {313} {314} {315} {316} {317} {318} {319} {320} {321} {322} {323} {324} {325} {326} {327} {328} {329} {330} {331} {332} {333} {334} {335} {336} {337} {338} {339} {340} {341} {342} {343} {344} {345} {346} {347} {348} {349} {350} {351} {352} {353} {354} {355} {356} {357} {358} {359} {360} {361} {362} {363} {364} {365} {366} {367} {368} {369} {370} {371} {372} {373} {374} {375} {376} {377} {378} {379} {380} {381} {382} {383} {384} {385} {386} {387} {388} {389} {390} {391} {392} {393} {394} {395} {396} {397} {398} {399} {400} {401} {402} {403} {404} {405} {406} {407} {408} {409} {410} {411} {412} {413} {414} {415} {416} {417} {418} {419} {420} {421} {422} {423} {424} {425} {426} {427} {428} {429} {430} {431} {432} {433} {434} {435} {436} {437} {438} {439} {440} {441} {442} {443} {444} {445} {446} {447} {448} {449} {450} {451} {452} {453} {454} {455} {456} {457} {458} {459} {460} {461} {462} {463} {464} {465} {466} {467} {468} {469} {470} {471} {472} {473} {474} {475} {476} {477} {478} {479} {480} {481} {482} {483} {484} {485} {486} {487} {488} {489} {490} {491} {492} {493} {494} {495} {496} {497} {498} {499} {500}",
    dynamic: true,
  },
  diag: {
    content:
      "**AI Diagnosis — code `{1}`**\n> https://wiki.sm0ke.org/fix?log={1}\nOpen that link to see a full AI diagnosis of your logs.\n-# You can use `!diag <code>` to show this",
    dynamic: true,
  },
  check: {
    content:
      "**How to get an AI diagnosis of your setup:**\n1. Open **MBF Tools** on your Quest\n2. Tap **Share Debug Logs** on the home screen\n3. A code will appear (like `abc12`) — copy it\n4. Come back here and type `!diag <code>`\n   — or visit **https://wiki.sm0ke.org/fix?log=<code>** directly for the full AI analysis\n-# You can use `!check` to show this",
    dynamic: false,
  },
  mbfli: {
    content: "File an issue here: https://github.com/DanTheMan827/mbf-launcher",
    dynamic: false,
  },
  importmbf: {
    content:
      "**To open files in MBF Launcher: <https://youtu.be/08r6Llfiugo>**\n*Make sure to have `CX File Explorer` bundled in https://bsmd.sm0ke.org!*\n-# You can see this with: `!importmbf`.",
    dynamic: false,
  },
  sc: {
    content: "{ping} **Please include a screenshot of what\u2019s wrong!**",
    dynamic: false,
  },
  ost8: {
    content:
      "## OST 8 is out!\nThe thing is, **you *must* unmod to play it**.\n**Instructions:**\n> 1. Open MBF Launcher.\n> 2. Click on the \u2699\ufe0f icon. (between the `Your Mods` and `Add Mods`)\n> 3. Click `Uninstall Beat Saber`.\n> 4. Close MBF Launcher and open your app library.\n> 5. Go to all and redownload Beat Saber.\n> 6. That's it, you are now unmodded and have OST8.\n-# You can use `!ost8` to see this.",
    dynamic: false,
  },
  unmod: {
    content:
      "## **Uninstall Mods Instructions:**\n> 1. Open MBF Launcher.\n> 2. Click on the \u2699\ufe0f icon. (between the `Your Mods` and `Add Mods`)\n> 3. Click `Uninstall Beat Saber`.\n> 4. Close MBF Launcher and open your app library.\n> 5. Go to all and redownload Beat Saber.\n> 6. That's it, you are now unmodded\n-# You can use `!unmod` to see this.",
    dynamic: false,
  },
  vchange: {
    content:
      "## Swap Versions\nNeed to swap versions to get custom sabers or play certain mods? Follow this!\n**Instructions:**\n> 1. Open MBF Launcher.\n> 2. Click on the \u2699\ufe0f icon. (between the `Your Mods` and `Add Mods`)\n> 3. Click `Uninstall Beat Saber`.\n> 4. Close MBF Launcher and open your app library.\n> 5. Go to all and redownload Beat Saber.\n> 6. Open MBF Launcher and click `Select Version`(not exactly the text).\n> 7. Select Use Latest Moddable for 1.40.8 (as of now) or any other version.\n> 8. Select `Confirm Downgrade` and then `Mod My App`.\n> 9. Continue like normal.\n-# You can use `!vchange` to see this.",
    dynamic: false,
  },
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request, env),
      });
    }

    try {
      if (path === "/api/health" && request.method === "GET") {
        return jsonResponse({ ok: true }, 200, request, env);
      }

      if (path === "/api/conversations" && request.method === "GET") {
        requireAdmin(request, env);
        const conversations = await listConversations(env);
        return jsonResponse({ conversations }, 200, request, env);
      }

      if (path === "/api/bot/inbox" && request.method === "GET") {
        return await handleBotInbox(request, env);
      }

      const botConversationMatch = path.match(/^\/api\/bot\/conversations\/([^/]+)$/);
      if (botConversationMatch && request.method === "GET") {
        return await handleBotConversation(request, env, decodeURIComponent(botConversationMatch[1]));
      }

      if (path === "/api/bot/replies" && request.method === "POST") {
        return await handleBotReply(request, env, ctx);
      }

      if (path === "/api/discord/replies" && request.method === "POST") {
        return await handleDiscordReply(request, env);
      }

      if (path === "/api/messages" && request.method === "GET") {
        return await handleGetMessages(request, env);
      }

      if (path === "/api/messages" && request.method === "POST") {
        return await handlePostMessage(request, env, ctx);
      }

      if (path === "/api/stream" && request.method === "GET") {
        return await handleStream(request, env);
      }

      if (path === "/api/messages" && request.method === "PATCH") {
        return await handlePatchMessage(request, env);
      }

      if (path === "/api/messages" && request.method === "DELETE") {
        return await handleDeleteMessage(request, env);
      }

      if (path === "/api/snippets" && request.method === "GET") {
        return await handleGetSnippets(request, env);
      }

      if (path === "/api/snippets" && request.method === "POST") {
        return await handlePostSnippet(request, env);
      }

      if (path === "/api/snippets" && request.method === "DELETE") {
        return await handleDeleteSnippet(request, env);
      }

      if (path === "/api/presence" && request.method === "GET") {
        return await handleGetPresence(request, env);
      }

      if (path === "/api/presence" && request.method === "POST") {
        return await handlePostPresence(request, env);
      }

      if (path === "/api/uploads" && request.method === "POST") {
        return await handleUpload(request, env);
      }

      return jsonResponse({ error: "Not found" }, 404, request, env);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const message =
        error instanceof HttpError
          ? error.message
          : error && error.message
            ? error.message
            : "Server error";
      if (!(error instanceof HttpError)) {
        console.error("Unhandled error", error);
      }
      return jsonResponse({ error: message }, status, request, env);
    }
  },
};

async function handleGetMessages(request, env) {
  ensureDb(env);
  const url = new URL(request.url);
  const conversationId = (url.searchParams.get("conversationId") || "").trim();

  if (!conversationId) {
    throw new HttpError(400, "conversationId required");
  }

  const isAdmin = isAdminRequest(request, env);
  const conversation = await readConversation(env, conversationId);
  if (!conversation) {
    return jsonResponse({ messages: [] }, 200, request, env);
  }
  if (!isAdmin) {
    const token =
      url.searchParams.get("token") ||
      request.headers.get("X-Client-Token") ||
      "";
    if (!conversation || !token || token !== conversation.token) {
      throw new HttpError(403, "Unauthorized");
    }
  }

  const afterParam = url.searchParams.get("after");
  let after = afterParam ? Number(afterParam) : 0;
  if (Number.isNaN(after) || after < 0) {
    after = 0;
  }

  const limitParam = url.searchParams.get("limit");
  let limit = limitParam ? Number(limitParam) : MAX_MESSAGES;
  if (Number.isNaN(limit) || limit <= 0) {
    limit = MAX_MESSAGES;
  }
  limit = Math.min(limit, MAX_MESSAGES);

  const messages = readMessagesFromJson(conversation.messagesJson, {
    after,
    limit,
    includeDeleted: isAdmin,
  });
  let filtered = messages;
  if (!isAdmin) {
    filtered = filtered
      .map((msg) => {
        const { originalText, deletedAt, deletedBy, ...rest } = msg;
        return rest;
      });
  }

  return jsonResponse({ messages: filtered }, 200, request, env);
}

async function handleStream(request, env) {
  ensureDb(env);
  const url = new URL(request.url);
  const conversationId = (url.searchParams.get("conversationId") || "").trim();
  if (!conversationId) {
    throw new HttpError(400, "conversationId required");
  }

  const isAdmin = isAdminRequest(request, env);
  const token =
    url.searchParams.get("token") ||
    request.headers.get("X-Client-Token") ||
    "";
  if (!isAdmin) {
    const meta = await readConversation(env, conversationId);
    if (!meta || !token || token !== meta.token) {
      throw new HttpError(403, "Unauthorized");
    }
  }

  const afterParam = url.searchParams.get("after");
  let lastMessageAt = afterParam ? Number(afterParam) : 0;
  if (Number.isNaN(lastMessageAt) || lastMessageAt < 0) {
    lastMessageAt = 0;
  }

  const encoder = new TextEncoder();
  let closed = false;
  let pollTimer = null;
  let heartbeatTimer = null;
  let idlePolls = 0;
  let inFlight = false;

  const write = (controller, payload) => {
    controller.enqueue(encoder.encode(payload));
  };

  const sendEvent = (controller, event, data) => {
    write(controller, `event: ${event}\n`);
    write(controller, `data: ${JSON.stringify(data)}\n\n`);
  };

  const sendComment = (controller, comment) => {
    write(controller, `: ${comment}\n\n`);
  };

  const schedulePoll = (controller) => {
    const delay = idlePolls > 2 ? 15000 : 5000;
    pollTimer = setTimeout(async () => {
      if (closed) {
        return;
      }
      if (inFlight) {
        schedulePoll(controller);
        return;
      }
      inFlight = true;
      try {
        const conversation = await readConversation(env, conversationId);
        if (!conversation) {
          idlePolls = Math.min(idlePolls + 1, 5);
          schedulePoll(controller);
          return;
        }
        const messages = readMessagesFromJson(conversation.messagesJson, {
          after: lastMessageAt,
          limit: MAX_MESSAGES,
          includeDeleted: isAdmin,
        });
        if (messages.length) {
          lastMessageAt = Math.max(
            lastMessageAt,
            ...messages.map((msg) => msg.createdAt || 0)
          );
          sendEvent(controller, "messages", { messages });
          idlePolls = 0;
        } else {
          idlePolls = Math.min(idlePolls + 1, 5);
        }
      } catch (error) {
        sendEvent(controller, "error", {
          error: error && error.message ? error.message : "Stream error",
        });
      } finally {
        inFlight = false;
        schedulePoll(controller);
      }
    }, delay);
  };

  const stream = new ReadableStream({
    start(controller) {
      write(controller, "retry: 5000\n\n");
      sendComment(controller, "connected");
      schedulePoll(controller);
      heartbeatTimer = setInterval(() => {
        if (!closed) {
          sendComment(controller, "ping");
        }
      }, 25000);
    },
    cancel() {
      closed = true;
      if (pollTimer) {
        clearTimeout(pollTimer);
      }
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders(request, env),
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

async function handleBotInbox(request, env) {
  await requireBot(request, env);
  ensureDb(env);
  const url = new URL(request.url);
  const limit = Math.min(
    parsePositiveInteger(url.searchParams.get("limit"), 25),
    MAX_BOT_INBOX_LIMIT
  );
  const result = await env.DB.prepare(
    `SELECT
      id,
      name,
      created_at as createdAt,
      last_message_at as lastMessageAt,
      last_message_preview as lastMessagePreview,
      last_message_sender_name as lastMessageSenderName
    FROM conversations
    WHERE last_message_role = 'user'
    ORDER BY last_message_at ASC, id ASC
    LIMIT ?`
  ).bind(limit + 1).all();
  const rows = result.results || [];
  const hasMore = rows.length > limit;
  const conversations = rows.slice(0, limit).map((row) => ({
    id: row.id,
    name: row.name || "",
    createdAt: row.createdAt || 0,
    lastMessageAt: row.lastMessageAt || 0,
    lastMessagePreview: row.lastMessagePreview || "",
    lastMessageSenderName: row.lastMessageSenderName || "",
  }));
  return jsonResponse({ conversations, hasMore }, 200, request, env);
}

async function handleBotConversation(request, env, conversationId) {
  await requireBot(request, env);
  ensureDb(env);
  if (!conversationId) {
    throw new HttpError(400, "conversationId required");
  }
  const conversation = await readConversation(env, conversationId);
  if (!conversation) {
    throw new HttpError(404, "Conversation not found");
  }
  const url = new URL(request.url);
  const limit = Math.min(
    parsePositiveInteger(url.searchParams.get("limit"), MAX_MESSAGES),
    MAX_MESSAGES
  );
  const visibleMessages = parseMessagesJson(conversation.messagesJson)
    .filter((message) => message.id && !message.deletedAt);
  const hasMore = visibleMessages.length > limit;
  const messages = hasMore ? visibleMessages.slice(-limit) : visibleMessages;
  return jsonResponse(
    {
      conversation: {
        id: conversation.id,
        name: conversation.name,
        createdAt: conversation.createdAt,
        lastMessageAt: conversation.lastMessageAt,
      },
      messages,
      hasMore,
    },
    200,
    request,
    env
  );
}

async function handleBotReply(request, env, ctx) {
  await requireBot(request, env);
  ensureDb(env);
  const payload = await readJson(request);
  const conversationId = stringField(payload.conversationId);
  const text = stringField(payload.text);
  const requestId = stringField(payload.requestId);
  const replyToMessageId = stringField(payload.replyToMessageId);
  const senderId = stringField(payload.botId) || "ai-support-bot";
  const senderName = stringField(payload.botName) || "AI Support";

  if (!conversationId || !text || !requestId) {
    throw new HttpError(400, "conversationId, text, and requestId are required");
  }
  if (text.length > MAX_MESSAGE_LENGTH) {
    throw new HttpError(400, `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer`);
  }
  if (requestId.length > MAX_REQUEST_ID_LENGTH) {
    throw new HttpError(400, `requestId must be ${MAX_REQUEST_ID_LENGTH} characters or fewer`);
  }

  const conversation = await readConversation(env, conversationId);
  if (!conversation) {
    throw new HttpError(404, "Conversation not found");
  }
  const result = await appendConversationMessage(env, {
    conversation,
    conversationId,
    senderId,
    senderName,
    text,
    role: "support",
    clientToken: conversation.token,
    replyToMessageId,
    requestId,
  });
  if (!result.duplicate) {
    relayMessageToDiscord(result.message, env, ctx);
  }
  return jsonResponse(
    { ok: true, duplicate: result.duplicate, message: result.message },
    result.duplicate ? 200 : 201,
    request,
    env
  );
}

async function handlePostMessage(request, env, ctx) {
  ensureDb(env);
  const payload = await readJson(request);
  const conversationId = (payload.conversationId || "").trim();
  const senderId = (payload.senderId || "").trim();
  const senderName = (payload.senderName || "Guest").trim() || "Guest";
  const rawText = typeof payload.text === "string" ? payload.text.trim() : "";
  const role = (payload.role || "user").trim();

  if (!conversationId || !senderId || !rawText) {
    throw new HttpError(400, "Missing fields");
  }
  if (rawText.length > MAX_MESSAGE_LENGTH) {
    throw new HttpError(400, `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer`);
  }

  if (role === "support") {
    requireAdmin(request, env);
  }

  const resolvedText = await resolveSnippetText(rawText, {
    env,
    isAdmin: isAdminRequest(request, env),
    role,
    senderId,
    senderName,
  });
  const text = resolvedText.trim();
  if (!text) {
    throw new HttpError(400, "Message empty");
  }

  const conversation = await readConversation(env, conversationId);

  const providedToken = payload.clientToken || request.headers.get("X-Client-Token") || "";
  if (conversation && role !== "support") {
    if (!providedToken || providedToken !== conversation.token) {
      throw new HttpError(403, "Unauthorized");
    }
  }
  const result = await appendConversationMessage(env, {
    conversation,
    conversationId,
    senderId,
    senderName,
    text,
    role,
    clientToken: providedToken,
  });

  relayMessageToDiscord(result.message, env, ctx);

  return jsonResponse(
    { ok: true, message: result.message, clientToken: result.clientToken },
    200,
    request,
    env
  );
}

async function handleDiscordReply(request, env) {
  await requireDiscordBridge(request, env);
  ensureDb(env);
  const payload = await readJson(request);
  const threadId = stringField(payload.threadId);
  const discordMessageId = stringField(payload.messageId);
  const text = stringField(payload.text);
  const senderId = stringField(payload.senderId);
  const senderName = stringField(payload.senderName) || "Discord support";

  if (!threadId || !discordMessageId || !text || !senderId) {
    throw new HttpError(400, "threadId, messageId, senderId, and text are required");
  }
  if (text.length > MAX_MESSAGE_LENGTH) {
    throw new HttpError(400, `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer`);
  }

  const conversation = await readConversationByDiscordThread(env, threadId);
  if (!conversation) {
    return jsonResponse({ ok: false, managed: false, error: "Discord thread is not managed by the support chat" }, 404, request, env);
  }

  const result = await appendConversationMessage(env, {
    conversation,
    conversationId: conversation.id,
    senderId: `discord:${senderId}`,
    senderName,
    text,
    role: "support",
    clientToken: conversation.token,
    requestId: `discord:${discordMessageId}`,
  });

  return jsonResponse(
    { ok: true, managed: true, duplicate: result.duplicate, message: result.message },
    result.duplicate ? 200 : 201,
    request,
    env
  );
}

async function appendConversationMessage(env, input) {
  const conversation = input.conversation || await readConversation(env, input.conversationId);
  const messages = parseMessagesJson(conversation?.messagesJson);

  if (input.requestId) {
    const existing = messages.find((message) => message.requestId === input.requestId);
    if (existing) {
      return {
        message: existing,
        clientToken: conversation?.token || "",
        duplicate: true,
      };
    }
  }

  if (input.replyToMessageId) {
    const target = messages.find(
      (message) => message.id === input.replyToMessageId && !message.deletedAt
    );
    if (!target) {
      throw new HttpError(400, "replyToMessageId does not match a visible message");
    }
  }

  const now = Date.now();
  const clientToken = conversation?.token || input.clientToken || generateToken();
  const message = {
    id: crypto.randomUUID(),
    conversationId: input.conversationId,
    senderId: input.senderId,
    senderName: input.senderName,
    text: input.text,
    role: input.role,
    createdAt: now,
    ...(input.replyToMessageId ? { replyToMessageId: input.replyToMessageId } : {}),
    ...(input.requestId ? { requestId: input.requestId } : {}),
  };

  messages.push(message);
  const trimmed = messages.length > MAX_MESSAGES ? messages.slice(-MAX_MESSAGES) : messages;
  const conversationName = conversation?.name || input.senderName || `Guest ${input.conversationId}`;
  await env.DB.prepare(
    `INSERT INTO conversations (
      id,
      name,
      created_at,
      last_message_at,
      last_message_preview,
      last_message_role,
      last_message_sender_name,
      token,
      messages_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = COALESCE(NULLIF(conversations.name, ''), excluded.name),
      last_message_at = excluded.last_message_at,
      last_message_preview = excluded.last_message_preview,
      last_message_role = excluded.last_message_role,
      last_message_sender_name = excluded.last_message_sender_name,
      token = COALESCE(conversations.token, excluded.token),
      messages_json = excluded.messages_json`
  ).bind(
    input.conversationId,
    conversationName,
    now,
    now,
    previewText(input.text),
    input.role,
    input.senderName,
    clientToken,
    JSON.stringify(trimmed)
  ).run();

  return { message, clientToken, duplicate: false };
}

async function handlePatchMessage(request, env) {
  ensureDb(env);
  const payload = await readJson(request);
  const url = new URL(request.url);
  const conversationId = (payload.conversationId || url.searchParams.get("conversationId") || "").trim();
  const messageId = (payload.messageId || payload.id || url.searchParams.get("messageId") || url.searchParams.get("id") || "").trim();
  const text =
    typeof payload.text === "string"
      ? payload.text.trim()
      : (url.searchParams.get("text") || "").trim();
  const senderId = (payload.senderId || url.searchParams.get("senderId") || "").trim();

  if (!conversationId || !messageId || !text) {
    throw new HttpError(400, "Missing fields");
  }

  const isAdmin = isAdminRequest(request, env);
  const token =
    payload.clientToken ||
    request.headers.get("X-Client-Token") ||
    new URL(request.url).searchParams.get("token") ||
    "";

  const conversation = await readConversation(env, conversationId);
  if (!conversation) {
    throw new HttpError(404, "Conversation not found");
  }

  if (!isAdmin) {
    if (!token || token !== conversation.token) {
      throw new HttpError(403, "Unauthorized");
    }
  }

  const messages = parseMessagesJson(conversation.messagesJson);
  const index = messages.findIndex((item) => item.id === messageId);
  if (index === -1) {
    throw new HttpError(404, "Message not found");
  }
  const message = messages[index];
  if (!isAdmin) {
    if (!senderId || senderId !== message.senderId || message.role === "support") {
      throw new HttpError(403, "Unauthorized");
    }
    if (message.deletedAt) {
      throw new HttpError(409, "Message deleted");
    }
  }

  const now = Date.now();
  const editedBy = isAdmin ? "admin" : senderId;
  const updated = {
    ...message,
    text,
    editedAt: now,
    editedBy,
  };
  if (!message.originalText && message.text !== text) {
    updated.originalText = message.text;
  }
  messages[index] = updated;
  const lastVisible = getLastVisibleMessage(messages);
  await updateConversationRecord(env, conversationId, messages, lastVisible);

  return jsonResponse({ ok: true, message: updated }, 200, request, env);
}

async function handleDeleteMessage(request, env) {
  ensureDb(env);
  const payload = await readJson(request);
  const url = new URL(request.url);
  const conversationId = (payload.conversationId || url.searchParams.get("conversationId") || "").trim();
  const messageId = (payload.messageId || payload.id || url.searchParams.get("messageId") || url.searchParams.get("id") || "").trim();
  const senderId = (payload.senderId || url.searchParams.get("senderId") || "").trim();

  if (!conversationId || !messageId) {
    throw new HttpError(400, "Missing fields");
  }

  const isAdmin = isAdminRequest(request, env);
  const token =
    payload.clientToken ||
    request.headers.get("X-Client-Token") ||
    new URL(request.url).searchParams.get("token") ||
    "";

  const conversation = await readConversation(env, conversationId);
  if (!conversation) {
    throw new HttpError(404, "Conversation not found");
  }

  if (!isAdmin) {
    if (!token || token !== conversation.token) {
      throw new HttpError(403, "Unauthorized");
    }
  }

  const messages = parseMessagesJson(conversation.messagesJson);
  const index = messages.findIndex((item) => item.id === messageId);
  const target = index === -1 ? null : messages[index];
  if (!target) {
    throw new HttpError(404, "Message not found");
  }

  if (target.deletedAt) {
    const responseBody = isAdmin ? { ok: true, message: target } : { ok: true };
    return jsonResponse(responseBody, 200, request, env);
  }

  if (!isAdmin) {
    if (!senderId || senderId !== target.senderId || target.role === "support") {
      throw new HttpError(403, "Unauthorized");
    }
  }

  const now = Date.now();
  const deletedBy = isAdmin ? "admin" : senderId;
  const updated = {
    ...target,
    deletedAt: now,
    deletedBy,
  };
  if (!updated.originalText) {
    updated.originalText = target.originalText || target.text;
  }
  messages[index] = updated;
  const lastVisible = getLastVisibleMessage(messages);
  await updateConversationRecord(env, conversationId, messages, lastVisible);

  const responseBody = isAdmin ? { ok: true, message: updated } : { ok: true };
  return jsonResponse(responseBody, 200, request, env);
}

async function readJson(request) {
  const contentType = (request.headers.get("Content-Type") || "").toLowerCase();
  if (
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/x-www-form-urlencoded")
  ) {
    let formData;
    try {
      formData = await request.formData();
    } catch (error) {
      throw new HttpError(400, "Invalid form data");
    }
    const payload = {};
    for (const [key, value] of formData.entries()) {
      payload[key] = value;
    }
    return payload;
  }

  const raw = await request.text();
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new HttpError(400, "Invalid JSON");
  }
}

async function listConversations(env) {
  ensureDb(env);
  const query = `SELECT
      id,
      name,
      created_at as createdAt,
      last_message_at as lastMessageAt,
      last_message_preview as lastMessagePreview,
      last_message_role as lastMessageRole,
      last_message_sender_name as lastMessageSenderName
    FROM conversations
    ORDER BY last_message_at DESC`;
  const result = await env.DB.prepare(query).all();
  return (result.results || []).map((row) => ({
    id: row.id,
    name: row.name || "",
    createdAt: row.createdAt || 0,
    lastMessageAt: row.lastMessageAt || 0,
    lastMessagePreview: row.lastMessagePreview || "",
    lastMessageRole: row.lastMessageRole || "",
    lastMessageSenderName: row.lastMessageSenderName || "",
  }));
}

async function readConversation(env, conversationId) {
  ensureDb(env);
  const row = await env.DB.prepare(
    `SELECT
      id,
      name,
      created_at as createdAt,
      last_message_at as lastMessageAt,
      last_message_preview as lastMessagePreview,
      last_message_role as lastMessageRole,
      last_message_sender_name as lastMessageSenderName,
      token,
      messages_json as messagesJson,
      discord_thread_id as discordThreadId,
      discord_starter_message_id as discordStarterMessageId
    FROM conversations
    WHERE id = ?`
  ).bind(conversationId).first();
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    name: row.name || "",
    createdAt: row.createdAt || 0,
    lastMessageAt: row.lastMessageAt || 0,
    lastMessagePreview: row.lastMessagePreview || "",
    lastMessageRole: row.lastMessageRole || "",
    lastMessageSenderName: row.lastMessageSenderName || "",
    token: row.token || "",
    messagesJson: row.messagesJson || "[]",
    discordThreadId: row.discordThreadId || "",
    discordStarterMessageId: row.discordStarterMessageId || "",
  };
}

async function readConversationByDiscordThread(env, threadId) {
  ensureDb(env);
  const row = await env.DB.prepare(
    `SELECT id
      FROM conversations
      WHERE discord_thread_id = ?`
  ).bind(threadId).first();
  return row?.id ? readConversation(env, row.id) : null;
}

function parseMessagesJson(raw) {
  if (!raw) {
    return [];
  }
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data)
      ? data.map((msg) => normalizeMessage(msg)).filter(Boolean)
      : [];
  } catch (error) {
    return [];
  }
}

function normalizeMessage(message) {
  if (!message || typeof message !== "object") {
    return null;
  }
  return {
    id: message.id || "",
    conversationId: message.conversationId || "",
    senderId: message.senderId || "",
    senderName: message.senderName || "",
    text: message.text || "",
    role: message.role || "user",
    createdAt: message.createdAt || 0,
    editedAt: message.editedAt || null,
    editedBy: message.editedBy || "",
    deletedAt: message.deletedAt || null,
    deletedBy: message.deletedBy || "",
    originalText: message.originalText || "",
    replyToMessageId: message.replyToMessageId || "",
    requestId: message.requestId || "",
  };
}

function readMessagesFromJson(messagesJson, { after = 0, limit = MAX_MESSAGES, includeDeleted }) {
  const raw = parseMessagesJson(messagesJson).filter((item) => item && item.id);
  let messages = raw;
  if (!includeDeleted) {
    messages = messages.filter((msg) => !msg.deletedAt);
  }
  if (after) {
    messages = messages.filter((msg) => (msg.createdAt || 0) > after);
  }
  if (messages.length > limit) {
    messages = after ? messages.slice(0, limit) : messages.slice(-limit);
  }
  return messages;
}

function getLastVisibleMessage(messages) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (!messages[i].deletedAt) {
      return messages[i];
    }
  }
  return null;
}

async function updateConversationRecord(env, conversationId, messages, lastVisible) {
  const lastMessageAt = lastVisible ? lastVisible.createdAt || 0 : 0;
  const lastMessagePreview = lastVisible ? previewText(lastVisible.text || "") : "";
  const lastMessageRole = lastVisible ? lastVisible.role || "user" : "";
  const lastMessageSenderName = lastVisible ? lastVisible.senderName || "" : "";
  await env.DB.prepare(
    `UPDATE conversations
      SET last_message_at = ?,
          last_message_preview = ?,
          last_message_role = ?,
          last_message_sender_name = ?,
          messages_json = ?
      WHERE id = ?`
  ).bind(
    lastMessageAt,
    lastMessagePreview,
    lastMessageRole,
    lastMessageSenderName,
    JSON.stringify(messages),
    conversationId
  ).run();
}

function previewText(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= 80) {
    return normalized;
  }
  return normalized.slice(0, 77) + "...";
}

function generateToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

function ensureDb(env) {
  if (!env?.DB || typeof env.DB.prepare !== "function") {
    throw new HttpError(500, "Database unavailable");
  }
}

function stringField(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function verifySecret(provided, expected) {
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  return crypto.subtle.timingSafeEqual(providedHash, expectedHash);
}

async function requireBot(request, env) {
  const configured = stringField(env.BOT_API_KEY);
  if (!configured) {
    throw new HttpError(503, "Bot API not configured");
  }
  const authorization = request.headers.get("Authorization") || "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i);
  const provided = stringField(bearer?.[1]) || stringField(request.headers.get("X-Bot-Key"));
  if (!provided || !(await verifySecret(provided, configured))) {
    throw new HttpError(401, "Unauthorized");
  }
}

async function requireDiscordBridge(request, env) {
  const configured = stringField(env.DISCORD_BRIDGE_KEY);
  if (!configured) {
    throw new HttpError(503, "Discord bridge not configured");
  }
  const authorization = request.headers.get("Authorization") || "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i);
  const provided = stringField(bearer?.[1]);
  if (!provided || !(await verifySecret(provided, configured))) {
    throw new HttpError(401, "Unauthorized");
  }
}


function isAdminRequest(request, env) {
  if (!env.ADMIN_KEY) {
    return true;
  }
  const headerKey = request.headers.get("X-Admin-Key") || "";
  const url = new URL(request.url);
  const queryKey = url.searchParams.get("adminKey") || "";
  const provided = headerKey || queryKey;
  return provided && provided === env.ADMIN_KEY;
}

function requireAdmin(request, env) {
  if (!env.ADMIN_KEY) {
    return;
  }
  if (!isAdminRequest(request, env)) {
    throw new HttpError(403, "Unauthorized");
  }
}

function corsHeaders(request, env) {
  const configured = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => normalizeOriginPattern(item))
    .filter(Boolean);

  const origin = request.headers.get("Origin") || "";
  const hasWildcard = configured.includes("*");
  let allowOrigin = "*";
  if (configured.length && !hasWildcard) {
    const matched = origin
      ? configured.find((pattern) => originMatches(pattern, origin))
      : null;
    if (matched) {
      allowOrigin = origin;
    } else {
      allowOrigin = configured[0];
    }
  }

  const requestedHeaders = request.headers.get("Access-Control-Request-Headers");
  const headers = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      requestedHeaders || "Authorization, Content-Type, X-Admin-Key, X-Bot-Key, X-Client-Token",
    "Access-Control-Max-Age": "86400",
  };

  if (configured.length && !hasWildcard) {
    headers.Vary = "Origin";
  }
  if (requestedHeaders) {
    headers.Vary = headers.Vary
      ? `${headers.Vary}, Access-Control-Request-Headers`
      : "Access-Control-Request-Headers";
  }

  return headers;
}

function jsonResponse(data, status, request, env) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    ...corsHeaders(request, env),
  };
  return new Response(JSON.stringify(data), { status, headers });
}

async function handleGetSnippets(request, env) {
  requireAdmin(request, env);
  ensureDb(env);
  const snippets = await getSnippets(env);
  return jsonResponse({ snippets }, 200, request, env);
}

async function handlePostSnippet(request, env) {
  requireAdmin(request, env);
  ensureDb(env);
  const payload = await readJson(request);
  const key = normalizeSnippetKey(payload.key);
  const content = typeof payload.content === "string" ? payload.content : "";
  const dynamic = Boolean(payload.dynamic);
  if (!key || !content) {
    throw new HttpError(400, "Missing fields");
  }
  await env.DB.prepare(
    "INSERT INTO snippets (key, content, dynamic) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET content = excluded.content, dynamic = excluded.dynamic"
  ).bind(key, content, dynamic ? 1 : 0).run();
  const snippets = await getSnippets(env);
  return jsonResponse({ ok: true, snippets }, 200, request, env);
}

async function handleDeleteSnippet(request, env) {
  requireAdmin(request, env);
  ensureDb(env);
  const payload = await readJson(request);
  const key = normalizeSnippetKey(payload.key);
  if (!key) {
    throw new HttpError(400, "Missing fields");
  }
  await env.DB.prepare("DELETE FROM snippets WHERE key = ?").bind(key).run();
  const snippets = await getSnippets(env);
  return jsonResponse({ ok: true, snippets }, 200, request, env);
}

async function handleGetPresence(request, env) {
  ensureDb(env);
  const now = Date.now();
  const cutoff = now - PRESENCE_TTL_MS;
  await env.DB.prepare("DELETE FROM presence WHERE last_seen < ?").bind(cutoff).run();
  const result = await env.DB.prepare(
    "SELECT id, name, status, last_seen as lastSeen FROM presence WHERE last_seen >= ?"
  ).bind(cutoff).all();
  const entries = (result.results || []).map((row) => ({
    id: row.id,
    name: row.name || "Support",
    status: row.status || "online",
    lastSeen: row.lastSeen || 0,
  }));
  const active = entries.filter((item) => item.status === "online");
  if (!isAdminRequest(request, env)) {
    return jsonResponse({ online: active.length > 0, count: active.length }, 200, request, env);
  }
  return jsonResponse(
    { online: active.length > 0, count: active.length, agents: entries },
    200,
    request,
    env
  );
}

async function handlePostPresence(request, env) {
  requireAdmin(request, env);
  ensureDb(env);
  const payload = await readJson(request);
  const adminId = (payload.adminId || "").trim();
  const name = (payload.name || "Support").trim() || "Support";
  const status = (payload.status || "online").trim().toLowerCase();
  if (!adminId) {
    throw new HttpError(400, "Missing fields");
  }
  const now = Date.now();
  if (status === "offline") {
    await env.DB.prepare("DELETE FROM presence WHERE id = ?").bind(adminId).run();
  } else {
    await env.DB.prepare(
      "INSERT INTO presence (id, name, status, last_seen) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, status = excluded.status, last_seen = excluded.last_seen"
    ).bind(adminId, name, status, now).run();
  }
  return jsonResponse({ ok: true }, 200, request, env);
}

async function handleUpload(request, env) {
  const apiKey = (env.ALLTHEPICS_API_KEY || "").trim();
  if (!apiKey) {
    throw new HttpError(501, "Upload not configured");
  }

  let formData;
  try {
    formData = await request.formData();
  } catch (error) {
    throw new HttpError(400, "Invalid form data");
  }

  const source = formData.get("source") || formData.get("file") || formData.get("image");
  if (!source || typeof source === "string") {
    throw new HttpError(400, "Missing image");
  }

  const upstream = new FormData();
  upstream.append("source", source);
  upstream.append("key", apiKey);
  upstream.append("format", "json");

  const uploadUrl =
    (env.ALLTHEPICS_API_URL || ALLTHEPICS_UPLOAD_URL).trim() || ALLTHEPICS_UPLOAD_URL;
  const response = await fetch(uploadUrl, { method: "POST", body: upstream });
  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      data = {};
    }
  }

  if (!response.ok || data?.success === false || (data?.status_code || 0) >= 400) {
    const message =
      data?.error?.message ||
      data?.error ||
      data?.message ||
      "Upload failed";
    throw new HttpError(502, message);
  }

  const link =
    data?.image?.url ||
    data?.image?.display_url ||
    data?.image?.url_viewer ||
    data?.data?.url ||
    data?.data?.link;
  if (!link) {
    throw new HttpError(502, "Upload failed");
  }

  return jsonResponse({ ok: true, url: link }, 200, request, env);
}

async function getSnippets(env) {
  ensureDb(env);
  const result = await env.DB.prepare("SELECT key, content, dynamic FROM snippets").all();
  const rows = result.results || [];
  if (!rows.length) {
    await seedDefaultSnippets(env);
    return { ...DEFAULT_SNIPPETS };
  }
  const snippets = {};
  rows.forEach((row) => {
    snippets[row.key] = {
      content: row.content || "",
      dynamic: Boolean(row.dynamic),
    };
  });
  return snippets;
}

async function seedDefaultSnippets(env) {
  const statements = Object.entries(DEFAULT_SNIPPETS).map(([key, snippet]) =>
    env.DB.prepare(
      "INSERT OR IGNORE INTO snippets (key, content, dynamic) VALUES (?, ?, ?)"
    ).bind(key, snippet.content, snippet.dynamic ? 1 : 0)
  );
  if (statements.length) {
    await env.DB.batch(statements);
  }
}

function normalizeSnippetKey(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

async function resolveSnippetText(text, { env, isAdmin, role, senderId, senderName }) {
  if (!text || !text.startsWith("!") || role !== "support" || !isAdmin) {
    return text;
  }
  const trimmed = text.trim();
  const parts = trimmed.slice(1).split(/\s+/);
  if (!parts.length) {
    return text;
  }
  const key = normalizeSnippetKey(parts[0]);
  const snippets = await getSnippets(env);
  const snippet = snippets[key];
  if (!snippet) {
    return text;
  }
  const args = parts.slice(1);
  return applySnippet(snippet, args, { ping: "" });
}

function applySnippet(snippet, args, meta) {
  let result = snippet.content || "";
  if (snippet.dynamic) {
    result = result.replace(/\{(\d+)\}/g, (_, index) => args[Number(index) - 1] || "");
    result = result.replace(/[ \t]{2,}/g, " ").trim();
  }
  if (result.includes("{ping}")) {
    const pingValue = meta?.ping || "";
    result = result.replace(/\{ping\}/gi, pingValue);
  }
  return result;
}

function relayMessageToDiscord(message, env, ctx) {
  if (!message?.text || !env.SMOKEBOT_API_URL || !env.DISCORD_BRIDGE_KEY) {
    return;
  }
  const task = relayMessageToDiscordThread(message, env).catch((error) => {
    console.error("Discord relay failed", {
      conversationId: message.conversationId,
      messageId: message.id,
      error: error instanceof Error ? error.message : String(error),
    });
  });
  ctx.waitUntil(task);
}

async function relayMessageToDiscordThread(message, env) {
  const conversation = await readConversation(env, message.conversationId);
  if (!conversation) {
    throw new Error("Conversation not found for Discord relay");
  }

  const threadId = conversation.discordThreadId || await createDiscordConversationThread(env, conversation, message);
  const senderName = sanitizeDiscordLabel(message.senderName || (message.role === "support" ? "Support" : "Guest"));
  const roleLabel = message.role === "support" ? "Support" : "User";
  const prefix = `**${roleLabel} · ${senderName}**\n`;
  const chunks = splitDiscordMessage(prefix, message.text);

  for (const content of chunks) {
    await createDiscordMessage(env, threadId, content);
  }
}

async function createDiscordConversationThread(env, conversation, firstMessage) {
  const starterContent = [
    "**New wiki support chat**",
    `User: ${sanitizeDiscordLabel(firstMessage.senderName || conversation.name || "Guest")}`,
    `Chat ID: \`${sanitizeDiscordCode(conversation.id)}\``,
    "Reply inside this thread. Messages in the parent channel are not sent to the web chat.",
  ].join("\n");
  const created = await smokeBotRequest(env, {
    starterContent,
    threadName: buildDiscordThreadName(conversation, firstMessage),
  });
  const threadId = stringField(created.threadId);
  const starterMessageId = stringField(created.starterMessageId);
  if (!threadId) {
    throw new Error("SmokeBot did not return a thread ID");
  }

  await env.DB.prepare(
    `UPDATE conversations
      SET discord_thread_id = ?, discord_starter_message_id = ?
      WHERE id = ?`
  ).bind(threadId, starterMessageId, conversation.id).run();
  return threadId;
}

async function createDiscordMessage(env, channelId, content) {
  return smokeBotRequest(env, { threadId: channelId, content });
}

async function smokeBotRequest(env, body) {
  const baseUrl = String(env.SMOKEBOT_API_URL || "").replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/api/support-chat/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.DISCORD_BRIDGE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = stringField(data?.message) || `HTTP ${response.status}`;
    throw new Error(`SmokeBot request failed: ${detail}`);
  }
  return data;
}

function splitDiscordMessage(prefix, text) {
  const firstLimit = DISCORD_MESSAGE_LENGTH - prefix.length;
  const chunks = [];
  let remaining = String(text || "");
  let first = true;
  while (remaining) {
    const limit = first ? firstLimit : DISCORD_MESSAGE_LENGTH;
    let cut = Math.min(limit, remaining.length);
    if (cut < remaining.length) {
      const newline = remaining.lastIndexOf("\n", cut);
      const space = remaining.lastIndexOf(" ", cut);
      const boundary = Math.max(newline, space);
      if (boundary > Math.floor(limit * 0.6)) {
        cut = boundary;
      }
    }
    const part = remaining.slice(0, cut).trim();
    if (part) {
      chunks.push(`${first ? prefix : ""}${part}`);
    }
    remaining = remaining.slice(cut).trimStart();
    first = false;
  }
  return chunks;
}

function buildDiscordThreadName(conversation, message) {
  const name = sanitizeDiscordLabel(message.senderName || conversation.name || "guest")
    .replace(/\s+/g, " ")
    .trim();
  const suffix = sanitizeDiscordLabel(conversation.id).slice(-8);
  return `support-${name || "guest"}-${suffix}`.slice(0, 100);
}

function sanitizeDiscordLabel(value) {
  return String(value || "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[*_`~|<>@]/g, "")
    .trim()
    .slice(0, 80);
}

function sanitizeDiscordCode(value) {
  return String(value || "").replace(/`/g, "").slice(0, 100);
}

function normalizeOriginPattern(value) {
  if (!value) {
    return "";
  }
  return value.trim().replace(/\/\*$/, "");
}

function originMatches(pattern, origin) {
  if (!pattern) {
    return false;
  }
  if (pattern === "*") {
    return true;
  }
  if (!origin) {
    return false;
  }
  if (pattern.includes("*")) {
    const escaped = pattern
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*");
    const regex = new RegExp(`^${escaped}$`);
    return regex.test(origin);
  }
  return pattern === origin;
}
