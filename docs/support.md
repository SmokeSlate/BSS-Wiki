<div class="support-chat-root">
  <section class="chat-shell">
    <div class="chat-status">
      <div class="status-block">
        <span class="status-pill status-warn" id="status-pill">Connecting</span>
        <span class="status-pill status-error presence-pill" id="presence-pill">Support offline</span>
      </div>
      <div class="chat-id">Chat ID <span id="chat-id"></span></div>
    </div>
    <div class="chat-log" id="chat-log">
      <div class="empty-state" id="empty-state">
        <p>Say hello and our support team will jump in.</p>
      </div>
    </div>
    <footer class="chat-input">
      <div class="input-wrap">
        <div class="input-field">
          <button class="tool-btn inline" id="tool-image" type="button" title="Upload image">+</button>
          <textarea
            id="message-input"
            rows="2"
            placeholder="Type a message or upload an image..."
          ></textarea>
        </div>
        <div class="input-hint" id="input-hint">Shift + Enter for a new line.</div>
      </div>
      <button class="send-button" id="send-button" type="button">&gt;</button>
    </footer>
  </section>
</div>

<input id="imgur-input" type="file" accept="image/*" hidden />
