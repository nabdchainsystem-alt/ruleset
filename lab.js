/* ==========================================================================
   RULESET — Puzzle Lab
   --------------------------------------------------------------------------
   A developer surface for a game whose state now spans levels. It attaches to
   the existing dev panel and shares its backtick key, adding tabs for the
   things you cannot see by looking at the screen: what the player is assumed
   to know, what they are carrying, and what they have done.

   There is no entry point for a normal player: no button, no link, and the
   panel is not in the DOM until it is opened. `?dev=1` or the backtick key.
   ========================================================================== */

(function () {
'use strict';

const boot = () => {
  const E = window.RULESET;
  const State = window.RULESET_STATE;
  const LEVELS = window.RULESET_LEVELS || [];
  const dev = document.getElementById('dev');
  if (!E || !State || !dev) return;

  /* Every mechanic the game knows how to teach. The Lab lists them all so a
     designer can flip one on and test a level that assumes it. */
  const VOCABULARY = [
    'dragText', 'removeText', 'reorderText', 'editText', 'scaleText', 'letters',
    'dragObject', 'resizeObject', 'rotateObject', 'duplicateObject',
    'combineObject', 'discardObject', 'escapeObject',
    'wait', 'resizeViewport', 'zoom', 'selectText',
    'multiInput', 'keyboardControl', 'remapControl', 'panWorld',
    'manipulateUI', 'crossLevelObject', 'selfReference', 'physics',
    'echoToken'
  ];

  /* ------------------------------------------------------------ markup -- */

  const wrap = document.createElement('div');
  wrap.className = 'lab';
  wrap.innerHTML =
    '<div class="lab-tabs">' +
      ['levels', 'state', 'mechanics', 'items', 'history', 'echo'].map((t, i) =>
        '<button type="button" class="lab-tab' + (i ? '' : ' is-on') +
        '" data-tab="' + t + '">' + t + '</button>').join('') +
    '</div><div class="lab-body"></div>';
  dev.appendChild(wrap);

  const body = wrap.querySelector('.lab-body');
  const tabs = [...wrap.querySelectorAll('.lab-tab')];
  let active = 'levels';

  tabs.forEach(b => b.addEventListener('click', () => {
    active = b.dataset.tab;
    tabs.forEach(x => x.classList.toggle('is-on', x === b));
    render();
  }));

  /* The original controls belong to the levels tab. */
  const legacy = [dev.querySelector('.dev-grid'), dev.querySelector('.dev-actions')];

  /* --------------------------------------------------------- rendering -- */

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  const row = (label, value) => {
    const r = el('div', 'lab-row');
    r.appendChild(el('span', 'lab-k', label));
    r.appendChild(el('span', 'lab-v', value));
    return r;
  };

  function render() {
    legacy.forEach(n => n && (n.style.display = active === 'levels' ? '' : 'none'));
    body.textContent = '';
    ({ levels: renderLevels, state: renderState, mechanics: renderMechanics,
       items: renderItems, history: renderHistory, echo: renderEcho }[active] || renderLevels)();
  }

  /* -- levels ------------------------------------------------------------ */
  function renderLevels() {
    const d = State.data;
    body.appendChild(row('solved', d.solved.length + ' / ' + LEVELS.length));
    body.appendChild(row('unlocked', String(d.unlocked)));

    const sim = el('div', 'lab-actions');
    const n = el('input', 'lab-num');
    n.type = 'number'; n.min = '0'; n.max = String(LEVELS.length); n.value = String(d.solved.length);
    const go = el('button', 'btn btn-sm', 'Simulate through');
    go.addEventListener('click', () => {
      State.simulateThrough(parseInt(n.value, 10) || 0, LEVELS);
      E.paintProgress(); E.paintDev(); render();
    });
    sim.appendChild(n); sim.appendChild(go);
    body.appendChild(sim);

    const hard = el('button', 'btn btn-sm', 'Reset everything');
    hard.addEventListener('click', () => {
      State.resetAll(); E.paintProgress(); E.paintDev(); E.load(0); render();
    });
    body.appendChild(hard);
  }

  /* -- state ------------------------------------------------------------- */
  function renderState() {
    const d = State.snapshot();
    const counts = d.counts || {};
    Object.keys(counts).forEach(k => body.appendChild(row(k, String(counts[k]))));
    body.appendChild(row('words kept', (d.words || []).join(', ') || '—'));

    const led = el('div', 'lab-sub', 'ledger');
    body.appendChild(led);
    const ids = Object.keys(d.ledger || {});
    if (!ids.length) body.appendChild(el('div', 'lab-empty', 'no levels played'));
    ids.forEach(id => {
      const r = d.ledger[id];
      body.appendChild(row('L' + id,
        [r.route && ('route ' + r.route), r.answer && ('“' + r.answer + '”'),
         r.hints ? r.hints + ' hints' : null, r.restarts ? r.restarts + ' restarts' : null]
          .filter(Boolean).join(' · ') || 'seen'));
    });

    const dump = el('textarea', 'lab-json');
    dump.value = JSON.stringify(d, null, 2);
    dump.readOnly = true;
    body.appendChild(dump);
  }

  /* -- mechanics --------------------------------------------------------- */
  function renderMechanics() {
    body.appendChild(el('div', 'lab-note',
      'What later levels may assume the player already knows.'));
    VOCABULARY.forEach(id => {
      const line = el('label', 'lab-check');
      const box = el('input');
      box.type = 'checkbox';
      box.checked = State.knows(id);
      box.addEventListener('change', () => {
        box.checked ? State.learn(id) : State.unlearn(id);
      });
      line.appendChild(box);
      line.appendChild(el('span', null, id));
      const who = LEVELS.filter(l => {
        const m = l.mechanicIntroduced;
        return Array.isArray(m) ? m.indexOf(id) >= 0 : m === id;
      }).map(l => l.id);
      if (who.length) line.appendChild(el('span', 'lab-from', 'L' + who.join(',')));
      body.appendChild(line);
    });
  }

  /* -- items ------------------------------------------------------------- */
  function renderItems() {
    const items = State.items();
    if (!items.length) body.appendChild(el('div', 'lab-empty', 'inventory empty'));
    items.forEach(it => {
      const r = el('div', 'lab-row');
      r.appendChild(el('span', 'lab-k', it.id));
      r.appendChild(el('span', 'lab-v', 'from L' + (it.from == null ? '?' : it.from)));
      const x = el('button', 'btn btn-sm', '✕');
      x.addEventListener('click', () => { State.take(it.id); render(); });
      r.appendChild(x);
      body.appendChild(r);
    });

    const add = el('div', 'lab-actions');
    const name = el('input', 'lab-num');
    name.type = 'text'; name.placeholder = 'item id';
    const give = el('button', 'btn btn-sm', 'Give');
    give.addEventListener('click', () => {
      if (name.value.trim()) { State.give(name.value.trim(), null, {}); name.value = ''; render(); }
    });
    add.appendChild(name); add.appendChild(give);
    body.appendChild(add);
  }

  /* -- history ----------------------------------------------------------- */
  function renderHistory() {
    const h = State.history().slice(-60).reverse();
    if (!h.length) body.appendChild(el('div', 'lab-empty', 'nothing recorded yet'));
    h.forEach(e => {
      const detail = e.d ? Object.keys(e.d).map(k => k + '=' + e.d[k]).join(' ') : '';
      body.appendChild(row(
        (e.level == null ? '—' : 'L' + e.level) + ' ' + e.type,
        detail));
    });
  }

  /* -- echo -------------------------------------------------------------- */
  /* Season II's workbench. Everything here is a developer view, including the
     one thing production must never show: the decoded text of a mark. */

  function renderEcho() {
    const ECHO = window.RULESET_ECHO;
    if (!ECHO) { body.appendChild(row('echo', 'echo.js not loaded')); return; }

    /* -- ring + grid inspectors -- */
    const stage = el('div', 'lab-echo-stage');
    body.appendChild(stage);

    let phase = 0;
    const ring = window.RULESET_ECHO_UI.ring(stage, {
      size: 168, indices: true, phase: 0,
      onPick(token, index) { note.textContent = token + ' = ' + index + ' · ' + ECHO.MEANING[token]; }
    });
    const note = el('div', 'lab-note', 'pick a token');
    stage.appendChild(note);

    const phaseRow = el('div', 'lab-row');
    phaseRow.appendChild(el('span', 'lab-k', 'phase'));
    const phaseSel = el('select', 'lab-input');
    ECHO.TOKENS.forEach((t, i) => {
      const o = el('option', null, i + '  (' + t + ')');
      o.value = i;
      phaseSel.appendChild(o);
    });
    phaseSel.addEventListener('change', () => {
      phase = +phaseSel.value;
      ring.setPhase(phase);
      if (phase === 0) ring.wrap();
      redraw();
    });
    phaseRow.appendChild(phaseSel);
    body.appendChild(phaseRow);

    const gridBox = el('div', 'lab-echo-grid');
    body.appendChild(gridBox);
    const grid = window.RULESET_ECHO_UI.grid(gridBox, {
      interactive: true,
      onPick(ch, r, c) {
        const pair = [ECHO.tokenAt(r), ECHO.tokenAt(c)];
        note.textContent = JSON.stringify(ch) + ' = ' + pair.join(' ') +
          '  →  encoded @' + phase + ': ' + pair.map(t => ECHO.shiftToken(t, phase)).join(' ');
      }
    });

    /* -- encode / decode -- */
    body.appendChild(el('div', 'lab-h', 'encode'));
    const plain = el('input', 'lab-input');
    plain.placeholder = 'text to encode';
    plain.value = 'HELLO';
    body.appendChild(plain);

    const sumBox = el('label', 'lab-check');
    const sum = el('input');
    sum.type = 'checkbox';
    sumBox.appendChild(sum);
    sumBox.appendChild(el('span', null, ' append checksum'));
    body.appendChild(sumBox);

    const encOut = el('div', 'lab-out');
    body.appendChild(encOut);

    body.appendChild(el('div', 'lab-h', 'decode'));
    const cipher = el('input', 'lab-input');
    cipher.placeholder = 'VE NA OR … (first token = phase)';
    body.appendChild(cipher);
    const decOut = el('div', 'lab-out');
    body.appendChild(decOut);

    function redraw() {
      try {
        const tokens = ECHO.encodeText(plain.value, phase, { checksum: sum.checked });
        encOut.textContent = tokens.join(' ');
        encOut.classList.remove('is-bad');
        if (!cipher.value) cipher.value = tokens.join(' ');
      } catch (e) {
        encOut.textContent = e.message;
        encOut.classList.add('is-bad');
      }
      const r = ECHO.decodeText(cipher.value || [], { checksum: sum.checked });
      decOut.textContent = r.ok
        ? 'phase ' + r.phase + '  →  ' + JSON.stringify(r.text) +
          (r.checksumOk == null ? '' : r.checksumOk ? '  ✓ checksum' : '  ✗ checksum')
        : 'cannot read: ' + r.reason;
      decOut.classList.toggle('is-bad', !r.ok);
    }
    [plain, cipher].forEach(i => i.addEventListener('input', redraw));
    sum.addEventListener('change', redraw);

    /* -- echo memory -- */
    body.appendChild(el('div', 'lab-h', 'echo memory'));
    const marks = State.marks ? State.marks() : [];
    body.appendChild(row('marks held', marks.length + ' / 29'));

    if (!marks.length) body.appendChild(el('div', 'lab-note', 'no marks collected'));
    marks.forEach(m => {
      const r = el('div', 'lab-row');
      let decoded = '?';
      try { decoded = JSON.stringify(ECHO.decodeEchoMark(m.tokens, m.levelId)); } catch (e) {}
      r.appendChild(el('span', 'lab-k', 'L' + m.levelId + ' @' + m.phase));
      r.appendChild(el('span', 'lab-v', m.tokens.join(' ') + '  →  ' + decoded));
      const x = el('button', 'btn btn-sm', '×');
      x.addEventListener('click', () => { State.forgetMark(m.levelId); render(); });
      r.appendChild(x);
      body.appendChild(r);
    });

    /* -- mark tools -- */
    const tools = el('div', 'lab-actions');

    const addRow = el('div', 'lab-row');
    const lvIn = el('input', 'lab-input lab-input-sm');
    lvIn.placeholder = 'level';
    lvIn.value = '16';
    const chIn = el('input', 'lab-input lab-input-sm');
    chIn.placeholder = 'char';
    chIn.value = 'Y';
    const addBtn = el('button', 'btn btn-sm', 'add mark');
    addBtn.addEventListener('click', () => {
      const lv = parseInt(lvIn.value, 10);
      if (!Number.isFinite(lv) || !chIn.value) return;
      try {
        State.remember(lv, ECHO.encodeEchoMark(chIn.value[0], lv), ECHO.levelPhase(lv));
        render();
      } catch (e) { note.textContent = e.message; }
    });
    addRow.appendChild(lvIn); addRow.appendChild(chIn); addRow.appendChild(addBtn);
    body.appendChild(addRow);

    const wipe = el('button', 'btn btn-sm', 'reset season II state');
    wipe.addEventListener('click', () => { State.resetEcho(); render(); });
    tools.appendChild(wipe);
    body.appendChild(tools);

    redraw();
  }

  /* Repaint whenever the panel opens or the store changes while it is open. */
  const wasHidden = () => dev.hidden;
  let last = wasHidden();
  setInterval(() => {
    const now = wasHidden();
    if (now !== last) { last = now; if (!now) render(); }
  }, 200);
  State.onChange(() => { if (!dev.hidden) render(); });

  render();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

})();
