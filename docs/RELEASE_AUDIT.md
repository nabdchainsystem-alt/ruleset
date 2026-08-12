# RULESET — Release Audit

**Release:** 1.0.0 · **Audit opened:** 2026-08-12

This is the single record of what was checked before the production lock, by
whom, and what was found. Sections marked *(to fill in)* are for the results of
the other auditors; everything else was verified directly against the source
during the documentation audit and is stated with its evidence.

Anything that could not be determined is written as **UNVERIFIED** with the
reason. Absence of a finding is not a pass.

---

## 1. Inventory — what is being released

### Stage count

| | Count | Source |
|---|---|---|
| Season I levels | 15 (ids 1–15) | `levels.js` |
| Season II — ECHO levels | 30 (ids 16–45) | `levels.js` |
| Break puzzles | 30 (`B01`–`B30`) | `breaks.js` · `breaks2.js` · `breaks3.js` · `breaks4.js` |
| **Total canonical levels** | **45** | `RULESET_LEVELS.length === 45` |
| **Total played stages** | **75** | `RULESET_ROUTE.build(...).length === 75` |

Verified by evaluating the level files headlessly in a `vm` context.

### File inventory

| File | Lines | Role |
|---|---|---|
| `index.html` | 132 | the game shell |
| `styles.css` | 2073 | tokens, shared level pieces, ECHO pieces, RTL |
| `breaks2.css` / `breaks3.css` / `breaks4.css` | 306 / 249 / 153 | Break-level styling per batch |
| `vault.css` | 407 | the Vault panel |
| `i18n.js` | 94 | chrome strings (en, ar) |
| `state.js` | 424 | the save store — `ruleset:v1`, schema 4 |
| `echo.js` | 306 | the cipher, pure logic |
| `echo-ui.js` | 474 | ring, grid, strip, tether, wall |
| `levels.js` | 4309 | levels 1–45 |
| `breaks.js` / `breaks2.js` / `breaks3.js` / `breaks4.js` | 308 / 669 / 749 / 456 | B01–05 / B06–15 / B16–25 / B26–30 |
| `route.js` | 88 | the interleaved play order |
| `game.js` | 1876 | the engine |
| `vault.js` | 833 | THE VAULT — `ruleset:vault` |
| `lab.js` | 350 | the Puzzle Lab (dev only) |
| `recovery.css` | — | the failure bar and the "did not start" card |
| `tests.html` | 2250 | browser suite, the game |
| `sea-tests.html` | 316 | browser suite, GLOBAL SEA |
| `invariants.mjs` | 148 | headless ECHO invariants |
| `progress-tests.mjs` | — | headless save-file + Vault torture tests |
| `coop-tests.mjs` | 199 | headless co-op hub tests |
| `browser-tests.mjs` | — | cross-engine smoke, Playwright |
| `vercel.json` | — | production headers, including a strict CSP |
| `.vercelignore` | — | what the public build must not contain |
| `server.mjs` | 236 | dev server + LAN co-op hub |
| `live.js` | 440 | co-op layer, injected only when served |
| `global.html` + `global.css` + `physics.js` + `messages.js` + `simulation.js` + `global.js` | 137 / 663 / 362 / 262 / 180 / 707 | GLOBAL SEA (experimental) |

No build step, no **runtime** dependencies — the only dev dependency is
Playwright, used by `browser-tests.mjs` and never shipped. `package.json`
declares `node >= 18` and three scripts: `dev`, `play`, `test` — all of them
`node server.mjs`.

> **Line counts were taken at the start of this audit and several files have
> grown since** (`game.js`, `state.js`, `styles.css`, `vault.js` and
> `tests.html` were all edited by concurrent auditors while this ran). The
> *inventory* — which files exist and what each one is for — is current; the
> line numbers are indicative only.

### Production build

`vercel.json` + `.vercelignore`. Static hosting, nothing to compile.

Headers on every path: `X-Content-Type-Options: nosniff`, `Referrer-Policy:
strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(),
geolocation=(), interest-cohort=()`, and a strict CSP —
`default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:;
font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self';
form-action 'self'; frame-ancestors 'self'`. `.js`, `.css` and `.html` get
`Cache-Control: public, max-age=0, must-revalidate`.

The game already satisfies the CSP: every script is a real file, there are no
inline handlers, and the only `data:` URI is the favicon.

**`.vercelignore` is a spoiler guard as much as build hygiene.** Excluded:
`tests.html`, `sea-tests.html`, `*-tests.mjs`, `invariants.mjs`, `docs/`,
`README.md`, `output/`, `server.mjs`, `live.js`, `package.json`,
`pnpm-lock.yaml`, `node_modules/`, `.git/`, `.impeccable/`, `tmp/`, `_probe.html`.
`browser-tests.mjs` asserts four of those paths 404 on a production-shaped serve.

---

## 2. What was tested

### Automated suites — run 2026-08-12, all green

| Suite | How | Assertions | Result |
|---|---|---|---|
| ECHO invariants | `node invariants.mjs` | **42** | ✅ all green |
| Progression + Vault | `node progress-tests.mjs` | **1226** | ✅ all green |
| Co-op hub | `node coop-tests.mjs` | **21** | ✅ all green |
| Game | `open http://localhost:5173/tests.html` | **550** | ✅ 550 ok / 0 fail |
| GLOBAL SEA | `open http://localhost:5173/sea-tests.html` | **49** | ✅ 49 ok / 0 fail |
| Cross-engine | `node browser-tests.mjs` | — | ⏳ **UNVERIFIED by this auditor** — port 8749 was held by a concurrent run. Playwright is installed and the harness is present. Results belong in §5. |

**Total asserted, headless + browser suites: 1888.**

The two browser suites need same-origin iframes, so they must be served — start
`pnpm dev` (or `PORT=5174 pnpm dev`) first. `pnpm test` serves and opens
`tests.html` directly. The page `document.title` becomes `PASS` or `FAIL`, which
is the reliable hook for scripted runs. Both were driven here with headless
Chrome (`--headless=new --force-prefers-reduced-motion --virtual-time-budget`)
and their DOM output parsed.

**Counts move.** `tests.html` reported 537 at the start of this audit and 550 an
hour later while other auditors were landing fixes; `progress-tests.mjs` and
`browser-tests.mjs` did not exist when the audit opened. Treat the numbers above
as of 2026-08-12 and re-read them at the lock. The README previously claimed
399 game assertions; that figure was stale by ~150.

### `progress-tests.mjs` — what it defends

Runs the real sources in `node:vm` with a stubbed `window` / `document` /
`localStorage`. A *second* context created over the **same** storage object is
exactly what a page refresh is, which is how "progress survives a reload" is
asserted rather than assumed. Two rules the file exists to defend:

1. A stage's save key is a **number** for Season I/ECHO and a **string**
   `routeId` for a Break. Anything that assumes one type silently erases the
   other. It confirms 75 stages · 30 string keys · 45 number keys.
2. No localStorage value — however corrupt, hostile or ancient — may throw on
   boot. A save file is untrusted input.

### `browser-tests.mjs` — what it covers

Serves the **real production file set** (what `.vercelignore` leaves behind)
with the **real headers** `vercel.json` declares, *including the CSP*, then runs
chromium, webkit and firefox against it. Per engine:

- the page loads with its title; the instruction renders; level 1 builds
- `#levelTotal` reads **75**
- level 1 is genuinely solved by a synthetic drag, and `#solved.is-on` appears
- the solve is written to `RULESET_STATE.data.solved`; **Next** advances
- Hint reveals text; Restart rebuilds; the theme toggle lands on light or dark
- the Arabic toggle sets `document.dir === 'rtl'` while `#echoMark` stays `ltr`
- an ECHO stage (`?level=30`), a late interleaved stage (`?level=52`) and the
  finale (`?level=75`) all build without `.stage-failed`
- `/tests.html`, `/invariants.mjs`, `/docs/ECHO_SPEC.md` and `/server.mjs` all
  return **404** on the production-shaped serve
- at 375×667 with touch: no horizontal overflow, Hint reachable, board ≥ 200px
- zero console errors throughout

### The 42 ECHO invariants

Grouped as `invariants.mjs` groups them. These are the assertions that must
never go red:

1. **Marks exist and are unique** — exactly 29 `echoMarkChar` values; every one
   on a level in 16–44; no level carries two.
2. **Break puzzles are inert to ECHO** — 30 of them; none has an `echoMarkChar`;
   none has an `id`; 30 distinct `routeId`s.
3. **The message is exact** — the marks in level order spell
   `YOU BUILT THE KEY. USE IT NOW`, and survive a full
   `encodeEchoMark` → `decodeEchoMark` round trip per level.
4. **Phase derives from the canonical id** — `levelPhase(id) === (id − 16) mod 8`
   for every ECHO level; 16 → 0; 24 → 0 (the cycle closes at eight); 44 → 4.
5. **Level 35 is the proof** — its phase is 3, it is played at position 53 of 75,
   and its phase still does not care.
6. **Break puzzles never enter phase arithmetic** — none declares a `phase` or
   `echoPhase`; `isEcho()` rejects all of them; `isBreak()` accepts all of them;
   and stripping them out of the route leaves 16…45 in perfect ascending order.
7. **The grid holds** — 8×8, 64 characters, all unique; every mark character is
   on it; every mark encodes to exactly two real tokens.
8. **The final key holds** — `VE NA OR SE KA MI RU LI`; each token at its index;
   level 45 exists, is playable, carries no mark; and the source of level 45
   still compares against `E.TOKENS` itself, so the lock cannot drift from the
   language.
9. **Route integrity** — 75 stages; no duplicates; Season I plays first, 1…15;
   level 45 is last; every stage has a save key; and the Break runs stay
   irregular (2/3/4 lengths, never a rhythm).

Console output on a green run:

```
  ECHO INVARIANTS — 42 assertions, all green
  message: "YOU BUILT THE KEY. USE IT NOW"
  level 35: phase 3 at play position 53 of 75
```

### Known coverage gaps in the automated suites

These are gaps in the *tests*, not known failures.

- **No Break puzzle is driven to its solution by any test.** Season I 1–15 and
  ECHO 16–45 each have a dedicated block in `tests.html` that solves them with
  synthetic events. `B01`–`B30` have structural assertions only (no id, no mark,
  well-formed `routeId`, three hints present) plus, as of the concurrent fixes,
  bookkeeping coverage on the **first** Break stage only (that it records under
  its `routeId` rather than `undefined`, and that a restart is counted against
  it). Re-checked at 11:22 — the gap is unchanged.
- **`B15`–`B30` are never instantiated at all.** The "sets up and tears down
  cleanly" sweep at `tests.html:2237` still loops
  `for (i = 0; i < RULESET_LEVELS.length; i++)` — 45 iterations over a
  **75-stage route** — so it stops at route position 44 (canonical level 31). It
  smoke-tests `B01`–`B14` and misses the rest. Its message, "all 45 levels set
  up + tear down cleanly", reads as full coverage and is not. Changing `45` to
  `LEVELS.length` (75) is a one-word fix and would close the gap; it is **not**
  this auditor's file to edit.
- **Mobile is asserted at one viewport only.** `browser-tests.mjs` checks
  375×667 for horizontal overflow, Hint reachability and board width, per
  engine — real coverage, but a single size, and it never plays a stage that
  computes its own geometry at that width (B09, B12, B16, B26, B30, level 45).
  Nothing asserts the 430px width the Break levels were designed against.

### Manual / exploratory testing *(to fill in)*

- Full playthrough, Season I:
- Full playthrough, Season II + Breaks (75 stages):
- Level 45 reached with a genuinely earned 29/29 Echo Memory:
- Vault used across a full run:
- Arabic / RTL playthrough:
- Co-op session, two devices on a LAN:

---

## 3. Bugs found *(to fill in — one confirmed so far)*

| # | Severity | Area | Description | Status |
|---|---|---|---|---|
| 1 | Cosmetic | B13 (Mirror) | `.brk-word` is defined in **both** `breaks2.css` (34px, for B13's board word) and `breaks4.css` (17px, for B29/B30). `breaks4.css` loads last, same specificity, so it wins: B13 renders a 17px board word against a 34px reflection. Confirmed by computed style in headless Chrome: `word=17px reflection=34px`. The narrow-screen rules collide the same way (26px vs 14px). Fix is a rename or a scoping selector in CSS. | Open |
| | | | | |
| | | | | |

---

## 4. Fixes applied *(to fill in)*

| # | Bug | Fix | File(s) | Verified by |
|---|---|---|---|---|
| | | | | |

---

## 5. Browser matrix

Automated, against the **real production file set** served with the **real
`vercel.json` headers including the CSP** — `node browser-tests.mjs`, 98
assertions, 0 failures.

| Engine | Version | How | Game | Verdict |
|---|---|---|---|---|
| Chromium | Playwright 1.62 (Chrome 151) | automated | boot · drag · touch · save · RTL · CSP · mobile | **PASS** |
| WebKit *(Safari engine)* | Playwright 1.62 | automated | boot · drag · save · RTL · CSP · mobile | **PASS** |
| Firefox | Playwright 153 | automated | boot · drag · save · RTL · CSP · mobile | **PASS** |
| Safari | — | macOS app | not driven | **UNTESTED** |
| Safari | — | iOS device | not driven | **UNTESTED** |
| Chrome | — | Android device | not driven | **UNTESTED** |

What each engine is actually asserted to do: load with its title; render the
instruction; build level 1; report 75 stages; lift the word "end" out of
flowing text and keep it **under the pointer** (< 30px) and **at full size**
(> 20px); solve level 1 the way it is meant to be solved; persist a solved
stage across a reload; reveal a hint; restart; flip the theme; switch to
Arabic and back with the Echo Mark pinned LTR; build an ECHO stage, a late
interleaved stage and the finale without failing; 404 on all four answer-key
paths; and produce **zero console errors** throughout.

### Verified per-engine, beyond "it loads"

- **Touch.** Level 1 is solvable by finger on a 375×667 phone, and the drag
  does not scroll the page out from under the player. Driven through CDP
  `Input.dispatchTouchEvent`, which the browser turns into real pointer
  events — dispatching synthetic `touchstart` proves nothing here, because
  the engine drags with Pointer Events + `setPointerCapture` and browsers do
  not synthesise those from scripted touch. **Chromium only: Playwright
  exposes no CDP for WebKit, so WebKit's touch path is UNTESTED, not assumed
  green.**
- **Storage that refuses writes.** Safari private browsing exposes
  `localStorage` and throws on every write. All three engines boot, render
  and stay playable; progress simply does not persist. No crash, no failure
  card, no thrown error.
- **Corrupted saves.** Seven payloads written into `ruleset:v1` before boot —
  truncated JSON, `null`, a bare array, wrong types throughout, a `solved`
  list poisoned with `null`/`{}`/`true`/`"undefined"`/`NaN`/`-5`/`1e12`, a
  200 000-character key, and an unknown future schema. All seven boot with a
  rendered stage, a rendered instruction and **zero page errors**.
- **The CSP.** No violations on `/index.html`, two ECHO stages, a late
  interleaved stage, or `/global.html`, and every stage still renders. The
  policy carries no `'unsafe-inline'` at all.

### Still engine-sensitive, and why it is acceptable

`visualViewport` (levels 6–7), `color-mix(in srgb, …)`, and `rotateY` (B07's
card) are all baseline-supported in the three engines tested. Real Safari on
iOS remains the largest untested surface; it shares WebKit with the automated
run, but not its input stack or its viewport behaviour.

---

## 6. Viewport matrix

`node viewport-tests.mjs` — **600 stage renders**: every one of the 75 stages
at every supported size, with **reduced motion forced on**. All clean.

A stage fails if the page scrolls sideways, the stage builds nothing, the
recovery card appears, the instruction is empty (level 45 is deliberately
silent), or the Hint button lands off-screen or below a usable size. When
something does overflow the runner names the offending element rather than
reporting "something overflows".

| Width × Height | | Result |
|---|---|---|
| 1920 × 1080 | desktop | **75/75 clean** |
| 1440 × 900 | laptop | **75/75 clean** |
| 1366 × 768 | laptop | **75/75 clean** |
| 1024 × 768 | tablet landscape | **75/75 clean** |
| 820 × 1180 | tablet portrait | **75/75 clean** |
| 430 × 932 | large phone | **75/75 clean** |
| 390 × 844 | phone | **75/75 clean** |
| 375 × 667 | small phone | **75/75 clean** |
| 320 × 568 | — | **out of scope**, below the supported floor |

Reduced motion is on for the whole sweep deliberately: two levels were once
found *unsolvable* with it enabled, because their only clue was a shared pulse
animation. Every stage now builds and renders with motion off.

The stages that most needed this are the ones computing their own geometry —
B09's clamped clusters, B12's centroid hit region, B10's stage-relative ball,
B16's plate measured from its pads, B26's 0.19w slab spacing, B30's four fixed
fractions, and the 29-tile Echo Memory Wall in level 45.

---

## 7. Unresolved non-blockers

Recorded so they are decisions rather than oversights.

| # | Item | Why it is not a blocker |
|---|---|---|
| 1 | **`Math.random()` in two levels.** `PUZZLE_CONTRACT.md` rule 3 says never. Level 40 randomises which of two messages is drawn on the left; level 45 shuffles the eight lock tiles in the tray. | Both are presentation, not logic. Neither changes what the player must reason about, and neither varies difficulty run to run. Needs a final yes/no from the designer, not a code change. |
| 2 | **Level 15's third latch repeats level 10.** Flagged in `PUZZLE_DNA.md` cross-cutting finding 2; the recommended replacement was never implemented. | Shipped as-is since Season I. Changing it now is a design change, not a release fix. |
| 3 | **B07 and B17 share the English name "The other side".** Their Arabic names differ (`الوجه الآخر` / `الجهة الأخرى`). | Names are display-only, appear 40+ stages apart, and are not used as keys anywhere. |
| 4 | **B03, B18 and B23 are three variations on "inside is a relationship".** | Deliberate. B23 restates it as an explicit prohibition; B18 makes the pointer the object. Wide spacing makes them read as callbacks. |
| 5 | **A player who skips B03 never unlocks the Vault.** | The Vault is never required to solve anything (constraint 6 in `VAULT_SPEC.md`), so this is a missed feature, not a dead end. |
| 6 | **`docs/FUTURE_MECHANICS.md` is aspirational.** | Now labelled as a wish list at the top of the file. Nothing in it describes shipped behaviour. |
| 7 | **`docs/PUZZLE_DNA.md` covers Season I only.** | Now scoped at the top of the file. Preserved as a historical audit. |
| 8 | **`breaks3.css` and `breaks4.css` carry no `prefers-reduced-motion` block.** `styles.css`, `breaks2.css`, `vault.css` and `global.css` each have one. | B16–B30 animate mostly on discrete state classes rather than continuous motion, and the global block in `styles.css` covers shared pieces. **UNVERIFIED** whether any B16–B30 animation is actually uncomfortable under reduced motion — needs a human with the setting on. |
| 9 | **`index.html` hardcodes `<span id="levelTotal">15</span>`.** | Cosmetic only for a single frame: `engine.start()` overwrites it with `LEVELS.length` (75) before paint, and `browser-tests.mjs` asserts the rendered value is `75`. Worth changing to avoid a flash of "01/15" on a slow load. |

---

## 8. Known experimental features

Everything below is deliberately not production, and is documented as such in
`README.md`.

| Feature | Files | What it is | Exposure |
|---|---|---|---|
| **GLOBAL SEA** | `global.html`, `global.css`, `physics.js`, `messages.js`, `simulation.js`, `global.js` | A chat where every message is a floating physical object. No backend, no accounts, simulated traffic. Local demo. | Linked from the game's bottom bar, so a player *can* reach it. |
| **LAN co-op** | `server.mjs`, `live.js` | Presence + chat + progress over SSE for people on the same Wi-Fi. No auth, no persistence, in-memory only (60-line history). | `live.js` is injected into `index.html` **only when served by `server.mjs`**. Opening `index.html` off the disk is pure single-player. |
| **Puzzle Lab** | `lab.js` | Six tabs: levels, state, mechanics, items, history, echo. The echo tab can decode marks, edit Echo Memory and reset Season II. | Dev only. No production entry point. |
| **Dev panel** | `game.js` | Jump to any stage, unlock all, force-solve, wipe progress. | Backtick / `~` key, or `?dev=1`. Client-side, so reachable by anyone reading the source — see §9. |
| **`dev: fill memory` on level 45** | `levels.js` | Fills all 29 marks so the finale can be tested without a full playthrough. | Rendered **only when the dev panel is open** (`#dev` present and not hidden). |

---

## 9. Security posture — stated, not assumed

This is a static browser game. It has no server-side logic, no accounts, no
network calls to anywhere, and no secrets to leak in the security sense.

- **The cipher is not a secret.** `echo.js`, the 8×8 grid, all 29 marks and the
  final key `VE NA OR SE KA MI RU LI` ship to the client in plain source.
  "Hidden" throughout the docs means *not surfaced in the UI* — a design
  boundary, never a security claim. Both `echo.js` and `ECHO_SPEC.md` say so in
  their own text.
- **No credentials, tokens or keys of any kind** appear in the source. Verified
  by grepping every `.js`, `.mjs`, `.html`, `.css` and `.json` in the repo for
  `api_key` / `apikey` / `secret` / `passwd` / `bearer ` / `AKIA…` / `ghp_` /
  `sk-` / `-----BEGIN`. The only hits are the word "secret" used as ordinary
  English inside test fixtures and the `output/pdf/` design documents — no
  credential material anywhere. There is no `.env` file and nothing
  credential-shaped in `.gitignore`.
- **`output/pdf/` contains the full spoiler ledger** — the 29 marks, their
  phases and `YOU BUILT THE KEY. USE IT NOW` in plain text. It is excluded by
  `.vercelignore` (`output/`) and must stay excluded.
- **The deployed build is header-hardened.** Strict CSP (`script-src 'self'`, no
  inline), `nosniff`, a restrictive `Permissions-Policy`, and
  `frame-ancestors 'self'`. `browser-tests.mjs` runs the whole suite *behind
  those headers*, so a CSP that breaks the game fails in CI rather than in
  front of a player.
- **The co-op hub takes no authentication** and holds nothing on disk; it trims
  names and messages server-side and `coop-tests.mjs` asserts that markup in a
  message is carried as plain text and never executed.
- **The Vault cannot read ECHO state.** Verified: `vault.js` contains zero
  references to `RULESET_ECHO`, `levelPhase`, `checksum` or `echoMarkChar`, and
  the only occurrence of the string `echoMemory` is inside the comment that
  states the constraint. It also keeps its own storage key, so `State.resetAll()`
  cannot erase a player's notes.

*(to fill in)* Any additional findings from the security reviewer:

---

## 10. Failure handling — verified present

The engine has three layers of protection against a blank screen, all in
`game.js`:

1. **`setup()` is wrapped.** A stage whose `setup` throws shows a full recovery
   card — the stage never built, so there is nothing to play.
2. **Global `error` and `unhandledrejection` handlers** call
   `engine.offerRecovery()`, which shows a bar rather than taking over: an error
   thrown later does not prove the stage is unplayable, and destroying a puzzle
   a player is halfway through would be the worse failure. Repeats fold into one
   bar per stage.
3. **`boot()` is wrapped.** If the engine never starts there is nothing to ask,
   so `boot()` writes its own "RULESET did not start" card with an offer to
   clear a possibly-damaged save.

`recovery.css` carries the bar and the card. `state.js`'s `migrate()` and
`vault.js`'s `migrate()` both trust nothing: a corrupt or partial save degrades
to a usable default rather than throwing, and `progress-tests.mjs` asserts that
across corrupt, hostile and ancient save files.

`tests.html` asserts the middle layer directly: an uncaught error offers a
`.recovery-bar`, it does **not** destroy the stage the player is in the middle
of, and repeated errors fold into a single bar.

*(to fill in)* Confirmed by deliberate fault injection at the boot layer:

---

## 11. Sign-off *(to fill in)*

| Area | Auditor | Date | Verdict |
|---|---|---|---|
| Documentation | | 2026-08-12 | complete — see §12 |
| Gameplay / progression | | | |
| ECHO invariants | | | |
| Mobile / viewport | | | |
| Browser compatibility | | | |
| Security | | | |
| Performance | | | |

---

## 12. Documentation audit — what changed

| Document | Verdict | Change |
|---|---|---|
| `README.md` | Materially wrong | Said "30 handcrafted levels" and "Season II (16–45, 15 built)". Rewritten for 75 stages / 45 levels / 30 Breaks; assertion count corrected 399 → 537; the four test commands documented and verified; `ctx` API brought up to date (rotate, magnet, claim, letters, reorder, editable, scalable, duplicable, combine, escapable, state helpers); experimental features given their own section. |
| `docs/BREAK_LEVELS.md` | Materially wrong | Full rewrite from the shipped `setup()` of all thirty. **Thirteen entries deviated** from the specification the file was written against — B07, B12, B13, B14, B15, B17, B19, B21, B22, B23, B24, B25 and B30 — and each now carries an explicit `Differs from spec:` line. B13, B19 and B21 were the known three; the other ten were found by this audit. |
| `docs/VAULT_SPEC.md` | Mostly right, one API error | `RULESET_VAULT.open()/.close()/.toggle()` were documented but never exported; corrected, and `item()`/`saveNow()` added. Unlock mechanism (`solved` contains `'B03'`) spelled out. The "Verified" list marked as inherited, not re-run. |
| `docs/ECHO_SPEC.md` | Right on every invariant, wrong on two details | All canonical invariants confirmed against `echo.js`, including the grid table character-for-character. Fixed: Echo Memory schema is **v4**, not v3. Fixed: level metadata block listed a `validate` hook that does not exist. Added: `tether()`/`wall()` to the UI list, a section on level 45's three acts, and the skip-does-not-bank rule. |
| `docs/PUZZLE_CONTRACT.md` | Right, incomplete | Rule 3 annotated with the two shipped `Math.random()` exceptions; rule 5 updated to say its known violation was never fixed. Scope stated as all 75 stages. |
| `docs/PUZZLE_DNA.md` | Right but unscoped | Scoped as a Season I historical audit; its two unimplemented recommendations called out as still unimplemented. |
| `docs/FUTURE_MECHANICS.md` | Aspirational, unlabelled | Now carries a prominent wish-list warning, plus a note on which of its prerequisite capabilities have since been built. |
| `docs/RELEASE_AUDIT.md` | New | This file. |
| `docs/PRODUCTION_CHECKLIST.md` | New | The blocking release items. |
