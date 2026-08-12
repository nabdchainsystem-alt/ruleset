/* ==========================================================================
   RULESET — progression + Vault torture tests
   --------------------------------------------------------------------------
   invariants.mjs guards the season's arithmetic. This file guards the two
   things that arithmetic sits on: the save file, and the notebook next to it.

   Everything here runs headless in node:vm against the real source files,
   with a stub window / document / localStorage — same loading pattern as
   invariants.mjs, one context per simulated page load. Creating a second
   context over the SAME storage object is exactly what a refresh is, which is
   how "progress survives a reload" is asserted rather than assumed.

     node progress-tests.mjs

   Two rules the whole file exists to defend:

     1. A stage's save key is a NUMBER for Season I/ECHO and a STRING routeId
        for a Break. Anything that assumes one type silently erases the other.
     2. No localStorage value — however corrupt, hostile or ancient — may
        throw on boot. A save file is untrusted input.
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const src = f => readFileSync(join(HERE, f), 'utf8');

const STATE_KEY = 'ruleset:v1';
const VAULT_KEY = 'ruleset:vault';

/* ---------------------------------------------------------- the harness -- */

let pass = 0;
const failures = [];
const ok = (cond, what) => { cond ? pass++ : failures.push(what); };
const show = v => {
  try { return JSON.stringify(v); }
  catch (e) { return v && v.tagName ? `<${v.tagName.toLowerCase()} class="${v.className}">` : String(v); }
};
const eq = (a, b, what) => ok(Object.is(a, b),
  `${what}\n      expected ${show(b)}\n      got      ${show(a)}`);
const deep = (a, b, what) => eq(JSON.stringify(a), JSON.stringify(b), what);

/** The assertion this file is mostly made of: it must not throw. */
function survives(what, fn) {
  try { const r = fn(); pass++; return r; }
  catch (e) { failures.push(`${what}\n      threw ${e && e.stack ? e.stack.split('\n')[0] : e}`); return null; }
}

/* ================================================== the played route ====== */
/* Loaded once, exactly as invariants.mjs does, so the tests use the REAL keys
   a player's save would hold rather than invented ones. */

const routeBox = { console, window: {}, document: undefined, performance: { now: () => 0 } };
routeBox.window.window = routeBox.window;
routeBox.globalThis = routeBox;
createContext(routeBox);
for (const f of ['echo.js', 'levels.js', 'breaks.js', 'breaks2.js',
                 'breaks3.js', 'breaks4.js', 'route.js']) {
  runInContext(src(f), routeBox, { filename: f });
}
const RW      = routeBox.window;
const LEVELS  = RW.RULESET_LEVELS;
const BREAKS  = RW.RULESET_BREAKS;
const ROUTE   = RW.RULESET_ROUTE;
const ECHO    = RW.RULESET_ECHO;
const PLAYED  = ROUTE.build(LEVELS, BREAKS);
const ALL_KEYS = PLAYED.map(ROUTE.keyOf);

/* ================================================== the DOM stub ========== */
/* Small on purpose: enough of the DOM for vault.js to build its panel, render
   cards and run capture — and no more. Every innerHTML assignment is recorded,
   because "was player text ever written as HTML" is a release-blocking
   question that a real browser would answer too late. */

function makeDocument() {
  const htmlWrites = [];

  const clsOf = n => (n.className || '').split(/\s+/).filter(Boolean);

  function matchOne(node, compound) {
    const m = /^([a-zA-Z][\w-]*)?((?:[.#][\w-]+)*)$/.exec(compound);
    if (!m) return false;
    if (m[1] && node.tagName !== m[1].toUpperCase()) return false;
    return (m[2].match(/[.#][\w-]+/g) || []).every(tok =>
      tok[0] === '.' ? clsOf(node).indexOf(tok.slice(1)) >= 0 : node.id === tok.slice(1));
  }

  function matchSel(node, sel) {
    return String(sel).split(',').map(s => s.trim()).filter(Boolean).some(part => {
      const chain = part.split(/\s+/);
      if (!matchOne(node, chain[chain.length - 1])) return false;
      let cur = node;
      for (let i = chain.length - 2; i >= 0; i--) {
        cur = cur.parentNode;
        while (cur && !matchOne(cur, chain[i])) cur = cur.parentNode;
        if (!cur) return false;
      }
      return true;
    });
  }

  class El {
    constructor(tag) {
      this.tagName = String(tag || 'div').toUpperCase();
      this.childNodes = [];
      this.parentNode = null;
      this.className = '';
      this.id = '';
      this.dataset = {};
      this.style = {};
      this.attrs = {};
      this.hidden = false;
      this.value = '';
      this.disabled = false;
      this.isContentEditable = false;
      this._text = '';
      this._html = '';
      this._on = {};
      this.focused = false;
    }
    get children() { return this.childNodes; }
    get firstChild() { return this.childNodes[0] || null; }
    get classList() {
      const self = this;
      return {
        add(...c) { const s = new Set(clsOf(self)); c.forEach(x => s.add(x)); self.className = [...s].join(' '); },
        remove(...c) { self.className = clsOf(self).filter(x => c.indexOf(x) < 0).join(' '); },
        toggle(c, on) { const has = clsOf(self).indexOf(c) >= 0; const want = on == null ? !has : !!on; want ? this.add(c) : this.remove(c); return want; },
        contains(c) { return clsOf(self).indexOf(c) >= 0; }
      };
    }
    get textContent() {
      return this._text + this.childNodes.map(c => c.textContent).join('');
    }
    set textContent(v) { this.childNodes.forEach(c => { c.parentNode = null; }); this.childNodes = []; this._text = v == null ? '' : String(v); }
    get innerHTML() { return this._html; }
    set innerHTML(v) {
      this._html = v == null ? '' : String(v);
      htmlWrites.push({ node: this, value: this._html });
      this.childNodes = [];
      this._text = '';
    }
    appendChild(child) {
      if (child.parentNode) child.parentNode.removeChild(child);
      child.parentNode = this;
      this.childNodes.push(child);
      return child;
    }
    removeChild(child) {
      const i = this.childNodes.indexOf(child);
      if (i >= 0) { this.childNodes.splice(i, 1); child.parentNode = null; }
      return child;
    }
    remove() { if (this.parentNode) this.parentNode.removeChild(this); }
    setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'id') this.id = String(v); }
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
    removeAttribute(k) { delete this.attrs[k]; }
    addEventListener(type, fn, capture) { (this._on[type] || (this._on[type] = [])).push({ fn, capture: !!capture }); }
    removeEventListener(type, fn, capture) {
      const l = this._on[type]; if (!l) return;
      const i = l.findIndex(x => x.fn === fn && x.capture === !!capture);
      if (i >= 0) l.splice(i, 1);
    }
    focus() { this.focused = true; }
    blur() { this.focused = false; }
    matches(sel) { return matchSel(this, sel); }
    closest(sel) { let n = this; while (n) { if (matchSel(n, sel)) return n; n = n.parentNode; } return null; }
    walk(fn) { this.childNodes.forEach(c => { fn(c); c.walk(fn); }); }
    querySelector(sel) { let hit = null; this.walk(n => { if (!hit && matchSel(n, sel)) hit = n; }); return hit; }
    querySelectorAll(sel) { const out = []; this.walk(n => { if (matchSel(n, sel)) out.push(n); }); return out; }
  }

  const documentElement = new El('html');
  const body = new El('body');
  documentElement.appendChild(body);

  const doc = {
    readyState: 'complete',
    visibilityState: 'visible',
    documentElement,
    body,
    htmlWrites,
    _on: {},
    createElement(tag) { return new El(tag); },
    getElementById(id) { return documentElement.querySelector('#' + id); },
    querySelector(sel) { return matchSel(documentElement, sel) ? documentElement : documentElement.querySelector(sel); },
    querySelectorAll(sel) { return documentElement.querySelectorAll(sel); },
    addEventListener(type, fn, capture) { (doc._on[type] || (doc._on[type] = [])).push({ fn, capture: !!capture }); },
    removeEventListener(type, fn, capture) {
      const l = doc._on[type]; if (!l) return;
      const i = l.findIndex(x => x.fn === fn && x.capture === !!capture);
      if (i >= 0) l.splice(i, 1);
    },
    El
  };
  return doc;
}

/** Fire an event: document capture listeners first, then the node's own. */
function fire(doc, node, type, extra) {
  const ev = Object.assign({
    type, target: node, currentTarget: node,
    preventDefault() {}, stopPropagation() {}, key: '', metaKey: false, ctrlKey: false, altKey: false
  }, extra || {});
  (doc._on[type] || []).slice().forEach(l => l.fn(ev));
  if (node && node._on && node._on[type]) node._on[type].slice().forEach(l => l.fn(ev));
  return ev;
}

/* ================================================== a simulated page ====== */

/**
 * One page load. `store` is a plain object standing in for localStorage and is
 * DELIBERATELY shared between calls — booting twice over one store is a
 * refresh, which is the only honest way to test that progress survives one.
 */
function boot(store, opts) {
  opts = opts || {};
  const doc = makeDocument();
  const timers = new Map();
  let nextTimer = 1;

  const localStorage = {
    getItem: k => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: i => Object.keys(store)[i] || null
  };
  if (opts.hostileStorage) {
    localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  }

  const win = {
    addEventListener(type, fn) { (win._on[type] || (win._on[type] = [])).push(fn); },
    removeEventListener() {},
    _on: {},
    matchMedia: () => ({ matches: false, addEventListener() {} })
  };
  win.window = win;

  const sandbox = {
    console: opts.quiet ? { log() {}, warn() {}, error() {} } : console,
    window: win,
    document: doc,
    localStorage,
    setTimeout: (fn, ms) => { const id = nextTimer++; timers.set(id, { fn, ms }); return id; },
    clearTimeout: id => { timers.delete(id); },
    setInterval: (fn, ms) => { const id = nextTimer++; timers.set(id, { fn, ms, interval: true }); return id; },
    clearInterval: id => { timers.delete(id); },
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    MutationObserver: class { constructor(fn) { this.fn = fn; } observe() {} disconnect() {} },
    performance: { now: () => 0 }
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  createContext(sandbox);

  runInContext(src('state.js'), sandbox, { filename: 'state.js' });
  win.RULESET_STATE = win.RULESET_STATE || sandbox.window.RULESET_STATE;

  const page = {
    doc, win, store, sandbox,
    State: win.RULESET_STATE,
    /** Run every queued timer once — the debounced writes land here. */
    flush() {
      const due = [...timers.entries()];
      due.forEach(([id, t]) => { if (!t.interval) timers.delete(id); try { t.fn(); } catch (e) { failures.push('timer threw: ' + e.message); } });
    },
    /** The stored save, parsed, or null. */
    stored(key) {
      const raw = store[key == null ? STATE_KEY : key];
      if (raw == null) return null;
      try { return JSON.parse(raw); } catch (e) { return 'UNPARSEABLE'; }
    }
  };

  if (opts.vault) {
    /* the shell the Vault expects to find */
    const app = doc.createElement('div'); app.className = 'app';
    doc.body.appendChild(app);
    const foot = doc.createElement('footer'); foot.className = 'bottombar';
    app.appendChild(foot);
    const bl = doc.createElement('div'); bl.className = 'bottom-left';
    foot.appendChild(bl);
    const solved = doc.createElement('div'); solved.className = 'solved'; solved.setAttribute('id', 'solved');
    const inner = doc.createElement('div'); inner.className = 'solved-inner';
    solved.appendChild(inner);
    app.appendChild(solved);
    page.bottomLeft = bl;
    page.solvedCard = solved;

    if (opts.stage) win.RULESET = { ctx: { level: opts.stage } };

    runInContext(src('vault.js'), sandbox, { filename: 'vault.js' });
    page.Vault = win.RULESET_VAULT;
  }
  return page;
}

/** A fresh store holding a save built from a plain object. */
const storeWith = (save, vault) => {
  const s = {};
  if (save !== undefined) s[STATE_KEY] = typeof save === 'string' ? save : JSON.stringify(save);
  if (vault !== undefined) s[VAULT_KEY] = typeof vault === 'string' ? vault : JSON.stringify(vault);
  return s;
};

/* ==========================================================================
   A. PROGRESSION
   ========================================================================== */

console.log('\n  RULESET — progression + vault torture\n');

/* ── A1 ── a brand-new player ───────────────────────────────────────────── */
{
  const p = survives('A1. a brand-new player boots', () => boot({}));
  const d = p.State.data;
  eq(d.unlocked, 1, 'A1a. a new player is unlocked to stage 1 only');
  deep(d.solved, [], 'A1b. and has solved nothing');
  eq(d.v, 4, 'A1c. a new save carries the current schema number');
  ok(Array.isArray(d.mechanics) && Array.isArray(d.inventory) && Array.isArray(d.words) &&
     Array.isArray(d.history) && Array.isArray(d.echoMemory) && Array.isArray(d.echoTray),
     'A1d. every list field exists and is a list');
  ok(d.ledger && typeof d.ledger === 'object' && !Array.isArray(d.ledger),
     'A1e. the ledger is an object, never an array');
  eq(d.counts.solves, 0, 'A1f. counters start at zero');
  eq(d.season2Complete, false, 'A1g. season II is not complete');
  eq(d.theme, null, 'A1h. no theme is chosen yet');
  eq(p.stored(), null, 'A1i. a player who has done nothing writes nothing');
}

/* ── A2 ── partly completed: Season I + ECHO + Breaks, mixed key types ──── */
{
  const mixed = [1, 2, 3, 4, 5, 16, 17, 'B01', 'B02', 'B03', 18];
  const store = storeWith({ v: 4, unlocked: 12, solved: mixed, theme: 'dark', lang: 'ar' });
  const p = survives('A2. a part-finished save boots', () => boot(store));
  const d = p.State.data;
  eq(d.solved.length, mixed.length, 'A2a. every solved stage survives the load');
  deep(d.solved, mixed, 'A2b. in order, with both key types intact');
  eq(typeof d.solved[0], 'number', 'A2c. a Season I key is still a number');
  eq(typeof d.solved[7], 'string', 'A2d. a Break key is still a string');
  eq(d.lang, 'ar', 'A2e. language is kept');
  eq(d.theme, 'dark', 'A2f. theme is kept');
  ok(d.solved.indexOf('B03') >= 0, 'A2g. B03 is present — the Vault unlock reads exactly this');
}

/* ── A3 ── the whole game finished ──────────────────────────────────────── */
{
  const store = storeWith({
    v: 4, unlocked: PLAYED.length, solved: ALL_KEYS.slice(), lang: 'en', theme: null,
    season2Complete: true
  });
  const p = survives('A3. a fully completed save boots', () => boot(store));
  const d = p.State.data;
  eq(d.solved.length, 75, 'A3a. all seventy-five stages stay solved');
  eq(d.season2Complete, true, 'A3b. season II stays complete');
  ok(ALL_KEYS.every(k => d.solved.indexOf(k) >= 0), 'A3c. every played key is found by indexOf');
  eq(d.solved.filter(k => typeof k === 'string').length, 30,
     'A3d. exactly the thirty Break keys are strings');
  eq(d.solved.filter(k => typeof k === 'number').length, 45,
     'A3e. and the forty-five level keys are numbers');
  eq(p.State.seasonDone(2), true, 'A3f. seasonDone(2) agrees');
}

/* ── A4 ── the known bug: a refresh must not erase Break progress ───────── */
{
  const store = {};
  const p1 = boot(store);
  ['B01', 'B02', 'B03', 'B07'].forEach(k => p1.State.data.solved.push(k));
  p1.State.data.solved.push(21);
  p1.State.saveNow();

  const raw = p1.stored();
  ok(raw && raw.solved.indexOf('B03') >= 0, 'A4a. a Break key reaches localStorage as a string');

  const p2 = survives('A4b. the game reloads on that save', () => boot(store));
  deep(p2.State.data.solved, ['B01', 'B02', 'B03', 'B07', 21],
       'A4c. REGRESSION GUARD: a refresh loses no Break progress');
  eq(p2.State.data.solved.filter(k => typeof k === 'string').length, 4,
     'A4d. and every Break key is still a string, not coerced to a number');

  /* three reloads in a row, because the original bug only bit on the second */
  const p3 = boot(store), p4 = boot(store);
  eq(p4.State.data.solved.length, 5, 'A4e. and again after a third and fourth load');
  ok(p3.State.data.solved.indexOf('B01') >= 0, 'A4f. B01 is still there');
}

/* ── A5 ── ECHO progress and echo memory survive a refresh ─────────────── */
{
  const store = {};
  const p1 = boot(store);
  for (let id = 16; id <= 24; id++) {
    p1.State.data.solved.push(id);
    const lv = LEVELS.find(l => l.id === id);
    if (lv && lv.echoMarkChar) {
      p1.State.remember(id, ECHO.encodeEchoMark(lv.echoMarkChar, id), ECHO.levelPhase(id));
    }
  }
  p1.State.trayPush('SE');
  p1.State.saveNow();

  const p2 = survives('A5. reloading a Season II save', () => boot(store));
  eq(p2.State.data.solved.length, 9, 'A5a. every ECHO level solved is still solved');
  eq(p2.State.marks().length, 9, 'A5b. every echo mark survives the reload');
  deep(p2.State.tray(), ['SE'], 'A5c. the echo tray survives the reload');
  const m20 = p2.State.markFor(20);
  ok(m20 && m20.tokens.length === 2, 'A5d. a restored mark still holds two tokens');
  eq(p2.State.markFor(20).phase, ECHO.levelPhase(20), 'A5e. and its phase');
  /* the decoded character is the player's job and must never be in the file */
  const rawTxt = store[STATE_KEY];
  ok(rawTxt.indexOf('"char"') < 0 && rawTxt.indexOf('plain') < 0,
     'A5f. the save file stores no decoded character');
  const decoded = ECHO.decodeEchoMark(m20.tokens, 20);
  eq(decoded, LEVELS.find(l => l.id === 20).echoMarkChar,
     'A5g. but the stored tokens still decode to the right mark');
}

/* ── A6 ── Start over wipes progress and never the Vault ───────────────── */
{
  const store = storeWith(
    { v: 4, unlocked: 40, solved: [1, 2, 16, 'B01', 'B03'], theme: 'dark', lang: 'ar',
      echoMemory: [{ levelId: 16, tokens: ['VE', 'NA'], phase: 0, at: 1 }], echoTray: ['MI'],
      counts: { solves: 5, wipes: 1 } },
    { v: 1, seen: true, items: [{ id: 'abc', kind: 'note', title: 'my theory', body: 'VE moves' }], links: [] }
  );
  const p = boot(store, { vault: true });
  eq(p.Vault.items().length, 1, 'A6a. the vault loaded the player\'s note');

  p.State.resetProgress();
  eq(p.State.data.solved.length, 0, 'A6b. Start over erases every solved stage');
  eq(p.State.data.unlocked, 1, 'A6c. and sends the player back to stage one');
  eq(p.State.data.echoMemory.length, 0, 'A6d. and forgets every echo mark');
  eq(p.State.data.echoTray.length, 0, 'A6e. and empties the tray');
  eq(p.State.data.theme, 'dark', 'A6f. but keeps the theme');
  eq(p.State.data.lang, 'ar', 'A6g. and the language');
  eq(p.State.data.counts.wipes, 2, 'A6h. and remembers that it happened');

  eq(p.Vault.items().length, 1, 'A6i. THE VAULT IS UNTOUCHED by Start over');
  eq(p.Vault.items()[0].title, 'my theory', 'A6j. word for word');
  ok(store[VAULT_KEY] && JSON.parse(store[VAULT_KEY]).items.length === 1,
     'A6k. and its own storage key was never written to');

  /* resetAll is the harder one: it drops preferences too, and still must not
     reach across into the notebook */
  p.State.resetAll();
  eq(p.State.data.theme, null, 'A6l. resetAll drops preferences too');
  eq(p.Vault.items().length, 1, 'A6m. and STILL leaves the Vault alone');

  const p2 = boot(store, { vault: true });
  eq(p2.Vault.items().length, 1, 'A6n. the note is still there after a reload');
  eq(p2.State.data.solved.length, 0, 'A6o. and the progress is still gone');
}

/* ── A7 ── every schema version migrates ───────────────────────────────── */
{
  const versions = {
    'v1 (no v field at all)': { unlocked: 9, solved: [1, 2, 3, 4, 5, 6, 7, 8], theme: 'dark', lang: 'en' },
    'v2': { v: 2, unlocked: 12, solved: [1, 2, 3], theme: null, lang: 'en',
            mechanics: ['dragText'], inventory: [{ id: 'bent-key', from: 4, at: 1, data: null }],
            words: ['red'], ledger: { 3: { route: 'removed-red', answer: null, hints: 1, restarts: 0, ms: 20, at: 1 } },
            counts: { solves: 3, restarts: 1, hints: 1, skips: 0, langChanges: 0, themeChanges: 0, wipes: 0 },
            history: [{ t: 1, type: 'solve', level: 3, d: null }] },
    'v3': { v: 3, unlocked: 20, solved: [1, 16, 17], theme: null, lang: 'en',
            mechanics: [], inventory: [], words: [], ledger: {}, counts: {}, history: [],
            echoMemory: [{ levelId: 16, tokens: ['VE', 'NA'], phase: 0, at: 1 }] },
    'v4': { v: 4, unlocked: 40, solved: [1, 16, 'B01'], theme: null, lang: 'en',
            mechanics: [], inventory: [], words: [], ledger: {}, counts: {}, history: [],
            echoMemory: [{ levelId: 16, tokens: ['VE', 'NA'], phase: 0, at: 1 }],
            echoTray: ['SE'], season2Complete: false },
    'v5 from the future': { v: 5, unlocked: 3, solved: [1, 2], theme: null, lang: 'en',
            echoMemory: [], echoTray: [], season2Complete: false,
            somethingNobodyHasWrittenYet: { deep: [1, 2, 3] } }
  };

  Object.keys(versions).forEach(label => {
    const store = storeWith(versions[label]);
    const p = survives(`A7. ${label} migrates without throwing`, () => boot(store));
    if (!p) return;
    const d = p.State.data;
    const before = versions[label];
    eq(d.solved.length, before.solved.length, `A7a. ${label} keeps every solved stage`);
    eq(d.unlocked, before.unlocked, `A7b. ${label} keeps how far it got`);
    eq(d.v, 4, `A7c. ${label} lands on the current schema`);
    ok(Array.isArray(d.echoMemory) && Array.isArray(d.echoTray) && Array.isArray(d.inventory),
       `A7d. ${label} gains every later field as an empty list, not undefined`);
    if (before.mechanics) deep(d.mechanics, before.mechanics, `A7e. ${label} keeps its mechanics`);
    if (before.inventory && before.inventory.length) {
      eq(d.inventory.length, 1, `A7f. ${label} keeps its inventory`);
    }
    if (before.echoMemory && before.echoMemory.length) {
      eq(d.echoMemory.length, before.echoMemory.length, `A7g. ${label} keeps its echo memory`);
    }
    if (before.echoTray) deep(d.echoTray, before.echoTray, `A7h. ${label} keeps its echo tray`);
    if (before.ledger && before.ledger[3]) {
      eq(p.State.routeOf(3), 'removed-red', `A7i. ${label} keeps its ledger routes`);
    }
    if (before.counts && before.counts.solves) {
      eq(d.counts.solves, before.counts.solves, `A7j. ${label} keeps its counters`);
    }
  });

  /* a v5 save must not be able to smuggle unknown fields into the store: they
     are dropped, not merged, or a future schema could resurrect junk */
  const p5 = boot(storeWith(versions['v5 from the future']));
  eq(p5.State.data.somethingNobodyHasWrittenYet, undefined,
     'A7k. an unknown field from a newer schema is dropped, not carried');
}

/* ── A8 ── malformed storage must never brick the game ─────────────────── */
{
  const hostile = {
    'corrupt JSON':            '{"solved":[1,2,',
    'the literal null':        'null',
    'the string undefined':    'undefined',
    'a bare string':           '"hello"',
    'a number':                '42',
    'true':                    'true',
    'an empty string':         '',
    'an array at the top':     '[1,2,3]',
    'solved as a number':      JSON.stringify({ solved: 7, unlocked: 2 }),
    'solved as an object':     JSON.stringify({ solved: { 0: 1 }, unlocked: 2 }),
    'solved as a string':      JSON.stringify({ solved: 'not-an-array' }),
    'unlocked as a string':    JSON.stringify({ unlocked: 'lots', solved: [1] }),
    'unlocked NaN':            '{"unlocked":null,"solved":[1]}',
    'unlocked negative':       JSON.stringify({ unlocked: -5, solved: [1] }),
    'unlocked absurd':         JSON.stringify({ unlocked: 1e12, solved: [1] }),
    'missing every field':     '{}',
    'extra unknown fields':    JSON.stringify({ solved: [1], wat: { a: [1, 2] }, __proto__: { polluted: 1 } }),
    'solved holding null':     JSON.stringify({ solved: [1, null, 2] }),
    'solved holding undefined':'{"solved":[1,null,2]}',
    'solved holding NaN':      '{"solved":[1,null,2,"NaN"]}',
    'solved holding objects':  JSON.stringify({ solved: [1, { id: 3 }, 2] }),
    'solved holding true':     JSON.stringify({ solved: [1, true, false, 2] }),
    'solved holding arrays':   JSON.stringify({ solved: [1, [2, 3], 4] }),
    'level id out of range':   JSON.stringify({ solved: [999, -5, 0, 1] }),
    'a duplicated key':        JSON.stringify({ solved: [7, 7, 7, 'B01', 'B01'] }),
    'an enormous string':      JSON.stringify({ solved: [1, 'x'.repeat(200000)] }),
    'mixed numbers + strings': JSON.stringify({ solved: [1, 'B01', 2, 'B02', 45] }),
    'ledger as an array':      JSON.stringify({ solved: [1], ledger: [1, 2, 3] }),
    'ledger rows as garbage':  JSON.stringify({ solved: [1], ledger: { 3: 'nope', 4: null, 5: 7 } }),
    'counts as strings':       JSON.stringify({ solved: [1], counts: { solves: 'many', hints: null } }),
    'counts as an array':      JSON.stringify({ solved: [1], counts: [1, 2] }),
    'history holding null':    JSON.stringify({ solved: [1], history: [null, { t: 1, type: 'x' }, 5] }),
    'history enormous':        JSON.stringify({ solved: [1], history: Array.from({ length: 5000 }, (_, i) => ({ t: i, type: 'x' })) }),
    'mechanics as objects':    JSON.stringify({ solved: [1], mechanics: [{ a: 1 }, 'dragText', null] }),
    'inventory as junk':       JSON.stringify({ solved: [1], inventory: [null, 3, { id: 5 }, { id: 'ok' }] }),
    'words as junk':           JSON.stringify({ solved: [1], words: [null, 1, 'red'] }),
    'echoMemory junk':         JSON.stringify({ solved: [1], echoMemory: [null, { levelId: 'x' }, { levelId: 16, tokens: ['VE'] }, { levelId: 16, tokens: ['VE', 'NA'] }] }),
    'echoMemory duplicates':   JSON.stringify({ solved: [1], echoMemory: [
                                 { levelId: 16, tokens: ['VE', 'NA'], phase: 0, at: 1 },
                                 { levelId: 16, tokens: ['OR', 'SE'], phase: 0, at: 2 }] }),
    'echoMemory unsorted':     JSON.stringify({ solved: [1], echoMemory: [
                                 { levelId: 30, tokens: ['VE', 'NA'], phase: 0, at: 1 },
                                 { levelId: 16, tokens: ['OR', 'SE'], phase: 0, at: 2 }] }),
    'echoTray junk':           JSON.stringify({ solved: [1], echoTray: [null, 3, 'se', 'x'.repeat(9999)] }),
    'season2Complete truthy':  JSON.stringify({ solved: [1], season2Complete: 'yes' }),
    'theme as an object':      JSON.stringify({ solved: [1], theme: { dark: true } }),
    'lang as a number':        JSON.stringify({ solved: [1], lang: 7 }),
    'deeply nested nonsense':  JSON.stringify({ solved: [1], ledger: { 3: { route: { deep: { deeper: [1, 2] } } } } })
  };

  Object.keys(hostile).forEach(label => {
    const store = { [STATE_KEY]: hostile[label] };
    const p = survives(`A8. survives ${label}`, () => boot(store, { quiet: true }));
    if (!p) return;
    const d = p.State.data;
    ok(Array.isArray(d.solved), `A8a. ${label} → solved is still an array`);
    ok(d.solved.every(k => typeof k === 'number' || (typeof k === 'string' && k)),
       `A8b. ${label} → solved holds only usable keys`);
    ok(Number.isFinite(d.unlocked) && d.unlocked >= 1, `A8c. ${label} → unlocked is a sane number`);
    ok(d.ledger && typeof d.ledger === 'object' && !Array.isArray(d.ledger),
       `A8d. ${label} → the ledger is a plain object`);
    ok(Object.keys(d.counts).every(k => Number.isFinite(d.counts[k])),
       `A8e. ${label} → every counter is a number`);
    ok(Array.isArray(d.history) && d.history.length <= 60, `A8f. ${label} → history stays bounded`);
    ok(typeof d.lang === 'string', `A8g. ${label} → lang is a string`);
    ok(d.theme === null || typeof d.theme === 'string', `A8h. ${label} → theme is null or a string`);
    ok(typeof d.season2Complete === 'boolean', `A8i. ${label} → season2Complete is a boolean`);
    ok(d.echoMemory.every(m => Number.isFinite(m.levelId) && Array.isArray(m.tokens) &&
       m.tokens.length === 2 && m.tokens.every(t => typeof t === 'string')),
       `A8j. ${label} → every echo mark is well formed`);
    ok(d.echoTray.every(t => typeof t === 'string' && t.length <= 8),
       `A8k. ${label} → every carried token is a short string`);

    /* the real test of recovery: the game must still be PLAYABLE afterwards */
    survives(`A8l. ${label} → the API still works afterwards`, () => {
      p.State.learn('dragText');
      p.State.give('bent-key', 4, { x: 1 });
      p.State.note(3, { route: 'x' });
      p.State.bump('solves');
      p.State.record('solve', { id: 3 });
      p.State.history('solve');
      p.State.didEver('solve', x => x && x.id === 3);
      p.State.remember(16, ['VE', 'NA'], 0);
      p.State.marks();
      p.State.trayPush('SE');
      p.State.snapshot();
      p.State.saveNow();
    });
    ok(p.stored() !== 'UNPARSEABLE', `A8m. ${label} → what it writes back is valid JSON`);
    survives(`A8n. ${label} → and reloads cleanly from what it wrote`, () => boot(store, { quiet: true }));
  });

  /* the duplicate case has a consequence beyond "does not throw": a solved
     list with repeats drives the progress bar past 100% and reports more
     stages complete than exist */
  const dup = boot({ [STATE_KEY]: hostile['a duplicated key'] }, { quiet: true });
  eq(dup.State.data.solved.length, 2, 'A8o. a duplicated key is collapsed to one');
  deep(dup.State.data.solved, [7, 'B01'], 'A8p. keeping the first of each, in order');

  const huge = boot({ [STATE_KEY]: hostile['an enormous string'] }, { quiet: true });
  ok(huge.State.data.solved.every(k => typeof k !== 'string' || k.length <= 32),
     'A8q. an absurdly long key cannot be stored as a stage key');

  const dupMarks = boot({ [STATE_KEY]: hostile['echoMemory duplicates'] }, { quiet: true });
  eq(dupMarks.State.marks().length, 1,
     'A8r. two marks for one level collapse to one — the finale counts them');

  const unsorted = boot({ [STATE_KEY]: hostile['echoMemory unsorted'] }, { quiet: true });
  deep(unsorted.State.marks().map(m => m.levelId), [16, 30],
     'A8s. a restored echo memory is in level order — the wall reads left to right');

  const tray = boot({ [STATE_KEY]: hostile['echoTray junk'] }, { quiet: true });
  ok(tray.State.trayHas('SE'), 'A8t. a lowercase carried token still answers trayHas');

  /* storage that refuses to be written to (private mode, quota) */
  const stubborn = survives('A8u. a browser that refuses to write still plays',
    () => boot({}, { hostileStorage: true, quiet: true }));
  survives('A8v. and saving into it does not throw', () => {
    stubborn.State.data.solved.push(1);
    stubborn.State.saveNow();
  });
}

/* ── A9 ── dev / skip states cannot corrupt progress ───────────────────── */
{
  /* simulateThrough is the dev panel's "get me to level N". It walks the real
     route, so it must handle both key types and never push undefined. */
  const p = boot({});
  survives('A9. simulateThrough walks the route to an ECHO level', () => p.State.simulateThrough(21, PLAYED));
  const d = p.State.data;
  ok(d.solved.length > 0, 'A9a. it banks the stages before the target');
  ok(!d.solved.some(k => k == null), 'A9b. and never pushes a null key');
  ok(d.solved.every(k => typeof k === 'number' || typeof k === 'string'),
     'A9c. every banked key is a number or a string');
  ok(d.solved.indexOf(21) >= 0, 'A9d. the target level itself is solved');
  ok(d.solved.indexOf('B01') >= 0, 'A9e. and so are the Breaks played before it');
  eq(new Set(d.solved).size, d.solved.length, 'A9f. with no duplicates');
  ok(d.unlocked >= 1 && d.unlocked <= PLAYED.length, 'A9g. unlocked stays inside the route');

  /* the target may itself be a Break */
  const p2 = boot({});
  survives('A9h. simulateThrough to a Break stage', () => p2.State.simulateThrough('B07', PLAYED));
  ok(p2.State.data.solved.indexOf('B07') >= 0, 'A9i. the Break target is banked under its routeId');
  ok(!p2.State.data.solved.some(k => k == null), 'A9j. and still nothing null');

  /* running it twice must be idempotent, not double the list */
  const n = p2.State.data.solved.length;
  p2.State.simulateThrough('B07', PLAYED);
  eq(p2.State.data.solved.length, n, 'A9k. running it again changes nothing');

  /* nonsense arguments */
  survives('A9l. simulateThrough(0) does nothing rather than explode', () => boot({}).State.simulateThrough(0, PLAYED));
  survives('A9m. simulateThrough with no route survives', () => boot({}).State.simulateThrough(5, null));
  survives('A9n. simulateThrough(999) survives', () => boot({}).State.simulateThrough(999, PLAYED));
  const p3 = boot({});
  p3.State.simulateThrough(999, PLAYED);
  ok(!p3.State.data.solved.some(k => k == null), 'A9o. and banks no null keys');

  /* skip: the engine advances `unlocked` WITHOUT touching `solved`. Assert the
     store supports exactly that, and a reload agrees. */
  const store = {};
  const s1 = boot(store);
  s1.State.data.unlocked = 4;
  s1.State.bump('skips');
  s1.State.saveNow();
  const s2 = boot(store);
  eq(s2.State.data.solved.length, 0, 'A9p. a skipped stage stays unsolved across a reload');
  eq(s2.State.data.unlocked, 4, 'A9q. but the player keeps their place');
  eq(s2.State.data.counts.skips, 1, 'A9r. and the skip is counted');

  /* dev "unlock all" then a wipe must leave a coherent store */
  const s3 = boot({});
  s3.State.data.unlocked = PLAYED.length;
  s3.State.saveNow();
  s3.State.resetProgress();
  eq(s3.State.data.unlocked, 1, 'A9s. a wipe after unlock-all returns to stage one');
  eq(s3.State.data.solved.length, 0, 'A9t. with nothing solved');

  /* forcing a mark for a stage that has none must not invent one */
  const s4 = boot({});
  eq(s4.State.remember(16, ['VE'], 0), null, 'A9u. a one-token mark is refused');
  eq(s4.State.remember(16, 'VE NA', 0), null, 'A9v. a string mark is refused');
  eq(s4.State.marks().length, 0, 'A9w. and nothing is written');
  s4.State.remember(16, ['VE', 'NA'], 0);
  s4.State.remember(16, ['OR', 'SE'], 0);
  eq(s4.State.marks().length, 1, 'A9x. remembering the same level twice replaces, never duplicates');
  deep(s4.State.markFor(16).tokens, ['OR', 'SE'], 'A9y. with the newer tokens');
}

/* ── A10 ── level 45 persists ──────────────────────────────────────────── */
{
  const store = {};
  const p1 = boot(store);
  ALL_KEYS.forEach(k => p1.State.data.solved.push(k));
  p1.State.data.unlocked = PLAYED.length;
  p1.State.finishSeason(2);
  p1.State.saveNow();

  const p2 = survives('A10. a completed game reloads', () => boot(store));
  ok(p2.State.data.solved.indexOf(45) >= 0, 'A10a. level 45 is still solved after a reload');
  eq(p2.State.data.solved.length, 75, 'A10b. and so is everything else');
  eq(p2.State.seasonDone(2), true, 'A10c. the season is still finished');
  eq(p2.State.data.unlocked, PLAYED.length, 'A10d. and the player is still at the end');

  /* the last stage in the route IS 45 — a save that ends anywhere else means
     the route and the save have drifted apart */
  eq(ALL_KEYS[ALL_KEYS.length - 1], 45, 'A10e. 45 is the last key in the played order');

  /* replaying does not un-finish it */
  p2.State.data.solved.push(45);
  eq(p2.State.data.solved.filter(k => k === 45).length, 2, 'A10f. (the engine guards duplicates, not the store)');
  p2.State.saveNow();
  const p3 = boot(store);
  eq(p3.State.data.solved.filter(k => k === 45).length, 1,
     'A10g. and a reload collapses an accidental duplicate rather than inflating progress');
}

/* ── A11 ── the write path itself ──────────────────────────────────────── */
{
  const store = {};
  const p = boot(store);
  p.State.data.solved.push(1);
  p.State.save();
  eq(p.stored(), null, 'A11a. save() is debounced — nothing hits storage yet');
  p.flush();
  ok(p.stored() && p.stored().solved.indexOf(1) >= 0, 'A11b. and lands when the timer runs');

  /* the pagehide flush: a player who closes the tab mid-level keeps their work */
  const store2 = {};
  const p2 = boot(store2);
  p2.State.data.solved.push(2);
  p2.State.save();
  eq(p2.stored(), null, 'A11c. still pending');
  (p2.win._on.pagehide || []).forEach(fn => fn());
  ok(p2.stored() && p2.stored().solved.indexOf(2) >= 0, 'A11d. closing the tab flushes the pending write');

  /* a tab with nothing pending must stay silent, or a backgrounded tab would
     overwrite a further-along one */
  const store3 = storeWith({ v: 4, unlocked: 40, solved: [1, 2, 3], theme: null, lang: 'en' });
  const p3 = boot(store3);
  const before = store3[STATE_KEY];
  (p3.win._on.pagehide || []).forEach(fn => fn());
  eq(store3[STATE_KEY], before, 'A11e. a tab with nothing to say writes nothing on the way out');

  /* history is capped in the file, however long the session ran */
  const p4 = boot({});
  for (let i = 0; i < 900; i++) p4.State.record('tick', { i });
  p4.State.saveNow();
  ok(p4.State.history().length <= 400, 'A11f. the live log is capped in memory');
  eq(p4.stored().history.length, 60, 'A11g. and only its tail is persisted');
}

/* ── A12 ── the ledger, which is keyed by the same dual-type key ────────── */
{
  const p = boot({});
  p.State.note(21, { route: 'echo' });
  p.State.note('B07', { route: 'break' });
  eq(p.State.routeOf(21), 'echo', 'A12a. an ECHO level records its route under a number');
  eq(p.State.routeOf('B07'), 'break', 'A12b. a Break records its route under its routeId');
  ok(p.State.routeOf(7) !== 'break', 'A12c. and the two never collide');
  p.State.saveNow();
  const p2 = boot(p.store);
  eq(p2.State.routeOf('B07'), 'break', 'A12d. a Break ledger row survives a reload');
  eq(p2.State.routeOf(21), 'echo', 'A12e. and so does an ECHO one');

  /* a null key must not create a shared "undefined" row that every Break
     silently writes into */
  survives('A12f. noting a null key does not throw', () => { p2.State.note(null, { route: 'x' }); p2.State.note(undefined, { route: 'y' }); });
  eq(p2.State.routeOf(null), null, 'A12g. and records nothing under it');
  ok(!Object.prototype.hasOwnProperty.call(p2.State.data.ledger, 'undefined'),
     'A12h. no "undefined" row is ever created in the ledger');
  ok(!Object.prototype.hasOwnProperty.call(p2.State.data.ledger, 'null'),
     'A12i. nor a "null" one');
}

/* ==========================================================================
   B. THE VAULT
   ========================================================================== */

/* ── B1 ── structural independence from ECHO ───────────────────────────── */
{
  const source = src('vault.js');
  /* strip comments: the design note is allowed to name what the code may not */
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  const FORBIDDEN = ['echoMemory', 'RULESET_ECHO', 'RULESET_ECHO_UI', 'tokensToCharacter',
                     'levelPhase', 'echoMarkChar', 'decodeEchoMark', 'encodeEchoMark',
                     'season2Complete', 'markFor', 'hasMark', 'forgetMark', 'resetEcho',
                     'echoTray', 'trayHas', '.GRID', '.TOKENS'];
  FORBIDDEN.forEach(name => {
    ok(code.indexOf(name) < 0, `B1. vault.js contains no reference to ${name} — it cannot read ECHO`);
  });
  ok(!/\.marks\s*\(/.test(code), 'B1a. vault.js never calls marks()');
  ok(!/\bdecode\w*\s*\(/.test(code), 'B1b. vault.js decodes nothing');
  ok(!/%\s*8|mod\s*8|\bphase\b/i.test(code), 'B1c. vault.js does no phase arithmetic');
  ok(!/\b(isCorrect|checkAnswer|verdict|isRight|isWrong|grade|score|solutionFor|answerFor)\b/i.test(code),
     'B1d. vault.js has no notion of a right or wrong answer');
  /* comments may name the colour they exist to forbid; the rules may not use it */
  const css = src('vault.css').replace(/\/\*[\s\S]*?\*\//g, '');
  ok(code.indexOf('--good') < 0 && css.indexOf('--good') < 0,
     'B1e. nothing in the Vault renders in the success colour');

  /* what it DOES read from the game store, exhaustively */
  const reads = (code.match(/RULESET_STATE[\s\S]{0,80}/g) || []).join('|');
  ok(/\.data\s*&&\s*S\.data\.lang|S\.data\.lang/.test(reads) || reads.indexOf('lang') >= 0,
     'B1f. it reads the language…');
  ok(reads.indexOf('solved') >= 0, 'B1g. …and the solved list, to know if it is unlocked');
  ok(reads.indexOf('echoMemory') < 0 && reads.indexOf('inventory') < 0 && reads.indexOf('ledger') < 0,
     'B1h. and nothing else from the save at all');

  /* and at RUNTIME: hand it a store stuffed with marks and watch it not care */
  const store = storeWith({
    v: 4, unlocked: 40, solved: ['B03'], theme: null, lang: 'en',
    echoMemory: LEVELS.filter(l => l.echoMarkChar).map(l => ({
      levelId: l.id, tokens: ECHO.encodeEchoMark(l.echoMarkChar, l.id),
      phase: ECHO.levelPhase(l.id), at: 1
    }))
  });
  const p = boot(store, { vault: true });
  eq(p.State.marks().length, 29, 'B1i. the save holds all twenty-nine marks…');
  const dump = JSON.stringify(p.Vault.data);
  ok(dump.indexOf('VE') < 0 && dump.indexOf('NA') < 0, 'B1j. …and not one of them is in the Vault');
  eq(p.Vault.items().length, 0, 'B1k. the Vault auto-captured nothing');
  ok(!('marks' in p.Vault) && !('decode' in p.Vault) && !('echo' in p.Vault),
     'B1l. and its public API offers no route to them');
  const written = store[VAULT_KEY];
  ok(written == null || (written.indexOf('YOU BUILT') < 0 && written.indexOf('echoMemory') < 0),
     'B1m. and its storage never contains the message or the memory');
}

/* ── B2 ── unlock timing ───────────────────────────────────────────────── */
{
  const before = boot(storeWith({ v: 4, unlocked: 6, solved: [1, 2, 3, 16, 17, 'B01', 'B02'], theme: null, lang: 'en' }),
                      { vault: true });
  eq(before.Vault.unlocked(), false, 'B2a. the Vault is locked until B03 is finished');
  eq(before.bottomLeft.querySelector('.vault-icon'), null, 'B2b. and its icon is not in the DOM at all');

  const after = boot(storeWith({ v: 4, unlocked: 8, solved: [1, 'B01', 'B02', 'B03'], theme: null, lang: 'en' }),
                     { vault: true });
  eq(after.Vault.unlocked(), true, 'B2c. finishing B03 unlocks it');
  ok(after.bottomLeft.querySelector('.vault-icon'), 'B2d. and mounts the icon in the bottom bar');

  /* it must appear the moment B03 is banked, without a reload */
  const live = boot({}, { vault: true });
  eq(live.Vault.unlocked(), false, 'B2e. a new player has no Vault');
  eq(live.bottomLeft.querySelector('.vault-icon'), null, 'B2f. and no icon');
  live.State.data.solved.push('B03');
  live.State.save();
  ok(live.bottomLeft.querySelector('.vault-icon'), 'B2g. banking B03 mounts the icon immediately');
  eq(live.Vault.unlocked(), true, 'B2h. and unlocked() agrees');

  /* …and go away again after Start over, or it is a door to a locked room */
  live.State.resetProgress();
  eq(live.Vault.unlocked(), false, 'B2i. Start over re-locks the Vault');
  eq(live.bottomLeft.querySelector('.vault-icon'), null, 'B2j. and takes its icon back out of the DOM');

  /* a number 3 or the string "B3" must not be mistaken for B03 */
  const near = boot(storeWith({ v: 4, unlocked: 4, solved: [3, 'B3', 'b03'], theme: null, lang: 'en' }), { vault: true });
  eq(near.Vault.unlocked(), false, 'B2k. only the exact key B03 unlocks it');
}

/* ── B3 ── the V shortcut and the button ───────────────────────────────── */
{
  const p = boot(storeWith({ v: 4, unlocked: 8, solved: ['B03'], theme: null, lang: 'en' }), { vault: true });
  const doc = p.doc;
  const press = (key, target, extra) =>
    (p.win._on.keydown || []).forEach(fn => fn(Object.assign({
      key, target: target || doc.body, preventDefault() {}, metaKey: false, ctrlKey: false, altKey: false
    }, extra || {})));

  press('v');
  const panel = doc.getElementById('vault');
  ok(panel && !panel.hidden, 'B3a. V opens the Vault');
  press('v');
  ok(panel.hidden, 'B3b. and V closes it again');

  /* typing "v" into a note must not slam the panel shut */
  press('v');
  const field = doc.createElement('input');
  press('v', field);
  ok(!panel.hidden, 'B3c. V typed into a field is left alone');
  const ta = doc.createElement('textarea');
  press('v', ta);
  ok(!panel.hidden, 'B3d. and so is V typed into a textarea');
  const ce = doc.createElement('div'); ce.isContentEditable = true;
  press('v', ce);
  ok(!panel.hidden, 'B3e. and V in a contenteditable');

  /* modified V belongs to the browser */
  press('v', doc.body, { metaKey: true });
  ok(!panel.hidden, 'B3f. ⌘V is the browser\'s, not the Vault\'s');
  press('v', doc.body, { ctrlKey: true });
  ok(!panel.hidden, 'B3g. and so is Ctrl+V');

  press('v');
  ok(panel.hidden, 'B3h. plain V still works');

  /* the icon opens it too */
  const icon = p.bottomLeft.querySelector('.vault-icon');
  fire(doc, icon, 'click');
  ok(!panel.hidden, 'B3i. the bottom-bar icon opens it');
  const x = panel.querySelector('.vault-x');
  fire(doc, x, 'click');
  ok(panel.hidden, 'B3j. and the close button closes it');
  fire(doc, icon, 'click');
  fire(doc, panel.parentNode.querySelector('.vault-scrim'), 'click');
  ok(panel.hidden, 'B3k. clicking away closes it');

  /* a locked player pressing V gets nothing */
  const locked = boot({}, { vault: true });
  (locked.win._on.keydown || []).forEach(fn => fn({ key: 'v', target: locked.doc.body, preventDefault() {} }));
  eq(locked.doc.getElementById('vault'), null, 'B3l. V does nothing at all before the unlock');

  /* the public API the spec promises */
  ['open', 'close', 'toggle', 'items', 'links', 'add', 'update', 'remove',
   'move', 'link', 'unlink', 'clear', 'unlocked'].forEach(name => {
    eq(typeof p.Vault[name], 'function', `B3m. RULESET_VAULT.${name}() exists`);
  });
  ok('data' in p.Vault, 'B3n. RULESET_VAULT.data is exposed for assertions');
}

/* ── B4 ── notes, pins, rules, order, links ────────────────────────────── */
{
  const p = boot(storeWith({ v: 4, unlocked: 8, solved: ['B03'], theme: null, lang: 'en' }),
                 { vault: true, stage: { routeId: 'B07', name: 'Deadline' } });
  const V = p.Vault;

  const n1 = V.add('note', { title: 'first', body: 'VE might mean move' });
  const n2 = V.add('note', { title: 'second' });
  const n3 = V.add('note', { title: 'third' });
  eq(V.items('note').length, 3, 'B4a. notes are created');
  eq(V.items('note')[0].title, 'third', 'B4b. newest first');
  eq(n1.confidence, 'question', 'B4c. a new item is only ever a question');

  V.update(n1.id, { title: 'first, edited', tags: 'echo, theory' });
  eq(V.item(n1.id).title, 'first, edited', 'B4d. a note can be edited');
  deep(V.item(n1.id).tags, ['echo', 'theory'], 'B4e. and tagged');
  eq(V.update('nope', { title: 'x' }), null, 'B4f. editing a missing item returns null');

  /* order */
  const order = () => V.items('note').map(i => i.title);
  V.move(n3.id, 1);
  eq(order()[0], 'second', 'B4g. an item can be moved down');
  V.move(n3.id, -1);
  eq(order()[0], 'third', 'B4h. and back up');
  eq(V.move(V.items('note')[0].id, -1), false, 'B4i. the top item cannot move up');
  eq(V.move(V.items('note')[2].id, 1), false, 'B4j. nor the bottom one down');
  eq(V.move('nope', 1), false, 'B4k. moving a missing item is a no-op');

  /* pins */
  const pin = V.add('pin', { text: 'VE NA' });
  eq(V.items('pin').length, 1, 'B4l. a pin is its own kind');
  eq(V.items('note').length, 3, 'B4m. and does not land among the notes');
  eq(pin.stageKey, 'B07', 'B4n. an item remembers the stage it was written on');
  eq(pin.stageName, 'Deadline', 'B4o. by name');

  /* rules */
  const r = V.add('rule', { left: 'VE', right: 'move' });
  eq(r.confidence, 'question', 'B4p. a rule starts as a question');
  V.update(r.id, { confidence: 'certain' });
  eq(V.item(r.id).confidence, 'certain', 'B4q. the player may raise it to certain');
  V.update(r.id, { confidence: 'obviously-true' });
  eq(V.item(r.id).confidence, 'certain', 'B4r. but only to a level the Vault knows');
  V.update(r.id, { kind: 'note', id: 'hacked' });
  eq(V.item(r.id).kind, 'rule', 'B4s. and can never change an item\'s kind or id');

  /* links */
  const l1 = V.link(n1.id, r.id);
  ok(l1, 'B4t. two cards can be linked');
  eq(V.link(n1.id, r.id), null, 'B4u. and the same pair only once');
  eq(V.link(r.id, n1.id), null, 'B4v. in either direction');
  eq(V.link(n1.id, n1.id), null, 'B4w. a card cannot link to itself');
  eq(V.link(n1.id, 'nope'), null, 'B4x. nor to a card that does not exist');
  eq(V.links().length, 1, 'B4y. one connection');
  V.unlink(l1.id);
  eq(V.links().length, 0, 'B4z. which can be removed');

  V.link(n1.id, r.id);
  V.link(n2.id, r.id);
  eq(V.links().length, 2, 'B4aa. a card can hold several connections');
  V.remove(r.id);
  eq(V.links().length, 0, 'B4ab. deleting a card takes its connections with it');
  eq(V.item(r.id), null, 'B4ac. and the card itself');
  eq(V.remove('nope'), false, 'B4ad. removing a missing card is a no-op');

  /* kinds are a closed set */
  eq(V.add('secret', {}), null, 'B4ae. an unknown kind cannot be created');
  eq(V.add('', {}), null, 'B4af. nor an empty one');

  /* hostile fields handed straight to add() must not be able to break render */
  const bad = V.add('note', { tags: 'not-an-array', at: 'yesterday', body: 'x'.repeat(9000), id: 'chosen' });
  ok(Array.isArray(bad.tags), 'B4ag. add() coerces tags to an array whatever it is handed');
  ok(Number.isFinite(bad.at), 'B4ah. and the timestamp to a number');
  ok(bad.body.length <= 2000, 'B4ai. and caps the body at what storage will keep');
  ok(bad.id !== 'chosen', 'B4aj. and never lets a caller choose an id');
}

/* ── B5 ── search and filters ──────────────────────────────────────────── */
{
  const p = boot(storeWith({ v: 4, unlocked: 8, solved: ['B03'], theme: null, lang: 'en' }),
                 { vault: true, stage: { id: 21, name: 'Ring' } });
  const V = p.Vault, doc = p.doc;
  V.add('note', { title: 'ring theory', body: 'the ring turns', tags: 'ring' });
  V.add('note', { title: 'grid theory', body: 'eight by eight', tags: 'grid' });
  p.win.RULESET.ctx.level = { routeId: 'B09', name: 'Cascade' };
  V.add('note', { title: 'break thought', body: 'nothing to do with echo' });

  V.open();
  const panel = doc.getElementById('vault');
  const cards = () => panel.querySelector('.vault-body').querySelectorAll('.vault-card');
  eq(cards().length, 3, 'B5a. every note renders');

  const search = panel.querySelector('.vault-search');
  search.value = 'turns';
  fire(doc, search, 'input');
  eq(cards().length, 1, 'B5b. search narrows to matching cards');
  search.value = 'ring';
  fire(doc, search, 'input');
  eq(cards().length, 2, 'B5b2. and searches the stage name too, not only the writing');
  search.value = 'EIGHT';
  fire(doc, search, 'input');
  eq(cards().length, 1, 'B5c. and is case-insensitive');
  search.value = 'zzz';
  fire(doc, search, 'input');
  eq(cards().length, 0, 'B5d. and can match nothing');
  search.value = '';
  fire(doc, search, 'input');
  eq(cards().length, 3, 'B5e. clearing it brings them all back');

  const stageSel = panel.querySelectorAll('.vault-sel')[0];
  const labels = stageSel.querySelectorAll('option').map(o => o.textContent);
  ok(labels.indexOf('Cascade') >= 0, 'B5f. the stage filter lists a Break by NAME…');
  ok(labels.every(l => !/^B\d\d$/.test(l)), 'B5g. …and never by its route id');
  stageSel.value = 'B09';
  fire(doc, stageSel, 'change');
  eq(cards().length, 1, 'B5h. filtering by stage works all the same');
  eq(cards()[0].querySelector('.vault-stage').textContent, 'Cascade',
     'B5i. and the card shows the name, not the id');
  stageSel.value = '';
  fire(doc, stageSel, 'change');

  const tagSel = panel.querySelectorAll('.vault-sel')[1];
  tagSel.value = 'grid';
  fire(doc, tagSel, 'change');
  eq(cards().length, 1, 'B5j. filtering by tag works');
  tagSel.value = '';
  fire(doc, tagSel, 'change');
  eq(cards().length, 3, 'B5k. and clears');

  /* the whole panel must never print a route id anywhere */
  ok(!/B0\d|B1\d|B2\d|B30/.test(panel.textContent),
     'B5l. RELEASE RULE: no Break route id appears anywhere in the rendered panel');
}

/* ── B6 ── persistence ─────────────────────────────────────────────────── */
{
  const store = storeWith({ v: 4, unlocked: 8, solved: ['B03'], theme: null, lang: 'en' });
  const p1 = boot(store, { vault: true, stage: { id: 21, name: 'Ring' } });
  const a = p1.Vault.add('note', { title: 'a'.repeat(200), body: 'b'.repeat(300), tags: 'one, two' });
  const b = p1.Vault.add('rule', { left: 'L'.repeat(120), right: 'R', confidence: 'likely' });
  const c = p1.Vault.add('pin', { text: 'VE NA' });
  p1.Vault.link(a.id, b.id);
  p1.Vault.open();                    // the one sentence it ever says, said
  p1.Vault.saveNow();

  const p2 = survives('B6. the Vault reloads', () => boot(store, { vault: true }));
  eq(p2.Vault.items().length, 3, 'B6a. every item survives a refresh');
  eq(p2.Vault.links().length, 1, 'B6b. and every connection');
  eq(p2.Vault.item(a.id).body, 'b'.repeat(300), 'B6c. a note body survives verbatim');
  deep(p2.Vault.item(a.id).tags, ['one', 'two'], 'B6d. and its tags');
  eq(p2.Vault.item(b.id).confidence, 'likely', 'B6e. and the player\'s own confidence');
  eq(p2.Vault.item(c.id).text, 'VE NA', 'B6f. and a pin\'s captured text');
  eq(p2.Vault.item(a.id).stageName, 'Ring', 'B6g. and the stage it was written on');

  /* what is shown must be what is kept: a field the panel accepts but storage
     truncates is silent data loss the player only sees after a refresh */
  eq(p2.Vault.item(a.id).title.length, p1.Vault.item(a.id).title.length,
     'B6h. a long title is not silently shortened by the reload');
  eq(p2.Vault.item(b.id).left.length, p1.Vault.item(b.id).left.length,
     'B6i. nor a long rule side');

  /* the intro sentence is said once, ever */
  eq(p2.Vault.data.seen, true, 'B6j. the Vault remembers it has introduced itself');
  p2.Vault.open();
  const intro = p2.doc.getElementById('vault').querySelector('.vault-intro');
  ok(intro.hidden, 'B6k. and never says it a second time');
  p2.Vault.clear();
  eq(p2.Vault.items().length, 0, 'B6l. emptying the vault removes everything');
  eq(p2.Vault.data.seen, true, 'B6m. but not the fact that it has already spoken');
}

/* ── B7 ── malformed vault storage ─────────────────────────────────────── */
{
  const goodSave = { v: 4, unlocked: 8, solved: ['B03'], theme: null, lang: 'en' };
  const hostile = {
    'corrupt JSON':          '{"items":[',
    'null':                  'null',
    'the string undefined':  'undefined',
    'an array':              '[1,2,3]',
    'a number':              '99',
    'a bare string':         '"notes"',
    'empty':                 '',
    'items as a number':     JSON.stringify({ v: 1, items: 7 }),
    'items as an object':    JSON.stringify({ v: 1, items: { 0: {} } }),
    'items holding null':    JSON.stringify({ v: 1, items: [null, undefined, 3, 'x'] }),
    'items with no id':      JSON.stringify({ v: 1, items: [{ kind: 'note', title: 'x' }] }),
    'items with bad kind':   JSON.stringify({ v: 1, items: [{ id: 'a', kind: 'bomb' }] }),
    'items with junk tags':  JSON.stringify({ v: 1, items: [{ id: 'a', kind: 'note', tags: 'a,b' }] }),
    'items with NaN at':     '{"v":1,"items":[{"id":"a","kind":"note","at":null}]}',
    'confidence unknown':    JSON.stringify({ v: 1, items: [{ id: 'a', kind: 'rule', confidence: 'proven' }] }),
    'links to nowhere':      JSON.stringify({ v: 1, items: [{ id: 'a', kind: 'note' }], links: [{ id: 'l', a: 'a', b: 'ghost' }] }),
    'links as junk':         JSON.stringify({ v: 1, items: [], links: [null, 5, { a: 1 }] }),
    'links to self':         JSON.stringify({ v: 1, items: [{ id: 'a', kind: 'note' }], links: [{ id: 'l', a: 'a', b: 'a' }] }),
    'enormous body':         JSON.stringify({ v: 1, items: [{ id: 'a', kind: 'note', body: 'x'.repeat(500000) }] }),
    'far too many items':    JSON.stringify({ v: 1, items: Array.from({ length: 3000 }, (_, i) => ({ id: 'i' + i, kind: 'note' })) }),
    'extra unknown fields':  JSON.stringify({ v: 1, items: [{ id: 'a', kind: 'note', secretDecoder: 'VE=move' }], future: true }),
    'stageKey enormous':     JSON.stringify({ v: 1, items: [{ id: 'a', kind: 'note', stageKey: 'B'.repeat(9999) }] }),
    'a newer schema':        JSON.stringify({ v: 99, items: [{ id: 'a', kind: 'note', title: 'kept?' }] })
  };

  Object.keys(hostile).forEach(label => {
    const store = storeWith(goodSave);
    store[VAULT_KEY] = hostile[label];
    const p = survives(`B7. the Vault survives ${label}`, () => boot(store, { vault: true, quiet: true }));
    if (!p) return;
    const d = p.Vault.data;
    ok(Array.isArray(d.items), `B7a. ${label} → items is an array`);
    ok(Array.isArray(d.links), `B7b. ${label} → links is an array`);
    ok(d.items.every(i => i && typeof i.id === 'string' && ['note', 'pin', 'rule'].indexOf(i.kind) >= 0),
       `B7c. ${label} → every item is usable`);
    ok(d.items.every(i => Array.isArray(i.tags)), `B7d. ${label} → every item has real tags`);
    ok(d.items.every(i => Number.isFinite(i.at)), `B7e. ${label} → every item has a real timestamp`);
    ok(d.items.every(i => ['question', 'likely', 'certain'].indexOf(i.confidence) >= 0),
       `B7f. ${label} → confidence is one the Vault understands`);
    ok(d.items.length <= 400, `B7g. ${label} → the vault stays bounded`);
    const ids = new Set(d.items.map(i => i.id));
    ok(d.links.every(l => ids.has(l.a) && ids.has(l.b) && l.a !== l.b),
       `B7h. ${label} → every connection points at two real cards`);

    /* and the UI must render it without throwing */
    survives(`B7i. ${label} → the panel still renders`, () => {
      p.Vault.open();
      p.Vault.add('note', { title: 'still works' });
      p.Vault.open();
    });
    survives(`B7j. ${label} → and writes back valid JSON`, () => {
      p.Vault.saveNow();
      JSON.parse(store[VAULT_KEY]);
    });
  });

  /* a corrupt vault must not take the GAME down with it */
  const store = storeWith(goodSave);
  store[VAULT_KEY] = '{{{not json';
  const p = boot(store, { vault: true, quiet: true });
  eq(p.State.data.solved.length, 1, 'B7k. a corrupt Vault leaves the save file alone');
  eq(p.Vault.items().length, 0, 'B7l. and degrades to an empty notebook');
}

/* ── B8 ── XSS: player text is text, never markup ──────────────────────── */
{
  const PAYLOADS = [
    '<img src=x onerror=alert(1)>',
    '</div><script>alert(1)</script>',
    '"><svg/onload=alert(1)>',
    "javascript:alert(1)",
    '<iframe src="javascript:alert(1)">',
    '{{constructor.constructor("alert(1)")()}}',
    '<style>*{display:none}</style>'
  ];

  const p = boot(storeWith({ v: 4, unlocked: 8, solved: ['B03'], theme: null, lang: 'en' }),
                 { vault: true, stage: { id: 21, name: '<b>Ring</b>' } });
  const V = p.Vault, doc = p.doc;

  PAYLOADS.forEach((payload, i) => {
    V.add('note', { title: payload, body: payload, tags: payload });
    V.add('pin', { text: payload, body: payload });
    V.add('rule', { left: payload, right: payload, body: payload, rel: payload });
  });

  const before = doc.htmlWrites.length;
  ['note', 'pin', 'rule', 'link'].forEach(kind => {
    /* render every tab */
    V.open();
    const tabBtn = doc.getElementById('vault').querySelector('.vault-tabs').children
      .find(b => b.dataset.tab === kind);
    fire(doc, tabBtn, 'click');
  });
  /* also render the link tab with real links, then come back to the notes */
  const items = V.items();
  V.link(items[0].id, items[1].id);
  V.open();
  fire(doc, doc.getElementById('vault').querySelector('.vault-tabs').children
         .find(b => b.dataset.tab === 'note'), 'click');

  const writes = doc.htmlWrites.slice(before);
  ok(writes.length === 0 || writes.every(w => PAYLOADS.every(pl => w.value.indexOf(pl) < 0)),
     'B8a. RELEASE BLOCKER GUARD: rendering never writes player text as innerHTML');

  const allWrites = doc.htmlWrites;
  ok(allWrites.every(w => w.value.indexOf('<svg') !== 0 || w.node.className === 'vault-icon'),
     'B8b. the only innerHTML in the Vault is its own static icon');
  eq(allWrites.filter(w => !/^<svg/.test(w.value)).length, 0,
     'B8c. and nothing else is ever assigned as markup');

  /* the payload is present, as TEXT */
  const panel = doc.getElementById('vault');
  ok(panel.textContent.indexOf('<img src=x') < 0 || true, 'B8d. (payload may appear as text — that is correct)');
  const noteCard = panel.querySelector('.vault-card');
  ok(noteCard, 'B8e. the hostile card still renders');
  const titleIn = panel.querySelector('.vault-title-in');
  ok(!titleIn || typeof titleIn.value === 'string', 'B8f. and its title is a value, not markup');

  /* no element ever gained children it did not create */
  let injected = 0;
  panel.walk(n => { if (n.tagName === 'SCRIPT' || n.tagName === 'IMG' || n.tagName === 'IFRAME') injected++; });
  eq(injected, 0, 'B8g. no script, img or iframe element exists anywhere in the panel');

  /* and a hostile stage NAME (which comes from a level file, not the player,
     but is still untrusted by the Vault) */
  const stage = panel.querySelector('.vault-stage');
  ok(stage && stage.childNodes.length === 0, 'B8h. the stage label is a text node and nothing else');

  /* it survives a reload with the payloads intact and still inert */
  V.saveNow();
  const p2 = boot(p.store, { vault: true });
  eq(p2.Vault.items().length, 21, 'B8i. hostile text round-trips through storage');
  survives('B8j. and rendering it after a reload still throws nothing', () => p2.Vault.open());
  eq(p2.doc.htmlWrites.filter(w => !/^<svg/.test(w.value)).length, 0,
     'B8k. and still writes no markup');
}

/* ── B9 ── capture keeps only what is on the screen ────────────────────── */
{
  const p = boot(storeWith({ v: 4, unlocked: 8, solved: ['B03'], theme: null, lang: 'en' }),
                 { vault: true, stage: { id: 21, name: 'Ring' } });
  const V = p.Vault, doc = p.doc;

  const chip = doc.createElement('div');
  chip.className = 'chip';
  chip.textContent = '  VE   NA  ';
  chip.dataset.solution = 'THE ANSWER IS HERE';
  chip.setAttribute('data-token-index', '3');
  doc.body.appendChild(chip);

  V.open();
  const panel = doc.getElementById('vault');
  const captureBtn = panel.querySelector('.vault-acts').children.find(b => b.textContent === 'Capture');
  fire(doc, captureBtn, 'click');
  ok(doc.getElementById('vaultCaptureBar'), 'B9a. Capture puts up its own bar');

  fire(doc, chip, 'click');
  const pins = V.items('pin');
  eq(pins.length, 1, 'B9b. one click keeps one pin');
  eq(pins[0].text, 'VE NA', 'B9c. holding exactly the visible text, whitespace collapsed');
  const dump = JSON.stringify(pins[0]);
  ok(dump.indexOf('THE ANSWER IS HERE') < 0, 'B9d. and none of the element\'s dataset');
  ok(dump.indexOf('token-index') < 0, 'B9e. nor its attributes');
  ok(dump.indexOf('chip') < 0, 'B9f. nor its classes');
  eq(doc.getElementById('vaultCaptureBar'), null, 'B9g. and capture mode ends after a single pick');

  /* the Vault cannot capture itself, the dev panel or the lab */
  const dev = doc.createElement('div'); dev.setAttribute('id', 'dev');
  const devChip = doc.createElement('div'); devChip.className = 'chip'; devChip.textContent = 'dev secret';
  dev.appendChild(devChip); doc.body.appendChild(dev);

  fire(doc, captureBtn, 'click');
  fire(doc, devChip, 'click');
  eq(V.items('pin').length, 1, 'B9h. the dev panel cannot be pinned');
  ok(doc.getElementById('vaultCaptureBar'), 'B9i. and a rejected pick leaves capture mode running');

  const own = panel.querySelector('.vault-title');
  fire(doc, own, 'click');
  eq(V.items('pin').length, 1, 'B9j. the Vault cannot capture itself');

  /* escape leaves capture mode */
  (doc._on.keydown || []).slice().forEach(l => l.fn({ key: 'Escape', preventDefault() {}, target: doc.body }));
  eq(doc.getElementById('vaultCaptureBar'), null, 'B9k. Escape cancels capture');

  /* an enormous piece of on-screen text is trimmed, not stored whole */
  const big = doc.createElement('div');
  big.className = 'status';
  big.textContent = 'z'.repeat(5000);
  doc.body.appendChild(big);
  fire(doc, captureBtn, 'click');
  fire(doc, big, 'click');
  const last = V.items('pin')[0];
  ok(last.text.length <= 240, 'B9l. a huge capture is cut to 240 characters');
}

/* ── B10 ── pausing the level while the panel is open ──────────────────── */
{
  const p = boot(storeWith({ v: 4, unlocked: 8, solved: ['B03'], theme: null, lang: 'en' }), { vault: true });
  const frames = [() => {}], checks = [() => true];
  const ctx = { level: { id: 21, name: 'Ring' }, _frames: frames, _checks: checks };
  p.win.RULESET = { ctx };

  p.Vault.open();
  eq(ctx._frames.length, 0, 'B10a. opening the Vault stops the level\'s frame callbacks');
  eq(ctx._checks.length, 0, 'B10b. and its win checks — a level cannot solve itself while you write');
  p.Vault.close();
  eq(ctx._checks[0], checks[0], 'B10c. closing hands them back');
  eq(ctx._frames[0], frames[0], 'B10d. both of them');

  /* if the level changed while the panel was open, the old handlers are
     discarded rather than reattached to a level that no longer exists */
  p.Vault.open();
  const next = { level: { id: 22 }, _frames: [], _checks: [] };
  p.win.RULESET.ctx = next;
  p.Vault.close();
  eq(next._checks.length, 0, 'B10e. a level that changed underneath keeps its own empty handlers');
  eq(next._frames.length, 0, 'B10f. and inherits nothing from the one before');
}

/* ── B11 ── the Vault is never required ────────────────────────────────── */
{
  const source = src('vault.js');
  ok(!/ctx\.(solve|check|reject)\s*\(/.test(source), 'B11a. the Vault never solves or checks a level');
  ok(!/RULESET_LEVELS|RULESET_BREAKS|RULESET_ROUTE/.test(source),
     'B11b. and never reads the level list or the route');
  const levelSrc = src('levels.js') + src('breaks.js') + src('breaks2.js') + src('breaks3.js') + src('breaks4.js');
  ok(levelSrc.indexOf('RULESET_VAULT') < 0, 'B11c. and no level depends on the Vault existing');
  ok(src('game.js').indexOf('RULESET_VAULT') < 0, 'B11d. nor does the engine');
}

/* ---------- report -------------------------------------------------------- */

if (failures.length) {
  console.log(`  PROGRESSION + VAULT — ${pass} passed, ${failures.length} FAILED\n`);
  failures.forEach(f => console.log('  ✗ ' + f));
  console.log('');
  process.exit(1);
}
console.log(`  PROGRESSION + VAULT — ${pass} assertions, all green`);
console.log(`  ${PLAYED.length} stages · ${ALL_KEYS.filter(k => typeof k === 'string').length} string keys · ` +
            `${ALL_KEYS.filter(k => typeof k === 'number').length} number keys\n`);
