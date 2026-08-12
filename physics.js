/* ==========================================================================
   GLOBAL SEA — physics
   --------------------------------------------------------------------------
   A small, allocation-free 2D solver built for many soft rectangles.

   Bodies are axis-aligned boxes, not circles: message bubbles are wide and
   short, and a circle approximation either overlaps badly or leaves ugly
   gaps. Boxes resolve along the axis of least penetration, which reads as
   "things politely make room for each other".

   Broad phase is a uniform spatial hash rebuilt each frame. Every pair is
   visited at most once by only checking four of the eight neighbouring cells.
   ========================================================================== */

window.SEA = window.SEA || {};

SEA.Physics = (function () {
'use strict';

const TIER = { ACTIVE: 0, CALM: 1, ARCHIVED: 2 };

/* ---------------------------------------------------------------- grid --- */

function Grid(cell) {
  this.cell = cell;
  this.cols = 0;
  this.rows = 0;
  this.buckets = [];
  this.items = [];
  this.stamp = 0;
}

Grid.prototype.resize = function (w, h) {
  this.cols = Math.max(1, Math.ceil(w / this.cell) + 2);
  this.rows = Math.max(1, Math.ceil(h / this.cell) + 2);
  const n = this.cols * this.rows;
  this.buckets = new Array(n);
  for (let i = 0; i < n; i++) this.buckets[i] = [];
};

Grid.prototype.clear = function () {
  for (let i = 0; i < this.buckets.length; i++) this.buckets[i].length = 0;
  this.items.length = 0;
};

/**
 * Bodies here vary hugely in width — an emoji is 96px, a full sentence 276.
 * Inserting by centre alone silently misses collisions between two wide
 * bubbles whose centres land more than one cell apart, so each body is
 * registered in every cell its box touches.
 */
Grid.prototype.insert = function (b) {
  const c = this.cell;
  const x0 = Math.max(0, Math.min(this.cols - 1, (((b.x - b.hw) / c) | 0) + 1));
  const x1 = Math.max(0, Math.min(this.cols - 1, (((b.x + b.hw) / c) | 0) + 1));
  const y0 = Math.max(0, Math.min(this.rows - 1, (((b.y - b.hh) / c) | 0) + 1));
  const y1 = Math.max(0, Math.min(this.rows - 1, (((b.y + b.hh) / c) | 0) + 1));
  b._x0 = x0; b._x1 = x1; b._y0 = y0; b._y1 = y1;

  for (let cy = y0; cy <= y1; cy++) {
    const row = cy * this.cols;
    for (let cx = x0; cx <= x1; cx++) this.buckets[row + cx].push(b);
  }
  this.items.push(b);
};

/**
 * Every overlapping-cell pair, exactly once.
 *   · `b.id <= a.id` skip  — visits each unordered pair from one side only
 *   · `_pm` stamp          — a body spanning several cells would otherwise be
 *                            offered to the same neighbour more than once
 */
Grid.prototype.eachPair = function (fn) {
  const items = this.items, cols = this.cols, buckets = this.buckets;
  for (let i = 0; i < items.length; i++) {
    const a = items[i];
    const mark = ++this.stamp;
    for (let cy = a._y0; cy <= a._y1; cy++) {
      const row = cy * cols;
      for (let cx = a._x0; cx <= a._x1; cx++) {
        const cell = buckets[row + cx];
        for (let k = 0; k < cell.length; k++) {
          const b = cell[k];
          if (b.id <= a.id || b._pm === mark) continue;
          b._pm = mark;
          fn(a, b);
        }
      }
    }
  }
};

/* --------------------------------------------------------------- world --- */

function createWorld(options) {
  const cfg = Object.assign({
    gravity: 0,            // a sea floats; anything above ~4 silts up the floor
    drift: 22,             // ambient wander force — the main source of motion
    friction: 0.55,        // velocity decay per second
    iterations: 3,         // collision passes: one cannot unpack a dense stack
    restitution: 0.35,     // bounce on contact
    push: 0.55,            // positional correction strength
    slop: 0.5,             // allowed overlap before correcting, kills jitter
    gap: 6,                // breathing room between bubbles
    springK: 26,           // reply tether stiffness
    springDamp: 5.5,
    springRest: 108,       // preferred distance from a parent
    argueForce: 320,
    maxSpeed: 240,
    wallBounce: 0.5,
    calmCollisions: true,  // first thing dropped when the frame budget is tight
    cellSize: 120
  }, options || {});

  const world = {
    cfg,
    bodies: [],
    links: [],
    argue: null,
    w: 800,
    h: 600,
    grid: new Grid(cfg.cellSize),
    stats: { pairs: 0, active: 0, calm: 0, archived: 0 },

    setBounds(w, h) {
      this.w = w; this.h = h;
      this.grid.resize(w, h);
    },

    add(b) {
      b.invMass = b.mass > 0 ? 1 / b.mass : 0;
      b.da = Math.random() * Math.PI * 2;
      b.dw = (Math.random() - 0.5) * 0.55;
      this.bodies.push(b);
      return b;
    },

    remove(b) {
      const i = this.bodies.indexOf(b);
      if (i >= 0) this.bodies.splice(i, 1);
      for (let k = this.links.length - 1; k >= 0; k--) {
        if (this.links[k].a === b || this.links[k].b === b) this.links.splice(k, 1);
      }
      if (this.argue && (this.argue.a === b || this.argue.b === b)) this.argue = null;
    },

    link(a, b, rest) {
      const l = { a, b, rest: rest == null ? cfg.springRest : rest, phase: Math.random() * 6.28 };
      this.links.push(l);
      return l;
    },

    clear() {
      this.bodies.length = 0;
      this.links.length = 0;
      this.argue = null;
    },

    step
  };

  return world;
}

/* ---------------------------------------------------------------- step --- */

function step(dt) {
  const cfg = this.cfg;
  const bodies = this.bodies;
  const n = bodies.length;

  if (dt > 0.05) dt = 0.05;              // never let a stalled tab explode
  const decay = Math.exp(-cfg.friction * dt);

  let nActive = 0, nCalm = 0, nArchived = 0;

  /* -- forces + integration ------------------------------------------- */
  for (let i = 0; i < n; i++) {
    const b = bodies[i];

    if (b.tier === TIER.ACTIVE) nActive++;
    else if (b.tier === TIER.CALM) nCalm++;
    else nArchived++;

    if (b.pinned || b.dragging) { b.vx *= 0.6; b.vy *= 0.6; continue; }

    // ambient wander: a slowly turning unit vector per body
    b.da += b.dw * dt;
    const wander = b.tier === TIER.ARCHIVED ? cfg.drift * 0.25 : cfg.drift;
    b.vx += Math.cos(b.da) * wander * dt;
    b.vy += Math.sin(b.da) * wander * dt;

    b.vy += cfg.gravity * dt;

    b.vx *= decay;
    b.vy *= decay;

    // calm water moves slower
    if (b.tier !== TIER.ACTIVE) {
      const t = b.tier === TIER.CALM ? 0.86 : 0.72;
      b.vx *= t; b.vy *= t;
    }

    const sp = Math.hypot(b.vx, b.vy);
    if (sp > cfg.maxSpeed) {
      const k = cfg.maxSpeed / sp;
      b.vx *= k; b.vy *= k;
    }

    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }

  /* -- reply tethers ---------------------------------------------------- */
  const links = this.links;
  for (let i = 0; i < links.length; i++) {
    const l = links[i];
    const a = l.a, b = l.b;
    if (a.tier === TIER.ARCHIVED && b.tier === TIER.ARCHIVED) continue;

    let dx = b.x - a.x, dy = b.y - a.y;
    let len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.001) { dx = 0.01; dy = 0; len = 0.01; }
    const nx = dx / len, ny = dy / len;

    const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    const f = (len - l.rest) * cfg.springK + rel * cfg.springDamp;

    const ia = a.pinned || a.dragging ? 0 : a.invMass;
    const ib = b.pinned || b.dragging ? 0 : b.invMass;
    a.vx += nx * f * ia * dt; a.vy += ny * f * ia * dt;
    b.vx -= nx * f * ib * dt; b.vy -= ny * f * ib * dt;
  }

  /* -- argument --------------------------------------------------------- */
  if (this.argue) stepArgue(this, dt);

  /* -- broad phase ------------------------------------------------------ */
  const grid = this.grid;
  grid.clear();
  for (let i = 0; i < n; i++) {
    const b = bodies[i];
    if (b.tier === TIER.ARCHIVED) continue;      // debris does not collide
    grid.insert(b);
  }

  /* Several relaxation passes over the same buckets. Corrections are small
     enough that a body never leaves its cell mid-solve, and one pass alone
     cannot unpack a dense pile — it just shuffles the overlap around. */
  let pairs = 0;
  const calmOn = cfg.calmCollisions;
  const passes = Math.max(1, cfg.iterations | 0);
  for (let it = 0; it < passes; it++) {
    const last = it === passes - 1;
    grid.eachPair(function (a, b) {
      if (!calmOn && a.tier !== TIER.ACTIVE && b.tier !== TIER.ACTIVE) return;
      if (last) pairs++;
      collide(a, b, cfg);
    });
  }

  /* -- walls ------------------------------------------------------------ */
  const W = this.w, H = this.h;
  for (let i = 0; i < n; i++) {
    const b = bodies[i];
    if (b.dragging) continue;
    const bounce = cfg.wallBounce;

    if (b.x - b.hw < 0)      { b.x = b.hw;      if (b.vx < 0) b.vx = -b.vx * bounce; }
    else if (b.x + b.hw > W) { b.x = W - b.hw;  if (b.vx > 0) b.vx = -b.vx * bounce; }

    if (b.y - b.hh < 0)      { b.y = b.hh;      if (b.vy < 0) b.vy = -b.vy * bounce; }
    else if (b.y + b.hh > H) { b.y = H - b.hh;  if (b.vy > 0) b.vy = -b.vy * bounce; }
  }

  this.stats.pairs = pairs;
  this.stats.active = nActive;
  this.stats.calm = nCalm;
  this.stats.archived = nArchived;
}

/* ------------------------------------------------------------ collision -- */

function collide(a, b, cfg) {
  const dx = b.x - a.x;
  const px = (a.hw + b.hw + cfg.gap) - (dx < 0 ? -dx : dx);
  if (px <= 0) return;

  const dy = b.y - a.y;
  const py = (a.hh + b.hh + cfg.gap) - (dy < 0 ? -dy : dy);
  if (py <= 0) return;

  // separate along whichever axis needs the least movement
  let nx = 0, ny = 0, pen;
  if (px < py) { nx = dx < 0 ? -1 : 1; pen = px; }
  else         { ny = dy < 0 ? -1 : 1; pen = py; }

  const ia = (a.pinned || a.dragging) ? 0 : a.invMass;
  const ib = (b.pinned || b.dragging) ? 0 : b.invMass;
  const im = ia + ib;
  if (im === 0) return;

  const corr = Math.max(pen - cfg.slop, 0) / im * cfg.push;
  a.x -= nx * corr * ia; a.y -= ny * corr * ia;
  b.x += nx * corr * ib; b.y += ny * corr * ib;

  const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (vn > 0) return;                             // already separating

  const j = -(1 + cfg.restitution) * vn / im;
  a.vx -= j * nx * ia; a.vy -= j * ny * ia;
  b.vx += j * nx * ib; b.vy += j * ny * ib;

  if (a.onHit) a.onHit(b, -vn);
  if (b.onHit) b.onHit(a, -vn);
}

/* ------------------------------------------------------------- argument -- */
/* Charge → bump → recoil → charge. The recoil is what makes it read as
   playful rather than two boxes merging. Replies wobble for free, because
   they are spring-linked to whichever bubble just got shoved. */

function stepArgue(world, dt) {
  const arg = world.argue;
  const a = arg.a, b = arg.b;
  const cfg = world.cfg;

  arg.t -= dt;

  let dx = b.x - a.x, dy = b.y - a.y;
  let len = Math.sqrt(dx * dx + dy * dy) || 0.01;
  const nx = dx / len, ny = dy / len;
  const contact = a.hw + b.hw + 26;

  const ia = a.pinned ? 0 : a.invMass;
  const ib = b.pinned ? 0 : b.invMass;

  if (arg.phase === 'charge') {
    // lunge, with a little sideways swagger so it is not a straight line
    const swing = Math.sin(arg.t * 7) * 0.35;
    const fx = nx * cfg.argueForce + -ny * cfg.argueForce * swing;
    const fy = ny * cfg.argueForce + nx * cfg.argueForce * swing;
    a.vx += fx * ia * dt; a.vy += fy * ia * dt;
    b.vx -= fx * ib * dt; b.vy -= fy * ib * dt;

    if (len < contact) {
      const kick = 210;
      a.vx -= nx * kick * ia; a.vy -= ny * kick * ia;
      b.vx += nx * kick * ib; b.vy += ny * kick * ib;
      arg.phase = 'recoil';
      arg.t = 0.45 + Math.random() * 0.3;
      arg.hits++;
      if (arg.onHit) arg.onHit();
    }
  } else if (arg.t <= 0) {
    arg.phase = 'charge';
  }
}

return { createWorld, TIER };

})();
