/* ==========================================================================
   RULESET — engine
   --------------------------------------------------------------------------
   Levels never touch the DOM directly. They receive a context object (`ctx`)
   that owns every element, listener, timer and rAF they create, so teardown
   is automatic and levels stay ~30 lines of pure puzzle logic.

   Public level shape (see levels.js / README.md):
     { id, name, instruction, hint, hint2, setup(ctx), cleanup(ctx) }
   ========================================================================== */

(function () {
'use strict';

/* ------------------------------------------------------------ language -- */

const I18N = window.RULESET_I18N || { ORDER: ['en'], en: { dir: 'ltr', htmlLang: 'en' } };

/**
 * Resolve a possibly-localised value.
 *   t('Hint')                       → 'Hint'          (plain strings pass through)
 *   t({ en: 'Hint', ar: 'تلميح' })  → the active language, falling back to en
 * Levels use this for every visible string, so a level object stays one object
 * no matter how many languages it carries.
 */
function t(v) {
  if (v == null || typeof v !== 'object' || Array.isArray(v)) return v;
  return v[lang] != null ? v[lang] : v.en;
}

/** The chrome string table for the active language. */
function S() { return I18N[lang] || I18N.en; }

/* Arabic marks that must not participate in word identity: harakat, tatweel,
   dagger alef. They change spelling, not the word, and a player can type or
   drag either form. Display text keeps them; only the lookup key drops them. */
const AR_MARKS = /[ً-ْـٰٓ-ٕ]/g;

function normWord(s) {
  return String(s).normalize('NFC')
    .replace(AR_MARKS, '')
    .replace(/[^\p{L}\p{N}'-]/gu, '')
    .toLowerCase();
}

/* ------------------------------------------------------------------ save -- */
/* The store lives in state.js. `save` is the same object the engine has always
   used — the v1 field names are unchanged — so everything below reads as
   before, while mechanics, inventory, ledger and history ride alongside. */

const State = window.RULESET_STATE || {
  data: { unlocked: 1, solved: [], theme: null, lang: 'en', mechanics: [], inventory: [] },
  save() {}, saveNow() {}, learn() {}, knows() { return false; }, knowsAll() { return true; },
  give() { return null; }, take() { return null; }, has() { return false; }, hasAll() { return true; },
  item() { return null; }, items() { return []; }, keepWord() {}, hasWord() { return false; },
  wordsKept() { return []; }, row() { return {}; }, note() {}, routeOf() { return null; },
  answerOf() { return null; }, bump() {}, count() { return 0; }, record() {}, history() { return []; },
  didEver() { return false; }, resetProgress() {}, resetAll() {}, snapshot() { return {}; },
  simulateThrough() {}, onChange() {}, mechanics() { return []; }, unlearn() {}, transform() {}
};

const save = State.data;

function writeSave() { State.save(); }

/* Active language. `t()` above closes over this; it is only ever read at call
   time, and every call happens after this line runs. */
let lang = I18N[save.lang] ? save.lang : 'en';

/* ------------------------------------------------------------------- dom -- */

const $ = (s, r) => (r || document).querySelector(s);

const dom = {
  html:      document.documentElement,
  board:     $('#board'),
  stage:     $('#stage'),
  loose:     $('#loose'),
  instr:     $('#instruction'),
  status:    $('#status'),
  hint:      $('#hintline'),
  levelNum:  $('#levelNum'),
  levelTotal:$('#levelTotal'),
  levelName: $('#levelName'),
  track:     $('#progressTrack'),
  fill:      $('#progressFill'),
  knob:      $('#progressKnob'),
  ticks:     $('#progressTicks'),
  voidZone:  $('#void'),
  voidItems: $('#voidItems'),
  solved:    $('#solved'),
  solvedWord:$('#solvedWord'),
  solvedSub: $('#solvedSub'),
  btnNext:   $('#btnNext'),
  btnHint:   $('#btnHint'),
  btnRestart:$('#btnRestart'),
  btnReset:  $('#btnReset'),
  btnSkip:   $('#btnSkip'),
  btnTheme:  $('#btnTheme'),
  btnLang:   $('#btnLang'),
  zoomChip:  $('#zoomChip'),
  echoMark:  $('#echoMark'),
  echoTray:  $('#echoTray'),
  progress:  $('#progress'),
  voidLabel: $('#voidLabel'),
  devTitle:  $('#devTitle'),
  devClose:  $('#devClose'),
  dev:       $('#dev'),
  devGrid:   $('#devGrid'),
  devUnlock: $('#devUnlock'),
  devSolve:  $('#devSolve'),
  devWipe:   $('#devWipe')
};

/* -------------------------------------------------------------- geometry -- */
/* Every hit test uses viewport rects, so objects can live in different
   coordinate spaces (stage, loose layer, instruction) and still interact. */

const rectOf = el => el.getBoundingClientRect();
const centerOf = el => { const r = rectOf(el); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

function overlaps(a, b, pad) {
  pad = pad || 0;
  const A = rectOf(a), B = rectOf(b);
  return A.left - pad < B.right && A.right + pad > B.left &&
         A.top  - pad < B.bottom && A.bottom + pad > B.top;
}

function distance(a, b) {
  const A = centerOf(a), B = centerOf(b);
  return Math.hypot(A.x - B.x, A.y - B.y);
}

const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

/* Pointer capture is an optimisation, not a requirement: it can throw for
   synthetic or already-released pointers, and every drag also listens on
   window, so failure here is harmless. */
function capture(el, e) { try { el.setPointerCapture(e.pointerId); } catch (err) {} }
function release(el, e) { try { el.releasePointerCapture(e.pointerId); } catch (err) {} }

/* =========================================================================
   LevelContext — the whole API a level is allowed to use.
   ========================================================================= */

class LevelContext {
  constructor(level) {
    this.level = level;
    this.state = {};              // free scratch space for the level
    this.stage = dom.stage;
    this.board = dom.board;
    this.instructionEl = dom.instr;

    this._teardown = [];
    this._checks = [];
    this._frames = [];
    this._words = new Map();      // lowercase word -> span
    this._wordChange = [];
    this._discardables = 0;
    this._solved = false;
  }

  /* ---------------------------------------------------------- lifecycle -- */

  /** Resolve a { en, ar } string for the active language. */
  t(v) { return t(v); }

  /** The active language code, for the rare level that must branch on it. */
  get lang() { return lang; }

  /** Register an arbitrary teardown function. */
  own(fn) { this._teardown.push(fn); return fn; }

  /** Auto-removed event listener. */
  on(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    this.own(() => target.removeEventListener(type, fn, opts));
    return fn;
  }

  after(ms, fn) { const t = setTimeout(fn, ms); this.own(() => clearTimeout(t)); return t; }
  every(ms, fn) { const t = setInterval(fn, ms); this.own(() => clearInterval(t)); return t; }

  /** Per-frame callback, receives delta seconds. */
  frame(fn) { this._frames.push(fn); return fn; }

  /** Predicate polled every frame; returning true solves the level. */
  check(fn) { this._checks.push(fn); return fn; }

  /** Solve immediately. */
  solve() { engine.solve(); }

  /** Non-fatal negative feedback. */
  reject(msg) {
    dom.stage.classList.remove('is-shaking');
    void dom.stage.offsetWidth;
    dom.stage.classList.add('is-shaking');
    if (msg) this.say(msg, 'warn');
  }

  /** Small monospace status line under the stage. */
  say(msg, tone) {
    dom.status.textContent = msg || '';
    dom.status.className = 'status' + (tone ? ' is-' + tone : '');
  }

  /* --------------------------------------------------------------- dom --- */

  /**
   * Create an element. Appended to the stage unless `parent` is given.
   *   ctx.el('div', 'dot obj', { x: 40, y: 60, text: 'hi' })
   * x/y are absolute px within the parent.
   */
  el(tag, className, props) {
    props = props || {};
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (props.text != null) node.textContent = props.text;
    if (props.html != null) node.innerHTML = props.html;
    if (props.style) Object.assign(node.style, props.style);
    if (props.attrs) for (const k in props.attrs) node.setAttribute(k, props.attrs[k]);
    if (props.x != null) node.style.left = props.x + 'px';
    if (props.y != null) node.style.top = props.y + 'px';
    (props.parent || dom.stage).appendChild(node);
    this.own(() => node.remove());
    return node;
  }

  /** Absolute placement helper (px, relative to offsetParent). */
  place(el, x, y) { el.style.left = x + 'px'; el.style.top = y + 'px'; return el; }

  /** Stage size, for laying levels out responsively. */
  size() { const r = rectOf(dom.stage); return { w: r.width, h: r.height }; }

  /* ---------------------------------------------------------- geometry -- */

  rect(el)          { return rectOf(el); }
  center(el)        { return centerOf(el); }
  hits(a, b, pad)   { return overlaps(a, b, pad); }
  near(a, b, d)     { return distance(a, b) < (d == null ? 50 : d); }
  dist(a, b)        { return distance(a, b); }

  /* ------------------------------------------------------------- drag --- */

  /**
   * Make an element draggable with mouse, touch or pen.
   * opts: { onGrab, onMove(el,e), onDrop(el,e), axis:'x'|'y', bounds:'stage',
   *         discard:true, discardWhen(el), onDiscard(el), affordance:false,
   *         enabled(), clampX(x,el) }
   *
   * By default a discardable element is removed when dropped on the tray.
   * `discardWhen` overrides that test — words, for instance, count as removed
   * whenever they are dropped anywhere off the sentence.
   */
  drag(el, opts) {
    opts = opts || {};
    if (opts.affordance !== false) el.classList.add('grab');
    else el.style.touchAction = 'none';

    if (opts.discard) this._pushDiscardable();

    let px = 0, py = 0, ox = 0, oy = 0, live = false;

    const wantsDiscard = () => !!opts.discard &&
      (opts.discardWhen ? opts.discardWhen(el) : overlaps(el, dom.voidZone));

    const down = e => {
      if (opts.enabled && !opts.enabled()) return;
      if (e.button != null && e.button !== 0 && e.pointerType === 'mouse') return;
      live = true;
      capture(el, e);
      el.classList.add('is-dragging');
      if (opts.onGrab) opts.onGrab(el, e);           // may reparent the element
      // normalise anchoring: an element pinned with right/bottom, or laid out
      // by flow, must be converted to left/top before we can offset it
      if (opts.axis !== 'y' && (!el.style.left || el.style.right)) {
        el.style.left = el.offsetLeft + 'px'; el.style.right = '';
      }
      if (opts.axis !== 'x' && (!el.style.top || el.style.bottom)) {
        el.style.top = el.offsetTop + 'px'; el.style.bottom = '';
      }
      ox = parseFloat(el.style.left) || 0;
      oy = parseFloat(el.style.top) || 0;
      px = e.clientX; py = e.clientY;
      if (opts.discard) this._showVoid(true);
      e.preventDefault();
      e.stopPropagation();
    };

    const move = e => {
      if (!live) return;
      let nx = ox + (e.clientX - px);
      let ny = oy + (e.clientY - py);
      if (opts.bounds === 'stage') {
        const s = rectOf(dom.stage), r = rectOf(el);
        const par = rectOf(el.offsetParent || dom.stage);
        nx = clamp(nx, s.left - par.left, s.right - par.left - r.width);
        ny = clamp(ny, s.top - par.top, s.bottom - par.top - r.height);
      }
      if (opts.clampX) nx = opts.clampX(nx, el);

      /* Magnetism. Without it a destination has a dead zone: the object looks
         placed while it is still too shallow to register, then jumps to centre
         the instant it counts. Pulling toward the nearest target as you
         approach — gently at the edge of the field, firmly at the middle —
         makes placing a thing feel continuous instead of sticky-then-snap. */
      if (opts.magnet) {
        const targets = opts.magnet() || [];
        const hw = el.offsetWidth / 2, hh = el.offsetHeight / 2;
        const R = opts.magnetRadius || 62;
        let bx = 0, by = 0, best = Infinity;
        for (let i = 0; i < targets.length; i++) {
          const t = targets[i];
          if (!t || !t.isConnected) continue;
          const tx = t.offsetLeft + t.offsetWidth / 2 - hw;
          const ty = t.offsetTop + t.offsetHeight / 2 - hh;
          const d = Math.hypot(tx - nx, ty - ny);
          if (d < best) { best = d; bx = tx; by = ty; }
        }
        if (best < R) {
          const k = (1 - best / R) * (opts.magnetPull || 0.55);
          nx += (bx - nx) * k;
          ny += (by - ny) * k;
        }
      }

      // an axis-locked drag must not write the other axis: the element may be
      // anchored with bottom/right, and writing top/left would break it
      if (opts.axis !== 'y') el.style.left = nx + 'px';
      if (opts.axis !== 'x') el.style.top = ny + 'px';
      if (opts.discard) this._hotVoid(wantsDiscard());
      if (opts.onMove) opts.onMove(el, e);
    };

    const up = e => {
      if (!live) return;
      live = false;
      el.classList.remove('is-dragging');
      release(el, e);
      const kill = wantsDiscard();
      if (opts.discard) { this._showVoid(false); this._hotVoid(false); }
      if (kill && opts.onDiscard) opts.onDiscard(el, e);
      else if (opts.onDrop) opts.onDrop(el, e);
    };

    // move/up live on window so a fast drag can outrun the element
    this.on(el, 'pointerdown', down);
    this.on(window, 'pointermove', move);
    this.on(window, 'pointerup', up);
    this.on(window, 'pointercancel', up);
    return el;
  }

  /**
   * Add a resize handle.
   * opts: { mode:'box'|'font', min, max, onResize(value), keepRatio, gain }
   *   keepRatio:false  → width only, and the handle tracks horizontal drag 1:1
   *   gain             → 2 for centre-anchored elements, whose edge moves at
   *                      half the rate the width grows
   */
  resize(el, opts) {
    opts = opts || {};
    const mode = opts.mode || 'box';
    const min = opts.min != null ? opts.min : (mode === 'font' ? 12 : 24);
    const max = opts.max != null ? opts.max : (mode === 'font' ? 300 : 640);

    const handle = document.createElement('span');
    handle.className = 'rs-handle';
    el.appendChild(handle);
    this.own(() => handle.remove());

    let live = false, px = 0, py = 0, base = 0, baseH = 0;

    const read = () => mode === 'font'
      ? parseFloat(getComputedStyle(el).fontSize)
      : rectOf(el).width;

    const apply = v => {
      v = clamp(v, min, max);
      if (mode === 'font') el.style.fontSize = v + 'px';
      else {
        el.style.width = v + 'px';
        if (opts.keepRatio !== false) el.style.height = (baseH * (v / base)) + 'px';
      }
      if (opts.onResize) opts.onResize(v, el);
      return v;
    };

    const down = e => {
      live = true;
      capture(handle, e);
      base = read();
      baseH = rectOf(el).height;
      px = e.clientX; py = e.clientY;
      e.preventDefault(); e.stopPropagation();
    };
    const move = e => {
      if (!live) return;
      const dx = e.clientX - px, dy = e.clientY - py;
      if (mode === 'font') return apply(base + (dx + dy) / 2 * 0.9);
      const d = opts.keepRatio === false ? dx : (dx + dy) / 2;
      apply(base + d * (opts.gain || 1));
    };
    const up = e => {
      if (!live) return;
      live = false;
      release(handle, e);
    };

    this.on(handle, 'pointerdown', down);
    this.on(window, 'pointermove', move);
    this.on(window, 'pointerup', up);
    this.on(window, 'pointercancel', up);

    this.pinch(el, factor => apply(read() * factor));
    return { handle, apply, read };
  }

  /** Two-finger pinch on an element (touch) — cb receives a scale factor. */
  pinch(el, cb) {
    const pts = new Map();
    let last = 0;
    const down = e => { if (e.pointerType === 'mouse') return; pts.set(e.pointerId, e); if (pts.size === 2) last = spread(pts); };
    const move = e => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, e);
      if (pts.size === 2) {
        const d = spread(pts);
        if (last > 0) cb(d / last);
        last = d;
      }
    };
    const up = e => { pts.delete(e.pointerId); last = 0; };
    const spread = m => {
      const [a, b] = [...m.values()];
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    };
    this.on(el, 'pointerdown', down);
    this.on(el, 'pointermove', move);
    this.on(el, 'pointerup', up);
    this.on(el, 'pointercancel', up);
  }

  /** Move an element into the free layer, preserving its on-screen position. */
  /**
   * Lift an element into the free layer at the position it currently occupies.
   *
   * `at` exists because a caller may have already disturbed the layout before
   * it gets here — inserting a placeholder into a centred line, for instance,
   * re-centres that line and slides the element sideways. Pass the rect taken
   * BEFORE the disturbance and the element will not jump.
   */
  /**
   * Borrow an element that belongs to the application frame.
   *
   * detach() is for things a level made: it deletes them on teardown. Doing
   * that to the Hint button would remove it from the game permanently. This
   * remembers where the element lives and puts it back, styles and all.
   */
  borrow(el) {
    const parent = el.parentElement;
    const next = el.nextSibling;
    const style = el.getAttribute('style');
    this.own(() => {
      if (style == null) el.removeAttribute('style');
      else el.setAttribute('style', style);
      if (parent) parent.insertBefore(el, next);
    });
    return {
      el,
      lift: () => {
        if (el.parentElement === dom.loose) return el;
        const r = rectOf(el), b = rectOf(dom.board);
        el.style.width = r.width + 'px';
        el.style.height = r.height + 'px';
        el.style.position = 'absolute';
        el.style.margin = '0';
        el.style.left = (r.left - b.left) + 'px';
        el.style.top = (r.top - b.top) + 'px';
        dom.loose.appendChild(el);
        return el;
      }
    };
  }

  detach(el, at) {
    const r = at || rectOf(el), b = rectOf(dom.board);
    el.style.width = r.width + 'px';
    el.style.height = r.height + 'px';
    el.style.position = 'absolute';
    el.style.margin = '0';
    el.style.left = (r.left - b.left) + 'px';
    el.style.top = (r.top - b.top) + 'px';
    dom.loose.appendChild(el);
    this.own(() => el.remove());
    return el;
  }

  /* ------------------------------------------------------------- words --- */

  /**
   * Make instruction words draggable.
   *   ctx.words('end', { discard:false, onDrop })   — one word, kept
   *   ctx.words('*',   { onRemove })                — every word, discardable
   */
  words(which, opts) {
    opts = opts || {};
    const list = which === '*'
      ? [...this._words.keys()]
      : String(t(which)).split(/\s+/).filter(Boolean).map(normWord);

    const made = [];
    list.forEach(w => {
      const span = this._words.get(w);
      if (!span) return;
      span.classList.add('is-free');
      this.own(() => span.classList.remove('is-free'));

      this.drag(span, {
        affordance: false,
        discard: opts.discard !== false,
        // a word is "removed" whenever it is dropped off the sentence — that is
        // already what sentenceWords() reports, so the two can never disagree
        discardWhen: el => !overlaps(el, dom.instr, 4),
        onGrab: () => this._liftWord(span),
        onDrop: (el, e) => {
          // a discardable word dropped here overlaps the sentence, so it goes
          // back in place; a word the level wants kept stays where it landed
          if (opts.discard !== false) this._returnWord(el);
          this._notifyWords();
          if (opts.onDrop) opts.onDrop(el, e);
        },
        onDiscard: el => {
          this._binWord(el, w);
          this._notifyWords();
          if (opts.onRemove) opts.onRemove(w, el);
        }
      });
      made.push(span);
    });
    if (opts.onChange) this._wordChange.push(opts.onChange);
    return made;
  }

  /** Words still present in the sentence, lowercased, punctuation excluded. */
  sentenceWords() {
    return [...dom.instr.querySelectorAll('.w')]
      .filter(s => s.isConnected && !s.dataset.punct)
      .map(s => s.dataset.word);
  }

  /** The span for a given word (or null if it has left the sentence). */
  word(w) { return this._words.get(normWord(t(w))) || null; }

  /** Is this word still in the sentence? Normalises both sides. */
  hasWord(w) { return this.sentenceWords().indexOf(normWord(t(w))) >= 0; }

  onWordsChange(cb) { this._wordChange.push(cb); }

  /** Replace the instruction text mid-level (re-tokenises it). */
  setInstruction(text) { engine.renderInstruction(text, this); }

  /* ----------------------------------------------------- word internals -- */

  _liftWord(span) {
    if (span.dataset.lifted) return;
    span.dataset.lifted = '1';

    /* Measure BEFORE touching the DOM. The instruction is centred, so
       inserting the placeholder below widens the line and slides every word
       sideways by half its width — measuring after that point hands the drag
       a position the placeholder itself invented. */
    const at = rectOf(span);

    const ph = document.createElement('span');
    ph.className = 'ph';
    ph.style.width = at.width + 'px';
    ph.textContent = ' ';
    span.after(ph);
    this.own(() => ph.remove());
    span._ph = ph;

    // take the word's spacing with it, so the sentence closes up cleanly
    const spaceish = e => (e && e.classList && e.classList.contains('sp')) ? e : null;
    const sp = spaceish(span.previousElementSibling) || spaceish(span.nextElementSibling);
    if (sp) { sp.style.width = sp.offsetWidth + 'px'; span._sp = sp; }

    this.detach(span, at);
    requestAnimationFrame(() => {
      ph.style.width = '0px';
      ph.style.opacity = '0';
      if (sp) sp.style.width = '0px';
    });
  }

  /** Put a lifted word back exactly where it came from. */
  _returnWord(span) {
    const ph = span._ph;
    if (!ph || !ph.isConnected) return false;
    ['position', 'left', 'top', 'width', 'height', 'margin']
      .forEach(p => span.style.removeProperty(p));
    ph.replaceWith(span);
    if (span._sp) span._sp.style.width = '';
    delete span.dataset.lifted;
    span._ph = span._sp = null;
    return true;
  }

  _binWord(span, w) {
    const chip = document.createElement('span');
    chip.className = 'void-chip';
    chip.innerHTML = '<span></span><button type="button">&#8630;</button>';
    chip.firstChild.textContent = span.textContent;
    chip.lastChild.title = S().putItBack;
    dom.voidItems.appendChild(chip);
    dom.voidZone.classList.add('has-items');
    this.own(() => { chip.remove(); if (!dom.voidItems.children.length) dom.voidZone.classList.remove('has-items'); });

    span.remove();
    this._words.delete(w);

    // returning a word re-appends it to the sentence (order is not validated)
    this.on(chip.querySelector('button'), 'click', () => {
      chip.remove();
      if (!dom.voidItems.children.length) dom.voidZone.classList.remove('has-items');
      const fresh = engine.makeWordSpan(span.textContent.trim());
      dom.instr.appendChild(engine.makeSpace());
      dom.instr.appendChild(fresh);
      this._words.set(w, fresh);
      this.words(w, {});          // re-arm dragging
      this._notifyWords();
    });
  }

  _notifyWords() { this._wordChange.forEach(fn => fn(this.sentenceWords())); }

  /* ------------------------------------------------------- discard tray -- */

  _pushDiscardable() { this._discardables++; }
  _showVoid(on) { if (this._discardables) dom.voidZone.classList.toggle('is-on', !!on); }
  _hotVoid(on) { dom.voidZone.classList.toggle('is-hot', !!on); }

  /* ------------------------------------------------------- app chrome ---- */

  /**
   * Hand the top progress bar to the level.
   * Returns { value(), set(v) }; the engine restores the real bar on cleanup.
   */
  takeProgress(opts) {
    opts = opts || {};
    let value = opts.start || 0;
    dom.track.classList.add('is-live');
    const paint = () => {
      dom.fill.style.width = (value * 100) + '%';
      dom.knob.style.left = (value * 100) + '%';
    };
    paint();

    let live = false;
    const setFromEvent = e => {
      const r = rectOf(dom.track);
      value = clamp((e.clientX - r.left) / r.width, 0, 1);
      paint();
      if (opts.onChange) opts.onChange(value);
    };
    this.on(dom.track, 'pointerdown', e => {
      live = true; capture(dom.track, e); setFromEvent(e); e.preventDefault();
    });
    this.on(window, 'pointermove', e => { if (live) setFromEvent(e); });
    this.on(window, 'pointerup', e => {
      if (!live) return;
      live = false;
      release(dom.track, e);
    });

    this.own(() => { dom.track.classList.remove('is-live'); engine.paintProgress(); });
    return { value: () => value, set: v => { value = v; paint(); } };
  }

  /** Live viewport width — visualViewport aware, so pinch-zoom counts. */
  viewportWidth() {
    return Math.round(window.visualViewport ? window.visualViewport.width : window.innerWidth);
  }

  onViewportChange(cb) {
    this.on(window, 'resize', cb);
    if (window.visualViewport) {
      this.on(window.visualViewport, 'resize', cb);
      this.on(window.visualViewport, 'scroll', cb);
    }
  }

  /* =======================================================================
     CAPABILITIES
     -----------------------------------------------------------------------
     Opt-in helpers, never a schema. A level calls what it needs and ignores
     the rest; setup() remains the escape hatch for anything custom.
     ======================================================================= */

  /* ---------------------------------------------------------- text ------ */

  /**
   * Split a word of the instruction into individually draggable letters.
   * The word keeps its place in the sentence; each letter becomes an object.
   *   ctx.letters('end', { onChange(letters) })
   * Returns the array of letter spans, in original order.
   */
  letters(which, opts) {
    opts = opts || {};
    const span = this.word(which);
    if (!span) return [];

    const text = span.textContent;
    const made = [];
    span.textContent = '';
    span.classList.add('is-split');

    [...text].forEach((ch, i) => {
      const l = document.createElement('span');
      l.className = 'ltr';
      l.textContent = ch;
      l.dataset.ch = ch;
      l.dataset.idx = String(i);
      span.appendChild(l);
      made.push(l);

      if (opts.drag !== false) {
        this.drag(l, {
          affordance: false,
          discard: !!opts.discard,
          discardWhen: opts.discard ? (el => !overlaps(el, dom.instr, 4)) : null,
          onGrab: () => this._liftLetter(l),
          onDrop: () => { if (opts.onChange) opts.onChange(this.letterText(span)); },
          onDiscard: el => {
            el.remove();
            if (opts.onChange) opts.onChange(this.letterText(span));
          }
        });
      }
    });

    this.own(() => { span.classList.remove('is-split'); });
    this.mechanic('letters');
    return made;
  }

  /** The letters still inside a split word, read left to right on screen. */
  letterText(span) {
    if (!span) return '';
    return [...span.querySelectorAll('.ltr')]
      .filter(l => l.isConnected && !l.dataset.lifted)
      .map(l => l.dataset.ch).join('');
  }

  _liftLetter(l) {
    if (l.dataset.lifted) return;
    l.dataset.lifted = '1';
    const ph = document.createElement('span');
    ph.className = 'ph';
    ph.style.width = rectOf(l).width + 'px';
    l.after(ph);
    this.own(() => ph.remove());
    l._ph = ph;
    this.detach(l);
    requestAnimationFrame(() => { ph.style.width = '0px'; ph.style.opacity = '0'; });
  }

  /**
   * Let the player reorder the words of the instruction by dragging them
   * past each other. Solved state is read with ctx.sentenceText().
   *   ctx.reorder({ onChange(words) })
   */
  reorder(opts) {
    opts = opts || {};
    const spans = [...dom.instr.querySelectorAll('.w')].filter(s => !s.dataset.punct);

    spans.forEach(span => {
      span.classList.add('is-free');
      this.own(() => span.classList.remove('is-free'));
      this.drag(span, {
        affordance: false,
        onGrab: () => this._liftWord(span),
        onDrop: el => {
          // drop into the gap nearest the pointer, then rebuild the sentence
          const others = [...dom.instr.querySelectorAll('.w')].filter(s => s !== el);
          const mid = centerOf(el).x;
          let before = null;
          for (const o of others) {
            const c = centerOf(o);
            if (lang && S().dir === 'rtl' ? c.x > mid : c.x < mid) continue;
            before = o; break;
          }
          this._returnWord(el);
          if (before) dom.instr.insertBefore(el, before);
          else dom.instr.appendChild(el);
          this._normaliseSpaces();
          this._notifyWords();
          if (opts.onChange) opts.onChange(this.sentenceWords());
        }
      });
    });
    this.mechanic('reorderText');
    return spans;
  }

  /** Re-space the instruction after words have been moved around. */
  _normaliseSpaces() {
    [...dom.instr.querySelectorAll('.sp')].forEach(s => s.remove());
    const kids = [...dom.instr.children];
    kids.forEach((k, i) => {
      if (i === kids.length - 1) return;
      if (kids[i + 1] && kids[i + 1].dataset && kids[i + 1].dataset.punct) return;
      k.after(engine.makeSpace());
    });
  }

  /** The instruction as it currently reads, spaces normalised. */
  sentenceText() {
    return [...dom.instr.querySelectorAll('.w')]
      .filter(s => s.isConnected)
      .map(s => s.textContent).join(' ').replace(/\s+([^\p{L}\p{N}])/gu, '$1').trim();
  }

  /**
   * Make instruction words editable in place. The player types over them.
   *   ctx.editable('four', { onChange(word, span) })
   */
  editable(which, opts) {
    opts = opts || {};
    const list = which === '*'
      ? [...this._words.values()]
      : String(t(which)).split(/\s+/).filter(Boolean)
          .map(w => this._words.get(normWord(w))).filter(Boolean);

    list.forEach(span => {
      span.setAttribute('contenteditable', 'plaintext-only');
      span.setAttribute('spellcheck', 'false');
      span.classList.add('is-editable');
      this.own(() => {
        span.removeAttribute('contenteditable');
        span.classList.remove('is-editable');
      });
      this.on(span, 'input', () => {
        span.dataset.word = normWord(span.textContent);
        this._notifyWords();
        if (opts.onChange) opts.onChange(span.textContent.trim(), span);
      });
      this.on(span, 'keydown', e => {
        e.stopPropagation();                       // never reaches level keys
        if (e.key === 'Enter') { e.preventDefault(); span.blur(); }
      });
    });
    this.mechanic('editText');
    return list;
  }

  /** Give a word a resize handle, so the sentence can be physically retyped. */
  scalable(which, opts) {
    const span = this.word(which);
    if (!span) return null;
    span.style.display = 'inline-block';
    const h = this.resize(span, Object.assign({ mode: 'font', min: 10, max: 90 }, opts || {}));
    this.mechanic('scaleText');
    return h;
  }

  /* -------------------------------------------------------- objects ----- */

  /**
   * Add a rotation handle.
   *   ctx.rotate(el, { onRotate(deg), snap: 15 })
   * Returns { handle, angle(), set(deg) }.
   */
  rotate(el, opts) {
    opts = opts || {};
    let deg = opts.start || 0;

    const handle = document.createElement('span');
    handle.className = 'rot-handle';
    el.appendChild(handle);
    this.own(() => handle.remove());

    const base = () => (el.style.transform || '').replace(/rotate\([^)]*\)/, '').trim();
    const paint = () => {
      el.style.transform = (base() + ' rotate(' + deg.toFixed(1) + 'deg)').trim();
      if (opts.onRotate) opts.onRotate(deg, el);
    };
    paint();

    let live = false, startAngle = 0, startDeg = 0;
    const angleTo = e => {
      const c = centerOf(el);
      return Math.atan2(e.clientY - c.y, e.clientX - c.x) * 180 / Math.PI;
    };

    this.on(handle, 'pointerdown', e => {
      live = true; capture(handle, e);
      startAngle = angleTo(e); startDeg = deg;
      e.preventDefault(); e.stopPropagation();
    });
    this.on(window, 'pointermove', e => {
      if (!live) return;
      deg = startDeg + (angleTo(e) - startAngle);
      if (opts.snap) deg = Math.round(deg / opts.snap) * opts.snap;
      paint();
    });
    this.on(window, 'pointerup', e => {
      if (!live) return;
      live = false; release(handle, e);
      this.act('rotate', { deg: Math.round(deg) });
    });

    this.mechanic('rotateObject');
    return { handle, angle: () => deg, set: v => { deg = v; paint(); } };
  }

  /**
   * Dragging this element leaves a copy behind, so one object becomes many.
   *   ctx.duplicable(el, { max: 3, onCopy(copy, n) })
   */
  duplicable(el, opts) {
    opts = opts || {};
    const max = opts.max == null ? 4 : opts.max;
    const copies = [el];

    const arm = node => {
      this.drag(node, Object.assign({}, opts.drag, {
        onGrab: () => {
          if (copies.length >= max + 1) return;
          const copy = node.cloneNode(true);
          [...copy.querySelectorAll('.rs-handle,.rot-handle')].forEach(h => h.remove());
          node.parentNode.insertBefore(copy, node);
          copy.style.left = node.style.left;
          copy.style.top = node.style.top;
          this.own(() => copy.remove());
          copies.push(copy);
          arm(copy);
          if (opts.onCopy) opts.onCopy(copy, copies.length);
          this.act('duplicate', { n: copies.length });
        }
      }));
    };
    arm(el);

    this.mechanic('duplicateObject');
    return { copies: () => copies.slice(), count: () => copies.length };
  }

  /**
   * Dropping one element onto another fuses them.
   *   ctx.combine([a, b], { onCombine(a, b) })
   * onCombine decides what the result is; returning false rejects the pairing.
   */
  combine(els, opts) {
    opts = opts || {};
    const list = els.slice();

    list.forEach(a => {
      this.drag(a, Object.assign({}, opts.drag, {
        onMove: () => list.forEach(b => {
          if (b !== a) b.classList.toggle('is-fusing', overlaps(a, b, -12));
        }),
        onDrop: () => {
          const b = list.find(b => b !== a && overlaps(a, b, -12));
          list.forEach(x => x.classList.remove('is-fusing'));
          if (!b) return;
          const ok = opts.onCombine ? opts.onCombine(a, b) : true;
          if (ok !== false) this.act('combine', { });
        }
      }));
    });

    this.mechanic('combineObject');
    return list;
  }

  /**
   * Let an object be dragged out of the stage and stay there. The stage stops
   * clipping it and it moves to the free layer the moment it crosses the edge.
   *   ctx.escapable(el, { onEscape(el), onReturn(el) })
   */
  escapable(el, opts) {
    opts = opts || {};
    let out = false;

    dom.stage.classList.add('is-open');
    this.own(() => dom.stage.classList.remove('is-open'));

    this.drag(el, Object.assign({}, opts.drag, {
      onMove: () => {
        const outside = !overlaps(el, dom.stage, -6);
        if (outside && !out) {
          out = true;
          const r = rectOf(el), b = rectOf(dom.board);
          dom.loose.appendChild(el);
          el.style.left = (r.left - b.left) + 'px';
          el.style.top = (r.top - b.top) + 'px';
          el.classList.add('is-escaped');
          this.act('escape', {});
          this.mechanic('escapeObject');
          if (opts.onEscape) opts.onEscape(el);
        } else if (!outside && out) {
          out = false;
          el.classList.remove('is-escaped');
          if (opts.onReturn) opts.onReturn(el);
        }
      },
      onDrop: opts.onDrop
    }));

    return { escaped: () => out };
  }

  /* ----------------------------------------------------- global chrome -- */

  /**
   * Take over a piece of the application frame.
   *
   *   ctx.claim('progress')      // → { value(), set(v) }
   *   ctx.claim('hint')          // → { el, onPress(fn), setLabel(s) }
   *
   * Chrome is protected by default: a level may only claim what it lists in
   * `globalElementsAllowed`. That keeps the frame predictable for the player
   * (a control only behaves oddly on levels that say so) and makes it obvious
   * from the level object which levels are meta levels.
   *
   * Everything claimed is restored automatically on teardown.
   */
  claim(name, opts) {
    const allowed = this.level.globalElementsAllowed || [];
    if (allowed.indexOf(name) < 0) {
      console.error('level ' + this.level.id + ' claimed "' + name +
                    '" without declaring it in globalElementsAllowed');
      return null;
    }
    const fn = CHROME[name];
    if (!fn) { console.error('unknown chrome element "' + name + '"'); return null; }
    this.mechanic('manipulateUI');
    this.act('claim', { name });
    return fn(this, opts || {});
  }

  /** Kept for the two levels written before claim() existed. */
  takeProgress(opts) { return CHROME.progress(this, opts || {}); }

  /* --------------------------------------------------- state + memory --- */

  /** The persistent store, for levels that reach across the game. */
  get game() { return State; }

  /** Record that this level taught a mechanic. Idempotent. */
  mechanic(id) { State.learn(id); return id; }

  /** Has the player been taught this before? */
  knows(id) { return State.knows(id); }

  /** Log a player action for later puzzle logic. */
  act(type, detail) { return State.record(type, detail); }

  /** Put an object into the inventory, tagged with this level. */
  give(id, payload) { return State.give(id, this.level.id, payload); }
  take(id) { return State.take(id); }
  hasItem(id) { return State.has(id); }

  /** Note how this level was solved, when more than one route exists. */
  route(name) { State.note(this.level.id, { route: name }); return name; }

  /** Remember an answer the player typed, for a later level to ask about. */
  remember(answer) { State.note(this.level.id, { answer: String(answer) }); }

  /* -------------------------------------------------------------- kill --- */

  destroy() {
    for (let i = this._teardown.length - 1; i >= 0; i--) {
      try { this._teardown[i](); } catch (e) { console.warn('teardown', e); }
    }
    this._teardown.length = 0;
    this._checks.length = 0;
    this._frames.length = 0;
  }
}

/* =========================================================================
   CHROME — the application frame, as claimable puzzle surfaces.

   Each entry takes over one control, returns a handle, and registers its own
   restore on the level's teardown. Nothing here runs unless a level has
   declared the element in `globalElementsAllowed`; see ctx.claim().
   ========================================================================= */

const CHROME = {

  /** The top progress bar becomes a slider the level owns. */
  progress(ctx, opts) {
    let value = opts.start || 0;
    dom.track.classList.add('is-live');
    const paint = () => {
      dom.fill.style.width = (value * 100) + '%';
      dom.knob.style.left = (value * 100) + '%';
    };
    paint();

    let live = false;
    const setFromEvent = e => {
      const r = rectOf(dom.track);
      value = clamp((e.clientX - r.left) / r.width, 0, 1);
      paint();
      if (opts.onChange) opts.onChange(value);
    };
    ctx.on(dom.track, 'pointerdown', e => {
      live = true; capture(dom.track, e); setFromEvent(e); e.preventDefault();
    });
    ctx.on(window, 'pointermove', e => { if (live) setFromEvent(e); });
    ctx.on(window, 'pointerup', e => {
      if (!live) return;
      live = false; release(dom.track, e);
    });

    ctx.own(() => { dom.track.classList.remove('is-live'); engine.paintProgress(); });
    return { el: dom.track, value: () => value, set: v => { value = v; paint(); } };
  },

  /** The level counter: readable, optionally editable, optionally a target. */
  levelNumber(ctx, opts) {
    const el = dom.levelNum;
    el.classList.add('is-live');
    ctx.own(() => {
      el.classList.remove('is-live');
      el.removeAttribute('contenteditable');
      el.textContent = String(LEVELS[engine.index].id).padStart(2, '0');
    });

    if (opts.editable) {
      el.setAttribute('contenteditable', 'plaintext-only');
      el.setAttribute('spellcheck', 'false');
      ctx.on(el, 'keydown', e => {
        e.stopPropagation();
        if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
      });
      ctx.on(el, 'input', () => opts.onChange && opts.onChange(el.textContent.trim(), el));
    }
    return {
      el,
      text: () => el.textContent.trim(),
      value: () => parseInt(el.textContent.replace(/\D/g, ''), 10),
      set: v => { el.textContent = String(v); }
    };
  },

  /** The carried-token tray. Levels take from it and put into it. */
  echoTray(ctx, opts) {
    const el = dom.echoTray;
    el.classList.add('is-live');
    ctx.own(() => { el.classList.remove('is-live'); engine.paintEchoTray(); });
    return {
      el,
      chips: () => [...el.querySelectorAll('.echo-token')],
      chip: tok => el.querySelector('.echo-token[data-token="' + String(tok).toUpperCase() + '"]'),
      has: tok => State.trayHas(tok),
      give: tok => { State.trayPush(tok); engine.paintEchoTray(); },
      take: tok => { const ok = State.trayTake(tok); engine.paintEchoTray(); return ok; },
      repaint: () => engine.paintEchoTray()
    };
  },

  /** The Hint button, as an object rather than a function. */
  hint(ctx, opts) { return grabButton(ctx, dom.btnHint, opts); },

  /** Restart, intercepted — the level decides what "again" means. */
  restart(ctx, opts) { return grabButton(ctx, dom.btnRestart, opts); },

  /** Start over, intercepted. */
  startOver(ctx, opts) { return grabButton(ctx, dom.btnReset, opts); },

  /** Observe or drive the theme toggle. */
  theme(ctx, opts) {
    const el = dom.btnTheme;
    if (opts.onToggle) {
      const stop = e => { e.stopImmediatePropagation(); };
      if (opts.intercept) {
        el.addEventListener('click', stop, true);
        ctx.own(() => el.removeEventListener('click', stop, true));
      }
      ctx.on(el, 'click', () => opts.onToggle(dom.html.classList.contains('is-dark')));
    }
    return {
      el,
      isDark: () => dom.html.classList.contains('is-dark'),
      set: d => engine.applyTheme(d ? 'dark' : 'light')
    };
  },

  /** Observe or drive the language toggle. */
  lang(ctx, opts) {
    const el = dom.btnLang;
    if (opts.onSwitch) ctx.on(el, 'click', () => opts.onSwitch(lang));
    return {
      el,
      code: () => lang,
      dir: () => S().dir,
      set: l => engine.applyLang(l)
    };
  }
};

/**
 * Shared implementation for the three footer buttons: suppress the engine's
 * own handler for the life of the level, hand the element to the level, and
 * put the label back afterwards.
 */
function grabButton(ctx, el, opts) {
  const label = el.textContent;
  el.classList.add('is-claimed');

  const handlers = [];
  if (opts.onPress) handlers.push(opts.onPress);

  /* The gate sits on `document` in the capture phase, which runs before any
     listener on the button itself. That matters: the engine bound its own
     handler at boot, so a listener added to the button now would fire *after*
     it. Cutting the event off upstream is the only way a level can take a
     control over rather than merely react to it. */
  const gate = e => {
    if (e.target !== el && !el.contains(e.target)) return;
    e.stopPropagation();
    if (opts.intercept !== false) e.preventDefault();
    handlers.forEach(fn => { try { fn(e, el); } catch (err) { console.error(err); } });
  };
  document.addEventListener('click', gate, true);

  ctx.own(() => {
    document.removeEventListener('click', gate, true);
    el.classList.remove('is-claimed');
    el.textContent = label;
    el.style.cssText = '';
  });

  return {
    el,
    setLabel: s => { el.textContent = s; },
    onPress: fn => { handlers.push(fn); }
  };
}

/* =========================================================================
   Engine
   ========================================================================= */

/* The played sequence. ECHO levels keep their canonical ids inside it; Break
   levels have none. Nothing downstream may use a play position as a level id —
   see route.js for why that distinction is load-bearing. */
const ALL_LEVELS = window.RULESET_LEVELS || [];
const LEVELS = window.RULESET_ROUTE
  ? window.RULESET_ROUTE.build(ALL_LEVELS, window.RULESET_BREAKS || [])
  : ALL_LEVELS;

/** What a stage is saved under: canonical id for ECHO, routeId for a Break. */
const keyOf = st => (st && st.id != null) ? st.id : (st && st.routeId) || null;
const isBreak = st => !!st && st.id == null && !!st.routeId;

const engine = {
  index: 0,
  ctx: null,
  solvedNow: false,
  hintStep: 0,
  rafId: 0,
  lastT: 0,

  /* -------------------------------------------------------------- boot -- */
  start() {
    dom.levelTotal.textContent = String(LEVELS.length);
    dom.ticks.innerHTML = LEVELS.map(() => '<i></i>').join('');
    dom.html.lang = S().htmlLang;
    dom.html.dir = S().dir;
    this.buildDev();
    this.applyTheme(save.theme, true);        // boot is not a player action
    this.paintChrome();
    this.bindChrome();
    this.watchZoom();

    const params = new URLSearchParams(location.search);
    if (params.get('dev') === '1') this.toggleDev(true);

    /* ?level=N means canonical level N, not the Nth thing played. The route
       puts level 35 at play position 37, and every test and dev link in the
       project refers to levels by their real number. */
    const jump = parseInt(params.get('level'), 10);
    const indexOfLevel = n => {
      const at = LEVELS.findIndex(l => l.id === n);
      return at >= 0 ? at : clamp(n, 1, LEVELS.length) - 1;
    };
    const resume = () => {
      const at = clamp(save.unlocked, 1, LEVELS.length) - 1;
      return at;
    };
    const first = Number.isFinite(jump) && jump > 0 ? indexOfLevel(jump) : resume();

this.load(first);
    this.loop();
  },

  /* --------------------------------------------------------- level load -- */
  load(i) {
    if (this.ctx) {
      try { if (this.ctx.level.cleanup) this.ctx.level.cleanup(this.ctx); } catch (e) { console.warn(e); }
      this.ctx.destroy();
      this.ctx = null;
    }

    this.index = clamp(i, 0, LEVELS.length - 1);
    const level = LEVELS[this.index];

    this.solvedNow = false;
    this.hintStep = 0;
    this.levelStarted = Date.now();
    State.currentLevel = level.id;
    dom.btnHint.disabled = !this.hintsOf(level).length;
    dom.solved.classList.remove('is-on');
    dom.stage.className = 'stage';
    dom.stage.innerHTML = '';
    dom.loose.innerHTML = '';
    dom.voidItems.innerHTML = '';
    dom.voidZone.className = 'void';
    dom.status.textContent = '';
    dom.status.className = 'status';
    dom.hint.textContent = '';
    dom.hint.classList.remove('is-on');
    /* ECHO levels show their canonical number: level 35 is a puzzle ABOUT the
       number in this corner, so it must read 35 and not its play position.
       Break levels show no number — their internal ids are never surfaced. */
    dom.levelNum.textContent = level.id != null ? String(level.id).padStart(2, '0') : '·';
    dom.levelName.textContent = t(level.name);
    this.paintEchoMark(level);
    this.paintEchoTray();
    this.paintChrome();      // per-level: Hint/More, and whether Skip applies

    const ctx = new LevelContext(level);
    this.ctx = ctx;
    this.renderInstruction(t(level.instruction), ctx);
    this.paintProgress();
    this.paintDev();
    this.zoomDismissed = false;      // a fresh level re-offers the reminder
    this.paintZoom();

    // one frame of settle so measurements are correct before setup runs
    requestAnimationFrame(() => {
      if (this.ctx !== ctx) return;
      try { level.setup(ctx); } catch (e) { console.error('level ' + level.id + ' setup', e); }
    });
  },

  next() {
    if (this.index < LEVELS.length - 1) this.load(this.index + 1);
    else this.showFinale();
  },

  restart() {
    const level = LEVELS[this.index];
    State.bump('restarts');
    State.note(level.id, { restarts: (State.row(level.id).restarts || 0) + 1 });
    State.record('restart', { id: level.id });
    this.load(this.index);
  },

  /* -------------------------------------------------------- instruction -- */
  makeWordSpan(token) {
    const span = document.createElement('span');
    span.className = 'w';
    span.textContent = token;
    const bare = normWord(token);
    if (bare) span.dataset.word = bare; else span.dataset.punct = '1';
    return span;
  },

  makeSpace() {
    const sp = document.createElement('span');
    sp.className = 'sp';
    sp.textContent = ' ';
    return sp;
  },

  /** Split the instruction into word spans; punctuation rides its own span. */
  renderInstruction(text, ctx) {
    dom.instr.innerHTML = '';
    ctx._words.clear();
    const parts = String(text).split(/\s+/).filter(Boolean);
    parts.forEach((raw, i) => {
      const m = raw.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u);
      const core = m[2] ? m[1] + m[2] : raw;
      const tail = m[2] ? m[3] : '';
      const span = this.makeWordSpan(core);
      dom.instr.appendChild(span);
      if (span.dataset.word && !ctx._words.has(span.dataset.word)) {
        ctx._words.set(span.dataset.word, span);
      }
      /* Season II instructions are written in ECHO. Mark its tokens here so
         all thirty levels get the same treatment without each remembering to
         ask — and so no Season I English word can be caught by accident. */
      if (ctx.level && ctx.level.id >= 16 && span.dataset.word &&
          window.RULESET_ECHO && window.RULESET_ECHO.isToken(span.dataset.word)) {
        span.classList.add('is-token');
      }
      if (tail) {
        const p = document.createElement('span');
        p.className = 'w';
        p.dataset.punct = '1';
        p.textContent = tail;
        dom.instr.appendChild(p);
      }
      // spaces are elements too, so a removed word can take its gap with it
      if (i < parts.length - 1) dom.instr.appendChild(this.makeSpace());
    });
  },

  /* --------------------------------------------------------------- loop -- */
  loop() {
    const tick = t => {
      this.rafId = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (t - this.lastT) / 1000 || 0);
      this.lastT = t;
      const ctx = this.ctx;
      if (!ctx || this.solvedNow) return;
      for (let i = 0; i < ctx._frames.length; i++) {
        try { ctx._frames[i](dt); } catch (e) { console.error(e); }
      }
      for (let i = 0; i < ctx._checks.length; i++) {
        let ok = false;
        try { ok = ctx._checks[i](); } catch (e) { console.error(e); }
        if (ok) { this.solve(); break; }
      }
    };
    this.rafId = requestAnimationFrame(tick);
  },

  /* -------------------------------------------------------------- solve -- */
  solve() {
    if (this.solvedNow) return;
    this.solvedNow = true;

    const level = LEVELS[this.index];
    const key = keyOf(level);
    if (key != null && !save.solved.includes(key)) save.solved.push(key);
    save.unlocked = Math.max(save.unlocked, Math.min(this.index + 2, LEVELS.length));

    // what the player just learned is now assumable by every later level
    const taught = level.mechanicIntroduced;
    if (Array.isArray(taught)) taught.forEach(id => State.learn(id));
    else if (taught) State.learn(taught);
    State.bump('solves');
    State.note(key, { at: Date.now(), ms: Date.now() - (this.levelStarted || Date.now()) });
    State.record('solve', { id: key, route: State.routeOf(key) });

    // Season II: the level's echo mark enters memory on completion, encoded.
    // The engine never learns what it says, and neither does the save file.
    this.bankEchoMark(level);

    State.saveNow();

    dom.stage.style.transform = 'scale(.985)';
    dom.voidZone.classList.remove('is-on');
    this.paintProgress();
    this.paintDev();

    const last = this.index === LEVELS.length - 1;
    dom.solvedWord.textContent = last ? S().complete : S().solved;
    dom.solvedSub.textContent = last
      ? S().completeSub(save.solved.length, LEVELS.length)
      : (t(level.note) || '');
    dom.btnNext.textContent = last ? S().playAgain : S().next;
    dom.solved.classList.add('is-on');
    dom.btnNext.focus({ preventScroll: true });

    if (!last) {
      this.autoNext = setTimeout(() => this.next(), 1900);
    }
  },

  showFinale() { this.load(0); },

  /* ----------------------------------------------------------- painting -- */
  paintProgress() {
    if (dom.track.classList.contains('is-live')) return;
    dom.fill.style.width = (save.solved.length / LEVELS.length * 100) + '%';
    dom.knob.style.left = (save.solved.length / LEVELS.length * 100) + '%';
  },

  /**
   * A level's hints as an ordered ladder, in the active language.
   *   1  conceptual nudge — names the wrong assumption, not the mechanic
   *   2  points at the mechanic — which surface, not which gesture
   *   3  nearly the solution — the gesture itself
   * `hints: []` wins if present; otherwise the hint/hint2/hint3 fields are the
   * same ladder written out longhand.
   */
  hintsOf(level) {
    const list = Array.isArray(level.hints)
      ? level.hints
      : [level.hint, level.hint2, level.hint3];
    return list.map(h => t(h)).filter(Boolean);
  },

  showHint() {
    const level = LEVELS[this.index];
    const hints = this.hintsOf(level);
    if (!hints.length) return;
    if (this.hintStep >= hints.length) return;

    this.hintStep++;
    dom.hint.textContent = hints[this.hintStep - 1];
    dom.hint.classList.add('is-on');
    dom.btnHint.textContent = this.hintStep < hints.length ? S().more : S().hint;
    dom.btnHint.disabled = this.hintStep >= hints.length;

    State.bump('hints');
    State.note(level.id, { hints: this.hintStep });
    State.record('hint', { stage: this.hintStep });
  },

  /* ----------------------------------------------------------- language -- */

  /**
   * Switch language. Rewrites the chrome, flips `dir`, and rebuilds the
   * current level through the normal load path — a level is constructed from
   * its (now differently-resolved) strings, so nothing special is needed.
   */
  applyLang(l) {
    const before = lang;
    lang = I18N[l] ? l : 'en';
    save.lang = lang;
    if (before !== lang) {
      State.bump('langChanges');
      State.record('lang', { from: before, to: lang });
    }
    writeSave();

    dom.html.lang = S().htmlLang;
    dom.html.dir = S().dir;
    this.paintChrome();

    clearTimeout(this.autoNext);
    if (this.ctx) this.load(this.index);
  },

  nextLang() {
    const order = I18N.ORDER || ['en'];
    return order[(order.indexOf(lang) + 1) % order.length];
  },

  /** Every static string in the app frame, redrawn for the active language. */
  paintChrome() {
    const s = S();
    const nHints = this.hintsOf(LEVELS[this.index]).length;
    dom.btnHint.textContent = this.hintStep > 0 && this.hintStep < nHints ? s.more : s.hint;
    dom.btnRestart.textContent = s.restart;
    if (dom.btnSkip) {
      dom.btnSkip.textContent = s.skip || 'Skip';
      dom.btnSkip.title = s.skipTitle || '';
      dom.btnSkip.hidden = false;      // works on every level, last one included
    }
    dom.btnReset.textContent = s.startOver;
    dom.btnReset.title = s.startOverTitle;
    dom.btnNext.textContent = s.next;
    dom.btnTheme.title = dom.btnTheme.ariaLabel = s.themeTitle;
    dom.voidLabel.textContent = s.dropToRemove;
    dom.stage.setAttribute('aria-label', s.stageLabel);
    dom.devTitle.textContent = s.devTitle;
    dom.devClose.innerHTML = s.devClose;
    dom.devUnlock.textContent = s.devUnlock;
    dom.devSolve.textContent = s.devSolve;
    dom.devWipe.textContent = s.devWipe;

    const nxt = I18N[this.nextLang()];
    dom.btnLang.textContent = s.switchLabel;
    dom.btnLang.title = s.switchTitle;
    dom.btnLang.lang = nxt.htmlLang;
  },

  /* -------------------------------------------------------------- echo -- */

  /**
   * Season II. A level declares `echoMarkChar`; the engine turns it into two
   * phase-shifted tokens and files them. Phase is implicit in the level id, so
   * the stored pair is meaningless without the rule the season teaches.
   * Season I levels declare nothing and this is a no-op.
   */
  /**
   * Draw the level's mark in the bottom bar. Same two-token shape, same
   * corner, every Season II level — repetition is the whole tell, and it only
   * works if the position never moves. Inert: no listeners, not focusable.
   */
  paintEchoMark(level) {
    const chip = dom.echoMark;
    if (!chip) return;
    if (!level || !level.echoMarkChar || !window.RULESET_ECHO) {
      chip.hidden = true;
      chip.textContent = '';
      return;
    }
    try {
      const tokens = window.RULESET_ECHO.encodeEchoMark(level.echoMarkChar, level.id);
      chip.textContent = '';
      tokens.forEach(t => {
        const s = document.createElement('span');
        s.textContent = t;
        chip.appendChild(s);
      });
      chip.hidden = false;
    } catch (e) {
      console.error('echo mark render for level ' + level.id, e);
      chip.hidden = true;
    }
  },

  /**
   * Draw whatever the player is carrying. Rendered by the engine so it looks
   * identical on every level, and so it is visibly still there on the levels
   * that have nothing to do with it — which is the entire point of a tray.
   */
  paintEchoTray() {
    const el = dom.echoTray;
    if (!el) return;
    const held = State.tray ? State.tray() : [];
    el.textContent = '';
    if (!held.length) { el.hidden = true; return; }
    held.forEach(tok => {
      const chip = document.createElement('span');
      chip.className = 'echo-token';
      chip.dataset.token = tok;
      chip.textContent = tok;
      el.appendChild(chip);
    });
    el.hidden = false;
  },

  bankEchoMark(level) {
    if (!level || !level.echoMarkChar || !window.RULESET_ECHO) return null;
    try {
      const E = window.RULESET_ECHO;
      const tokens = E.encodeEchoMark(level.echoMarkChar, level.id);
      return State.remember(level.id, tokens, E.levelPhase(level.id));
    } catch (e) {
      console.error('echo mark for level ' + level.id, e);
      return null;
    }
  },

  /* -------------------------------------------------------------- zoom -- */
  /* Levels 6 and 7 are solved by zooming, and nothing can put that back: a
     page has no API for browser zoom. So detect it and name the key instead.
     Suppressed on 6 and 7 themselves, where being zoomed is the point. */

  ZOOM_LEVELS: [6, 7],

  zoomFactor() {
    const vv = window.visualViewport;
    const pinch = vv && vv.scale ? vv.scale : 1;
    // page zoom leaves the window size alone but shrinks the CSS viewport
    const page = (window.outerWidth > 0 && window.innerWidth > 0 &&
                  matchMedia('(pointer: fine)').matches)
      ? window.outerWidth / window.innerWidth
      : 1;
    return Math.max(pinch, page);
  },

  paintZoom() {
    const chip = dom.zoomChip;
    if (!chip) return;

    const level = LEVELS[this.index];
    const factor = this.zoomFactor();
    const show = factor > 1.08 &&
                 !this.zoomDismissed &&
                 this.ZOOM_LEVELS.indexOf(level && level.id) < 0;

    if (!show) { chip.hidden = true; return; }

    const s = S();
    const mac = /Mac|iP(hone|ad|od)/.test(navigator.userAgent);
    const key = mac ? '⌘ 0' : 'Ctrl 0';
    const touch = matchMedia('(pointer: coarse)').matches;

    chip.hidden = false;
    chip.innerHTML = '';
    const label = document.createElement('span');
    label.textContent = (s.zoomStill || 'Still zoomed to') + ' ' +
                        Math.round(factor * 100) + '% — ';
    chip.appendChild(label);
    if (touch) {
      chip.appendChild(document.createTextNode(s.zoomPinch || 'pinch back out'));
    } else {
      const k = document.createElement('kbd');
      k.textContent = key;
      chip.appendChild(k);
      chip.appendChild(document.createTextNode(' ' + (s.zoomReset || 'to reset')));
    }
    const x = document.createElement('span');
    x.className = 'zoomchip-x';
    x.textContent = '✕';
    chip.appendChild(x);
  },

  watchZoom() {
    const tick = () => this.paintZoom();
    window.addEventListener('resize', tick);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', tick);
      window.visualViewport.addEventListener('scroll', tick);
    }
    dom.zoomChip.addEventListener('click', () => {
      this.zoomDismissed = true;          // until the next level
      this.paintZoom();
    });
    setInterval(tick, 1200);              // page zoom fires no event of its own
  },

  /* -------------------------------------------------------- start over -- */

  /** Erase all progress and return to level 1. Theme is kept. */
  wipe() {
    clearTimeout(this.autoNext);
    State.resetProgress();          // keeps theme and language, clears the rest
    this.paintProgress();
    this.paintDev();
    this.load(0);
  },

  /* -------------------------------------------------------------- theme -- */
  applyTheme(theme, quiet) {
    const before = save.theme;
    save.theme = theme;
    const dark = theme === 'dark' ||
      (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    dom.html.classList.toggle('is-dark', dark);
    if (!quiet && before !== theme) {
      State.bump('themeChanges');
      State.record('theme', { to: theme });
    }
    writeSave();
  },

  /* ---------------------------------------------------------------- dev -- */
  buildDev() {
    dom.devGrid.innerHTML = '';
    LEVELS.forEach((lv, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = String(lv.id).padStart(2, '0');
      b.title = t(lv.name);
      b.addEventListener('click', () => { clearTimeout(this.autoNext); this.load(i); });
      dom.devGrid.appendChild(b);
    });
  },

  paintDev() {
    [...dom.devGrid.children].forEach((b, i) => {
      b.classList.toggle('is-solved', save.solved.includes(LEVELS[i].id));
      b.classList.toggle('is-current', i === this.index);
    });
  },

  toggleDev(force) {
    const on = force != null ? force : dom.dev.hidden;
    dom.dev.hidden = !on;
    if (on) this.paintDev();
  },

  /* ------------------------------------------------------------- chrome -- */
  bindChrome() {
    dom.btnRestart.addEventListener('click', () => { clearTimeout(this.autoNext); this.restart(); });

    /* Skip advances WITHOUT solving. Deliberately: an unsolved level stays
       unsolved, and its Season II echo mark is not banked — the mark is the
       reward for finishing, and banking it here would hand the player a piece
       of the season's message they did not earn. Coming back and solving it
       later fills the gap, because remember() is idempotent. */
    if (dom.btnSkip) dom.btnSkip.addEventListener('click', () => {
      clearTimeout(this.autoNext);
      const level = LEVELS[this.index];
      State.bump('skips');
      State.record('skip', { id: level.id });

      if (this.index < LEVELS.length - 1) {
        save.unlocked = Math.max(save.unlocked, Math.min(this.index + 2, LEVELS.length));
        State.saveNow();
        this.next();
        return;
      }

      /* On the last level there is nothing after this one, so "move on" means
         the first level still unsolved — and failing that, back to the start.
         A dead button on the newest level is worse than either. */
      State.saveNow();
      const unsolved = LEVELS.findIndex(l =>
        l.id !== level.id && save.solved.indexOf(l.id) < 0);
      this.load(unsolved >= 0 ? unsolved : 0);
    });

    // "Start over" arms first and only wipes on a second click within 3s
    let armedUntil = 0, armTimer = 0;
    const disarm = () => {
      armedUntil = 0;
      clearTimeout(armTimer);
      dom.btnReset.textContent = S().startOver;
      dom.btnReset.classList.remove('is-arming');
    };
    dom.btnReset.addEventListener('click', () => {
      if (Date.now() < armedUntil) { disarm(); this.wipe(); return; }
      armedUntil = Date.now() + 3000;
      dom.btnReset.textContent = S().erase;
      dom.btnReset.classList.add('is-arming');
      armTimer = setTimeout(disarm, 3000);
    });
    dom.btnReset.addEventListener('blur', disarm);
    dom.btnHint.addEventListener('click', () => this.showHint());
    dom.btnNext.addEventListener('click', () => { clearTimeout(this.autoNext); this.next(); });
    dom.btnTheme.addEventListener('click', () => {
      this.applyTheme(dom.html.classList.contains('is-dark') ? 'light' : 'dark');
    });
    dom.btnLang.addEventListener('click', () => this.applyLang(this.nextLang()));

    dom.devUnlock.addEventListener('click', () => {
      save.unlocked = LEVELS.length; writeSave(); this.paintDev();
    });
    dom.devSolve.addEventListener('click', () => this.solve());
    dom.devWipe.addEventListener('click', () => this.wipe());

    window.addEventListener('keydown', e => {
      if (e.key === '`' || e.key === '~') {
        const t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        this.toggleDev();
      }
      if (e.key === 'r' && (e.metaKey || e.ctrlKey)) return;         // let reload through
      if (dom.dev.hidden) return;
      if (e.key === 'ArrowRight') this.load(this.index + 1);
      if (e.key === 'ArrowLeft') this.load(this.index - 1);
    });
  }
};

window.RULESET = engine;   // handy for the console / dev mode

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => engine.start());
} else {
  engine.start();
}

})();
