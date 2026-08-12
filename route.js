/* ==========================================================================
   RULESET — play order
   --------------------------------------------------------------------------
   Season II is thirty cipher levels. Played consecutively the player works out
   far too early that the season is "about a language", and every later reveal
   lands on someone who is already looking for it. So thirty unrelated puzzles
   are interleaved between them, at deliberately irregular spacing.

   THE ONE RULE THIS FILE EXISTS TO PROTECT:

     ECHO arithmetic uses canonicalLevelId — NEVER play position.

   Level 35's phase is (35 - 16) mod 8 because it is level 35, not because it
   is the thirty-eighth thing the player saw. Break levels have no canonical
   id at all, take no part in any ECHO calculation, and carry no Echo Mark.

     canonicalLevelId   16…45, ECHO only. Feeds phase, marks, the message.
     routeId            'B01'…'B30', Break only. Never shown to the player.
     playOrderIndex     0…59, position in the sequence below. Navigation only.
   ========================================================================== */

window.RULESET_ROUTE = (function () {
'use strict';

/* The sequence, exactly as designed. The uneven grouping is the point: two
   breaks, then three, then four, so no rhythm becomes predictable. */
const ORDER = [
  16, 17,
  'B01', 'B02', 'B03',
  18, 19, 20,
  'B04', 'B05', 'B06',
  21, 22, 23,
  'B07', 'B08',
  24, 25, 26,
  'B09', 'B10', 'B11', 'B12',
  27, 28, 29,
  'B13', 'B14',
  30, 31, 32,
  'B15', 'B16', 'B17', 'B18',
  33, 34, 35,
  'B19', 'B20', 'B21',
  36, 37, 38,
  'B22', 'B23',
  39, 40, 41,
  'B24', 'B25', 'B26', 'B27',
  42, 43, 44,
  'B28', 'B29', 'B30',
  45
];

/**
 * Build the played sequence: Season I in its own order, then the interleaved
 * Season II route. Returns the level objects themselves, so the engine keeps
 * indexing one flat array exactly as it always has.
 */
function build(levels, breaks) {
  const byId = new Map((levels || []).map(l => [l.id, l]));
  const byRoute = new Map((breaks || []).map(b => [b.routeId, b]));

  /* Season I is untouched and plays first, 1 through 15. */
  const out = (levels || []).filter(l => l.id <= 15).sort((a, b) => a.id - b.id);

  const missing = [];
  ORDER.forEach(key => {
    const stage = typeof key === 'number' ? byId.get(key) : byRoute.get(key);
    if (stage) out.push(stage);
    else missing.push(key);
  });

  if (missing.length) {
    /* A break not yet written must not take the season down with it. */
    console.warn('route: not built yet →', missing.join(', '));
  }
  return out;
}

/** The key a stage is saved under: canonical id for ECHO, routeId for a break. */
function keyOf(stage) {
  if (!stage) return null;
  return stage.id != null ? stage.id : stage.routeId;
}

const isBreak = stage => !!stage && stage.id == null && !!stage.routeId;
const isEcho = stage => !!stage && stage.id != null && stage.id >= 16;

return { ORDER, build, keyOf, isBreak, isEcho };

})();
