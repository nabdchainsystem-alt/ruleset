/* ==========================================================================
   RULESET — cross-engine smoke test
   --------------------------------------------------------------------------
   RULESET is almost entirely pointer work: drag, drop, pointer capture, live
   coordinate maths. That is exactly the ground where Chromium, WebKit and
   Gecko disagree, and a game that only works in the browser it was written in
   is not finished.

   This runs the REAL production file set (the one .vercelignore leaves
   behind), served with the REAL headers vercel.json declares — including the
   Content-Security-Policy — so a policy that breaks the game fails here
   rather than in front of a player.

       npx playwright install chromium webkit firefox
       node browser-tests.mjs
   ========================================================================== */

import { chromium, webkit, firefox } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = 8749;
/* --------------------------------------------------------------------------
   vercel.json must be VALID before anything else matters. Vercel rejects any
   property it does not know and refuses the whole deployment — a `"//"` key
   used as a comment failed five deploys in a row with an error visible only in
   the CLI output, while the site kept serving an older broken build.
   JSON has no comments. This is the check that remembers that.
   -------------------------------------------------------------------------- */
{
  const ALLOWED = new Set(['$schema', 'buildCommand', 'installCommand', 'devCommand',
    'ignoreCommand', 'framework', 'outputDirectory', 'public', 'regions', 'redirects',
    'rewrites', 'headers', 'cleanUrls', 'trailingSlash', 'functions', 'crons', 'images',
    'rootDirectory', 'git']);
  const vj = JSON.parse(await readFile(join(ROOT, 'vercel.json'), 'utf8'));
  const bad = Object.keys(vj).filter(k => !ALLOWED.has(k));
  if (bad.length) {
    console.log(`\n  vercel.json has ${bad.length} property Vercel will reject: ${bad.join(', ')}`);
    console.log('  Vercel refuses the entire deployment on an unknown key.\n');
    process.exit(1);
  }
}

/* Serve the REAL deployable output, built the way Vercel builds it, rather
   than the repository with exclusions applied by hand. If build.sh and the
   deploy ever disagree, this is where it shows up. */
execFileSync(join(ROOT, 'build.sh'), { cwd: ROOT, stdio: 'ignore' });
const SITE = join(ROOT, '.vercel', 'output', 'static');
const cfg = JSON.parse(await readFile(join(ROOT, '.vercel', 'output', 'config.json'), 'utf8'));

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
                '.json': 'application/json', '.svg': 'image/svg+xml' };


const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  /* mirror the generated route table so routing is tested, not assumed */
  let routed = url.pathname;
  for (const r of (cfg.routes || [])) if (r.dest && r.src === routed) routed = r.dest;
  let p = normalize(join(SITE, decodeURIComponent(routed)));
  if (!p.startsWith(SITE)) { res.writeHead(403).end(); return; }
  if (routed.endsWith('/')) p = join(p, 'index.html');
  try {
    const body = await readFile(p);
    const h = { 'Content-Type': TYPES[extname(p)] || 'application/octet-stream' };
    for (const r of (cfg.routes || [])) {
      if (!r.headers) continue;
      const re = new RegExp('^' + r.src + '$');
      if (re.test(url.pathname)) Object.assign(h, r.headers);
    }
    res.writeHead(200, h); res.end(body);
  } catch { res.writeHead(404).end('not found'); }
});
await new Promise(r => server.listen(PORT, r));
const BASE = `http://127.0.0.1:${PORT}`;

let pass = 0; const fails = [];
const ok = (c, what) => { c ? pass++ : fails.push(what); };

async function run(name, engine) {
  const browser = await engine.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await ctx.newPage();

  /* Anything the engine refuses — a blocked script, a CSP violation, a thrown
     error — lands here. A clean console is part of the pass. */
  const noise = [];
  page.on('console', m => { if (m.type() === 'error') noise.push(m.text()); });
  page.on('pageerror', e => noise.push('threw: ' + e.message));

  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(700);

  ok(await page.title() === 'RULESET', `${name}: page loads with its title`);
  ok(await page.locator('#instruction').innerText() !== '', `${name}: the instruction renders`);
  ok(await page.locator('#stage .dot').count() === 1, `${name}: level 1 builds its objects`);
  ok(await page.locator('#levelTotal').innerText() === '75', `${name}: the counter reads 75 stages`);

  /* ---- the thing most likely to differ between engines: a real drag ----
     Level 1's door retreats from the dot; chasing it is the trap. The actual
     solution is to lift the word "end" out of the instruction and bring it to
     the dot — which is also the single most engine-sensitive gesture in the
     game, because the word is pulled out of flowing text and must land under
     the pointer rather than half a word-width away from it. */
  /* not scoped to .instruction: lifting the word moves it into the free
     layer, and an ancestor-scoped locator would stop matching mid-drag */
  const word = page.locator('[data-word="end"]').first();
  ok(await word.count() === 1, `${name}: the draggable word is in the instruction`);
  const dot = page.locator('#stage .dot');
  const a = await word.boundingBox();
  const b = await dot.boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(30);
  /* deliberately in steps: a single jump can pass while a real drag drops the
     pointer, which is precisely the class of bug this is looking for */
  let lag = 0;
  for (let i = 1; i <= 14; i++) {
    const px = a.x + a.width / 2 + (b.x + b.width / 2 - a.x - a.width / 2) * i / 14;
    const py = a.y + a.height / 2 + (b.y + b.height / 2 - a.y - a.height / 2) * i / 14;
    await page.mouse.move(px, py);
    await page.waitForTimeout(14);
    if (i === 10) {
      const held = await word.boundingBox();
      lag = Math.hypot(held.x + held.width / 2 - px, held.y + held.height / 2 - py);
    }
  }
  ok(lag < 30, `${name}: the lifted word stays under the pointer (was ${lag.toFixed(0)}px away)`);
  /* it must also keep the typography it had in the sentence — a past bug
     shrank a lifted word from 33px to 15px the moment it was picked up */
  const lifted = await word.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  ok(lifted > 20, `${name}: the lifted word keeps its size (${lifted}px)`);
  await page.mouse.up();
  await page.waitForTimeout(700);
  ok(await page.locator('#solved.is-on').count() === 1,
     `${name}: level 1 can actually be solved the way it is meant to be`);

  /* ---- progress survives a reload (localStorage, per engine) ---- */
  await page.locator('#btnNext').click();
  await page.waitForTimeout(400);
  const before = await page.evaluate(() => window.RULESET.index);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => window.RULESET_STATE.data.solved.includes(1)),
     `${name}: a solved stage is still solved after a reload`);
  ok(before === 1, `${name}: Next advances to the second stage`);

  /* ---- chrome controls ---- */
  await page.locator('#btnHint').click();
  await page.waitForTimeout(250);
  ok((await page.locator('#hintline').innerText()).trim().length > 0, `${name}: Hint reveals text`);
  await page.locator('#btnRestart').click();
  await page.waitForTimeout(350);
  ok(await page.locator('#stage').count() === 1, `${name}: Restart rebuilds the stage`);
  /* the theme rides on an is-dark class, not an attribute */
  const wasDark = await page.evaluate(() => document.documentElement.classList.contains('is-dark'));
  await page.locator('#btnTheme').click();
  await page.waitForTimeout(250);
  ok(await page.evaluate(() => document.documentElement.classList.contains('is-dark')) !== wasDark,
     `${name}: the theme toggle flips the theme`);

  /* ---- Arabic / RTL ---- */
  await page.locator('#btnLang').click();
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => document.documentElement.dir) === 'rtl', `${name}: Arabic switches the document to RTL`);
  ok(await page.evaluate(() => document.getElementById('echoMark').dir) === 'ltr',
     `${name}: the Echo Mark stays LTR in Arabic — it is an ordered pair, not prose`);
  await page.locator('#btnLang').click();
  await page.waitForTimeout(400);

  /* ---- an ECHO stage and a Break stage both build ---- */
  for (const [lvl, what] of [[30, 'an ECHO stage'], [52, 'a late interleaved stage'], [75, 'the finale']]) {
    await page.goto(`${BASE}/index.html?level=${lvl}`, { waitUntil: 'load' });
    await page.waitForTimeout(600);
    ok(await page.locator('.stage-failed').count() === 0, `${name}: ${what} loads without failing`);
    ok(await page.locator('#stage').evaluate(el => el.children.length) > 0,
       `${name}: ${what} renders something`);
  }

  /* ---- the front door ----------------------------------------------------
     `/` is rewritten to the landing page, and `/play` to the game. index.html
     stays where it is so nothing else in the project has to move. */
  {
    await page.goto(BASE + '/', { waitUntil: 'load' });
    await page.waitForTimeout(400);
    ok(await page.locator('.brand img').count() === 1, `${name}: / serves the landing page`);
    ok(await page.locator('a[href="index.html"]').count() > 0,
       `${name}: the landing page offers a way into the game`);
    /* every asset the landing page asks for must actually be in the build */
    const missing = await page.evaluate(async () => {
      const refs = [...document.querySelectorAll('[src],[href]')]
        .map(e => e.getAttribute('src') || e.getAttribute('href'))
        .filter(u => u && !/^(https?:|data:|#|mailto:)/.test(u));
      const bad = [];
      for (const u of new Set(refs)) {
        const r = await fetch(u, { method: 'GET' });
        if (!r.ok) bad.push(u + ' → ' + r.status);
      }
      return bad;
    });
    ok(missing.length === 0,
       `${name}: the landing page's assets are all in the build${missing.length ? ' → ' + missing.join(', ') : ''}`);
    await page.goto(BASE + '/play', { waitUntil: 'load' });
    await page.waitForTimeout(600);
    ok(await page.locator('#stage').count() === 1, `${name}: /play serves the game`);
    const homeOver = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(homeOver <= 1, `${name}: the landing page does not overflow sideways`);
  }

  /* ---- the answer key must not be reachable on the deployed build ---- */
  for (const path of ['/tests.html', '/invariants.mjs', '/docs/ECHO_SPEC.md', '/server.mjs',
                      '/docs/BREAK_LEVELS.md', '/progress-tests.mjs', '/README.md',
                      /* the printed guides are the worst leak of all: the hidden
                         sentence in plaintext, plus a full solution for every level */
                      '/output/pdf/RULESET_GAME.html', '/output/pdf/RULESET_QUICK_GUIDE.html']) {
    const r = await page.request.get(BASE + path);
    ok(r.status() === 404, `${name}: ${path} is not served to the public`);
  }

  /* ---- mobile: the tightest viewport we support ---- */
  const phone = await browser.newContext({
    viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: name !== 'firefox'
  });
  const mp = await phone.newPage();
  await mp.goto(BASE + '/index.html', { waitUntil: 'load' });
  await mp.waitForTimeout(700);
  const overflow = await mp.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(overflow <= 1, `${name}: no horizontal overflow at 375×667 (was ${overflow}px)`);
  ok(await mp.locator('#btnHint').isVisible(), `${name}: the Hint button is reachable on a small phone`);
  ok(await mp.locator('#stage').evaluate(el => el.getBoundingClientRect().width) > 200,
     `${name}: the board keeps a usable width on a small phone`);

  /* ---- touch, not mouse: this is how most people will actually play ----
     The engine drags with Pointer Events and setPointerCapture, and the CSS
     sets touch-action: none on anything draggable. Synthetic touchstart
     events do NOT produce pointer events, so dispatching them would test
     nothing; CDP's Input.dispatchTouchEvent goes in at the same level as a
     real finger and the browser synthesises the pointer events itself.

     CDP is Chromium-only. WebKit's touch path is therefore NOT covered here
     and is recorded as an untested risk rather than quietly assumed to pass. */
  if (name === 'chromium') {
    const w2 = mp.locator('[data-word="end"]').first();
    const d2 = mp.locator('#stage .dot');
    const wa = await w2.boundingBox();
    const db = await d2.boundingBox();
    const cdp = await mp.context().newCDPSession(mp);
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x, y, radiusX: 12, radiusY: 12, force: 1 }]
    });
    const scrollBefore = await mp.evaluate(() => window.scrollY);
    const fx = wa.x + wa.width / 2, fy = wa.y + wa.height / 2;
    const tx = db.x + db.width / 2, ty = db.y + db.height / 2;
    await touch('touchStart', fx, fy);
    for (let i = 1; i <= 12; i++) {
      await touch('touchMove', fx + (tx - fx) * i / 12, fy + (ty - fy) * i / 12);
      await mp.waitForTimeout(16);
    }
    await touch('touchEnd', tx, ty);
    await mp.waitForTimeout(700);
    ok(await mp.locator('#solved.is-on').count() === 1,
       `${name}: level 1 is solvable by touch, not just by mouse`);
    ok(await mp.evaluate(() => window.scrollY) === scrollBefore,
       `${name}: dragging does not scroll the page out from under the player`);
  }
  await phone.close();

  /* ---- storage that refuses to be written -------------------------------
     Safari in private browsing exposes localStorage but throws on every
     write. A game that saves on each solve can die on boot there, which is
     the worst possible first impression: a blank page, on a phone, silently. */
  {
    const jail = await browser.newContext();
    const jp = await jail.newPage();
    const jerrs = [];
    jp.on('pageerror', e => jerrs.push(e.message));
    await jp.addInitScript(() => {
      const real = window.localStorage;
      Object.defineProperty(window, 'localStorage', { configurable: true, get: () => ({
        getItem: k => real.getItem(k),
        setItem: () => { throw new DOMException('QuotaExceededError'); },
        removeItem: () => { throw new DOMException('QuotaExceededError'); },
        clear: () => { throw new DOMException('QuotaExceededError'); },
        key: i => real.key(i), get length() { return real.length; }
      })});
    });
    await jp.goto(BASE + '/index.html', { waitUntil: 'load' });
    await jp.waitForTimeout(900);
    ok(await jp.locator('#stage').evaluate(el => el.children.length) > 0,
       `${name}: the game still boots when localStorage refuses writes`);
    ok(await jp.locator('.stage-failed').count() === 0,
       `${name}: unwritable storage is not treated as a crash`);
    ok(jerrs.length === 0,
       `${name}: unwritable storage throws nothing${jerrs.length ? ' → ' + jerrs[0] : ''}`);
    await jail.close();
  }

  ok(noise.length === 0, `${name}: no console errors${noise.length ? ' → ' + noise.slice(0, 3).join(' | ') : ''}`);

  await browser.close();
}

for (const [name, engine] of [['chromium', chromium], ['webkit', webkit], ['firefox', firefox]]) {
  try { await run(name, engine); }
  catch (e) { fails.push(`${name}: harness threw — ${e.message}`); }
}

server.close();
console.log(`\n  CROSS-ENGINE — ${pass} passed, ${fails.length} failed`);
fails.forEach(f => console.log('  ✗ ' + f));
console.log('');
process.exit(fails.length ? 1 : 0);
