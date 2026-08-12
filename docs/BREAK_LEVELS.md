# Break levels — B01 to B30

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
  where it sits in the played sequence — it is in fact the 39th thing played.

`route.js` enforces the separation structurally rather than by convention, and
`tests.html` asserts all of it.

## Placement

Irregular on purpose — sometimes two, sometimes three, sometimes four, so no
rhythm becomes predictable.

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
touch-point proxy instead.

---

# The thirty

### B01 — Balance · after 17
**MAKE IT BALANCED** — a tilted beam, unequal loads on both sides.
**Mechanic** the loads are fixed; the *fulcrum* slides horizontally.
**Solution** move the balance point until the beam holds level for 0.8s.
**Breaks** that you fix an imbalance by moving what is imbalanced.
**Hints** 1 Maybe the objects are not the problem. · 2 What is supporting the beam? · 3 Move the balance point.
**Mobile** single drag on the fulcrum, axis-locked.

### B02 — Shortest path · after 17
**TAKE THE SHORTEST PATH** — a dot inside a maze, target outside.
**Mechanic** the maze is a single draggable object.
**Solution** drag the maze off the dot, then move the dot straight to the target.
**Breaks** that scenery is scenery. It never said *solve* the maze.
**Hints** 1 The maze is not the instruction. · 2 Which object have you assumed cannot move? · 3 Move the maze.
**Mobile** two ordinary drags.

### B03 — Inside · after 17
**PUT THE DOT INSIDE THE CIRCLE. DO NOT CROSS THE CIRCLE.**
**Mechanic** the boundary is solid to the dot; the ring itself is draggable.
**Solution** move the circle around the stationary dot.
**Breaks** that "inside" is a property of the dot. It is a relationship.
**Hints** 1 Which object actually has to move? · 2 Inside is a relationship. · 3 Move the circle around the dot.
**Mobile** ordinary drag. *The Vault unlocks after this level.*

### B04 — Shadow · after 20
**PRESS THE BUTTON WITHOUT TOUCHING IT** — a lamp, a slab, a light sensor.
**Mechanic** the sensor reads shadow, not contact.
**Solution** put the slab on the line between lamp and sensor; hold 0.6s.
**Breaks** that influence requires contact.
**Hints** 1 Touch is not the only way to affect something. · 2 What else can reach the button? · 3 Use the shadow.
**Mobile** two drags; the shadow test is a generous 40px corridor.

### B05 — Build it · after 20
**PUT THE CIRCLE INSIDE THE SQUARE** — there is no square, only four loose sides.
**Mechanic** the four bars snap into place when near their position.
**Solution** build the square around the circle.
**Breaks** that everything named in an instruction already exists.
**Hints** 1 Are you sure the square already exists? · 2 You have four sides. · 3 Build the square around the circle.
**Mobile** four drags, 46px snap radius.

### B06 — Only one · after 20
**LEAVE ONLY ONE** — five identical circles, deletion impossible.
**Solution** stack all five precisely; visually one remains, internally all five do.
**Breaks** that removing is the only way to stop seeing something.
**Hints** 1 Removing something is not the only way to stop seeing it. · 2 They are identical. · 3 Stack them.

### B07 — The other side · after 23
**FIND WHAT IS MISSING** — a card reading `1 2 3 5`, no input field.
**Solution** flip the card; the back holds `4`; press it.
**Breaks** that a UI panel is flat.
**Hints** 1 You have inspected one side. · 2 Is this really a flat UI panel? · 3 Turn the card over.

### B08 — Weight · after 23
**PRESS IT** — a button that ignores presses; it is a pressure plate.
**Solution** pile draggable objects on it until their combined mass triggers it.
**Breaks** that a button is pressed by pointing at it.
**Hints** 1 Your finger is not heavy enough. · 2 The objects have weight. · 3 Put the objects on the button.

### B09 — One move · after 26
**SOLVE EVERYTHING IN ONE MOVE** — four dots, four target rings.
**Solution** the rings are one group; drag the group so all four align at once.
**Breaks** that four problems are four problems.
**Hints** 1 Four problems may be one object. · 2 What moves together? · 3 Move the targets, not the dots.

### B10 — The hole · after 26
**PUT THE BALL THROUGH THE HOLE** — the ball is bigger and cannot be resized.
**Solution** the hole has a size too. Enlarge it.
**Breaks** that the obstacle is fixed and the subject is the variable.
**Hints** 1 The ball does not have to change. · 2 The obstacle has a size too. · 3 Make the hole larger.

### B11 — Tether · after 26
**REACH THE TARGET** — an object on a rope too short to reach.
**Solution** the anchor is draggable; move where the rope begins.
**Breaks** that a constraint's fixed end is fixed.
**Hints** 1 The rope is long enough for something. · 2 Where does the rope begin? · 3 Move the anchor.

### B12 — Negative triangle · after 26
**FIND THE TRIANGLE** — three circles, no triangle drawn.
**Solution** press the triangular empty region between them.
**Breaks** that the answer must be an object.
**Hints** 1 Do not only inspect the objects. · 2 Look at the space they create. · 3 Press the empty triangle between the circles.

### B13 — Mirror · after 29
**MAKE THIS READ CORRECTLY** — the text reads `TELESUR`; it cannot be edited.
**Solution** position the mirror so the reflection reads `RULESET`, then click the reflection.
**Breaks** that fixing text means changing text.
**Hints** 1 The letters may already be correct. · 2 Change how you see them. · 3 Use the mirror.

### B14 — Shorter · after 29
**MAKE A SHORTER THAN B. DO NOT CHANGE A.**
**Solution** extend B past A. A is now shorter, and A never changed.
**Breaks** that "shorter" is a property rather than a comparison.
**Hints** 1 Shorter is a comparison. · 2 A does not have to change. · 3 Make B longer.

### B15 — Magnet · after 32
**MOVE THE DOT TO THE TARGET. DO NOT TOUCH THE DOT.**
**Solution** steer the dot with the magnet's field.
**Breaks** that moving something means holding it.
**Hints** 1 You can affect something without touching it. · 2 One object has a field. · 3 Guide it using the magnet.

### B16 — All at once · after 32
**PRESS ALL FOUR AT ONCE** — four separated buttons.
**Solution** drop a rigid plate across all four so they depress together.
**Breaks** that simultaneous means multi-touch. Never needs four fingers.
**Hints** 1 You do not need four fingers. · 2 One object can touch several things. · 3 Use the plate.

### B17 — Wrap · after 32
**REACH THE OTHER SIDE** — a barrier spans the full height.
**Solution** the world wraps horizontally; leave one edge, return from the other, behind the wall.
**Breaks** that the screen edge is the end of the world.
**Hints** 1 The wall blocks the path, not the world. · 2 Where does the screen end? · 3 Try leaving through an outer edge.

### B18 — Cursor trap · after 32
**PUT THE POINTER INSIDE THE CIRCLE WITHOUT CROSSING ITS EDGE.**
**Solution** the circle is draggable; move it over the stationary pointer.
**Breaks** that the pointer is the only thing you control.
**Hints** 1 The pointer is not the only movable thing. · 2 Inside is relative. · 3 Move the circle onto the pointer.
**Mobile** a visible draggable touch-point proxy stands in for the cursor.

### B19 — Don't let it fall · after 35
**DON'T LET IT FALL** — an object falls immediately and cannot be grabbed.
**Solution** raise the floor to meet it.
**Breaks** that catching means intercepting with your hands.
**Hints** 1 You cannot control the falling object. · 2 What can meet it? · 3 Move the ground.

### B20 — Brake · after 35
**STOP IT ON THE MARK** — an object slides on a low-friction track, untouchable.
**Solution** place a high-friction patch in its path so it decelerates into the zone.
**Breaks** that stopping something requires grabbing it.
**Hints** 1 Stopping something does not require grabbing it. · 2 Change the surface. · 3 Move the friction patch into its path.

### B21 — Chain · after 35
**MOVE THE LAST ONE. YOU MAY MOVE ONLY ONE OBJECT.**
**Solution** move the first object; the chain reaction carries the last into the target.
**Breaks** that you must act on the thing you want to change. Not timing-heavy.
**Hints** 1 You only control the first event. · 2 Objects can move other objects. · 3 Start the chain reaction.

### B22 — Disappear · after 38
**MAKE THE CIRCLE DISAPPEAR** — deleting, zeroing and offscreen are all disabled.
**Solution** cover it with a shape whose surface matches the background.
**Breaks** that disappearing means ceasing to exist.
**Hints** 1 Disappear does not mean delete. · 2 Visibility is enough. · 3 Cover it.

### B23 — Outside → inside · after 38
**PUT THE OBJECT INSIDE THE FRAME. DO NOT MOVE THE OBJECT.**
**Solution** move the frame around the object.
**Breaks** the same assumption as B03, now stated as an explicit prohibition.
**Hints** 1 The object must not move. · 2 Inside describes two things. · 3 Move the frame.

### B24 — Four corners · after 41
**TOUCH ALL FOUR POINTS IN ONE MOVE** — four dots at the corners of an invisible rectangle.
**Solution** size and place a frame so its four corners meet all four dots at once.
**Breaks** that one gesture touches one thing.
**Hints** 1 One object can reach four places. · 2 Think about corners. · 3 Fit the frame over all four points.

### B25 — Don't cross the line · after 41
**PUT THE DOT ABOVE THE LINE. THE DOT MUST NOT CROSS THE LINE.**
**Solution** rotate the line around its pivot until the dot is above it.
**Breaks** that above and below are absolute.
**Hints** 1 Above and below depend on the line. · 2 The dot may stay where it is. · 3 Rotate the line.

### B26 — Between · after 41
**TOUCH WHAT IS BETWEEN THEM** — two slabs, turned slightly toward each other.
**Mechanic** the whole corridor between them is the target — a region, not a point.
**Solution** touch the empty space in the middle.
**Breaks** that a target must be a thing. Touching either slab is refused with a word, not a penalty.
**Hints** 1 The answer is not necessarily an object. · 2 What literally exists between them? · 3 Touch the empty space.
**Mobile** one tap anywhere in a corridor ~1.8 slab-heights tall.

### B27 — Two into one · after 41
**MAKE TWO BECOME ONE** — two identical squares, no delete, no combine.
**Mechanic** 14px snap; when aligned they render as a single object.
**Solution** place one exactly over the other. Both still exist internally.
**Breaks** that "one" is a count rather than a description of what you see.
**Hints** 1 One can describe what you see. · 2 They are identical. · 3 Place one exactly over the other.
**Mobile** one drag. A proximity ring shows when the snap will take.

### B28 — Make room · after 44
**MAKE ROOM FOR ONE MORE** — a container packed edge-to-edge, one block outside.
**Mechanic** blocks are fixed and cannot shrink; the container has a resize handle.
**Solution** widen the container, then place the spare block in the new space.
**Breaks** that capacity is a constant. Success needs the block genuinely in free space, not stacked on a packed one.
**Hints** 1 The pieces do not need to become smaller. · 2 Who decided the container size was fixed? · 3 Expand the container.
**Mobile** drag the resize handle, then drag the block; the container magnetises the block.

### B29 — The constant · after 44
**TOUCH THE ONLY THING THAT NEVER CHANGES** — five objects change position, size, text, shape and orientation, slowly enough to watch.
**Mechanic** only `e.target === stage` counts. There is **no** hidden object anywhere; the answer really is the surface.
**Solution** touch the background.
**Breaks** that everything on screen is an object.
**Hints** 1 Watch before acting. · 2 Not everything on screen is an object. · 3 Touch the background.
**Mobile** one tap on empty space. Touching a moving object is refused with a word.

### B30 — Change everything · after 44, immediately before the finale
**CHANGE EVERYTHING. LEAVE NOTHING CHANGED.**

Four objects, four different verbs: a circle (drag), a line (resize), a word
(rotate), a square (state). Each remembers two facts about itself — whether it
has *ever* been altered, and whether it is altered *right now*.

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

**Breaks** that the current state of a thing is the whole truth about it.

**Why it is here.** It sits immediately before level 45, where the player must
believe that twenty-nine levels quietly recorded something while appearing to
record nothing. B30 teaches exactly that — state is not history — without
mentioning the cipher, the marks, or Echo Memory once.

**Restart** clears the changed-history completely; all state lives in the
`setup()` closure, so a rebuild is a clean slate. This is explicitly tested.

**Hints** 1 The instruction describes two different moments. · 2 What happened and what remains are not the same thing. · 3 Change every object, then put everything back exactly.
