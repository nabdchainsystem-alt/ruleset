# PUZZLE DNA — audit of levels 1–15

> **Scope: Season I only.** This is a historical design audit of levels 1–15,
> written before the capability refactor and before Season II or the Break
> puzzles existed. It is preserved as-is because its findings are still the
> reasoning behind the current architecture — it is **not** a description of the
> shipped 75-stage game.
>
> Two things in it were recommendations at the time and were **not** acted on,
> and are still true of the shipping build:
>
> - **Level 15's third latch is still level 10's trick.** The "replace latch 3
>   with a different chrome element" recommendation in cross-cutting finding 2
>   was not implemented. Both levels declare `globalElementsAllowed: ['progress']`.
> - **Level 14 was not cut or rebuilt.** It ships as described here.
>
> Where this document says "the set" or "the fifteen", it means Season I.

Written before the capability refactor, so it describes what exists rather than
what we wish existed. Scores are 1–10 and deliberately unflattering: an audit
that says everything is an 8 is worth nothing.

**Difficulty** — how long a competent player stays stuck.
**Surprise** — the size of the "wait, I can do that?" spike.
**Satisfaction** — whether "of course" arrives immediately after the surprise.

Difficulty is not a quality axis. Surprise and satisfaction are, and so is
reusability, which asks: can a later level *build a sentence* with this word?

---

## Scoreboard

| # | Level | Mechanic | Diff | Surp | Sat | Reusable |
|---|---|---|---|---|---|---|
| 1 | Reach the end | drag a word to a target | 3 | 9 | 9 | high |
| 2 | Bigger | resize (font) | 2 | 8 | 8 | high |
| 3 | Red | remove a word → world changes | 4 | 9 | 10 | very high |
| 4 | Ten | discard a mechanism object | 4 | 7 | 8 | high |
| 5 | Still | withhold input | 2 | 7 | 6 | low |
| 6 | Narrower | resize the browser viewport | 5 | 9 | 7 | medium |
| 7 | Fine print | browser zoom | 4 | 8 | 8 | medium |
| 8 | Both | simultaneous input | 3 | 6 | 6 | low |
| 9 | Self-report | remove words for arithmetic | 7 | 9 | 10 | high |
| 10 | Elsewhere | seize the progress bar | 3 | 10 | 8 | high |
| 11 | Balance | torque (drag + resize) | 6 | 3 | 7 | medium |
| 12 | Remap | the config panel is an object | 5 | 8 | 8 | high |
| 13 | Unprinted | selection reveals hidden text | 4 | 8 | 7 | medium |
| 14 | Off-screen | pan a world larger than the view | 4 | 6 | 6 | none so far |
| 15 | You cannot finish | three-latch composition | 5 | 6 | 8 | finale |

Median surprise 8, median satisfaction 8. The set is strong. The problems are
concentrated in four levels and one repeated trick.

---

## Level by level

### 01 — Reach the end
**Teaches** a word can be picked up and carried to a target.
**Breaks** the assumption that the instruction is a caption describing the
puzzle rather than a component of it.
**Player learns** the thesis of the whole game, in the first thirty seconds.
**Fair** — yes, and specifically because the door *provably* cannot be caught:
it retreats to whichever corner is furthest from the dot, so two or three
attempts falsify the obvious route rather than merely frustrating it.
**Reusable** — the highest-value verb in the game. Everything downstream is
built from it.
**Similar to** 3, 9 and 15, which also move words — but this is the only one
where the word is *carried to* something rather than removed.
**3 / 9 / 9.** The best opening the game could have.

### 02 — Bigger
**Teaches** resize, and that the engine measures pixels rather than meaning.
**Breaks** "bigger" as a numeric comparison.
**Player learns** the game reads the screen literally.
**Fair** — the live `44×76px · 88×76px` readout is what earns this. The player
can see precisely which quantity is being compared, so the solution is
deduction, not guessing.
**Reusable** — high; reappears in 11 and 15 in different roles.
**Similar to** nothing else at this point.
**2 / 8 / 8.**

### 03 — Red
**Teaches** removing a word changes the world the sentence describes.
**Breaks** the assumption that rules are obeyed rather than edited.
**Player learns** instructions are live state — and that a puzzle can have more
than one correct answer.
**Fair** — outstanding. Two words carry the affordance, both work, and the
status line narrates the world's state after every change.
**Reusable** — very high. This is the grammar the late game speaks.
**Similar to** 1, 9, 15.
**4 / 9 / 10.** The best-designed level in the set. The dual solution (delete
`red` so nothing is red; delete `not` so touching red is permitted) is the
clearest possible proof that the engine validates *state*, not gesture. Every
future level should aspire to this property.

### 04 — Ten
**Teaches** a mechanism that opposes you is itself an object you can remove.
**Breaks** the assumption that obstacles must be out-played.
**Player learns** attack the machinery, not the goal.
**Fair** — yes, and rigorously: the 0.4 s click cooldown against the 2 s reset
window makes ten clicks arithmetically impossible, so the player is not merely
failing, they are being shown a proof.
**Reusable** — high.
**Similar to** 3/9/15 in that it uses the discard tray, but this is the first
non-word object thrown away, which is exactly the right way to extend a verb.
**4 / 7 / 8.**

### 05 — Still
**Teaches** that withholding input is an action.
**Breaks** "puzzles are solved by doing something".
**Player learns** the game is watching everything, including inaction.
**Fair** — yes; every disturbance produces immediate visible feedback.
**Reusable** — **low.** It teaches a stance, not a verb. No later level can say
"…and also do nothing" as a component of a larger sentence. It composes with
nothing.
**Similar to** nothing.
**2 / 7 / 6.** The idea is genuinely good and memorable, but the execution has
five seconds of literal dead air, and the "aha" lands in the first two seconds
with nothing to reason about afterwards. It is the best of the weak levels, and
it earns its place on concept alone.

### 06 — Narrower
**Teaches** the browser window is an instrument.
**Breaks** the page/browser boundary.
**Player learns** the machine extends past the document.
**Fair** — **with a real caveat.** This is the only level whose solvability
depends on the player's window-manager state: a full-screen window has no
draggable edge, and the level cannot detect or explain that on its own. Hint 2
now names the problem, but a hint repairing a fairness hole is a patch, not a
design. The dual route (resize *or* zoom) is a genuine strength.
**Reusable** — medium; the viewport is hard to reuse without repeating itself.
**Similar to** 7, which also reaches outside the page, by a different tool.
**5 / 9 / 7.**

### 07 — Fine print
**Teaches** zoom is a tool you bring to the game.
**Breaks** "what is rendered is what is legible".
**Player learns** the browser's own features are in play.
**Fair** — yes, and it has two honest routes: zoom in, or select and copy.
**Reusable** — medium.
**Similar to** 13; see the cross-cutting note below.
**4 / 8 / 8.**

### 08 — Both
**Teaches** you have more input channels than one pointer.
**Breaks** "one pointer, one input".
**Player learns** keyboard and multi-touch are first-class.
**Fair** — yes; the keycaps are printed on the switches.
**Reusable** — **low**, for the same reason as 5: it is an input shape, not a
composable verb.
**Similar to** nothing directly.
**3 / 6 / 6.** The lowest surprise of any level that isn't 11. "Use two fingers
or two keys" is a widely used idea, and the printed keycaps telegraph it hard
enough that most players never experience a moment of not knowing.

### 09 — Self-report
**Teaches** a sentence can be edited until its own claim about itself is true.
**Breaks** the assumption that the sentence *describes* the puzzle rather than
*being* it.
**Player learns** self-reference — the richest vein the game has opened.
**Fair** — outstanding; the count-vs-claim tally makes the arithmetic visible
at every step, so it is deduction all the way down.
**Reusable** — high.
**Similar to** 3 and 15 mechanically (remove a word), but the *reasoning* is
completely different: arithmetic rather than semantics. This is the correct way
to reuse a verb and should be the template.
**7 / 9 / 10.** The best *puzzle* in the set, as distinct from the best
*reveal*. It is the only level solvable on paper before touching anything, and
it is the model for what the late game should feel like.

### 10 — Elsewhere
**Teaches** the application frame is inside the game.
**Breaks** the chrome/content boundary.
**Player learns** nothing on screen is exempt.
**Fair** — yes; the bar visibly transforms on load (taller, dotted accent,
knob appears), which is the affordance doing its job.
**Reusable** — high, but see the repeat problem below.
**Similar to** **15's third latch, exactly.**
**3 / 10 / 8.** The highest surprise in the game. It is also thin *as a puzzle*
— once you notice the bar there is no reasoning left, only a drag. That is an
acceptable trade for a reveal this good, but it means the trick is spent.

### 11 — Balance
**Teaches** size and position are quantities you can compute with.
**Breaks** — **nothing.** This is the finding that matters.
**Player learns** that mechanics compose.
**Fair** — yes; live torque readouts.
**Reusable** — medium.
**Similar to** 2 (resize) plus dragging, which is its purpose: it is the set's
first composition level.
**6 / 3 / 7.** Surprise 3 is the lowest score in the audit and it is not a
misprint. This is a competent physics puzzle that could appear in any game
without modification. It advances the *structure* (proving verbs combine) but
not the *thesis* (everything is a puzzle surface). It is the level a stranger
would least identify as belonging to RULESET.

### 12 — Remap
**Teaches** the control configuration is an object.
**Breaks** "the controls are fixed".
**Player learns** settings surfaces are manipulable.
**Fair** — yes, and elegantly: exactly one direction is unbound *and* exactly
one spare chip is visible, so the impossibility and its remedy are presented
simultaneously. That construction is worth reusing verbatim.
**Reusable** — high.
**Similar to** 4 and 10 in the family sense ("UI is an object"), but the object
class is new.
**5 / 8 / 8.**

### 13 — Unprinted
**Teaches** selection is a light source.
**Breaks** "invisible means absent".
**Player learns** native browser behaviours are puzzle mechanics.
**Fair** — yes; hint 1 states that six words are hidden, and the gaps in the
paragraph are a visible tell before any hint.
**Reusable** — medium.
**Similar to** 7 — see below.
**4 / 8 / 7.**

### 14 — Off-screen
**Teaches** the stage boundary is not the world boundary.
**Breaks** "the visible frame is everything".
**Player learns** space extends past the box.
**Fair** — yes; the minimap shows the missing tokens and the `3 / 5` counter is
explicit.
**Reusable** — **introduced once, never reused.**
**Similar to** nothing.
**4 / 6 / 6.** The worst cost/benefit in the set. It carries the most
implementation (world layer, minimap projection, pan clamping, socket state)
for the least thesis, its central interaction is one players already know from
every map application, and executing it takes five pan-and-drag cycles — the
longest mechanical labour in the game for a single idea.

### 15 — You cannot finish
**Teaches** that everything already shown was always in play.
**Breaks** the expectation that a finale introduces a new trick.
**Player learns** recap; the vocabulary is complete.
**Fair** — yes, and generously: three labelled pips give per-latch state, and
rejection names the specific latch that failed.
**Reusable** — n/a, it is a finale.
**Similar to** 3, 2 and 10 by design.
**5 / 6 / 8.** Latches 1 and 2 legitimately recontextualise: removing `cannot`
flips a prohibition into a permission (different reasoning from 3's "remove the
colour"), and resizing to *fill a target outline* is a different task from 2's
*comparison*. Latch 3 does not. See below.

---

## Cross-cutting findings

### 1. The word verb is depth, not repetition — confirmed
Levels 1, 3, 9 and 15 all move words, and this is the set's greatest strength
rather than its weakness. The four uses are genuinely distinct operations:

| Level | Operation | Reasoning required |
|---|---|---|
| 1 | move a word **to** a target | spatial |
| 3 | remove a word to **recolour the world** | semantic |
| 9 | remove words to **satisfy arithmetic** | numeric, self-referential |
| 15 | remove a word to **invert a permission** | logical |

A player who has done all four has a real vocabulary, not four memories of the
same trick. This satisfies contract rule 6 (reuse only when combined with
something new) at every step.

### 2. The progress bar is used twice with nothing added — confirmed
Level 10's whole content is "seize the progress bar". Level 15's third latch is
the same object, the same gesture and the same insight, and adds nothing.
Latches 1 and 2 pass rule 6; latch 3 fails it. This is the clearest contract
violation in the existing set.

It is also structurally awkward: level 10's surprise is a 10 precisely because
the frame had never been touched before, and re-spending it five levels later
in a recap slot cheapens both. **Recommendation for the eventual fix (not part
of this refactor): replace latch 3 with a different chrome element — the level
counter, the Hint button, the theme toggle — which preserves the recap's
meaning ("the frame is in play") while requiring a new discovery.**

### 3. Levels 5 and 8 are terminal, not compositional — confirmed
Both teach an *input shape* rather than a *verb*. Concretely: `dragText` can
appear as one clause of a later sentence ("drag a word outside the box");
`do nothing` and `hold two things` cannot be clauses of anything. They are
complete thoughts that terminate.

This is not fatal — a game needs some standalone beats, and level 5's concept
is memorable — but it caps how many such levels the set can carry. Two out of
fifteen is near the ceiling. The mechanic vocabulary should prefer verbs that
compose.

### 4. Level 14's cost/benefit is the weakest — confirmed
See its entry. If any existing level were to be cut or rebuilt, this is the
first candidate.

### 5. Levels 7 and 13 are adjacent
Both are "the text is present but you cannot read it, and a browser capability
is the answer", and both accept select-and-copy as a route. The mechanisms
differ enough (magnification vs. selection-as-illumination) that this is not a
rule 6 violation, but they should not be placed near each other in future
ordering, and a third "read the unreadable" level would be one too many.

### 6. Level 11 is the least RULESET-like level
It breaks no assumption. Its structural job — proving that mechanics combine —
is real and necessary, but a composition level should ideally combine verbs
*whose combination is itself surprising*. Torque is not surprising; it is
physics homework rendered in the game's visual language.

---

## The three weakest levels

Ranked by contribution to the thesis, not by score:

**1. Level 8 — Both** (3 / 6 / 6, low reusability)
Lowest surprise of the input levels, telegraphed by the printed keycaps, and
compositionally terminal. The player rarely experiences not-knowing.

**2. Level 11 — Balance** (6 / 3 / 7, medium reusability)
Surprise 3. Breaks no assumption. Belongs to the genre of physics puzzles
rather than to RULESET specifically. Its structural value is real but could be
delivered by a composition of two *surprising* verbs instead.

**3. Level 14 — Off-screen** (4 / 6 / 6, no reuse)
Most implementation for least idea; a standard interaction from map software;
the longest mechanical execution in the game for a single insight.

Level 5 was considered and spared: it is weak on reusability and pacing but its
assumption-break is genuine and unique.

---

## What this audit implies for the architecture

1. **Word operations deserve first-class capability status** — they carry four
   levels already and are the game's most compositional verb. Reorder, edit,
   scale and letter-level splitting are the natural next words in that
   vocabulary.
2. **Global chrome must be declared, not grabbed** — level 10 and level 15 both
   reach into the app frame through one ad-hoc helper (`takeProgress`). With
   more chrome in play, "which level is allowed to touch what" needs to be
   explicit and enforced, or the frame becomes unpredictable for the player and
   unmaintainable for us.
3. **Prefer verbs that compose** — the audit's weak levels are weak mostly
   because they terminate. New mechanics should be judged partly on whether
   they can be a clause in a later sentence.
4. **Fairness comes from live readouts** — every level scoring 8+ on
   satisfaction shows the player the exact quantity being judged (px sizes,
   torque, word count, latch pips, token count). Levels without such a readout
   score lower. This should be a contract rule, and it is one.
