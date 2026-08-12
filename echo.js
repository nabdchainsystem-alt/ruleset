/* ==========================================================================
   RULESET — ECHO (Season II)
   --------------------------------------------------------------------------
   The cipher layer. Pure logic: no DOM, no state, no side effects, so it can
   be reasoned about and tested on its own. The interactive Ring and Grid live
   in echo-ui.js; persistence lives in state.js.

   THE CONTRACT — these values are permanent. A later level may reveal a
   deeper USE of a rule, never a different meaning for it. If a change here
   would alter what an already-shipped level meant, the change is wrong.

     index  token  meaning
       0     VE    MOVE
       1     NA    THIS / current target
       2     OR    LEFT
       3     SE    RIGHT
       4     KA    NOT / negate
       5     MI    ONE
       6     RU    REPEAT
       7     LI    LIGHT / reveal

   Grammar:   [KA]? [RU]? ACTION TARGET [DIRECTION]? [COUNT]?
   Phase:     encoded = (normalised + phase) mod 8
   Message:   PHASE  PAYLOAD…  [CHECKSUM]
   Mark:      two tokens, no prefix, phase implied by the level

   NOTE ON SECRECY: this is a browser game. Everything here ships to the
   client and anyone can read it. "Hidden" throughout means *not surfaced in
   the UI* — it is a design boundary, never a security claim.
   ========================================================================== */

window.RULESET_ECHO = (function () {
'use strict';

/* ---------------------------------------------------------------- tokens -- */

const TOKENS = ['VE', 'NA', 'OR', 'SE', 'KA', 'MI', 'RU', 'LI'];

const MEANING = {
  VE: 'MOVE',
  NA: 'THIS',
  OR: 'LEFT',
  SE: 'RIGHT',
  KA: 'NOT',
  MI: 'ONE',
  RU: 'REPEAT',
  LI: 'LIGHT'
};

/* Role in the grammar, for the Ring's teaching mode and for validators. */
const ROLE = {
  VE: 'action', LI: 'action',
  NA: 'target',
  OR: 'direction', SE: 'direction',
  KA: 'modifier', RU: 'modifier',
  MI: 'count'
};

const INDEX = {};
TOKENS.forEach((t, i) => { INDEX[t] = i; });

/* ------------------------------------------------------------------ grid -- */
/* 64 characters, row-major, 8x8. Addressed by a normalised [row, column]
   token pair. Every character is unique, so the mapping is a bijection. */

const GRID =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?-:;+/()[]{}<>@#%&*_=\'"$';

const GRID_INDEX = {};
for (let i = 0; i < GRID.length; i++) GRID_INDEX[GRID[i]] = i;

const SIZE = 8;
const mod8 = n => ((n % 8) + 8) % 8;

/* --------------------------------------------------------------- helpers -- */

function isToken(t) { return typeof t === 'string' && INDEX[t.toUpperCase()] != null; }

/** Token string → 0-7. Throws on anything that is not a token. */
function indexOf(token) {
  const i = INDEX[String(token).toUpperCase()];
  if (i == null) throw new Error('ECHO: not a token: ' + token);
  return i;
}

/** 0-7 → token string. Wraps, so 8 → VE and -1 → LI. */
function tokenAt(index) { return TOKENS[mod8(index)]; }

/** 'SE VE NA' or ['SE','VE','NA'] → ['SE','VE','NA'] */
function parse(input) {
  const list = Array.isArray(input)
    ? input
    : String(input).toUpperCase().split(/[^A-Z]+/).filter(Boolean);
  return list.map(t => {
    const up = String(t).toUpperCase();
    if (INDEX[up] == null) throw new Error('ECHO: not a token: ' + t);
    return up;
  });
}

const format = tokens => parse(tokens).join(' ');

/* ---------------------------------------------------------------- phase -- */

/** Normalised token → what is written on screen at this phase. */
function shiftToken(token, phase) { return tokenAt(indexOf(token) + (phase | 0)); }

/** What is written on screen → its normalised meaning. */
function normalizeToken(token, phase) { return tokenAt(indexOf(token) - (phase | 0)); }

/** Season II ties a level to a phase. Level 16 is phase 0. */
function levelPhase(levelId) { return mod8((levelId | 0) - 16); }

/* ----------------------------------------------------------- the mapping -- */

/** A normalised pair → one character. Row first, then column. */
function tokensToCharacter(rowToken, colToken) {
  const i = indexOf(rowToken) * SIZE + indexOf(colToken);
  return GRID[i];
}

/** One character → its normalised [row, column] pair. */
function characterToTokens(ch) {
  const c = String(ch);
  const key = GRID_INDEX[c] != null ? c : c.toUpperCase();
  const i = GRID_INDEX[key];
  if (i == null) throw new Error('ECHO: character is not on the grid: ' + JSON.stringify(ch));
  return [tokenAt(Math.floor(i / SIZE)), tokenAt(i % SIZE)];
}

/** Where a character sits, for the Grid component's highlighting. */
function locate(ch) {
  const c = String(ch);
  const key = GRID_INDEX[c] != null ? c : c.toUpperCase();
  const i = GRID_INDEX[key];
  if (i == null) return null;
  return { index: i, row: Math.floor(i / SIZE), col: i % SIZE, char: GRID[i] };
}

/* ------------------------------------------------------------- checksum -- */

/**
 * Sum of the NORMALISED payload indices, mod 8, expressed as one token.
 * Normalised, so the checksum of a message does not change with its phase —
 * which is the only way a player can use it to test a guessed phase.
 */
function calculateChecksum(normalisedPayload) {
  const toks = parse(normalisedPayload);
  let sum = 0;
  for (let i = 0; i < toks.length; i++) sum += indexOf(toks[i]);
  return tokenAt(sum);
}

/* --------------------------------------------------------------- encode -- */

/**
 * Text → a full message: [phase token, ...payload, checksum?]
 * The phase token is written literally — it is the key to everything after
 * it, so it cannot itself be shifted.
 */
function encodeText(text, phase, opts) {
  opts = opts || {};
  const p = mod8(phase | 0);
  const chars = String(text).split('');
  const payload = [];

  for (let i = 0; i < chars.length; i++) {
    const pair = characterToTokens(chars[i]);
    payload.push(shiftToken(pair[0], p), shiftToken(pair[1], p));
  }

  const out = [tokenAt(p)].concat(payload);

  if (opts.checksum) {
    const normalised = payload.map(t => normalizeToken(t, p));
    out.push(shiftToken(calculateChecksum(normalised), p));
  }
  return out;
}

/* --------------------------------------------------------------- decode -- */

/**
 * A full message → { phase, text, ok, reason }.
 * Never throws on player input: a malformed message is a puzzle state, not a
 * crash, so callers get a reason they can show.
 */
function decodeText(tokens, opts) {
  opts = opts || {};
  let list;
  try { list = parse(tokens); }
  catch (e) { return { ok: false, reason: 'unknown-token', text: '', phase: null }; }

  if (!list.length) return { ok: false, reason: 'empty', text: '', phase: null };

  const phase = indexOf(list[0]);
  let payload = list.slice(1);
  let checksumOk = null;

  if (opts.checksum) {
    if (!payload.length) return { ok: false, reason: 'no-checksum', text: '', phase };
    const given = normalizeToken(payload.pop(), phase);
    const normalised = payload.map(t => normalizeToken(t, phase));
    checksumOk = calculateChecksum(normalised) === given;
  }

  if (payload.length % 2 !== 0) {
    return { ok: false, reason: 'odd-payload', text: '', phase, checksumOk };
  }

  let text = '';
  for (let i = 0; i < payload.length; i += 2) {
    text += tokensToCharacter(
      normalizeToken(payload[i], phase),
      normalizeToken(payload[i + 1], phase)
    );
  }

  return {
    ok: checksumOk !== false,
    reason: checksumOk === false ? 'checksum' : null,
    phase, text, checksumOk
  };
}

/** Verify a checksummed message without caring what it says. */
function verifyChecksum(tokens) {
  const r = decodeText(tokens, { checksum: true });
  return r.checksumOk === true;
}

/* ----------------------------------------------------------- echo marks -- */
/* Two tokens, no phase prefix: the level number IS the phase. That is the
   whole trick — a mark is unreadable until you know the rule, and trivially
   readable afterwards, using nothing the player was not given. */

function encodeEchoMark(character, levelId) {
  const p = levelPhase(levelId);
  const pair = characterToTokens(character);
  return [shiftToken(pair[0], p), shiftToken(pair[1], p)];
}

function decodeEchoMark(tokens, levelId) {
  const list = parse(tokens);
  if (list.length !== 2) throw new Error('ECHO: a mark is exactly two tokens');
  const p = levelPhase(levelId);
  return tokensToCharacter(normalizeToken(list[0], p), normalizeToken(list[1], p));
}

/* ------------------------------------------------------------- grammar --- */
/* A light validator so levels can accept a player-built phrase without each
   one re-implementing the rules. Order: [KA] [RU] ACTION TARGET [DIR] [COUNT] */

const ORDER = ['modifier', 'modifier', 'action', 'target', 'direction', 'count'];

function readPhrase(tokens) {
  let list;
  try { list = parse(tokens); } catch (e) { return { ok: false, reason: 'unknown-token' }; }

  const out = {
    ok: true, reason: null,
    negated: false, repeat: false,
    action: null, target: null, direction: null, count: null,
    tokens: list
  };

  let i = 0;
  if (list[i] === 'KA') { out.negated = true; i++; }
  if (list[i] === 'RU') { out.repeat = true; i++; }

  if (ROLE[list[i]] !== 'action') return { ok: false, reason: 'no-action', tokens: list };
  out.action = list[i++];

  if (ROLE[list[i]] !== 'target') return { ok: false, reason: 'no-target', tokens: list };
  out.target = list[i++];

  if (ROLE[list[i]] === 'direction') out.direction = list[i++];
  if (ROLE[list[i]] === 'count') out.count = list[i++];

  if (i !== list.length) return { ok: false, reason: 'trailing', tokens: list };
  return out;
}

/** Does a phrase mean what this level is asking for? */
function phraseMatches(tokens, want) {
  const p = readPhrase(tokens);
  if (!p.ok) return false;
  for (const k in want) if (p[k] !== want[k]) return false;
  return true;
}

/* ------------------------------------------------------------------ api -- */

return {
  TOKENS, MEANING, ROLE, GRID, SIZE, ORDER,

  isToken, indexOf, tokenAt, parse, format, mod8,
  shiftToken, normalizeToken, levelPhase,
  tokensToCharacter, characterToTokens, locate,
  calculateChecksum, verifyChecksum,
  encodeText, decodeText,
  encodeEchoMark, decodeEchoMark,
  readPhrase, phraseMatches
};

})();
