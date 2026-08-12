# RULESET — Production Checklist

Every box here is **blocking**. If one cannot be ticked, the release does not
go out — or the item moves to "Unresolved non-blockers" in `RELEASE_AUDIT.md`
with a written reason, signed by whoever made that call.

Boxes are left unchecked on purpose. Tick them as they are verified, and record
the evidence in `RELEASE_AUDIT.md` rather than in this file.

**Release:** 1.0.0 · **Target date:** ______ · **Owner:** ______

---

## 1. Tests green

- [ ] `node invariants.mjs` — exits 0, prints "42 assertions, all green"
- [ ] `node invariants.mjs` prints the message as exactly `YOU BUILT THE KEY. USE IT NOW`
- [ ] `node invariants.mjs` prints "level 35: phase 3 at play position 53 of 75"
- [ ] `node progress-tests.mjs` — exits 0, all green
- [ ] `node progress-tests.mjs` reports 75 stages · 30 string keys · 45 number keys
- [ ] `node coop-tests.mjs` — exits 0, all green
- [ ] `node browser-tests.mjs` — exits 0 for **chromium**, **webkit** and **firefox**
- [ ] `tests.html` — `document.title === 'PASS'`, 0 failures
- [ ] `sea-tests.html` — `document.title === 'PASS'`, 0 failures
- [ ] Every suite was run against the **final** commit, not an earlier one
- [ ] Assertion counts in `README.md` and `RELEASE_AUDIT.md` match what the
      suites actually print at the lock

## 2. Progression intact

- [ ] The route builds 75 stages, in order, with no `route: not built yet →`
      warning in the console
- [ ] Season I plays first, 1 → 15, then the interleaved Season II route
- [ ] Level 45 is the last stage played
- [ ] Every one of the 75 stages can be reached by normal play (no dead ends)
- [ ] **Every Break puzzle B01–B30 has been solved by hand at least once** —
      automated coverage does not exist for any of them, and B15–B30 are not
      even instantiated by the sweep (see `RELEASE_AUDIT.md` §2)
- [ ] Every Break puzzle can be restarted and re-solved
- [ ] Every stage's three hints appear, in order, and hint 3 actually unblocks
- [ ] **Skip** advances from every stage, including the last one
- [ ] **Skip** does not bank the stage's Echo Mark, and returning to solve it
      fills the gap
- [ ] **Restart** rebuilds the current stage cleanly, with no leaked elements,
      listeners, timers or animation frames
- [ ] The success card shows the stage's `note`, and the Vault's "Save a thought"
      line, after every stage type

## 3. Save / load

- [ ] A fresh browser with no `ruleset:v1` key boots to level 1
- [ ] Progress survives a reload
- [ ] Progress survives a browser restart
- [ ] A **v1-era save** still migrates forward to schema 4 without data loss
- [ ] A corrupt, truncated or hostile `ruleset:v1` value does **not** throw on
      boot — it degrades to a usable default
- [ ] Break stages are saved under their **string** `routeId`; ECHO and Season I
      under their **number** id; no row is ever keyed `"undefined"`
- [ ] **Start over** wipes progress and returns to level 1, on a double click
      within 3s
- [ ] **Start over** does **not** erase the Vault (`ruleset:vault` is a separate
      key, deliberately)
- [ ] Theme and language choices persist independently of progress
- [ ] The game still runs with `localStorage` unavailable or full (private
      window) rather than showing a blank screen

## 4. Mobile layout

- [ ] Playable end to end on a real iPhone (Safari)
- [ ] Playable end to end on a real Android phone (Chrome)
- [ ] No horizontal overflow at 320, 375, 390 and 430 CSS px
- [ ] The stages that compute their own geometry are checked at 375 **and** 430:
      B09, B10, B12, B16, B26, B30, and the 29-tile Memory Wall in level 45
- [ ] Every draggable carries `touch-action: none`; no drag fights the page scroll
- [ ] No hover-only or right-click-only path anywhere
- [ ] B18's touch-point proxy is draggable on touch (there is no cursor to trail)
- [ ] Hint, Restart, Skip, language and theme are all reachable on the smallest
      supported width
- [ ] Pinch-to-zoom still works — level 6 and level 7 depend on it, which is why
      `user-scalable=yes, maximum-scale=10` is in the viewport meta and must stay
- [ ] Nothing is clipped behind a notch or home indicator (`viewport-fit=cover`)

## 5. ECHO invariants

- [ ] Tokens are `VE=0 NA=1 OR=2 SE=3 KA=4 MI=5 RU=6 LI=7`
- [ ] The Echo Grid is 8×8, 64 characters, every one unique
- [ ] `levelPhase(id) === (id − 16) mod 8` for every level 16–45
- [ ] Phase is derived from the **canonical level id** and never from play
      position — level 35 is phase 3 at play position 53
- [ ] Exactly **29** Echo Marks, on levels 16–44, none doubled
- [ ] The marks spell `YOU BUILT THE KEY. USE IT NOW` in level order
- [ ] The marks survive an `encodeEchoMark` → `decodeEchoMark` round trip
- [ ] **No Break stage has a canonical id, an Echo Mark, or any part in phase
      arithmetic** — stripping all thirty from the route leaves 16…45 ascending
- [ ] Level 45 carries no mark; the message ends at 44
- [ ] The Echo Mark renders `dir="ltr"` in Arabic — it is a `[row, column]` pair,
      not prose
- [ ] Echo Memory stores **encoded** tokens only; the decoded character is never
      persisted
- [ ] `remember()` is idempotent — replaying a level updates its entry rather
      than duplicating it

## 6. Level 45

- [ ] Reachable by normal play with 29/29 marks banked through genuine solving
- [ ] With fewer than 29 marks it says `n / 29` and "the wall is incomplete"
      rather than faking or crashing
- [ ] The `dev: fill memory` button appears **only** when the dev panel is open
- [ ] Act one: dragging marks reorders them; `CONTINUE THE ORDER` appears after
      the first three are correct and finishes the sort
- [ ] Act two: `NORMALISE` reveals one character; `NORMALISE ALL` appears after
      four and runs the rest; the line reads `YOU BUILT THE KEY. USE IT NOW`
- [ ] Act three: the lock accepts **only** `VE NA OR SE KA MI RU LI`
- [ ] The lock compares against `E.TOKENS` itself, so it cannot drift from the
      language (asserted by `invariants.mjs`)
- [ ] The finale card and "play again" behave correctly on the last stage
- [ ] Level 45 works in Arabic

## 7. The Vault does not leak ECHO internals

- [ ] `vault.js` contains **zero** references to `RULESET_ECHO`, `levelPhase`,
      `characterToTokens`, checksum logic or `echoMarkChar`
- [ ] The only occurrence of `echoMemory` in `vault.js` is the comment stating
      the constraint
- [ ] The Vault stores nothing beyond `textContent` — no `dataset`, no ids, no
      classes, no engine state, no level object, no solution
- [ ] Capture is whitelist-only, and the `NEVER` list still excludes the Vault
      itself, `#dev`, `.lab`, `.rs-live` and the capture bar
- [ ] **No Break `routeId` is ever displayed.** Items keep `stageKey` for
      filtering and render only `stageName`
- [ ] No rule is ever marked right or wrong; `CERTAIN` does not render in
      `--good` (green means *correct* everywhere else in the game)
- [ ] Nothing in the game requires the Vault to exist, be open, or contain
      anything — including for a player who skipped B03 and never unlocked it
- [ ] The Vault icon does not exist in the DOM before B03 is banked
- [ ] Opening the Vault pauses `ctx._frames` and `ctx._checks`; closing restores
      them; changing stage while open discards the stale handlers

## 8. No exposed secrets

- [ ] No credentials, API keys, tokens or private keys anywhere in the repo
- [ ] No `.env` file, and nothing credential-shaped is committed
- [ ] The co-op hub is understood to be unauthenticated LAN-only, and is not
      deployed (`server.mjs` and `live.js` are in `.vercelignore`)
- [ ] `.vercelignore` still excludes the answer key: `tests.html`,
      `sea-tests.html`, `*-tests.mjs`, `invariants.mjs`, `docs/`, `README.md`,
      `output/`
- [ ] `output/pdf/` — which contains the full spoiler ledger and the hidden
      sentence in plain text — is excluded
- [ ] `browser-tests.mjs`'s 404 checks pass against the production-shaped serve
- [ ] It is understood and accepted that the cipher itself is public — it ships
      to the client and always will. "Hidden" means *not surfaced in the UI*,
      never a security claim.

## 9. No blank-screen crashes

- [ ] A stage whose `setup()` throws shows the recovery card, not a blank board
- [ ] An error thrown later shows a `.recovery-bar` and does **not** destroy the
      stage the player is in the middle of
- [ ] Repeated errors fold into a single bar
- [ ] A failure in `boot()` itself writes the "RULESET did not start" card with
      an offer to clear a damaged save
- [ ] **Zero console errors** on a full playthrough, in all three engines
- [ ] Every one of the 75 stages sets up and tears down without an error —
      including `B15`–`B30`, which the automated sweep does not reach
- [ ] Loading a stage, switching language, and loading it again leaks nothing
- [ ] `?level=N` with a nonsense N does not break the game

## 10. Production build

- [ ] `vercel.json` headers are live on the deployed site — verified with
      `curl -I`, not assumed
- [ ] The CSP is enforced and the game works under it: no inline scripts, no
      external requests, no CSP violations in the console
- [ ] `Cache-Control: public, max-age=0, must-revalidate` is live on `.js`,
      `.css` and `.html`, so a fix reaches players without a hard refresh
- [ ] The deployed file set matches `.vercelignore` — the excluded paths 404
- [ ] The favicon renders (it is a `data:` SVG and must be allowed by `img-src`)
- [ ] The Open Graph / Twitter meta and `theme-color` render correctly when the
      URL is shared
- [ ] `prefers-color-scheme` is honoured on first load, before any saved theme
- [ ] `prefers-reduced-motion` is honoured
- [ ] The site is served over HTTPS

## 11. Routing

- [ ] `index.html` at the root is the game
- [ ] `?level=N` opens **canonical level N**, not the Nth stage played
- [ ] `?level=N` for an out-of-range or non-numeric N falls back safely
- [ ] `?dev=1` opens the dev panel — and it is understood that this is
      client-side and therefore public
- [ ] Backtick / `~` toggles the dev panel; no accidental production entry point
      to the Puzzle Lab exists
- [ ] `V` opens the Vault only once unlocked, and never while typing in a field
- [ ] `global.html` loads and the link from the game's bottom bar works
- [ ] GLOBAL SEA is understood to be an experimental local demo and is labelled
      as such wherever a player could be misled
- [ ] Deep-linking to any stage produces a playable board, not a blank one
- [ ] Opening `index.html` from `file://` still works as pure single player

---

## Final sign-off

- [ ] `RELEASE_AUDIT.md` is complete: every *(to fill in)* section filled, every
      bug either fixed or moved to non-blockers with a reason
- [ ] Every document in `docs/` describes what ships, not what was planned
- [ ] The version in `package.json` is correct
- [ ] The final commit is tagged

**Released by:** ______ **Date:** ______
