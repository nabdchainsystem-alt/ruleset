/* ==========================================================================
   GLOBAL SEA — application
   --------------------------------------------------------------------------
   Hybrid renderer:
     · DOM   — the readable conversation (ACTIVE + CALM), capped
     · canvas — tethers, the argument line, and archived debris beneath

   DOM writes are batched into one pass at the end of the frame, and nothing
   in the loop reads layout, so there is no read/write thrash.
   ========================================================================== */

(function () {
'use strict';

const TIER = SEA.Physics.TIER;
const M = SEA.Messages;
const $ = s => document.querySelector(s);

/* --------------------------------------------------------------- config -- */

const cfg = {
  calmAfter: 60,          // seconds
  archiveAfter: 300,
  maxDom: 420,            // readable bubbles on screen
  maxBodies: 6000,
  spawnSpeed: 95,
  throwScale: 1.15,
  maxTethers: 420
};

const world = SEA.Physics.createWorld();

/* ------------------------------------------------------------------ dom -- */

const canvas = $('#seaCanvas');
const g = canvas.getContext('2d');
const layer = $('#seaDom');
const tools = $('#tools');
const replybox = $('#replybox');
const replyInput = $('#replyInput');
const replyToEl = $('#replyTo');
const countNum = $('#countNum');
const rateNum = $('#rateNum');
const fpsNum = $('#fpsNum');
const fpsDot = $('#fpsDot');
const dev = $('#dev');
const devStats = $('#devStats');
const devReport = $('#devReport');
const argueBanner = $('#argueBanner');
const argueText = $('#argueText');
const perfBanner = $('#perfBanner');
const focusHint = $('#focusHint');

let dpr = 1;

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  world.setBounds(w, h);
  for (const b of world.bodies) {
    b.x = Math.min(Math.max(b.hw, b.x), w - b.hw);
    b.y = Math.min(Math.max(b.hh, b.y), h - b.hh);
  }
}
window.addEventListener('resize', resize);

/* -------------------------------------------------------------- spawning -- */

let created = 0;
const rateWindow = [];
let mounted = 0;

function spawn(opts) {
  const parent = opts.parent || null;
  const w = world.w, h = world.h;

  let x, y, vx = 0, vy = 0, dropping = false;
  if (parent) {
    const a = Math.random() * Math.PI * 2;
    const r = world.cfg.springRest * (0.75 + Math.random() * 0.4);
    x = parent.x + Math.cos(a) * r;
    y = parent.y + Math.sin(a) * r;
  } else if (opts.scatter) {
    // backfill: already-here messages belong all over the sea, not in a stack
    x = 60 + Math.random() * Math.max(1, w - 120);
    y = 90 + Math.random() * Math.max(1, h - 220);
    vx = (Math.random() - 0.5) * 40;
    vy = (Math.random() - 0.5) * 40;
  } else {
    x = 90 + Math.random() * Math.max(1, w - 180);
    y = -30;
    vy = cfg.spawnSpeed + Math.random() * 40;
    vx = (Math.random() - 0.5) * 30;
    dropping = true;
  }

  const body = M.create({
    username: opts.username, text: opts.text, mine: opts.mine,
    parent, x, y, vx, vy
  });

  body.x = Math.min(Math.max(body.hw, body.x), w - body.hw);
  if (dropping) body.y = -body.hh;

  world.add(body);
  if (parent) world.link(parent, body);

  if (mounted < cfg.maxDom) { M.mount(body, layer, true); mounted++; }
  else body.tier = TIER.CALM;

  created++;
  rateWindow.push(performance.now());
  trim();
  return body;
}

function trim() {
  const over = world.bodies.length - cfg.maxBodies;
  if (over <= 0) return;
  for (let i = 0; i < over; i++) {
    const b = world.bodies[0];
    if (b.el) { M.unmount(b); mounted--; }
    world.remove(b);
  }
}

function clearSea() {
  for (const b of world.bodies) if (b.el) M.unmount(b);
  world.clear();
  mounted = 0;
  select(null);
  focusThread(null);
  world.argue = null;
  argueBanner.hidden = true;
}

/* ------------------------------------------------------------- lifecycle -- */

function lifecycle(now) {
  const bodies = world.bodies;
  const calmMs = cfg.calmAfter * 1000;
  const archMs = cfg.archiveAfter * 1000;

  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (b.pinned || b === selected) continue;
    const age = now - b.born;

    const tier = age > archMs ? TIER.ARCHIVED : age > calmMs ? TIER.CALM : TIER.ACTIVE;
    if (tier === b.tier) continue;
    b.tier = tier;

    if (tier === TIER.ARCHIVED) {
      if (b.el) { M.unmount(b); mounted--; }
    } else if (!b.el && mounted < cfg.maxDom) {
      M.mount(b, layer, false); mounted++;
      M.setClass(b, b === selected ? 'is-sel' : '');
    } else {
      M.setClass(b, b === selected ? 'is-sel' : '');
    }
  }

  // if the DOM is over budget, retire the oldest readable bubbles first
  if (mounted > cfg.maxDom) {
    for (let i = 0; i < bodies.length && mounted > cfg.maxDom; i++) {
      const b = bodies[i];
      if (b.el && b !== selected && !b.pinned) { M.unmount(b); mounted--; }
    }
  }
}

/* ------------------------------------------------------------ rendering -- */

function render(now) {
  const dark = !document.documentElement.classList.contains('is-light');
  g.clearRect(0, 0, world.w, world.h);

  const bodies = world.bodies;

  /* debris first, so it sits under everything */
  for (let i = 0; i < bodies.length; i++) {
    if (bodies[i].tier === TIER.ARCHIVED) M.drawArchived(g, bodies[i], dark);
  }

  /* tethers */
  const links = world.links;
  const many = links.length > 260 || degrade > 1;
  const t = now * 0.0016;

  if (many) {
    g.beginPath();
    for (let i = 0; i < links.length && i < cfg.maxTethers; i++) curve(links[i], t);
    g.strokeStyle = dark ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.12)';
    g.lineWidth = 1;
    g.stroke();
  } else {
    g.lineWidth = 1.15;
    for (let i = 0; i < links.length; i++) {
      const l = links[i];
      const faint = l.a.tier === TIER.ARCHIVED || l.b.tier === TIER.ARCHIVED;
      g.beginPath();
      curve(l, t);
      g.strokeStyle = 'hsl(' + l.b.hue + ' 60% 62% / ' + (faint ? .07 : .30) + ')';
      g.stroke();
    }
  }

  /* the argument */
  if (world.argue) {
    const a = world.argue.a, b = world.argue.b;
    const shake = Math.sin(now * 0.03) * 2.2;
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x + shake, b.y - shake);
    g.strokeStyle = 'rgba(255,138,99,.75)';
    g.lineWidth = 2;
    g.stroke();

    g.fillStyle = 'rgba(255,138,99,.9)';
    g.beginPath(); g.arc(a.x, a.y, 4, 0, 6.2832); g.fill();
    g.beginPath(); g.arc(b.x, b.y, 4, 0, 6.2832); g.fill();
  }

  /* one batched DOM write pass */
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    const el = b.el;
    if (!el) continue;
    el.style.transform = 'translate3d(' +
      Math.round(b.x - b.hw) + 'px,' + Math.round(b.y - b.hh) + 'px,0)';
  }

  if (selected) placeTools();
}

/** An elastic curve: hangs a little, and breathes. */
function curve(l, t) {
  const a = l.a, b = l.b;
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const sag = Math.min(30, len * 0.16);
  const wob = Math.sin(t + l.phase) * 5;
  const px = -dy / len, py = dx / len;
  g.moveTo(a.x, a.y);
  g.quadraticCurveTo(
    (a.x + b.x) / 2 + px * wob,
    (a.y + b.y) / 2 + py * wob + sag,
    b.x, b.y
  );
}

/* ---------------------------------------------------------- interaction -- */

let selected = null;
let focused = null;
let drag = null;
let armedArgue = false;

function bodyFromEvent(e) {
  const el = e.target.closest ? e.target.closest('.msg') : null;
  return el && el.__body ? el.__body : null;
}

function select(b) {
  if (selected === b) return;
  if (selected) M.setClass(selected, '');
  selected = b;
  if (b) {
    M.setClass(b, 'is-sel');
    tools.hidden = false;
    tools.querySelector('[data-act=pin]').textContent = b.pinned ? 'Unpin' : 'Pin';
    tools.querySelector('[data-act=argue]').classList.toggle('is-on', armedArgue);
    toolsW = tools.offsetWidth;                 // one read, on selection only
    toolsH = tools.offsetHeight;
    placeTools();
  } else {
    tools.hidden = true;
    replybox.hidden = true;
    armedArgue = false;
  }
}

/* Sizes are cached on selection so the per-frame follow never reads layout. */
let toolsW = 0, toolsH = 0;

function placeTools() {
  if (!selected) return;
  const x = selected.x, y = selected.y - selected.hh;
  tools.style.left = Math.round(x - toolsW / 2) + 'px';
  tools.style.top = Math.round(y - toolsH - 9) + 'px';
  if (!replybox.hidden) {
    replybox.style.left = Math.round(Math.min(Math.max(10, x - 134), world.w - 278)) + 'px';
    replybox.style.top = Math.round(Math.min(world.h - 60, selected.y + selected.hh + 20)) + 'px';
  }
}

function focusThread(id) {
  focused = id;
  layer.classList.toggle('is-focus', id != null);
  focusHint.hidden = id == null;
  for (const b of world.bodies) {
    if (!b.el) continue;
    b.el.classList.toggle('is-lit', id != null && b.threadId === id);
  }
}

/* pointer: click vs drag is decided by distance + time */
layer.addEventListener('pointerdown', e => {
  const b = bodyFromEvent(e);
  if (!b) return;
  e.preventDefault();
  drag = {
    body: b, id: e.pointerId,
    ox: b.x - e.clientX, oy: b.y - e.clientY,
    sx: e.clientX, sy: e.clientY,
    lx: e.clientX, ly: e.clientY,
    vx: 0, vy: 0, t0: performance.now(), moved: false
  };
  b.dragging = true;
  b.el.classList.add('is-drag');
  try { layer.setPointerCapture(e.pointerId); } catch (err) {}
});

window.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  const b = drag.body;
  b.x = e.clientX + drag.ox;
  b.y = e.clientY + drag.oy;
  drag.vx = e.clientX - drag.lx;
  drag.vy = e.clientY - drag.ly;
  drag.lx = e.clientX; drag.ly = e.clientY;
  if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) > 5) drag.moved = true;
});

window.addEventListener('pointerup', e => {
  if (!drag || e.pointerId !== drag.id) return;
  const b = drag.body;
  b.dragging = false;
  if (b.el) b.el.classList.remove('is-drag');

  if (drag.moved) {
    b.vx = drag.vx * 60 * cfg.throwScale;
    b.vy = drag.vy * 60 * cfg.throwScale;
  } else if (armedArgue && selected && selected !== b) {
    startArgue(selected, b);
  } else {
    select(b);
  }
  drag = null;
});

layer.addEventListener('dblclick', e => {
  const b = bodyFromEvent(e);
  if (b) focusThread(b.threadId);
});

/* clicking open water clears everything */
document.addEventListener('pointerdown', e => {
  const t = e.target;
  if (!t || !t.closest) return;
  if (t.closest('.msg, .hud, .dock, .composer, .tools, .replybox, .dev, .banner')) return;
  select(null);
  focusThread(null);
});

/* ------------------------------------------------------------ the tools -- */

tools.addEventListener('click', e => {
  const act = e.target.dataset && e.target.dataset.act;
  if (!act || !selected) return;

  if (act === 'reply') {
    replybox.hidden = false;
    replyToEl.textContent = 'replying to ' + selected.username;
    placeTools();
    replyInput.focus();
  }
  if (act === 'pin') {
    selected.pinned = !selected.pinned;
    e.target.textContent = selected.pinned ? 'Unpin' : 'Pin';
    M.setClass(selected, selected.pinned ? 'is-sel is-pin' : 'is-sel');
  }
  if (act === 'argue') {
    armedArgue = !armedArgue;
    e.target.classList.toggle('is-on', armedArgue);
    argueText.textContent = armedArgue
      ? 'Now click a second message'
      : 'Argument in progress';
    argueBanner.hidden = !armedArgue;
  }
});

$('#replybox').addEventListener('submit', e => {
  e.preventDefault();
  const text = replyInput.value.trim();
  if (!text || !selected) return;
  replyInput.value = '';
  const child = spawn({ username: 'you', text, parent: selected, mine: true });
  child.vx = (Math.random() - 0.5) * 40;
  replybox.hidden = true;
});

/* -------------------------------------------------------------- arguing -- */

function startArgue(a, b) {
  armedArgue = false;
  world.argue = { a, b, phase: 'charge', t: 0, hits: 0 };
  M.setClass(a, 'is-argue');
  M.setClass(b, 'is-argue');
  a.pinned = b.pinned = false;
  argueBanner.hidden = false;
  argueText.textContent = a.username + ' vs ' + b.username;
  select(null);
}

$('#btnStopArgue').addEventListener('click', () => {
  if (world.argue) {
    M.setClass(world.argue.a, '');
    M.setClass(world.argue.b, '');
  }
  world.argue = null;
  armedArgue = false;
  argueBanner.hidden = true;
});

/* ------------------------------------------------------------- composer -- */

$('#composer').addEventListener('submit', e => {
  e.preventDefault();
  const input = $('#composerInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  spawn({ username: 'you', text, mine: true });
});

/* ------------------------------------------------------------ simulation -- */

const sim = SEA.Sim.createScheduler({
  spawn,
  replyTargets() {
    const out = [];
    const bodies = world.bodies;
    for (let i = Math.max(0, bodies.length - 60); i < bodies.length; i++) {
      const b = bodies[i];
      if (b.tier === TIER.ACTIVE && b.depth < 3) out.push(b);
    }
    return out;
  }
});

let paused = false;

$('#btnPause').addEventListener('click', e => {
  paused = !paused;
  e.target.textContent = paused ? 'Resume' : 'Pause';
  e.target.classList.toggle('is-on', paused);
});

document.querySelectorAll('[data-add]').forEach(btn =>
  btn.addEventListener('click', () => sim.burst(+btn.dataset.add)));

$('#rateSeg').addEventListener('click', e => {
  if (!e.target.dataset.rate) return;
  sim.setRate(+e.target.dataset.rate);
  [...e.currentTarget.querySelectorAll('button')]
    .forEach(b => b.classList.toggle('is-on', b === e.target));
});

/* ------------------------------------------------------------------ HUD -- */

let shown = 0;

function paintHud(now) {
  const alive = world.bodies.length;
  if (Math.abs(shown - alive) > 0.5) {
    const before = Math.round(shown);
    shown += (alive - shown) * 0.18;
    const after = Math.round(shown);
    if (after !== before) {
      countNum.textContent = after.toLocaleString();
      if (after > before) {
        countNum.classList.remove('is-bump');
        void countNum.offsetWidth;
        countNum.classList.add('is-bump');
      }
    }
  }

  while (rateWindow.length && now - rateWindow[0] > 3000) rateWindow.shift();
  rateNum.textContent = (rateWindow.length / 3).toFixed(1);
}

/* --------------------------------------------------------- perf monitor -- */

let fps = 60, simMs = 0, degrade = 0, lowSince = 0, okSince = 0;

function perf(now, dt) {
  fps = fps * 0.9 + (1 / Math.max(dt, 0.001)) * 0.1;
  const f = Math.round(fps);
  fpsNum.textContent = f;
  fpsDot.className = 'fps-dot' + (f < 30 ? ' is-bad' : f < 45 ? ' is-warn' : '');

  if (f < 45) {
    perfBanner.hidden = false;
    perfBanner.textContent = degrade
      ? 'Heavy water — physics reduced (level ' + degrade + ')'
      : 'Frame rate below 45';
  } else if (!degrade) {
    perfBanner.hidden = true;
  }

  if (f < 30) {
    if (!lowSince) lowSince = now;
    if (now - lowSince > 900 && degrade < 3) { setDegrade(degrade + 1); lowSince = now; }
    okSince = 0;
  } else if (f > 52) {
    lowSince = 0;
    if (!okSince) okSince = now;
    if (now - okSince > 3500 && degrade > 0) { setDegrade(degrade - 1); okSince = now; }
  } else {
    lowSince = 0; okSince = 0;
  }
}

function setDegrade(level) {
  degrade = level;
  world.cfg.calmCollisions = level < 1;
  cfg.maxTethers = level >= 2 ? 160 : 420;
  if (level >= 2) cfg.maxDom = Math.max(140, Math.round(cfg.maxDom * 0.75));
  if (level >= 3) cfg.calmAfter = Math.max(12, cfg.calmAfter * 0.5);
  if (level === 0) { cfg.maxDom = 420; cfg.calmAfter = +sliders.calmAfter.value; }
}

/* ------------------------------------------------------------------ dev -- */

const SLIDERS = [
  ['gravity',     'Gravity',        0, 60, 1, () => world.cfg.gravity,   v => world.cfg.gravity = v],
  ['drift',       'Ambient drift',  0, 60, 1, () => world.cfg.drift,     v => world.cfg.drift = v],
  ['friction',    'Friction',      .2,  3,.05, () => world.cfg.friction, v => world.cfg.friction = v],
  ['push',        'Collision',      0,  1,.05, () => world.cfg.push,     v => world.cfg.push = v],
  ['springK',     'Spring',         0, 80,  1, () => world.cfg.springK,  v => world.cfg.springK = v],
  ['springRest',  'Tether length', 50,260,  5, () => world.cfg.springRest, v => world.cfg.springRest = v],
  ['calmAfter',   'Calm after (s)', 5,240,  5, () => cfg.calmAfter,      v => cfg.calmAfter = v],
  ['archiveAfter','Archive after (s)', 20,900, 10, () => cfg.archiveAfter, v => cfg.archiveAfter = v],
  ['maxDom',      'Max DOM bubbles', 40,900, 20, () => cfg.maxDom,       v => cfg.maxDom = v]
];

const sliders = {};

(function buildDev() {
  const box = $('#devSliders');
  SLIDERS.forEach(([key, label, min, max, step, get, set]) => {
    const row = document.createElement('label');
    row.className = 'dev-s';
    row.innerHTML = '<span>' + label + '</span><span class="v"></span>' +
      '<input type="range" min="' + min + '" max="' + max + '" step="' + step + '">';
    const input = row.querySelector('input');
    const out = row.querySelector('.v');
    input.value = get();
    out.textContent = get();
    input.addEventListener('input', () => {
      set(+input.value);
      out.textContent = input.value;
    });
    sliders[key] = input;
    box.appendChild(row);
  });
})();

document.querySelectorAll('[data-spawn]').forEach(b =>
  b.addEventListener('click', () => sim.burst(+b.dataset.spawn)));
$('#btnClear').addEventListener('click', clearSea);

window.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
    e.preventDefault();
    dev.hidden = !dev.hidden;
  }
});

function paintDev() {
  if (dev.hidden) return;
  const s = world.stats;
  devStats.innerHTML =
    row('alive', world.bodies.length.toLocaleString()) +
    row('active / calm / archived', s.active + ' / ' + s.calm + ' / ' + s.archived) +
    row('DOM nodes', document.querySelectorAll('.msg').length + ' (pool ' + M.poolSize() + ')') +
    row('collision pairs', s.pairs.toLocaleString()) +
    row('sim time', simMs.toFixed(2) + ' ms', simMs > 8) +
    row('fps', Math.round(fps), fps < 45) +
    row('created / sec', (rateWindow.length / 3).toFixed(1)) +
    row('degrade level', degrade, degrade > 0);
}
const row = (k, v, warn) =>
  '<span>' + k + '</span><b class="' + (warn ? 'is-warn' : '') + '">' + v + '</b>';

/* ----------------------------------------------------------- stress test -- */

const stress = SEA.Sim.createStressTest({
  count: () => world.bodies.length,
  fps: () => fps,
  fill(n) {
    const have = world.bodies.length;
    if (have < n) sim.burst(n - have);
    else for (let i = 0; i < have - n; i++) {
      const b = world.bodies[0];
      if (b.el) { M.unmount(b); mounted--; }
      world.remove(b);
    }
  },
  onStage(s) {
    devReport.hidden = false;
    devReport.innerHTML = 'stage ' + (s.index + 1) + ' / ' + s.total +
      ' — filling to <b>' + s.target.toLocaleString() + '</b>…';
  },
  onDone(r) {
    devReport.hidden = false;
    devReport.innerHTML = r.results.map(x =>
      '<div class="row"><span>' + x.count.toLocaleString() + '</span><span>' +
      x.fps.toFixed(0) + ' fps (min ' + x.min.toFixed(0) + ')</span></div>').join('') +
      '<div class="row" style="margin-top:8px">Recommended active limit ' +
      '<b>' + r.recommended.toLocaleString() + '</b></div>';
  }
});

$('#btnStress').addEventListener('click', e => {
  if (stress.running) { stress.stop(); e.target.textContent = 'Start stress test'; return; }
  clearSea();
  sim.setRate(0);
  [...$('#rateSeg').querySelectorAll('button')]
    .forEach(b => b.classList.toggle('is-on', b.dataset.rate === '0'));
  dev.hidden = false;
  e.target.textContent = 'Stop stress test';
  stress.begin();
});

/* ---------------------------------------------------------------- theme -- */

$('#btnTheme').addEventListener('click', () => {
  document.documentElement.classList.toggle('is-light');
  try { localStorage.setItem('sea:light', document.documentElement.classList.contains('is-light') ? '1' : '0'); } catch (err) {}
});
try {
  if (localStorage.getItem('sea:light') === '1') document.documentElement.classList.add('is-light');
} catch (err) {}

$('#btnPerf').addEventListener('click', () => { dev.hidden = !dev.hidden; });

/* ----------------------------------------------------------------- loop -- */

let last = performance.now();

function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05;

  if (!paused) {
    sim.update(dt);
    const t0 = performance.now();
    world.step(dt);
    lifecycle(Date.now());   // bodies are born on the wall clock, not the frame clock
    simMs = simMs * 0.85 + (performance.now() - t0) * 0.15;
  }

  render(now);
  paintHud(now);
  perf(now, dt);
  paintDev();
  if (stress.running) stress.update();
}

/* ----------------------------------------------------------------- boot -- */

resize();
sim.burst(24);
requestAnimationFrame(frame);

/* Public surface. `tick` is a deterministic single frame — the headless
   harness uses it because rAF stalls in a browser with no compositor, and the
   dev lab uses it to step the sim frame by frame. */
window.SEA.app = {
  world, cfg, sim, spawn, clearSea, stress,
  stats: () => world.stats,
  tick(dt) {
    const now = performance.now();
    if (!paused) { sim.update(dt); world.step(dt); lifecycle(Date.now()); }
    render(now);
    paintHud(now);
  },
  ui: {
    select, focusThread, startArgue,
    get selected() { return selected; },
    get focused() { return focused; },
    get mounted() { return mounted; },
    setDegrade
  }
};

})();
