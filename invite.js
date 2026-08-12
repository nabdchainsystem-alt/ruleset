/* ==========================================================================
   RULESET — THE INVITATION GATE
   --------------------------------------------------------------------------
   The game is shared by link. This file asks whoever follows that link for a
   code before it shows them the game, and gives the owner a place to make
   codes.

   WHAT THIS IS NOT — and the UI says so out loud:

     There is no server. The whole game is already in the browser by the time
     this runs, so this is a courtesy lock on an unlocked door. It turns away
     someone who wandered in from a forwarded link. It does not turn away
     anyone who opens developer tools, and no amount of cleverness in a file
     the visitor has already downloaded would change that. The owner was told
     this plainly and picked it anyway, so nothing here claims otherwise.

   THREE RULES THIS FILE OBEYS:

     1. It fails OPEN. Every entry point is wrapped: a corrupt store, a
        missing API, a thrown handler — any of them removes the gate, not the
        game. A courtesy lock that bricks the game for everybody is far worse
        than no lock at all.

     2. It is inert on a local host. tests.html and browser-tests.mjs both
        drive the game over 127.0.0.1 and the owner develops there. A gate
        that stood in front of those would break every suite in the project,
        so the host check IS the mechanism — there is deliberately no
        ?nogate=1 backdoor in the deployed build for a stranger to find.

     3. It keeps its own key. `ruleset:player` is not `ruleset:v1` and not
        `ruleset:vault`. "Start over" wipes progress, and being asked to
        register again because you replayed the game would be absurd.

   CODES. There is no list of issued codes because there is nowhere to keep
   one. A code carries its own proof instead: nine random characters plus a
   three-character checksum over them and a salt. The owner can mint as many
   as he likes with nothing to maintain, and the source contains no plaintext
   list of what is valid. A code can therefore not be revoked and cannot be
   limited to one person — the owner's panel says that in one line rather
   than implying anything better.

   This file is entirely self-installing. It is added to index.html with two
   lines and touches no other file:

     <link rel="stylesheet" href="invite.css">
     <script src="invite.js"></script>
   ========================================================================== */

(function () {
'use strict';

/* ============================================================== failing == */

let dead = false;

/** Take the gate down and stay down. Called from every catch in the file. */
function failOpen(err) {
  dead = true;
  try {
    if (err && window.console && console.warn) {
      console.warn('invite: failing open —', (err && err.message) || err);
    }
  } catch (e) {}
  try { if (gateEl) { gateEl.remove(); gateEl = null; } } catch (e) {}
  try { unblock(); } catch (e) {}
  try { closePanel(); } catch (e) {}
  try { if (chipEl) { chipEl.remove(); chipEl = null; } } catch (e) {}
  try { clearInterval(keepAlive); } catch (e) {}
}

/** Wrap anything the browser will call back into. */
function guard(fn) {
  return function () {
    if (dead) return;
    try { return fn.apply(this, arguments); }
    catch (err) { failOpen(err); }
  };
}

/* ================================================== where the gate lives == */
/* Loopback and file: are the owner's machine and the test harnesses. Anything
   else is somebody who followed a link. */

const LOOPBACK = ['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0'];

function isLocal() {
  try {
    if (location.protocol === 'file:') return true;
    const h = String(location.hostname || '').toLowerCase();
    if (LOOPBACK.indexOf(h) >= 0) return true;
    if (/^127\./.test(h)) return true;                 // 127.0.0.2 and friends
    if (/\.localhost$/.test(h)) return true;           // RFC 6761
    return false;
  } catch (e) { return true; }                          // unknowable → inert
}

/* Tests need to see the gate, and they run on 127.0.0.1. `_forceGate` is the
   one override, and it is set from the test harness before the file loads or
   from the console afterwards — never from a query string, which a visitor
   could type. */
function gateApplies() {
  if (API._forceGate === true) return true;
  if (API._forceGate === false) return false;
  return !isLocal();
}

/* ================================================================ codes == */

/* No O, no 0, no I, no 1, no L. What is left can be read down a phone line. */
const ALPHA = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const BODY = 9;
const CHECK = 3;
const LEN = BODY + CHECK;

/* Assembled at runtime so the salt is not a string anybody can grep out of
   the file. That is obfuscation and nothing more — see the header. */
const SALT = (function () {
  const b = [46, 41, 48, 57, 47, 57, 40, 115, 53, 50, 42, 53, 40, 61, 40, 53,
             51, 50, 115, 110, 108, 110, 106];
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i] ^ 0x5c);
  return s;
})();

/** FNV-1a with a final avalanche. Small, deterministic, no dependencies. */
function h32(s, seed) {
  let h = seed >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h ^= h >>> 15; h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 3266489909) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** The three characters that make a body into a code. */
function sign(body) {
  let h = h32(SALT + body, 0x811c9dc5);
  let out = '';
  for (let i = 0; i < CHECK; i++) {
    out = ALPHA.charAt(h % ALPHA.length) + out;
    h = Math.floor(h / ALPHA.length);
  }
  return out;
}

/** A longer fingerprint, used only to recognise the one master code. */
function digest(code) {
  const a = h32(SALT + '#' + code, 0x2f5bff01);
  const b = h32(code + '#' + SALT, 0x9e3779b9);
  return pad8(a) + pad8(b);
}
function pad8(n) { const s = n.toString(16); return '00000000'.slice(s.length) + s; }

/* The owner's key is stored as a fingerprint, not as itself, so reading this
   file does not hand it over. The code is a perfectly ordinary minted code —
   it also passes the checksum — which is why it is checked first. */
const MASTER = 'caf6344ba9b8ce73';

/** Spacing, dashes and case are the retyper's business, not ours. */
function normalise(raw) {
  return String(raw == null ? '' : raw).toUpperCase().replace(/[^0-9A-Z]/g, '');
}

/** → { kind: 'master' | 'invite', code } or null. Never throws. */
function check(raw) {
  try {
    const c = normalise(raw);
    if (c.length !== LEN) return null;
    for (let i = 0; i < c.length; i++) if (ALPHA.indexOf(c.charAt(i)) < 0) return null;
    if (digest(c) === MASTER) return { kind: 'master', code: c };
    if (sign(c.slice(0, BODY)) === c.slice(BODY)) return { kind: 'invite', code: c };
    return null;
  } catch (e) { return null; }
}

/** Random body + its checksum. crypto when there is one, Math.random when not. */
function mint() {
  let body = '';
  const draw = n => {
    const out = [];
    try {
      if (window.crypto && window.crypto.getRandomValues) {
        const buf = new Uint8Array(n);
        window.crypto.getRandomValues(buf);
        for (let i = 0; i < n; i++) out.push(buf[i]);
        return out;
      }
    } catch (e) {}
    for (let i = 0; i < n; i++) out.push(Math.floor(Math.random() * 256));
    return out;
  };
  let spins = 0;
  while (body.length < BODY && spins++ < 40) {
    const bytes = draw(BODY * 2);
    for (let i = 0; i < bytes.length && body.length < BODY; i++) {
      if (bytes[i] >= 248) continue;          // rejection: keeps the draw even
      body += ALPHA.charAt(bytes[i] % ALPHA.length);
    }
  }
  while (body.length < BODY) body += ALPHA.charAt(Math.floor(Math.random() * ALPHA.length));
  return body + sign(body);
}

/** XXXX-XXXX-XXXX — grouped for reading aloud. */
function format(code) {
  const c = normalise(code);
  return c.replace(/(.{4})(?=.)/g, '$1-');
}

/** The thing the owner actually sends. */
function linkFor(code) {
  try {
    const base = location.origin + location.pathname;
    return base + '?invite=' + encodeURIComponent(format(code));
  } catch (e) { return '?invite=' + format(code); }
}

/** A code arriving in the URL, under either name. */
function codeFromUrl() {
  try {
    const q = new URLSearchParams(location.search);
    return q.get('invite') || q.get('i') || '';
  } catch (e) { return ''; }
}

/** Once it is spent, take it back out of the address bar. */
function scrubUrl() {
  try {
    if (!window.history || !history.replaceState) return;
    const q = new URLSearchParams(location.search);
    if (!q.has('invite') && !q.has('i')) return;
    q.delete('invite'); q.delete('i');
    const s = q.toString();
    history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + location.hash);
  } catch (e) {}
}

/* ============================================================== storage == */
/* Its own key. Never `ruleset:v1` (the save "Start over" wipes) and never
   `ruleset:vault`. If localStorage refuses to be written — Safari in private
   browsing does exactly that — the session still works from memory and the
   only cost is being asked again on the next reload. */

const KEY = 'ruleset:player';
const SCHEMA = 1;
const NAME_MAX = 40;
const MINT_MAX = 200;

const cut = (s, n) => String(s == null ? '' : s).slice(0, n);

function blank() {
  return { v: SCHEMA, name: '', code: '', owner: false, at: 0, used: [], minted: [] };
}

/** Trust nothing on the way in: anything malformed degrades to empty. */
function migrate(raw) {
  const d = blank();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return d;
  d.name = typeof raw.name === 'string' ? cut(raw.name, NAME_MAX) : '';
  d.code = typeof raw.code === 'string' ? normalise(raw.code).slice(0, LEN) : '';
  d.owner = raw.owner === true;
  d.at = Number.isFinite(raw.at) ? raw.at : 0;
  d.used = Array.isArray(raw.used)
    ? raw.used.filter(c => typeof c === 'string').map(c => normalise(c).slice(0, LEN)).slice(0, 400)
    : [];
  d.minted = Array.isArray(raw.minted)
    ? raw.minted
        .filter(m => m && typeof m === 'object' && typeof m.code === 'string')
        .map(m => ({ code: normalise(m.code).slice(0, LEN), at: Number.isFinite(m.at) ? m.at : 0 }))
        .filter(m => m.code.length === LEN)
        .slice(0, MINT_MAX)
    : [];
  return d;
}

let memory = null;             // survives a storage that refuses to be written

function read() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { raw = null; }
  if (!raw) { try { raw = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { raw = null; } }
  if (!raw && memory) raw = memory;
  return migrate(raw);
}

function write() {
  memory = player;
  let ok = false;
  try { localStorage.setItem(KEY, JSON.stringify(player)); ok = true; } catch (e) {}
  if (!ok) { try { sessionStorage.setItem(KEY, JSON.stringify(player)); } catch (e) {} }
}

let player = blank();

function registered() {
  return !!player.name && (player.owner || !!player.code);
}

/* ============================================================== strings == */

const STR = {
  en: {
    brand: 'RULESET',
    gateTitle: 'By invitation',
    gateSub: 'Someone sent you a code. Put it in, pick a name, and the game opens.',
    name: 'Name',
    namePh: 'What to call you',
    code: 'Invitation code',
    enter: 'Enter',
    needName: 'Put in a name first.',
    badCode: 'That code is not one of ours.',
    usedCode: 'That code has already been used on this browser.',
    honest: 'There is no server. The code is checked here, inside your browser, so anyone who opens developer tools walks straight past it. It turns away people who wandered in — that is all it is for.',
    langBtn: 'عربي',
    langTitle: 'Switch to Arabic',
    themeTitle: 'Toggle theme',

    profile: 'PROFILE',
    profileOpen: 'Profile',
    close: 'Close',
    saved: 'Saved',
    enteredWith: 'Entered with',
    ownerBadge: 'Owner',
    joined: 'Registered',
    invites: 'INVITATIONS',
    newInvite: 'New invitation',
    copyLink: 'Copy link',
    copyCode: 'Copy code',
    copied: 'Copied',
    forget: 'Forget',
    noInvites: 'Nothing minted on this browser yet.',
    inviteHow: 'A code proves itself by its own shape, so there is no list to keep and you can make as many as you like.',
    inviteLimit: 'A code can be used once per browser. It cannot be revoked, and whoever has it can pass it on — without a server that is as far as this goes.',
    inviteBlunt: 'Anyone who opens developer tools gets in without a code at all.',
    ownerKey: 'Owner key',
    unlock: 'Unlock',
    notOwner: 'That is not the owner key.',
    nowOwner: 'Owner unlocked.'
  },
  ar: {
    brand: 'RULESET',
    gateTitle: 'بدعوة',
    gateSub: 'وصلك رمز من أحدهم. أدخِله واختر اسمًا، وتفتح اللعبة.',
    name: 'الاسم',
    namePh: 'بماذا نناديك',
    code: 'رمز الدعوة',
    enter: 'دخول',
    needName: 'أدخل اسمًا أولًا.',
    badCode: 'هذا الرمز ليس من رموزنا.',
    usedCode: 'استُخدم هذا الرمز على هذا المتصفح من قبل.',
    honest: 'لا يوجد خادم. يجري التحقق من الرمز هنا داخل متصفحك، ومن يفتح أدوات المطوّر يتجاوزه مباشرة. هذا يصدّ من وصل بالمصادفة، لا أكثر.',
    langBtn: 'EN',
    langTitle: 'التبديل إلى الإنجليزية',
    themeTitle: 'تبديل المظهر',

    profile: 'الملف',
    profileOpen: 'الملف',
    close: 'إغلاق',
    saved: 'حُفظ',
    enteredWith: 'دخلت بالرمز',
    ownerBadge: 'المالك',
    joined: 'التسجيل',
    invites: 'الدعوات',
    newInvite: 'دعوة جديدة',
    copyLink: 'نسخ الرابط',
    copyCode: 'نسخ الرمز',
    copied: 'نُسخ',
    forget: 'إزالة',
    noInvites: 'لم تُنشئ أي رمز على هذا المتصفح بعد.',
    inviteHow: 'الرمز يثبت نفسه بشكله، فلا قائمة تُحفظ، ويمكنك إنشاء ما تشاء منها.',
    inviteLimit: 'يُستخدم الرمز مرة واحدة لكل متصفح. لا يمكن إلغاؤه، ومن يملكه يستطيع تمريره — بلا خادم لا يمكن أكثر من هذا.',
    inviteBlunt: 'من يفتح أدوات المطوّر يدخل دون رمز أصلًا.',
    ownerKey: 'مفتاح المالك',
    unlock: 'فتح',
    notOwner: 'هذا ليس مفتاح المالك.',
    nowOwner: 'تم فتح صلاحية المالك.'
  }
};

function lang() {
  try {
    const S = window.RULESET_STATE;
    const l = S && S.data && S.data.lang;
    return STR[l] ? l : 'en';
  } catch (e) { return 'en'; }
}
const T = k => (STR[lang()] && STR[lang()][k]) || STR.en[k] || k;

function isRtl() { return lang() === 'ar'; }

/* ================================================================= dom === */

const el = (tag, cls, parent, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;      // never innerHTML: names are input
  if (parent) parent.appendChild(n);
  return n;
};

function button(cls, parent, text, onClick) {
  const b = el('button', cls, parent, text);
  b.type = 'button';
  if (onClick) b.addEventListener('click', guard(onClick));
  return b;
}

function field(parent, labelText, opts) {
  const wrap = el('label', 'ivt-field', parent);
  el('span', 'ivt-label', wrap, labelText);
  const input = el('input', 'ivt-input' + (opts.mono ? ' ivt-mono' : ''), wrap);
  input.type = 'text';
  input.autocomplete = opts.autocomplete || 'off';
  input.spellcheck = false;
  if (opts.placeholder) input.placeholder = opts.placeholder;
  if (opts.maxLength) input.maxLength = opts.maxLength;
  if (opts.ltr) input.dir = 'ltr';               // a code is not prose
  if (opts.value) input.value = opts.value;
  return input;
}

function flash(btn, text) {
  if (!btn) return;
  const was = btn.textContent;
  btn.textContent = text;
  btn.classList.add('is-done');
  setTimeout(() => {
    try { btn.textContent = was; btn.classList.remove('is-done'); } catch (e) {}
  }, 1400);
}

function copyText(text, btn) {
  const done = () => flash(btn, T('copied'));
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, () => legacyCopy(text, done));
      return;
    }
  } catch (e) {}
  legacyCopy(text, done);
}

function legacyCopy(text, done) {
  try {
    const ta = el('textarea', 'ivt-offscreen', document.body);
    ta.value = text;
    ta.select();
    document.execCommand('copy');
    ta.remove();
    done();
  } catch (e) {}
}

function stamp(at) {
  try {
    const d = new Date(at || Date.now());
    return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) { return ''; }
}

/* ================================================== blocking the game ==== */
/* The gate is opaque, so the game beneath it is not visible. It must not be
   reachable by Tab either — `inert` where it exists, a focus bounce where it
   does not. The game itself keeps booting normally underneath: a level that
   measured itself while hidden would come back wrong. */

let blocked = false;

function appEl() { return document.querySelector('.app'); }

function block() {
  if (blocked) return;
  blocked = true;
  document.documentElement.classList.add('ivt-locked');
  const app = appEl();
  if (app) { try { app.inert = true; } catch (e) {} app.setAttribute('aria-hidden', 'true'); }
  document.addEventListener('focusin', bounce, true);
}

function unblock() {
  if (!blocked) return;
  blocked = false;
  document.documentElement.classList.remove('ivt-locked');
  const app = appEl();
  if (app) { try { app.inert = false; } catch (e) {} app.removeAttribute('aria-hidden'); }
  document.removeEventListener('focusin', bounce, true);
}

const bounce = guard(function (e) {
  if (!gateEl || !e.target) return;
  if (gateEl.contains(e.target)) return;
  const first = gateEl.querySelector('input, button');
  if (first) first.focus();
});

/* ================================================================ gate === */

let gateEl = null;
let draft = { name: '', code: '' };
let gateError = '';

function showGate() {
  if (dead || gateEl) return;
  gateEl = el('div', 'ivt-gate');
  gateEl.id = 'inviteGate';
  gateEl.setAttribute('role', 'dialog');
  gateEl.setAttribute('aria-modal', 'true');
  gateEl.setAttribute('aria-label', 'RULESET — invitation');
  document.body.appendChild(gateEl);
  renderGate(true);
  block();
}

function renderGate(focusIt) {
  if (!gateEl) return;
  gateEl.textContent = '';

  const card = el('div', 'ivt-card', gateEl);

  el('div', 'ivt-brand', card, T('brand')).dir = 'ltr';
  el('h1', 'ivt-title', card, T('gateTitle'));
  el('p', 'ivt-sub', card, T('gateSub'));

  const form = el('form', 'ivt-form', card);
  form.noValidate = true;

  const nameIn = field(form, T('name'), {
    placeholder: T('namePh'), maxLength: NAME_MAX, autocomplete: 'nickname', value: draft.name
  });
  const codeIn = field(form, T('code'), {
    placeholder: 'XXXX-XXXX-XXXX', mono: true, ltr: true, maxLength: 24, value: draft.code
  });
  codeIn.id = 'inviteCode';
  nameIn.id = 'inviteName';

  nameIn.addEventListener('input', () => { draft.name = nameIn.value; });
  codeIn.addEventListener('input', () => { draft.code = codeIn.value; });

  const err = el('p', 'ivt-err', form, gateError);
  err.setAttribute('role', 'alert');
  err.hidden = !gateError;

  const go = el('button', 'ivt-go', form, T('enter'));
  go.type = 'submit';
  go.id = 'inviteEnter';

  form.addEventListener('submit', guard(e => {
    e.preventDefault();
    tryEnter(nameIn.value, codeIn.value);
  }));

  el('p', 'ivt-honest', card, T('honest'));

  /* The bottom bar is behind the gate, so the two preferences a visitor might
     need before they can read the page are repeated here. */
  const foot = el('div', 'ivt-gate-foot', gateEl);
  const lb = button('ivt-chip-btn', foot, T('langBtn'), switchLang);
  lb.title = T('langTitle');
  lb.lang = lang() === 'en' ? 'ar' : 'en';
  const tb = button('ivt-chip-btn', foot, '◐', switchTheme);
  tb.title = T('themeTitle');
  tb.setAttribute('aria-label', T('themeTitle'));

  if (focusIt) setTimeout(() => { try { (draft.code ? nameIn : nameIn).focus(); } catch (e) {} }, 30);
}

function gateFail(key, focusEl) {
  gateError = T(key);
  const err = gateEl && gateEl.querySelector('.ivt-err');
  if (err) { err.textContent = gateError; err.hidden = false; }
  const card = gateEl && gateEl.querySelector('.ivt-card');
  if (card) {
    card.classList.remove('is-wrong');
    void card.offsetWidth;                      // restart the shake
    card.classList.add('is-wrong');
  }
  if (focusEl) { try { focusEl.focus(); focusEl.select && focusEl.select(); } catch (e) {} }
}

function tryEnter(rawName, rawCode) {
  const name = String(rawName || '').trim();
  const codeIn = gateEl && gateEl.querySelector('.ivt-mono');
  const nameIn = gateEl && gateEl.querySelector('#inviteName');
  if (!name) return gateFail('needName', nameIn);

  const res = check(rawCode);
  if (!res) return gateFail('badCode', codeIn);
  if (res.kind === 'invite' && player.used.indexOf(res.code) >= 0) {
    return gateFail('usedCode', codeIn);
  }

  registerPlayer(name, res);
  gateError = '';
  draft = { name: '', code: '' };
  scrubUrl();
  if (gateEl) { gateEl.remove(); gateEl = null; }
  unblock();
  mountChip();
  openPanel();                                  // land somewhere, not nowhere
}

function registerPlayer(name, res) {
  player.name = cut(name, NAME_MAX);
  player.at = player.at || Date.now();
  if (res.kind === 'master') {
    /* The owner's key is never written to storage: a screenshot of devtools
       on his own machine should not hand it to anybody. */
    player.owner = true;
  } else {
    player.code = res.code;
    if (player.used.indexOf(res.code) < 0) player.used.push(res.code);
  }
  write();
}

/* -------------------------------------------------------- preferences --- */

function switchLang() {
  const E = window.RULESET;
  const order = (window.RULESET_I18N && window.RULESET_I18N.ORDER) || ['en'];
  const next = order[(order.indexOf(lang()) + 1) % order.length];
  if (E && typeof E.applyLang === 'function') E.applyLang(next);
  else {
    try {
      const S = window.RULESET_STATE;
      if (S && S.data) { S.data.lang = next; S.saveNow(); }
      document.documentElement.lang = next;
      document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
    } catch (e) {}
  }
  repaint();
}

function switchTheme() {
  const E = window.RULESET;
  const dark = document.documentElement.classList.contains('is-dark');
  if (E && typeof E.applyTheme === 'function') E.applyTheme(dark ? 'light' : 'dark');
  else document.documentElement.classList.toggle('is-dark', !dark);
}

/** Both surfaces are cheap to rebuild, so language changes just redraw them. */
function repaint() {
  if (gateEl) renderGate(false);
  if (panelEl) renderPanel();
  if (chipEl) paintChip();
}

/* =============================================================== panel === */
/* Profile, and — for the owner — the place invitations are made. A centred
   dialog rather than a side sheet: the Vault owns the inline-end edge. */

let panelEl = null, scrimEl = null, lastFocus = null;
let ownerKeyError = '';

function openPanel() {
  if (dead || !registered()) return;
  if (panelEl) { renderPanel(); return; }
  lastFocus = document.activeElement;

  scrimEl = el('div', 'ivt-scrim', document.body);
  scrimEl.addEventListener('click', guard(() => closePanel()));

  panelEl = el('div', 'ivt-panel', document.body);
  panelEl.id = 'invitePanel';
  panelEl.setAttribute('role', 'dialog');
  panelEl.setAttribute('aria-modal', 'true');
  panelEl.setAttribute('aria-label', 'Profile');
  document.addEventListener('keydown', onPanelKey, true);
  renderPanel();
  const first = panelEl.querySelector('input, button');
  if (first) setTimeout(() => { try { first.focus(); } catch (e) {} }, 30);
}

function closePanel() {
  document.removeEventListener('keydown', onPanelKey, true);
  if (panelEl) { panelEl.remove(); panelEl = null; }
  if (scrimEl) { scrimEl.remove(); scrimEl = null; }
  ownerKeyError = '';
  if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  lastFocus = null;
}

const onPanelKey = guard(function (e) {
  if (e.key === 'Escape' && panelEl) { e.preventDefault(); closePanel(); }
});

function renderPanel() {
  if (!panelEl) return;
  panelEl.textContent = '';

  const head = el('div', 'ivt-head', panelEl);
  el('span', 'ivt-head-title', head, T('profile'));
  const x = button('ivt-x', head, '✕', () => closePanel());
  x.title = T('close');
  x.setAttribute('aria-label', T('close'));

  const body = el('div', 'ivt-body', panelEl);

  /* --- who you are ----------------------------------------------------- */
  const nameIn = field(body, T('name'), { maxLength: NAME_MAX, value: player.name, placeholder: T('namePh') });
  nameIn.id = 'inviteNameEdit';
  let t = 0;
  nameIn.addEventListener('input', guard(() => {
    const v = nameIn.value.trim();
    if (!v) return;
    player.name = cut(v, NAME_MAX);
    write();
    paintChip();
    clearTimeout(t);
    t = setTimeout(() => { try { flash(savedTag, T('saved')); } catch (e) {} }, 250);
  }));

  const meta = el('div', 'ivt-meta', body);
  const savedTag = el('span', 'ivt-meta-tag', meta, player.owner ? T('ownerBadge') : T('enteredWith'));
  if (player.owner) savedTag.classList.add('is-owner');
  if (!player.owner && player.code) {
    const c = el('code', 'ivt-meta-code', meta, format(player.code));
    c.dir = 'ltr';
  }
  if (player.at) el('span', 'ivt-meta-at', meta, T('joined') + ' · ' + stamp(player.at));

  /* --- invitations, for the owner only ---------------------------------- */
  if (player.owner) renderInvites(body);
  else renderOwnerKey(body);
}

function renderInvites(body) {
  const sec = el('section', 'ivt-sec', body);
  const h = el('div', 'ivt-sec-head', sec);
  el('span', 'ivt-sec-title', h, T('invites'));
  button('ivt-btn ivt-btn-go', h, T('newInvite'), () => {
    const code = mint();
    player.minted.unshift({ code: code, at: Date.now() });
    player.minted = player.minted.slice(0, MINT_MAX);
    write();
    renderPanel();
    const first = panelEl && panelEl.querySelector('.ivt-invite');
    if (first) first.classList.add('is-new');
  });

  el('p', 'ivt-fine', sec, T('inviteHow'));

  const list = el('div', 'ivt-invites', sec);
  if (!player.minted.length) {
    el('p', 'ivt-empty', list, T('noInvites'));
  } else {
    player.minted.forEach(m => list.appendChild(inviteRow(m)));
  }

  el('p', 'ivt-fine', sec, T('inviteLimit'));
  el('p', 'ivt-fine ivt-blunt', sec, T('inviteBlunt'));
}

function inviteRow(m) {
  const row = el('div', 'ivt-invite');
  const top = el('div', 'ivt-invite-top', row);
  const code = el('code', 'ivt-invite-code', top, format(m.code));
  code.dir = 'ltr';
  if (m.at) el('span', 'ivt-invite-at', top, stamp(m.at));

  const url = linkFor(m.code);
  const link = el('div', 'ivt-invite-link', row, url);
  link.dir = 'ltr';
  link.title = url;

  const acts = el('div', 'ivt-invite-acts', row);
  const b1 = button('ivt-btn', acts, T('copyLink'), () => copyText(url, b1));
  const b2 = button('ivt-btn', acts, T('copyCode'), () => copyText(format(m.code), b2));
  button('ivt-btn ivt-btn-quiet', acts, T('forget'), () => {
    player.minted = player.minted.filter(x => x.code !== m.code);
    write();
    renderPanel();
  });
  return row;
}

/* The owner has to become the owner on his own machine, and he may already
   have registered here with an ordinary code. One field, said plainly. */
function renderOwnerKey(body) {
  const sec = el('section', 'ivt-sec', body);
  const form = el('form', 'ivt-owner', sec);
  form.noValidate = true;
  const input = field(form, T('ownerKey'), { mono: true, ltr: true, maxLength: 24, placeholder: 'XXXX-XXXX-XXXX' });
  input.id = 'inviteOwnerKey';
  const err = el('p', 'ivt-err', form, ownerKeyError);
  err.setAttribute('role', 'alert');
  err.hidden = !ownerKeyError;
  const go = el('button', 'ivt-btn ivt-btn-go', form, T('unlock'));
  go.type = 'submit';

  form.addEventListener('submit', guard(e => {
    e.preventDefault();
    const res = check(input.value);
    if (!res || res.kind !== 'master') {
      ownerKeyError = T('notOwner');
      err.textContent = ownerKeyError;
      err.hidden = false;
      try { input.focus(); input.select(); } catch (e2) {}
      return;
    }
    player.owner = true;
    ownerKeyError = '';
    write();
    renderPanel();
  }));
}

/* ================================================================ chip === */
/* A name in the bottom bar, next to the level name. It is the way back into
   the profile, and for the owner the way to the invitations. */

let chipEl = null;
let keepAlive = 0;

function mountChip() {
  if (dead || !registered() || !gateApplies()) return;
  if (chipEl && chipEl.isConnected) { paintChip(); return; }
  const host = document.querySelector('.bottom-left');
  if (!host) return;

  chipEl = el('button', 'ivt-chip', host);
  chipEl.type = 'button';
  chipEl.id = 'inviteChip';
  const dot = el('span', 'ivt-chip-dot', chipEl);
  dot.setAttribute('aria-hidden', 'true');
  el('span', 'ivt-chip-name', chipEl, '');
  chipEl.addEventListener('click', guard(() => {
    if (panelEl) closePanel(); else openPanel();
  }));
  paintChip();
}

function paintChip() {
  if (!chipEl) return;
  const n = chipEl.querySelector('.ivt-chip-name');
  if (n) n.textContent = player.name || '—';     // textContent: it is their text
  chipEl.title = T('profileOpen');
  chipEl.setAttribute('aria-label', T('profileOpen') + ' — ' + (player.name || ''));
  chipEl.classList.toggle('is-owner', !!player.owner);
}

/* ================================================================= api === */

const API = {
  /* null = decide by hostname. true/false override it, for tests only. */
  _forceGate: null,

  isLocal: isLocal,
  gateApplies: gateApplies,

  mint: mint,
  check: check,
  format: format,
  normalise: normalise,
  link: linkFor,

  get player() {
    return {
      name: player.name, code: player.code, owner: player.owner,
      at: player.at, minted: player.minted.slice(), used: player.used.slice()
    };
  },
  registered: registered,

  /** De-register this browser. Used by tests; deliberately not in the UI. */
  forget() {
    player.name = '';
    player.code = '';
    player.owner = false;
    player.at = 0;
    write();
    closePanel();
    if (chipEl) { chipEl.remove(); chipEl = null; }
    apply();
  },

  open() { openPanel(); },
  close() { closePanel(); },
  isOpen() { return !!panelEl; },
  gateShowing() { return !!gateEl; },

  /** Re-decide, after _forceGate changed or storage was edited by hand. */
  apply() { apply(); },
  failOpen(e) { failOpen(e || new Error('forced')); }
};

window.RULESET_INVITE = API;

/* ================================================================ boot === */

function apply() {
  if (dead) return;
  player = read();

  if (!gateApplies()) {                          // local: no gate, no chip
    if (gateEl) { gateEl.remove(); gateEl = null; }
    unblock();
    if (chipEl) { chipEl.remove(); chipEl = null; }
    return;
  }

  if (registered()) {
    if (gateEl) { gateEl.remove(); gateEl = null; }
    unblock();
    mountChip();
    return;
  }

  const fromUrl = codeFromUrl();
  if (fromUrl && !draft.code) draft.code = format(normalise(fromUrl));
  showGate();
}

/* The theme is applied by game.js on DOMContentLoaded, which is after this
   file runs. Reading the same preference here keeps the gate from painting
   light for one frame on a dark machine. Read-only: game.js is still the one
   source of truth. */
function preTheme() {
  try {
    const raw = JSON.parse(localStorage.getItem('ruleset:v1') || 'null');
    const theme = raw && typeof raw.theme === 'string' ? raw.theme : null;
    const dark = theme === 'dark' ||
      (!theme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('is-dark');
  } catch (e) {}
}

function boot() {
  try {
    if (window.RULESET_INVITE_CRASH) throw new Error('invite: forced failure (test hook)');
    if (window.RULESET_INVITE_FORCE === true) API._forceGate = true;
    if (window.RULESET_INVITE_FORCE === false) API._forceGate = false;

    if (gateApplies()) preTheme();
    apply();

    /* The bottom bar is rebuilt by levels that take it over, so the chip is
       re-hung when it goes missing — the same cheap watch the Vault uses. */
    keepAlive = setInterval(guard(() => {
      if (!gateApplies() || !registered()) return;
      if (!chipEl || !chipEl.isConnected) { chipEl = null; mountChip(); }
    }), 1500);

    /* language changes come from the game's own toggle too */
    try {
      if (window.RULESET_STATE && window.RULESET_STATE.onChange) {
        window.RULESET_STATE.onChange(guard(() => { if (chipEl || panelEl) repaint(); }));
      }
    } catch (e) {}
  } catch (err) {
    failOpen(err);
  }
}

/* Runs during parse — the script tag is at the end of the body, so .app is
   already there and the gate can be up before the first paint. */
try {
  if (document.body) boot();
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', guard(boot));
  else boot();
} catch (err) {
  failOpen(err);
}

})();
