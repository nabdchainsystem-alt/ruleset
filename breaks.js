/* ==========================================================================
   RULESET — Break levels
   --------------------------------------------------------------------------
   Thirty puzzles interleaved through Season II so the cipher stops feeling
   like the only thing happening. They are not filler and not spacers: each one
   breaks an assumption the way Season I did.

   A Break level has:
     routeId      'B01'…'B30'  — internal only, never shown to the player
     id           deliberately absent

   No echoMarkChar. No canonical id. Nothing here touches ECHO phase, marks,
   memory, the checksum, or the hidden message — and route.js is written so
   that it cannot.
   ========================================================================== */

window.RULESET_BREAKS = (window.RULESET_BREAKS || []).concat([

/* ═════════════════════════════════════════════════════════ B01 ═════════ */
{
  routeId: 'B01',
  name: { en: 'Balance', ar: 'توازن' },
  instruction: { en: 'MAKE IT BALANCED', ar: 'اجعله متوازنًا' },

  hint: { en: 'Maybe the objects are not the problem.', ar: 'ربما ليست الأشياء هي المشكلة.' },
  hint2: { en: 'What is supporting the beam?', ar: 'ما الذي يسند العارضة؟' },
  hint3: { en: 'Move the balance point.', ar: 'حرّك نقطة الاتزان.' },
  note: { en: 'Change what holds a thing up.', ar: 'غيّر ما يحمل الشيء.' },

  setup(ctx) {
    const { w, h } = ctx.size();
    const beamW = Math.min(540, w - 110);
    const left = Math.round((w - beamW) / 2);
    const midY = Math.round(h * 0.46);

    const beam = ctx.el('div', 'beam', {
      style: { width: beamW + 'px', left: '50%', top: midY + 'px', transform: 'translate(-50%,-50%)' }
    });

    /* Fixed loads, deliberately unequal. They cannot be picked up — the only
       thing that yields is the thing underneath. */
    const LOADS = [[0.08, 46], [0.24, 30], [0.62, 34], [0.86, 54]];
    LOADS.forEach(([at, size]) => {
      ctx.el('div', 'block', {
        parent: beam,
        style: {
          left: Math.round(at * beamW - size / 2) + 'px',
          width: size + 'px', height: size + 'px', cursor: 'default'
        }
      });
    });

    const pivot = ctx.el('div', 'brk-fulcrum grab', {
      x: Math.round(left + beamW * 0.5 - 17), y: midY + 6
    });

    let held = 0, done = false;

    ctx.drag(pivot, {
      affordance: false, axis: 'x',
      clampX: nx => Math.max(left - 4, Math.min(left + beamW - 30, nx))
    });

    ctx.frame(dt => {
      if (done) return;
      /* torque about wherever the fulcrum currently is */
      const fx = pivot.offsetLeft + 17 - left;
      let m = 0;
      LOADS.forEach(([at, size]) => { m += (at * beamW - fx) * size * size; });
      const angle = Math.max(-11, Math.min(11, m / 26000));
      beam.style.transform = 'translate(-50%,-50%) rotate(' + angle.toFixed(2) + 'deg)';

      const level = Math.abs(angle) < 0.8;
      beam.classList.toggle('is-level', level);
      held = level ? held + dt : 0;
      if (held < 0.8) return;

      done = true;
      beam.classList.add('is-done');
      ctx.after(500, () => ctx.solve());
    });
  }
},

/* ═════════════════════════════════════════════════════════ B02 ═════════ */
{
  routeId: 'B02',
  name: { en: 'Shortest path', ar: 'أقصر طريق' },
  instruction: { en: 'TAKE THE SHORTEST PATH', ar: 'اسلك أقصر طريق' },

  hint: { en: 'The maze is not the instruction.', ar: 'المتاهة ليست هي التعليمة.' },
  hint2: { en: 'Which object have you assumed cannot move?', ar: 'أي شيء افترضت أنه لا يتحرك؟' },
  hint3: { en: 'Move the maze.', ar: 'حرّك المتاهة.' },
  note: { en: 'It never said solve the maze.', ar: 'لم تقل قط: حُلَّ المتاهة.' },

  setup(ctx) {
    const { w, h } = ctx.size();

    /* the maze is one object, and nobody said it was scenery */
    const maze = ctx.el('div', 'brk-maze grab', {
      x: Math.round(w * 0.24), y: Math.round(h * 0.16),
      style: { width: '230px', height: '210px' }
    });
    const WALLS = [
      [0, 0, 230, 12], [0, 0, 12, 210], [0, 198, 230, 12], [218, 0, 12, 130],
      [46, 40, 12, 130], [92, 12, 12, 120], [138, 60, 12, 150], [184, 40, 12, 120]
    ];
    WALLS.forEach(([x, y, ww, hh]) => ctx.el('div', 'brk-wall', {
      parent: maze,
      style: { left: x + 'px', top: y + 'px', width: ww + 'px', height: hh + 'px' }
    }));

    const dot = ctx.el('div', 'obj dot grab', {
      x: Math.round(w * 0.30), y: Math.round(h * 0.42)
    });
    const goal = ctx.el('div', 'slot', {
      style: { width: '56px', height: '56px', left: Math.round(w * 0.80) + 'px', top: Math.round(h * 0.5 - 28) + 'px' }
    });

    ctx.drag(maze, { affordance: false, bounds: 'stage' });

    /* the dot simply cannot pass through a wall — no penalty, it just stops */
    let last = { x: dot.offsetLeft, y: dot.offsetTop };
    ctx.drag(dot, {
      affordance: false, bounds: 'stage',
      onMove() {
        const blocked = [...maze.children].some(wall => ctx.hits(dot, wall, -1));
        if (blocked) ctx.place(dot, last.x, last.y);
        else last = { x: dot.offsetLeft, y: dot.offsetTop };
      }
    });

    ctx.check(() => {
      const on = ctx.hits(dot, goal, -12);
      goal.classList.toggle('is-hot', on);
      return on;
    });
  }
},

/* ═════════════════════════════════════════════════════════ B03 ═════════ */
{
  routeId: 'B03',
  name: { en: 'Inside', ar: 'في الداخل' },
  instruction: {
    en: 'PUT THE DOT INSIDE THE CIRCLE. DO NOT CROSS THE CIRCLE.',
    ar: 'ضع النقطة داخل الدائرة. لا تعبر الدائرة.'
  },

  hint: { en: 'Which object actually has to move?', ar: 'أي شيء يجب أن يتحرك فعلًا؟' },
  hint2: { en: 'Inside is a relationship.', ar: '«في الداخل» علاقة بين شيئين.' },
  hint3: { en: 'Move the circle around the dot.', ar: 'حرّك الدائرة حول النقطة.' },
  note: { en: 'Inside is a relationship.', ar: '«في الداخل» علاقة.' },

  setup(ctx) {
    const { w, h } = ctx.size();
    const R = 88;

    const ring = ctx.el('div', 'brk-ring grab', {
      x: Math.round(w * 0.62), y: Math.round(h * 0.5 - R),
      style: { width: (R * 2) + 'px', height: (R * 2) + 'px' }
    });
    const dot = ctx.el('div', 'obj dot grab', {
      x: Math.round(w * 0.22), y: Math.round(h * 0.5 - 11)
    });

    const centre = () => ({ x: ring.offsetLeft + R, y: ring.offsetTop + R });
    const away = () => {
      const c = centre();
      return Math.hypot(dot.offsetLeft + 11 - c.x, dot.offsetTop + 11 - c.y);
    };

    ctx.drag(ring, { affordance: false, bounds: 'stage' });

    /* the dot may move freely — but the boundary is solid to it, so the only
       way in is for the circle to come to the dot */
    let outside = away() > R;
    let last = { x: dot.offsetLeft, y: dot.offsetTop };
    ctx.drag(dot, {
      affordance: false, bounds: 'stage',
      onMove() {
        const d = away();
        const crossed = outside ? d < R + 12 : d > R - 12;
        if (crossed) ctx.place(dot, last.x, last.y);
        else last = { x: dot.offsetLeft, y: dot.offsetTop };
      }
    });

    ctx.check(() => {
      const inside = away() < R - 14;
      ring.classList.toggle('is-hot', inside);
      return inside;
    });
  }
},

/* ═════════════════════════════════════════════════════════ B04 ═════════ */
{
  routeId: 'B04',
  name: { en: 'Shadow', ar: 'ظل' },
  instruction: { en: 'PRESS THE BUTTON WITHOUT TOUCHING IT', ar: 'اضغط الزر دون أن تلمسه' },

  hint: { en: 'Touch is not the only way to affect something.', ar: 'اللمس ليس الطريقة الوحيدة للتأثير.' },
  hint2: {
    en: 'The lamp casts a shadow, and a shadow reaches further than you can.',
    ar: 'المصباح يُلقي ظلًا، والظل يبلغ أبعد مما تبلغ.'
  },
  hint3: {
    en: 'Stand the block between the lamp and the sensor.',
    ar: 'ضع الكتلة بين المصباح والمستشعر.'
  },
  note: { en: 'A shadow reaches further than a hand.', ar: 'الظل يبلغ أبعد من اليد.' },

  setup(ctx) {
    const { w, h } = ctx.size();

    const lamp = ctx.el('div', 'echo-lamp grab', {
      x: Math.round(w * 0.14), y: Math.round(h * 0.24)
    });
    const blockObj = ctx.el('div', 'brk-slab grab', {
      x: Math.round(w * 0.40), y: Math.round(h * 0.60),
      style: { width: '54px', height: '54px' }
    });
    const sensor = ctx.el('div', 'brk-sensor', {
      x: Math.round(w * 0.78), y: Math.round(h * 0.46)
    });

    ctx.drag(lamp, { affordance: false, bounds: 'stage' });
    ctx.drag(blockObj, { affordance: false, bounds: 'stage' });

    const mid = el => ({ x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2 });

    let held = 0, done = false;
    ctx.frame(dt => {
      if (done) return;
      const L = mid(lamp), S = mid(sensor), B = mid(blockObj);

      /* is the slab standing between the lamp and the sensor? */
      const vx = S.x - L.x, vy = S.y - L.y;
      const len = Math.hypot(vx, vy) || 1;
      const t = ((B.x - L.x) * vx + (B.y - L.y) * vy) / (len * len);
      const px = L.x + vx * t, py = L.y + vy * t;
      const off = Math.hypot(B.x - px, B.y - py);
      const shaded = t > 0.08 && t < 0.96 && off < 40;

      sensor.classList.toggle('is-shaded', shaded);
      held = shaded ? held + dt : 0;
      if (held < 0.6) return;

      done = true;
      sensor.classList.add('is-on');
      ctx.after(560, () => ctx.solve());
    });
  }
},

/* ═════════════════════════════════════════════════════════ B05 ═════════ */
{
  routeId: 'B05',
  name: { en: 'Build it', ar: 'ابنِه' },
  instruction: { en: 'PUT THE CIRCLE INSIDE THE SQUARE', ar: 'ضع الدائرة داخل المربع' },

  hint: { en: 'Are you sure the square already exists?', ar: 'هل أنت واثق أن المربع موجود أصلًا؟' },
  hint2: { en: 'You have four sides.', ar: 'لديك أربعة أضلاع.' },
  hint3: { en: 'Build the square around the circle.', ar: 'ابنِ المربع حول الدائرة.' },
  note: { en: 'It did not say the square was there.', ar: 'لم تقل إن المربع موجود.' },

  setup(ctx) {
    const { w, h } = ctx.size();
    const S = 132;
    const cx = Math.round(w * 0.5), cy = Math.round(h * 0.48);

    const circle = ctx.el('div', 'brk-disc', {
      x: cx - 34, y: cy - 34, style: { width: '68px', height: '68px' }
    });

    /* Where each side belongs once the square exists. Nothing is drawn there —
       the square is not hidden, it is absent. */
    const SIDES = [
      { w: S, h: 6, x: cx - S / 2, y: cy - S / 2 },
      { w: S, h: 6, x: cx - S / 2, y: cy + S / 2 - 6 },
      { w: 6, h: S, x: cx - S / 2, y: cy - S / 2 },
      { w: 6, h: S, x: cx + S / 2 - 6, y: cy - S / 2 }
    ];
    const START = [[0.13, 0.16], [0.80, 0.20], [0.14, 0.78], [0.82, 0.74]];

    const bars = SIDES.map((s, i) => {
      const bar = ctx.el('div', 'brk-bar grab', {
        x: Math.round(w * START[i][0]), y: Math.round(h * START[i][1]),
        style: { width: s.w + 'px', height: s.h + 'px' }
      });
      bar.dataset.at = i;
      return bar;
    });

    const placed = bars.map(() => false);

    bars.forEach((bar, i) => ctx.drag(bar, {
      affordance: false, bounds: 'stage',
      onDrop() {
        const s = SIDES[i];
        /* generous snap: this is about the idea, not about precision */
        if (Math.hypot(bar.offsetLeft - s.x, bar.offsetTop - s.y) > 46) { placed[i] = false; return; }
        ctx.place(bar, s.x, s.y);
        bar.classList.add('is-set');
        placed[i] = true;
      }
    }));

    ctx.check(() => placed.every(Boolean));
  }
}

]);
