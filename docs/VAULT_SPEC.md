# The Vault — specification

## Why it exists

RULESET asks the player to hold a lot in their head at once. By Season II they
are tracking eight tokens, a ring, a grid, a shifting phase, and thirty
interleaved Break levels designed specifically to make them **lose the thread**
and find it again. The Break levels succeed only if forgetting is possible; a
player who has written nothing down forgets everything, and a player forced to
keep a spreadsheet outside the game has left the game.

So the game offers a place to write things down, and offers nothing else.

The Vault is a notebook. It observes nothing, concludes nothing, and is never
required. Its entire value is that it belongs to the player — which means the
moment it starts being clever, it stops being theirs.

## The one sentence it ever says

On first open, and never again:

> Nothing is saved automatically.
> Keep what YOU think matters.

That is the whole tutorial. Everything else the player discovers by using it.

## Unlock

The Vault appears after **B03** — the third Break level, roughly five stages
into Season II. That timing is deliberate:

- **Not earlier.** Season I is fifteen levels of "the interface is the puzzle".
  A notebook offered during that stretch is noise; there is nothing to record
  but a single rule per level, and offering a place to record it implies the
  levels are harder than they are.
- **Not later.** B03 is the point at which the player has met ECHO twice
  (levels 16, 17) and then been pulled away from it three times. That is the
  first moment where "wait, what were those words again?" is a real feeling.
  The notebook should already exist when the feeling arrives.

Before B03 the icon does not exist in the DOM at all. `RULESET_VAULT.unlocked()`
returns `false`, and the module sits inert.

## What lives in it

One array of items, three kinds, plus connections between them.

| Kind | What it holds | Who writes it |
|------|---------------|---------------|
| `note` | title, body, tags | entirely the player |
| `pin`  | a fragment of text captured from the screen, plus the player's own note on it | text from the page, meaning from the player |
| `rule` | left · relation · right · confidence · note | entirely the player |

`link` records a connection between any two items. It carries no meaning — it
means whatever the player meant.

Every item remembers the stage it was written on, so the player can filter by
"things I thought during that level" without having to label anything.

### Confidence, not correctness

A rule carries one of `question` / `likely` / `certain`. This is the player's
confidence, and the game never touches it. The Vault will not raise a rule to
`certain` when the player gets it right, will not mark one wrong, and will not
warn about a contradiction.

This is why nothing in `vault.css` uses `--good`. Green means *correct*
everywhere else in RULESET; a `CERTAIN` rule rendered in green would be the
game nodding along. It renders in the accent instead — the colour of *the
player's own marks*, not of a verdict.

## Capture

Capture is the one place the Vault touches the game, so it is deliberately the
narrowest thing in the file.

Pressing **Capture** dims the panel, crosshairs the cursor, and lets the player
click any element matching a fixed whitelist: the instruction line and its
words, the level name and counter, ECHO tokens/chips/cells/tiles, and generic
labels (`.gbtn`, `.keycap`, `.bignum`, `.readout`, `.chip`, `.status`). Clicking
stores `element.textContent`, trimmed to 240 characters. Then capture mode ends.

What capture stores: **the visible text, and nothing else.** Not `dataset`, not
element ids, not classes, not engine state, not the level object, not the
solution. If the player can read it on screen, it can be kept. If they cannot,
it cannot.

Excluded entirely (`NEVER`): the Vault itself, the dev panel, the lab, the live
co-op strip, and the capture bar. The Vault cannot capture itself, and the
player cannot pin the dev tools into a save file.

ECHO elements are on the whitelist, and that is not a contradiction of
constraint 1 below. Capturing a token the player is already looking at is them
copying their own observation into their own notebook — which is the entire
point of a notebook. What is forbidden is the Vault deciding on its own that a
mark is worth keeping, or storing anything about a mark beyond the glyph the
player can already see. Since capture stores only `textContent`, a pin can
never contain more than the screen was already showing.

## What it will never do

These are constraints, not current limitations. They should survive every
future change to this file.

The Vault must never:

1. **Auto-capture Echo Marks.** A mark is found by looking, and the looking is
   the puzzle. The Vault has no access to `echoMemory` and never asks for one —
   a player who writes "VE = MOVE" into a rule card is a player who worked it
   out. (Verified: the string `echoMemory` does not appear in `vault.js` outside
   this constraint's own comment.)
2. **Decode anything.** No token→index lookup, no phase arithmetic, no checksum
   validation, no ring or grid rendering. It does not import or reference the
   ECHO module at all.
3. **Assign meaning.** It never suggests what a token means, never prefills a
   rule's right-hand side, never autocompletes from the eight tokens.
4. **Validate.** No rule is ever marked right or wrong. Two contradictory rules
   coexist in silence.
5. **Reveal Echo Memory before its intended level.** It cannot; it has no path
   to it.
6. **Be required.** No puzzle's solution depends on the Vault existing, being
   open, or containing anything. Every level is completable with the Vault
   untouched — including by a player who never unlocks it, since a player can
   skip B03.
7. **Show a Break level's route id.** Break stages are identified internally by
   `routeId` (`'B01'`…`'B30'`), which the player must never see. Items store the
   key for filtering but display only `stageName`. The distinction is enforced
   at the one place it matters: `currentStage()` returns `{ key, name }`, and
   only `name` reaches the DOM.

## Storage

The Vault keeps its own localStorage key, `ruleset:vault`. It does **not** live
in `state.js`.

Three reasons, in order of weight:

1. **"Start over" must not erase it.** `State.resetAll()` exists so a player can
   replay the game. Notes are not progress — they are the player's own writing,
   and a button labelled "Start over" promising a fresh run should not silently
   delete a page of handwriting. Separate keys make that guarantee structural
   rather than a thing someone has to remember.
2. **Separation from Echo Memory.** The strongest possible version of "the Vault
   cannot read `echoMemory`" is that the Vault never loads the store that holds
   it. Constraint 1 above is then enforced by the file layout, not by
   discipline.
3. **The v1 save is load-bearing.** `ruleset:v1` is read by `live.js` and four
   ECHO systems, and its top-level v1 fields are consumed directly. Free-form
   player text of unbounded size does not belong in that record.

The schema is versioned and `migrate()` trusts nothing: a corrupt or partial
save degrades to an empty vault rather than throwing. Items with no `id` or no
recognised `kind` are dropped; links pointing at missing items are dropped.

## Behaviour while open

Opening the Vault **pauses the level**: `ctx._frames` and `ctx._checks` are
swapped out for empty arrays and restored on close. A player writing a note
should not lose to a timer, and a physics level should not drift while they
type. Resume is guarded on ctx identity, so if the level changed while the
panel was open the old handlers are discarded rather than reattached to a level
that no longer exists.

`V` toggles the panel once unlocked, except while typing in a field.

## After a stage

The success card grows one quiet line — **Save a thought** — after *every*
completed stage, ECHO and Break alike. It opens the Vault with a new empty note
already attached to the stage just finished.

It appears after every stage on purpose. If it appeared only after ECHO levels,
its presence would itself be a signal — "this one mattered, write it down" —
which is exactly the tell the Break levels exist to destroy.

## Files

- `vault.js` — the whole feature, one IIFE, exposes `window.RULESET_VAULT`
- `vault.css` — panel, cards, capture mode
- Wired in `index.html`; touches no level file

## Public API

Exposed for the dev panel and for tests. Not used by any level.

```js
RULESET_VAULT.unlocked()          // bool
RULESET_VAULT.open() / .close() / .toggle()
RULESET_VAULT.items(kind?)        // newest first
RULESET_VAULT.links()
RULESET_VAULT.add(kind, fields)   // → item
RULESET_VAULT.update(id, fields)
RULESET_VAULT.remove(id)          // also removes its links
RULESET_VAULT.move(id, delta)
RULESET_VAULT.link(a, b) / .unlink(linkId)
RULESET_VAULT.clear()
RULESET_VAULT.data                // the raw store, for assertions
```

## Verified

Driven headlessly against a served build:

- icon absent before B03, present after, and reports `unlocked() === false` first
- notes created, edited, tagged, reordered, deleted
- capture: whitelist hover highlight, one-click pin, exactly the visible text,
  no dataset, mode ends after a single pick
- rules: both sides player-written, default `question`, raised to `certain`,
  and `certain` does not render in `--good`
- links created, deduplicated, removed, and removed with their item
- search and stage/tag filters
- persistence across reload, **and across `State.resetAll()`**
- opening pauses frames and checks; closing restores them
- the store contains no `echoMemory`; the source contains no reference to
  `echoMemory`, the ECHO module, phase arithmetic, or marks
- the level still completes with the Vault untouched
- light, dark, Arabic/RTL, and 430 px wide
