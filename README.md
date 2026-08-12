# RULESET

A puzzle game where the interface is the puzzle. The instruction is not a
description of the level — it is a live object in it. So are the buttons, the
numbers, the progress bar, the browser window and the space between words.

30 handcrafted levels across two seasons. No framework, no build step, no
dependencies.

```
open index.html          # single player, straight off the disk

pnpm dev                 # …or serve it, which adds the co-op layer and
                         #    prints a LAN link for someone else to join
```

**Season I** (1–15) teaches *the interface can be manipulated*.
**Season II — ECHO** (16–45, 15 built) teaches *information can be manipulated*:
an eight-word language that turns out to also be a cipher. See
[`docs/ECHO_SPEC.md`](docs/ECHO_SPEC.md) before touching any of it.

There is a second page, **GLOBAL SEA** (`global.html`), where every chat message
is a floating physical object. It shares nothing with the game but the styling
sensibility — see the bottom of this file.

---

## Playing

| | |
|---|---|
| **Hint** | one nudge, then a second, more explicit one |
| **Restart** | rebuilds the current level from scratch |
| **Skip** | move on without solving. Does **not** bank the level's echo mark — come back and solve it to fill the gap |
| **Start over** | erases all progress; click twice within 3s to confirm |
| **EN / عربي** | switches language and flips the layout to RTL, remembered |
| **◐** | light / dark, remembered |
| **Progress** | saved to `localStorage` under `ruleset:v1` |

**Developer mode** — press <kbd>`</kbd> (backtick), or load `?dev=1`.
Jump to any level, unlock everything, force-solve, wipe progress.
<kbd>←</kbd>/<kbd>→</kbd> step between levels while it is open.
`?level=7` opens a level directly.

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
i18n.js         chrome strings per language
state.js        the persistent store — mechanics, inventory, ledger, echo memory
echo.js         Season II: the cipher. Pure logic, no DOM
echo-ui.js      Season II: the Ring, the Grid, token strips, NA tethers
levels.js       all 30 levels, one object each
game.js         the engine — level lifecycle, capabilities, and the ctx toolkit
lab.js          the developer Puzzle Lab (hidden; backtick or ?dev=1)
tests.html      drives every level to its solution in a real browser
docs/           the audit, the contract, ECHO_SPEC, future mechanics

global.html     GLOBAL SEA — a separate page, see below
global.css      · physics.js · messages.js · simulation.js · global.js
sea-tests.html  its own suite
server.mjs      dev server + LAN co-op hub (no dependencies)
live.js         the co-op layer, injected only when served
```

Load order matters: `i18n.js`, `state.js`, `echo.js`, `echo-ui.js` and
`levels.js` publish their globals, then `game.js` consumes them, then `lab.js`
attaches. All classic scripts, so `file://` works.

**Before designing a level, read `docs/PUZZLE_CONTRACT.md`.** It is fifteen
rules written as checks you can run against a draft, and the draft template at
the end is the fastest way to find out that an idea does not work yet.

**Levels never touch the DOM directly.** They receive a `ctx` object that owns
every element, listener, timer and animation frame they create. When the level
changes, `ctx.destroy()` reverses all of it. That is why a level is ~30 lines
and why nothing leaks between them.

---

## The level contract

```js
{
  id:          1,                       // display number, unique
  name:        'Reach the end',         // shown bottom-left
  instruction: 'Reach the end.',        // tokenised into draggable word spans
  hint:        'first nudge',
  hint2:       'more explicit',         // optional
  note:        'Words are objects too.',// optional, shown on the success card
  setup(ctx)   { ... },                 // build the level
  cleanup(ctx) { ... }                  // optional — ctx already frees its own
}
```

`setup` runs one frame after the level mounts, so measurements are correct.

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
  affordance: false            // suppress the dotted outline
})

ctx.resize(el, {
  mode: 'box' | 'font',
  min, max,
  keepRatio: false,            // width only, handle tracks the pointer 1:1
  gain: 2,                     // for centre-anchored elements
  onResize(value, el)
})                             // → { handle, apply, read }

ctx.pinch(el, factor => …)     // two-finger scale
ctx.detach(el)                 // lift into the free layer, keeping its position
```

**Words** — the instruction is a row of spans, and they are real objects

```js
ctx.words('end', { discard: false })          // one word, kept where dropped
ctx.words('red not', { onRemove, onChange })  // named words, discardable
ctx.words('*', { onChange })                  // every word

ctx.sentenceWords()      // words still in the sentence, lowercase
ctx.word('red')          // the span, or null once it is gone
ctx.setInstruction(str)  // re-render mid-level
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
ctx.check(() => bool)    // polled every frame; true solves the level
ctx.solve()              // solve now
ctx.reject('why')        // shake + red status line
ctx.say('text', 'good' | 'warn')
ctx.after(ms, fn)  ctx.every(ms, fn)  ctx.on(target, type, fn)
```

**The app frame itself**

```js
ctx.takeProgress({ start, onChange })  // → { value(), set(v) }
                                       // the top bar becomes a control and is
                                       // handed back automatically on cleanup
ctx.viewportWidth()                    // visualViewport-aware, so pinch counts
ctx.onViewportChange(fn)
```

---

## Adding a level

Append an object to `levels.js`. Nothing else needs editing — the counter,
the progress ticks and the dev grid all read from the array.

```js
{
  id: 16,
  name: 'Heavier',
  instruction: 'Put the heavy thing on the left.',
  hint: 'Nothing here says which one is heavy.',
  note: 'Labels are claims, not facts.',

  setup(ctx) {
    const { w, h } = ctx.size();

    const zone = ctx.el('div', 'slot', {
      style: { left: '40px', top: '40px', width: '160px', height: '160px' }
    });

    const crate = ctx.el('div', 'obj', {
      x: w - 220, y: h / 2 - 40,
      style: { width: '80px', height: '80px', background: 'var(--ink)' }
    });
    ctx.drag(crate, { bounds: 'stage' });

    // the word "heavy" is what makes something heavy
    ctx.words('heavy', { discard: false });

    ctx.check(() => {
      const word = ctx.word('heavy');
      return !!word && ctx.hits(word, crate, 4) && ctx.hits(crate, zone, -20);
    });
  }
}
```

Rules of thumb that made the existing 15 work:

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

## The 15

| # | Level | Mechanic |
|---|---|---|
| 1 | Reach the end | drag a word out of the instruction |
| 2 | Bigger | resize / pinch — "bigger" is physical |
| 3 | Red | delete a word and the world changes; two valid solutions |
| 4 | Ten | discard the mechanism that is undoing your work |
| 5 | Still | do nothing — every input, including the mouse, resets it |
| 6 | Narrower | resize the actual browser window (or pinch-zoom) |
| 7 | Fine print | browser zoom, on 3px text |
| 8 | Both | two switches at once: keyboard, or two fingers |
| 9 | Self-report | remove words until the sentence is literally true |
| 10 | Elsewhere | the app's own progress bar is the level |
| 11 | Balance | torque — size and distance as quantities |
| 12 | Remap | the key-map panel is a draggable object |
| 13 | Unprinted | text selection reveals invisible ink |
| 14 | Off-screen | pan a world larger than the frame |
| 15 | You cannot finish | three locks, one per verb learned |

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
the success card, the dev panel) live in `i18n.js`; level strings live next to
the level that uses them.

Switching language rebuilds the current level through the normal load path —
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
2. Add the key to every `{ en, ar }` map in `levels.js`.
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
- **Bidi reorders diagrams.** The level-12 key map and the top progress bar are
  pinned `dir="ltr"`: one is a picture of a keyboard, the other maps pointer X
  to a value. Level geometry (`left`/`right` in px) is physical and is *not*
  mirrored — a beam and a minimap are diagrams, not prose.

Keyboard levels read `e.code` (`KeyQ`, `KeyW`…), never `e.key`, so they work
under any keyboard layout. On an Arabic layout `e.key` returns Arabic letters
and a `e.key === 'Q'` check would make those levels unplayable.

## Tests

`tests.html` drives every level to its solution with synthetic pointer,
keyboard and input events, and asserts that the *wrong* routes fail. Serve the
folder and open it (it needs same-origin iframes, so `file://` will not do):

```bash
pnpm dev                       # or: python3 -m http.server 8000
open http://localhost:5173/tests.html
open http://localhost:5173/sea-tests.html
```

**399 assertions** for the game, **49** for GLOBAL SEA. Green means all 30
levels are still solvable, the cipher round-trips at every phase, and nothing
leaks between levels. Add a case whenever you add a level — it is the cheapest
way to catch a puzzle that has become impossible.

Two things the suite cannot see, learned the hard way:

- **A DOM assertion is not a visual assertion.** A chip that passed its
  "not hidden" test still rendered off-screen because its parent was not a
  positioned ancestor. For anything positional, take a screenshot and look.
- **Headless Chrome composites almost no frames**, so rAF stalls and CSS
  transitions never advance. Use the harness's frame pump, assert on
  `el.style.*` rather than `getBoundingClientRect()`, and pass
  `--force-prefers-reduced-motion` when a screenshot needs final layout.
  Do not screenshot a page served by `server.mjs` — its injected co-op layer
  holds an SSE stream open and the page never reaches network-idle.

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
