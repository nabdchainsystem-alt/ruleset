# THE PUZZLE CONTRACT

Fifteen rules. They are not aspirations — a level that breaks one does not
ship. Each rule below is written as a test you can actually run against a
draft, because a rule you cannot check is a rule you will violate by accident.

The contract exists to protect one feeling:

> **"Wait — I can do that?"** followed immediately by **"…of course."**

If the second half does not arrive, the level is a trick, not a puzzle. Every
rule here is a way of guaranteeing the second half.

---

## 1. Every puzzle has a logical solution

**Check:** write the solution as a sentence beginning "because". If you cannot
finish the sentence without saying "just because" or "you have to try it", the
level fails.

*Good:* "Dragging `end` onto the dot solves it **because** the instruction says
reach the end, and the word `end` is the only thing in the level that is
actually named 'end'."

---

## 2. The player must have enough information to infer the solution

Everything needed must be on screen **before** the player needs it — not
revealed by the attempt.

**Check:** screenshot the level at t=0. Cover the hint button. Could a careful
stranger deduce the solution from that image plus the mechanics they have
already been taught? If it needs one frame of "try something and see", fail.

The corollary: **prove the wrong route is wrong.** Level 1's door retreats to
the furthest corner; level 4's click cooldown makes ten clicks arithmetically
impossible in the reset window. Both *demonstrate* impossibility rather than
merely being difficult. Frustration is not information.

---

## 3. Surprise is good. Randomness is bad

No `Math.random()` in puzzle logic, ever. Two players on the same level see the
same thing; the same player on a restart sees the same thing.

**Check:** does `restart` reproduce the level exactly? If a level's difficulty
varies run to run, it is a slot machine.

Timing that the player controls is not randomness. Timing they cannot predict
is.

---

## 4. Never require obscure browser knowledge the game has not taught

A player may be expected to know a browser zooms. They may not be expected to
know about `visualViewport`, devtools, or a keyboard shortcut you have never
shown them.

**Check:** name the outside knowledge the level assumes. Is it something a
non-technical adult uses weekly? If not, an earlier level must teach it, or a
hint must name it outright.

Level 6 names `⌘/Ctrl +` in its own hint precisely because "you can zoom" is
common knowledge but "zoom changes the CSS viewport width" is not.

---

## 5. Never repeat the exact same trick

**Check:** for every earlier level, complete this sentence: "this differs from
level N because ___". If the only difference is the noun, it is a repeat.

The known violation is documented in `PUZZLE_DNA.md`: level 15's third latch is
level 10's trick with nothing added. Do not add a fourth.

---

## 6. Reuse a mechanic only when combined with something new

Reuse is not merely permitted, it is how the game builds a language. But a
reused verb must appear in a new **grammatical role**.

The word verb across levels 1, 3, 9 and 15 is the reference implementation:

| Level | Same verb | New role |
|---|---|---|
| 1 | move a word | carry it *to* a target |
| 3 | move a word | remove it, and the world recolours |
| 9 | move a word | remove it, and the arithmetic changes |
| 15 | move a word | remove it, and a permission inverts |

**Check:** which mechanic does this reuse, and what is the new role? Two
answers required.

---

## 7. Difficulty comes from reasoning, not pixel hunting

**Check:** could a player who has understood the solution execute it in under
ten seconds? If understanding is instant but execution is fiddly, the level is
an obstacle course.

Corollary: hit targets get generous padding. `ctx.hits(a, b, -10)` requiring
deep overlap is for *validating* an idea, not for taxing a hand.

---

## 8. No invisible clickable areas

Everything interactive carries a visible affordance from the shared vocabulary:

| Look | Meaning |
|---|---|
| blue word, dotted underline | you can pick this word up |
| dotted outline on hover | you can drag this object |
| blue corner notch | you can resize this |
| blue handle on a stalk | you can rotate this |
| dashed rectangle | something belongs here |
| dashed tray at the bottom | drop here to remove |
| a control that visibly changes on level load | this level has taken it over |

**Check:** list every interactive element and name its affordance. Any element
without one fails. A new affordance may be added to the vocabulary, but it must
then be used consistently everywhere.

The rule is: **the possibility is visible, the idea is not.** Discovering that
dragging exists is a trick. Working out *what* to drag and *why* is a puzzle.

---

## 9. No solutions based purely on guessing

**Check:** how many distinguishable actions could a player try? If the answer
is "many, and only one works, with nothing to narrow it", it is a lottery.

A password is acceptable **only** when it is readable somewhere (level 7 renders
it at 3px; level 13 hides it in the background colour). Never make the player
guess a string that is not present.

---

## 10. Hints preserve the "aha"

Three stages, and each has a job:

1. **Conceptual** — name the wrong assumption. Never the mechanic.
   *"The door is faster than you. Nothing says the door is 'the end'."*
2. **Mechanic** — name the surface. Never the gesture.
   *"The answer is not inside the box. Read the sentence again."*
3. **Near-solution** — name the gesture.
   *"The underlined word in the instruction can be picked up."*

**Check:** does hint 1 still leave a puzzle? Does hint 3 actually unblock
someone who is stuck? A ladder where stage 1 gives it away, or stage 3 leaves
them lost, is not a ladder.

Hints are counted per level in the ledger. A level whose players routinely
reach stage 3 is under-signposted; that is data, not shame.

---

## 11. The game may lie in wording. The rules must stay consistent

`You cannot finish.` is a lie. It is *permitted* to be a lie because the game's
underlying machinery honours it exactly: while the word `cannot` is present the
button genuinely refuses.

**Check:** does the system behave exactly as the text claims, right up to the
moment the player edits the text? If the text says one thing and the code does
another *before* the player intervenes, that is a bug wearing a puzzle's hat.

---

## 12. Every interaction teaches something about the world

**Check:** what does a *failed* attempt tell the player? If failure teaches
nothing, the level is a wall.

Level 3 narrates the world state after every change (`the button is red` →
`nothing is red`). Level 15 names which latch is unsatisfied. Level 4 shows the
counter resetting so the player learns *what* is fighting them.

---

## 13. The interface is part of the world

Any chrome may become a puzzle surface — but only by **declaration**:

```js
globalElementsAllowed: ['progress']
```

`ctx.claim()` refuses anything undeclared. This is a promise to the player as
much as an engineering guard: a control behaves oddly only on levels that have
announced it, and it is restored the moment the level ends. Chrome that might
change at any time is not a puzzle surface, it is an unreliable interface.

---

## 14. A solution is explainable in one sentence

**Check:** write it. One sentence, no semicolons, no "and then".

*"Remove the word `red` and nothing is red any more."*
*"Delete three words so the sentence's count matches its claim."*

If it needs two sentences, the level is two puzzles and should probably be two
levels — or one of the steps is busywork.

---

## 15. The best puzzles change how the player reads every later level

This is the one that cannot be mechanically checked, and it is the one that
matters most.

**Check:** after solving this, what will the player look at differently on the
*next* level? If the answer is "nothing", the level is a diversion — pleasant,
maybe, but it does not advance the language.

Level 10 is the model: after it, players check the top of the screen forever.

---

## Applying the contract to a draft

Fill this in before writing any code. If any row is blank, the level is not
ready.

```
Level:
One-sentence solution:                          (rule 14)
Because…:                                       (rule 1)
Assumption it breaks:                           (rule 15)
Everything needed is on screen at t=0:          (rule 2)
The wrong route is provably wrong because:      (rule 2)
Mechanic reused / its new role:                 (rule 6)
Differs from level N because:                   (rule 5)
Affordance for each interactive element:        (rule 8)
Hint ladder — concept / surface / gesture:      (rule 10)
Chrome declared:                                (rule 13)
What a failed attempt teaches:                  (rule 12)
What the player reads differently afterwards:   (rule 15)
```
