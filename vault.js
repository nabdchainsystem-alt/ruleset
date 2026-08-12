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
        id: cut(it.id, 32),
        kind: it.kind,
        title: cut(it.title, 120),
        body: cut(it.body, MAX_BODY),
        text: cut(it.text, 240),
        left: cut(it.left, 80),
        rel: cut(it.rel, 12),
        right: cut(it.right, 80),
        confidence: CONFIDENCE.indexOf(it.confidence) >= 0 ? it.confidence : 'question',
        stageKey: it.stageKey == null ? null : cut(it.stageKey, 24),
        stageName: cut(it.stageName, 60),
        tags: Array.isArray(it.tags)
          ? it.tags.filter(t => typeof t === 'string').map(t => cut(t, 24)).slice(0, 8)
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

  add(kind, fields) {
    if (KINDS.indexOf(kind) < 0 || data.items.length >= MAX_ITEMS) return null;
    const st = currentStage();
    const it = Object.assign({
      id: uid(), kind: kind,
      title: '', body: '', text: '',
      left: '', rel: '=', right: '',
      confidence: 'question',
      stageKey: st.key, stageName: st.name,
      tags: [], at: Date.now()
    }, fields || {});
    it.id = uid();
    it.kind = kind;
    data.items.unshift(it);
    save();
    return it;
  },

  update(id, fields) {
    const it = this.item(id);
    if (!it) return null;
    Object.keys(fields || {}).forEach(k => {
      if (k === 'id' || k === 'kind') return;
      if (k === 'tags') {
        it.tags = String(fields.tags).split(',').map(t => cut(t.trim(), 24)).filter(Boolean).slice(0, 8);
      } else if (k === 'confidence') {
        if (CONFIDENCE.indexOf(fields[k]) >= 0) it.confidence = fields[k];
      } else {
        it[k] = cut(fields[k], k === 'body' ? MAX_BODY : 240);
      }
    });
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

  clear() { data = blank(); saveNow(); },
  saveNow: saveNow
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

let root = null, body = null, tabsEl = null, icon = null;
let tab = 'note';
let query = '', stageFilter = '', tagFilter = '';
let linkFrom = null;

const TABS = [['note', 'notes'], ['pin', 'pins'], ['rule', 'rules'], ['link', 'links']];

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
  const stageSel = el('select', 'vault-input vault-sel', filters);
  stageSel.addEventListener('change', () => { stageFilter = stageSel.value; render(); });
  const tagSel = el('select', 'vault-input vault-sel', filters);
  tagSel.addEventListener('change', () => { tagFilter = tagSel.value; render(); });
  root.__stageSel = stageSel;
  root.__tagSel = tagSel;

  const acts = el('div', 'vault-acts', tools);
  const bNote = el('button', 'vault-btn', acts, '+ ' + T('newNote'));
  bNote.type = 'button';
  bNote.addEventListener('click', () => { tab = 'note'; syncTabs(); newItem('note'); });

  const bPin = el('button', 'vault-btn', acts, T('capture'));
  bPin.type = 'button';
  bPin.addEventListener('click', () => startCapture());

  const bRule = el('button', 'vault-btn', acts, '+ ' + T('newRule'));
  bRule.type = 'button';
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
    root.__scrim.classList.add('is-on');
    document.documentElement.classList.add('vault-open');
    if (!data.seen) { data.seen = true; save(); }
    render();
  } else {
    stopCapture(true);
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

  const fill = (sel, list, allLabel, keyer, labeler) => {
    const was = sel.value;
    sel.textContent = '';
    const o0 = el('option', null, sel, allLabel);
    o0.value = '';
    list.forEach(v => {
      const o = el('option', null, sel, labeler(v));
      o.value = keyer(v);
    });
    sel.value = list.some(v => keyer(v) === was) ? was : '';
  };

  /* stages are listed by NAME. Break stages carry internal ids that must
     never be shown, so the value is the key and the label never is. */
  fill(root.__stageSel, stages, T('allStages'), s => s.key, s => s.name || '—');
  fill(root.__tagSel, tags, T('allTags'), t => t, t => t);
  stageFilter = root.__stageSel.value;
  tagFilter = root.__tagSel.value;
}

function render() {
  if (!root || root.hidden) return;
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

    const rel = el('select', 'vault-input vault-rel', row);
    ['=', '≈', '→', '≠', '?'].forEach(r => {
      const o = el('option', null, rel, r);
      o.value = r;
    });
    rel.value = ['=', '≈', '→', '≠', '?'].indexOf(it.rel) >= 0 ? it.rel : '=';
    rel.addEventListener('change', () => Vault.update(it.id, { rel: rel.value }));

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

let capturing = false, hoverEl = null;

function startCapture() {
  if (capturing) return;
  build();
  capturing = true;
  pause();

  /* the panel gets out of the way so the puzzle is visible */
  root.classList.add('is-peek');
  document.documentElement.classList.add('vault-capturing');

  const bar = el('div', 'vault-capture-bar');
  bar.id = 'vaultCaptureBar';
  el('span', null, bar, T('captureOn'));
  const cancel = el('button', 'vault-btn', bar, T('cancel'));
  cancel.type = 'button';
  cancel.addEventListener('click', () => stopCapture(true));
  document.body.appendChild(bar);

  document.addEventListener('pointerover', onHover, true);
  document.addEventListener('click', onPick, true);
  document.addEventListener('keydown', onEsc, true);
}

function stopCapture(silent) {
  if (!capturing) return;
  capturing = false;
  clearHover();
  document.removeEventListener('pointerover', onHover, true);
  document.removeEventListener('click', onPick, true);
  document.removeEventListener('keydown', onEsc, true);
  const bar = document.getElementById('vaultCaptureBar');
  if (bar) bar.remove();
  document.documentElement.classList.remove('vault-capturing');
  if (root) root.classList.remove('is-peek');
  if (!silent) render();
}

function onEsc(e) { if (e.key === 'Escape') { e.preventDefault(); stopCapture(true); } }

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
  const hit = candidate(e.target);
  e.preventDefault();
  e.stopPropagation();
  if (!hit) return;

  const text = (hit.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 240);
  stopCapture(true);
  tab = 'pin';
  syncTabs();
  open(true);
  newItem('pin', { text: text });
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

  mountIcon();
  watchSolved();

  /* the icon appears the moment B03 is banked, and never before */
  window.RULESET_STATE.onChange(() => {
    mountIcon();
    if (icon) icon.title = T('vault');
  });

  /* language can change under us; the panel is rebuilt rather than patched */
  setInterval(() => {
    if (!icon) mountIcon();
  }, 1000);

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
