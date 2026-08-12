/* ==========================================================================
   RULESET — persistent state
   --------------------------------------------------------------------------
   One store, one localStorage key, loaded before the engine.

   The v1 fields (`unlocked`, `solved`, `theme`, `lang`) stay at the TOP LEVEL
   and keep their exact shape forever. The co-op layer (live.js) reads
   `save.solved.length` directly, and any player's browser may still hold a v1
   save. Everything added since lives alongside them under `v: 2`.

   Four things are remembered:
     mechanics   what the player has been taught, so later levels can assume it
     inventory   objects that outlive the level that produced them
     ledger      per-level facts: routes taken, answers given, hints, restarts
     history     a rolling log of what the player did, for puzzle logic

   None of this is analytics. It never leaves the machine, and it exists so a
   level in the twenties can ask "did you ever do X?" and get a true answer.
   ========================================================================== */

window.RULESET_STATE = (function () {
'use strict';

const KEY = 'ruleset:v1';        // unchanged: v1 saves must still load
const SCHEMA = 4;
const HISTORY_LIVE = 400;        // kept in memory this session
const HISTORY_KEPT = 60;         // persisted across reloads
const INVENTORY_MAX = 64;

/* ------------------------------------------------------------- shape ----- */

function blank() {
  return {
    /* --- v1. Never rename, never nest. live.js depends on these. --- */
    unlocked: 1,
    solved: [],
    theme: null,
    lang: 'en',

    /* --- v2 --- */
    v: SCHEMA,
    mechanics: [],          // discovered mechanic ids
    inventory: [],          // { id, from, at, data }
    words: [],              // words carried out of instructions
    ledger: {},             // levelId -> { route, answer, hints, restarts, ms, at }
    counts: {
      solves: 0, restarts: 0, hints: 0, skips: 0,
      langChanges: 0, themeChanges: 0, wipes: 0
    },
    history: [],            // tail only; the live log is in memory

    /* --- v3: Season II --- */
    echoMemory: [],         // { levelId, tokens:[t,t], phase, at }
                            // ENCODED tokens only. The decoded character is
                            // never stored: reading a mark must always cost
                            // the player the same act of decoding.

    /* --- v4 --- */
    echoTray: [],           // tokens the player is carrying between levels
    season2Complete: false
  };
}

/* Merge an unknown save over a blank one, field by field, trusting nothing.
   A corrupt or partial save degrades to defaults rather than throwing. */
function migrate(raw) {
  const d = blank();
  if (!raw || typeof raw !== 'object') return d;

  // v1 fields — the only ones a legacy save is guaranteed to have
  if (Number.isFinite(raw.unlocked)) d.unlocked = Math.max(1, raw.unlocked | 0);
  /* Solved keys were all numbers until Break levels arrived; those save under a
     routeId string ('B01'). Filtering to numbers here silently erased every
     Break the player finished, on every reload. */
  if (Array.isArray(raw.solved)) {
    d.solved = raw.solved.filter(v => Number.isFinite(v) || (typeof v === 'string' && v !== ''));
  }
  if (typeof raw.theme === 'string') d.theme = raw.theme;
  if (typeof raw.lang === 'string') d.lang = raw.lang;

  // v2 fields — absent on a legacy save, which is fine
  if (Array.isArray(raw.mechanics)) d.mechanics = raw.mechanics.filter(s => typeof s === 'string');
  if (Array.isArray(raw.inventory)) d.inventory = raw.inventory.filter(it => it && typeof it.id === 'string');
  if (Array.isArray(raw.words)) d.words = raw.words.filter(s => typeof s === 'string');
  if (raw.ledger && typeof raw.ledger === 'object') d.ledger = raw.ledger;
  if (raw.counts && typeof raw.counts === 'object') Object.assign(d.counts, raw.counts);
  if (Array.isArray(raw.history)) d.history = raw.history.slice(-HISTORY_KEPT);

  // v4 fields
  if (Array.isArray(raw.echoTray)) {
    d.echoTray = raw.echoTray.filter(t => typeof t === 'string').slice(0, 16);
  }
  if (raw.season2Complete === true) d.season2Complete = true;

  // v3 fields — absent on a v1/v2 save, which is fine
  if (Array.isArray(raw.echoMemory)) {
    d.echoMemory = raw.echoMemory.filter(m =>
      m && Number.isFinite(m.levelId) && Array.isArray(m.tokens) && m.tokens.length === 2);
  }

  d.v = SCHEMA;
  return d;
}

/** Empty an object and refill it, preserving its identity for held references. */
function replace(target, next) {
  Object.keys(target).forEach(k => delete target[k]);
  Object.assign(target, next);
  return target;
}

let data;
try {
  data = migrate(JSON.parse(localStorage.getItem(KEY) || 'null'));
} catch (e) {
  data = blank();
}

/* The full session log. Only its tail is persisted, so a long session cannot
   grow the save without bound. */
const live = data.history.slice();

/* ------------------------------------------------------------- writing --- */

let pending = 0;

function write() {
  try {
    data.history = live.slice(-HISTORY_KEPT);
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) { /* private mode, quota — the game still plays */ }
}

/* Most callers are in a pointer or frame loop; batch them to one write. */
function save() {
  if (pending) return;
  pending = setTimeout(() => { pending = 0; write(); }, 60);
}

/* A debounced write is lost if the page goes away first — collect an object
   and close the tab and it would never have existed. Flush on the way out.
   Only when a write is actually queued: a page with nothing pending must stay
   silent, or a backgrounded tab would overwrite a further-along one. */
if (typeof window !== 'undefined') {
  const flush = () => { if (!pending) return; clearTimeout(pending); pending = 0; write(); };
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

const listeners = [];
function emit() { listeners.forEach(fn => { try { fn(data); } catch (e) {} }); }

/* ---------------------------------------------------------------- api ---- */

const State = {

  get data() { return data; },
  get SCHEMA() { return SCHEMA; },

  save() { save(); emit(); },
  saveNow() { if (pending) { clearTimeout(pending); pending = 0; } write(); emit(); },
  onChange(fn) { listeners.push(fn); return fn; },

  /* -- mechanics ---------------------------------------------------------
     What the player has been shown. Future levels consult this to decide how
     much scaffolding to give, and to refuse to introduce a mechanic twice. */

  learn(id) {
    if (!id || data.mechanics.indexOf(id) >= 0) return false;
    data.mechanics.push(id);
    this.record('learn', { mechanic: id });
    save(); emit();
    return true;
  },
  knows(id) { return data.mechanics.indexOf(id) >= 0; },
  knowsAll(ids) { return (ids || []).every(id => this.knows(id)); },
  mechanics() { return data.mechanics.slice(); },
  unlearn(id) {
    const i = data.mechanics.indexOf(id);
    if (i < 0) return false;
    data.mechanics.splice(i, 1);
    save(); emit();
    return true;
  },

  /* -- inventory ---------------------------------------------------------
     Objects that survive a level. `data` is any JSON-safe payload the level
     wants to carry: a colour, a word, coordinates, a serialised shape. */

  give(id, from, payload) {
    if (!id) return null;
    const existing = this.item(id);
    if (existing) return existing;
    if (data.inventory.length >= INVENTORY_MAX) return null;
    const item = { id: String(id), from: from == null ? null : from, at: Date.now(), data: payload };
    data.inventory.push(item);
    this.record('collect', { id: item.id, from: item.from });
    save(); emit();
    return item;
  },
  take(id) {
    const i = data.inventory.findIndex(it => it.id === id);
    if (i < 0) return null;
    const [item] = data.inventory.splice(i, 1);
    this.record('consume', { id });
    save(); emit();
    return item;
  },
  has(id) { return data.inventory.some(it => it.id === id); },
  hasAll(ids) { return (ids || []).every(id => this.has(id)); },
  item(id) { return data.inventory.find(it => it.id === id) || null; },
  items() { return data.inventory.slice(); },

  /** Turn one object into another in place, keeping its position in the tray. */
  transform(id, nextId, payload) {
    const it = this.item(id);
    if (!it) return null;
    it.id = String(nextId);
    if (payload !== undefined) it.data = payload;
    this.record('transform', { from: id, to: it.id });
    save(); emit();
    return it;
  },

  /* -- words -------------------------------------------------------------
     Words carried out of an instruction are a special kind of object: a later
     level may want the literal text the player took. */

  keepWord(word, from) {
    const w = String(word || '').trim();
    if (!w || data.words.indexOf(w) >= 0) return false;
    data.words.push(w);
    this.record('keepWord', { word: w, from });
    save(); emit();
    return true;
  },
  hasWord(word) { return data.words.indexOf(String(word).trim()) >= 0; },
  wordsKept() { return data.words.slice(); },

  /* -- ledger ------------------------------------------------------------
     One row per level the player has engaged with. `route` is how they solved
     it, which matters for levels with more than one valid answer. */

  row(levelId) {
    return data.ledger[levelId] ||
      (data.ledger[levelId] = { route: null, answer: null, hints: 0, restarts: 0, ms: 0, at: null });
  },
  note(levelId, patch) { Object.assign(this.row(levelId), patch); save(); emit(); },
  routeOf(levelId) { return (data.ledger[levelId] || {}).route || null; },
  answerOf(levelId) { return (data.ledger[levelId] || {}).answer || null; },
  hintsOn(levelId) { return (data.ledger[levelId] || {}).hints || 0; },

  /* -- counters ----------------------------------------------------------- */

  bump(name, by) {
    if (!(name in data.counts)) data.counts[name] = 0;
    data.counts[name] += (by == null ? 1 : by);
    save();
    return data.counts[name];
  },
  count(name) { return data.counts[name] || 0; },

  /* -- history -----------------------------------------------------------
     A ring buffer of what the player did. Deliberately coarse: a type, the
     level it happened on, and a small detail object. */

  record(type, detail) {
    const e = { t: Date.now(), type: type, level: State.currentLevel, d: detail || null };
    live.push(e);
    if (live.length > HISTORY_LIVE) live.splice(0, live.length - HISTORY_LIVE);
    return e;
  },
  history(filter) {
    if (!filter) return live.slice();
    if (typeof filter === 'string') return live.filter(e => e.type === filter);
    return live.filter(filter);
  },
  didEver(type, match) {
    return live.some(e => e.type === type && (!match || match(e.d, e)));
  },
  currentLevel: null,        // engine keeps this in step

  /* -- resets ------------------------------------------------------------- */

  /* Both resets rewrite the store IN PLACE. The engine holds a reference to
     this exact object (`const save = State.data`), so replacing it would
     leave the engine writing to an orphan. */

  /** Erase progress but keep preferences and the fact that you started over. */
  resetProgress() {
    const keep = { theme: data.theme, lang: data.lang };
    const wipes = (data.counts && data.counts.wipes || 0) + 1;
    replace(data, Object.assign(blank(), keep));
    data.counts.wipes = wipes;
    live.length = 0;
    this.saveNow();
  },

  /** Erase absolutely everything, preferences included. */
  resetAll() {
    replace(data, blank());
    live.length = 0;
    this.saveNow();
  },

  /** Pretend the player solved levels 1..n, for testing later levels. */
  simulateThrough(n, levels) {
    const route = levels || [];
    /* A stage is saved under its own key: canonical id for an ECHO level,
       routeId for a Break. Comparing `lv.id > n` skipped every Break (their id
       is undefined, and undefined > n is false) and then pushed `undefined`
       into solved. Walk the route to the target stage instead. */
    const keyOf = st => (st && st.id != null) ? st.id : (st && st.routeId) || null;
    let stop = route.findIndex(st => keyOf(st) === n);
    if (stop < 0) {
      stop = route.reduce((best, st, i) => (st.id != null && st.id <= n ? i : best), -1);
    }
    if (stop < 0) stop = Math.min(n, route.length) - 1;

    route.slice(0, stop + 1).forEach(lv => {
      const key = keyOf(lv);
      if (key == null) return;
      if (data.solved.indexOf(key) < 0) data.solved.push(key);
      const taught = lv.mechanicIntroduced;
      if (Array.isArray(taught)) taught.forEach(id => this.learn(id));
      else if (taught) this.learn(taught);
      this.note(key, { route: 'simulated', at: Date.now() });
    });
    data.unlocked = Math.max(data.unlocked, Math.min(stop + 2, route.length || stop + 2));
    this.saveNow();
  },

  /** Everything, for the Puzzle Lab's state view. */
  /* ------------------------------------------------------ echo memory --- */
  /* Season II. The game remembers every mark so the player never needs a
     screenshot or a notebook — the final puzzle must be solvable from inside
     RULESET alone. Marks are stored ENCODED; decoding stays the player's job. */

  /** Record a level's mark. Idempotent: replaying a level cannot duplicate it. */
  remember(levelId, tokens, phase) {
    if (!Array.isArray(tokens) || tokens.length !== 2) return null;
    const id = levelId | 0;
    const existing = data.echoMemory.find(m => m.levelId === id);
    const entry = {
      levelId: id,
      tokens: [String(tokens[0]), String(tokens[1])],
      phase: phase | 0,
      at: Date.now()
    };
    if (existing) Object.assign(existing, entry);
    else data.echoMemory.push(entry);
    data.echoMemory.sort((a, b) => a.levelId - b.levelId);
    save(); emit();
    return entry;
  },

  /** Every mark collected so far, in level order. */
  marks() { return data.echoMemory.map(m => Object.assign({}, m)); },

  markFor(levelId) {
    const m = data.echoMemory.find(x => x.levelId === (levelId | 0));
    return m ? Object.assign({}, m) : null;
  },

  hasMark(levelId) { return !!data.echoMemory.find(x => x.levelId === (levelId | 0)); },

  forgetMark(levelId) {
    const i = data.echoMemory.findIndex(x => x.levelId === (levelId | 0));
    if (i < 0) return false;
    data.echoMemory.splice(i, 1);
    save(); emit();
    return true;
  },

  /* ------------------------------------------------------- echo tray --- */
  /* Tokens the player carries between levels. Deliberately part of the save
     rather than of any level: the whole point is that it outlives the level
     that filled it, and nothing tells the player for how long. */

  tray() { return data.echoTray.slice(); },
  trayHas(tok) { return data.echoTray.indexOf(String(tok).toUpperCase()) >= 0; },

  trayPush(tok) {
    const t = String(tok).toUpperCase();
    if (data.echoTray.length >= 16) return null;
    data.echoTray.push(t);
    save(); emit();
    return t;
  },

  /** Spend a token. Returns false if it was not being carried. */
  trayTake(tok) {
    const i = data.echoTray.indexOf(String(tok).toUpperCase());
    if (i < 0) return false;
    data.echoTray.splice(i, 1);
    save(); emit();
    return true;
  },

  /* ------------------------------------------------------ season end --- */

  finishSeason(n) {
    if (n === 2) { data.season2Complete = true; save(); emit(); }
    return true;
  },
  seasonDone(n) { return n === 2 ? !!data.season2Complete : false; },

  /** Season II only — leaves Season I progress alone. */
  resetEcho() {
    data.echoMemory.length = 0;
    data.echoTray.length = 0;
    data.season2Complete = false;
    save(); emit();
  },

  snapshot() { return JSON.parse(JSON.stringify(data)); }
};

return State;

})();
