/* ==========================================================================
   RULESET — co-op layer
   --------------------------------------------------------------------------
   Injected by server.mjs when the game is served (never when index.html is
   opened directly). A full-height side panel: who is playing, how far they
   have got, and chat. Opening it splits the page rather than covering it —
   the game reflows into the space that is left.

   It touches nothing inside the game. Progress is read by polling the public
   `window.RULESET` engine object and the save, so game.js needs no hooks and
   this file can be deleted at any time without consequence.
   ========================================================================== */

(function () {
'use strict';

/* The test harness runs the game inside an iframe. Co-op has no business
   there — it would open a stream per level load and put foreign DOM in front
   of the assertions. */
if (window.top !== window.self) return;

const SAVE_KEY = 'ruleset:v1';
const ME_KEY = 'ruleset:live';

/* --------------------------------------------------------------- state -- */

const me = (() => {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(ME_KEY) || 'null'); } catch (e) {}
  const m = (raw && raw.id) ? raw : { id: Math.random().toString(36).slice(2, 10), name: '' };
  persist(m);
  return m;
})();

function persist(m) { try { localStorage.setItem(ME_KEY, JSON.stringify(m)); } catch (e) {} }

function progress() {
  let solved = 0;
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    solved = Array.isArray(s.solved) ? s.solved.length : 0;
  } catch (e) {}
  const eng = window.RULESET;
  const total = (window.RULESET_LEVELS || []).length || 15;
  return { level: eng ? eng.index + 1 : 1, solved, total };
}

/* A stable colour per player, so you learn who is who at a glance. */
function hueOf(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}
const colourOf = id => `hsl(${hueOf(id)} 62% 52%)`;
const initial = n => (n || '?').trim().charAt(0).toUpperCase() || '?';
const clock = t => new Date(t || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/* ------------------------------------------------------------------ ui -- */

const css = `
:root{--rs-w:340px}

/* the split: the page gives up room instead of being covered */
html.rs-open body{padding-inline-end:var(--rs-w)}
html.rs-open .dev{inset-inline-end:calc(var(--rs-w) + 16px)}

.rs-live{
  position:fixed;inset-block:0;inset-inline-end:0;width:var(--rs-w);z-index:9000;
  display:flex;flex-direction:column;
  background:var(--panel,#fff);border-inline-start:1px solid var(--line,#e3e3df);
  font-family:var(--font,system-ui);color:var(--ink,#111);
  transform:translateX(101%);visibility:hidden;
  transition:transform .36s cubic-bezier(.16,1,.3,1),visibility .36s}
html[dir=rtl] .rs-live{transform:translateX(-101%)}
html.rs-open .rs-live{transform:none;visibility:visible}

/* header ---------------------------------------------------------------- */
.rs-head{display:flex;align-items:center;justify-content:space-between;gap:10px;
  padding:16px 16px 13px;border-bottom:1px solid var(--line,#e3e3df)}
.rs-brand{display:flex;align-items:center;gap:9px;font-family:var(--mono,monospace);
  font-size:10px;letter-spacing:.2em;color:var(--muted,#999)}
.rs-dot{width:7px;height:7px;border-radius:50%;background:var(--muted,#bbb);transition:background .3s}
.rs-live.is-on .rs-dot{background:var(--good,#0a7);box-shadow:0 0 0 3px color-mix(in srgb,var(--good,#0a7) 22%,transparent)}
.rs-x{border:0;background:none;padding:4px 6px;margin:-4px -6px;border-radius:7px;
  color:var(--muted,#999);font-size:17px;line-height:1;cursor:pointer}
.rs-x:hover{background:var(--bg,#f3f3f0);color:var(--ink,#111)}

/* players --------------------------------------------------------------- */
.rs-players{padding:6px 14px 12px;border-bottom:1px solid var(--line,#e3e3df);
  max-height:44vh;overflow-y:auto}
.rs-p{display:flex;gap:11px;align-items:center;padding:9px 0}
.rs-av{flex:0 0 auto;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;
  color:#fff;font-size:13px;font-weight:700;letter-spacing:0}
.rs-p-main{flex:1;min-width:0}
.rs-p-top{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.rs-name{font-size:13.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rs-p.is-me .rs-name{cursor:text;border-bottom:1px dashed var(--line-2,#ccc)}
.rs-p.is-me .rs-name:hover{border-bottom-color:var(--accent,#2f5bff);color:var(--accent,#2f5bff)}
.rs-at{font-family:var(--mono,monospace);font-size:10px;color:var(--muted,#999);white-space:nowrap}
.rs-bar{margin-top:6px;height:3px;border-radius:99px;background:var(--line,#e3e3df);overflow:hidden}
.rs-bar i{display:block;height:100%;border-radius:99px;transition:width .45s cubic-bezier(.16,1,.3,1)}
.rs-rename{width:100%;padding:2px 6px;border:1px solid var(--accent,#2f5bff);border-radius:6px;
  background:var(--bg,#f6f6f4);color:var(--ink,#111);font:inherit;font-size:13px;font-weight:600;outline:none}

/* log ------------------------------------------------------------------- */
.rs-log{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;
  display:flex;flex-direction:column;gap:3px;padding:14px}
.rs-msg{max-width:88%;align-self:flex-start;padding:7px 12px;border-radius:15px 15px 15px 5px;
  background:var(--bg,#f3f3f0);font-size:13.5px;line-height:1.45;word-wrap:break-word;
  animation:rs-in .26s cubic-bezier(.16,1,.3,1)}
.rs-msg.is-mine{align-self:flex-end;border-radius:15px 15px 5px 15px;
  background:var(--accent,#2f5bff);color:#fff}
.rs-msg .rs-who{display:block;font-size:10.5px;font-weight:700;letter-spacing:.02em;margin-bottom:2px}
.rs-msg.is-run{border-start-start-radius:5px}
.rs-sys{align-self:center;text-align:center;font-family:var(--mono,monospace);font-size:10.5px;
  letter-spacing:.04em;color:var(--muted,#999);padding:5px 0;animation:rs-in .26s ease}
.rs-time{font-family:var(--mono,monospace);font-size:9.5px;opacity:.55;margin:0 7px;white-space:nowrap}
@keyframes rs-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}

/* join gate -------------------------------------------------------------- */
/* A separate form with its own label and button. The chat composer does not
   exist until a name is set, so a message can never be mistaken for one. */
.rs-join{display:none;flex-direction:column;gap:8px;padding:12px 14px;
  border-top:1px solid var(--line,#e3e3df)}
.rs-live.needs-name .rs-join{display:flex}
.rs-live.needs-name .rs-form{display:none}
.rs-join-label{font-family:var(--mono,monospace);font-size:10px;letter-spacing:.12em;
  color:var(--muted,#999)}
.rs-join-row{display:flex;gap:8px}
.rs-join input{flex:1;min-width:0;padding:10px 13px;border:1px solid var(--accent,#2f5bff);
  border-radius:11px;background:var(--bg,#f6f6f4);color:var(--ink,#111);font:inherit;
  font-size:13.5px;outline:none}
.rs-join button{flex:0 0 auto;padding:0 16px;border:0;border-radius:11px;
  background:var(--accent,#2f5bff);color:#fff;font:inherit;font-size:12.5px;cursor:pointer}

/* which room am I in ------------------------------------------------------ */
.rs-host{font-family:var(--mono,monospace);font-size:9px;letter-spacing:.06em;
  color:var(--muted,#999);opacity:.75;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rs-alone{padding:10px 14px 2px;font-size:11.5px;line-height:1.5;color:var(--muted,#999)}
.rs-alone b{display:block;color:var(--ink-soft,#666);font-weight:600;margin-bottom:2px}
.rs-alone code{font-family:var(--mono,monospace);font-size:10.5px;
  background:var(--bg,#f3f3f0);padding:1px 5px;border-radius:4px}

/* composer -------------------------------------------------------------- */
.rs-form{display:flex;gap:8px;padding:12px 14px;border-top:1px solid var(--line,#e3e3df)}
.rs-form input{flex:1;min-width:0;padding:10px 13px;border:1px solid var(--line,#e3e3df);
  border-radius:11px;background:var(--bg,#f6f6f4);color:var(--ink,#111);font:inherit;font-size:13.5px;outline:none;
  transition:border-color .18s}
.rs-form input:focus{border-color:var(--accent,#2f5bff)}
.rs-form button{flex:0 0 auto;width:38px;border:0;border-radius:11px;background:var(--ink,#111);
  color:var(--bg,#fff);font-size:15px;cursor:pointer;transition:opacity .18s}
.rs-form button:hover{opacity:.85}

/* toggle ---------------------------------------------------------------- */
.rs-toggle{position:fixed;inset-block-end:64px;inset-inline-end:14px;z-index:8999;
  display:flex;align-items:center;gap:9px;padding:9px 15px;border:1px solid var(--line-2,#ccc);
  border-radius:99px;background:var(--panel,#fff);color:var(--ink,#111);
  font-family:var(--font,system-ui);font-size:12.5px;cursor:pointer;
  box-shadow:0 8px 22px rgba(0,0,0,.10);transition:transform .3s cubic-bezier(.16,1,.3,1),opacity .2s,border-color .2s}
.rs-toggle:hover{border-color:var(--ink,#111)}
html.rs-open .rs-toggle{opacity:0;pointer-events:none;transform:scale(.9)}
.rs-badge{min-width:17px;height:17px;padding:0 5px;border-radius:99px;background:var(--accent,#2f5bff);
  color:#fff;font-size:10.5px;font-weight:700;display:none;place-items:center}
.rs-toggle.has-unread .rs-badge{display:grid}

@media (max-width:860px){
  :root{--rs-w:100vw}
  html.rs-open body{padding-inline-end:0}
}
@media (prefers-reduced-motion:reduce){
  .rs-live,.rs-toggle{transition-duration:.001ms}
  .rs-msg,.rs-sys{animation:none}
}
@media print{.rs-live,.rs-toggle{display:none}}
`;

document.head.appendChild(Object.assign(document.createElement('style'), { textContent: css }));

const panel = document.createElement('aside');
panel.className = 'rs-live';
panel.innerHTML = `
  <div class="rs-head">
    <div>
      <div class="rs-brand"><span class="rs-dot"></span><span class="rs-count">CONNECTING</span></div>
      <div class="rs-host"></div>
    </div>
    <button class="rs-x" type="button" title="Close">&#10005;</button>
  </div>
  <div class="rs-players"></div>
  <div class="rs-alone" hidden></div>
  <div class="rs-log"></div>
  <form class="rs-form">
    <input type="text" maxlength="300" autocomplete="off" placeholder="Message…">
    <button type="submit" title="Send">&#8593;</button>
  </form>
  <form class="rs-join">
    <span class="rs-join-label">CHOOSE A NAME TO JOIN</span>
    <div class="rs-join-row">
      <input type="text" maxlength="40" autocomplete="off" placeholder="Your name">
      <button type="submit">Join</button>
    </div>
  </form>`;
document.body.appendChild(panel);

const toggle = document.createElement('button');
toggle.type = 'button';
toggle.className = 'rs-toggle';
toggle.innerHTML = `<span class="rs-dot"></span><span class="rs-label">Co-op</span><span class="rs-badge">0</span>`;
document.body.appendChild(toggle);

const $ = s => panel.querySelector(s);
const listEl = $('.rs-players'), logEl = $('.rs-log'), form = $('.rs-form');
const input = form.querySelector('input'), countEl = $('.rs-count');
const joinForm = $('.rs-join'), joinInput = joinForm.querySelector('input');
const hostEl = $('.rs-host'), aloneEl = $('.rs-alone');
const badge = toggle.querySelector('.rs-badge'), label = toggle.querySelector('.rs-label');

/* Which room this is. Two machines each running their own server are two
   separate rooms that can never see each other — showing the host makes that
   visible instead of leaving it to be guessed. */
hostEl.textContent = location.host;

let unread = 0;

function open(on) {
  document.documentElement.classList.toggle('rs-open', on);
  panel.classList.toggle('is-open', on);
  if (on) {
    unread = 0;
    toggle.classList.remove('has-unread');
    logEl.scrollTop = logEl.scrollHeight;
    setTimeout(() => input.focus(), 360);
  }
}
toggle.addEventListener('click', () => open(true));
$('.rs-x').addEventListener('click', () => open(false));

/* Keystrokes inside the panel must never reach the game: levels 8 and 12
   listen for keys on window, so typing "was" would drive the square. */
['keydown', 'keyup', 'keypress'].forEach(t =>
  panel.addEventListener(t, e => e.stopPropagation()));

/* ------------------------------------------------------------- roster -- */

let roster = [];

function paintRoster() {
  const n = roster.length;
  countEl.textContent = n + (n === 1 ? ' PLAYER' : ' PLAYERS');
  label.textContent = n > 1 ? 'Co-op · ' + n : 'Co-op';

  /* Alone is ambiguous: it can mean nobody has joined yet, or that the other
     person is in a different room because they ran their own server. Say which
     address to share rather than leaving them to work it out. */
  if (n <= 1 && me.name) {
    aloneEl.hidden = false;
    aloneEl.textContent = '';
    const b = document.createElement('b');
    b.textContent = 'Nobody else is here';
    aloneEl.appendChild(b);
    aloneEl.appendChild(document.createTextNode('They must open this exact address — '));
    const code = document.createElement('code');
    code.textContent = location.host;
    aloneEl.appendChild(code);
    aloneEl.appendChild(document.createTextNode(
      ' — not their own. Two servers are two separate rooms.'));
  } else {
    aloneEl.hidden = true;
  }

  listEl.textContent = '';
  roster.forEach(p => {
    const mine = p.id === me.id;
    const row = document.createElement('div');
    row.className = 'rs-p' + (mine ? ' is-me' : '');
    const pct = Math.round((p.solved / (p.total || 15)) * 100);

    row.innerHTML =
      `<div class="rs-av"></div>
       <div class="rs-p-main">
         <div class="rs-p-top"><span class="rs-name"></span>
           <span class="rs-at">LV ${p.level} · ${p.solved}/${p.total || 15}</span></div>
         <div class="rs-bar"><i></i></div>
       </div>`;

    const colour = colourOf(p.id);
    const av = row.querySelector('.rs-av');
    av.style.background = colour;
    av.textContent = initial(p.name);
    row.querySelector('.rs-bar i').style.cssText = `width:${pct}%;background:${colour}`;

    const nameEl = row.querySelector('.rs-name');
    nameEl.textContent = p.name + (mine ? ' (you)' : '');
    if (mine) {
      nameEl.title = 'Click to rename';
      nameEl.addEventListener('click', () => rename(nameEl));
    }
    listEl.appendChild(row);
  });
}

/* inline rename, right where the name is shown */
function rename(nameEl) {
  const box = document.createElement('input');
  box.className = 'rs-rename';
  box.value = me.name;
  box.maxLength = 40;
  nameEl.replaceWith(box);
  box.focus();
  box.select();

  let done = false;
  const finish = keep => {
    if (done) return;
    done = true;
    const next = box.value.trim().slice(0, 40);
    if (keep && next && next !== me.name) { me.name = next; persist(me); report(true); }
    paintRoster();
  };
  box.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    if (e.key === 'Escape') { e.preventDefault(); finish(false); }
  });
  box.addEventListener('blur', () => finish(true));
}

/* ---------------------------------------------------------------- log -- */

let lastSpeaker = null;

function addLine(entry) {
  const atBottom = logEl.scrollTop + logEl.clientHeight >= logEl.scrollHeight - 30;

  if (entry.kind === 'system') {
    const el = document.createElement('div');
    el.className = 'rs-sys';
    el.textContent = entry.text;
    logEl.appendChild(el);
    lastSpeaker = null;
  } else {
    /* Identity is the id, not the name. Two players called "player" — which is
       the server's default — would otherwise each see the other's messages as
       their own, right-aligned and in their own colour. */
    const mine = entry.id ? entry.id === me.id : entry.name === me.name;
    const run = lastSpeaker === (entry.id || entry.name);
    const el = document.createElement('div');
    el.className = 'rs-msg' + (mine ? ' is-mine' : '') + (run ? ' is-run' : '');
    if (!run) {
      const who = document.createElement('span');
      who.className = 'rs-who';
      who.textContent = entry.name;
      if (!mine) who.style.color = colourOf(entry.id || entry.name);
      el.appendChild(who);
    }
    el.appendChild(document.createTextNode(entry.text));
    const t = document.createElement('span');
    t.className = 'rs-time';
    t.textContent = clock(entry.at);
    el.appendChild(t);
    logEl.appendChild(el);
    lastSpeaker = entry.id || entry.name;

    if (!document.documentElement.classList.contains('rs-open') && !mine) {
      unread++;
      badge.textContent = unread > 9 ? '9+' : unread;
      toggle.classList.add('has-unread');
    }
  }

  while (logEl.children.length > 200) logEl.firstChild.remove();
  if (atBottom) logEl.scrollTop = logEl.scrollHeight;
}

/* ---------------------------------------------------------- transport -- */

function post(path, data) {
  return fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    keepalive: true
  }).catch(() => {});
}

let last = '';
function report(force) {
  const p = progress();
  const key = me.name + '|' + p.level + '|' + p.solved;
  if (!force && key === last) return;
  last = key;
  post('/live/state', { id: me.id, name: me.name || 'player', ...p });
}

const stream = new EventSource('/live/stream');
stream.addEventListener('open', () => { panel.classList.add('is-on'); toggle.classList.add('is-on'); report(true); });
stream.addEventListener('error', () => { panel.classList.remove('is-on'); toggle.classList.remove('is-on'); });
stream.addEventListener('roster', e => { roster = JSON.parse(e.data); paintRoster(); });
stream.addEventListener('chat', e => addLine(JSON.parse(e.data)));
stream.addEventListener('backlog', e => JSON.parse(e.data).forEach(addLine));

/* The composer only ever sends. It cannot consume a message for any other
   purpose — that was the bug: the first thing you typed became your name and
   was never transmitted, so it vanished from your screen AND never reached
   anyone else. */
form.addEventListener('submit', e => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text || !me.name) return;
  input.value = '';
  post('/live/chat', { id: me.id, name: me.name, text });
});

joinForm.addEventListener('submit', e => {
  e.preventDefault();
  const name = joinInput.value.trim().slice(0, 40);
  if (!name) return;
  me.name = name;
  persist(me);
  joinInput.value = '';
  panel.classList.remove('needs-name');
  report(true);
  paintRoster();
  setTimeout(() => input.focus(), 60);
});

function needName(on) {
  panel.classList.toggle('needs-name', on);
  if (on) setTimeout(() => joinInput.focus(), 380);
}

if (!me.name) {
  needName(true);
  open(true);
}

setInterval(() => report(false), 900);
setInterval(() => report(true), 7000);      // heartbeat, so we are not reaped
report(true);

})();
