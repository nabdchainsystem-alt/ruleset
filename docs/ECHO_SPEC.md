# ECHO — Season II specification

> **Status: verified against `echo.js`, `echo-ui.js`, `state.js` and `levels.js`
> as shipped.** The invariants in sections 1, 4, 5, 6 and 8 are additionally
> asserted headlessly by `node invariants.mjs` (42 assertions).

Season I taught the player *the interface can be manipulated*.
Season II teaches *information itself can be manipulated*.

The player meets ECHO as a tiny language. Later they discover the same eight
words are also a cipher. Eventually they discover that every level of the
season has been handing them one character of a message the whole time.

**The reveal must never rewrite the past.** A later level may expose a deeper
*use* of a rule; it may never give a token a new meaning. If a proposed change
would alter what an already-shipped level meant, the change is wrong — find a
different reveal.

---

## 1. The eight tokens

Permanent. Both columns are fixed for the life of the game.

| index | token | meaning | grammatical role |
|---|---|---|---|
| 0 | `VE` | MOVE | action |
| 1 | `NA` | THIS / current target | target |
| 2 | `OR` | LEFT | direction |
| 3 | `SE` | RIGHT | direction |
| 4 | `KA` | NOT / negate | modifier |
| 5 | `MI` | ONE | count |
| 6 | `RU` | REPEAT | modifier |
| 7 | `LI` | LIGHT / reveal | action |

The player learns the **meanings** first. The **indices** are a later reveal —
and when they arrive they must feel like a second reading of something already
familiar, not a new rulebook.

## 2. Grammar

```
[KA]? [RU]? ACTION TARGET [DIRECTION]? [COUNT]?
```

```
VE NA           move this
VE NA OR        move this left
VE NA SE        move this right
KA VE NA        do not move this
VE NA MI        move this once
RU VE NA        repeat the previous move
LI NA           reveal this
```

`readPhrase(tokens)` returns `{ ok, negated, repeat, action, target, direction,
count }`. `phraseMatches(tokens, want)` is the shorthand a level validator
should use, so no level re-implements the grammar.

## 3. The Echo Ring

The eight tokens sit at eight fixed positions on a circle, index 0 at the top,
running clockwise. The ring is where **wrapping** becomes visible: step past
`LI` (7) and you are back at `VE` (0). That single fact is what makes the phase
system teachable rather than arbitrary.

`RULESET_ECHO_UI.ring()` renders it, with a marked seam between 7 and 0 and a
`wrap()` flash for teaching the moment of wrapping.

## 4. The Echo Grid

A fixed 8×8 of 64 unique characters, row-major:

```
row 0   A B C D E F G H
row 1   I J K L M N O P
row 2   Q R S T U V W X
row 3   Y Z 0 1 2 3 4 5
row 4   6 7 8 9 ␣ . , !
row 5   ? - : ; + / ( )
row 6   [ ] { } < > @ #
row 7   % & * _ = ' " $
```

A **normalised token pair** `[row, column]` selects one character.

```
VE RU  →  row 0, column 6  →  G
```

Every character appears exactly once, so the mapping is a bijection and every
character round-trips. Lower-case input is folded to upper-case on encode;
anything not on the grid is an error, never a silent substitution.

## 5. Phase

```
encoded    = (normalised + phase) mod 8
normalised = (encoded - phase + 8) mod 8
```

In a full message the **first token is the phase, written literally**. It
cannot itself be shifted — it is the key to everything after it.

```
PHASE  PAYLOAD…  [CHECKSUM]
```

`SE` as the first token means phase 3. The payload that follows is read in
pairs, after normalising each token.

## 6. Implicit level phase

```
levelPhase(id) = (id - 16) mod 8
```

Level 16 is phase 0, level 23 is phase 7, level 24 is phase 0 again. Support
exists from the start; the *teaching* of it belongs to whichever level earns it.

## 7. Checksum

```
checksum = sum(normalised payload indices) mod 8
```

Expressed as one token, and phase-shifted like the payload when written.

It is computed over **normalised** indices deliberately: that makes a message's
checksum independent of its phase, which is the only reason a player can use it
to test a guessed phase. Had it been computed over encoded indices it would
verify nothing a player could act on.

## 8. Echo Marks

Every level from **16 to 44** carries one mark: exactly two tokens, no phase
prefix, with the phase implied by the level number.

- rendered by the engine, not by levels, into `#echoMark` in the bottom bar —
  so its position can never drift from level to level
- pinned `dir="ltr"`: a mark is an ordered `[row, column]` pair, not prose, and
  RTL would reverse the two tokens
- inert: no listeners, no focus, not a button
- noticeable through *repetition*, never through pixel hunting
- banked into Echo Memory automatically **on solve**. **Skip does not bank it** —
  the mark is the reward for finishing. Coming back and solving fills the gap,
  because `remember()` is idempotent.

**Break stages carry no mark and have no canonical id.** They are interleaved
between ECHO levels by `route.js` and take no part in phase arithmetic; level
35's phase is 3 because it is level 35, even though it is the 53rd of 75 stages
played. See `BREAK_LEVELS.md`.

`encodeEchoMark(char, levelId)` / `decodeEchoMark(tokens, levelId)`.

The 29 marks spell one message across the season. Levels 16–44 carry it; level
45 is where it gets used. The mapping lives in `levels.js` as `echoMarkChar`
and is **never displayed** — including on the success card, in hints, or in any
production surface. The Lab decodes marks; production does not.

> **This is not secrecy.** Every byte ships to the browser and a determined
> player can read the source. "Hidden" throughout this document means *not
> surfaced in the UI*. It is a design boundary, not a security claim, and no
> puzzle should ever depend on the player being unable to look.

## 9. Echo Memory

`state.js` holds `echoMemory: [{ levelId, tokens, phase, at }]` under the
localStorage key `ruleset:v1`, at **schema version 4**, migrating forward from
any earlier save. `migrate()` trusts nothing: the v1 fields (`unlocked`,
`solved`, `theme`, `lang`) stay at the top level because `live.js` and several
ECHO systems read them directly, and malformed rows are dropped rather than
thrown on.

**Encoded tokens only.** The decoded character is never stored, so reading a
mark always costs the player the same act of decoding — whether they do it on
the day or a month later at the Memory Wall.

`remember()` is idempotent: replaying a level updates its entry rather than
duplicating it. `resetEcho()` clears Season II without touching Season I.

The consequence that matters: **the player never needs a screenshot or a
notebook.** RULESET remembers everything the final puzzle requires. Any level
that would require external note-taking is a design failure.

## 10. Level metadata

The fields actually present on a Season II level object:

```js
{
  id,                              // 16…45, canonical. Feeds phase and marks.
  day,                             // 1…30, the in-fiction day number
  name,                            // { en, ar }
  instruction,                     // string or { en, ar }
  hint, hint2, hint3, note,        // as Season I
  introducedToken,                 // 'MI'      (only on the level that adds one)
  mechanicIntroduced,              // 'echoToken'
  mechanicsRequired,               // ['dragObject', …]
  cipherCapabilitiesRequired,      // ['phase', 'grid', 'ring', …]
  globalElementsAllowed,           // ['progress'] — required before ctx.claim()
  echoMarkChar,                    // one grid character — never displayed
  setup, cleanup
}
```

There is **no `validate` hook**; a level validates through `ctx.check()` inside
`setup`. `setup(ctx)` remains the escape hatch and remains first-class. Metadata
describes a level; it does not constrain it.

## 11. Fairness

Inherited whole from `PUZZLE_CONTRACT.md`, with three Season II additions:

1. **A token means one thing forever.** New uses are allowed; new meanings are not.
2. **Every reveal must make earlier levels *more* logical.** If a reveal makes a
   past level feel retroactively arbitrary, it is the wrong reveal.
3. **No external memory.** No screenshots, no notes, no second device.

## 12. API

```js
const E = window.RULESET_ECHO;

E.TOKENS  E.MEANING  E.ROLE  E.GRID  E.SIZE

E.indexOf(token)            E.tokenAt(index)
E.parse(str|array)          E.format(tokens)
E.shiftToken(t, phase)      E.normalizeToken(t, phase)
E.levelPhase(levelId)

E.characterToTokens(ch)     // → normalised [row, col]
E.tokensToCharacter(r, c)   // → character
E.locate(ch)                // → { index, row, col }

E.encodeText(text, phase, { checksum })
E.decodeText(tokens, { checksum })   // never throws; returns { ok, reason, … }
E.calculateChecksum(normalised)      E.verifyChecksum(tokens)
E.encodeEchoMark(ch, levelId)        E.decodeEchoMark(tokens, levelId)
E.readPhrase(tokens)                 E.phraseMatches(tokens, want)
```

`decodeText` never throws — a malformed message is a puzzle state, not a crash,
so a level can show the player *why* it will not read.

Interface pieces in `RULESET_ECHO_UI`: `ring()`, `grid()`, `strip()`,
`tether()` and `wall()` — the last is the Memory Wall the finale is built on.
Each returns an object with `destroy()`; hand it to `ctx.own()`.

## 13. The finale, level 45

Three acts, and no new mechanic in any of them.

1. **Sort.** The 29 banked marks are shown out of order on the Memory Wall. The
   player drags them; once the first three are in true level order a
   `CONTINUE THE ORDER` button appears and finishes the job. Sorting 29 tiles by
   hand is labour, not understanding.
2. **Normalise.** `NORMALISE` reveals one character at a time by normalising its
   pair against `levelPhase(levelId)`. After four, `NORMALISE ALL` appears and
   runs the rest. The line spells `YOU BUILT THE KEY. USE IT NOW`.
3. **The lock.** Eight shuffled tiles must be placed in the order
   `VE NA OR SE KA MI RU LI`. The comparison is written against `E.TOKENS`
   itself, so the lock can never drift apart from the language —
   `invariants.mjs` asserts that the source still reads
   `placed.join(' ') !== E.TOKENS.join(' ')`.

Level 45 carries **no** `echoMarkChar`: the message ends at 44.

If fewer than 29 marks are banked the level says so (`n / 29`, "the wall is
incomplete") instead of faking it. A `dev: fill memory` button appears **only
when the dev panel is open**, so the finale is testable without being cheatable.

## 14. Developer tools

Puzzle Lab → **echo** tab: ring inspector, grid inspector, encode, decode,
phase selector, checksum toggle, memory viewer, add/remove marks, decode a mark
by level, reset Season II. Backtick or `?dev=1`; no production entry point.
