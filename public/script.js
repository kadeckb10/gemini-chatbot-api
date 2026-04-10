/* ============================================================
   HealthBot AI — Floating Widget Script
   ============================================================ */

// === DOM References ===
const fab          = document.getElementById('fab');
const fabBadge     = document.getElementById('fab-badge');
const widget       = document.getElementById('widget');
const closeBtn     = document.getElementById('close-btn');
const clearBtn     = document.getElementById('clear-btn');
const chatBox      = document.getElementById('chat-box');
const chatForm     = document.getElementById('chat-form');
const userInput    = document.getElementById('user-input');
const sendBtn      = document.getElementById('send-btn');
const suggestWrap  = document.getElementById('suggestions-wrap');
const chips        = document.querySelectorAll('.chip');

// === State ===
let conversation = [];
let isBusy = false;
let isOpen = false;

// === Configure marked.js ===
if (typeof marked !== 'undefined') {
  marked.setOptions({ breaks: true, gfm: true });
}

// === Init ===
renderWelcome();
initTextarea();
openWidget();

/* ============================================================
   TOGGLE WIDGET OPEN / CLOSE
   ============================================================ */
function openWidget() {
  isOpen = true;
  widget.classList.add('is-open');
  widget.setAttribute('aria-hidden', 'false');
  fab.classList.add('is-open');
  fabBadge.classList.add('hidden');
  userInput.focus();
}

function closeWidget() {
  isOpen = false;
  widget.classList.remove('is-open');
  widget.setAttribute('aria-hidden', 'true');
  fab.classList.remove('is-open');
}

fab.addEventListener('click', () => {
  isOpen ? closeWidget() : openWidget();
});

closeBtn.addEventListener('click', closeWidget);

/* ============================================================
   WELCOME MESSAGE
   ============================================================ */
function renderWelcome() {
  chatBox.innerHTML = `
    <div class="welcome-msg">
      <div class="welcome-icon"><i class="fas fa-heartbeat"></i></div>
      <h2>Halo! Saya HealthBot AI 👋</h2>
      <p>Tanyakan apa saja seputar kesehatan, penyakit, obat-obatan, atau gaya hidup sehat.</p>
    </div>
  `;
}

/* ============================================================
   TEXTAREA — auto-resize & send button toggle
   ============================================================ */
function initTextarea() {
  userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 100) + 'px';
    sendBtn.disabled = userInput.value.trim().length === 0 || isBusy;
  });
}

/* ============================================================
   APPEND MESSAGE
   ============================================================ */
function appendMessage(role, text) {
  const isUser = role === 'user';

  if (isUser) {
    suggestWrap.classList.add('hidden');
    const welcome = chatBox.querySelector('.welcome-msg');
    if (welcome) welcome.remove();
  }

  const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const msgEl = document.createElement('div');
  msgEl.classList.add('msg', isUser ? 'user' : 'bot');

  const icon   = isUser ? 'fa-user' : 'fa-robot';
  const name   = isUser ? 'Anda' : 'HealthBot AI';
  const content = isUser
    ? escapeHtml(text)
    : (typeof marked !== 'undefined' ? marked.parse(text) : escapeHtml(text).replace(/\n/g, '<br>'));

  msgEl.innerHTML = `
    <div class="msg-avatar"><i class="fas ${icon}"></i></div>
    <div class="msg-content">
      <span class="msg-name">${name}</span>
      <div class="msg-bubble">${content}</div>
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
   SCROLL & ESCAPE
   ============================================================ */
function scrollToBottom() {
  chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
}

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
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const reply = data.result || 'Maaf, tidak ada respons. Silakan coba lagi.';

    appendMessage('model', reply);
    conversation.push({ role: 'model', text: reply });

    // Jika widget tertutup, tampilkan badge notifikasi
    if (!isOpen) {
      fabBadge.classList.remove('hidden');
    }

  } catch (err) {
    removeTyping();
    appendMessage('model',
      '⚠️ **Koneksi gagal.**\n\nTidak dapat terhubung ke server. Pastikan server sudah berjalan, lalu coba lagi.'
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

// Enter = kirim, Shift+Enter = baris baru
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
  chip.addEventListener('click', () => sendMessage(chip.dataset.msg));
});

// Reset percakapan
clearBtn.addEventListener('click', () => {
  conversation = [];
  isBusy = false;
  renderWelcome();
  suggestWrap.classList.remove('hidden');
  userInput.value = '';
  userInput.style.height = 'auto';
  sendBtn.disabled = true;
});

// Tutup widget dengan tombol Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isOpen) closeWidget();
});
