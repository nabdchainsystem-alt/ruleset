/* ==========================================================================
   RULESET — Break levels B16–B25
   --------------------------------------------------------------------------
   Third batch of the puzzles interleaved through Season II. Each one breaks an
   assumption rather than testing dexterity: what is movable, where the world
   ends, which of the two things the instruction is really about.

   No `id` and no `echoMarkChar` on any of these — a Break level takes no part
   in ECHO's phase, marks, memory, checksum or hidden message, and route.js is
   written so that it cannot.
   ========================================================================== */

window.RULESET_BREAKS = (window.RULESET_BREAKS || []).concat([

/* ═════════════════════════════════════════════════════════ B16 ═════════ */
{
  routeId: 'B16',
  name: { en: 'All at once', ar: 'كلها دفعة واحدة' },
  instruction: { en: 'PRESS ALL FOUR AT ONCE', ar: 'اضغط الأربعة معًا' },

  hint: { en: 'You do not need four fingers.', ar: 'لست بحاجة إلى أربعة أصابع.' },
  hint2: { en: 'One object can touch several things.', ar: 'شيء واحد يمكنه ملامسة عدة أشياء.' },
  hint3: {
    en: 'Lay the plate over all four pads at once.',
    ar: 'ضع اللوح فوق الأربعة معًا.'
  },
  note: { en: 'One thing can be in four places.', ar: 'شيء واحد يكون في أربعة أماكن.' },

  setup(ctx) {
    const { w, h } = ctx.size();

    /* Four pads, gathered to the left so the plate has somewhere to sit that is
       clear of all of them. Sizing is left to the stylesheet, so the
       narrow-screen rule still governs on a phone. */
    const SPOTS = [[0.10, 0.16], [0.34, 0.14], [0.11, 0.46], [0.35, 0.48]];
    const pads = SPOTS.map(([fx, fy]) => ctx.el('div', 'brk-pad', {
      x: Math.round(w * fx), y: Math.round(h * fy)
    }));

    /* The plate is measured from where the pads actually landed, so it always
       spans them whatever the stage turns out to be. */
    const P = pads[0].offsetWidth;
    const x0 = Math.min(...pads.map(p => p.offsetLeft));
    const y0 = Math.min(...pads.map(p => p.offsetTop));
    const x1 = Math.max(...pads.map(p => p.offsetLeft)) + P;
    const y1 = Math.max(...pads.map(p => p.offsetTop)) + P;
    const M = 11;                                   // margin of forgiveness

    const pw = x1 - x0 + M * 2, ph = y1 - y0 + M * 2;
    const plate = ctx.el('div', 'brk-press grab', {
      x: Math.max(x1 + 12, w - pw - 14),              // parked clear of every pad
      y: Math.round((h - ph) / 2),
      style: { width: pw + 'px', height: ph + 'px' }
    });

    ctx.drag(plate, { affordance: false, bounds: 'stage' });

    /* Covered, not merely touched: a corner clipping a pad must not count, or
       the winning moment looks like an accident. */
    const covers = p => {
      const a = ctx.rect(plate), b = ctx.rect(p);
      return b.left > a.left - 4 && b.right < a.right + 4 &&
             b.top > a.top - 4 && b.bottom < a.bottom + 4;
    };

    let done = false;
    ctx.check(() => {
      if (done) return false;
      const on = pads.map(covers);
      pads.forEach((p, i) => p.classList.toggle('is-down', on[i]));
      if (!on.every(Boolean)) return false;

      done = true;
      ctx.place(plate, x0 - M, y0 - M);              // settle it square
      pads.forEach(p => p.classList.add('is-done'));
      plate.classList.add('is-done');
      ctx.after(520, () => ctx.solve());
      return false;
    });
  }
},

/* ═════════════════════════════════════════════════════════ B17 ═════════ */
{
  routeId: 'B17',
  name: { en: 'The other side', ar: 'الجهة الأخرى' },
  instruction: { en: 'REACH THE OTHER SIDE', ar: 'اِبلغ الجهة الأخرى' },

  hint: { en: 'The wall blocks the path, not the world.', ar: 'الجدار يسدّ الطريق، لا العالم.' },
  hint2: { en: 'Where does the screen end?', ar: 'أين تنتهي الشاشة؟' },
  hint3: { en: 'Try leaving through an outer edge.', ar: 'جرّب الخروج من إحدى الحواف.' },
  note: { en: 'The world had no edges.', ar: 'العالم بلا حواف.' },

  setup(ctx) {
    const { w, h } = ctx.size();
    const wallX = Math.round(w * 0.54);

    ctx.el('div', 'brk-barrier', { style: { left: wallX + 'px' } });
    const goal = ctx.el('div', 'slot', {
      style: {
        width: '54px', height: '54px',
        left: Math.round(w * 0.80) + 'px', top: Math.round(h * 0.5 - 27) + 'px'
      }
    });

    const dot = ctx.el('div', 'obj dot grab', {
      x: Math.round(w * 0.22), y: Math.round(h * 0.5 - 11)
    });
    const D = dot.offsetWidth;

    /* The same object drawn at the opposite edge as you approach one — the
       only warning the player gets that the two edges are the same place. */
    const ghost = ctx.el('div', 'brk-ghost', {
      style: { width: D + 'px', height: D + 'px' }
    });
    const edgeL = ctx.el('div', 'brk-edge is-left');
    const edgeR = ctx.el('div', 'brk-edge is-right');

    let live = false, grabX = 0, grabY = 0, pid = null;
    let x = dot.offsetLeft, y = dot.offsetTop;

    const wrapX = v => ((v % w) + w) % w;

    /* The wall is genuinely solid. Landing inside it is refused, and so is
       jumping clean over it — a fast enough flick would otherwise tunnel
       through and quietly cash in the level's one real rule. */
    const blocked = nx => nx + D > wallX - 2 && nx < wallX + 16;
    const step = nx => {
      if (blocked(nx)) return x;
      if (Math.abs(nx - x) > w / 2) return nx;            // went round the edge
      if (x + D <= wallX - 2 && nx >= wallX + 16) return wallX - 2 - D;
      if (x >= wallX + 16 && nx + D <= wallX - 2) return wallX + 16;
      return nx;
    };

    const FADE = 72;
    const paint = () => {
      ctx.place(dot, Math.round(x), Math.round(y));
      const dl = x, dr = w - D - x;
      const near = Math.min(dl, dr);
      if (near < FADE) {
        ctx.place(ghost, Math.round(dl < dr ? x + w : x - w), Math.round(y));
        ghost.style.opacity = String(0.5 * (1 - near / FADE));
      } else ghost.style.opacity = '0';
      edgeL.style.opacity = dl < FADE ? '1' : '0';
      edgeR.style.opacity = dr < FADE ? '1' : '0';
    };
    paint();

    /* Hand-rolled pointer handling. ctx.drag captures its grab origin once, so
       it cannot teleport an element mid-gesture — and teleporting is the whole
       puzzle. */
    ctx.on(dot, 'pointerdown', e => {
      live = true; pid = e.pointerId;
      try { dot.setPointerCapture(pid); } catch (err) { /* capture is optional */ }
      const s = ctx.rect(ctx.stage);
      grabX = (e.clientX - s.left) - x;
      grabY = (e.clientY - s.top) - y;
      dot.classList.add('is-dragging');
      e.preventDefault();
    });

    ctx.on(window, 'pointermove', e => {
      if (!live || e.pointerId !== pid) return;
      const s = ctx.rect(ctx.stage);
      x = step(wrapX((e.clientX - s.left) - grabX));
      y = Math.max(0, Math.min(h - D, (e.clientY - s.top) - grabY));
      paint();
    });

    const release = e => {
      if (!live || (e.pointerId != null && e.pointerId !== pid)) return;
      live = false; pid = null;
      dot.classList.remove('is-dragging');
    };
    ctx.on(window, 'pointerup', release);
    ctx.on(window, 'pointercancel', release);

    ctx.check(() => {
      const on = ctx.hits(dot, goal, -8);
      goal.classList.toggle('is-hot', on);
      return on;
    });
  }
},

/* ═════════════════════════════════════════════════════════ B18 ═════════ */
{
  routeId: 'B18',
  name: { en: 'Cursor trap', ar: 'مصيدة المؤشر' },
  instruction: {
    en: 'PUT THE POINTER INSIDE THE CIRCLE WITHOUT CROSSING ITS EDGE.',
    ar: 'ضع المؤشر داخل الدائرة دون أن تعبر حافتها.'
  },

  hint: { en: 'The pointer is not the only movable thing.', ar: 'المؤشر ليس الشيء المتحرك الوحيد.' },
  hint2: { en: 'Inside is relative.', ar: '«في الداخل» أمر نسبي.' },
  hint3: { en: 'Move the circle onto the pointer.', ar: 'حرّك الدائرة فوق المؤشر.' },
  note: { en: 'You are an object too.', ar: 'أنت أيضًا شيء.' },

  setup(ctx) {
    const { w, h } = ctx.size();
    const R = Math.round(Math.min(88, Math.min(w * 0.26, h * 0.30)));

    const lens = ctx.el('div', 'brk-lens grab', {
      x: Math.min(Math.round(w * 0.62), w - R * 2 - 10),   // never off the edge
      y: Math.round(h * 0.5 - R),
      style: { width: (R * 2) + 'px', height: (R * 2) + 'px' }
    });
    const tip = ctx.el('div', 'brk-pointer', {
      x: Math.round(w * 0.18), y: Math.round(h * 0.5 - 11)
    });
    const T = tip.offsetWidth / 2;

    const gapFrom = (tx, ty) => Math.hypot(
      tx + T - (lens.offsetLeft + R),
      ty + T - (lens.offsetTop + R)
    );
    const gap = () => gapFrom(tip.offsetLeft, tip.offsetTop);

    ctx.drag(lens, { affordance: false, bounds: 'stage' });

    const RIM = 14;
    const outside = gap() > R;                      // the side the rim traps
    const allow = (nx, ny) => {
      const d = gapFrom(nx, ny);
      return outside ? d > R + RIM : d < R - RIM;
    };

    let bumping = false, done = false;
    const bump = () => {
      if (bumping) return;
      bumping = true;
      tip.classList.add('is-blocked');
      ctx.after(320, () => { tip.classList.remove('is-blocked'); bumping = false; });
    };

    let last = { x: tip.offsetLeft, y: tip.offsetTop };

    /* Touch drags it directly. */
    ctx.drag(tip, {
      affordance: false, bounds: 'stage',
      onGrab() { last = { x: tip.offsetLeft, y: tip.offsetTop }; },
      onMove() {
        if (allow(tip.offsetLeft, tip.offsetTop)) {
          last = { x: tip.offsetLeft, y: tip.offsetTop };
        } else {
          ctx.place(tip, last.x, last.y);
          bump();
        }
      }
    });

    /* On a mouse it also trails the real cursor while nothing is held down, so
       the trap is felt rather than described. */
    ctx.on(ctx.stage, 'pointermove', e => {
      if (done || e.buttons) return;                // something is being dragged
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const s = ctx.rect(ctx.stage);
      const nx = Math.max(0, Math.min(w - T * 2, e.clientX - s.left - T));
      const ny = Math.max(0, Math.min(h - T * 2, e.clientY - s.top - T));
      if (!allow(nx, ny)) { bump(); return; }
      last = { x: nx, y: ny };
      ctx.place(tip, nx, ny);
    });

    ctx.check(() => {
      if (done) return false;
      const inside = gap() < R - RIM - 2;
      lens.classList.toggle('is-hot', inside);
      if (!inside) return false;
      done = true;
      return true;
    });
  }
},

/* ═════════════════════════════════════════════════════════ B19 ═════════ */
{
  routeId: 'B19',
  name: { en: "Don't let it fall", ar: 'لا تدعه يسقط' },
  instruction: { en: "DON'T LET IT FALL", ar: 'لا تدعه يسقط' },

  hint: { en: 'You cannot control the falling object.', ar: 'لا يمكنك التحكم بالشيء الساقط.' },
  hint2: { en: 'What can meet it?', ar: 'ما الذي يمكنه ملاقاته؟' },
  hint3: {
    en: 'Drag the ground upward — catching it down in the dark does not count.',
    ar: 'اسحب الأرض إلى أعلى — والتقاطه في العتمة لا يُحتسب.'
  },
  note: { en: 'Move the ground, not the thing.', ar: 'حرّك الأرض لا الشيء.' },

  setup(ctx) {
    const { w, h } = ctx.size();
    const BAND = Math.round(Math.min(80, h * 0.22));      // the losing depth
    const floorW = Math.round(Math.min(200, w * 0.46));

    ctx.el('div', 'brk-danger', { style: { bottom: '0', height: BAND + 'px' } });

    const floor = ctx.el('div', 'brk-floor grab', {
      x: Math.round(w * 0.5 - floorW / 2), y: Math.round(h - 22),
      style: { width: floorW + 'px' }
    });

    const obj = ctx.el('div', 'brk-faller');
    const D = obj.offsetWidth;
    const fx = Math.round(w * 0.5 - D / 2);
    ctx.place(obj, fx, -D);

    /* Vertical only: the ground may rise, it may never chase sideways. */
    const TOP = D + 14, BOTTOM = h - 10;
    ctx.drag(floor, {
      affordance: false, axis: 'y',
      onMove() {
        const t = parseFloat(floor.style.top) || 0;
        const c = Math.max(TOP, Math.min(BOTTOM, t));
        if (c !== t) floor.style.top = c + 'px';
      }
    });

    const G = 150;                                        // slow enough to be fair
    let y = -D, v = 0, resting = false, held = 0, sunk = 0, done = false;

    const drop = () => {
      y = -D; v = 0; resting = false; held = 0; sunk = 0;
      obj.classList.remove('is-safe');
      floor.classList.remove('is-safe');
    };

    ctx.frame(dt => {
      if (done) return;
      const top = floor.offsetTop;

      if (resting) {
        y = top - D;                                      // ride the ground up
      } else {
        const wasBottom = y + D;
        v += G * dt;
        y += v * dt;
        if (wasBottom <= top && y + D >= top) { y = top - D; v = 0; resting = true; }
      }
      ctx.place(obj, fx, Math.round(y));

      if (y > h + 40) { drop(); return; }                 // fell past everything
      if (!resting) return;

      const safe = top < h - BAND;
      obj.classList.toggle('is-safe', safe);
      floor.classList.toggle('is-safe', safe);

      if (!safe) {
        /* caught, but down in the dark — hand it back rather than demand a
           Restart, so the lesson can be learned by trying */
        held = 0; sunk += dt;
        if (sunk > 0.9) drop();
        return;
      }

      sunk = 0; held += dt;
      if (held < 0.6) return;
      done = true;
      ctx.after(420, () => ctx.solve());
    });
  }
},

/* ═════════════════════════════════════════════════════════ B20 ═════════ */
{
  routeId: 'B20',
  name: { en: 'Brake', ar: 'مكبح' },
  instruction: { en: 'STOP IT ON THE MARK', ar: 'أوقفه عند العلامة' },

  hint: { en: 'Stopping something does not require grabbing it.', ar: 'إيقاف شيء لا يستلزم الإمساك به.' },
  hint2: { en: 'Change the surface.', ar: 'غيّر السطح.' },
  hint3: { en: 'Move the rough patch into its path.', ar: 'ضع الرقعة الخشنة في مساره.' },
  note: { en: 'Change the road, not the car.', ar: 'غيّر الطريق لا السيارة.' },

  setup(ctx) {
    const { w, h } = ctx.size();
    const trackY = Math.round(h * 0.52);
    const markW = Math.round(Math.min(96, w * 0.24));
    const markX = Math.round(w * 0.64);
    const patchW = Math.round(Math.min(110, w * 0.27));

    ctx.el('div', 'brk-track', {
      style: { left: '6%', right: '6%', top: trackY + 'px' }
    });
    const mark = ctx.el('div', 'brk-mark', {
      x: markX, y: trackY - 24,
      style: { width: markW + 'px', height: '46px' }
    });
    /* it sits on the road, not beside it — a stretch of surface, not a tool */
    const patch = ctx.el('div', 'brk-patch grab', {
      x: Math.round(w * 0.14), y: trackY + 3,
      style: { width: patchW + 'px', height: '15px' }
    });
    const box = ctx.el('div', 'brk-slider');
    const S = box.offsetWidth;
    const startX = Math.round(w * 0.05);
    ctx.place(box, startX, trackY - S);

    ctx.drag(patch, { affordance: false, bounds: 'stage' });

    /* 150 px/s into 260 px/s² stops it in ~43px — shorter than the patch, so
       once the box is on the patch the patch always finishes the job. */
    const V0 = 150, DECEL = 260;
    let x = startX, v = V0, wait = 0, done = false;

    const relaunch = () => {
      x = startX; v = V0; wait = 0;
      mark.classList.remove('is-done');
      box.classList.remove('is-done');
      ctx.place(box, x, trackY - S);
    };

    ctx.frame(dt => {
      if (done) return;

      if (v > 0) {
        const pl = patch.offsetLeft, pr = pl + patch.offsetWidth;
        if (x + S > pl && x < pr) v = Math.max(0, v - DECEL * dt);
        x += v * dt;
        ctx.place(box, Math.round(x), trackY - S);
        if (x > w + 20) { relaunch(); return; }
        if (v > 0) return;

        const c = x + S / 2;
        if (c >= markX && c <= markX + markW) {
          done = true;
          mark.classList.add('is-done');
          box.classList.add('is-done');
          ctx.after(560, () => ctx.solve());
          return;
        }
      }

      /* stopped short, or never stopped at all: send it round again */
      wait += dt;
      if (wait > 1.1) relaunch();
    });
  }
},

/* ═════════════════════════════════════════════════════════ B21 ═════════ */
{
  routeId: 'B21',
  name: { en: 'Chain', ar: 'سلسلة' },
  instruction: {
    en: 'MOVE THE BALL WITHOUT TOUCHING IT',
    ar: 'حرّك الكرة دون أن تلمسها'
  },

  hint: { en: 'You only control the first event.', ar: 'أنت تتحكم بالحدث الأول فقط.' },
  hint2: { en: 'Objects can move other objects.', ar: 'الأشياء تحرّك أشياء أخرى.' },
  hint3: {
    en: 'Drag the first piece until it touches the next one, then let go.',
    ar: 'اسحب القطعة الأولى حتى تلامس التالية، ثم أفلتها.'
  },
  note: { en: 'One push, many movements.', ar: 'دفعة واحدة، حركات كثيرة.' },

  setup(ctx) {
    const { w, h } = ctx.size();
    const N = 5;
    const DH = Math.round(Math.min(64, h * 0.19));
    const baseY = Math.round(h * 0.62);
    const step = Math.round(Math.min(38, w * 0.09));
    const x0 = Math.round(w * 0.14);

    /* Upright, evenly spaced, leaning toward nothing. The arrangement is the
       only instruction the player needs about which end starts. */
    const line = [];
    for (let i = 0; i < N; i++) {
      line.push(ctx.el('div', 'brk-domino' + (i === 0 ? ' grab' : ''), {
        x: x0 + i * step, y: baseY - DH,
        style: { height: DH + 'px' }
      }));
    }
    const DW = line[0].offsetWidth;

    const ballX = x0 + N * step + 12;
    const ball = ctx.el('div', 'brk-roller', { x: ballX, y: baseY - 26 });
    const goalX = Math.round(w * 0.80);
    const goal = ctx.el('div', 'slot', {
      style: {
        width: '52px', height: '52px',
        left: goalX + 'px', top: (baseY - 39) + 'px'
      }
    });

    const home = { x: line[0].offsetLeft, y: line[0].offsetTop };
    let fired = false, done = false;

    /* Scripted, not simulated. A chain reaction should be inevitable once it
       has started, not a physics lottery decided by three pixels. */
    const cascade = () => {
      fired = true;
      line.forEach((d, i) => ctx.after(i * 130, () => { d.style.transform = 'rotate(78deg)'; }));
      ctx.after(N * 130 + 140, () => ctx.place(ball, goalX + 13, baseY - 26));
      ctx.after(N * 130 + 760, () => {
        done = true;
        ball.classList.add('is-done');
        goal.classList.add('is-done');
        ctx.after(480, () => ctx.solve());
      });
    };

    ctx.drag(line[0], {
      affordance: false, bounds: 'stage', enabled: () => !fired && !done,
      onDrop() {
        /* far enough to touch its neighbour → the whole line goes over */
        if (line[0].offsetLeft + DW >= line[1].offsetLeft - 6) { cascade(); return; }
        ctx.place(line[0], home.x, home.y);
      }
    });
  }
},

/* ═════════════════════════════════════════════════════════ B22 ═════════ */
{
  routeId: 'B22',
  name: { en: 'Disappear', ar: 'اختفاء' },
  instruction: { en: 'MAKE THE CIRCLE DISAPPEAR', ar: 'اجعل الدائرة تختفي' },

  hint: { en: 'Disappear does not mean delete.', ar: '«يختفي» لا تعني «يُحذف».' },
  hint2: { en: 'Out of sight is enough.', ar: 'يكفي أن تغيب عن النظر.' },
  hint3: { en: 'Cover it.', ar: 'غطِّها.' },
  note: { en: 'It is still there.', ar: 'ما زالت موجودة.' },

  setup(ctx) {
    const { w, h } = ctx.size();
    const D = Math.round(Math.min(76, Math.min(w * 0.19, h * 0.26)));
    const C = Math.round(D * 1.6);

    const circle = ctx.el('div', 'brk-round', {
      x: Math.round(w * 0.30 - D / 2), y: Math.round(h * 0.5 - D / 2),
      style: { width: D + 'px', height: D + 'px' }
    });

    /* Its face is the stage's own colour. Only the hairline border admits that
       it is an object at all — which is the whole idea of the level. */
    const cover = ctx.el('div', 'brk-cover grab', {
      x: Math.round(w * 0.68 - C / 2), y: Math.round(h * 0.5 - C / 2),
      style: { width: C + 'px', height: C + 'px' }
    });

    ctx.drag(cover, { affordance: false, bounds: 'stage' });

    let done = false;
    ctx.check(() => {
      if (done) return false;
      const a = ctx.rect(circle), b = ctx.rect(cover);
      const hidden = b.left <= a.left + 2 && b.right >= a.right - 2 &&
                     b.top <= a.top + 2 && b.bottom >= a.bottom - 2;
      if (!hidden) return false;

      done = true;
      cover.classList.add('is-done');
      ctx.say(ctx.t({ en: 'still there', ar: 'ما زالت موجودة' }));
      ctx.after(700, () => ctx.solve());
      return false;
    });
  }
},

/* ═════════════════════════════════════════════════════════ B23 ═════════ */
{
  routeId: 'B23',
  name: { en: 'Inside the frame', ar: 'داخل الإطار' },
  instruction: {
    en: 'PUT THE OBJECT INSIDE THE FRAME. DO NOT MOVE THE OBJECT.',
    ar: 'ضع الشيء داخل الإطار. لا تحرّك الشيء.'
  },

  hint: { en: 'The object must not move.', ar: 'الشيء يجب ألا يتحرك.' },
  hint2: { en: 'Inside describes two things.', ar: '«في الداخل» تصف شيئين.' },
  hint3: { en: 'Move the frame.', ar: 'حرّك الإطار.' },
  note: { en: 'Two things make an inside.', ar: 'شيئان يصنعان «داخلًا».' },

  setup(ctx) {
    const { w, h } = ctx.size();
    const F = Math.round(Math.min(160, Math.min(w * 0.38, h * 0.52)));

    const obj = ctx.el('div', 'brk-locked', {
      x: Math.round(w * 0.24), y: Math.round(h * 0.5 - 22)
    });
    const frame = ctx.el('div', 'brk-frame grab', {
      x: Math.min(Math.round(w * 0.62), w - F - 14),   // never against the edge
      y: Math.round(h * 0.5 - F / 2),
      style: { width: F + 'px', height: F + 'px' }
    });

    /* It refuses visibly, so that "locked" reads as intent rather than a bug. */
    let stuck = false;
    ctx.on(obj, 'pointerdown', e => {
      e.preventDefault();
      if (stuck) return;
      stuck = true;
      obj.classList.add('is-stuck');
      ctx.after(320, () => { obj.classList.remove('is-stuck'); stuck = false; });
    });

    ctx.drag(frame, { affordance: false, bounds: 'stage' });

    let done = false;
    ctx.check(() => {
      if (done) return false;
      const a = ctx.rect(obj), b = ctx.rect(frame);
      const inside = a.left > b.left + 3 && a.right < b.right - 3 &&
                     a.top > b.top + 3 && a.bottom < b.bottom - 3;
      frame.classList.toggle('is-hot', inside);
      if (!inside) return false;

      done = true;
      frame.classList.remove('is-hot');
      frame.classList.add('is-done');
      ctx.after(520, () => ctx.solve());
      return false;
    });
  }
},

/* ═════════════════════════════════════════════════════════ B24 ═════════ */
{
  routeId: 'B24',
  name: { en: 'Four corners', ar: 'أربع زوايا' },
  instruction: { en: 'TOUCH ALL FOUR POINTS IN ONE MOVE', ar: 'المس النقاط الأربع بحركة واحدة' },

  hint: { en: 'One object can reach four places.', ar: 'شيء واحد يبلغ أربعة مواضع.' },
  hint2: { en: 'Look at how the points are arranged.', ar: 'انظر إلى ترتيب النقاط.' },
  hint3: {
    en: 'Grow the frame, then lay its four corners on the four points.',
    ar: 'كبّر الإطار، ثم ضع زواياه الأربع على النقاط الأربع.'
  },
  note: { en: 'A rectangle is four places at once.', ar: 'المستطيل أربعة مواضع في آن.' },

  setup(ctx) {
    const { w, h } = ctx.size();

    /* the rectangle the four points imply but never draw */
    const TW = Math.round(Math.min(240, w * 0.50));
    const TH = Math.round(TW * 0.62);
    const tx = Math.round(w * 0.5 - TW / 2);
    const ty = Math.round(h * 0.34 - TH / 2);

    const CORNERS = [[tx, ty], [tx + TW, ty], [tx, ty + TH], [tx + TW, ty + TH]];
    const dots = CORNERS.map(([x, y]) => ctx.el('div', 'brk-corner', { x, y }));

    /* The frame starts at the target's own proportions, so one proportional
       resize can fit it — no two-axis precision, and pinch works on touch. */
    const startW = Math.round(TW * 0.5);
    const frame = ctx.el('div', 'brk-frame grab', {
      x: Math.round(w * 0.06), y: Math.round(h * 0.62),
      style: { width: startW + 'px', height: Math.round(startW * (TH / TW)) + 'px' }
    });

    ctx.drag(frame, { affordance: false, bounds: 'stage' });
    ctx.resize(frame, { mode: 'box', min: 60, max: Math.round(w * 0.94) });

    const TOL = 24;
    let done = false;

    ctx.check(() => {
      if (done) return false;
      const b = ctx.rect(frame), s = ctx.rect(ctx.stage);
      const mine = [
        [b.left - s.left, b.top - s.top],
        [b.right - s.left, b.top - s.top],
        [b.left - s.left, b.bottom - s.top],
        [b.right - s.left, b.bottom - s.top]
      ];
      const met = CORNERS.map((c, i) => Math.hypot(mine[i][0] - c[0], mine[i][1] - c[1]) < TOL);
      dots.forEach((d, i) => d.classList.toggle('is-met', met[i]));
      if (!met.every(Boolean)) return false;

      done = true;
      frame.style.width = TW + 'px';                 // settle it exactly
      frame.style.height = TH + 'px';
      ctx.place(frame, tx, ty);
      frame.classList.add('is-done');
      ctx.after(560, () => ctx.solve());
      return false;
    });
  }
},

/* ═════════════════════════════════════════════════════════ B25 ═════════ */
{
  routeId: 'B25',
  name: { en: 'Above the line', ar: 'فوق الخط' },
  instruction: {
    en: 'PUT THE DOT ABOVE THE LINE. THE DOT MUST NOT CROSS THE LINE.',
    ar: 'ضع النقطة فوق الخط. ويجب ألا تعبر النقطة الخط.'
  },

  hint: { en: 'Above and below depend on the line.', ar: '«فوق» و«تحت» تعتمدان على الخط.' },
  hint2: { en: 'The dot may stay exactly where it is.', ar: 'يمكن للنقطة أن تبقى مكانها تمامًا.' },
  hint3: { en: 'Rotate the line.', ar: 'أدر الخط.' },
  note: { en: 'Above is a direction, not a place.', ar: '«فوق» اتجاه لا مكان.' },

  setup(ctx) {
    const { w, h } = ctx.size();
    const px = Math.round(w * 0.20), py = Math.round(h * 0.42);
    const LEN = Math.round(Math.min(170, w * 0.38));

    const line = ctx.el('div', 'brk-ray', { x: px, y: py - 3, style: { width: LEN + 'px' } });
    ctx.el('div', 'brk-pivot', { x: px, y: py });

    /* Deliberately beyond the line's reach. The line can never sweep through
       the dot, so the side flips without anything ever crossing anything. */
    const dx = Math.round(LEN * 1.5), dy = Math.round(Math.min(120, h * 0.28));
    const dot = ctx.el('div', 'obj dot grab', { x: px + dx, y: py + dy });
    const T = dot.offsetWidth / 2;

    const spin = ctx.rotate(line, { start: 0 });

    /* Which side of the line's direction the dot sits on. Screen y grows
       downward, so a negative cross product means above. */
    const side = () => {
      const a = spin.angle() * Math.PI / 180;
      const vx = (dot.offsetLeft + T) - px;
      const vy = (dot.offsetTop + T) - py;
      return Math.cos(a) * vy - Math.sin(a) * vx;
    };

    /* The dot may be dragged, but it may not change sides, and it may not come
       within reach of the line — otherwise a player could walk it in close and
       then have the line sweep straight through it. Which side counts as legal
       is read when the drag starts, not once at setup: by then the line may
       already have been turned. */
    const REACH = LEN + 34;
    let last = { x: dot.offsetLeft, y: dot.offsetTop }, wasAbove = side() < 0;
    const legal = () => Math.hypot(
      dot.offsetLeft + T - px, dot.offsetTop + T - py
    ) > REACH && (side() < 0) === wasAbove;

    ctx.drag(dot, {
      affordance: false, bounds: 'stage',
      onGrab() {
        last = { x: dot.offsetLeft, y: dot.offsetTop };
        wasAbove = side() < 0;
      },
      onMove() {
        if (legal()) last = { x: dot.offsetLeft, y: dot.offsetTop };
        else ctx.place(dot, last.x, last.y);
      }
    });

    let held = 0, done = false;
    ctx.frame(dt => {
      if (done) return;
      const above = side() < -8;
      dot.classList.toggle('brk-above', above);
      held = above ? held + dt : 0;
      if (held < 0.5) return;
      done = true;
      line.classList.add('is-done');
      ctx.after(480, () => ctx.solve());
    });
  }
}

]);
