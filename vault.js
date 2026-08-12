/* ==========================================================================
   RULESET — THE VAULT
   --------------------------------------------------------------------------
   A private notebook inside the game. Everything in it was put there by the
   player, by hand, on purpose.

   THE RULE THIS FILE EXISTS TO OBEY:

     The Vault never knows anything the player does not.

   It does not decode, does not suggest, does not autocomplete, does not mark
   a hypothesis correct, and does not reach into Echo Memory. It has no reader
   for `echoMemory` and never asks for one — a player who writes "VE = MOVE"
   wrote that themselves, and a player who is wrong stays wrong until they
   work it out. That asymmetry is the entire design.

   PERSISTENCE: its own localStorage key, deliberately NOT the game save.
   Three reasons, in order of importance:
     1. "Start over" erases game progress. A player's own written notes are
        not progress, and losing a month of hypotheses to a replay would be
        indefensible.
     2. Separation from Echo Memory becomes structural rather than a promise:
        this file never loads the store that holds marks, so it cannot leak
        them however carelessly it is edited later.
     3. The v1-compatible game save is read by live.js and four ECHO systems.
        A notebook has no business in it.

   It is also never required. Ignore it completely and every puzzle in
   RULESET remains solvable.
   ========================================================================== */

(function () {
'use strict';

/* ================================================================ store == */

const KEY = 'ruleset:vault';
const SCHEMA = 1;
const MAX_ITEMS = 400;
const MAX_BODY = 2000;

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const cut = (s, n) => String(s == null ? '' : s).slice(0, n || 200);

const KINDS = ['note', 'pin', 'rule'];
const CONFIDENCE = ['question', 'likely', 'certain'];
const RELS = ['=', '≈', '→', '≠', '?'];

/* One table, read by BOTH the live editor and the loader. They used to carry
   separate numbers, so a rule side longer than 80 characters was accepted by
   the panel, shown back to the player, saved — and then quietly shortened on
   the next reload. Silent truncation of a player's own writing is the one
   failure a notebook cannot have. */
const LIMITS = {
  id: 32, title: 120, body: MAX_BODY, text: 240,
  left: 80, rel: 12, right: 80,
  stageKey: 24, stageName: 60, tag: 24
};
const TAGS_MAX = 8;

/** The one place a field is coerced. Unknown keys, and id/kind, never land. */
function assign(it, fields) {
  Object.keys(fields || {}).forEach(k => {
    const v = fields[k];
    if (k === 'id' || k === 'kind') return;
    if (k === 'tags') {
      const list = Array.isArray(v) ? v : String(v == null ? '' : v).split(',');
      it.tags = list.map(t => cut(t, LIMITS.tag).trim()).filter(Boolean).slice(0, TAGS_MAX);
    } else if (k === 'confidence') {
      if (CONFIDENCE.indexOf(v) >= 0) it.confidence = v;
    } else if (k === 'at') {
      if (Number.isFinite(v)) it.at = v;
    } else if (k === 'stageKey') {
      it.stageKey = v == null ? null : cut(v, LIMITS.stageKey);
    } else if (Object.prototype.hasOwnProperty.call(LIMITS, k)) {
      it[k] = cut(v, LIMITS[k]);
    }
  });
  return it;
}

function blank() { return { v: SCHEMA, seen: false, items: [], links: [] }; }

/** Trust nothing on the way in: a corrupt file degrades to empty, never throws. */
function migrate(raw) {
  const d = blank();
  if (!raw || typeof raw !== 'object') return d;
  if (raw.seen === true) d.seen = true;

  if (Array.isArray(raw.items)) {
    d.items = raw.items
      .filter(it => it && typeof it === 'object' && typeof it.id === 'string' && KINDS.indexOf(it.kind) >= 0)
      .slice(0, MAX_ITEMS)
      .map(it => ({
        id: cut(it.id, LIMITS.id),
        kind: it.kind,
        title: cut(it.title, LIMITS.title),
        body: cut(it.body, LIMITS.body),
        text: cut(it.text, LIMITS.text),
        left: cut(it.left, LIMITS.left),
        rel: cut(it.rel, LIMITS.rel),
        right: cut(it.right, LIMITS.right),
        confidence: CONFIDENCE.indexOf(it.confidence) >= 0 ? it.confidence : 'question',
        stageKey: it.stageKey == null ? null : cut(it.stageKey, LIMITS.stageKey),
        stageName: cut(it.stageName, LIMITS.stageName),
        tags: Array.isArray(it.tags)
          ? it.tags.filter(t => typeof t === 'string').map(t => cut(t, LIMITS.tag)).slice(0, TAGS_MAX)
          : [],
        at: Number.isFinite(it.at) ? it.at : Date.now()
      }));
  }

  if (Array.isArray(raw.links)) {
    const ids = new Set(d.items.map(i => i.id));
    d.links = raw.links
      .filter(l => l && typeof l === 'object' && ids.has(l.a) && ids.has(l.b) && l.a !== l.b)
      .map(l => ({ id: cut(l.id, 32) || uid(), a: l.a, b: l.b, at: Number.isFinite(l.at) ? l.at : Date.now() }))
      .slice(0, 400);
  }
  return d;
}

let data;
try { data = migrate(JSON.parse(localStorage.getItem(KEY) || 'null')); }
catch (e) { data = blank(); }

let pending = 0;
function write() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
function save() { if (pending) return; pending = setTimeout(() => { pending = 0; write(); }, 80); }
function saveNow() { if (pending) { clearTimeout(pending); pending = 0; } write(); }

if (typeof window !== 'undefined') {
  const flush = () => { if (pending) saveNow(); };
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);
}

/* ============================================================== strings == */

const STR = {
  en: {
    vault: 'THE VAULT', close: 'Close',
    introA: 'Nothing is saved automatically.',
    introB: 'Keep what YOU think matters.',
    notes: 'Notes', pins: 'Pins', rules: 'Rules', links: 'Links',
    newNote: 'New note', capture: 'Capture', newRule: 'New rule',
    search: 'Search…', allStages: 'All stages', allTags: 'All tags',
    byStage: 'Filter by stage', byTag: 'Filter by tag', relation: 'Relation',
    title: 'Title', body: 'Write anything…', tags: 'tags, comma separated',
    left: 'left', right: 'right', ruleNote: 'note (optional)',
    question: 'question', likely: 'likely', certain: 'certain',
    link: 'Link', linking: 'Pick another card to link it to', cancel: 'Cancel',
    unlink: 'Remove link', del: 'Delete', up: 'Up', down: 'Down',
    empty: 'Nothing here yet.',
    emptyPins: 'Nothing pinned yet. Use Capture while a puzzle is open.',
    emptyLinks: 'No connections yet. Use Link on any card.',
    captureOn: 'Pick something on screen to keep',
    captureNone: 'That cannot be kept',
    captureAria: 'Capture text from the screen',
    saveThought: 'Save a thought',
    clear: 'Empty the vault', sure: 'Erase everything?',
    kept: 'kept', from: 'from',
    oneLink: 'connection', manyLinks: 'connections'
  },
  ar: {
    vault: 'الخزانة', close: 'إغلاق',
    introA: 'لا شيء يُحفظ تلقائيًا.',
    introB: 'احتفظ بما تراه أنت مهمًا.',
    notes: 'ملاحظات', pins: 'مقتطفات', rules: 'قواعد', links: 'روابط',
    newNote: 'ملاحظة جديدة', capture: 'التقاط', newRule: 'قاعدة جديدة',
    search: 'بحث…', allStages: 'كل المراحل', allTags: 'كل الوسوم',
    byStage: 'تصفية حسب المرحلة', byTag: 'تصفية حسب الوسم', relation: 'العلاقة',
    title: 'العنوان', body: 'اكتب ما تشاء…', tags: 'وسوم مفصولة بفواصل',
    left: 'الطرف الأول', right: 'الطرف الثاني', ruleNote: 'ملاحظة (اختياري)',
    question: 'سؤال', likely: 'مرجّح', certain: 'مؤكّد',
    link: 'اربط', linking: 'اختر بطاقة أخرى للربط', cancel: 'إلغاء',
    unlink: 'إزالة الرابط', del: 'حذف', up: 'أعلى', down: 'أسفل',
    empty: 'لا شيء هنا بعد.',
    emptyPins: 'لا مقتطفات بعد. استخدم «التقاط» أثناء اللغز.',
    emptyLinks: 'لا روابط بعد. استخدم «اربط» على أي بطاقة.',
    captureOn: 'اختر شيئًا على الشاشة للاحتفاظ به',
    captureNone: 'لا يمكن الاحتفاظ بهذا',
    captureAria: 'التقاط نص من الشاشة',
    saveThought: 'احفظ فكرة',
    clear: 'إفراغ الخزانة', sure: 'محو كل شيء؟',
    kept: 'محفوظ', from: 'من',
    oneLink: 'رابط', manyLinks: 'روابط'
  }
};

function lang() {
  const S = window.RULESET_STATE;
  const l = S && S.data && S.data.lang;
  return STR[l] ? l : 'en';
}
const T = k => STR[lang()][k] || STR.en[k] || k;

/* ============================================================ the stage == */
/* Which puzzle is open, expressed the way the player sees it. Break stages
   have internal route ids ('B07') that must never reach the screen, so the
   key is kept for filtering and only the NAME is ever displayed. */

function currentStage() {
  const E = window.RULESET;
  const lv = E && E.ctx && E.ctx.level;
  if (!lv) return { key: null, name: '' };
  const key = lv.id != null ? String(lv.id) : (lv.routeId || null);
  let name = lv.name;
  if (name && typeof name === 'object') name = name[lang()] != null ? name[lang()] : name.en;
  return { key: key, name: cut(name || '', 60) };
}

/* ---------------------------------------------------------- unlocking --- */
/* After B03. Before that there is no icon, no panel, and no trace of it. */

const UNLOCK = 'B03';
function unlocked() {
  const S = window.RULESET_STATE;
  const solved = S && S.data && S.data.solved;
  return Array.isArray(solved) && solved.indexOf(UNLOCK) >= 0;
}

/* ============================================================== pausing == */
/* Opening the Vault stops the level's frame callbacks and win checks, so a
   puzzle cannot run on — or quietly solve itself — while the player is
   writing. Restoring is guarded on the context identity: if the level changed
   underneath us, the old arrays belong to a level that no longer exists. */

let paused = null;

function pause() {
  const ctx = window.RULESET && window.RULESET.ctx;
  if (!ctx || paused) return;
  paused = { ctx: ctx, frames: ctx._frames, checks: ctx._checks };
  ctx._frames = [];
  ctx._checks = [];
}

function resume() {
  if (!paused) return;
  const ctx = window.RULESET && window.RULESET.ctx;
  if (ctx && ctx === paused.ctx) {
    ctx._frames = paused.frames;
    ctx._checks = paused.checks;
  }
  paused = null;
}

/* ============================================================== the api == */

const Vault = {
  get data() { return data; },
  unlocked: unlocked,

  items(kind) { return kind ? data.items.filter(i => i.kind === kind) : data.items.slice(); },
  item(id) { return data.items.find(i => i.id === id) || null; },
  links() { return data.links.slice(); },

  /* `fields` is whatever a caller hands over — the dev panel, a test, a future
     button. It goes through the same coercion the editor uses, so nothing can
     put an item into the store in a shape the renderer cannot draw. */
  add(kind, fields) {
    if (KINDS.indexOf(kind) < 0 || data.items.length >= MAX_ITEMS) return null;
    const st = currentStage();
    const it = {
      id: uid(), kind: kind,
      title: '', body: '', text: '',
      left: '', rel: '=', right: '',
      confidence: 'question',
      stageKey: st.key, stageName: st.name,
      tags: [], at: Date.now()
    };
    assign(it, fields);
    it.id = uid();          // never the caller's: ids are the link graph
    it.kind = kind;
    data.items.unshift(it);
    save();
    return it;
  },

  update(id, fields) {
    const it = this.item(id);
    if (!it) return null;
    assign(it, fields);
    save();
    return it;
  },

  remove(id) {
    const i = data.items.findIndex(x => x.id === id);
    if (i < 0) return false;
    data.items.splice(i, 1);
    data.links = data.links.filter(l => l.a !== id && l.b !== id);
    save();
    return true;
  },

  /** Swap with the neighbouring item of the same kind. */
  move(id, dir) {
    const kind = (this.item(id) || {}).kind;
    const sameKind = data.items.filter(i => i.kind === kind);
    const at = sameKind.findIndex(i => i.id === id);
    const to = at + (dir < 0 ? -1 : 1);
    if (at < 0 || to < 0 || to >= sameKind.length) return false;
    const a = data.items.indexOf(sameKind[at]);
    const b = data.items.indexOf(sameKind[to]);
    const tmp = data.items[a];
    data.items[a] = data.items[b];
    data.items[b] = tmp;
    save();
    return true;
  },

  link(a, b) {
    if (a === b || !this.item(a) || !this.item(b)) return null;
    const has = data.links.some(l =>
      (l.a === a && l.b === b) || (l.a === b && l.b === a));
    if (has) return null;
    const l = { id: uid(), a: a, b: b, at: Date.now() };
    data.links.push(l);
    save();
    return l;
  },

  unlink(id) {
    const i = data.links.findIndex(l => l.id === id);
    if (i < 0) return false;
    data.links.splice(i, 1);
    save();
    return true;
  },

  /* Emptying the vault is not meeting it again: the one sentence it ever says
     stays said. */
  clear() { const seen = data.seen; data = blank(); data.seen = seen; saveNow(); },
  saveNow: saveNow,

  /* The panel, for the dev panel and for tests. `open()` with no argument
     opens — it is not a toggle, and a bare open() that closed would be a trap. */
  open() { open(true); },
  close() { open(false); },
  toggle() { open(!root || root.hidden); },
  isOpen() { return !!root && !root.hidden; }
};

window.RULESET_VAULT = Vault;

/* ================================================================== ui === */

const el = (tag, cls, parent, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  if (parent) parent.appendChild(n);
  return n;
};

let root = null, body = null, tabsEl = null, icon = null, captureBtn = null;
let tab = 'note';
let query = '', stageFilter = '', tagFilter = '';
let linkFrom = null;

const TABS = [['note', 'notes'], ['pin', 'pins'], ['rule', 'rules'], ['link', 'links']];

/* ============================================================ dropdowns == */
/* The filters used to be bare <select>s. A native select arrives wearing the
   operating system's chrome — its own gradient, its own spinner, its own
   font — and belongs to no part of this interface. This is the same control
   drawn in the Vault's own language.

   The <select> stays underneath as the MODEL: it holds the value, it fires
   `change`, and anything that sets `.value` from outside still moves the
   control. The button and the listbox are only a view of it. Keeping a real
   form field means the value has one home rather than two. */

let pickSeq = 0;
const openMenus = [];

function closeMenus(inside) {
  openMenus.slice().forEach(d => {
    if (inside && !(d.wrap.closest && d.wrap.closest(inside))) return;
    d.close(false);
  });
}

function dropdown(parent, opts) {
  opts = opts || {};
  const wrap = el('div', 'vault-pick-wrap' + (opts.wrapClass ? ' ' + opts.wrapClass : ''), parent);

  const sel = el('select', 'vault-native' + (opts.selClass ? ' ' + opts.selClass : ''), wrap);
  sel.setAttribute('tabindex', '-1');
  sel.setAttribute('aria-hidden', 'true');

  const btn = el('button', 'vault-pick', wrap);
  btn.type = 'button';
  btn.id = 'vaultPick' + (++pickSeq);
  const lab = el('span', 'vault-pick-label', btn, '');
  el('span', 'vault-pick-caret', btn);

  const menu = el('div', 'vault-menu', wrap);
  menu.id = btn.id + '-menu';
  menu.hidden = true;
  menu.setAttribute('role', 'listbox');

  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', menu.id);
  if (opts.label) {
    btn.setAttribute('aria-label', opts.label);
    btn.title = opts.label;
    menu.setAttribute('aria-label', opts.label);
  }

  let entries = [], sig = null, active = 0, shown = false;
  const optEls = [];

  const idxOf = v => { for (let i = 0; i < entries.length; i++) if (entries[i].value === v) return i; return -1; };

  function paintActive() {
    optEls.forEach((o, i) => o.classList.toggle('is-active', i === active));
    const a = optEls[active];
    if (a) {
      btn.setAttribute('aria-activedescendant', a.id);
      if (a.scrollIntoView) a.scrollIntoView({ block: 'nearest' });
    } else btn.removeAttribute('aria-activedescendant');
  }

  function paintValue() {
    const i = idxOf(sel.value);
    const e = entries[i] || entries[0] || null;
    lab.textContent = e ? e.label : '';
    wrap.classList.toggle('is-set', !!(e && e.value));
    optEls.forEach((o, k) => {
      o.setAttribute('aria-selected', k === i ? 'true' : 'false');
      o.classList.toggle('is-on', k === i);
    });
  }

  /* Rebuilt only when the list actually changed: `render()` runs on every
     keystroke in the search field, and tearing the menu down under an open
     dropdown would make it flicker shut while the player is reading it. */
  function set(list) {
    const next = list.map(e => e.value + ' ' + e.label).join('');
    if (next === sig) { paintValue(); return; }
    sig = next;
    const was = sel.value;
    entries = list.slice();
    sel.textContent = '';
    menu.textContent = '';
    optEls.length = 0;
    entries.forEach((e, i) => {
      const o = el('option', null, sel, e.label);
      o.value = e.value;
      /* the option's VALUE never reaches the visible DOM — a Break stage's
         route id is a filter key, never a label */
      const d = el('div', 'vault-opt', menu);
      d.id = menu.id + '-o' + i;
      d.setAttribute('role', 'option');
      d.setAttribute('aria-selected', 'false');
      el('span', 'vault-opt-t', d, e.label);
      d.addEventListener('click', () => choose(i));
      d.addEventListener('pointerover', () => { active = i; paintActive(); });
      optEls.push(d);
    });
    sel.value = idxOf(was) >= 0 ? was : (entries[0] ? entries[0].value : '');
    active = Math.max(0, idxOf(sel.value));
    paintValue();
    if (shown) paintActive();
  }

  function choose(i) {
    const e = entries[i];
    if (e) { sel.value = e.value; paintValue(); }
    close(true);
    if (e && opts.onChange) opts.onChange(sel.value);
  }

  function away(e) {
    const t = e.target;
    if (t && t.closest && t.closest('.vault-pick-wrap') === wrap) return;
    close(false);
  }

  function show(from) {
    if (shown || !entries.length) return;
    closeMenus();
    shown = true;
    menu.hidden = false;
    wrap.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    active = from != null && from >= 0 ? from : Math.max(0, idxOf(sel.value));
    /* a card near the foot of a scrolling list opens upward instead */
    if (btn.getBoundingClientRect && typeof window !== 'undefined' && window.innerHeight) {
      const b = btn.getBoundingClientRect();
      const need = Math.min(entries.length * 30 + 12, 240);
      wrap.classList.toggle('is-up', window.innerHeight - b.bottom < need && b.top > need);
    }
    paintActive();
    document.addEventListener('pointerdown', away, true);
    openMenus.push(api);
  }

  function close(back) {
    const i = openMenus.indexOf(api);
    if (i >= 0) openMenus.splice(i, 1);
    if (!shown) return;
    shown = false;
    menu.hidden = true;
    wrap.classList.remove('is-open');
    wrap.classList.remove('is-up');
    btn.setAttribute('aria-expanded', 'false');
    btn.removeAttribute('aria-activedescendant');
    document.removeEventListener('pointerdown', away, true);
    if (back && btn.focus) btn.focus();
  }

  function step(d) {
    if (!entries.length) return;
    active = (active + d + entries.length) % entries.length;
    paintActive();
  }

  /* pointerdown, not click: it is the toggle, and a click handler as well
     would fight the Enter key, which synthesises one */
  btn.addEventListener('pointerdown', e => {
    if (e.button != null && e.button !== 0) return;
    if (shown) close(false); else show();
  });

  btn.addEventListener('keydown', e => {
    const k = e.key;
    const stop = () => { if (e.preventDefault) e.preventDefault(); };
    if (!shown) {
      if (k === 'Enter' || k === ' ' || k === 'Spacebar' || k === 'ArrowDown' || k === 'ArrowUp') {
        stop();
        show(k === 'ArrowUp' ? entries.length - 1 : null);
      }
      return;
    }
    if (k === 'ArrowDown') { stop(); step(1); }
    else if (k === 'ArrowUp') { stop(); step(-1); }
    else if (k === 'Home') { stop(); active = 0; paintActive(); }
    else if (k === 'End') { stop(); active = entries.length - 1; paintActive(); }
    else if (k === 'Enter' || k === ' ' || k === 'Spacebar') { stop(); choose(active); }
    else if (k === 'Escape' || k === 'Esc') {
      stop();
      if (e.stopPropagation) e.stopPropagation();
      close(true);
    } else if (k === 'Tab') close(false);
  });

  /* the model moving — from a test, or from anything that sets .value */
  sel.addEventListener('change', () => {
    paintValue();
    if (opts.onChange) opts.onChange(sel.value);
  });

  const api = {
    wrap: wrap, sel: sel, btn: btn, menu: menu,
    set: set, close: close,
    value() { return sel.value; },
    setValue(v) { if (idxOf(v) >= 0) { sel.value = v; paintValue(); } }
  };
  return api;
}

function build() {
  if (root) return;

  root = el('aside', 'vault');
  root.id = 'vault';
  root.hidden = true;
  root.setAttribute('aria-label', 'Vault');

  /* header */
  const head = el('div', 'vault-head', root);
  el('span', 'vault-title', head, T('vault'));
  const x = el('button', 'vault-x', head, '✕');
  x.type = 'button';
  x.title = T('close');
  x.addEventListener('click', () => open(false));

  /* the one thing it ever says on its own */
  const intro = el('div', 'vault-intro', root);
  intro.hidden = !!data.seen;
  el('div', 'vault-intro-a', intro, T('introA'));
  el('div', 'vault-intro-b', intro, T('introB'));

  /* tabs */
  tabsEl = el('nav', 'vault-tabs', root);
  TABS.forEach(([kind, label]) => {
    const b = el('button', 'vault-tab' + (kind === tab ? ' is-on' : ''), tabsEl, T(label));
    b.type = 'button';
    b.dataset.tab = kind;
    b.addEventListener('click', () => {
      tab = kind;
      [...tabsEl.children].forEach(c => c.classList.toggle('is-on', c.dataset.tab === kind));
      render();
    });
  });

  /* tools */
  const tools = el('div', 'vault-tools', root);

  const search = el('input', 'vault-input vault-search', tools);
  search.type = 'search';
  search.placeholder = T('search');
  search.addEventListener('input', () => { query = search.value.toLowerCase(); render(); });

  const filters = el('div', 'vault-filters', tools);
  root.__stageDD = dropdown(filters, {
    selClass: 'vault-sel', label: T('byStage'),
    onChange: v => { stageFilter = v; render(); }
  });
  root.__tagDD = dropdown(filters, {
    selClass: 'vault-sel', label: T('byTag'),
    onChange: v => { tagFilter = v; render(); }
  });

  /* The three siblings read as one row: the leading + is drawn by the
     stylesheet so all three carry exactly the same mark, and the label alone
     stays the button's text. */
  const acts = el('div', 'vault-acts', tools);
  const bNote = el('button', 'vault-btn vault-add', acts, T('newNote'));
  bNote.type = 'button';
  bNote.setAttribute('aria-label', T('newNote'));
  bNote.addEventListener('click', () => { tab = 'note'; syncTabs(); newItem('note'); });

  const bPin = el('button', 'vault-btn vault-add', acts, T('capture'));
  bPin.type = 'button';
  bPin.setAttribute('aria-label', T('captureAria'));
  bPin.title = T('captureAria');
  bPin.setAttribute('aria-pressed', 'false');
  bPin.addEventListener('click', () => startCapture());
  captureBtn = bPin;

  const bRule = el('button', 'vault-btn vault-add', acts, T('newRule'));
  bRule.type = 'button';
  bRule.setAttribute('aria-label', T('newRule'));
  bRule.addEventListener('click', () => { tab = 'rule'; syncTabs(); newItem('rule'); });

  body = el('div', 'vault-body', root);

  /* footer */
  const foot = el('div', 'vault-foot', root);
  const count = el('span', 'vault-count', foot, '');
  root.__count = count;
  const wipe = el('button', 'vault-btn vault-danger', foot, T('clear'));
  wipe.type = 'button';
  let armed = 0;
  wipe.addEventListener('click', () => {
    if (Date.now() < armed) {
      Vault.clear();
      armed = 0;
      wipe.textContent = T('clear');
      wipe.classList.remove('is-armed');
      render();
      return;
    }
    armed = Date.now() + 3000;
    wipe.textContent = T('sure');
    wipe.classList.add('is-armed');
    setTimeout(() => {
      if (Date.now() >= armed) { wipe.textContent = T('clear'); wipe.classList.remove('is-armed'); }
    }, 3100);
  });

  document.body.appendChild(root);

  /* scrim for the mobile sheet / click-away on desktop */
  const scrim = el('div', 'vault-scrim');
  scrim.addEventListener('click', () => open(false));
  document.body.appendChild(scrim);
  root.__scrim = scrim;
}

function syncTabs() {
  if (!tabsEl) return;
  [...tabsEl.children].forEach(c => c.classList.toggle('is-on', c.dataset.tab === tab));
}

/* ------------------------------------------------------------- the icon - */

/* The icon tracks the unlock in both directions. Mounting only was enough
   until "Start over" — which empties `solved`, taking B03 with it. The Vault
   went back to locked, `V` stopped working and the success card dropped its
   line, but the icon stayed in the bottom bar and still opened a panel for a
   season the player had not reached yet. */
function syncIcon() {
  if (unlocked()) { mountIcon(); if (icon) icon.title = T('vault'); }
  else unmountIcon();
}

function unmountIcon() {
  if (!icon) return;
  icon.remove();
  icon = null;
  if (root && !root.hidden) open(false);
}

function mountIcon() {
  if (icon || !unlocked()) return;
  const host = document.querySelector('.bottom-left');
  if (!host) return;

  icon = document.createElement('button');
  icon.type = 'button';
  icon.className = 'vault-icon';
  icon.title = T('vault');
  icon.setAttribute('aria-label', T('vault'));
  icon.innerHTML =
    '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">' +
    '<rect x="2.5" y="1.75" width="11" height="12.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.3"/>' +
    '<path d="M5.6 5.4h4.8M5.6 8h4.8M5.6 10.6h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>' +
    '</svg>';
  icon.addEventListener('click', () => open(true));
  host.appendChild(icon);
}

/* -------------------------------------------------------------- opening - */

function open(on) {
  build();
  if (on) {
    pause();
    root.hidden = false;
    /* the scrim covers the whole window, so it must never come back while
       capture is armed — that is what made every pick land on nothing */
    if (!capturing) root.__scrim.classList.add('is-on');
    document.documentElement.classList.add('vault-open');
    if (!data.seen) { data.seen = true; save(); }
    render();
  } else {
    stopCapture(true);
    closeMenus();
    linkFrom = null;
    root.hidden = true;
    root.__scrim.classList.remove('is-on');
    document.documentElement.classList.remove('vault-open');
    const intro = root.querySelector('.vault-intro');
    if (intro) intro.hidden = true;
    resume();
  }
}

/* ============================================================= rendering = */

function matches(it) {
  if (stageFilter && it.stageKey !== stageFilter) return false;
  if (tagFilter && it.tags.indexOf(tagFilter) < 0) return false;
  if (!query) return true;
  const hay = [it.title, it.body, it.text, it.left, it.rel, it.right, it.stageName]
    .concat(it.tags).join(' ').toLowerCase();
  return hay.indexOf(query) >= 0;
}

function refreshFilters() {
  const stages = [];
  const seenKeys = {};
  data.items.forEach(i => {
    if (!i.stageKey || seenKeys[i.stageKey]) return;
    seenKeys[i.stageKey] = 1;
    stages.push({ key: i.stageKey, name: i.stageName || i.stageKey });
  });

  const tags = [];
  data.items.forEach(i => i.tags.forEach(t => { if (tags.indexOf(t) < 0) tags.push(t); }));

  /* stages are listed by NAME. Break stages carry internal ids that must
     never be shown, so the value is the key and the label never is. */
  root.__stageDD.set([{ value: '', label: T('allStages') }]
    .concat(stages.map(s => ({ value: s.key, label: s.name || '—' }))));
  root.__tagDD.set([{ value: '', label: T('allTags') }]
    .concat(tags.map(t => ({ value: t, label: t }))));
  stageFilter = root.__stageDD.value();
  tagFilter = root.__tagDD.value();
}

function render() {
  if (!root || root.hidden) return;
  /* a dropdown living on a card is about to be destroyed under itself */
  closeMenus('.vault-body');
  refreshFilters();
  body.textContent = '';

  if (tab === 'link') { renderLinks(); }
  else {
    const list = data.items.filter(i => i.kind === tab && matches(i));
    if (!list.length) {
      el('div', 'vault-empty', body, tab === 'pin' ? T('emptyPins') : T('empty'));
    } else {
      list.forEach(it => body.appendChild(card(it)));
    }
  }

  const n = data.links.length;
  root.__count.textContent = data.items.length + ' ' + T('kept') +
    (n ? '  ·  ' + n + ' ' + T(n === 1 ? 'oneLink' : 'manyLinks') : '');
}

function stamp(at) {
  const d = new Date(at || Date.now());
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
         d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function shortOf(it) {
  if (it.kind === 'rule') return [it.left, it.rel, it.right].filter(Boolean).join(' ');
  if (it.kind === 'pin') return it.text;
  return it.title || (it.body || '').slice(0, 40) || T('newNote');
}

function card(it) {
  const c = el('div', 'vault-card is-' + it.kind);
  if (linkFrom && linkFrom !== it.id) c.classList.add('is-linkable');
  if (linkFrom === it.id) c.classList.add('is-linksrc');

  /* meta line: where it came from, and when */
  const meta = el('div', 'vault-meta', c);
  el('span', 'vault-stage', meta, it.stageName || '—');
  el('span', 'vault-at', meta, stamp(it.at));

  if (it.kind === 'note') {
    const title = el('input', 'vault-input vault-title-in', c);
    title.value = it.title;
    title.placeholder = T('title');
    title.addEventListener('input', () => Vault.update(it.id, { title: title.value }));

    const ta = el('textarea', 'vault-input vault-body-in', c);
    ta.value = it.body;
    ta.placeholder = T('body');
    ta.rows = 3;
    ta.addEventListener('input', () => Vault.update(it.id, { body: ta.value }));
    c.__focus = ta;

    const tags = el('input', 'vault-input vault-tags-in', c);
    tags.value = it.tags.join(', ');
    tags.placeholder = T('tags');
    tags.addEventListener('change', () => { Vault.update(it.id, { tags: tags.value }); render(); });
  }

  if (it.kind === 'pin') {
    el('div', 'vault-pin-text', c, it.text);
    const note = el('input', 'vault-input', c);
    note.value = it.body;
    note.placeholder = T('body');
    note.addEventListener('input', () => Vault.update(it.id, { body: note.value }));
    c.__focus = note;
  }

  if (it.kind === 'rule') {
    const row = el('div', 'vault-rule-row', c);
    const left = el('input', 'vault-input vault-side', row);
    left.value = it.left;
    left.placeholder = T('left');
    left.addEventListener('input', () => Vault.update(it.id, { left: left.value }));

    const rel = dropdown(row, {
      wrapClass: 'vault-rel', label: T('relation'),
      onChange: v => Vault.update(it.id, { rel: v })
    });
    rel.set(RELS.map(r => ({ value: r, label: r })));
    rel.setValue(RELS.indexOf(it.rel) >= 0 ? it.rel : '=');

    const right = el('input', 'vault-input vault-side', row);
    right.value = it.right;
    right.placeholder = T('right');
    right.addEventListener('input', () => Vault.update(it.id, { right: right.value }));
    c.__focus = left;

    const note = el('input', 'vault-input', c);
    note.value = it.body;
    note.placeholder = T('ruleNote');
    note.addEventListener('input', () => Vault.update(it.id, { body: note.value }));

    /* The player's own confidence. Never the game's verdict — which is why
       nothing here ever turns the success colour. */
    const conf = el('div', 'vault-conf', c);
    CONFIDENCE.forEach(level => {
      const b = el('button', 'vault-conf-b' + (it.confidence === level ? ' is-on' : ''), conf, T(level));
      b.type = 'button';
      b.addEventListener('click', () => { Vault.update(it.id, { confidence: level }); render(); });
    });
  }

  /* actions */
  const acts = el('div', 'vault-card-acts', c);
  const mk = (label, fn, cls) => {
    const b = el('button', 'vault-mini' + (cls ? ' ' + cls : ''), acts, label);
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  };
  mk('↑', () => { Vault.move(it.id, -1); render(); }).title = T('up');
  mk('↓', () => { Vault.move(it.id, 1); render(); }).title = T('down');
  mk(T('link'), () => {
    if (linkFrom && linkFrom !== it.id) { Vault.link(linkFrom, it.id); linkFrom = null; }
    else linkFrom = linkFrom === it.id ? null : it.id;
    render();
  });
  mk(T('del'), () => { Vault.remove(it.id); render(); }, 'vault-danger');

  if (linkFrom && linkFrom !== it.id) {
    c.addEventListener('click', e => {
      if (e.target.closest('.vault-card-acts, input, textarea, select, button')) return;
      Vault.link(linkFrom, it.id);
      linkFrom = null;
      render();
    });
  }
  return c;
}

function renderLinks() {
  if (linkFrom) el('div', 'vault-note-line', body, T('linking'));
  if (!data.links.length) { el('div', 'vault-empty', body, T('emptyLinks')); return; }

  data.links.slice().reverse().forEach(l => {
    const a = Vault.item(l.a), b = Vault.item(l.b);
    if (!a || !b) return;
    const row = el('div', 'vault-link', body);
    el('span', 'vault-link-end', row, shortOf(a) || '—');
    el('span', 'vault-link-mid', row, '—');
    el('span', 'vault-link-end', row, shortOf(b) || '—');
    const x = el('button', 'vault-mini vault-danger', row, '✕');
    x.type = 'button';
    x.title = T('unlink');
    x.addEventListener('click', () => { Vault.unlink(l.id); render(); });
  });
}

function newItem(kind, fields) {
  const it = Vault.add(kind, fields);
  if (!it) return null;
  query = ''; stageFilter = ''; tagFilter = '';
  const s = root.querySelector('.vault-search');
  if (s) s.value = '';
  render();
  const first = body.querySelector('.vault-card');
  if (first && first.__focus) first.__focus.focus();
  return it;
}

/* ============================================================== capture == */
/* Pick something that is genuinely on screen. Only the visible text is kept:
   never a dataset, never engine state, never anything the player could not
   already read. Puzzle objects are not modified to make them capturable. */

const CAPTURE_SEL = [
  '#instruction', '#instruction .w',
  '#levelName', '#levelNum', '#levelTotal',
  '.echo-token', '.echo-chip', '.echo-cell', '.echo-cell-mark', '.echo-mark span',
  '.echo-tile', '.echo-hole', '.echo-line', '.echo-replay', '.echo-found',
  '.gbtn', '.keycap', '.bignum', '.readout', '.chip', '.status'
].join(',');

const NEVER = '.vault, .vault-scrim, #dev, .lab, .rs-live, .vault-capture-bar';

/* Capture mode is a mode, and a mode the player cannot see or leave is a trap.
   Three separate things used to build that trap:

     1. the click-away SCRIM stayed up. It covers the whole window at
        z-index 8500, so every pointer event landed on `.vault-scrim` — which
        is on the NEVER list — and nothing was ever hoverable or pickable.
        Pressing Capture genuinely did nothing.
     2. `onPick` ran on document in the CAPTURE phase and called
        stopPropagation() before deciding anything, so the click never reached
        the bar's own Cancel button. The one visible exit was dead.
     3. `.vault.is-peek { opacity }` was overridden by the panel's entrance
        animation, which is declared `both` — a finished animation's fill still
        wins over a normal declaration. The panel never stepped aside either.

   What is left after that is Escape, which nothing on screen mentions. Hence
   "doesn't do anything and hang".

   So: no scrim while armed, the Vault's own UI is never swallowed, the button
   holds a pressed state, focus moves to Cancel, and the mode expires by
   itself. */

const CAPTURE_MS = 30000;
const SAY_MS = 1600;

let capturing = false, hoverEl = null, captureTimer = 0, sayTimer = 0;

function startCapture() {
  if (capturing) { stopCapture(); return; }   // pressing it again disarms it
  build();
  capturing = true;
  pause();
  closeMenus();

  /* the panel gets out of the way so the puzzle is visible */
  root.classList.add('is-peek');
  document.documentElement.classList.add('vault-capturing');
  if (root.__scrim) root.__scrim.classList.remove('is-on');
  if (captureBtn) {
    captureBtn.classList.add('is-picking');
    captureBtn.setAttribute('aria-pressed', 'true');
  }

  const bar = el('div', 'vault-capture-bar');
  bar.id = 'vaultCaptureBar';
  bar.setAttribute('role', 'status');
  el('span', 'vault-capture-dot', bar);
  bar.__msg = el('span', 'vault-capture-msg', bar, T('captureOn'));
  el('kbd', 'vault-capture-esc', bar, 'Esc');
  const cancel = el('button', 'vault-btn vault-capture-cancel', bar, T('cancel'));
  cancel.type = 'button';
  cancel.addEventListener('click', () => stopCapture());
  document.body.appendChild(bar);
  if (cancel.focus) cancel.focus();

  document.addEventListener('pointerover', onHover, true);
  document.addEventListener('click', onPick, true);
  document.addEventListener('keydown', onEsc, true);

  /* and it ends on its own, so a forgotten mode is never a stuck one */
  captureTimer = setTimeout(() => { captureTimer = 0; stopCapture(); }, CAPTURE_MS);
}

function stopCapture(silent) {
  if (!capturing) return;
  capturing = false;
  if (captureTimer) { clearTimeout(captureTimer); captureTimer = 0; }
  if (sayTimer) { clearTimeout(sayTimer); sayTimer = 0; }
  clearHover();
  document.removeEventListener('pointerover', onHover, true);
  document.removeEventListener('click', onPick, true);
  document.removeEventListener('keydown', onEsc, true);
  const bar = document.getElementById('vaultCaptureBar');
  if (bar) bar.remove();
  document.documentElement.classList.remove('vault-capturing');
  if (root) {
    root.classList.remove('is-peek');
    if (root.__scrim && !root.hidden) root.__scrim.classList.add('is-on');
  }
  if (captureBtn) {
    captureBtn.classList.remove('is-picking');
    captureBtn.setAttribute('aria-pressed', 'false');
    /* whatever ended the mode, the keyboard lands back where it started */
    if (!silent && root && !root.hidden && captureBtn.focus) captureBtn.focus();
  }
  if (!silent) render();
}

/* A click that keeps nothing should say why rather than look broken. */
function say(text) {
  const bar = document.getElementById('vaultCaptureBar');
  if (!bar || !bar.__msg) return;
  bar.__msg.textContent = text;
  bar.classList.add('is-refused');
  if (sayTimer) clearTimeout(sayTimer);
  sayTimer = setTimeout(() => {
    sayTimer = 0;
    const b = document.getElementById('vaultCaptureBar');
    if (b && b.__msg) { b.__msg.textContent = T('captureOn'); b.classList.remove('is-refused'); }
  }, SAY_MS);
}

function onEsc(e) {
  if (e.key !== 'Escape' && e.key !== 'Esc') return;
  if (e.preventDefault) e.preventDefault();
  if (e.stopPropagation) e.stopPropagation();
  stopCapture();
}

function clearHover() {
  if (hoverEl) hoverEl.classList.remove('vault-target');
  hoverEl = null;
}

function candidate(target) {
  if (!target || !target.closest) return null;
  if (target.closest(NEVER)) return null;
  const hit = target.closest(CAPTURE_SEL);
  if (!hit) return null;
  const text = (hit.textContent || '').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return hit;
}

function onHover(e) {
  const hit = candidate(e.target);
  if (hit === hoverEl) return;
  clearHover();
  if (hit) { hoverEl = hit; hit.classList.add('vault-target'); }
}

function onPick(e) {
  const t = e.target;

  /* The Vault's own controls are not picks and are never swallowed. Cancel
     lives in the bar; eating its click is what left the player stuck. */
  if (t && t.closest && (t.closest('.vault-capture-bar') || t.closest('.vault'))) return;

  if (e.preventDefault) e.preventDefault();
  if (e.stopPropagation) e.stopPropagation();

  const hit = candidate(t);
  if (hit) {
    const text = (hit.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 240);
    stopCapture(true);
    tab = 'pin';
    syncTabs();
    open(true);
    newItem('pin', { text: text });
    return;
  }

  /* aimed at the puzzle, or at something the Vault refuses to keep: say so
     and stay armed, so one bad aim does not cost the whole mode */
  if (t && t.closest && (t.closest(NEVER) || t.closest('#board'))) { say(T('captureNone')); return; }

  /* a click well away from the puzzle is the player leaving */
  stopCapture();
}

/* ========================================================= save a thought = */
/* Offered after EVERY stage, with no distinction of any kind. A prompt that
   appeared only after the interesting ones would itself be a tell. */

function watchSolved() {
  const solved = document.getElementById('solved');
  const inner = solved && solved.querySelector('.solved-inner');
  if (!solved || !inner) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'vault-thought';
  btn.textContent = T('saveThought');
  btn.hidden = true;
  btn.addEventListener('click', () => {
    tab = 'note';
    syncTabs();
    open(true);
    newItem('note');
  });
  inner.appendChild(btn);

  const sync = () => {
    btn.textContent = T('saveThought');
    btn.hidden = !(unlocked() && solved.classList.contains('is-on'));
  };
  new MutationObserver(sync).observe(solved, { attributes: true, attributeFilter: ['class'] });
  sync();
}

/* ================================================================= boot == */

function boot() {
  if (!window.RULESET_STATE) return;

  syncIcon();
  watchSolved();

  /* the icon appears the moment B03 is banked, never before, and goes away
     again if progress is wiped */
  window.RULESET_STATE.onChange(syncIcon);

  /* the bottom bar is rebuilt by other things; keep checking cheaply */
  setInterval(syncIcon, 1000);

  window.addEventListener('keydown', e => {
    if (!unlocked()) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (e.key === 'v' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      open(!root || root.hidden);
    }
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})();
