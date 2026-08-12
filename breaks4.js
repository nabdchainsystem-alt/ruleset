/* ==========================================================================
   RULESET — Break levels B26–B30
   --------------------------------------------------------------------------
   The last five, and the last three sit immediately before the Season II
   finale. B30 in particular is doing quiet preparatory work: it teaches that
   the state of a thing and the history of a thing are different facts, which
   is exactly what the finale asks the player to believe.

   No canonical id. No echoMarkChar. Nothing here touches the cipher.
   ========================================================================== */

window.RULESET_BREAKS = (window.RULESET_BREAKS || []).concat([

/* ═════════════════════════════════════════════════════════ B26 ═════════ */
{
  routeId: 'B26',
  name: { en: 'Between', ar: 'بينهما' },
  instruction: { en: 'TOUCH WHAT IS BETWEEN THEM', ar: 'المس ما بينهما' },

  hint: {
    en: 'The answer is not necessarily an object.',
    ar: 'الإجابة ليست بالضرورة شيئًا.'
  },
  hint2: {
    en: 'What literally exists between them?',
    ar: 'ما الذي يوجد بينهما حرفيًا؟'
  },
  hint3: {
    en: 'Touch the empty space.',
    ar: 'المس المساحة الفارغة.'
  },
  note: { en: 'A gap is a thing.', ar: 'الفجوة شيء.' },

  setup(ctx) {
    const { w, h } = ctx.size();
    const S = Math.min(120, Math.round(w * 0.19));
    const midY = Math.round(h * 0.5);

    /* Two slabs, turned very slightly toward each other. Nothing marks the
       middle — but two things facing a space is how a space becomes a place. */
    const left = ctx.el('div', 'brk-slab brk-face', {
      x: Math.round(w * 0.5 - S * 2.1), y: midY - S / 2,
      style: { width: S + 'px', height: S + 'px', transform: 'rotate(-4deg)' }
    });
    const right = ctx.el('div', 'brk-slab brk-face', {
      x: Math.round(w * 0.5 + S * 1.1), y: midY - S / 2,
      style: { width: S + 'px', height: S + 'px', transform: 'rotate(4deg)' }
    });

    let done = false;

    ctx.on(ctx.stage, 'pointerdown', e => {
      if (done) return;
      const box = ctx.rect(ctx.stage);
      const x = e.clientX - box.left, y = e.clientY - box.top;

      if (e.target === left || e.target === right) {
        ctx.say(ctx.t({ en: 'not the objects', ar: 'ليست الأشياء' }));
        return;
      }

      /* The whole corridor between them counts, generously tall. This is a
         region, not a target — pixel hunting would be a different game. */
      const gapL = left.offsetLeft + left.offsetWidth;
      const gapR = right.offsetLeft;
      const inGap = x > gapL && x < gapR &&
                    y > midY - S * 0.9 && y < midY + S * 0.9;
      if (!inGap) { ctx.say(ctx.t({ en: 'not there', ar: 'ليس هناك' })); return; }

      done = true;
      ctx.say('');
      const flash = ctx.el('div', 'brk-gap-hit', {
        style: {
          left: gapL + 'px', top: (midY - S * 0.9) + 'px',
          width: (gapR - gapL) + 'px', height: (S * 1.8) + 'px'
        }
      });
      ctx.after(30, () => flash.classList.add('is-on'));
      ctx.after(720, () => ctx.solve());
    });
  }
},

/* ═════════════════════════════════════════════════════════ B27 ═════════ */
{
  routeId: 'B27',
  name: { en: 'Two into one', ar: 'اثنان يصيران واحدًا' },
  instruction: { en: 'MAKE TWO BECOME ONE', ar: 'اجعل الاثنين واحدًا' },

  hint: {
    en: 'One can describe what you see.',
    ar: '«واحد» قد تصف ما تراه.'
  },
  hint2: {
    en: 'They are identical.',
    ar: 'إنهما متطابقان.'
  },
  hint3: {
    en: 'Place one exactly over the other.',
    ar: 'ضع أحدهما فوق الآخر تمامًا.'
  },
  note: { en: 'One is a description, not a count.', ar: '«واحد» وصف، لا عدد.' },

  setup(ctx) {
    const { w, h } = ctx.size();
    const S = 96;

    const make = (x, y) => ctx.el('div', 'brk-twin grab', {
      x: Math.round(x), y: Math.round(y),
      style: { width: S + 'px', height: S + 'px' }
    });
    const a = make(w * 0.24 - S / 2, h * 0.5 - S / 2);
    const b = make(w * 0.76 - S / 2, h * 0.5 - S / 2);

    let done = false;

    const aligned = () =>
      Math.abs(a.offsetLeft - b.offsetLeft) < 14 &&
      Math.abs(a.offsetTop - b.offsetTop) < 14;

    /* Generous snap: the insight is that two identical things can look like
       one, not that you can land a drag within a pixel. */
    [a, b].forEach(one => {
      const other = one === a ? b : a;
      ctx.drag(one, {
        affordance: false, bounds: 'stage', enabled: () => !done,
        onDrop() {
          if (done || !aligned()) return;
          ctx.place(one, other.offsetLeft, other.offsetTop);
          done = true;
          a.classList.add('is-merged');
          b.classList.add('is-merged');
          ctx.after(640, () => ctx.solve());
        }
      });
    });

    /* both still exist — nothing was deleted, and nothing pretends otherwise */
    ctx.frame(() => {
      if (done) return;
      const near = aligned();
      a.classList.toggle('is-near', near);
      b.classList.toggle('is-near', near);
    });
  }
},

/* ═════════════════════════════════════════════════════════ B28 ═════════ */
{
  routeId: 'B28',
  name: { en: 'Make room', ar: 'أفسح مكانًا' },
  instruction: { en: 'MAKE ROOM FOR ONE MORE', ar: 'أفسح مكانًا لواحد إضافي' },

  hint: {
    en: 'The pieces do not need to become smaller.',
    ar: 'القطع لا تحتاج أن تصغر.'
  },
  hint2: {
    en: 'Who decided the container size was fixed?',
    ar: 'من قرّر أن حجم الوعاء ثابت؟'
  },
  hint3: {
    en: 'Expand the container.',
    ar: 'وسّع الوعاء.'
  },
  note: { en: 'Capacity was part of the puzzle.', ar: 'السعة كانت جزءًا من اللغز.' },

  setup(ctx) {
    const { w, h } = ctx.size();
    const BLOCK = 56, GAP = 5, PAD = 8;
    const START = PAD * 2 + BLOCK * 4 + GAP * 3;          // packed edge to edge

    const box = ctx.el('div', 'brk-box', {
      x: Math.round(w * 0.5 - START / 2), y: Math.round(h * 0.42 - 40),
      style: { width: START + 'px', height: (BLOCK + PAD * 2) + 'px' }
    });

    /* four blocks, fixed. They cannot shrink and they cannot leave. */
    for (let i = 0; i < 4; i++) {
      ctx.el('div', 'brk-brick', {
        parent: box,
        style: {
          left: (PAD + i * (BLOCK + GAP)) + 'px', top: PAD + 'px',
          width: BLOCK + 'px', height: BLOCK + 'px'
        }
      });
    }

    const spare = ctx.el('div', 'brk-brick brk-spare grab', {
      x: Math.round(w * 0.5 - BLOCK / 2), y: Math.round(h * 0.78 - BLOCK / 2),
      style: { width: BLOCK + 'px', height: BLOCK + 'px' }
    });

    /* the boundary itself is the thing that yields */
    ctx.resize(box, {
      mode: 'box', keepRatio: false,
      min: START, max: START + BLOCK * 2 + GAP * 2
    });

    ctx.drag(spare, { affordance: false, bounds: 'stage', magnet: () => [box] });

    let done = false;
    ctx.check(() => {
      if (done) return false;

      const bx = box.offsetLeft, by = box.offsetTop;
      const inside =
        spare.offsetLeft > bx + PAD - 10 &&
        spare.offsetLeft + BLOCK < bx + box.offsetWidth - PAD + 10 &&
        spare.offsetTop > by - 12 &&
        spare.offsetTop + BLOCK < by + box.offsetHeight + 12;

      /* and genuinely in free space, not sitting on top of a packed block */
      const clear = ![...box.querySelectorAll('.brk-brick')]
        .some(brick => ctx.hits(spare, brick, -12));

      box.classList.toggle('is-hot', inside && clear);
      if (!inside || !clear) return false;

      done = true;
      box.classList.add('is-done');
      spare.classList.add('is-set');
      ctx.after(560, () => ctx.solve());
      return false;
    });
  }
},

/* ═════════════════════════════════════════════════════════ B29 ═════════ */
{
  routeId: 'B29',
  name: { en: 'The constant', ar: 'الثابت' },
  instruction: {
    en: 'TOUCH THE ONLY THING THAT NEVER CHANGES',
    ar: 'المس الشيء الوحيد الذي لا يتغير أبدًا'
  },

  hint: {
    en: 'Watch before acting.',
    ar: 'راقب قبل أن تتصرف.'
  },
  hint2: {
    en: 'Not everything on screen is an object.',
    ar: 'ليس كل ما على الشاشة شيئًا.'
  },
  hint3: {
    en: 'Touch the background.',
    ar: 'المس الخلفية.'
  },
  note: { en: 'It was never one of the objects.', ar: 'لم يكن قط أحد الأشياء.' },

  setup(ctx) {
    const { w, h } = ctx.size();
    const WORDS = ['NORTH', 'SEVEN', 'AMBER', 'QUIET', 'RIVER', 'GLASS'];

    /* Five things, each changing a different way, slowly enough to be watched.
       There is no sixth thing hiding anywhere — the answer really is the
       surface they are all sitting on. */
    const bits = [
      { kind: 'move', el: ctx.el('div', 'brk-shift', { x: w * 0.16, y: h * 0.22, style: { width: '54px', height: '54px' } }) },
      { kind: 'size', el: ctx.el('div', 'brk-shift', { x: w * 0.44, y: h * 0.18, style: { width: '46px', height: '46px' } }) },
      { kind: 'word', el: ctx.el('div', 'brk-shift brk-word', { x: w * 0.68, y: h * 0.30, text: WORDS[0] }) },
      { kind: 'shape', el: ctx.el('div', 'brk-shift', { x: w * 0.28, y: h * 0.64, style: { width: '58px', height: '58px' } }) },
      { kind: 'spin', el: ctx.el('div', 'brk-shift brk-bar-lite', { x: w * 0.62, y: h * 0.68, style: { width: '78px', height: '12px' } }) }
    ];
    bits.forEach(b => { b.x0 = b.el.offsetLeft; b.y0 = b.el.offsetTop; });

    let t = 0, wordAt = 0, done = false;

    ctx.frame(dt => {
      if (done) return;
      t += dt;
      bits.forEach((b, i) => {
        const p = t * 0.7 + i;
        switch (b.kind) {
          case 'move':
            ctx.place(b.el, Math.round(b.x0 + Math.sin(p) * 34), Math.round(b.y0 + Math.cos(p * 0.8) * 22));
            break;
          case 'size': {
            const s = 40 + (Math.sin(p) + 1) * 14;
            b.el.style.width = b.el.style.height = Math.round(s) + 'px';
            break;
          }
          case 'word': {
            const n = Math.floor(t / 1.7) % WORDS.length;
            if (n !== wordAt) { wordAt = n; b.el.textContent = WORDS[n]; }
            break;
          }
          case 'shape':
            b.el.style.borderRadius = Math.round((Math.sin(p) + 1) * 24) + '%';
            break;
          case 'spin':
            b.el.style.transform = 'rotate(' + (t * 26).toFixed(1) + 'deg)';
            break;
        }
      });
    });

    ctx.on(ctx.stage, 'pointerdown', e => {
      if (done) return;
      /* the stage itself, and nothing sitting on it */
      if (e.target !== ctx.stage) {
        ctx.say(ctx.t({ en: 'that one changes', ar: 'هذا يتغيّر' }));
        return;
      }
      done = true;
      ctx.say('');
      ctx.stage.classList.add('brk-steady');
      bits.forEach((b, i) => ctx.after(i * 70, () => b.el.classList.add('is-gone')));
      ctx.after(900, () => ctx.solve());
    });
  }
},

/* ═════════════════════════════════════════════════════════ B30 ═════════ */
{
  routeId: 'B30',
  name: { en: 'Change everything', ar: 'غيّر كل شيء' },
  instruction: {
    en: 'CHANGE EVERYTHING. LEAVE NOTHING CHANGED.',
    ar: 'غيّر كل شيء. ولا تترك شيئًا متغيّرًا.'
  },

  hint: {
    en: 'The instruction describes two different moments.',
    ar: 'التعليمة تصف لحظتين مختلفتين.'
  },
  hint2: {
    en: 'What happened and what remains are not the same thing.',
    ar: 'ما حدث وما بقي ليسا الشيء نفسه.'
  },
  hint3: {
    en: 'Change every object, then put everything back exactly.',
    ar: 'غيّر كل شيء، ثم أعد كل شيء تمامًا كما كان.'
  },
  note: { en: 'State is not history.', ar: 'الحالة ليست التاريخ.' },

  setup(ctx) {
    const { w, h } = ctx.size();

    /* Four objects, four different verbs. Each remembers two facts about
       itself: whether it has ever been altered, and whether it is altered
       right now. Those two facts are the whole level. */
    const parts = [];
    const addMemoryDot = obj => {
      const dot = ctx.el('i', 'brk-mem', { parent: obj.el });
      obj.dot = dot;
    };

    /* — the circle moves — */
    const disc = ctx.el('div', 'brk-disc grab brk-part', {
      x: Math.round(w * 0.16), y: Math.round(h * 0.28),
      style: { width: '62px', height: '62px' }
    });
    const discHome = { x: disc.offsetLeft, y: disc.offsetTop };
    const pDisc = {
      el: disc,
      home: () => Math.hypot(disc.offsetLeft - discHome.x, disc.offsetTop - discHome.y) < 11,
      reset: () => ctx.place(disc, discHome.x, discHome.y)
    };
    ctx.drag(disc, {
      affordance: false, bounds: 'stage',
      onDrop() {
        /* a forgiving snap home, so restoring is an intention not a trial */
        if (pDisc.home()) pDisc.reset();
      }
    });
    parts.push(pDisc);

    /* — the line resizes — */
    const line = ctx.el('div', 'brk-line brk-part', {
      x: Math.round(w * 0.42), y: Math.round(h * 0.30),
      style: { width: '140px', height: '10px' }
    });
    const lineHome = 140;
    const pLine = {
      el: line,
      home: () => Math.abs(line.offsetWidth - lineHome) < 11,
      reset: () => { line.style.width = lineHome + 'px'; }
    };
    ctx.resize(line, {
      mode: 'box', keepRatio: false, min: 70, max: 260,
      onResize() { if (pLine.home()) pLine.reset(); }
    });
    parts.push(pLine);

    /* — the word rotates — */
    const word = ctx.el('div', 'brk-word brk-part', {
      x: Math.round(w * 0.18), y: Math.round(h * 0.66), text: 'NORTH'
    });
    const pWord = { el: word };
    /* No onRotate snap here, for two reasons: ctx.rotate paints once on
       creation, so the callback would run before `spin` exists — and set()
       repaints, which would call the callback again, forever. A tolerance in
       home() does the same job with none of that. */
    const spin = ctx.rotate(word, { start: 0 });
    pWord.home = () => Math.abs(spin.angle()) < 12;
    pWord.reset = () => spin.set(0);
    parts.push(pWord);

    /* — the square changes state — */
    const SHADES = ['is-a', 'is-b', 'is-c'];
    let shade = 0;
    const box = ctx.el('div', 'brk-state brk-part is-a', {
      x: Math.round(w * 0.62), y: Math.round(h * 0.62),
      style: { width: '64px', height: '64px' }
    });
    const pBox = {
      el: box,
      home: () => shade === 0,
      reset: () => { shade = 0; box.classList.remove('is-b', 'is-c'); box.classList.add('is-a'); }
    };
    ctx.on(box, 'click', () => {
      if (done) return;
      shade = (shade + 1) % SHADES.length;
      box.classList.remove('is-a', 'is-b', 'is-c');
      box.classList.add(SHADES[shade]);
      touch(pBox);
    });
    parts.push(pBox);

    parts.forEach(addMemoryDot);

    let done = false;

    /* "has been changed at least once" is worth showing — it is the first half
       of the instruction, and without it the player cannot tell the level is
       listening. The second half stays unexplained. */
    function touch(p) {
      if (p.everChanged) return;
      p.everChanged = true;
      p.dot.classList.add('is-on');
    }

    ctx.frame(() => {
      if (done) return;
      parts.forEach(p => { if (!p.home()) touch(p); });

      const allTouched = parts.every(p => p.everChanged);
      const allHome = parts.every(p => p.home());
      if (!allTouched || !allHome) return;

      done = true;
      parts.forEach(p => p.el.classList.add('is-settled'));

      const card = ctx.el('div', 'brk-said');
      ctx.el('div', 'brk-said-a', { parent: card, text: ctx.t({ en: 'NOTHING CHANGED.', ar: 'لم يتغيّر شيء.' }) });
      const b = ctx.el('div', 'brk-said-b', { parent: card, text: ctx.t({ en: 'BUT EVERYTHING HAPPENED.', ar: 'لكن كل شيء حدث.' }) });
      ctx.after(60, () => card.classList.add('is-on'));
      ctx.after(1300, () => b.classList.add('is-on'));
      ctx.after(3400, () => ctx.solve());
    });
  }
}

]);
