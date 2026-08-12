/* ==========================================================================
   RULESET — dev server
   --------------------------------------------------------------------------
     pnpm dev      serve the game on the LAN
     pnpm play     …and open it in your browser
     pnpm test     …and open the test harness instead

   Two jobs:
     1. serve the static files (no build step, no dependencies)
     2. run a tiny presence hub so two people on the same Wi-Fi can see each
        other's progress and chat, over Server-Sent Events

   `live.js` is injected into index.html as it is served, so the game files
   stay untouched and opening index.html directly is still pure single-player.
   ========================================================================== */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const PORT = Number(process.env.PORT) || 5173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md':   'text/markdown; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.webp': 'image/webp',
  '.woff2':'font/woff2',
  '.ico':  'image/x-icon'
};

/* ------------------------------------------------------------ live hub -- */

const players = new Map();   // id -> { id, name, level, solved, total, seen }
const streams = new Map();   // streamId -> res
const log = [];              // last 60 chat + system lines

function send(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/* A write to a half-dead socket throws. Collect the casualties and drop them
   afterwards rather than mutating the map mid-iteration — and never let one
   broken stream stop the others from being served. */
function broadcast(event, data) {
  let dead = null;
  for (const [id, res] of streams) {
    try { send(res, event, data); }
    catch { (dead || (dead = [])).push(id); }
  }
  if (dead) dead.forEach(id => streams.delete(id));
}

const roster = () => [...players.values()]
  .sort((a, b) => a.name.localeCompare(b.name));

function note(text) {
  const entry = { kind: 'system', text, at: Date.now() };
  log.push(entry);
  if (log.length > 60) log.shift();
  broadcast('chat', entry);
}

/* Drop players who have not checked in for a while (closed tab, slept Mac). */
setInterval(() => {
  const cutoff = Date.now() - 20000;
  let changed = false;
  for (const [id, p] of players) {
    if (p.seen < cutoff) { players.delete(id); changed = true; note(`${p.name} left`); }
  }
  if (changed) broadcast('roster', roster());
  for (const res of streams.values()) { try { res.write(': ping\n\n'); } catch {} }
}, 8000);

/* --------------------------------------------------------------- utils -- */

function body(req) {
  return new Promise(res => {
    let s = '';
    req.on('data', c => { s += c; if (s.length > 1e5) req.destroy(); });
    req.on('end', () => { try { res(JSON.parse(s || '{}')); } catch { res({}); } });
  });
}

const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);

function lanAddress() {
  for (const list of Object.values(networkInterfaces())) {
    for (const n of list ?? []) {
      if (n.family === 'IPv4' && !n.internal) return n.address;
    }
  }
  return '127.0.0.1';
}

/* -------------------------------------------------------------- routes -- */

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = decodeURIComponent(url.pathname);

  /* --- presence stream ------------------------------------------------- */
  if (path === '/live/stream') {
    const streamId = randomUUID();
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    res.write('retry: 2000\n\n');
    streams.set(streamId, res);
    send(res, 'roster', roster());
    send(res, 'backlog', log.slice(-30));
    req.on('close', () => streams.delete(streamId));
    return;
  }

  /* --- a player reporting where they are -------------------------------- */
  if (path === '/live/state' && req.method === 'POST') {
    const b = await body(req);
    const id = clean(b.id);
    if (!id) { res.writeHead(400).end(); return; }

    const before = players.get(id);
    const p = {
      id,
      name: clean(b.name) || 'player',
      level: Number(b.level) || 1,
      solved: Number(b.solved) || 0,
      total: Number(b.total) || 15,
      seen: Date.now()
    };
    players.set(id, p);

    if (!before) note(`${p.name} joined`);
    else if (p.solved > before.solved) note(`${p.name} solved level ${before.level}`);
    else if (p.name !== before.name) note(`${before.name} is now ${p.name}`);

    broadcast('roster', roster());
    res.writeHead(204).end();
    return;
  }

  /* --- chat ------------------------------------------------------------- */
  if (path === '/live/chat' && req.method === 'POST') {
    const b = await body(req);
    const text = String(b.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (!text) { res.writeHead(204).end(); return; }
    /* Carry the sender's id. Without it a client can only tell "is this mine?"
       by comparing names, and two players both called "player" — the default —
       each see the other's messages as their own. */
    const entry = {
      kind: 'chat',
      id: clean(b.id),
      name: clean(b.name) || 'player',
      text,
      at: Date.now()
    };
    log.push(entry);
    if (log.length > 60) log.shift();
    broadcast('chat', entry);
    res.writeHead(204).end();
    return;
  }

  /* --- static ----------------------------------------------------------- */
  const rel = path === '/' ? 'index.html' : path.replace(/^\/+/, '');
  const file = resolve(join(ROOT, rel));
  if (file !== ROOT && !file.startsWith(ROOT + sep)) { res.writeHead(403).end('nope'); return; }

  try {
    let data = await readFile(file);
    const ext = extname(file).toLowerCase();

    // splice the co-op layer into the game page only, never the harness
    if (ext === '.html' && /index\.html$/.test(file)) {
      data = Buffer.from(
        data.toString('utf8').replace(
          /<\/body>/i,
          '<script src="/live.js"></script>\n</body>'
        )
      );
    }

    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 — not in ' + ROOT);
  }
});

/* ---------------------------------------------------------------- boot -- */

server.listen(PORT, '0.0.0.0', () => {
  const lan = lanAddress();
  const page = process.argv.includes('--tests') ? '/tests.html' : '/';

  console.log('');
  console.log('  RULESET is running');
  console.log('  ─────────────────────────────────────────────');
  console.log(`  you        http://localhost:${PORT}${page}`);
  console.log(`  your LAN   http://${lan}:${PORT}${page}`);
  console.log('');
  console.log('  Send the LAN link to anyone on the same Wi-Fi.');
  console.log('  Ctrl-C to stop.');
  console.log('');

  if (process.argv.includes('--open') || process.argv.includes('--tests')) {
    spawn('open', [`http://localhost:${PORT}${page}`], { stdio: 'ignore' }).unref();
  }
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  Port ${PORT} is already in use.`);
    console.error(`  Either stop the other server, or run:  PORT=5174 pnpm dev\n`);
    process.exit(1);
  }
  throw err;
});
