/* ==========================================================================
   RULESET — ECHO interface pieces
   --------------------------------------------------------------------------
   Three reusable components for Season II levels. They render and animate;
   they never decide anything. All cipher logic stays in echo.js.

     ring(parent, opts)   the Echo Ring — eight tokens on a circle
     grid(parent, opts)   the 8x8 Echo Grid
     strip(parent, opts)  a row of token chips (messages, marks, answers)

   Each returns an object with a destroy(); a level should hand that to
   ctx.own() so teardown stays automatic.
   ========================================================================== */

window.RULESET_ECHO_UI = (function () {
'use strict';

const E = window.RULESET_ECHO;
const NS = 'http://www.w3.org/2000/svg';

const svg = (tag, attrs) => {
  const el = document.createElementNS(NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
};

const el = (tag, cls, parent) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (parent) parent.appendChild(n);
  return n;
};

/* ================================================================== ring == */

/**
 * opts: {
 *   size, radius, indices:false, phase:0, draggable:false, interactive:true,
 *   onPick(token, index, event), onDrag(token, event)
 * }
 */
function ring(parent, opts) {
  opts = opts || {};
  const size = opts.size || 220;
  const R = opts.radius || size * 0.36;
  const c = size / 2;

  const root = el('div', 'echo-ring', parent);
  const canvas = svg('svg', { class: 'echo-ring-svg', viewBox: '0 0 ' + size + ' ' + size, width: size, height: size });
  root.appendChild(canvas);

  // the track, plus a notch at the seam so wrapping 7 → 0 is visible
  canvas.appendChild(svg('circle', { class: 'echo-ring-track', cx: c, cy: c, r: R }));
  const seam = svg('line', {
    class: 'echo-ring-seam',
    x1: c, y1: c - R - 13, x2: c, y2: c - R + 13
  });
  canvas.appendChild(seam);

  const spin = svg('g', { class: 'echo-ring-spin' });
  spin.setAttribute('transform', 'rotate(0 ' + c + ' ' + c + ')');
  canvas.appendChild(spin);

  const nodes = E.TOKENS.map((token, i) => {
    const a = (-90 + i * 45) * Math.PI / 180;
    const x = c + Math.cos(a) * R;
    const y = c + Math.sin(a) * R;

    const g = svg('g', { class: 'echo-node', 'data-token': token, 'data-index': i });
    g.appendChild(svg('circle', { class: 'echo-node-dot', cx: x, cy: y, r: 17 }));

    const label = svg('text', { class: 'echo-node-label', x, y: y + 4, 'text-anchor': 'middle' });
    label.textContent = token;
    g.appendChild(label);

    const idx = svg('text', { class: 'echo-node-index', x, y: y + 26, 'text-anchor': 'middle' });
    idx.textContent = i;
    g.appendChild(idx);

    // counter-rotate the glyphs so text stays upright while the ring turns
    const keep = svg('g', { class: 'echo-node-keep' });
    keep.setAttribute('data-x', x);
    keep.setAttribute('data-y', y);

    spin.appendChild(g);
    return { token, index: i, g, x, y, label, idx };
  });

  let phase = 0;

  const api = {
    el: root,
    nodes,

    get phase() { return phase; },

    /** Rotate so that normalised 0 sits where `p` is written. */
    setPhase(p, animate) {
      phase = E.mod8(p | 0);
      const deg = phase * 45;
      spin.style.transition = animate === false ? 'none' : '';
      spin.setAttribute('transform', 'rotate(' + deg + ' ' + c + ' ' + c + ')');
      nodes.forEach(n => {
        n.g.querySelector('.echo-node-keep, .echo-node-label');
        n.label.setAttribute('transform', 'rotate(' + (-deg) + ' ' + n.x + ' ' + n.y + ')');
        n.idx.setAttribute('transform', 'rotate(' + (-deg) + ' ' + n.x + ' ' + n.y + ')');
      });
      root.dataset.phase = phase;
      return api;
    },

    /** Flash the 7 → 0 seam, for teaching that the ring wraps. */
    wrap() {
      seam.classList.remove('is-flash');
      void seam.getBoundingClientRect();
      seam.classList.add('is-flash');
      return api;
    },

    highlight(token, on) {
      const t = token == null ? null : (typeof token === 'number' ? E.tokenAt(token) : String(token).toUpperCase());
      nodes.forEach(n => n.g.classList.toggle('is-lit', on !== false && n.token === t));
      return api;
    },

    dim(token, on) {
      const t = typeof token === 'number' ? E.tokenAt(token) : String(token).toUpperCase();
      nodes.forEach(n => { if (n.token === t) n.g.classList.toggle('is-dim', on !== false); });
      return api;
    },

    clear() {
      nodes.forEach(n => n.g.classList.remove('is-lit', 'is-dim'));
      return api;
    },

    showIndices(on) {
      root.classList.toggle('shows-index', on !== false);
      return api;
    },

    /** Show meanings instead of indices — the season's first teaching mode. */
    showMeanings(on) {
      nodes.forEach(n => { n.idx.textContent = on !== false ? E.MEANING[n.token] : n.index; });
      root.classList.toggle('shows-meaning', on !== false);
      return api;
    },

    destroy() { root.remove(); }
  };

  if (opts.interactive !== false) {
    root.classList.add('is-interactive');
    const hit = e => {
      const g = e.target.closest && e.target.closest('.echo-node');
      return g ? { token: g.dataset.token, index: +g.dataset.index, g } : null;
    };
    root.addEventListener('pointerdown', e => {
      const h = hit(e);
      if (!h) return;
      e.preventDefault();
      if (opts.onPick) opts.onPick(h.token, h.index, e);
      if (opts.draggable && opts.onDrag) opts.onDrag(h.token, e);
    });
  }

  api.setPhase(opts.phase || 0, false);
  if (opts.indices) api.showIndices(true);
  if (opts.meanings) api.showMeanings(true);
  return api;
}

/* ================================================================== grid == */

/**
 * opts: {
 *   axes:true, interactive:false, onPick(char, row, col),
 *   blank:false,   — coordinates only, no characters (level 27)
 *   hover:false,   — light the crossing under the pointer
 *   small:false
 * }
 */
function grid(parent, opts) {
  opts = opts || {};
  const root = el('div', 'echo-grid', parent);
  if (opts.axes === false) root.classList.add('no-axes');
  if (opts.blank) root.classList.add('is-blank');
  if (opts.small) root.classList.add('is-small');

  const table = el('div', 'echo-grid-body', root);
  const cells = [];

  // column header
  el('span', 'echo-ax echo-ax-corner', table);
  E.TOKENS.forEach(t => { el('span', 'echo-ax', table).textContent = t; });

  for (let r = 0; r < E.SIZE; r++) {
    el('span', 'echo-ax', table).textContent = E.TOKENS[r];
    for (let col = 0; col < E.SIZE; col++) {
      const ch = E.GRID[r * E.SIZE + col];
      const cell = el('span', 'echo-cell', table);
      /* blank mode keeps the coordinates and drops the contents: level 27
         teaches that a pair names a square, before squares hold anything */
      cell.textContent = opts.blank ? '' : (ch === ' ' ? '␣' : ch);
      cell.dataset.row = r;
      cell.dataset.col = col;
      cell.dataset.char = ch;
      cells.push(cell);
    }
  }

  const api = {
    el: root,
    cells,

    /** Light one cell, and optionally its row and column leads. */
    highlight(row, col, opts2) {
      opts2 = opts2 || {};
      api.clear();
      cells.forEach(cell => {
        const r = +cell.dataset.row, c = +cell.dataset.col;
        if (r === row && c === col) cell.classList.add('is-hit');
        else if (opts2.cross !== false && (r === row || c === col)) cell.classList.add('is-cross');
      });
      return api;
    },

    highlightChar(ch, opts2) {
      const at = E.locate(ch);
      return at ? api.highlight(at.row, at.col, opts2) : api;
    },

    clear() {
      cells.forEach(c => c.classList.remove('is-hit', 'is-cross'));
      return api;
    },

    destroy() { root.remove(); }
  };

  if (opts.interactive) {
    root.classList.add('is-interactive');
    root.addEventListener('click', e => {
      const cell = e.target.closest && e.target.closest('.echo-cell');
      if (cell && opts.onPick) opts.onPick(cell.dataset.char, +cell.dataset.row, +cell.dataset.col);
    });
  }

  /* Lighting the crossing under the pointer is how "a pair names a square"
     becomes obvious without a sentence explaining it. */
  if (opts.hover) {
    let locked = false;
    api.lock = on => { locked = !!on; };
    root.addEventListener('pointermove', e => {
      if (locked) return;
      const cell = e.target.closest && e.target.closest('.echo-cell');
      if (cell) api.highlight(+cell.dataset.row, +cell.dataset.col);
    });
    root.addEventListener('pointerleave', () => { if (!locked) api.clear(); });
  }
  return api;
}

/* ================================================================= strip == */

/**
 * A row of token chips. Used for messages, answers, and the Echo Mark itself.
 * opts: { tokens, editable:false, onChange(tokens), role:'phase'|'payload' }
 */
function strip(parent, opts) {
  opts = opts || {};
  const root = el('div', 'echo-strip', parent);
  let tokens = opts.tokens ? E.parse(opts.tokens) : [];

  function paint() {
    root.textContent = '';
    tokens.forEach((t, i) => {
      const chip = el('span', 'echo-chip', root);
      chip.textContent = t;
      chip.dataset.token = t;
      chip.dataset.at = i;
      if (opts.phaseFirst && i === 0) chip.classList.add('is-phase');
      if (opts.checksumLast && i === tokens.length - 1) chip.classList.add('is-sum');
      if (opts.pairs && i > 0 && (i - (opts.phaseFirst ? 1 : 0)) % 2 === 0) chip.classList.add('starts-pair');
    });
  }

  const api = {
    el: root,
    get tokens() { return tokens.slice(); },
    set(next) { tokens = E.parse(next); paint(); return api; },
    push(t) { tokens.push(E.parse([t])[0]); paint(); if (opts.onChange) opts.onChange(api.tokens); return api; },
    pop() { tokens.pop(); paint(); if (opts.onChange) opts.onChange(api.tokens); return api; },
    clear() { tokens = []; paint(); if (opts.onChange) opts.onChange(api.tokens); return api; },
    lit(i, on) {
      const chip = root.children[i];
      if (chip) chip.classList.toggle('is-lit', on !== false);
      return api;
    },
    destroy() { root.remove(); }
  };

  paint();
  return api;
}

/* ================================================================ tether == */

/**
 * A thin curve from a token in the instruction to the thing it refers to.
 * This is how NA says "this one" without a word of translation.
 *
 * Lives in the board, not the stage, so it can cross the stage border — the
 * instruction is outside the box and the referent is inside it, and the line
 * connecting them is the whole point.
 *
 * @param host  a positioned element containing both ends (normally ctx.board)
 * @returns { el, update(), destroy() }  — call update() each frame
 */
function tether(host, fromEl, toEl, opts) {
  opts = opts || {};
  const root = document.createElementNS(NS, 'svg');
  root.setAttribute('class', 'echo-tether' + (opts.className ? ' ' + opts.className : ''));
  root.setAttribute('aria-hidden', 'true');

  const path = document.createElementNS(NS, 'path');
  root.appendChild(path);

  const cap = document.createElementNS(NS, 'circle');
  cap.setAttribute('r', 3);
  root.appendChild(cap);

  host.appendChild(root);

  function update() {
    if (!fromEl || !toEl || !fromEl.isConnected || !toEl.isConnected) return;
    const h = host.getBoundingClientRect();
    const a = fromEl.getBoundingClientRect();
    const b = toEl.getBoundingClientRect();

    const x1 = a.left + a.width / 2 - h.left;
    const y1 = a.bottom - h.top + 2;
    const x2 = b.left + b.width / 2 - h.left;
    const y2 = b.top + b.height / 2 - h.top;

    // a soft S so it reads as a connection, not a pointer
    const my = y1 + (y2 - y1) * 0.55;
    path.setAttribute('d', 'M' + x1 + ',' + y1 + ' C' + x1 + ',' + my + ' ' + x2 + ',' + my + ' ' + x2 + ',' + y2);
    cap.setAttribute('cx', x2);
    cap.setAttribute('cy', y2);
  }

  update();
  return { el: root, update, destroy() { root.remove(); } };
}

/* ================================================================== wall == */

/**
 * The Memory Wall: collected Echo Marks, each still wearing its source level.
 *
 * It shows what was stored and never what it says — decoding stays the
 * player's job in every level that uses this, which is the whole reason the
 * store keeps marks encoded.
 *
 * opts: {
 *   marks: [{ levelId, tokens }],
 *   sortable:false, onPick(cell, i), label
 * }
 */
function wall(parent, opts) {
  opts = opts || {};
  const root = el('div', 'echo-wall' + (opts.label ? ' has-label' : ''), parent);
  if (opts.label) el('div', 'echo-wall-label', root).textContent = opts.label;
  const board = el('div', 'echo-wall-grid', root);

  let cells = [];

  function build(marks) {
    board.textContent = '';
    cells = marks.map((m, i) => {
      const c = el('div', 'echo-cell-mark', board);
      c.dataset.level = m.levelId;
      c.dataset.at = i;
      c.dataset.tokens = m.tokens.join(' ');

      const lv = el('span', 'ecm-level', c);
      lv.textContent = m.levelId;
      const pair = el('span', 'ecm-pair', c);
      pair.textContent = m.tokens.join(' ');
      const ch = el('span', 'ecm-char', c);
      ch.textContent = '';

      c.__mark = m;
      c.__char = ch;
      return c;
    });
  }

  build(opts.marks || []);

  const api = {
    el: root,
    get cells() { return cells.slice(); },

    setMarks(marks) { build(marks); return api; },

    /** The level ids in the order they are currently displayed. */
    order() { return cells.map(c => +c.dataset.level); },

    inOrder() {
      const o = api.order();
      for (let i = 1; i < o.length; i++) if (o[i] < o[i - 1]) return false;
      return true;
    },

    /** Rearrange the DOM to match a given ordering of level ids. */
    arrange(levelIds, animate) {
      const by = new Map(cells.map(c => [+c.dataset.level, c]));
      cells = levelIds.map(id => by.get(id)).filter(Boolean);
      cells.forEach((c, i) => {
        c.dataset.at = i;
        if (animate) c.classList.add('is-moving');
        board.appendChild(c);
      });
      if (animate) setTimeout(() => cells.forEach(c => c.classList.remove('is-moving')), 500);
      return api;
    },

    sortByLevel(animate) {
      return api.arrange(api.order().slice().sort((a, b) => a - b), animate);
    },

    /** Show the character a mark resolves to. The caller does the decoding. */
    reveal(i, char) {
      const c = cells[i];
      if (!c) return api;
      c.__char.textContent = char === ' ' ? '␣' : char;
      c.classList.add('is-read');
      return api;
    },

    hideChars() {
      cells.forEach(c => { c.__char.textContent = ''; c.classList.remove('is-read'); });
      return api;
    },

    light(i, on) {
      const c = cells[i];
      if (c) c.classList.toggle('is-lit', on !== false);
      return api;
    },

    select(i) {
      cells.forEach((c, k) => c.classList.toggle('is-sel', k === i));
      return api;
    },

    destroy() { root.remove(); }
  };

  if (opts.onPick) {
    root.addEventListener('click', e => {
      const c = e.target.closest && e.target.closest('.echo-cell-mark');
      if (c) opts.onPick(c, +c.dataset.at, c.__mark);
    });
  }

  return api;
}

return { ring, grid, strip, tether, wall };

})();
