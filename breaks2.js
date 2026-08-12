/* ==========================================================================
   RULESET — Break levels, batch two (B06–B15)
   --------------------------------------------------------------------------
   Same contract as breaks.js: no canonical id, no echoMarkChar, no contact
   with ECHO phase, marks, memory, checksum or the hidden message.

   Each one breaks a different assumption:
     B06  removing is not the only way to stop seeing something
     B07  a flat panel may have a back
     B08  a press can be made of weight instead of a finger
     B09  four problems may be one object
     B10  the obstacle has a size too
     B11  the rope is long enough — for something
     B12  the target can be an absence
     B13  the letters are already right; the viewing is wrong
     B14  shorter is a comparison
     B15  you can move a thing without touching it
   ========================================================================== */

window.RULESET_BREAKS = (window.RULESET_BREAKS || []).concat([

/* ═════════════════════════════════════════════════════════ B06 ═════════ */
{
  routeId: 'B06',
  name: { en: 'Only one', ar: 'واحدة فقط' },
  instruction: { en: 'LEAVE ONLY ONE', ar: 'اترك واحدة فقط' },

  hint: {
    en: 'Removing something is not the only way to stop seeing it.',
    ar: 'الإزالة ليست الطريقة الوحيدة لكي تتوقف عن رؤية شيء.'
  },
  hint2: { en: 'They are identical.', ar: 'إنها متطابقة.' },
  hint3: { en: 'Stack them.', ar: 'كدّسها فوق بعضها.' },
  note: { en: 'One is what you see, not what is there.', ar: '«واحدة» ما تراه، لا ما هو موجود.' },

  setup(ctx) {
    const { w, h } = ctx.size();
    const D = 54;

    /* Five of exactly the same thing. Nothing here can be deleted, and the
       instruction never asked for deletion — only for what is left visible. */
    const SPOTS = [
      [0.16, 0.24], [0.74, 0.22], [0.46, 0.50], [0.20, 0.74], [0.76, 0.72]
    ];
    const discs = SPOTS.map(([px, py]) => ctx.el('div', 'brk-clone grab', {
      x: Math.round(w * px - D / 2), y: Math.round(h * py - D / 2),
      style: { width: D + 'px', height: D + 'px' }
    }));

    /* Generous magnetism: landing near another copy snaps flush onto it, so
       "stacked" is never a test of the player's aim. */
    discs.forEach(disc => ctx.drag(disc, {
      affordance: false, bounds: 'stage',
      magnet: () => discs.filter(d => d !== disc),
      magnetRadius: 52, magnetPull: 0.85
    }));

    let done = false;
    ctx.frame(() => {
      if (done) return;
      const at = discs.map(d => ({ x: d.offsetLeft, y: d.offsetTop }));
      let spread = 0;
      for (let i = 1; i < at.length; i++) {
        spread = Math.max(spread, Math.hypot(at[i].x - at[0].x, at[i].y - at[0].y));
      }
      const one = spread < 14;
      discs.forEach(d => d.classList.toggle('is-one', one));
      if (!one) return;

      done = true;
      ctx.after(520, () => ctx.solve());
    });
  }
},

/* ═════════════════════════════════════════════════════════ B07 ═════════ */
{
  routeId: 'B07',
  name: { en: 'The other side', ar: 'الوجه الآخر' },
  instruction: { en: 'FIND WHAT IS MISSING', ar: 'جد الناقص' },

  hint: { en: 'You have inspected one side.', ar: 'لقد فحصت وجهًا واحدًا.' },
  hint2: { en: 'Is this really a flat panel?', ar: 'هل هذه حقًا لوحة مسطّحة؟' },
  hint3: { en: 'Turn the card over.', ar: 'اقلب البطاقة.' },
  note: { en: 'Objects may have backs.', ar: 'قد يكون للأشياء ظهور.' },

  setup(ctx) {
    const { w, h } = ctx.size();
    const CW = Math.min(300, w - 80), CH = 168;

    const stageCard = ctx.el('div', 'brk-card', {
      x: Math.round(w / 2 - CW / 2), y: Math.round(h / 2 - CH / 2),
      style: { width: CW + 'px', height: CH + 'px' }
    });
    const inner = ctx.el('div', 'brk-card-inner', { parent: stageCard });

    const front = ctx.el('div', 'brk-card-face', { parent: inner });
    ['1', '2', '3', '5'].forEach(n =>
      ctx.el('span', 'brk-num', { parent: front, text: n }));

    const back = ctx.el('div', 'brk-card-face brk-card-back', { parent: inner });
    const answer = ctx.el('button', 'gbtn brk-num-btn', {
      parent: back, text: '4', attrs: { type: 'button' }
    });

    /* Drag horizontally to turn it. A gesture rather than a button, because a
       "flip" button would announce that there is a back. */
    let turn = 0, live = false, startX = 0, startTurn = 0, done = false;
    let facing = false;              /* true once the back is towards the player */
    const paint = () => {
      inner.style.transform = 'rotateY(' + turn.toFixed(1) + 'deg)';
      facing = Math.abs(((turn % 360) + 360) % 360 - 180) < 90;
      back.style.pointerEvents = facing ? 'auto' : 'none';
      front.style.pointerEvents = facing ? 'none' : 'auto';
    };
    paint();

    ctx.on(stageCard, 'pointerdown', e => {
      if (done || e.target === answer) return;
      live = true; startX = e.clientX; startTurn = turn;
      stageCard.setPointerCapture && stageCard.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    ctx.on(window, 'pointermove', e => {
      if (!live) return;
      turn = startTurn + (e.clientX - startX) * 0.75;
      paint();
    });
    ctx.on(window, 'pointerup', () => {
      if (!live) return;
      live = false;
      /* settle to whichever face is closer — no half-turned states */
      const norm = ((turn % 360) + 360) % 360;
      turn = norm < 90 || norm >= 270 ? 0 : 180;
      paint();
    });

    /* The rule is "turn it over", so the rule is enforced here and not only by
       pointer-events — a face that is not towards the player cannot be pressed. */
    ctx.on(answer, 'click', () => {
      if (done || !facing) return;
      done = true;
      answer.classList.add('is-on');
      ctx.after(520, () => ctx.solve());
    });
  }
},

/* ═════════════════════════════════════════════════════════ B08 ═════════ */
{
  routeId: 'B08',
  name: { en: 'Weight', ar: 'وزن' },
  instruction: { en: 'PRESS IT', ar: 'اضغطه' },

  hint: { en: 'Your finger is not heavy enough.', ar: 'إصبعك ليس ثقيلًا بما يكفي.' },
  hint2: { en: 'The objects have weight.', ar: 'الأشياء لها وزن.' },
  hint3: { en: 'Put the objects on the button.', ar: 'ضع الأشياء على الزر.' },
  note: { en: 'A press can be made of weight.', ar: 'يمكن للضغط أن يكون وزنًا.' },

  setup(ctx) {
    const { w, h } = ctx.size();
    const PW = Math.min(230, w * 0.42), PH = 74;

    const plate = ctx.el('div', 'brk-plate', {
      x: Math.round(w * 0.72 - PW / 2), y: Math.round(h * 0.56),
      style: { width: PW + 'px', height: PH + 'px' }
    });
    const fill = ctx.el('i', 'brk-plate-fill', { parent: plate });

    /* Mass follows size, so heaviness is legible before anything is moved. */
    const SIZES = [38, 46, 54, 62, 70];
    const START = [[0.10, 0.20], [0.26, 0.62], [0.09, 0.78], [0.34, 0.24], [0.24, 0.42]];
    const mass = el => (el.offsetWidth * el.offsetHeight) / 1000;

    const weights = SIZES.map((s, i) => ctx.el('div', 'brk-weight grab', {
      x: Math.round(w * START[i][0]), y: Math.round(h * START[i][1] - s / 2),
      style: { width: s + 'px', height: s + 'px' }
    }));
    weights.forEach(el => ctx.drag(el, { affordance: false, bounds: 'stage' }));

    /* three of the five, roughly — reachable several different ways */
    const NEED = 8.4;

    /* pressing it with a pointer does something, and that something is nothing */
    ctx.on(plate, 'pointerdown', () => {
      if (done) return;
      plate.classList.remove('is-poke');
      void plate.offsetWidth;
      plate.classList.add('is-poke');
    });

    let held = 0, done = false;
    ctx.frame(dt => {
      if (done) return;
      let load = 0;
      weights.forEach(el => { if (ctx.hits(el, plate, -10)) load += mass(el); });

      fill.style.width = Math.min(100, (load / NEED) * 100) + '%';
      const enough = load >= NEED;
      plate.classList.toggle('is-loaded', enough);

      held = enough ? held + dt : 0;
      if (held < 0.5) return;

      done = true;
      plate.classList.add('is-down');
      ctx.after(560, () => ctx.solve());
    });
  }
},

/* ═════════════════════════════════════════════════════════ B09 ═════════ */
{
  routeId: 'B09',
  name: { en: 'One move', ar: 'حركة واحدة' },
  instruction: { en: 'SOLVE EVERYTHING IN ONE MOVE', ar: 'حُلَّ كل شيء بحركة واحدة' },

  hint: { en: 'Four problems may be one object.', ar: 'أربع مشكلات قد تكون شيئًا واحدًا.' },
  hint2: { en: 'What moves together?', ar: 'ما الذي يتحرك معًا؟' },
  hint3: { en: 'Move the targets, not the dots.', ar: 'حرّك الأهداف، لا النقاط.' },
  note: { en: 'Four problems were one object.', ar: 'أربع مشكلات كانت شيئًا واحدًا.' },

  setup(ctx) {
    const { w, h } = ctx.size();

    /* The dots are fixed. The rings sit at exactly the same relative offsets,
       so a single translation lands all four at once — there is no arrangement
       to work out, only an object to notice. */
    /* Spacing comes from the stage, so the pair of clusters fits a phone as
       well as a desktop and neither one is ever clipped. */
    const R = 19, M = R + 12;
    const sx = Math.max(58, Math.min(132, Math.round(w * 0.15)));
    const sy = Math.max(52, Math.min(108, Math.round(h * 0.26)));
    const OFFS = [[0, 0], [sx, 0], [0, sy], [sx, sy]];

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const dx = clamp(Math.round(w * 0.22), M, w - sx - M);
    const dy = clamp(Math.round(h * 0.26), M, h - sy - M);

    OFFS.forEach(([ox, oy]) => ctx.el('div', 'obj dot brk-anchor-dot', {
      x: dx + ox - 11, y: dy + oy - 11
    }));

    const gx = clamp(Math.round(w * 0.62), M, w - sx - M);
    const gy = clamp(Math.round(h * 0.62), M, h - sy - M);
    const group = ctx.el('div', 'brk-group', {
      x: gx, y: gy, style: { width: sx + 'px', height: sy + 'px' }
    });
    const rings = OFFS.map(([ox, oy]) => ctx.el('div', 'brk-target-ring', {
      parent: group, x: ox - 19, y: oy - 19
    }));

    /* the drag lives on the group; grabbing any ring bubbles up to it */
    ctx.drag(group, { affordance: false, bounds: 'stage' });

    const dots = [...ctx.stage.querySelectorAll('.brk-anchor-dot')];

    ctx.check(() => {
      /* every ring over its dot, generously — the rings cannot drift apart
         inside the group, so this is one alignment wearing four faces */
      const aligned = rings.every((ring, i) => ctx.dist(ring, dots[i]) < 18);
      rings.forEach(r => r.classList.toggle('is-on', aligned));
      return aligned;
    });
  }
},

/* ═════════════════════════════════════════════════════════ B10 ═════════ */
{
  routeId: 'B10',
  name: { en: 'The hole', ar: 'الفتحة' },
  instruction: { en: 'PUT THE BALL THROUGH THE HOLE', ar: 'أدخل الكرة عبر الفتحة' },

  hint: { en: 'The ball does not have to change.', ar: 'الكرة ليست مضطرة للتغيّر.' },
  hint2: { en: 'The obstacle has a size too.', ar: 'العائق له حجم أيضًا.' },
  hint3: { en: 'Make the hole larger.', ar: 'وسّع الفتحة.' },
  note: { en: 'The obstacle has a size too.', ar: 'العائق له حجم أيضًا.' },

  setup(ctx) {
    const { w, h } = ctx.size();
    /* the ball scales with the stage so there is room to drop it clear of the
       band on a short screen as well as a tall one */
    const BALL = Math.round(Math.max(52, Math.min(76, h * 0.22)));
    const HOLE0 = Math.round(BALL * 0.55);
    const BAND_Y = Math.round(h * 0.54), BAND_H = 16;

    const leftWall = ctx.el('div', 'brk-band', {
      x: 0, y: BAND_Y, style: { height: BAND_H + 'px' }
    });
    const rightWall = ctx.el('div', 'brk-band', {
      y: BAND_Y, style: { height: BAND_H + 'px' }
    });

    /* the gap is an object in its own right, with a resize notch on it */
    const hole = ctx.el('div', 'brk-hole', {
      x: Math.round(w * 0.5 - HOLE0 / 2), y: BAND_Y - 7,
      style: { width: HOLE0 + 'px', height: (BAND_H + 14) + 'px' }
    });

    const layout = () => {
      const hx = hole.offsetLeft, hw = hole.offsetWidth;
      leftWall.style.width = Math.max(0, hx) + 'px';
      rightWall.style.left = (hx + hw) + 'px';
      rightWall.style.width = Math.max(0, w - hx - hw) + 'px';
    };
    layout();

    ctx.resize(hole, {
      mode: 'box', keepRatio: false, min: 24, max: Math.min(220, w - 60),
      onResize: layout
    });

    const ball = ctx.el('div', 'brk-ball grab', {
      x: Math.round(w * 0.5 - BALL / 2), y: Math.round(h * 0.16),
      style: { width: BALL + 'px', height: BALL + 'px' }
    });

    let last = { x: ball.offsetLeft, y: ball.offsetTop };
    const bandTop = BAND_Y, bandBot = BAND_Y + BAND_H;
    /* -1 above the band, +1 below it, 0 touching it */
    const sideOf = y => (y + BALL <= bandTop ? -1 : (y >= bandBot ? 1 : 0));

    ctx.drag(ball, {
      affordance: false, bounds: 'stage',
      onMove() {
        const was = sideOf(last.y), now = sideOf(ball.offsetTop);
        /* One pointer move can be longer than the band is thick, so a swap of
           sides counts as a crossing even when the ball never overlaps it. */
        const crossing = now === 0 || (was !== now && was !== 0 && now !== 0);

        if (crossing) {
          /* it may only pass where the gap is, and only if the gap is
             genuinely wide enough for it */
          const hx = hole.offsetLeft, hw = hole.offsetWidth;
          const fits = hw >= BALL + 2 &&
                       ball.offsetLeft >= hx - 2 &&
                       ball.offsetLeft + BALL <= hx + hw + 2;
          if (!fits) { ctx.place(ball, last.x, last.y); return; }
        }
        last = { x: ball.offsetLeft, y: ball.offsetTop };
      }
    });

    ctx.check(() => {
      const done = ball.offsetTop > BAND_Y + BAND_H;
      hole.classList.toggle('is-open', hole.offsetWidth >= BALL + 2);
      return done;
    });
  }
},

/* ═════════════════════════════════════════════════════════ B11 ═════════ */
{
  routeId: 'B11',
  name: { en: 'Tether', ar: 'حبل' },
  instruction: { en: 'REACH THE TARGET', ar: 'ابلغ الهدف' },

  hint: { en: 'The rope is long enough for something.', ar: 'الحبل طويل بما يكفي لشيء ما.' },
  hint2: { en: 'Where does the rope begin?', ar: 'من أين يبدأ الحبل؟' },
  hint3: { en: 'Move the anchor.', ar: 'حرّك نقطة التثبيت.' },
  note: { en: 'The rope was never the limit.', ar: 'لم يكن الحبل هو الحدّ.' },

  setup(ctx) {
    const { w, h } = ctx.size();
    const LEN = Math.round(Math.min(150, w * 0.24));

    const goal = ctx.el('div', 'slot', {
      style: {
        width: '58px', height: '58px',
        left: Math.round(w * 0.82 - 29) + 'px', top: Math.round(h * 0.5 - 29) + 'px'
      }
    });

    const rope = ctx.el('div', 'brk-rope');
    const anchor = ctx.el('div', 'brk-anchorpt grab', {
      x: Math.round(w * 0.16) - 11, y: Math.round(h * 0.5) - 11
    });
    const bead = ctx.el('div', 'brk-bead grab', {
      x: Math.round(w * 0.16 + LEN) - 15, y: Math.round(h * 0.5) - 15
    });

    const mid = el => ({ x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2 });

    /* the bead can go anywhere the rope permits, and no further */
    const leash = () => {
      const a = mid(anchor), b = mid(bead);
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      if (d <= LEN) return;
      const k = LEN / d;
      ctx.place(bead, Math.round(a.x + (b.x - a.x) * k - 15),
                      Math.round(a.y + (b.y - a.y) * k - 15));
    };

    ctx.drag(anchor, { affordance: false, bounds: 'stage', onMove: leash });
    ctx.drag(bead, { affordance: false, bounds: 'stage', onMove: leash });

    ctx.frame(() => {
      leash();
      const a = mid(anchor), b = mid(bead);
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      rope.style.left = a.x + 'px';
      rope.style.top = a.y + 'px';
      rope.style.width = d + 'px';
      rope.style.transform = 'rotate(' + Math.atan2(b.y - a.y, b.x - a.x) + 'rad)';
      rope.classList.toggle('is-taut', d > LEN - 2);
    });

    ctx.check(() => {
      const on = ctx.hits(bead, goal, -14);
      goal.classList.toggle('is-hot', on);
      return on;
    });
  }
},

/* ═════════════════════════════════════════════════════════ B12 ═════════ */
{
  routeId: 'B12',
  name: { en: 'The triangle', ar: 'المثلث' },
  instruction: { en: 'FIND THE TRIANGLE', ar: 'جد المثلث' },

  hint: { en: 'Do not only inspect the objects.', ar: 'لا تفحص الأشياء وحدها.' },
  hint2: { en: 'Look at the space they create.', ar: 'انظر إلى الفراغ الذي تصنعه.' },
  hint3: {
    en: 'Press the empty triangle between the circles.',
    ar: 'اضغط المثلث الفارغ بين الدوائر.'
  },
  note: { en: 'The target was an absence.', ar: 'كان الهدف غيابًا.' },

  setup(ctx) {
    const { w, h } = ctx.size();
    /* A triangle of discs is taller above its centre than below it, so size R
       from the whole 4.13R × 4.47R footprint and then centre that footprint —
       not the centre point — or the top disc runs off the stage. */
    const M = 16;
    const R = Math.round(Math.min(92, w * 0.16, (h - 2 * M) / 4.13, (w - 2 * M) / 4.47));
    const reach = Math.round(R * 1.42);
    const cx = Math.round(w * 0.5);
    const cy = Math.round(M + (h - 2 * M - (reach * 1.5 + 2 * R)) / 2 + reach + R);

    /* Three discs close enough that the gap between them reads as one shape.
       Nothing is drawn in that gap — the triangle is genuinely absent. */
    const P = [
      [cx, cy - reach],
      [cx - reach * 0.87, cy + reach * 0.5],
      [cx + reach * 0.87, cy + reach * 0.5]
    ];
    const discs = P.map(([x, y]) => ctx.el('div', 'brk-blob', {
      x: Math.round(x - R), y: Math.round(y - R),
      style: { width: (R * 2) + 'px', height: (R * 2) + 'px' }
    }));

    let done = false;

    ctx.on(ctx.stage, 'pointerdown', e => {
      if (done) return;
      const s = ctx.rect(ctx.stage);
      const x = e.clientX - s.left, y = e.clientY - s.top;

      /* inside a disc is not the answer, however close to the middle */
      const onDisc = P.some(([px, py]) => Math.hypot(x - px, y - py) < R);
      const inGap = Math.hypot(x - cx, y - cy) < R * 0.62;

      if (onDisc || !inGap) {
        discs.forEach(d => {
          d.classList.remove('is-nudge');
          void d.offsetWidth;
          d.classList.add('is-nudge');
        });
        return;
      }

      done = true;
      /* only now is the shape drawn, confirming what was already there */
      ctx.el('div', 'brk-triangle', {
        style: {
          left: (cx - reach) + 'px', top: (cy - reach) + 'px',
          width: (reach * 2) + 'px', height: (reach * 2) + 'px'
        }
      });
      ctx.after(760, () => ctx.solve());
    });
  }
},

/* ═════════════════════════════════════════════════════════ B13 ═════════ */
{
  routeId: 'B13',
  name: { en: 'Mirror', ar: 'مرآة' },
  instruction: { en: 'MAKE THIS READ CORRECTLY', ar: 'اجعل هذا يُقرأ صحيحًا' },

  hint: { en: 'The letters may already be correct.', ar: 'قد تكون الحروف صحيحة أصلًا.' },
  hint2: { en: 'Change how you see them.', ar: 'غيّر طريقة رؤيتك لها.' },
  hint3: { en: 'Use the mirror.', ar: 'استخدم المرآة.' },
  note: { en: 'The letters were right all along.', ar: 'كانت الحروف صحيحة طوال الوقت.' },

  setup(ctx) {
    const { w, h } = ctx.size();

    /* The word is the game's own name, written facing away from the player.
       Every letter is already correct; only the side it is seen from is not. */
    const WORD = 'RULESET';

    const MW = Math.min(300, w - 40), MH = 86;
    const word = ctx.el('div', 'brk-word', {
      x: Math.round(w * 0.5 - 130), y: Math.round(h * 0.10),
      style: { width: '260px' }
    });
    ctx.el('div', 'brk-glyphs', { parent: word, text: WORD });

    const mirror = ctx.el('div', 'brk-mirror grab', {
      x: Math.round(w * 0.5 - MW / 2), y: h - MH - 10,
      style: { width: MW + 'px', height: MH + 'px' }
    });
    /* A reflection is the flip of whatever it faces — and what it faces is
       already flipped, so the two cancel and the name comes out readable. */
    const reflection = ctx.el('div', 'brk-reflection', { parent: mirror });
    ctx.el('div', 'brk-glyphs', { parent: reflection, text: WORD });

    ctx.drag(mirror, { affordance: false, bounds: 'stage' });

    let done = false;
    ctx.frame(() => {
      if (done) return;
      /* the mirror shows only what it is actually held up to */
      const near = Math.abs(ctx.center(mirror).x - ctx.center(word).x) < 80 &&
                   ctx.dist(mirror, word) < 130;
      mirror.classList.toggle('is-showing', near);
      reflection.style.pointerEvents = near ? 'auto' : 'none';
    });

    ctx.on(reflection, 'click', () => {
      if (done || !mirror.classList.contains('is-showing')) return;
      done = true;
      mirror.classList.add('is-read');
      ctx.after(620, () => ctx.solve());
    });
  }
},

/* ═════════════════════════════════════════════════════════ B14 ═════════ */
{
  routeId: 'B14',
  name: { en: 'Shorter', ar: 'أقصر' },
  instruction: {
    en: 'MAKE A SHORTER THAN B WITHOUT CHANGING A',
    ar: 'اجعل A أقصر من B دون تغيير A'
  },

  hint: { en: 'Shorter is a comparison.', ar: '«أقصر» مقارنة.' },
  hint2: { en: 'A does not have to change.', ar: 'ليس على A أن يتغيّر.' },
  hint3: { en: 'Make B longer.', ar: 'اجعل B أطول.' },
  note: { en: 'Shorter is a comparison.', ar: '«أقصر» مقارنة.' },

  setup(ctx) {
    const { w, h } = ctx.size();
    const AW = Math.round(Math.min(280, w * 0.52));
    const x0 = Math.round(w * 0.5 - AW / 2);

    const rowA = ctx.el('div', 'brk-measure', {
      x: x0, y: Math.round(h * 0.38), style: { width: AW + 'px' }
    });
    ctx.el('span', 'brk-tag', { parent: rowA, text: 'A' });

    const rowB = ctx.el('div', 'brk-measure is-b', {
      x: x0, y: Math.round(h * 0.60), style: { width: Math.round(AW * 0.45) + 'px' }
    });
    ctx.el('span', 'brk-tag', { parent: rowB, text: 'B' });

    /* only B yields; A has no handle at all */
    ctx.resize(rowB, {
      mode: 'box', keepRatio: false,
      min: 60, max: Math.max(120, w - x0 - 30)
    });

    ctx.check(() => {
      const longer = rowB.offsetWidth > rowA.offsetWidth;
      rowA.classList.toggle('is-done', longer);
      rowB.classList.toggle('is-done', longer);
      return longer;
    });
  }
},

/* ═════════════════════════════════════════════════════════ B15 ═════════ */
{
  routeId: 'B15',
  name: { en: 'Magnet', ar: 'مغناطيس' },
  instruction: {
    en: 'MOVE THE DOT TO THE TARGET WITHOUT TOUCHING IT',
    ar: 'حرّك النقطة إلى الهدف دون لمسها'
  },

  hint: {
    en: 'You can affect something without touching it.',
    ar: 'يمكنك التأثير في شيء دون لمسه.'
  },
  hint2: { en: 'One object has a field.', ar: 'أحد الأشياء له مجال.' },
  hint3: { en: 'Guide it using the magnet.', ar: 'وجّهها بالمغناطيس.' },
  note: { en: 'Force reaches where a hand does not.', ar: 'القوة تبلغ حيث لا تبلغ اليد.' },

  setup(ctx) {
    const { w, h } = ctx.size();
    const RANGE = 190, PULL = 620;

    const goal = ctx.el('div', 'slot', {
      style: {
        width: '62px', height: '62px',
        left: Math.round(w * 0.80 - 31) + 'px', top: Math.round(h * 0.5 - 31) + 'px'
      }
    });

    const dot = ctx.el('div', 'obj dot brk-iron', {
      x: Math.round(w * 0.18), y: Math.round(h * 0.5 - 11)
    });
    /* deliberately without .grab: the instruction forbids touching it, and the
       affordance vocabulary must not promise something the rules refuse */
    ctx.on(dot, 'pointerdown', e => {
      e.preventDefault();
      dot.classList.remove('is-refuse');
      void dot.offsetWidth;
      dot.classList.add('is-refuse');
    });

    const magnet = ctx.el('div', 'brk-magnet grab', {
      x: Math.round(w * 0.42), y: Math.round(h * 0.74)
    });
    ctx.el('i', 'brk-field', { parent: magnet, style: { width: (RANGE * 2) + 'px', height: (RANGE * 2) + 'px' } });
    ctx.drag(magnet, { affordance: false, bounds: 'stage' });

    const state = { x: dot.offsetLeft + 11, y: dot.offsetTop + 11, vx: 0, vy: 0 };
    let held = 0, done = false;

    ctx.frame(dt => {
      if (done) return;
      const m = { x: magnet.offsetLeft + 21, y: magnet.offsetTop + 21 };
      const dx = m.x - state.x, dy = m.y - state.y;
      const d = Math.hypot(dx, dy) || 1;

      /* Soft, capped attraction that fades to nothing at the field's edge, with
         heavy damping so the dot settles instead of orbiting. */
      if (d < RANGE) {
        const strength = PULL * (1 - d / RANGE);
        state.vx += (dx / d) * strength * dt;
        state.vy += (dy / d) * strength * dt;
      }
      const damp = Math.exp(-2.8 * dt);
      state.vx *= damp; state.vy *= damp;

      const sp = Math.hypot(state.vx, state.vy);
      if (sp > 300) { state.vx *= 300 / sp; state.vy *= 300 / sp; }

      state.x = Math.max(11, Math.min(w - 11, state.x + state.vx * dt));
      state.y = Math.max(11, Math.min(h - 11, state.y + state.vy * dt));
      ctx.place(dot, Math.round(state.x - 11), Math.round(state.y - 11));

      const on = ctx.hits(dot, goal, -12);
      goal.classList.toggle('is-hot', on);
      held = on ? held + dt : 0;
      if (held < 0.5) return;

      done = true;
      goal.classList.add('is-done');
      ctx.after(560, () => ctx.solve());
    });
  }
}

]);
