# Break levels — B01 to B30

> **Status: audited against the shipped code.** Every entry below was rewritten
> from the actual `setup()` in `breaks.js` / `breaks2.js` / `breaks3.js` /
> `breaks4.js`. Where the implementation deliberately diverged from the original
> specification during development, the entry says so on a `Differs from spec:`
> line. Instruction and hint text is quoted verbatim from the English strings in
> the source.

## Why they exist

Season II is thirty cipher levels. Played consecutively, a player works out far
too early that the season is "about a language", and every later reveal lands on
someone who is already looking for it. The phase reveal, the checksum, the
Memory Wall — all of them land softer on a player who has been braced since
level 20.

So thirty unrelated puzzles are interleaved between them, at deliberately
irregular spacing. The intent is that the player **regularly forgets ECHO
exists**, and then recognises it again. The season should feel like one strange
game that happens to contain a thread, not like a cipher course with breaks.

They are not filler. Each one breaks an assumption the way Season I did, and is
held to the same bar: a deterministic solution, three hints, restart support,
mobile parity, and the reaction *"wait — I can do that?"* followed immediately
by *"of course."*

## The hard rule

A Break level has:

```js
{ routeId: 'B07', /* … */ }      // no id, ever
```

- **No `id`.** Canonical level ids belong to ECHO alone.
- **No `echoMarkChar`.** Break levels contribute nothing to the 29-character
  hidden message, which remains exactly `YOU BUILT THE KEY. USE IT NOW`.
- **No part in phase arithmetic.** `levelPhase()` is only ever called with a
  canonical id. Level 35's phase is 3 because it is *level 35*, not because of
  where it sits in the played sequence — it is in fact the **53rd** stage
  played, of 75.

`route.js` enforces the separation structurally rather than by convention.
`tests.html` and `invariants.mjs` both assert all of it (`node invariants.mjs`
checks it headlessly in about a second).

Every Break level also carries a full three-rung hint ladder (`hint`, `hint2`,
`hint3`) and a `note` for the success card. Verified for all thirty.

## Placement

Irregular on purpose — sometimes two, sometimes three, sometimes four, so no
rhythm becomes predictable. Taken from `ORDER` in `route.js`:

| After ECHO level | Break run |
|---|---|
| 17 | B01 B02 B03 |
| 20 | B04 B05 B06 |
| 23 | B07 B08 |
| 26 | B09 B10 B11 B12 |
| 29 | B13 B14 |
| 32 | B15 B16 B17 B18 |
| 35 | B19 B20 B21 |
| 38 | B22 B23 |
| 41 | B24 B25 B26 B27 |
| 44 | B28 B29 B30 |

B30 sits immediately before the finale, and that is not an accident — see below.

## Mobile

Every Break level is pointer-events only, one finger, `touch-action: none` on
anything draggable, and no hover-only or right-click path. Layout is computed
from `ctx.size()` so nothing clips or becomes impossible on a 430px stage. Where
a puzzle would otherwise need a real cursor (B18) it supplies a draggable
touch-point proxy instead. `breaks2.css`, `breaks3.css` and `breaks4.css` each
carry a `@media (max-width: 620px)` block.

*Not verified by this audit: whether every stage is actually playable at 430px
on a real device. That belongs to the viewport matrix in `RELEASE_AUDIT.md`.*

---

# The thirty

### B01 — Balance · after 17
**MAKE IT BALANCED** — a beam with four fixed, unequal loads on it.
**Mechanic** the loads cannot be picked up; the *fulcrum* is the only draggable
thing, and it is axis-locked to X and clamped to the beam.
**Solution** slide the fulcrum until torque about it is near zero (|angle| <
0.8°) and hold that for 0.8s. The beam's tilt is recomputed live every frame.
**Breaks** that you fix an imbalance by moving what is imbalanced.
**Hints** 1 Maybe the objects are not the problem. · 2 What is supporting the beam? · 3 Move the balance point.
**Note** Change what holds a thing up.
**Mobile** single drag on the fulcrum, axis-locked.

### B02 — Shortest path · after 17
**TAKE THE SHORTEST PATH** — a dot inside a maze, a target outside it.
**Mechanic** the maze is one draggable object; the dot is separately draggable
but its walls are genuinely solid to it (an illegal move is reverted to the last
legal position, with no penalty).
**Solution** drag the maze off the dot, then move the dot straight to the target.
**Breaks** that scenery is scenery. It never said *solve* the maze.
**Hints** 1 The maze is not the instruction. · 2 Which object have you assumed cannot move? · 3 Move the maze.
**Note** It never said solve the maze.
**Mobile** two ordinary drags.

### B03 — Inside · after 17
**PUT THE DOT INSIDE THE CIRCLE. DO NOT CROSS THE CIRCLE.**
**Mechanic** the ring's boundary is solid to the dot in whichever direction the
dot started (a 12px band either side of the radius), so the dot can be dragged
freely but can never get in. The ring itself is freely draggable.
**Solution** move the circle around the stationary dot; the check is
`distance < R − 14`.
**Breaks** that "inside" is a property of the dot. It is a relationship.
**Hints** 1 Which object actually has to move? · 2 Inside is a relationship. · 3 Move the circle around the dot.
**Note** Inside is a relationship.
**Mobile** ordinary drag. *The Vault unlocks once `B03` is banked as solved —
see `VAULT_SPEC.md`.*

### B04 — Shadow · after 20
**PRESS THE BUTTON WITHOUT TOUCHING IT** — a lamp, a slab, a light sensor.
**Mechanic** the sensor reads shadow, not contact. Both the lamp and the slab
are draggable; the sensor is not.
**Solution** put the slab on the segment between lamp and sensor — within 40px
of the line, and between 8% and 96% along it — and hold for 0.6s.
**Breaks** that influence requires contact.
**Hints** 1 Touch is not the only way to affect something. · 2 What else can reach the button? · 3 Use the shadow.
**Note** A shadow reaches further than a hand.
**Mobile** two drags; the shadow test is a generous 40px corridor.

### B05 — Build it · after 20
**PUT THE CIRCLE INSIDE THE SQUARE** — there is no square, only four loose bars.
**Mechanic** each bar snaps to its slot when dropped within 46px of it. Nothing
is drawn where the square belongs — the square is absent, not hidden.
**Solution** build the 132px square around the stationary circle; the check is
simply "all four bars placed".
**Breaks** that everything named in an instruction already exists.
**Hints** 1 Are you sure the square already exists? · 2 You have four sides. · 3 Build the square around the circle.
**Note** It did not say the square was there.
**Mobile** four drags, 46px snap radius.

### B06 — Only one · after 20
**LEAVE ONLY ONE** — five identical discs, deletion impossible.
**Mechanic** the drags use the engine's magnetism (`magnetRadius: 52`,
`magnetPull: 0.85`) so a disc dropped near another snaps flush onto it. Stacking
is never a test of aim.
**Solution** bring all five within 14px of each other; visually one remains,
internally all five do.
**Breaks** that removing is the only way to stop seeing something.
**Hints** 1 Removing something is not the only way to stop seeing it. · 2 They are identical. · 3 Stack them.
**Note** One is what you see, not what is there.
**Mobile** four drags with generous magnetism.

### B07 — The other side · after 23
**FIND WHAT IS MISSING** — a card reading `1 2 3 5`, no input field.
**Mechanic** the card turns on a horizontal *drag*, not a button — a "flip"
button would announce that there is a back. It settles to whichever face is
nearer on release; there are no half-turned states. The back's `4` is a real
button, and it is refused unless the back is actually facing the player (checked
in the handler, not only via `pointer-events`).
**Solution** drag the card over, then press `4`.
**Breaks** that a UI panel is flat.
**Hints** 1 You have inspected one side. · 2 Is this really a flat panel? · 3 Turn the card over.
**Note** Objects may have backs.
*Differs from spec: hint 2 is "Is this really a flat panel?" — the word "UI" was
dropped.*

### B08 — Weight · after 23
**PRESS IT** — a plate that ignores presses; it is a pressure plate.
**Mechanic** five draggable weights, mass = area/1000, so heaviness is legible
before anything is moved. A fill bar on the plate shows load against the
threshold. Pressing the plate with a pointer plays a "poke" animation and does
nothing else — the refusal is visible.
**Solution** pile weights on it until combined mass ≥ 8.4 (roughly three of the
five, reachable several different ways) and hold for 0.5s.
**Breaks** that a button is pressed by pointing at it.
**Hints** 1 Your finger is not heavy enough. · 2 The objects have weight. · 3 Put the objects on the button.
**Note** A press can be made of weight.

### B09 — One move · after 26
**SOLVE EVERYTHING IN ONE MOVE** — four fixed dots, four target rings.
**Mechanic** the rings live inside one `brk-group` element and the drag is on the
group, so grabbing any ring moves all four. The two clusters use identical
relative offsets, so a single translation aligns all four at once — there is no
arrangement to work out, only an object to notice. Spacing is derived from
`ctx.size()` and clamped so neither cluster is ever clipped on a phone.
**Solution** drag the group until every ring is within 18px of its dot.
**Breaks** that four problems are four problems.
**Hints** 1 Four problems may be one object. · 2 What moves together? · 3 Move the targets, not the dots.
**Note** Four problems were one object.

### B10 — The hole · after 26
**PUT THE BALL THROUGH THE HOLE** — the ball is bigger than the gap and cannot
be resized.
**Mechanic** the gap is a real object with a resize notch; the two wall segments
are re-laid-out from it on every resize. The band is genuinely impassable: the
crossing test detects a *side swap* as well as an overlap, so a fast flick
cannot tunnel through, and passage requires `holeWidth ≥ ballDiameter + 2` and
the ball horizontally inside the gap.
**Solution** widen the hole past the ball, then drag the ball through it.
**Breaks** that the obstacle is fixed and the subject is the variable.
**Hints** 1 The ball does not have to change. · 2 The obstacle has a size too. · 3 Make the hole larger.
**Note** The obstacle has a size too.

### B11 — Tether · after 26
**REACH THE TARGET** — a bead on a rope too short to reach the goal.
**Mechanic** both the bead *and* the anchor are draggable. The leash is enforced
every frame and on every move, so the bead can never exceed the rope length; the
rope element is redrawn (length + rotation) each frame and goes taut at full
extension.
**Solution** drag the anchor closer to the goal, then swing the bead onto it.
**Breaks** that a constraint's fixed end is fixed.
**Hints** 1 The rope is long enough for something. · 2 Where does the rope begin? · 3 Move the anchor.
**Note** The rope was never the limit.

### B12 — The triangle · after 26
**FIND THE TRIANGLE** — three discs, no triangle drawn.
**Mechanic** a `pointerdown` on the stage. Pressing a disc, or pressing anywhere
that is not the middle, nudges the discs and refuses. The accepted region is a
**circle of radius 0.62R centred on the centroid**, not a literal triangle
polygon — a region, not a pixel hunt. On success the triangle is drawn for the
first time, confirming what was already there.
**Solution** press the empty middle.
**Breaks** that the answer must be an object.
**Hints** 1 Do not only inspect the objects. · 2 Look at the space they create. · 3 Press the empty triangle between the circles.
**Note** The target was an absence.
*Differs from spec: the level is named **"The triangle"**, not "Negative
triangle", and the hit region is a circle at the centroid rather than the
triangular gap itself.*

### B13 — Mirror · after 29
**MAKE THIS READ CORRECTLY** — the word on the board is `RULESET`, rendered with
`transform: scaleX(-1)` so every letter faces away from the player. It cannot be
edited.
**Mechanic** the mirror is a draggable panel containing a second copy of the same
word, itself flipped. Two flips cancel, so the reflection reads correctly. The
reflection only becomes visible and clickable while the mirror is actually held
up to the word (centres within 80px on X, and within 130px overall).
**Solution** drag the mirror under the word, then click the reflection.
**Breaks** that fixing text means changing text.
**Hints** 1 The letters may already be correct. · 2 Change how you see them. · 3 Use the mirror.
**Note** The letters were right all along.
*Differs from spec: the board never reads `TELESUR`. The original mirror text was
not a true mirror of anything — reversing the letter order is not what a mirror
does — so the puzzle was rebuilt as a **double flip**: the same word, `RULESET`,
appears twice, once flipped on the board and once flipped again in the mirror.*
**Known issue:** `.brk-word` is defined in both `breaks2.css` (34px, for this
level) and `breaks4.css` (17px, for B29/B30). `breaks4.css` loads last and wins,
so the board word renders at 17px against a 34px reflection. See
`RELEASE_AUDIT.md`.

### B14 — Shorter · after 29
**MAKE A SHORTER THAN B WITHOUT CHANGING A** — two labelled bars.
**Mechanic** only B carries a resize handle. A has none at all, so the
prohibition is enforced by the absence of an affordance rather than by a refusal.
**Solution** widen B past A. A is now shorter, and A never changed.
**Breaks** that "shorter" is a property rather than a comparison.
**Hints** 1 Shorter is a comparison. · 2 A does not have to change. · 3 Make B longer.
**Note** Shorter is a comparison.
*Differs from spec: the instruction is one clause — "MAKE A SHORTER THAN B
WITHOUT CHANGING A" — not two sentences.*

### B15 — Magnet · after 32
**MOVE THE DOT TO THE TARGET WITHOUT TOUCHING IT**
**Mechanic** the dot is a simulated iron filing with velocity and heavy damping;
it is deliberately **not** given the `.grab` affordance, and pressing it plays a
visible refusal. The magnet is draggable and carries a 190px field whose pull
fades linearly to nothing at the edge, capped at 300px/s.
**Solution** steer the dot into the goal with the field and hold it there 0.5s.
**Breaks** that moving something means holding it.
**Hints** 1 You can affect something without touching it. · 2 One object has a field. · 3 Guide it using the magnet.
**Note** Force reaches where a hand does not.
*Differs from spec: the instruction is one clause — "…WITHOUT TOUCHING IT" — not
two sentences.*

### B16 — All at once · after 32
**PRESS ALL FOUR AT ONCE** — four separated pads.
**Mechanic** the plate is measured from where the pads actually landed, so it
always spans them whatever the stage turns out to be, and it is parked clear of
every pad. The test is **coverage, not contact**: each pad's rect must be fully
inside the plate's (4px slack). A corner clipping a pad does not count.
**Solution** drop the plate across all four. On success the plate settles square.
**Breaks** that simultaneous means multi-touch. Never needs four fingers.
**Hints** 1 You do not need four fingers. · 2 One object can touch several things. · 3 Use the plate.
**Note** One thing can be in four places.

### B17 — The other side · after 32
**REACH THE OTHER SIDE** — a barrier spanning the full height.
**Mechanic** the world wraps horizontally. Pointer handling is hand-rolled rather
than using `ctx.drag`, because `ctx.drag` fixes its grab origin and therefore
cannot teleport an element mid-gesture — and teleporting is the whole puzzle. A
ghost of the dot fades in at the opposite edge within 72px of either edge, and
both edges glow. The wall is genuinely solid: landing inside it is refused, and
so is flicking clean over it in one move.
**Solution** drag the dot out through one outer edge; it returns from the other,
behind the wall. Then drop it on the goal.
**Breaks** that the screen edge is the end of the world.
**Hints** 1 The wall blocks the path, not the world. · 2 Where does the screen end? · 3 Try leaving through an outer edge.
**Note** The world had no edges.
*Differs from spec: the level is named **"The other side"**, not "Wrap" — which
means B07 and B17 share an English name (their Arabic names differ). Harmless,
since names are display-only, but noted.*

### B18 — Cursor trap · after 32
**PUT THE POINTER INSIDE THE CIRCLE WITHOUT CROSSING ITS EDGE.**
**Mechanic** the pointer proxy is trapped by a 14px rim: whichever side of the
circle it started on, it cannot cross to the other. On a mouse the proxy trails
the real cursor while no button is held, so the trap is *felt*; on touch the
proxy is directly draggable. The circle is freely draggable.
**Solution** move the circle over the stationary pointer.
**Breaks** that the pointer is the only thing you control.
**Hints** 1 The pointer is not the only movable thing. · 2 Inside is relative. · 3 Move the circle onto the pointer.
**Note** You are an object too.
**Mobile** the same visible proxy is a normal draggable object.

### B19 — Don't let it fall · after 35
**DON'T LET IT FALL** — an object falls from above the stage and cannot be
grabbed. A shaded danger band occupies the bottom of the stage.
**Mechanic** the floor is draggable on the **Y axis only** — the ground may rise,
it may never chase sideways. Gravity is 150px/s², slow enough to be fair. Once
the object rests on the floor it *rides* the floor upward.
**Solution** catch it, then raise the floor until it is clear of the danger band,
and hold that for 0.6s. The floor starts *inside* the band, so the object is
caught immediately and is still not safe — the puzzle is the lift, not the catch.
Being caught but still in the band for 0.9s hands the object back for another
drop rather than demanding a Restart.
**Breaks** that catching means intercepting with your hands.
**Hints** 1 You cannot control the falling object. · 2 What can meet it? · 3 Move the ground.
**Note** Move the ground, not the thing.
*Differs from spec: the original entry described only "raise the floor to meet
it". The shipped level adds the **danger band** — catching the object is not the
win condition; lifting it out of the dark is. The floor already catches it on the
first drop.*

### B20 — Brake · after 35
**STOP IT ON THE MARK** — a box slides along a low-friction track, untouchable.
**Mechanic** a draggable high-friction patch that sits **on** the road, not beside
it. 150px/s into 260px/s² stops the box in ~43px — shorter than the patch — so
once the box is on the patch, the patch always finishes the job. The box is
relaunched from the start after it leaves the stage, or 1.1s after it stops
short, so the level is a loop the player tunes rather than a one-shot.
**Solution** place the patch so the box comes to rest with its centre inside the
mark.
**Breaks** that stopping something requires grabbing it.
**Hints** 1 Stopping something does not require grabbing it. · 2 Change the surface. · 3 Move the rough patch into its path.
**Note** Change the road, not the car.

### B21 — Chain · after 35
**MOVE THE BALL WITHOUT TOUCHING IT** — five upright dominoes and a ball.
**Mechanic** only the first domino carries `.grab`; the rest are inert. The
cascade is **scripted, not simulated** — a chain reaction should be inevitable
once it has started, not a physics lottery decided by three pixels. Each domino
tips 78° at 130ms intervals, then the ball is placed in the goal.
**Solution** drag the first domino far enough right that it would touch its
neighbour, and release. If it is not far enough it springs back home.
**Breaks** that you must act on the thing you want to change. Not timing-heavy.
**Hints** 1 You only control the first event. · 2 Objects can move other objects. · 3 Push the first one into the second.
**Note** One push, many movements.
*Differs from spec: the instruction is "MOVE THE BALL WITHOUT TOUCHING IT", not
"MOVE THE LAST ONE. YOU MAY MOVE ONLY ONE OBJECT." — the target is a ball at the
end of the line rather than the last domino, and hint 3 names the gesture
("Push the first one into the second") rather than the concept.*

### B22 — Disappear · after 38
**MAKE THE CIRCLE DISAPPEAR**
**Mechanic** there is no delete, no zero and no offscreen route offered — the
circle is not draggable at all. The cover's face is the stage's own colour; only
a hairline border admits that it is an object.
**Solution** drag the cover so it fully encloses the circle's rect (2px slack).
On success the status line reads "still there" before the level solves.
**Breaks** that disappearing means ceasing to exist.
**Hints** 1 Disappear does not mean delete. · 2 Out of sight is enough. · 3 Cover it.
**Note** It is still there.
*Differs from spec: the spec said "deleting, zeroing and offscreen are all
disabled", implying the level refuses those attempts. It does not offer them in
the first place — the circle has no affordance. Hint 2 is "Out of sight is
enough", not "Visibility is enough".*

### B23 — Inside the frame · after 38
**PUT THE OBJECT INSIDE THE FRAME. DO NOT MOVE THE OBJECT.**
**Mechanic** the object is locked and says so: pressing it plays a visible
"stuck" animation, so locked reads as intent rather than a bug. The frame is
draggable.
**Solution** move the frame around the object; the object's rect must sit fully
inside the frame's with 3px of clearance on every side.
**Breaks** the same assumption as B03, now stated as an explicit prohibition.
**Hints** 1 The object must not move. · 2 Inside describes two things. · 3 Move the frame.
**Note** Two things make an inside.
*Differs from spec: the level is named **"Inside the frame"**, not
"Outside → inside".*

### B24 — Four corners · after 41
**TOUCH ALL FOUR POINTS IN ONE MOVE** — four dots at the corners of a rectangle
that is never drawn.
**Mechanic** the frame is both draggable and resizable, and starts at the
target's own proportions, so one proportional resize can fit it — no two-axis
precision, and pinch works on touch. Tolerance is 24px per corner; each dot
lights individually as it is met.
**Solution** size and place the frame so all four of its corners meet the dots.
On success the frame settles to the exact rectangle.
**Breaks** that one gesture touches one thing.
**Hints** 1 One object can reach four places. · 2 Look at how the points are arranged. · 3 Grow the frame until its corners are theirs.
**Note** A rectangle is four places at once.
*Differs from spec: hints 2 and 3 were reworded ("Think about corners" → "Look at
how the points are arranged"; "Fit the frame over all four points" → "Grow the
frame until its corners are theirs").*

### B25 — Above the line · after 41
**PUT THE DOT ABOVE THE LINE. THE DOT MUST NOT CROSS THE LINE.**
**Mechanic** the line rotates about a pivot via `ctx.rotate`. "Above" is the sign
of the cross product of the line's direction with the vector to the dot, so it is
genuinely relative to the line's angle. The dot starts beyond the line's reach
and *may* be dragged, but two rules are enforced on every move: it may not come
within `LEN + 34` of the pivot, and it may not change sides. Which side is legal
is re-read when each drag begins, not once at setup, so a player cannot walk the
dot in close and then sweep the line through it.
**Solution** rotate the line until the dot is above it (with an 8px deadband) and
hold for 0.5s. Nothing ever crosses anything.
**Breaks** that above and below are absolute.
**Hints** 1 Above and below depend on the line. · 2 The dot may stay exactly where it is. · 3 Rotate the line.
**Note** Above is a direction, not a place.
*Differs from spec: the level is named **"Above the line"**, not "Don't cross the
line".*

### B26 — Between · after 41
**TOUCH WHAT IS BETWEEN THEM** — two slabs, turned slightly toward each other
(−4° and +4°).
**Mechanic** the whole corridor between them is the target — a region, not a
point. Touching a slab is refused with the words "not the objects"; touching
anywhere else outside the corridor is refused with "not there". Neither is a
penalty.
**Solution** touch the empty space in the middle; the corridor is the full gap
horizontally and 1.8 slab-heights tall. A flash confirms the region.
**Breaks** that a target must be a thing.
**Hints** 1 The answer is not necessarily an object. · 2 What literally exists between them? · 3 Touch the empty space.
**Note** A gap is a thing.
**Mobile** one tap anywhere in the corridor.

### B27 — Two into one · after 41
**MAKE TWO BECOME ONE** — two identical squares, no delete, no combine.
**Mechanic** both squares are draggable; a 14px alignment threshold snaps one
exactly onto the other on release. A proximity class (`is-near`) shows when the
snap will take.
**Solution** place one exactly over the other. Both still exist internally.
**Breaks** that "one" is a count rather than a description of what you see.
**Hints** 1 One can describe what you see. · 2 They are identical. · 3 Place one exactly over the other.
**Note** One is a description, not a count.
**Mobile** one drag.

### B28 — Make room · after 44
**MAKE ROOM FOR ONE MORE** — a container packed edge-to-edge with four fixed
blocks, one spare block outside.
**Mechanic** the blocks cannot shrink and cannot leave; the container has a
resize handle with `min` at exactly its packed width and `max` at two blocks
wider. The spare block is magnetised toward the container.
**Solution** widen the container, then place the spare block in the new space.
Success requires the block genuinely in free space — a separate check rejects it
if it overlaps any packed block.
**Breaks** that capacity is a constant.
**Hints** 1 The pieces do not need to become smaller. · 2 Who decided the container size was fixed? · 3 Expand the container.
**Note** Capacity was part of the puzzle.
**Mobile** drag the resize handle, then drag the block.

### B29 — The constant · after 44
**TOUCH THE ONLY THING THAT NEVER CHANGES** — five objects changing position,
size, text, shape and orientation, slowly enough to watch.
**Mechanic** only `e.target === stage` counts. There is **no** hidden object
anywhere; the answer really is the surface. Touching a moving object is refused
with "that one changes".
**Solution** touch the background. The stage goes green and the five objects fade
out in sequence.
**Breaks** that everything on screen is an object.
**Hints** 1 Watch before acting. · 2 Not everything on screen is an object. · 3 Touch the background.
**Note** It was never one of the objects.
**Mobile** one tap on empty space.

### B30 — Change everything · after 44, immediately before the finale
**CHANGE EVERYTHING. LEAVE NOTHING CHANGED.**

Four objects, four different verbs: a circle (drag), a line (resize), a word
(rotate, via `ctx.rotate`), a square (click-cycled state, three shades). Each
remembers two facts about itself — whether it has *ever* been altered, and
whether it is altered *right now*.

**Solution** change all four, then restore all four exactly. Success requires
both at once: every object has a history, and no object has a difference.

Tolerances are generous — 11px of position, 11px of width, 12° of angle — and
the circle and line snap home when released nearby. The idea is the puzzle, not
the precision.

**Feedback** each object shows a small dot once it has been changed at least
once. That is the first half of the instruction, and without it the player
cannot tell the level is listening. The second half stays unexplained until it
is satisfied, at which point the screen says only:

> NOTHING CHANGED.
> BUT EVERYTHING HAPPENED.

…and solves 3.4s later.

**Breaks** that the current state of a thing is the whole truth about it.

**Why it is here.** It sits immediately before level 45, where the player must
believe that twenty-nine levels quietly recorded something while appearing to
record nothing. B30 teaches exactly that — state is not history — without
mentioning the cipher, the marks, or Echo Memory once.

**Restart** clears the changed-history completely; all state lives in the
`setup()` closure, so a rebuild is a clean slate.

**Hints** 1 The instruction describes two different moments. · 2 What happened and what remains are not the same thing. · 3 Change every object, then put everything back exactly.
**Note** State is not history.

*Differs from spec: the spec said the restart behaviour "is explicitly tested".
It is not — `tests.html` contains no B30-specific case. The property holds by
construction (closure state, rebuilt by `ctx.destroy()` + `setup()`), but it is
asserted nowhere. See `RELEASE_AUDIT.md`.*

---

## Test coverage of the Break levels — what is and is not asserted

`tests.html` asserts the **structure** of all thirty: no canonical id, no echo
mark, a well-formed `routeId` matching `/^B\d\d$/`, a full three-rung hint
ladder, and that removing them from the route leaves ECHO untouched.
`invariants.mjs` re-asserts the same contract headlessly.

What is **not** asserted:

- **No Break puzzle is driven to its solution by any test.** Every ECHO level
  16–45 and every Season I level 1–15 has a dedicated block in `tests.html` that
  solves it with synthetic events. No `B##` does.
- **B15–B30 are never instantiated at all.** The "sets up and tears down
  cleanly" sweep loops `for (i = 0; i < RULESET_LEVELS.length; i++)` — that is
  45 iterations over a **75-stage route**, so it stops at route position 44
  (canonical level 31). It therefore smoke-tests B01–B14 and misses B15–B30
  entirely. The assertion message ("all 45 levels set up + tear down cleanly")
  reads as full coverage and is not.

This is the single largest gap in the suite and is recorded in
`RELEASE_AUDIT.md`.
