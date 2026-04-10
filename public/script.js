/* ============================================================
   HealthBot AI — Frontend Script
   ============================================================ */

// === DOM References ===
const chatBox       = document.getElementById('chat-box');
const chatForm      = document.getElementById('chat-form');
const userInput     = document.getElementById('user-input');
const sendBtn       = document.getElementById('send-btn');
const clearBtn      = document.getElementById('clear-btn');
const suggestWrap   = document.getElementById('suggestions-wrap');
const chips         = document.querySelectorAll('.chip');

// === State ===
let conversation = [];
let isBusy = false;

// === Configure marked.js ===
if (typeof marked !== 'undefined') {
  marked.setOptions({ breaks: true, gfm: true });
}

// === Init ===
renderWelcome();
initTextarea();

/* ============================================================
   WELCOME MESSAGE
   ============================================================ */
function renderWelcome() {
  chatBox.innerHTML = `
    <div class="welcome-msg">
      <div class="welcome-icon"><i class="fas fa-heartbeat"></i></div>
      <h2>Halo! Saya HealthBot AI 👋</h2>
      <p>Asisten kesehatan cerdas yang siap menjawab pertanyaan seputar kesehatan, penyakit, obat-obatan, nutrisi, dan gaya hidup sehat. Silakan mulai bertanya!</p>
    </div>
  `;
}

/* ============================================================
   TEXTAREA — auto-resize & send button toggle
   ============================================================ */
function initTextarea() {
  userInput.addEventListener('input', () => {
    // Auto-resize
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 140) + 'px';

    // Toggle send button
    sendBtn.disabled = userInput.value.trim().length === 0 || isBusy;
  });
}

/* ============================================================
   APPEND MESSAGE
   ============================================================ */
function appendMessage(role, text) {
  const isUser = role === 'user';

  // On first user message: hide suggestions & welcome card
  if (isUser) {
    suggestWrap.classList.add('hidden');
    const welcome = chatBox.querySelector('.welcome-msg');
    if (welcome) welcome.remove();
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const msgEl = document.createElement('div');
  msgEl.classList.add('msg', isUser ? 'user' : 'bot');

  const avatarIcon = isUser ? 'fa-user' : 'fa-robot';
  const senderName = isUser ? 'Anda' : 'HealthBot AI';

  // Render content: user messages are escaped, bot messages use markdown
  let contentHtml;
  if (isUser) {
    contentHtml = escapeHtml(text);
  } else {
    contentHtml = (typeof marked !== 'undefined')
      ? marked.parse(text)
      : escapeHtml(text).replace(/\n/g, '<br>');
  }

  msgEl.innerHTML = `
    <div class="msg-avatar"><i class="fas ${avatarIcon}"></i></div>
    <div class="msg-content">
      <span class="msg-name">${senderName}</span>
      <div class="msg-bubble">${contentHtml}</div>
      <span class="msg-time">${timeStr}</span>
    </div>
  `;

  chatBox.appendChild(msgEl);
  scrollToBottom();
  return msgEl;
}

/* ============================================================
   TYPING INDICATOR
   ============================================================ */
function showTyping() {
  const el = document.createElement('div');
  el.classList.add('msg', 'bot');
  el.id = 'typing-indicator';
  el.innerHTML = `
    <div class="msg-avatar"><i class="fas fa-robot"></i></div>
    <div class="msg-content">
      <span class="msg-name">HealthBot AI</span>
      <div class="msg-bubble">
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  `;
  chatBox.appendChild(el);
  scrollToBottom();
}

function removeTyping() {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

/* ============================================================
   SCROLL TO BOTTOM
   ============================================================ */
function scrollToBottom() {
  chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
}

/* ============================================================
   HTML ESCAPE (user input safety)
   ============================================================ */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ============================================================
   SEND MESSAGE
   ============================================================ */
async function sendMessage(text) {
  text = text.trim();
  if (!text || isBusy) return;

  isBusy = true;
  sendBtn.disabled = true;

  appendMessage('user', text);
  conversation.push({ role: 'user', text });

  showTyping();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation }),
    });

    removeTyping();

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const reply = data.result || 'Maaf, saya tidak mendapat respons. Silakan coba lagi.';

    appendMessage('model', reply);
    conversation.push({ role: 'model', text: reply });

  } catch (err) {
    removeTyping();
    appendMessage('model',
      '⚠️ **Terjadi kesalahan koneksi.**\n\nTidak dapat terhubung ke server. Pastikan server sudah berjalan, lalu coba lagi.'
    );
    console.error('[HealthBot]', err);
  } finally {
    isBusy = false;
    sendBtn.disabled = userInput.value.trim().length === 0;
  }
}

/* ============================================================
   EVENTS
   ============================================================ */

// Form submit
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;

  userInput.value = '';
  userInput.style.height = 'auto';
  sendBtn.disabled = true;

  await sendMessage(text);
});

// Enter to send (Shift+Enter = new line)
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text) return;
    userInput.value = '';
    userInput.style.height = 'auto';
    sendBtn.disabled = true;
    sendMessage(text);
  }
});

// Quick suggestion chips
chips.forEach((chip) => {
  chip.addEventListener('click', () => {
    sendMessage(chip.dataset.msg);
  });
});

// Clear / reset conversation
clearBtn.addEventListener('click', () => {
  conversation = [];
  isBusy = false;
  renderWelcome();
  suggestWrap.classList.remove('hidden');
  userInput.value = '';
  userInput.style.height = 'auto';
  sendBtn.disabled = true;
});
