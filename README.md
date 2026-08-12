# RULESET

A puzzle game where the interface is the puzzle. The instruction is not a
description of the level — it is a live object in it. So are the buttons, the
numbers, the progress bar, the browser window and the space between words.

**75 handcrafted stages** across two seasons. No framework, no build step, no
dependencies, no npm install.

```
open index.html          # single player, straight off the disk

pnpm dev                 # …or serve it, which adds the co-op layer and
                         #    prints a LAN link for someone else to join
```

There is nothing to compile. `pnpm dev` runs `node server.mjs`, a dependency-free
static server on port 5173 (`PORT=5174 pnpm dev` if that one is busy).

---

## What actually ships

| | Count | Where |
|---|---|---|
| **Season I** | levels 1–15 | `levels.js` |
| **Season II — ECHO** | levels 16–45 | `levels.js` |
| **Break puzzles** | `B01`–`B30` | `breaks.js` (B01–05), `breaks2.js` (B06–15), `breaks3.js` (B16–25), `breaks4.js` (B26–30) |
| **Total played** | **75 stages** | order defined by `route.js` |

**Season I** (1–15) teaches *the interface can be manipulated*.

**Season II — ECHO** (16–45) teaches *information can be manipulated*: an
eight-word language that turns out to also be a cipher. All thirty levels are
built. Read [`docs/ECHO_SPEC.md`](docs/ECHO_SPEC.md) before touching any of it —
its arithmetic is the one thing in this repository that cannot be allowed to
drift.

**The Break puzzles** are thirty unrelated one-idea levels interleaved between
the ECHO levels at irregular spacing, so the player keeps losing and refinding
the cipher thread. They have no canonical level id, carry no Echo Mark, and take
no part in phase arithmetic. See [`docs/BREAK_LEVELS.md`](docs/BREAK_LEVELS.md).

**THE VAULT** is an in-game notebook that unlocks after `B03`. It records
nothing on its own and is never required to solve anything. See
[`docs/VAULT_SPEC.md`](docs/VAULT_SPEC.md).

**GLOBAL SEA** (`global.html`) is a separate page where every chat message is a
floating physical object. It shares nothing with the game but the styling
sensibility — see the bottom of this file. It is a **local demo**: no backend,
no accounts, simulated traffic.

---

## Playing

| | |
|---|---|
| **Hint** | up to three rungs: concept, then surface, then gesture |
| **Restart** | rebuilds the current stage from scratch |
| **Skip** | move on without solving. Does **not** bank the stage's echo mark — come back and solve it to fill the gap. Works on every stage, including the last |
| **Start over** | erases all progress; click twice within 3s to confirm. Does **not** erase the Vault |
| **EN / عربي** | switches language and flips the layout to RTL, remembered |
| **◐** | light / dark, remembered |
| **V** | opens the Vault, once unlocked |
| **Progress** | saved to `localStorage` under `ruleset:v1` (schema v4). The Vault keeps its own key, `ruleset:vault` |

**Developer mode** — press <kbd>`</kbd> (backtick or `~`), or load `?dev=1`.
Jump to any stage, unlock everything, force-solve, wipe progress.
`?level=7` opens **canonical level 7**, not the 7th thing played — the route puts
level 35 at play position 53, and every dev link in the project refers to levels
by their real number.

The Puzzle Lab (`lab.js`) rides along with dev mode and has six tabs: levels,
state, mechanics, items, history and **echo** (ring/grid inspectors, encode,
decode, phase selector, checksum toggle, memory viewer, decode a mark by level,
reset Season II). There is no production entry point to any of it.

---

## The affordance vocabulary

This is the part that keeps the puzzles fair rather than cheap. A player can
never be expected to guess that something is interactive — but they *are*
expected to work out what to do with it. Every level draws from the same
visual language, taught in levels 1–3 and reused for the rest:

| Look | Meaning |
|---|---|
| blue word, dotted underline | you can pick this word up |
| dotted outline on hover | you can drag this object |
| small blue corner notch | you can resize this |
| blue handle on a stalk | you can rotate this |
| dashed rectangle | something belongs here |
| dashed tray at the bottom | drop here to remove — with an undo arrow |
| a control that visibly changes on level load | this level has taken it over |

The rule for a new puzzle: **the possibility must be visible, the idea must
not be.** If a player has to discover that dragging exists, it is a trick. If
they have to work out *what to drag and why*, it is a puzzle.

---

## Architecture

```
index.html      the shell: top bar, instruction, stage, tray, bottom bar
styles.css      design tokens, shared level pieces, ECHO pieces, RTL block
breaks2.css     · breaks3.css · breaks4.css — per-batch Break level styling
vault.css       the Vault panel, cards, capture mode
i18n.js         chrome strings per language
state.js        the persistent store — mechanics, inventory, ledger, echo memory
echo.js         Season II: the cipher. Pure logic, no DOM
echo-ui.js      Season II: the Ring, the Grid, token strips, tethers, the wall
levels.js       levels 1–45, one object each
breaks.js       Break puzzles B01–B05
breaks2.js      B06–B15
breaks3.js      B16–B25
breaks4.js      B26–B30
route.js        the interleaved play order, and the id/routeId separation
game.js         the engine — stage lifecycle, capabilities, and the ctx toolkit
vault.js        THE VAULT — the in-game notebook
lab.js          the developer Puzzle Lab (hidden; backtick or ?dev=1)
recovery.css    the "something threw" bar and the "did not start" card
tests.html      drives every level to its solution in a real browser
invariants.mjs  the ECHO arithmetic, asserted headlessly with no browser
progress-tests.mjs  the save file and the Vault, headless
browser-tests.mjs   chromium + webkit + firefox, via Playwright
vercel.json     production headers, including a strict CSP
.vercelignore   what the public build must NOT contain (the answer key)
docs/           the audit, the contract, ECHO_SPEC, VAULT_SPEC, Break levels

global.html     GLOBAL SEA — a separate page, see below
global.css      · physics.js · messages.js · simulation.js · global.js
sea-tests.html  its own suite
server.mjs      dev server + LAN co-op hub (no dependencies)
live.js         the co-op layer, injected into index.html only when served
coop-tests.mjs  the co-op hub, tested headlessly with `node`
```

Load order matters — see the bottom of `index.html`. `i18n.js`, `state.js`,
`echo.js`, `echo-ui.js`, `levels.js`, the four `breaks*.js` files and `route.js`
publish their globals; then `game.js` consumes them; then `lab.js` and
`vault.js` attach. All classic scripts, so `file://` works.

**Before designing a level, read [`docs/PUZZLE_CONTRACT.md`](docs/PUZZLE_CONTRACT.md).**
It is fifteen rules written as checks you can run against a draft, and the draft
template at the end is the fastest way to find out that an idea does not work yet.

**Levels never touch the DOM directly.** They receive a `ctx` object that owns
every element, listener, timer and animation frame they create. When the stage
changes, `ctx.destroy()` reverses all of it. That is why a level is ~30 lines
and why nothing leaks between them.

**Nothing can leave the player staring at a blank screen.** `game.js` wraps
`setup()` in a try/catch, installs global `error` and `unhandledrejection`
handlers that offer a recovery bar, and wraps `boot()` itself so that a failure
before the engine exists still writes a "RULESET did not start" card with a way
to clear a damaged save.

---

## The stage contract

An **ECHO or Season I level**:

```js
{
  id:          1,                       // canonical, unique. ECHO arithmetic uses it.
  name:        'Reach the end',         // shown bottom-left
  instruction: 'Reach the end.',        // tokenised into draggable word spans
  hint:        'first nudge',
  hint2:       'more explicit',         // optional
  hint3:       'name the gesture',      // optional
  note:        'Words are objects too.',// optional, shown on the success card
  setup(ctx)   { ... },                 // build the level
  cleanup(ctx) { ... }                  // optional — ctx already frees its own
}
```

A **Break puzzle** is the same shape with one difference that is load-bearing:

```js
{
  routeId: 'B07',    // instead of id. Never shown to the player.
  // …and never an `id`, never an `echoMarkChar`.
}
```

`setup` runs one frame after the stage mounts, so measurements are correct.
Any player-visible string may be a plain string or an `{ en, ar }` map.

---

## The `ctx` API

**Building**

```js
ctx.el(tag, className, props)   // create + append. props: {text, html, style,
                               //   attrs, x, y, parent}. Appends to the stage
                               //   unless `parent` is given.
ctx.place(el, x, y)            // absolute position in px
ctx.size()                     // { w, h } of the stage, live
ctx.stage / ctx.board / ctx.instructionEl
ctx.state                      // free scratch object
ctx.t(value)                   // resolve a string or an { en, ar } map
ctx.own(fn)                    // register your own teardown
```

**Interaction** (mouse, touch and pen through pointer events)

```js
ctx.drag(el, {
  onGrab, onMove, onDrop,      // callbacks
  axis: 'x' | 'y',             // lock an axis (never writes the other one)
  bounds: 'stage',             // clamp inside the stage
  clampX(x, el),               // custom horizontal clamp
  discard: true,               // can be thrown away
  discardWhen(el),             // override the "is it discarded" test
  onDiscard(el),
  enabled(),                   // return false to freeze the drag
  affordance: false,           // suppress the dotted outline
  magnet: () => [els],         // snap toward these on drop
  magnetRadius: 62,            // default 62
  magnetPull: 0.55             // default 0.55
})

ctx.resize(el, {
  mode: 'box' | 'font',
  min, max,
  keepRatio: false,            // width only, handle tracks the pointer 1:1
  gain: 2,                     // for centre-anchored elements
  onResize(value, el)
})                             // → { handle, apply, read }

ctx.rotate(el, { start, snap, onRotate })   // → { handle, angle(), set(deg) }
ctx.pinch(el, factor => …)     // two-finger scale
ctx.detach(el)                 // lift into the free layer, keeping its position
ctx.borrow(el)                 // take an element over, restored on teardown
```

Beyond those, the engine also ships `ctx.duplicable`, `ctx.combine`,
`ctx.escapable` and `ctx.scalable` for object work.

**Words and text** — the instruction is a row of spans, and they are real objects

```js
ctx.words('end', { discard: false })          // one word, kept where dropped
ctx.words('red not', { onRemove, onChange })  // named words, discardable
ctx.words('*', { onChange })                  // every word

ctx.sentenceWords()      // words still in the sentence, lowercase
ctx.sentenceText()       // the sentence as it currently reads
ctx.word('red')          // the span, or null once it is gone
ctx.hasWord('red')
ctx.onWordsChange(fn)
ctx.setInstruction(str)  // re-render mid-level

ctx.letters(which, opts) // letter-level splitting
ctx.letterText(span)
ctx.reorder(opts)        // drag words into a different order
ctx.editable(which, opts)// type over a word
ctx.scalable(which, opts)// resize a word, and the quantity it names
```

A discardable word counts as **removed the moment it is dropped anywhere off
the sentence** — which is exactly what `sentenceWords()` reports, so the
picture and the state can never disagree. Dropping it back on the sentence
snaps it into its original slot, and the gap it left closes behind it.

**Geometry** — all hit tests use viewport rects, so objects in different
coordinate spaces (stage, free layer, instruction) still interact

```js
ctx.rect(el)  ctx.center(el)  ctx.dist(a, b)
ctx.hits(a, b, pad)      // pad < 0 requires deeper overlap
ctx.near(a, b, distance)
```

**Time and validation**

```js
ctx.frame(dt => …)       // per-frame, delta in seconds
ctx.check(() => bool)    // polled every frame; true solves the stage
ctx.solve()              // solve now
ctx.reject('why')        // shake + red status line
ctx.say('text', 'good' | 'warn')
ctx.after(ms, fn)  ctx.every(ms, fn)  ctx.on(target, type, fn)
```

**The app frame itself**

```js
ctx.claim('progress', opts)            // seize a chrome control. REFUSED unless
                                       //   the level lists it in
                                       //   globalElementsAllowed. Restored on
                                       //   teardown, always.
ctx.takeProgress({ start, onChange })  // the pre-claim() shorthand, kept for the
                                       //   two levels written before it existed
ctx.viewportWidth()                    // visualViewport-aware, so pinch counts
ctx.onViewportChange(fn)
```

Claimable chrome: `progress`, `levelNumber`, `echoTray`, `hint`, `restart`,
`startOver`, `theme`, `lang`.

**Persistent state** (Season II and cross-level puzzles)

```js
ctx.mechanic(id)  ctx.knows(id)  ctx.act(type, detail)
ctx.give(id, payload)  ctx.take(id)  ctx.hasItem(id)
ctx.route(name)   ctx.remember(answer)
ctx.game          // the RULESET_STATE facade: marks(), remember(), …
```

---

## Adding a stage

Append an object to `levels.js` (canonical level) or to the last `breaks*.js`
(Break puzzle). Nothing else needs editing for a level — the counter, the
progress ticks and the dev grid all read from the built route. A **new Break
puzzle must also be added to `ORDER` in `route.js`**, or it will never be
played; `route.js` logs a `route: not built yet →` warning for any id in `ORDER`
with no matching stage, and does not take the season down with it.

Rules of thumb:

1. **Show the impossibility first.** The player should spend a few seconds
   confirming the obvious route fails. Level 1's door outruns you; level 4's
   counter resets before you can reach ten.
2. **Give the trick an affordance.** Use the vocabulary above.
3. **Make the state legible.** Every level puts its own truth on screen — the
   pixel sizes in level 2, the torque in 11, the word count in 9. The player
   should be able to see *how close* they are.
4. **More than one solution is a feature.** Level 3 can be beaten by deleting
   "red" (nothing is red any more) or by deleting "not" (the prohibition is
   gone). Both are logical; validate the *state*, not the route.
5. **Never validate on a gesture.** `ctx.check` asks a question about the
   world, so any way of making it true works.

---

## Season I at a glance

| # | Level | Instruction | Mechanic |
|---|---|---|---|
| 1 | Reach the end | Reach the end. | drag a word out of the instruction |
| 2 | Bigger | Make 5 bigger than 10. | resize / pinch — "bigger" is physical |
| 3 | Red | Press continue. Do not touch red. | delete a word and the world changes; two valid solutions |
| 4 | Ten | Click the button 10 times. | discard the mechanism that is undoing your work |
| 5 | Still | Do nothing. | do nothing — every input, including the mouse, resets it |
| 6 | Narrower | Make the window narrower than the box. | resize the actual browser window (or pinch-zoom) |
| 7 | Fine print | Type the password. | browser zoom, on 3px text |
| 8 | Both | Hold both switches at the same time. | two switches at once: keyboard, or two fingers |
| 9 | Self-report | This sentence contains exactly four words. | remove words until the sentence is literally true |
| 10 | Elsewhere | Finish the level. | the app's own progress bar is the level |
| 11 | Balance | Balance the beam. | torque — size and distance as quantities |
| 12 | Remap | Drive the square onto the target. | the key-map panel is a draggable object |
| 13 | Unprinted | One hidden word is a colour. Type it. | text selection reveals invisible ink |
| 14 | Off-screen | Put five tokens in the five slots. | pan a world larger than the frame |
| 15 | You cannot finish | You cannot finish. | three locks, one per verb learned |

Season II's thirty levels are catalogued in `docs/ECHO_SPEC.md`; the thirty
Break puzzles in `docs/BREAK_LEVELS.md`.

---

## Localization

The game ships in **English and Arabic**, with a toggle in the bottom bar
(`EN` / `عربي`). The choice is saved alongside progress and flips the whole
app to RTL.

**How it works.** Any player-visible string is either a plain string or a
`{ en, ar }` map, resolved through `ctx.t()`:

```js
instruction: { en: 'Reach the end.', ar: 'اذهب إلى النهاية.' },
ctx.say(ctx.t({ en: 'nothing is red', ar: 'لا شيء أحمر' }));
```

`t()` passes plain strings straight through and falls back to English for any
missing key, so a half-finished translation still runs. Chrome strings (buttons,
the success card, the dev panel) live in `i18n.js`; stage strings live next to
the stage that uses them. All thirty Break puzzles are fully translated.

One deliberate exception: **most ECHO instructions are not translated.** Level
16's instruction is the literal string `'VE'` in both languages — the meaning has
to be earned by doing, or the season has no spine. 25 of the 30 ECHO levels use a
plain untranslated instruction string; only 31, 40, 41, 43 and 44 carry an
`{ en, ar }` instruction, because those five say something *about* the cipher
rather than being written *in* it. Their names, hints and notes are all
translated regardless.

Switching language rebuilds the current stage through the normal load path —
`ctx.destroy()` then `setup()` — so nothing needs special teardown.

**A level that names its own words must localise those too.** Three do:

| Level | English | Arabic |
|---|---|---|
| 3 | `red` / `not` | `الأحمر` / `لا` |
| 9 | `four` in a 6-word sentence | `أربع` in a 7-word sentence |
| 15 | `cannot` | `لا` |

Level 9 is the one to watch: the sentence counts itself, so the arithmetic has
to work per language. English claims 4 out of 6 words (drop 2); Arabic claims
`أربع` out of 7 (drop 3, e.g. `هذه` + `على` + `بالضبط`, leaving
`الجملة تحتوي أربع كلمات`). Word identity ignores harakat and tatweel, so
spelling variants match.

### Adding a third language

1. Add a key to `i18n.js` with the same shape (`dir` decides RTL) and append it
   to `ORDER` — the toggle cycles through that list.
2. Add the key to every `{ en, ar }` map in `levels.js` and the four
   `breaks*.js` files.
3. If it is RTL, it inherits the `[dir="rtl"]` block in `styles.css` for free.
4. Add a block to `tests.html` that solves levels 1, 3, 9, 13 and 15 in it.

### If you are translating into another RTL language

Two things bite, and both are already handled for Arabic:

- **`letter-spacing` breaks cursive scripts** — it disconnects the joins. Every
  element that can hold Arabic resets it to `normal`. Latin-only islands (the
  wordmark, the level counter, keycaps, the big numerals, the level-7 password)
  are deliberately left out and keep their tracking. Do not try to "restore"
  tracking with `letter-spacing: revert` — revert discards the author value too
  and zeroes it.
- **Bidi reorders diagrams.** The level-12 key map, the top progress bar and the
  Echo Mark are pinned `dir="ltr"`: one is a picture of a keyboard, one maps
  pointer X to a value, and the third is an ordered `[row, column]` pair. Level
  geometry (`left`/`right` in px) is physical and is *not* mirrored — a beam and
  a minimap are diagrams, not prose.

Keyboard levels read `e.code` (`KeyQ`, `KeyW`…), never `e.key`, so they work
under any keyboard layout. On an Arabic layout `e.key` returns Arabic letters
and a `e.key === 'Q'` check would make those levels unplayable.

---

## Tests

Six suites. Three run under plain `node` with no dependencies, two run in a
browser, and one drives three real browser engines through Playwright. All were
run green on 2026-08-12; the counts below are the numbers they actually print,
and they will drift upward as tests are added.

### Headless, no dependencies

```bash
node invariants.mjs        #   42 assertions — the ECHO arithmetic
node progress-tests.mjs    # 1226 assertions — the save file and the Vault
node coop-tests.mjs        #   21 assertions — the LAN co-op hub
```

`invariants.mjs` is the one to run **before and after every change**. It loads
`echo.js`, `levels.js`, the four `breaks*.js` and `route.js` into a bare `vm`
context — the level files only touch the DOM inside `setup()`, which it never
calls — and asserts the nine things the season rests on:

1. exactly 29 Echo Marks exist, all on levels 16–44, none doubled
2. all 30 Break puzzles exist, with no mark, no canonical id, 30 distinct routeIds
3. the marks spell `YOU BUILT THE KEY. USE IT NOW`, and survive an
   encode → decode round trip through the real cipher
4. `levelPhase(id) === (id − 16) mod 8` for every ECHO level
5. level 35's phase is 3 no matter where in the route it is played
6. no Break puzzle enters phase arithmetic, and removing them all from the route
   leaves 16…45 in perfect ascending order
7. the Echo Grid is 8×8 with 64 unique characters, and every mark encodes to
   exactly two real tokens
8. the final key is `VE NA OR SE KA MI RU LI`, level 45 exists, carries no mark,
   and its lock still compares against `E.TOKENS` itself
9. route integrity: 75 stages, no duplicates, Season I first, level 45 last,
   every stage has a save key, and the Break runs stay irregular

`progress-tests.mjs` guards the two things that arithmetic sits on: the save
file and the notebook next to it. It runs the real sources in `node:vm` with a
stubbed `window`/`document`/`localStorage`, and creates a *second* context over
the same storage object — which is exactly what a page refresh is, so "progress
survives a reload" is asserted rather than assumed. Two rules it exists to
defend: a stage's save key is a **number** for Season I/ECHO and a **string**
`routeId` for a Break, and no localStorage value — however corrupt, hostile or
ancient — may throw on boot.

`coop-tests.mjs` starts `server.mjs`'s hub in-process and asserts that two SSE
streams see each other, that history is replayed to a latecomer, that a dropped
stream does not take the others down, and that names and messages are trimmed
and never interpreted as markup.

### Cross-engine

```bash
npx playwright install chromium webkit firefox
node browser-tests.mjs
```

RULESET is almost entirely pointer work — drag, drop, pointer capture, live
coordinate maths — which is exactly the ground where Chromium, WebKit and Gecko
disagree. This runs the **real production file set** (what `.vercelignore`
leaves behind) served with the **real headers** `vercel.json` declares,
including the Content-Security-Policy, so a policy that breaks the game fails
here rather than in front of a player. Per engine it checks that level 1 is
genuinely solvable by dragging, that progress persists, that Hint / Restart /
theme / Arabic-RTL all work, that an ECHO stage, a late interleaved stage and
the finale all build, that `tests.html`, `invariants.mjs`, `docs/` and
`server.mjs` **404 on the deployed build**, and that a 375×667 phone has no
horizontal overflow and no console errors.

### In a browser

Both need same-origin iframes, so `file://` will not do:

```bash
pnpm dev                       # or: python3 -m http.server 8000
open http://localhost:5173/tests.html       # 550 assertions
open http://localhost:5173/sea-tests.html   #  49 assertions
```

`pnpm test` (`node server.mjs --tests`) serves and opens `tests.html` for you.
The page title becomes `PASS` or `FAIL`, which is what to check if you drive it
from a script.

`tests.html` drives every level with synthetic pointer, keyboard and input
events, and asserts that the *wrong* routes fail. It covers Season I 1–15
(including Arabic runs of 1, 3, 9, 13, 15), ECHO 16–45 one block per level, the
state store and migrations, the capability system, `ctx.claim()` refusing
undeclared chrome, the Puzzle Lab, and the route invariants.

**Known coverage gap.** No Break puzzle is driven to its solution. The Break
levels get structural assertions only (no id, no mark, well-formed routeId,
three hints). Worse, the "sets up and tears down cleanly" sweep loops
`RULESET_LEVELS.length` — 45 — over a **75-stage route**, so it stops at route
position 44 and never instantiates `B15`–`B30` at all. See
`docs/RELEASE_AUDIT.md`.

Two things the suites cannot see, learned the hard way:

- **A DOM assertion is not a visual assertion.** A chip that passed its
  "not hidden" test still rendered off-screen because its parent was not a
  positioned ancestor. For anything positional, take a screenshot and look.
- **Headless Chrome composites almost no frames**, so rAF stalls and CSS
  transitions never advance. Use the harness's frame pump (`pumpFrames`), assert
  on `el.style.*` rather than `getBoundingClientRect()`, and pass
  `--force-prefers-reduced-motion` when a screenshot needs final layout.
  Do not screenshot a page served by `server.mjs` — its injected co-op layer
  holds an SSE stream open and the page never reaches network-idle.

---

## Deploying

Static hosting, nothing to build. `vercel.json` sets the headers and
`.vercelignore` decides what is public.

```
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self';
  img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none';
  base-uri 'self'; form-action 'self'; frame-ancestors 'self'
Cache-Control: public, max-age=0, must-revalidate   (on .js, .css, .html)
```

The CSP is strict — no inline scripts, no external anything — which the game
already satisfies because every script is a real file and the only `data:` URI
is the favicon.

**`.vercelignore` is a spoiler guard, not just build hygiene.** RULESET is a
mystery, and `tests.html` drives every puzzle to its solution, `invariants.mjs`
prints the hidden sentence, and `docs/ECHO_SPEC.md` explains the cipher end to
end. All of them are excluded, along with `sea-tests.html`, `*-tests.mjs`,
`README.md`, `output/`, `server.mjs`, `live.js`, `package.json` and the usual
dev clutter. `browser-tests.mjs` asserts those paths return **404** on a
production-shaped serve.

`server.mjs` and `live.js` are deliberately not deployed: the co-op hub is a
long-running Node process with no meaning on static hosting, and the
single-player game does not depend on either.

---

## Experimental / not production

Clearly separated, so nobody ships them by accident:

- **GLOBAL SEA** (`global.html` and friends) — a local demo. No backend, no
  accounts, simulated traffic. Linked from the game's bottom bar.
- **The co-op layer** (`server.mjs` + `live.js`) — LAN only, no auth, no
  persistence, injected into `index.html` *only when served* by `server.mjs`.
  Opening `index.html` off the disk is pure single-player.
- **The Puzzle Lab** (`lab.js`) — dev-only, no production entry point.
- **`?dev=1` and the backtick panel** — dev-only. Note that these are
  client-side and therefore reachable by anyone who reads the source. That is
  fine, and deliberate: see the secrecy note in `docs/ECHO_SPEC.md`.

---

## A note on secrecy

This is a browser game. Every byte — the cipher, the grid, the 29 marks, the
final key — ships to the client and anyone who opens devtools can read it.
**"Hidden" throughout these documents means *not surfaced in the UI*.** It is a
design boundary, never a security claim, and no puzzle depends on the player
being unable to look.

---

## GLOBAL SEA

`global.html` — a chat where every message is a floating physical object with
drift, collision, elastic reply tethers and thread clusters. Local demo only:
no backend, no accounts, simulated traffic.

The one decision that makes it work is **hybrid rendering**: DOM for the
readable conversation (capped, pooled), canvas for tethers and the archived
debris beneath. Bubbles are sized with `measureText` on an offscreen canvas
rather than by reading `offsetWidth`, so spawning a thousand messages triggers
zero forced reflows — which is the only reason the stress test reaches 3000.

Dev panel: <kbd>⌘/Ctrl</kbd> + <kbd>⇧</kbd> + <kbd>D</kbd>.
