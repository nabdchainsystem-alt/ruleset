# FUTURE MECHANICS

> ## ⚠ THIS IS A WISH LIST, NOT SHIPPED BEHAVIOUR
>
> **Nothing in the forty numbered entries below describes a level that exists.**
> This document is a brainstorm of candidate mechanics, kept so that ideas are
> rejected on purpose rather than rediscovered by accident. Do not read it as a
> description of the game, a roadmap, or a commitment.
>
> For what actually ships, read `README.md`, `BREAK_LEVELS.md` and `ECHO_SPEC.md`.
>
> **What has since become real.** The *engine capabilities* several of these
> entries depend on were built during Season II and now exist on `ctx`:
> `rotate`, `letters`, `reorder`, `editable`, `scalable`, `duplicable`,
> `combine`, `escapable`, plus the declared-chrome system (`ctx.claim()` +
> `globalElementsAllowed`) and the persistent store (`give`/`take`/`route`/
> `remember`). A capability existing is **not** the same as a mechanic having
> shipped as a designed level, and this table has not been re-scored against
> them. Where a "Prerequisite" names one of those verbs, assume it is now
> available.
>
> Some entries have also been overtaken by Season II in spirit — #25 *The key*
> is essentially what level 45 became, and #5 *Tether* and #6 *Shadow* are close
> cousins of Break puzzles B11 and B04. They are left in place unedited; this is
> a record of thinking, not a changelog.

Forty candidates. Not level designs — deliberately. Each is a *verb* the game
could learn, with the assumption it attacks and the earlier lesson that makes
it fair.

The **Prerequisite** column is the contract's rule 2 in table form: it names
what the player must already have been taught, or the mechanic is unfair. A
mechanic whose prerequisite has not shipped cannot ship either.

The tiers are a difficulty gradient of *conceptual reach*, not of execution.
Tier 1 manipulates things in the box. Tier 5 manipulates the player.

Choose sparingly. Forty mechanics is not forty levels — the good ones combine,
and the audit's lesson is that a mechanic which cannot be a clause in a later
sentence caps out fast.

---

## TIER 1 — Manipulate objects

| # | Mechanic | Concept | Assumption it breaks | Prerequisite |
|---|---|---|---|---|
| 1 | **Stack** | Objects dropped on each other pile up, and only the top one is clickable | Everything visible is reachable | dragObject |
| 2 | **Weigh** | An object's size determines what it can rest on without breaking through | Size is cosmetic | resizeObject, physics |
| 3 | **Pour** | Dragging a container tips its contents into another | Objects are atomic | dragObject |
| 4 | **Shatter** | An object resized past its limit breaks into pieces you must use separately | Resizing is reversible | resizeObject |
| 5 | **Tether** | Two objects joined by a line; moving one drags the other at a fixed distance | Objects move independently | dragObject |
| 6 | **Shadow** | An object casts a shadow whose shape is the real target, not the object | What you manipulate is what you aim | dragObject, rotateObject |
| 7 | **Rotate to fit** | A shape only enters a slot at the correct angle | Position is the only spatial property | rotateObject |
| 8 | **Overflow** | An object dragged outside the stage keeps existing and can be brought back | The frame clips reality | escapeObject |

---

## TIER 2 — Manipulate instructions

| # | Mechanic | Concept | Assumption it breaks | Prerequisite |
|---|---|---|---|---|
| 9 | **Reorder** | The same words in a different order are a different rule | Word order is presentation | reorderText |
| 10 | **Steal a letter** | Drag one letter out of a word to make a different word | Words are the smallest unit | letters |
| 11 | **Type over** | Edit a word into a word the level never offered | The sentence is a menu of choices | editText |
| 12 | **Swap between sentences** | Move a word from the instruction into a label elsewhere on screen | The instruction is a closed system | dragText |
| 13 | **Grow the number** | A number in the instruction is resized, and the quantity it demands changes | Text describes quantities, it does not set them | scaleText, resizeObject |
| 14 | **Punctuation** | Moving a full stop splits one rule into two, or fuses two into one | Only words carry meaning | reorderText |
| 15 | **Read it backwards** | The instruction is true when read right-to-left, in either language | Reading direction is a display setting | reorderText |
| 16 | **The unwritten word** | A gap in the sentence must be filled from a word collected earlier | You can only remove, never add | crossLevelObject, dragText |

---

## TIER 3 — Manipulate interface

| # | Mechanic | Concept | Assumption it breaks | Prerequisite |
|---|---|---|---|---|
| 17 | **The counter is a number** | The level number is an operand in the level's own arithmetic | Chrome is metadata about the game | manipulateUI |
| 18 | **Hint as object** | The Hint button is dragged into the stage and used as a physical thing | Buttons do, they are not | manipulateUI |
| 19 | **Restart means something else** | Restart advances state instead of resetting it | Restart is a safe action | manipulateUI |
| 20 | **Dark reveals** | Something is legible in exactly one theme | Theme is a preference | manipulateUI, selectText |
| 21 | **Direction is geometry** | Switching language flips the layout, and the flip is the solution | Language is a translation layer | manipulateUI |
| 22 | **Steal the tray** | The discard tray is dragged out of position and used as a container | Chrome stays where it is put | discardObject, manipulateUI |
| 23 | **Two windows** | The same save open twice; an action in one is visible in the other | A page is alone | manipulateUI |
| 24 | **Scroll is a dimension** | The page becomes taller than the viewport and scrolling is the mechanic | The game fits the screen | panWorld |

---

## TIER 4 — Manipulate game state

| # | Mechanic | Concept | Assumption it breaks | Prerequisite |
|---|---|---|---|---|
| 25 | **The key** | An object picked up with no purpose becomes necessary many levels later | Levels are self-contained | crossLevelObject |
| 26 | **Your own answer** | A password typed earlier is the password now, unhinted | The game forgets you | crossLevelObject, selfReference |
| 27 | **Return it** | An object must be carried *back* to an earlier level to unlock this one | Progress is forward-only | crossLevelObject |
| 28 | **The route you took** | A level branches on *which* solution you used for an earlier one | Solutions are equivalent once solved | crossLevelObject |
| 29 | **Restart count** | The number of times you restarted is an operand | Failure leaves no trace | crossLevelObject |
| 30 | **Untaught** | A level is only solvable if you have *not* been shown a particular mechanic | Knowing more is always better | crossLevelObject |
| 31 | **Borrow from the future** | A locked later level lends an object back to an earlier one | You cannot use what you have not reached | crossLevelObject |
| 32 | **The ledger** | A level asks a true question about your own history and checks the answer | The game does not keep records | crossLevelObject |

---

## TIER 5 — Manipulate player expectations

These are the ones that change how every later level reads. They are also the
easiest to get wrong: each is one bad decision away from breaking rule 9
(guessing) or rule 11 (inconsistency). Treat the prerequisite column as a hard
gate.

| # | Mechanic | Concept | Assumption it breaks | Prerequisite |
|---|---|---|---|---|
| 33 | **The level that is already solved** | It opens solved, and the puzzle is working out what you did | Levels start unsolved | selfReference |
| 34 | **Do it wrong** | The level is completed by satisfying its failure condition | The stated goal is the goal | removeText, selfReference |
| 35 | **The honest instruction** | After many lying levels, one that means precisely what it says | The instruction is always a trap | removeText, selfReference |
| 36 | **Nothing is interactive** | Every affordance is a decoy; the answer is the one unmarked thing | Affordances are exhaustive | manipulateUI — *and see the warning below* |
| 37 | **The mechanic you refused** | Solvable only with a verb the player has been offered but never needed | Every taught mechanic gets used when introduced | crossLevelObject |
| 38 | **Erase to advance** | The only way through is to deliberately use Start over | Destroying progress is never a move | manipulateUI, crossLevelObject |
| 39 | **The instruction you wrote** | A word the player typed in an earlier level becomes this level's rule | The game writes the rules | editText, crossLevelObject |
| 40 | **Playback** | The level replays your own earlier inputs against you, and you must break the loop | You act on the game, not the reverse | crossLevelObject, wait |

---

## Warnings on specific entries

**#36 (Nothing is interactive)** directly attacks contract rule 8, which
guarantees that affordances are honest. Shipping it would retroactively make
every affordance in the game untrustworthy — the exact "how was I supposed to
know" failure the contract exists to prevent. **Recommend cutting it.** It is
listed because it is the obvious idea in this space and it should be
explicitly rejected rather than rediscovered later.

**#23 (Two windows)** requires state shared between two live pages. The store
is already `localStorage`, which fires a `storage` event across tabs, so the
architecture supports it — but a two-window puzzle is unplayable on a phone.
Any level using it needs a single-window fallback or must be optional.

**#30 (Untaught)** is elegant and cruel: it punishes thorough players. It also
conflicts with the Puzzle Lab's ability to grant mechanics freely. Ship only
if the level is optional.

**#25, #26, #27, #31** are the four that justify the persistent-state
architecture. If none of them ship, the inventory and ledger are dead weight
and should be deleted rather than carried.

---

## Choosing

The audit's finding was that mechanics which **cannot be a clause in a later
sentence** cap out quickly — levels 5 and 8 are complete thoughts that
terminate, and two out of fifteen is near the ceiling.

Judged that way, the highest-value entries here are the ones that compose:
**#9 reorder**, **#10 steal a letter**, **#16 the unwritten word**,
**#17 the counter is a number**, and **#25 the key**. Each can be a clause of
something larger later.

The most *dangerous* are tier 5, which are best used once each, late, and never
in adjacent levels.
