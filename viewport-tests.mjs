/* ==========================================================================
   RULESET — every stage, every supported viewport
   --------------------------------------------------------------------------
   The game computes a lot of its own geometry: objects placed at fractions of
   the stage, walls measured from the board, twenty-nine tiles laid across a
   row. That kind of layout passes on the machine it was written on and fails
   on a phone, quietly, on stage sixty-one, where nobody looks.

   So: all 75 stages at all 8 supported sizes, with reduced motion on, which
   is also the setting under which two levels once became unsolvable because
   their only clue was an animation.

   What counts as a failure here:
     · the page scrolls sideways (no puzzle asks for that)
     · the stage builds nothing
     · the recovery card appears — the stage threw
     · the instruction is empty (level 45 is deliberately silent)
     · a control the player needs is off-screen or unreachably small

       node viewport-tests.mjs            all eight
       node viewport-tests.mjs 375x667    just one
   ========================================================================== */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = 8761;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
                '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  let p = normalize(join(ROOT, decodeURIComponent(url.pathname)));
  if (!p.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  if (url.pathname.endsWith('/')) p = join(p, 'index.html');
  try {
    const body = await readFile(p);
    res.writeHead(200, { 'Content-Type': TYPES[extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404).end('not found'); }
});
await new Promise(r => server.listen(PORT, r));

const SIZES = [
  [1920, 1080], [1440, 900], [1366, 768],
  [1024, 768], [820, 1180],
  [430, 932], [390, 844], [375, 667]
];
const only = process.argv[2];
const sizes = only ? SIZES.filter(([w, h]) => `${w}x${h}` === only) : SIZES;
if (!sizes.length) { console.log('no such viewport:', only); process.exit(1); }

const browser = await chromium.launch();
const problems = [];
let checked = 0;

for (const [W, H] of sizes) {
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    isMobile: W < 500, hasTouch: W < 500,
    reducedMotion: 'reduce'
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => problems.push(`${W}x${H} · page threw · ${e.message}`));

  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(600);

  const total = await page.evaluate(() =>
    window.RULESET_ROUTE.build(window.RULESET_LEVELS, window.RULESET_BREAKS).length);

  const bad = [];
  for (let i = 0; i < total; i++) {
    /* load in-page rather than reloading: 600 navigations would take an hour,
       and the engine tears a stage down completely on every load anyway */
    const r = await page.evaluate(async idx => {
      window.RULESET.load(idx);
      await new Promise(res => setTimeout(res, 55));

      const de = document.documentElement;
      const stage = document.querySelector('#stage');
      const route = window.RULESET_ROUTE;
      const st = window.RULESET_ROUTE.build(window.RULESET_LEVELS, window.RULESET_BREAKS)[idx];
      const key = route.keyOf(st);

      /* which element is sticking out, if any — "something overflows" is not
         an actionable failure report */
      let culprit = null;
      const over = de.scrollWidth - de.clientWidth;
      if (over > 1) {
        for (const el of document.querySelectorAll('.app *')) {
          const b = el.getBoundingClientRect();
          if (b.width && (b.right > de.clientWidth + 1 || b.left < -1)) {
            culprit = (el.tagName + '.' + (el.className || '')).slice(0, 60);
            break;
          }
        }
      }

      const hint = document.querySelector('#btnHint');
      const hintBox = hint ? hint.getBoundingClientRect() : null;

      return {
        key: String(key),
        over, culprit,
        built: stage ? stage.children.length : 0,
        failed: !!document.querySelector('.stage-failed'),
        instr: (document.querySelector('#instruction').textContent || '').trim().length,
        isFinale: st.id === 45,
        hintOn: !!hintBox && hintBox.width > 20 && hintBox.height > 16 &&
                hintBox.right <= de.clientWidth + 1 && hintBox.bottom <= de.clientHeight + 1
      };
    }, i);

    checked++;
    const why = [];
    if (r.over > 1) why.push(`overflows ${r.over}px (${r.culprit || 'unknown'})`);
    if (r.failed) why.push('stage threw');
    if (!r.built) why.push('built nothing');
    if (!r.instr && !r.isFinale) why.push('empty instruction');
    if (!r.hintOn) why.push('Hint button unreachable');
    if (why.length) { bad.push(`${r.key}: ${why.join('; ')}`); problems.push(`${W}x${H} · ${r.key} · ${why.join('; ')}`); }
  }

  const label = `${W}x${H}`.padEnd(10);
  console.log(bad.length
    ? `  ${label} ${total - bad.length}/${total}  ✗ ${bad.slice(0, 4).join(' | ')}${bad.length > 4 ? ` (+${bad.length - 4})` : ''}`
    : `  ${label} ${total}/${total}  clean`);

  await ctx.close();
}

await browser.close();
server.close();

console.log(`\n  ${checked} stage renders checked across ${sizes.length} viewport(s), reduced motion on`);
if (problems.length) {
  console.log(`  ${problems.length} PROBLEM(S):\n`);
  problems.slice(0, 40).forEach(p => console.log('   ✗ ' + p));
  process.exit(1);
}
console.log('  no overflow, no empty stage, no unreachable control\n');
