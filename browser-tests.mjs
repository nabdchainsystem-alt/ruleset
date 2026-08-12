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
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = 8749;
const cfg = JSON.parse(await readFile(join(ROOT, 'vercel.json'), 'utf8'));
const IGNORE = (await readFile(join(ROOT, '.vercelignore'), 'utf8'))
  .split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
                '.json': 'application/json', '.svg': 'image/svg+xml' };

/* A request for a file .vercelignore excludes must 404 exactly as it would in
   production — otherwise the test is not testing the shipped build. */
const excluded = path => IGNORE.some(pat => {
  if (pat.endsWith('/')) return path.startsWith('/' + pat) || path === '/' + pat.slice(0, -1);
  if (pat.startsWith('*')) return path.endsWith(pat.slice(1));
  return path === '/' + pat;
});

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (excluded(url.pathname)) { res.writeHead(404).end('not deployed'); return; }
  let p = normalize(join(ROOT, decodeURIComponent(url.pathname)));
  if (!p.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  if (url.pathname.endsWith('/')) p = join(p, 'index.html');
  try {
    const body = await readFile(p);
    const h = { 'Content-Type': TYPES[extname(p)] || 'application/octet-stream' };
    for (const rule of cfg.headers) {
      const re = new RegExp('^' + rule.source.replace(/\(\.\*\)/g, '.*') + '$');
      if (re.test(url.pathname)) for (const { key, value } of rule.headers) h[key] = value;
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

  /* ---- the answer key must not be reachable on the deployed build ---- */
  for (const path of ['/tests.html', '/invariants.mjs', '/docs/ECHO_SPEC.md', '/server.mjs']) {
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
  await phone.close();

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
