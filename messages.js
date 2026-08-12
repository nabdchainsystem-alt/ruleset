/* ==========================================================================
   GLOBAL SEA — messages
   --------------------------------------------------------------------------
   Bubble geometry is computed with canvas measureText against the exact same
   font the CSS uses. Nothing ever reads offsetWidth, so spawning a thousand
   messages triggers zero forced reflows — the single most important decision
   in this file.

   DOM nodes are pooled. A message that ages out of the readable tiers gives
   its node back and is drawn on canvas as debris instead.
   ========================================================================== */

window.SEA = window.SEA || {};

SEA.Messages = (function () {
'use strict';

const TIER = SEA.Physics.TIER;

const STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Helvetica, Arial, sans-serif';
const FONT_TEXT  = '13.5px ' + STACK;
const FONT_BIG   = '26px ' + STACK;      // emoji-only messages get room to breathe
const FONT_USER  = '650 10.5px ' + STACK;
const FONT_TIME  = '8.5px ui-monospace, SFMono-Regular, Menlo, monospace';

const PAD_X = 13, PAD_T = 9, PAD_B = 9;
const LINE = 18, LINE_BIG = 32, HEAD = 15;
const MIN_W = 96, MAX_TEXT = 248;

const EMOJI_ONLY = /^[\p{Extended_Pictographic}\p{Emoji_Component}\s‍️]+$/u;

/* ------------------------------------------------------------- measuring -- */

const gauge = document.createElement('canvas').getContext('2d');
const wrapCache = new Map();             // text|maxw -> lines

function widthOf(str, font) {
  gauge.font = font;
  return gauge.measureText(str).width;
}

function wrap(text, maxW, font) {
  const key = text + '|' + (maxW | 0) + '|' + font;
  const hit = wrapCache.get(key);
  if (hit) return hit;

  gauge.font = font;
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';

  for (let i = 0; i < words.length; i++) {
    const next = line ? line + ' ' + words[i] : words[i];
    if (gauge.measureText(next).width <= maxW || !line) {
      line = next;
    } else {
      lines.push(line);
      line = words[i];
    }
    // a single unbroken word longer than the bubble: hard-split it
    while (gauge.measureText(line).width > maxW && line.length > 1) {
      let cut = line.length - 1;
      while (cut > 1 && gauge.measureText(line.slice(0, cut)).width > maxW) cut--;
      lines.push(line.slice(0, cut));
      line = line.slice(cut);
    }
  }
  if (line) lines.push(line);

  if (wrapCache.size > 4000) wrapCache.clear();
  wrapCache.set(key, lines);
  return lines;
}

/** Bubble size, from text alone. No DOM involved. */
function measure(username, text, timeLabel) {
  const big = EMOJI_ONLY.test(text) && text.length <= 12;
  const font = big ? FONT_BIG : FONT_TEXT;
  const lineH = big ? LINE_BIG : LINE;

  const oneLine = widthOf(text, font);
  const textW = Math.min(oneLine, MAX_TEXT);
  const lines = oneLine <= MAX_TEXT ? [text] : wrap(text, MAX_TEXT, font);

  const headW = widthOf(username, FONT_USER) + 10 + widthOf(timeLabel, FONT_TIME);

  let w = Math.max(textW, headW) + PAD_X * 2;
  w = Math.max(MIN_W, Math.min(MAX_TEXT + PAD_X * 2, Math.ceil(w)));

  const widest = lines.length > 1
    ? lines.reduce((m, l) => Math.max(m, widthOf(l, font)), 0)
    : textW;

  /* SLACK matters. measureText and the layout engine agree to within a
     fraction of a pixel, but "within a fraction" is enough for the browser to
     wrap one word further than we predicted — and then the bubble is one line
     too short and clips. Two pixels of headroom costs nothing and makes the
     two measurements impossible to disagree about. */
  const SLACK = 2;
  w = Math.max(MIN_W, Math.min(MAX_TEXT + PAD_X * 2 + SLACK,
      Math.ceil(Math.max(widest, headW)) + PAD_X * 2 + SLACK));

  const h = Math.ceil(PAD_T + HEAD + lines.length * lineH + PAD_B) + SLACK;
  return { w, h, lines, big };
}

/* ---------------------------------------------------------------- model -- */

let nextId = 1;

const clock = ts => {
  const d = new Date(ts);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
};

/** A stable hue per thread, so a cluster reads as one conversation. */
function hueOf(seed) {
  let h = 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

function create(opts) {
  const ts = opts.ts || Date.now();
  const text = String(opts.text || '').slice(0, 140);
  const username = String(opts.username || 'anon').slice(0, 24);
  const timeLabel = clock(ts);
  const m = measure(username, text, timeLabel);

  const parent = opts.parent || null;
  const body = {
    id: nextId++,
    username, text, ts, timeLabel,
    lines: m.lines,
    big: m.big,
    mine: !!opts.mine,

    parent,
    threadId: parent ? parent.threadId : nextId,
    depth: parent ? parent.depth + 1 : 0,

    x: opts.x, y: opts.y,
    vx: opts.vx || 0, vy: opts.vy || 0,
    hw: m.w / 2, hh: m.h / 2,
    mass: Math.max(0.6, (m.w * m.h) / 9000),

    tier: TIER.ACTIVE,
    born: ts,
    pinned: false,
    dragging: false,
    el: null,
    _cls: ''
  };
  body.hue = hueOf(body.threadId);
  return body;
}

/* ------------------------------------------------------------------ DOM -- */

const pool = [];

function build() {
  const el = document.createElement('div');
  el.className = 'msg';
  el.innerHTML =
    '<div class="msg-in">' +
      '<div class="msg-head"><span class="msg-user"></span><span class="msg-time"></span></div>' +
      '<div class="msg-text" dir="auto"></div>' +
    '</div>';
  el.__in   = el.firstChild;
  el.__user = el.querySelector('.msg-user');
  el.__time = el.querySelector('.msg-time');
  el.__text = el.querySelector('.msg-text');
  return el;
}

function mount(body, layer, fresh) {
  if (body.el) return body.el;
  const el = pool.pop() || build();

  el.style.width  = (body.hw * 2) + 'px';
  el.style.height = (body.hh * 2) + 'px';
  el.__user.textContent = body.username;
  el.__user.style.color = 'hsl(' + body.hue + ' 62% 68%)';
  el.__time.textContent = body.timeLabel;
  el.__text.textContent = body.text;
  el.__text.style.fontSize = body.big ? '26px' : '';
  el.__text.style.lineHeight = body.big ? '32px' : '';

  el.__body = body;
  el.dataset.id = body.id;

  let cls = 'msg';
  if (body.mine) cls += ' is-mine';
  if (fresh) cls += ' is-new';
  el.className = cls;
  body._cls = cls;

  el.style.transform = 'translate3d(' + (body.x - body.hw) + 'px,' + (body.y - body.hh) + 'px,0)';
  layer.appendChild(el);
  body.el = el;

  if (fresh) setTimeout(() => { if (body.el === el) setClass(body, ''); }, 620);
  return el;
}

function unmount(body) {
  const el = body.el;
  if (!el) return;
  body.el = null;
  el.__body = null;
  el.remove();
  if (pool.length < 260) pool.push(el);
}

/** Class changes go through here so we only touch the DOM when it changes. */
function setClass(body, extra) {
  if (!body.el) return;
  let cls = 'msg';
  if (body.mine) cls += ' is-mine';
  if (body.tier === TIER.CALM) cls += ' is-calm';
  if (extra) cls += ' ' + extra;
  if (cls === body._cls) return;
  body._cls = cls;
  body.el.className = cls;
}

/* --------------------------------------------------------------- canvas -- */

function roundRect(g, x, y, w, h, r) {
  if (g.roundRect) { g.beginPath(); g.roundRect(x, y, w, h, r); return; }
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Archived messages: distant debris under the conversation. */
function drawArchived(g, body, dark) {
  const s = 0.72;
  const w = body.hw * 2 * s, h = body.hh * 2 * s;
  roundRect(g, body.x - w / 2, body.y - h / 2, w, h, 9);
  g.fillStyle = dark ? 'rgba(255,255,255,.028)' : 'rgba(0,0,0,.035)';
  g.fill();
  g.strokeStyle = dark ? 'rgba(255,255,255,.045)' : 'rgba(0,0,0,.05)';
  g.lineWidth = 1;
  g.stroke();
  // a suggestion of a name bar, so it still reads as a message
  g.fillStyle = 'hsl(' + body.hue + ' 50% 60% / ' + (dark ? .10 : .14) + ')';
  g.fillRect(body.x - w / 2 + 8, body.y - h / 2 + 7, Math.min(34, w - 16), 3);
}

return {
  create, mount, unmount, setClass, measure, drawArchived, roundRect, hueOf, clock,
  poolSize: () => pool.length
};

})();
