/* ==========================================================================
   RULESET — ECHO invariants
   --------------------------------------------------------------------------
   The season's arithmetic is the one thing in this repository that cannot be
   allowed to drift. Everything else can be re-tuned after release; a wrong
   phase silently corrupts twenty-nine levels and the message they spell, and
   nobody notices until a player reaches level 45 and it does not open.

   So these run headless, in about a second, with no browser. Run them before
   a change and after it. `node invariants.mjs`.
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));

/* ---------- load the game's globals without a browser ---------------------
   The level files only touch the DOM inside setup(), which we never call, so
   a bare window object is enough to evaluate every definition. */
const sandbox = { console, window: {}, document: undefined, performance: { now: () => 0 } };
sandbox.window.window = sandbox.window;
sandbox.globalThis = sandbox;
createContext(sandbox);

for (const f of ['echo.js', 'levels.js', 'breaks.js', 'breaks2.js',
                 'breaks3.js', 'breaks4.js', 'route.js']) {
  runInContext(readFileSync(join(HERE, f), 'utf8'), sandbox, { filename: f });
}

const W      = sandbox.window;
const E      = W.RULESET_ECHO;
const LEVELS = W.RULESET_LEVELS;
const BREAKS = W.RULESET_BREAKS;
const ROUTE  = W.RULESET_ROUTE;

/* ---------- the tiniest possible harness ---------------------------------- */
let pass = 0; const failures = [];
const ok = (cond, what) => { cond ? pass++ : failures.push(what); };
const eq = (a, b, what) => ok(Object.is(a, b), `${what}\n      expected ${JSON.stringify(b)}\n      got      ${JSON.stringify(a)}`);

const THE_MESSAGE = 'YOU BUILT THE KEY. USE IT NOW';
const echo = LEVELS.filter(l => l.id >= 16 && l.id <= 45);
const marked = LEVELS.filter(l => l.echoMarkChar);

/* ── 1 ── exactly 29 Echo Marks ─────────────────────────────────────────── */
eq(marked.length, 29, '1. exactly 29 Echo Marks exist');
ok(marked.every(l => l.id >= 16 && l.id <= 44), '1b. every mark sits on an ECHO level 16-44');
eq(new Set(marked.map(l => l.id)).size, 29, '1c. no level carries two marks');

/* ── 2 ── Break puzzles produce zero Echo Marks ─────────────────────────── */
eq(BREAKS.length, 30, '2. thirty Break puzzles are built');
eq(BREAKS.filter(b => b.echoMarkChar).length, 0, '2b. no Break puzzle carries an Echo Mark');
eq(BREAKS.filter(b => b.id != null).length, 0, '2c. no Break puzzle carries a canonical id');
eq(new Set(BREAKS.map(b => b.routeId)).size, 30, '2d. thirty distinct routeIds, no duplicates');

/* ── 3 ── the hidden sentence is exactly right ──────────────────────────── */
const sentence = marked.slice().sort((a, b) => a.id - b.id)
  .map(l => l.echoMarkChar).join('');
eq(sentence, THE_MESSAGE, '3. the marks spell the hidden message in level order');

/* and it survives a full encode → decode round trip through the real cipher */
const roundTrip = marked.slice().sort((a, b) => a.id - b.id).map(l => {
  const tokens = E.encodeEchoMark(l.echoMarkChar, l.id);
  return E.decodeEchoMark(tokens, l.id);
}).join('');
eq(roundTrip, THE_MESSAGE, '3b. the message survives encode → decode per level');

/* ── 4 ── phase comes from the canonical level id ───────────────────────── */
let phaseOk = true;
for (let id = 16; id <= 45; id++) if (E.levelPhase(id) !== (id - 16) % 8) phaseOk = false;
ok(phaseOk, '4. levelPhase(id) === (id - 16) mod 8 for every ECHO level');
eq(E.levelPhase(16), 0, '4b. level 16 phase 0');
eq(E.levelPhase(24), 0, '4c. level 24 phase 0 (the cycle closes at eight)');
eq(E.levelPhase(44), 4, '4d. level 44 phase 4');

/* ── 5 ── level 35 phase is 3 no matter where it is played ─────────────── */
const route = ROUTE.build(LEVELS, BREAKS);
const keys  = route.map(ROUTE.keyOf);
const pos35 = keys.indexOf(35);
eq(E.levelPhase(35), 3, '5. level 35 phase is 3');
ok(pos35 > 40, `5b. level 35 is played late (position ${pos35 + 1}) and its phase still does not care`);
eq(E.levelPhase(35), (35 - 16) % 8, '5c. phase derives from id 35, never from play position');

/* ── 6 ── Break puzzles never enter phase calculation ──────────────────── */
ok(BREAKS.every(b => !('phase' in b) && !('echoPhase' in b)),
   '6. no Break puzzle declares a phase');
ok(BREAKS.every(b => !ROUTE.isEcho(b)), '6b. isEcho() rejects every Break puzzle');
ok(BREAKS.every(b => ROUTE.isBreak(b)), '6c. isBreak() accepts every Break puzzle');
/* the decisive one: strip the breaks back out of the route and ECHO is unmoved */
const echoOnly = route.filter(ROUTE.isEcho).map(l => l.id);
const expected = Array.from({ length: 30 }, (_, i) => 16 + i);
eq(echoOnly.join(','), expected.join(','),
   '6d. removing the Breaks leaves 16…45 in perfect ascending order');

/* ── 7 ── Echo Memory holds only intended marks ────────────────────────── */
const grid = E.GRID.flat ? E.GRID.flat() : [].concat(...E.GRID);
eq(grid.length, 64, '7. the Echo Grid is 8×8');
eq(new Set(grid).size, 64, '7b. every grid character is unique');
ok(marked.every(l => grid.indexOf(l.echoMarkChar) >= 0),
   '7c. every mark character exists on the grid');
/* a mark is two tokens, and both must be real tokens of the language */
ok(marked.every(l => {
  const t = E.encodeEchoMark(l.echoMarkChar, l.id);
  return t.length === 2 && t.every(x => E.TOKENS.indexOf(x) >= 0);
}), '7d. every mark encodes to exactly two real tokens');

/* ── 8 ── level 45 still accepts the correct final key ─────────────────── */
const KEY = ['VE', 'NA', 'OR', 'SE', 'KA', 'MI', 'RU', 'LI'];
eq(E.TOKENS.join(' '), KEY.join(' '), '8. the final key is VE NA OR SE KA MI RU LI');
KEY.forEach((t, i) => eq(E.indexOf(t), i, `8b. ${t} = ${i}`));
const L45 = LEVELS.find(l => l.id === 45);
ok(L45 && typeof L45.setup === 'function', '8c. level 45 exists and is playable');
ok(L45 && !L45.echoMarkChar, '8d. level 45 carries no mark — the message ends at 44');
/* level 45 compares against E.TOKENS itself, so the key cannot drift apart
   from the language: assert the source says exactly that */
const src45 = readFileSync(join(HERE, 'levels.js'), 'utf8')
  .slice(readFileSync(join(HERE, 'levels.js'), 'utf8').indexOf('id: 45,'));
ok(/placed\.join\(' '\) !== E\.TOKENS\.join\(' '\)/.test(src45),
   '8e. the lock compares against E.TOKENS, so it can never drift from the language');

/* ── 9 ── route integrity (the structure all of the above rests on) ────── */
eq(route.length, 75, '9. seventy-five stages in the played order');
eq(new Set(keys).size, 75, '9b. no stage appears twice');
ok(keys.slice(0, 15).every((k, i) => k === i + 1), '9c. Season I plays first, 1…15');
eq(keys[keys.length - 1], 45, '9d. level 45 is the last thing played');
ok(!keys.some(k => k == null), '9e. every stage has a save key');
/* the interleave must stay irregular, or the rhythm gives the season away */
const runs = []; let n = 0;
keys.slice(15).forEach(k => {
  if (typeof k === 'string') n++;
  else { if (n) runs.push(n); n = 0; }
});
if (n) runs.push(n);
ok(new Set(runs).size >= 3, `9f. Break runs stay irregular (${runs.join(',')})`);

/* ---------- report ------------------------------------------------------- */
if (failures.length) {
  console.log(`\n  ECHO INVARIANTS — ${pass} passed, ${failures.length} FAILED\n`);
  failures.forEach(f => console.log('  ✗ ' + f));
  console.log('');
  process.exit(1);
}
console.log(`\n  ECHO INVARIANTS — ${pass} assertions, all green`);
console.log(`  message: "${sentence}"`);
console.log(`  level 35: phase ${E.levelPhase(35)} at play position ${pos35 + 1} of 75\n`);
