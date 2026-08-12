/* ==========================================================================
   RULESET — levels
   --------------------------------------------------------------------------
   Each level is a plain object:

     {
       id:          number   — display number, must be unique
       name:        L        — shown bottom-left
       instruction: L        — the sentence. It is tokenised into word spans,
                               and words are objects like anything else.
       hint:        L        — first press of "Hint"
       hint2:       L        — second press: points at the mechanic
       hint3:       L        — third press: nearly the solution (optional)
       note:        L        — one line shown on the success card (optional)
       setup(ctx):  void     — build the level using ONLY the ctx API
       cleanup(ctx):void     — optional; ctx already frees everything it made
     }

   `L` is either a plain string or a { en, ar } map. Anything the player can
   read goes through ctx.t(), which resolves it for the active language and
   falls back to English. Levels that name a word of their own instruction
   must localise that too — see L03, L09 and L15.

   See README.md for the full ctx reference.
   ========================================================================== */

window.RULESET_LEVELS = [

/* ─────────────────────────────────────────────────────────── 01 ───────── */
{
  id: 1,
  name: { en: 'Reach the end', ar: 'اذهب إلى النهاية' },
  instruction: { en: 'Reach the end.', ar: 'اذهب إلى النهاية.' },
  hint: {
    en: 'The door is faster than you. Nothing says the door is "the end".',
    ar: 'الباب أسرع منك. ولا شيء يقول إن الباب هو «النهاية».'
  },
  hint2: {
    en: 'The answer is not inside the box. Read the sentence again.',
    ar: 'الجواب ليس داخل الصندوق. اقرأ الجملة مرة أخرى.'
  },
  hint3: {
    en: 'The underlined word in the instruction can be picked up.',
    ar: 'الكلمة المسطَّرة في التعليمة يمكن التقاطها.'
  },
  note: { en: 'Words are objects too.', ar: 'الكلمات أشياء أيضًا.' },

  difficulty: 3,
  mechanicIntroduced: 'dragText',

  setup(ctx) {
    const { w, h } = ctx.size();

    const dot = ctx.el('div', 'obj dot', { x: 60, y: Math.round(h / 2 - 11) });
    ctx.drag(dot, { bounds: 'stage' });

    const door = ctx.el('div', 'obj door', { x: w - 90, y: Math.round(h / 2 - 37) });
    const pos = { x: w - 90, y: h / 2 - 37 };

    // The door retreats to whichever corner is furthest from the dot.
    ctx.frame(dt => {
      const s = ctx.size();
      const dx = (parseFloat(dot.style.left) || 0) + 11;
      const dy = (parseFloat(dot.style.top) || 0) + 11;

      const corners = [
        [18, 18], [s.w - 52, 18],
        [18, s.h - 92], [s.w - 52, s.h - 92]
      ];
      let best = corners[0], bestD = -1;
      for (const c of corners) {
        const d = Math.hypot(c[0] + 17 - dx, c[1] + 37 - dy);
        if (d > bestD) { bestD = d; best = c; }
      }

      const close = Math.hypot(pos.x + 17 - dx, pos.y + 37 - dy) < 280;
      if (close) {
        const k = Math.min(1, dt * 3.2);
        pos.x += (best[0] - pos.x) * k;
        pos.y += (best[1] - pos.y) * k;
        ctx.place(door, Math.round(pos.x), Math.round(pos.y));
      }
    });

    // The actual solution: bring "end" to the dot.
    const END = { en: 'end', ar: 'النهاية' };
    ctx.words(END, { discard: false });
    ctx.check(() => {
      const end = ctx.word(END);
      return !!end && ctx.hits(end, dot, 4);
    });
  }
},

/* ─────────────────────────────────────────────────────────── 02 ───────── */
{
  id: 2,
  name: { en: 'Bigger', ar: 'أكبر' },
  instruction: { en: 'Make 5 bigger than 10.', ar: 'اجعل 5 أكبر من 10.' },
  hint: {
    en: '"Bigger" was never about value.',
    ar: '«أكبر» لم تكن يومًا عن القيمة.'
  },
  hint2: {
    en: 'Nothing here compares values. Something here compares pixels.',
    ar: 'لا شيء هنا يقارن القيم. وشيء ما هنا يقارن البكسلات.'
  },
  hint3: {
    en: 'Drag the small square at the corner of the 5. On touch, pinch it.',
    ar: 'اسحب المربع الصغير عند زاوية الرقم 5. وعلى اللمس، قرِّص الرقم.'
  },
  note: { en: 'Size is literal.', ar: 'الحجم يُقاس حرفيًا.' },

  difficulty: 2,
  mechanicIntroduced: 'resizeObject',

  setup(ctx) {
    const num = (text, leftPct) => ctx.el('div', 'obj num', {
      text,
      style: {
        left: leftPct, top: '50%',
        transform: 'translate(-50%, -50%)',
        fontFamily: 'var(--mono)',
        fontWeight: '700',
        fontSize: '76px',
        lineHeight: '1',
        letterSpacing: '-.02em'
      }
    });

    const five = num('5', '34%');
    const ten  = num('10', '68%');

    const out = ctx.el('div', 'readout obj', {
      style: { left: '50%', bottom: '18px', top: 'auto', transform: 'translateX(-50%)' }
    });

    ctx.resize(five, { mode: 'font', min: 30, max: 260 });

    const measure = () => {
      const a = ctx.rect(five), b = ctx.rect(ten);
      out.textContent =
        '5 → ' + Math.round(a.width) + '×' + Math.round(a.height) + 'px' +
        '   ·   10 → ' + Math.round(b.width) + '×' + Math.round(b.height) + 'px';
      return a.width > b.width && a.height > b.height;
    };

    ctx.frame(measure);
    ctx.check(measure);
  }
},

/* ─────────────────────────────────────────────────────────── 03 ───────── */
{
  id: 3,
  name: { en: 'Red', ar: 'الأحمر' },
  instruction: {
    en: 'Press continue. Do not touch red.',
    ar: 'اضغط متابعة. لا تلمس الأحمر.'
  },
  hint: {
    en: 'Two rules, one button. Change a rule.',
    ar: 'قاعدتان وزر واحد. غيّر قاعدة.'
  },
  hint2: {
    en: 'You cannot obey both rules at once. One of them can change.',
    ar: 'لا يمكنك طاعة القاعدتين معًا. وإحداهما قابلة للتغيير.'
  },
  hint3: {
    en: 'Both underlined words work — removing either one makes the button legal.',
    ar: 'الكلمتان المسطَّرتان كلتاهما تنفع — حذف أيٍّ منهما يجعل الزر مباحًا.'
  },
  note: {
    en: 'Instructions are live rules, not decoration.',
    ar: 'التعليمات قواعد حيّة، لا زخرفة.'
  },

  difficulty: 4,
  mechanicIntroduced: 'removeText',
  mechanicsRequired: ['dragText'],

  setup(ctx) {
    /* The two words this level reasons about, per language. */
    const RED = { en: 'red', ar: 'الأحمر' };
    const NOT = { en: 'not', ar: 'لا' };

    const btn = ctx.el('button', 'gbtn is-red obj', {
      text: ctx.t({ en: 'CONTINUE', ar: 'متابعة' }),
      attrs: { type: 'button' },
      style: { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
    });

    const decoys = [{ en: 'RESET', ar: 'إعادة' }, { en: 'BACK', ar: 'رجوع' }]
      .map((label, i) =>
        ctx.el('button', 'gbtn is-red obj', {
          text: ctx.t(label),
          attrs: { type: 'button' },
          style: {
            left: '50%', top: '50%',
            transform: 'translate(-50%, -50%) translateX(' + (i ? 172 : -172) + 'px)',
            opacity: '.7'
          }
        })
      );

    const rule = () => ({ red: ctx.hasWord(RED), not: ctx.hasWord(NOT) });

    const repaint = () => {
      const r = rule();
      [btn, ...decoys].forEach(b => b.classList.toggle('is-red', r.red));
      ctx.say(ctx.t(r.red
        ? (r.not
            ? { en: 'the button is red', ar: 'الزر أحمر' }
            : { en: 'the button is red — and that is now allowed',
                ar: 'الزر أحمر — وهذا مسموح الآن' })
        : { en: 'nothing is red', ar: 'لا شيء أحمر' }));
    };

    ctx.words(ctx.t({ en: 'red not', ar: 'الأحمر لا' }),
              { onChange: repaint, onDrop: repaint });
    repaint();

    const touchedRed = { en: 'you touched red', ar: 'لمست الأحمر' };

    ctx.on(btn, 'click', () => {
      const r = rule();
      if (!r.red || !r.not) ctx.solve();
      else ctx.reject(ctx.t(touchedRed));
    });

    decoys.forEach(d => ctx.on(d, 'click', () => {
      const r = rule();
      if (r.red && r.not) ctx.reject(ctx.t(touchedRed));
      else ctx.say(ctx.t({ en: 'that one is not continue', ar: 'هذا ليس زر المتابعة' }));
    }));
  }
},

/* ─────────────────────────────────────────────────────────── 04 ───────── */
{
  id: 4,
  name: { en: 'Ten', ar: 'عشر مرات' },
  instruction: { en: 'Click the button 10 times.', ar: 'اضغط الزر 10 مرات.' },
  hint: {
    en: 'You are fast enough. Something else is undoing the work.',
    ar: 'سرعتك كافية. شيء آخر يمحو ما تفعله.'
  },
  hint2: {
    en: 'Count how fast you can click, then look at the corner.',
    ar: 'احسب سرعة ضغطك، ثم انظر إلى الزاوية.'
  },
  hint3: {
    en: 'The reset timer is an object in the corner. Objects can be thrown away.',
    ar: 'مؤقّت التصفير شيء في الزاوية. والأشياء يمكن التخلص منها.'
  },
  note: {
    en: 'Remove the mechanism, not the goal.',
    ar: 'أزل الآلية، لا الهدف.'
  },

  difficulty: 4,
  mechanicIntroduced: 'discardObject',
  mechanicsRequired: ['removeText'],

  setup(ctx) {
    let count = 0, cool = 0, timer = 2, live = true;
    const RESET = ctx.t({ en: 'RESET', ar: 'تصفير' });

    const big = ctx.el('div', 'bignum obj', {
      text: '0', style: { left: '50%', top: '34%', transform: 'translate(-50%,-50%)' }
    });
    ctx.el('div', 'readout obj', {
      text: ctx.t({ en: 'of 10', ar: 'من 10' }),
      style: { left: '50%', top: '48%', transform: 'translate(-50%,-50%)' }
    });
    const btn = ctx.el('button', 'gbtn obj', {
      text: ctx.t({ en: 'CLICK', ar: 'اضغط' }), attrs: { type: 'button' },
      style: { left: '50%', top: '68%', transform: 'translate(-50%,-50%)' }
    });

    // the reset mechanism, visible and grabbable
    const chip = ctx.el('div', 'chip obj grab', {
      text: RESET + ' 2.0',
      style: { right: '16px', top: '16px' }
    });
    ctx.drag(chip, {
      affordance: false, discard: true,
      onDiscard: el => {
        live = false; el.remove();
        ctx.say(ctx.t({ en: 'reset timer removed', ar: 'أُزيل مؤقّت التصفير' }), 'good');
      }
    });

    ctx.on(btn, 'click', () => {
      if (cool > 0) return;
      cool = 0.4;                       // visible rate limit: 10 clicks needs > 2s
      count++;
      big.textContent = String(count);
    });

    ctx.frame(dt => {
      if (cool > 0) { cool -= dt; btn.classList.toggle('is-off', cool > 0); }
      if (!live) return;
      timer -= dt;
      if (timer <= 0) {
        timer = 2;
        count = 0;
        big.textContent = '0';
        ctx.say(ctx.t({ en: 'reset', ar: 'صُفِّر' }), 'warn');
      }
      chip.textContent = RESET + ' ' + timer.toFixed(1);
    });

    ctx.check(() => count >= 10);
  }
},

/* ─────────────────────────────────────────────────────────── 05 ───────── */
{
  id: 5,
  name: { en: 'Still', ar: 'سكون' },
  instruction: { en: 'Do nothing.', ar: 'لا تفعل شيئًا.' },
  hint: {
    en: 'It means exactly that. Every input counts — including the mouse moving.',
    ar: 'المقصود حرفيًا. كل إدخال يُحتسب — حتى حركة المؤشر.'
  },
  hint2: {
    en: 'The bar resets on any input at all — including the one you are making now.',
    ar: 'الشريط يُصفَّر مع أي إدخال — حتى الذي تفعله الآن.'
  },
  hint3: {
    en: 'Take your hands off the mouse and the keyboard, and let the bar fill.',
    ar: 'ارفع يديك عن الفأرة ولوحة المفاتيح، ودع الشريط يمتلئ.'
  },
  note: {
    en: 'Not acting is also an input.',
    ar: 'الامتناع عن الفعل إدخالٌ أيضًا.'
  },

  difficulty: 2,
  mechanicIntroduced: 'wait',

  setup(ctx) {
    const NEED = 5;
    let held = 0;

    const num = ctx.el('div', 'bignum obj', {
      text: '5.0', style: { left: '50%', top: '38%', transform: 'translate(-50%,-50%)' }
    });
    const bar = ctx.el('div', 'bar obj', {
      html: '<i></i>',
      style: { left: '18%', right: '18%', top: '54%', width: 'auto' }
    });
    const fill = bar.firstElementChild;

    // a loud, useless button
    const decoy = ctx.el('button', 'gbtn obj pulse', {
      text: ctx.t({ en: 'CONTINUE', ar: 'متابعة' }), attrs: { type: 'button' },
      style: { left: '50%', top: '74%', transform: 'translate(-50%,-50%)' }
    });

    const disturb = () => {
      if (held > 0.15) {
        ctx.say(ctx.t({ en: 'input detected', ar: 'رُصد إدخال' }), 'warn');
        bar.classList.add('is-warn');
        ctx.after(320, () => bar.classList.remove('is-warn'));
      }
      held = 0;
    };

    ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchmove']
      .forEach(t => ctx.on(window, t, disturb, { passive: true }));
    ctx.on(decoy, 'click', () =>
      ctx.say(ctx.t({ en: 'that button does nothing', ar: 'هذا الزر لا يفعل شيئًا' }), 'warn'));

    ctx.frame(dt => {
      held += dt;
      const p = Math.min(1, held / NEED);
      fill.style.width = (p * 100) + '%';
      num.textContent = Math.max(0, NEED - held).toFixed(1);
      if (held > 1.2 && !bar.classList.contains('is-warn'))
        ctx.say(ctx.t({ en: 'holding…', ar: 'ثبات…' }));
    });

    ctx.check(() => held >= NEED);
  }
},

/* ─────────────────────────────────────────────────────────── 06 ───────── */
{
  id: 6,
  name: { en: 'Narrower', ar: 'أضيق' },
  instruction: {
    en: 'Make the window narrower than the box.',
    ar: 'اجعل النافذة أضيق من الصندوق.'
  },
  hint: {
    en: 'The box will not change. The window is the other half of the game.',
    ar: 'الصندوق لن يتغير. النافذة هي النصف الآخر من اللعبة.'
  },
  hint2: {
    en: 'The box has a fixed pixel width. Only one of the two numbers can move.',
    ar: 'عرض الصندوق ثابت بالبكسل. ورقم واحد فقط يمكن أن يتحرك.'
  },
  hint3: {
    en: 'Leave full screen first — a full screen window has no edge to drag. ' +
        'Zooming the page in (⌘/Ctrl +) counts too, and on a phone, pinch.',
    ar: 'اخرج من وضع ملء الشاشة أولًا — نافذة ملء الشاشة بلا حافة تسحبها. ' +
        'وتكبير الصفحة (⌘/Ctrl +) يُحتسب أيضًا، وعلى الهاتف قرِّص الشاشة.'
  },
  note: {
    en: 'The browser is part of the machine.',
    ar: 'المتصفح جزء من الآلة.'
  },

  difficulty: 5,
  mechanicIntroduced: 'resizeViewport',

  setup(ctx) {
    const start = ctx.viewportWidth();
    const boxW = Math.max(260, Math.round(start * 0.85));

    const box = ctx.el('div', 'wbox', { text: boxW + 'px', style: { width: boxW + 'px' } });
    const out = ctx.el('div', 'readout obj', {
      style: { left: '50%', top: '74%', transform: 'translateX(-50%)' }
    });

    const L = ctx.t({
      en: { win: 'window', box: 'box', ok: 'narrower', over: n => n + 'px too wide' },
      ar: { win: 'النافذة', box: 'الصندوق', ok: 'أضيق', over: n => 'أعرض بـ ' + n + 'px' }
    });

    const paint = () => {
      const vw = ctx.viewportWidth();
      out.textContent = L.win + ' ' + vw + 'px   ·   ' + L.box + ' ' + boxW + 'px   ·   ' +
        (vw < boxW ? L.ok : L.over(vw - boxW));
      box.style.borderColor = vw < boxW ? 'var(--good)' : 'var(--ink)';
    };

    ctx.onViewportChange(paint);
    ctx.frame(paint);
    ctx.check(() => ctx.viewportWidth() < boxW);
  }
},

/* ─────────────────────────────────────────────────────────── 07 ───────── */
{
  id: 7,
  name: { en: 'Fine print', ar: 'الخط الدقيق' },
  instruction: { en: 'Type the password.', ar: 'اكتب كلمة السر.' },
  hint: {
    en: 'The password is on screen at full size. Your eyes are the problem.',
    ar: 'كلمة السر على الشاشة بحجمها الكامل. عيناك هما المشكلة.'
  },
  hint2: {
    en: 'The password is rendered about three pixels tall.',
    ar: 'كلمة السر مرسومة بارتفاع ثلاثة بكسلات تقريبًا.'
  },
  hint3: {
    en: 'Zoom the page in: Ctrl/⌘ and "+", or pinch. Selecting the text also works.',
    ar: 'كبِّر الصفحة: Ctrl/⌘ مع «+»، أو قرِّص. وتحديد النص بالمؤشر ينفع أيضًا.'
  },
  note: { en: 'Zoom is a tool, not a setting.', ar: 'التكبير أداة، لا إعداد.' },

  difficulty: 4,
  mechanicIntroduced: 'zoom',

  setup(ctx) {
    const PASS = 'ORBIT';                    // stays Latin: typed on any keyboard

    const plaque = ctx.el('div', 'plaque');
    ctx.el('div', 'cap', { text: ctx.t({ en: 'PASSWORD', ar: 'كلمة السر' }), parent: plaque });
    ctx.el('div', 'tiny', { text: PASS, parent: plaque, attrs: { dir: 'ltr' } });

    const input = ctx.el('input', 'field obj', {
      attrs: {
        type: 'text', placeholder: '·····', autocomplete: 'off',
        spellcheck: 'false', dir: 'ltr'
      },
      style: { left: '50%', top: '74%', transform: 'translate(-50%,-50%)' }
    });

    const value = () => input.value.trim().toUpperCase();

    ctx.on(input, 'keydown', e => {
      if (e.key !== 'Enter') return;
      if (value() !== PASS) {
        input.classList.add('is-bad');
        ctx.after(400, () => input.classList.remove('is-bad'));
        ctx.say(ctx.t({ en: 'not the password', ar: 'ليست كلمة السر' }), 'warn');
      }
    });

    ctx.check(() => value() === PASS);
  }
},

/* ─────────────────────────────────────────────────────────── 08 ───────── */
{
  id: 8,
  name: { en: 'Both', ar: 'كلاهما' },
  instruction: {
    en: 'Hold both switches at the same time.',
    ar: 'أمسك المفتاحين في الوقت نفسه.'
  },
  hint: {
    en: 'One pointer cannot be in two places. You have other inputs.',
    ar: 'مؤشر واحد لا يكون في مكانين. ولديك وسائل إدخال أخرى.'
  },
  hint2: {
    en: 'Two switches, one pointer. Look at what is printed on each switch.',
    ar: 'مفتاحان ومؤشر واحد. انظر إلى ما هو مطبوع على كل مفتاح.'
  },
  hint3: {
    en: 'Hold Q and P together — or use two fingers.',
    ar: 'أمسك Q و P معًا — أو استخدم إصبعين.'
  },
  note: {
    en: 'A mouse is one finger. A keyboard is ten.',
    ar: 'الفأرة إصبع واحد. ولوحة المفاتيح عشرة.'
  },

  difficulty: 3,
  mechanicIntroduced: ['multiInput', 'keyboardControl'],

  setup(ctx) {
    const held = [false, false];

    /* Physical key positions, not characters: e.key would report Arabic
       letters under an Arabic layout and the level would be unplayable. */
    const make = (side, code, cap, i) => {
      const box = ctx.el('div', 'switchbox', { style: side });
      ctx.el('div', 'switch-light', { parent: box });
      ctx.el('div', 'keycap', { text: cap, parent: box, attrs: { dir: 'ltr' } });

      const set = on => { held[i] = on; box.classList.toggle('is-on', on); };
      let pid = null;

      ctx.on(box, 'pointerdown', e => { pid = e.pointerId; set(true); e.preventDefault(); });
      ctx.on(window, 'pointerup', e => { if (e.pointerId === pid) { pid = null; set(false); } });
      ctx.on(window, 'pointercancel', e => { if (e.pointerId === pid) { pid = null; set(false); } });
      ctx.on(window, 'keydown', e => { if (e.code === code && !e.repeat) set(true); });
      ctx.on(window, 'keyup', e => { if (e.code === code) set(false); });
      return box;
    };

    make({ left: '10%' }, 'KeyQ', 'Q', 0);
    make({ right: '10%' }, 'KeyP', 'P', 1);

    const L = ctx.t({ en: { both: 'both', one: 'one' }, ar: { both: 'كلاهما', one: 'واحد' } });
    ctx.frame(() => ctx.say(held[0] && held[1] ? L.both : held[0] || held[1] ? L.one : ''));
    ctx.check(() => held[0] && held[1]);
  }
},

/* ─────────────────────────────────────────────────────────── 09 ───────── */
{
  id: 9,
  name: { en: 'Self-report', ar: 'شهادة على النفس' },

  /* EN: 6 words claiming 4 — drop 2.
     AR: 7 words claiming 4 — drop 3, e.g. هذه + على + بالضبط
         leaving «الجملة تحتوي أربع كلمات» = 4 words, still naming أربع. */
  instruction: {
    en: 'This sentence contains exactly four words.',
    ar: 'هذه الجملة تحتوي على أربع كلمات بالضبط.'
  },
  hint: {
    en: 'Count the words. The sentence is lying — make it honest.',
    ar: 'عُدَّ الكلمات. الجملة تكذب — اجعلها صادقة.'
  },
  hint2: {
    en: 'The sentence is counting itself. Change what there is to count.',
    ar: 'الجملة تَعُدّ نفسها. غيّر ما يمكن عدّه.'
  },
  hint3: {
    en: 'Every word can be removed, and removing words changes the count.',
    ar: 'كل كلمة يمكن حذفها، وحذف الكلمات يغيّر العدد.'
  },
  note: {
    en: 'A rule can be edited until it is true.',
    ar: 'القاعدة يمكن تحريرها حتى تصير صادقة.'
  },

  difficulty: 7,
  mechanicIntroduced: 'selfReference',
  mechanicsRequired: ['removeText'],

  setup(ctx) {
    const NUM = {
      one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10,
      // feminine forms: they agree with «كلمات»
      واحدة:1, اثنتان:2, ثلاث:3, أربع:4, خمس:5, ست:6, سبع:7, ثمان:8, تسع:9, عشر:10
    };
    const claim = words => {
      for (const w of words) {
        if (NUM[w] != null) return NUM[w];
        if (/^\d+$/.test(w)) return parseInt(w, 10);
      }
      return null;
    };

    // the stage is a live tally of the sentence's claim against reality
    const box = ctx.el('div', 'compare');
    const side = lbl => {
      const s = ctx.el('div', 'side', { parent: box });
      const n = ctx.el('div', 'bignum', { parent: s, text: '0' });
      ctx.el('div', 'lbl', { parent: s, text: lbl });
      return n;
    };
    const actual = side(ctx.t({ en: 'words in the sentence', ar: 'كلمات في الجملة' }));
    const rel = ctx.el('div', 'rel', { parent: box, text: '≠' });
    const stated = side(ctx.t({ en: 'words it claims', ar: 'كلمات تدّعيها' }));

    const paint = () => {
      const words = ctx.sentenceWords();
      const c = claim(words);
      actual.textContent = String(words.length);
      stated.textContent = c == null ? '—' : String(c);
      const ok = c != null && c === words.length;
      rel.textContent = c == null ? '?' : (ok ? '=' : '≠');
      box.classList.toggle('is-true', ok);
      ctx.say(c == null
        ? ctx.t({ en: 'the sentence claims nothing', ar: 'الجملة لم تعد تدّعي شيئًا' })
        : '', c == null ? 'warn' : '');
    };

    ctx.words('*', { onChange: paint, onDrop: paint });
    paint();

    ctx.check(() => {
      const words = ctx.sentenceWords();
      const c = claim(words);
      return c != null && c === words.length;
    });
  }
},

/* ─────────────────────────────────────────────────────────── 10 ───────── */
{
  id: 10,
  name: { en: 'Elsewhere', ar: 'في مكان آخر' },
  instruction: { en: 'Finish the level.', ar: 'أنهِ المستوى.' },
  hint: {
    en: 'The box is empty on purpose. Look above it.',
    ar: 'الصندوق فارغ عن قصد. انظر فوقه.'
  },
  hint2: {
    en: 'Nothing inside the box will finish this level.',
    ar: 'لا شيء داخل الصندوق سيُنهي هذا المستوى.'
  },
  hint3: {
    en: 'The progress bar at the top of the app is now a control. Drag it.',
    ar: 'شريط التقدم أعلى التطبيق صار أداة تحكم. اسحبه.'
  },
  note: {
    en: 'The frame around the game is inside the game.',
    ar: 'الإطار المحيط باللعبة جزء من اللعبة.'
  },

  difficulty: 3,
  mechanicIntroduced: 'manipulateUI',
  globalElementsAllowed: ['progress'],

  setup(ctx) {
    ctx.stage.classList.add('is-bare');
    ctx.el('div', 'readout obj', {
      text: ctx.t({ en: '( nothing in here )', ar: '( لا شيء هنا )' }),
      style: { left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }
    });

    const p = ctx.claim("progress", {
      start: 0,
      onChange: v => ctx.say(Math.round(v * 100) + '%', v > .995 ? 'good' : '')
    });

    ctx.check(() => p.value() > 0.995);
  }
},

/* ─────────────────────────────────────────────────────────── 11 ───────── */
{
  id: 11,
  name: { en: 'Balance', ar: 'اتزان' },
  instruction: { en: 'Balance the beam.', ar: 'وازن العارضة.' },
  hint: {
    en: 'Weight is area. A block twice as wide is heavier — and distance matters too.',
    ar: 'الوزن هو المساحة. الكتلة الأعرض بالضعف أثقل — والمسافة مهمة أيضًا.'
  },
  hint2: {
    en: 'Two things about each block matter: how big it is, and where it sits.',
    ar: 'أمران يهمّان في كل كتلة: حجمها وموضعها.'
  },
  hint3: {
    en: 'Blocks slide along the beam, and each has a resize corner.',
    ar: 'الكتل تنزلق على العارضة، ولكلٍّ منها زاوية لتغيير الحجم.'
  },
  note: {
    en: 'Size and position are quantities you can compute with.',
    ar: 'الحجم والموضع كمّيات يمكنك الحساب بها.'
  },

  difficulty: 6,
  mechanicIntroduced: 'physics',
  mechanicsRequired: ['dragObject', 'resizeObject'],

  setup(ctx) {
    const s = ctx.size();
    const beamW = Math.min(560, s.w - 90);

    ctx.el('div', 'pivot');
    const beam = ctx.el('div', 'beam', {
      style: { width: beamW + 'px', transform: 'translate(-50%,-50%)' }
    });

    const blocks = [
      { x: 60, w: 54, h: 54 },
      { x: beamW - 190, w: 90, h: 40 }
    ].map(cfg => {
      const b = ctx.el('div', 'block', {
        parent: beam,
        style: { left: cfg.x + 'px', width: cfg.w + 'px', height: cfg.h + 'px' }
      });
      ctx.drag(b, {
        affordance: false, axis: 'x',
        clampX: (nx, el) => Math.max(0, Math.min(beamW - el.offsetWidth, nx))
      });
      ctx.resize(b, { mode: 'box', min: 26, max: 150, keepRatio: false });
      return b;
    });

    const out = ctx.el('div', 'readout obj', {
      style: { left: '50%', top: '78%', transform: 'translateX(-50%)' }
    });

    const L = ctx.t({
      en: { left: 'left', right: 'right', level: 'level' },
      ar: { left: 'يسار', right: 'يمين', level: 'متوازنة' }
    });

    const torque = b => {
      const w = b.offsetWidth, h = b.offsetHeight;
      const arm = (b.offsetLeft + w / 2) - beamW / 2;
      return (w * h / 500) * (arm / 10);
    };

    let steady = 0;
    ctx.frame(dt => {
      const t = blocks.map(torque);
      const sum = t[0] + t[1];
      const scale = Math.abs(t[0]) + Math.abs(t[1]);
      const off = scale > 0 ? Math.abs(sum) / scale : 1;

      beam.style.transform = 'translate(-50%,-50%) rotate(' +
        Math.max(-8, Math.min(8, sum / 24)).toFixed(2) + 'deg)';
      out.textContent = L.left + ' ' + Math.abs(t[0]).toFixed(1) +
                        '   ·   ' + L.right + ' ' + Math.abs(t[1]).toFixed(1);

      steady = (off < 0.02 && scale > 1) ? steady + dt : 0;
      if (steady > 0) ctx.say(L.level, 'good'); else ctx.say('');
    });

    ctx.check(() => steady > 0.45);
  }
},

/* ─────────────────────────────────────────────────────────── 12 ───────── */
{
  id: 12,
  name: { en: 'Remap', ar: 'إعادة التعيين' },
  instruction: {
    en: 'Drive the square onto the target.',
    ar: 'قُد المربع إلى الهدف.'
  },
  hint: {
    en: 'No key moves you up. Nothing says the key map is fixed.',
    ar: 'لا مفتاح يحركك للأعلى. ولا شيء يقول إن خريطة المفاتيح ثابتة.'
  },
  hint2: {
    en: 'Read the map: one direction has no key, and one arrow has no row.',
    ar: 'اقرأ الخريطة: اتجاه بلا مفتاح، وسهم بلا صف.'
  },
  hint3: {
    en: 'The arrows in the panel can be dragged between rows — including the spare one.',
    ar: 'الأسهم في اللوحة يمكن سحبها بين الصفوف — بما فيها السهم الاحتياطي.'
  },
  note: { en: 'Settings are objects too.', ar: 'الإعدادات أشياء أيضًا.' },

  difficulty: 5,
  mechanicIntroduced: 'remapControl',
  mechanicsRequired: ['dragObject', 'keyboardControl'],

  setup(ctx) {
    const s = ctx.size();
    /* Physical key positions — see L08. The caps still read W A S D. */
    const KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
    const CAPS = ['W', 'A', 'S', 'D'];
    const DIRS = {
      '↑': [0, -1], '↓': [0, 1], '←': [-1, 0], '→': [1, 0]
    };

    /* ---- key map panel: 4 key rows + 1 spare row ----
       The panel is pinned LTR: it is a diagram of a keyboard, and bidi would
       otherwise reorder "W → ←" into nonsense. */
    const panel = ctx.el('div', 'keymap', { attrs: { dir: 'ltr' } });
    ctx.el('div', 'cap', { text: ctx.t({ en: 'KEY MAP', ar: 'خريطة المفاتيح' }), parent: panel });

    const slots = [];
    KEYS.forEach((code, i) => {
      const row = ctx.el('div', 'keyrow', { parent: panel });
      ctx.el('span', 'keycap', { text: CAPS[i], parent: row, attrs: { 'data-code': code } });
      ctx.el('span', 'arrowto', { text: '→', parent: row });
      slots.push(ctx.el('span', 'dirslot', { parent: row }));
    });
    const spareRow = ctx.el('div', 'keyrow', { parent: panel });
    ctx.el('span', 'readout', {
      text: ctx.t({ en: 'spare', ar: 'احتياطي' }), parent: spareRow
    });
    slots.push(ctx.el('span', 'dirslot', { parent: spareRow }));

    // slot 0..3 = W A S D, slot 4 = spare.  Up starts unassigned.
    const inSlot = ['←', '↓', '→', null, '↑'];
    const chips = {};

    const seat = () => {
      inSlot.forEach((glyph, i) => {
        if (!glyph) return;
        const c = chips[glyph];
        c.style.left = slots[i].offsetLeft + 'px';
        c.style.top = slots[i].offsetTop + 'px';
      });
    };

    Object.keys(DIRS).forEach(glyph => {
      const c = ctx.el('div', 'dirchip grab', { text: glyph, parent: panel });
      chips[glyph] = c;
      ctx.drag(c, {
        affordance: false,
        onMove: () => slots.forEach((sl, i) =>
          sl.classList.toggle('is-hot', ctx.hits(c, sl, -8))),
        onDrop: () => {
          slots.forEach(sl => sl.classList.remove('is-hot'));
          const from = inSlot.indexOf(glyph);
          const to = slots.findIndex(sl => ctx.hits(c, sl, -8));
          if (to < 0 || to === from) { seat(); return; }   // no move: snap back
          const displaced = inSlot[to];                    // may be null
          inSlot[to] = glyph;
          inSlot[from] = displaced;
          seat();
        }
      });
    });
    seat();

    /* ---- the square and the target ---- */
    const target = ctx.el('div', 'slot', {
      style: { width: '46px', height: '46px', right: '48px', top: '46px' }
    });
    const sq = ctx.el('div', 'mover obj', { x: Math.round(s.w * 0.45), y: Math.round(s.h - 70) });

    const down = new Set();
    const paintCaps = () => panel.querySelectorAll('.keycap').forEach(c =>
      c.classList.toggle('is-down', down.has(c.dataset.code)));

    ctx.on(window, 'keydown', e => {
      if (KEYS.indexOf(e.code) >= 0) { down.add(e.code); e.preventDefault(); }
      paintCaps();
    });
    ctx.on(window, 'keyup', e => { down.delete(e.code); paintCaps(); });

    // The keycaps are real buttons, so this level is playable without a
    // keyboard. Each tracks its own pointer id, so two fingers give diagonals.
    panel.querySelectorAll('.keycap').forEach(cap => {
      const code = cap.dataset.code;
      let pid = null;
      ctx.on(cap, 'pointerdown', e => {
        pid = e.pointerId;
        down.add(code);
        paintCaps();
        e.preventDefault();
        e.stopPropagation();
      });
      const lift = e => {
        if (pid === null) return;
        if (e.type === 'pointercancel' || e.pointerId === pid) {
          pid = null; down.delete(code); paintCaps();
        }
      };
      ctx.on(window, 'pointerup', lift);
      ctx.on(window, 'pointercancel', lift);
    });

    ctx.frame(dt => {
      let vx = 0, vy = 0;
      down.forEach(code => {
        const glyph = inSlot[KEYS.indexOf(code)];
        if (!glyph) return;
        vx += DIRS[glyph][0];
        vy += DIRS[glyph][1];
      });
      if (!vx && !vy) return;
      const st = ctx.size();
      const nx = Math.max(0, Math.min(st.w - 26, (parseFloat(sq.style.left) || 0) + vx * 240 * dt));
      const ny = Math.max(0, Math.min(st.h - 26, (parseFloat(sq.style.top) || 0) + vy * 240 * dt));
      ctx.place(sq, nx, ny);
    });

    ctx.check(() => {
      const on = ctx.hits(sq, target, -10);
      target.classList.toggle('is-hot', on);
      return on;
    });
  }
},

/* ─────────────────────────────────────────────────────────── 13 ───────── */
{
  id: 13,
  name: { en: 'Unprinted', ar: 'حبر خفي' },
  instruction: {
    en: 'One hidden word is a colour. Type it.',
    ar: 'إحدى الكلمات المخفية لون. اكتبه.'
  },
  hint: {
    en: 'Six words are written here in the background colour.',
    ar: 'ست كلمات مكتوبة هنا بلون الخلفية.'
  },
  hint2: {
    en: 'The paragraph has gaps that no visible word fills.',
    ar: 'في الفقرة فجوات لا تملؤها أي كلمة ظاهرة.'
  },
  hint3: {
    en: 'Drag across the text to select it — selection paints over invisible ink.',
    ar: 'اسحب المؤشر فوق النص لتحديده — التحديد يكشف الحبر الخفي.'
  },
  note: { en: 'Selection is a light source.', ar: 'التحديد مصدر ضوء.' },

  difficulty: 4,
  mechanicIntroduced: 'selectText',

  setup(ctx) {
    /* One colour among five ordinary nouns. Each filler list is exactly 18
       words so the every-third interleave places all six hidden words. */
    const SET = ctx.t({
      en: {
        answer: 'cobalt',
        hidden: ['ledger', 'harbour', 'cobalt', 'plinth', 'marrow', 'tundra'],
        filler: ['the', 'record', 'notes', 'that', 'the', 'room', 'was', 'entered',
                 'twice', 'and', 'that', 'nothing', 'at', 'all', 'was',
                 'taken', 'from', 'it'],
        dir: 'ltr'
      },
      ar: {
        answer: 'فيروزي',
        hidden: ['سجل', 'ميناء', 'فيروزي', 'دفتر', 'سرداب', 'مرساة'],
        filler: ['يقول', 'التقرير', 'إن', 'الغرفة', 'فُتحت', 'مرتين', 'وأن', 'لا',
                 'شيء', 'على', 'الإطلاق', 'قد', 'أُخذ', 'من', 'داخلها', 'في',
                 'تلك', 'الليلة'],
        dir: 'rtl'
      }
    });

    const pool = SET.hidden.slice();
    const parts = [];
    SET.filler.forEach((w, i) => {
      parts.push('<span>' + w + '</span>');
      if (i % 3 === 2 && pool.length) parts.push('<span class="hw">' + pool.shift() + '</span>');
    });
    ctx.el('div', 'para', { html: parts.join(' ') });

    const input = ctx.el('input', 'field obj', {
      attrs: {
        type: 'text', placeholder: '······', autocomplete: 'off',
        spellcheck: 'false', dir: SET.dir
      },
      style: { left: '50%', top: '78%', transform: 'translate(-50%,-50%)' }
    });

    /* Accept the bare noun or the definite form, and ignore harakat, so a
       player is never punished for spelling الفيروزي instead of فيروزي. */
    const norm = s => String(s).normalize('NFC')
      .replace(/[ً-ْـٰ]/g, '')
      .replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
    const target = norm(SET.answer);
    const ok = () => {
      const v = norm(input.value);
      return v === target || v === norm('ال') + target;
    };

    ctx.on(input, 'keydown', e => {
      if (e.key !== 'Enter') return;
      if (!ok()) {
        input.classList.add('is-bad');
        ctx.after(400, () => input.classList.remove('is-bad'));
        ctx.say(ctx.t({ en: 'not that one', ar: 'ليست هذه' }), 'warn');
      }
    });

    ctx.check(ok);
  }
},

/* ─────────────────────────────────────────────────────────── 14 ───────── */
{
  id: 14,
  name: { en: 'Off-screen', ar: 'خارج الشاشة' },
  instruction: {
    en: 'Put five tokens in the five slots.',
    ar: 'ضع القطع الخمس في الفتحات الخمس.'
  },
  hint: {
    en: 'There are only three tokens in view. The map in the corner shows more.',
    ar: 'ثلاث قطع فقط ظاهرة. والخريطة في الزاوية تكشف المزيد.'
  },
  hint2: {
    en: 'The map in the corner shows five dots. The box shows three.',
    ar: 'الخريطة في الزاوية تُظهر خمس نقاط. والصندوق يُظهر ثلاثًا.'
  },
  hint3: {
    en: 'Drag the empty background to pan the world.',
    ar: 'اسحب الخلفية الفارغة لتحريك العالم.'
  },
  note: { en: 'The window is not the world.', ar: 'النافذة ليست العالم.' },

  difficulty: 4,
  mechanicIntroduced: 'panWorld',
  mechanicsRequired: ['dragObject'],

  setup(ctx) {
    const s = ctx.size();
    const WW = Math.round(s.w * 2.2), WH = Math.round(s.h * 2.2);

    const world = ctx.el('div', 'world', { style: { width: WW + 'px', height: WH + 'px' } });
    const startX = -Math.round((WW - s.w) / 2), startY = -Math.round((WH - s.h) / 2);
    ctx.place(world, startX, startY);

    const clampPan = () => {
      const st = ctx.size();
      const x = Math.max(st.w - WW, Math.min(0, parseFloat(world.style.left) || 0));
      const y = Math.max(st.h - WH, Math.min(0, parseFloat(world.style.top) || 0));
      ctx.place(world, x, y);
    };
    ctx.drag(world, { affordance: false, onMove: clampPan });

    /* five sockets pinned to the stage */
    const sockets = [];
    for (let i = 0; i < 5; i++) {
      sockets.push(ctx.el('div', 'slot obj', {
        style: {
          width: '44px', height: '44px', zIndex: '5',
          left: 'calc(50% + ' + ((i - 2) * 56) + 'px - 22px)', bottom: '22px', top: 'auto'
        }
      }));
    }

    /* three tokens near the middle, two far away */
    const spots = [
      [-140, -60], [90, 40], [10, -150],
      [-Math.round(WW * 0.34), Math.round(WH * 0.30)],
      [Math.round(WW * 0.36), -Math.round(WH * 0.31)]
    ];
    const tokens = spots.map(([dx, dy]) => {
      const t = ctx.el('div', 'token grab', {
        parent: world,
        x: Math.round(WW / 2 + dx), y: Math.round(WH / 2 + dy)
      });
      ctx.drag(t, {
        affordance: false,
        enabled: () => !t.dataset.home,
        onMove: () => {
          /* A token lives in the world, not the stage, so `bounds` cannot hold
             it: the world is deliberately larger than the view. Clamp to the
             world instead — dragged past its edge a token would sit outside
             every reachable pan, clipped by the stage and gone for good. */
          const cx = Math.max(0, Math.min(WW - t.offsetWidth, parseFloat(t.style.left) || 0));
          const cy = Math.max(0, Math.min(WH - t.offsetHeight, parseFloat(t.style.top) || 0));
          ctx.place(t, cx, cy);
          sockets.forEach(k =>
            k.classList.toggle('is-hot', !k.dataset.full && ctx.hits(t, k, -6)));
        },
        onDrop: () => {
          const k = sockets.find(k => !k.dataset.full && ctx.hits(t, k, -6));
          sockets.forEach(k => k.classList.remove('is-hot'));
          if (!k) return;
          k.dataset.full = '1';
          k.classList.add('is-done');
          t.dataset.home = '1';
          t.classList.add('is-home');
          t.classList.remove('grab');
          k.appendChild(t);
          ctx.place(t, 5, 5);
        }
      });
      return t;
    });

    /* minimap */
    const mm = ctx.el('div', 'minimap');
    const view = ctx.el('div', 'mm-view', { parent: mm });
    const dots = tokens.map(() => ctx.el('div', 'mm-dot', { parent: mm }));

    ctx.frame(() => {
      const st = ctx.size();
      const kx = 106 / WW, ky = 70 / WH;
      view.style.left = (-(parseFloat(world.style.left) || 0) * kx) + 'px';
      view.style.top = (-(parseFloat(world.style.top) || 0) * ky) + 'px';
      view.style.width = (st.w * kx) + 'px';
      view.style.height = (st.h * ky) + 'px';
      tokens.forEach((t, i) => {
        const home = !!t.dataset.home;
        dots[i].classList.toggle('is-home', home);
        if (home) { dots[i].style.display = 'none'; return; }
        dots[i].style.display = '';
        dots[i].style.left = ((parseFloat(t.style.left) || 0) * kx) + 'px';
        dots[i].style.top = ((parseFloat(t.style.top) || 0) * ky) + 'px';
      });
      const n = sockets.filter(k => k.dataset.full).length;
      ctx.say(n + ' / 5', n === 5 ? 'good' : '');
    });

    ctx.check(() => sockets.every(k => k.dataset.full));
  }
},

/* ─────────────────────────────────────────────────────────── 15 ───────── */
{
  id: 15,
  name: { en: 'You cannot finish', ar: 'لا يمكنك الإنهاء' },

  /* Removing «لا» flips the sentence to «يمكنك الإنهاء» — you can finish. */
  instruction: { en: 'You cannot finish.', ar: 'لا يمكنك الإنهاء.' },
  hint: {
    en: 'Three locks. Each one opens with something you have already done.',
    ar: 'ثلاثة أقفال. كل قفل يُفتح بشيء فعلته من قبل.'
  },
  hint2: {
    en: 'Three pips, three locks. Each pip names the thing it is waiting for.',
    ar: 'ثلاث نقاط، ثلاثة أقفال. كل نقطة تسمّي ما تنتظره.'
  },
  hint3: {
    en: 'Edit the sentence · make the button fill its outline · fill the progress bar.',
    ar: 'حرّر الجملة · اجعل الزر يملأ إطاره · املأ شريط التقدم.'
  },
  note: {
    en: 'Everything on the screen was always in play.',
    ar: 'كل ما على الشاشة كان دائمًا جزءًا من اللعبة.'
  },

  difficulty: 5,
  mechanicsRequired: ['removeText', 'resizeObject', 'manipulateUI'],
  globalElementsAllowed: ['progress'],

  setup(ctx) {
    const H = 52, TARGET = 258;
    const CANNOT = { en: 'cannot', ar: 'لا' };

    ctx.el('div', 'ghost', { style: { width: TARGET + 'px', height: H + 'px', top: '46%' } });

    const btn = ctx.el('button', 'gbtn is-off obj', {
      text: ctx.t({ en: 'SOLVE', ar: 'حُل' }), attrs: { type: 'button' },
      style: {
        left: '50%', top: '46%', transform: 'translate(-50%,-50%)',
        width: '120px', height: H + 'px', padding: '0'
      }
    });

    const bar = ctx.claim("progress", { start: 0, onChange: () => paint() });
    ctx.resize(btn, {
      mode: 'box', min: 110, max: 360, keepRatio: false, gain: 2, onResize: () => paint()
    });
    ctx.words(CANNOT, { onRemove: () => paint(), onDrop: () => paint() });

    const latches = ctx.el('div', 'latches');
    const pips = ctx.t({
      en: ['sentence', 'size', 'progress'],
      ar: ['الجملة', 'الحجم', 'التقدم']
    }).map(label => {
      const l = ctx.el('div', 'latch', { parent: latches, html: '<b></b>' });
      l.appendChild(document.createTextNode(label));
      return l;
    });

    const open = () => [
      !ctx.hasWord(CANNOT),
      btn.offsetWidth >= TARGET - 4,
      bar.value() > 0.995
    ];

    function paint() {
      const o = open();
      pips.forEach((p, i) => p.classList.toggle('is-on', o[i]));
      const all = o.every(Boolean);
      btn.classList.toggle('is-off', !all);
      btn.classList.toggle('is-on', all);
    }

    ctx.on(btn, 'click', e => {
      if (e.target.classList.contains('rs-handle')) return;   // resizing, not pressing
      const o = open();
      if (o.every(Boolean)) ctx.solve();
      else ctx.reject(ctx.t({
        en: ['the sentence still forbids it', 'the button is too small',
             'the bar is not full'],
        ar: ['الجملة ما زالت تمنع ذلك', 'الزر أصغر من اللازم',
             'الشريط لم يمتلئ']
      })[o.indexOf(false)]);
    });

    ctx.frame(paint);
    paint();
  }
},

/* ══════════════════════════════════════════════════════════════════════════
   SEASON II — ECHO
   ══════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────── 16 ───────── */
{
  id: 16,
  day: 1,
  name: { en: 'First word', ar: 'الكلمة الأولى' },

  /* The whole instruction. No translation is offered here or anywhere else:
     the meaning has to be earned by doing, or the season has no spine. */
  instruction: 'VE',

  introducedToken: 'VE',
  mechanicIntroduced: 'echoToken',
  mechanicsRequired: ['dragObject'],
  cipherCapabilitiesRequired: [],
  echoMarkChar: 'Y',

  hint: {
    en: 'The word may be an instruction.',
    ar: 'قد تكون الكلمة تعليمة.'
  },
  hint2: {
    en: 'What can change position?',
    ar: 'ما الذي يمكنه تغيير موضعه؟'
  },
  hint3: {
    en: 'Move the object.',
    ar: 'حرّك الشيء.'
  },
  note: { en: 'VE', ar: 'VE' },

  setup(ctx) {
    const { w, h } = ctx.size();

    /* The engine marks echo tokens for every Season II level; this level only
       needs to clean up the reaction class it adds on success. */
    const token = ctx.word('VE');
    if (token) ctx.own(() => token.classList.remove('is-echo-move'));

    /* The destination sits diagonally, never straight to the right. If the
       first token always produced rightward movement, players would quietly
       learn "VE = right" — and collide with SE later. VE means move. */
    const target = ctx.el('div', 'slot', {
      style: {
        width: '78px', height: '78px',
        left: Math.round(w * 0.66) + 'px',
        top: Math.round(h * 0.24) + 'px'
      }
    });

    const obj = ctx.el('div', 'echo-obj obj grab', {
      x: Math.round(w * 0.22),
      y: Math.round(h * 0.60)
    });

    let done = false;

    ctx.drag(obj, { affordance: false, bounds: 'stage', enabled: () => !done });

    ctx.frame(() => {
      if (done) return;
      const over = ctx.hits(obj, target, -14);
      target.classList.toggle('is-hot', over);
      if (!over) return;

      done = true;
      target.classList.remove('is-hot');
      target.classList.add('is-done');

      /* settle into the slot so the arrival feels deliberate */
      obj.classList.add('is-landed');
      ctx.place(obj,
        target.offsetLeft + (target.offsetWidth - obj.offsetWidth) / 2,
        target.offsetTop + (target.offsetHeight - obj.offsetHeight) / 2);

      /* The reward, and the whole point of the level: the word itself moves.
         It plays before the success card so it is not hidden behind it. */
      if (token) token.classList.add('is-echo-move');
      ctx.after(780, () => ctx.solve());
    });
  }
},

/* ─────────────────────────────────────────────────────────── 17 ───────── */
{
  id: 17,
  day: 2,
  name: { en: 'This one', ar: 'هذا بالذات' },
  instruction: 'VE NA',

  introducedToken: 'NA',
  mechanicIntroduced: 'echoTarget',
  mechanicsRequired: ['dragObject', 'echoToken'],
  cipherCapabilitiesRequired: [],
  echoMarkChar: 'O',

  hint: {
    en: 'You already know the first word. The second one is doing something.',
    ar: 'أنت تعرف الكلمة الأولى. الثانية تفعل شيئًا ما.'
  },
  hint2: {
    en: 'Only one of the three is attached to it.',
    ar: 'واحد فقط من الثلاثة موصول بها.'
  },
  hint3: {
    en: 'Move the object the line comes down to.',
    ar: 'حرّك الشيء الذي ينزل إليه الخط.'
  },
  note: 'VE NA',

  setup(ctx) {
    const UI = window.RULESET_ECHO_UI;
    const { w, h } = ctx.size();

    const slot = ctx.el('div', 'slot', {
      style: {
        width: '78px', height: '78px',
        left: Math.round(w * 0.74) + 'px',
        top: Math.round(h * 0.5 - 39) + 'px'
      }
    });

    /* Three identical objects. The NA one is NOT the nearest to the slot, so
       proximity can never stand in for understanding the word. */
    const spots = [
      [w * 0.16, h * 0.24],
      [w * 0.20, h * 0.64],   // ← this one
      [w * 0.44, h * 0.44]
    ];
    const objs = spots.map(([x, y]) =>
      ctx.el('div', 'echo-obj obj grab', { x: Math.round(x), y: Math.round(y) }));

    const chosen = objs[1];
    const home = objs.map(o => ({ x: o.offsetLeft, y: o.offsetTop }));

    /* NA says "this". The line is the whole definition. */
    const na = ctx.word('NA');
    if (na) {
      const link = UI.tether(ctx.board, na, chosen);
      ctx.own(link.destroy);
      ctx.frame(link.update);

      // and the two breathe together, so the pairing survives a still frame
      na.classList.add('echo-pulse');
      chosen.classList.add('echo-pulse', 'is-na');
      ctx.own(() => na.classList.remove('echo-pulse'));
    }

    let done = false;

    const springHome = (o, i) => {
      o.classList.add('is-springing');
      ctx.place(o, home[i].x, home[i].y);
      ctx.after(460, () => o.classList.remove('is-springing'));
    };

    objs.forEach((o, i) => {
      ctx.drag(o, {
        affordance: false, bounds: 'stage', enabled: () => !done,
        magnet: () => [slot],
        onDrop() {
          if (done || o === chosen) return;
          /* a decoy simply will not stay put: VE NA moves THIS one, and a
             decoy is not this one. No penalty, no shake, just a quiet no. */
          springHome(o, i);
          ctx.say(ctx.t({ en: 'not that one', ar: 'ليس هذا' }));
        }
      });
    });

    ctx.frame(() => {
      if (done) return;
      const over = ctx.hits(chosen, slot, -14);
      slot.classList.toggle('is-hot', over);
      if (!over) return;

      done = true;
      slot.classList.remove('is-hot');
      slot.classList.add('is-done');
      chosen.classList.add('is-landed');
      chosen.classList.remove('echo-pulse');
      ctx.place(chosen,
        slot.offsetLeft + (slot.offsetWidth - chosen.offsetWidth) / 2,
        slot.offsetTop + (slot.offsetHeight - chosen.offsetHeight) / 2);
      ctx.say('');
      ctx.after(560, () => ctx.solve());
    });
  }
},

/* ─────────────────────────────────────────────────────────── 18 ───────── */
{
  id: 18,
  day: 3,
  name: { en: 'That way', ar: 'هذا الاتجاه' },
  instruction: 'VE NA OR',

  introducedToken: 'OR',
  mechanicIntroduced: 'echoDirection',
  mechanicsRequired: ['dragObject', 'echoToken', 'echoTarget'],
  cipherCapabilitiesRequired: [],
  echoMarkChar: 'U',

  hint: {
    en: 'Two places will take it. The instruction has grown by one word.',
    ar: 'هناك مكانان يقبلانه. والتعليمة زادت كلمة واحدة.'
  },
  hint2: {
    en: 'Watch the new word, then watch the room. Something keeps its time.',
    ar: 'راقب الكلمة الجديدة ثم راقب المكان. شيء ما يوافق إيقاعها.'
  },
  hint3: {
    en: 'The new word names a side.',
    ar: 'الكلمة الجديدة تسمّي جهة.'
  },
  note: 'VE NA OR',

  setup(ctx) {
    const UI = window.RULESET_ECHO_UI;
    const { w, h } = ctx.size();
    const Z = 96;

    /* Two destinations, identical in every respect a player could measure —
       same size, same border, same distance from the object. */
    const zone = x => ctx.el('div', 'echo-zone', {
      style: {
        width: Z + 'px', height: Z + 'px',
        left: Math.round(x) + 'px',
        top: Math.round(h * 0.5 - Z / 2) + 'px'
      }
    });
    const left = zone(w * 0.08);
    const right = zone(w * 0.92 - Z);

    const obj = ctx.el('div', 'echo-obj obj grab', {
      x: Math.round(w * 0.5 - 22), y: Math.round(h * 0.5 - 22)
    });
    const home = { x: obj.offsetLeft, y: obj.offsetTop };

    const na = ctx.word('NA');
    if (na) {
      const link = UI.tether(ctx.board, na, obj);
      ctx.own(link.destroy);
      ctx.frame(link.update);
      obj.classList.add('is-na');
    }

    /* The echo: OR and the left zone breathe on the same beat. Applied in the
       same frame so they stay in phase — the rhythm IS the clue. */
    const or = ctx.word('OR');
    if (or) {
      or.classList.add('echo-pulse');
      left.classList.add('echo-pulse');
      ctx.own(() => or.classList.remove('echo-pulse'));
    }

    let done = false;

    ctx.drag(obj, {
      affordance: false, bounds: 'stage', enabled: () => !done,
      magnet: () => [left, right],
      onDrop() {
        if (done) return;
        if (!ctx.hits(obj, right, -14)) return;
        /* the wrong side: no failure, just a refusal and a ride home */
        right.classList.add('is-no');
        ctx.after(700, () => right.classList.remove('is-no'));
        obj.classList.add('is-springing');
        ctx.place(obj, home.x, home.y);
        ctx.after(460, () => obj.classList.remove('is-springing'));
      }
    });

    ctx.frame(() => {
      if (done) return;
      const onLeft = ctx.hits(obj, left, -14);
      left.classList.toggle('is-hot', onLeft);
      right.classList.toggle('is-hot', !onLeft && ctx.hits(obj, right, -14));
      if (!onLeft) return;

      done = true;
      left.classList.remove('is-hot', 'echo-pulse');
      left.classList.add('is-done');
      obj.classList.add('is-landed');
      ctx.place(obj,
        left.offsetLeft + (Z - obj.offsetWidth) / 2,
        left.offsetTop + (Z - obj.offsetHeight) / 2);
      ctx.after(560, () => ctx.solve());
    });
  }
},

/* ─────────────────────────────────────────────────────────── 19 ───────── */
{
  id: 19,
  day: 4,
  name: { en: 'The other side', ar: 'الجهة الأخرى' },
  instruction: 'VE NA SE',

  introducedToken: 'SE',
  mechanicIntroduced: 'echoDirection',
  mechanicsRequired: ['dragObject', 'echoToken', 'echoTarget', 'echoDirection'],
  cipherCapabilitiesRequired: [],
  echoMarkChar: ' ',

  hint: {
    en: 'You have met three of these words. Only the last one is new.',
    ar: 'قابلت ثلاثًا من هذه الكلمات. الأخيرة وحدها جديدة.'
  },
  hint2: {
    en: 'Yesterday a word named a side. This is not that word.',
    ar: 'بالأمس سمّت كلمةٌ جهة. وهذه ليست تلك الكلمة.'
  },
  hint3: {
    en: 'It names the opposite side.',
    ar: 'إنها تسمّي الجهة المقابلة.'
  },
  note: 'VE NA SE',

  /* Deliberately the quickest level of the season so far: its job is to prove
     that ECHO's vocabulary is consistent, not to be difficult. A player who
     understood 18 should finish this in one drag and feel fluent. */
  setup(ctx) {
    const UI = window.RULESET_ECHO_UI;
    const { w, h } = ctx.size();
    const D = 92;

    /* Round, and staggered in height — the same choice as level 18 wearing
       different clothes, so the logic transfers but the picture does not. */
    const pad = ctx.el('div', 'echo-zone is-round', {
      style: {
        width: D + 'px', height: D + 'px',
        left: Math.round(w * 0.09) + 'px',
        top: Math.round(h * 0.58) + 'px'
      }
    });
    const target = ctx.el('div', 'echo-zone is-round', {
      style: {
        width: D + 'px', height: D + 'px',
        left: Math.round(w * 0.91 - D) + 'px',
        top: Math.round(h * 0.20) + 'px'
      }
    });

    const obj = ctx.el('div', 'echo-obj obj grab', {
      x: Math.round(w * 0.5 - 22), y: Math.round(h * 0.42)
    });
    const home = { x: obj.offsetLeft, y: obj.offsetTop };

    const na = ctx.word('NA');
    if (na) {
      const link = UI.tether(ctx.board, na, obj);
      ctx.own(link.destroy);
      ctx.frame(link.update);
      obj.classList.add('is-na');
    }

    const se = ctx.word('SE');
    if (se) {
      se.classList.add('echo-pulse');
      target.classList.add('echo-pulse');
      ctx.own(() => se.classList.remove('echo-pulse'));
    }

    let done = false;

    ctx.drag(obj, {
      affordance: false, bounds: 'stage', enabled: () => !done,
      magnet: () => [pad, target],
      onDrop() {
        if (done || !ctx.hits(obj, pad, -14)) return;
        pad.classList.add('is-no');
        ctx.after(700, () => pad.classList.remove('is-no'));
        obj.classList.add('is-springing');
        ctx.place(obj, home.x, home.y);
        ctx.after(460, () => obj.classList.remove('is-springing'));
      }
    });

    ctx.frame(() => {
      if (done) return;
      const on = ctx.hits(obj, target, -14);
      target.classList.toggle('is-hot', on);
      pad.classList.toggle('is-hot', !on && ctx.hits(obj, pad, -14));
      if (!on) return;

      done = true;
      target.classList.remove('is-hot', 'echo-pulse');
      target.classList.add('is-done');
      obj.classList.add('is-landed');
      ctx.place(obj,
        target.offsetLeft + (D - obj.offsetWidth) / 2,
        target.offsetTop + (D - obj.offsetHeight) / 2);
      ctx.after(520, () => ctx.solve());
    });
  }
},

/* ─────────────────────────────────────────────────────────── 20 ───────── */
{
  id: 20,
  day: 5,
  name: { en: 'Do not', ar: 'لا تفعل' },
  instruction: 'KA VE NA',

  introducedToken: 'KA',
  mechanicIntroduced: 'echoNegate',
  mechanicsRequired: ['dragObject', 'echoToken', 'echoTarget', 'wait'],
  cipherCapabilitiesRequired: [],
  echoMarkChar: 'B',

  hint: {
    en: 'You know every word here except the first.',
    ar: 'تعرف كل كلمة هنا ما عدا الأولى.'
  },
  hint2: {
    en: 'The first word changes the rest of the sentence.',
    ar: 'الكلمة الأولى تغيّر بقية الجملة.'
  },
  hint3: {
    en: 'It reverses the instruction. So do not.',
    ar: 'إنها تعكس التعليمة. فلا تفعل.'
  },
  note: 'KA VE NA',

  setup(ctx) {
    const UI = window.RULESET_ECHO_UI;
    const { w, h } = ctx.size();
    const NEED = 4;                       // seconds of stillness

    /* Every furnishing of the last four levels, arranged to invite exactly the
       move that is now forbidden: one object, one empty frame, a line naming
       the object, and a slot that lights up as you approach it. */
    const slot = ctx.el('div', 'slot', {
      style: {
        width: '80px', height: '80px',
        left: Math.round(w * 0.74) + 'px',
        top: Math.round(h * 0.5 - 40) + 'px'
      }
    });

    const obj = ctx.el('div', 'echo-obj obj grab is-live is-na', {
      x: Math.round(w * 0.20), y: Math.round(h * 0.5 - 22)
    });
    const home = { x: obj.offsetLeft, y: obj.offsetTop };

    const na = ctx.word('NA');
    if (na) {
      const link = UI.tether(ctx.board, na, obj);
      ctx.own(link.destroy);
      ctx.frame(link.update);
    }

    const ka = ctx.word('KA');
    if (ka) {
      ka.classList.add('echo-pulse');
      ctx.own(() => ka.classList.remove('echo-pulse'));
    }

    let held = 0, holding = false, moved = false, done = false, clock = 0;

    ctx.drag(obj, {
      affordance: false, bounds: 'stage', enabled: () => !done,
      magnet: () => [slot],
      onGrab() { holding = true; },
      onMove() { moved = true; held = 0; },
      onDrop() {
        holding = false;
        held = 0;
        if (!moved || done) { moved = false; return; }
        moved = false;
        /* returned, not rejected: KA forbids the move, it does not punish it */
        obj.classList.add('is-springing');
        ctx.place(obj, home.x, home.y);
        ctx.after(470, () => obj.classList.remove('is-springing'));
      }
    });

    ctx.frame(dt => {
      if (done) return;
      clock += dt;
      slot.classList.toggle('is-hot', ctx.hits(obj, slot, -14));

      if (holding) { held = 0; }
      else held += dt;

      /* No countdown — that would turn a rule into a timer. Instead the
         object's restlessness drains away as it is left alone, so stillness
         reads as the thing being asked for. */
      const amp = Math.max(0, 1 - held / NEED);
      obj.style.transform = 'scale(' + (1 + amp * 0.06 * Math.sin(clock * 4.2)) + ')';

      if (held < NEED) return;
      done = true;
      obj.style.transform = 'scale(1)';
      obj.classList.add('is-landed');
      slot.classList.remove('is-hot');
      if (ka) ka.classList.add('is-echo-move');
      ctx.after(620, () => ctx.solve());
    });

    ctx.own(() => { obj.style.transform = ''; if (ka) ka.classList.remove('is-echo-move'); });
  }
},

/* ─────────────────────────────────────────────────────────── 21 ───────── */
{
  id: 21,
  day: 6,
  name: { en: 'Only one', ar: 'واحد فقط' },
  instruction: 'VE NA MI',

  introducedToken: 'MI',
  mechanicIntroduced: 'echoCount',
  mechanicsRequired: ['dragObject', 'echoToken', 'echoTarget'],
  echoMarkChar: 'U',

  hint: {
    en: 'All three of them will fit.',
    ar: 'الثلاثة جميعًا تتسع هناك.'
  },
  hint2: {
    en: 'The frame is asking for a quantity, not a choice.',
    ar: 'الإطار يطلب كميّة، لا اختيارًا.'
  },
  hint3: {
    en: 'The last word means one.',
    ar: 'الكلمة الأخيرة تعني واحدًا.'
  },
  note: 'VE NA MI',

  setup(ctx) {
    const { w, h } = ctx.size();
    const S = 124;

    /* deliberately wide enough to hold all three — the constraint has to be
       the word, not the geometry */
    const slot = ctx.el('div', 'slot', {
      style: {
        width: S + 'px', height: S + 'px',
        left: Math.round(w * 0.68) + 'px',
        top: Math.round(h * 0.5 - S / 2) + 'px'
      }
    });
    ctx.el('i', 'echo-pip', { parent: slot });

    /* MI carries one pip; so does the frame. Singularity, never a digit. */
    const mi = ctx.word('MI');
    if (mi) {
      mi.classList.add('has-pip');
      ctx.own(() => mi.classList.remove('has-pip', 'echo-pulse'));
    }

    /* three equals — every one of them is a valid NA */
    const spots = [[w * 0.13, h * 0.22], [w * 0.13, h * 0.5 - 22], [w * 0.13, h * 0.78 - 44]];
    const objs = spots.map(([x, y]) =>
      ctx.el('div', 'echo-obj obj grab is-na', { x: Math.round(x), y: Math.round(y) }));
    const home = objs.map(o => ({ x: o.offsetLeft, y: o.offsetTop }));

    let done = false, hold = 0;

    const sendHome = (o, i) => {
      o.classList.add('is-springing');
      ctx.place(o, home[i].x, home[i].y);
      ctx.after(470, () => o.classList.remove('is-springing'));
    };

    objs.forEach(o => ctx.drag(o, {
      affordance: false, bounds: 'stage', enabled: () => !done,
      magnet: () => [slot]
    }));

    ctx.frame(dt => {
      if (done) return;
      const inside = objs.filter(o => ctx.hits(o, slot, -18));

      slot.classList.toggle('is-count', inside.length === 1);
      if (mi) mi.classList.toggle('echo-pulse', inside.length === 1);

      if (inside.length === 0) { hold = 0; ctx.say(''); return; }

      if (inside.length > 1) {
        /* a second piece breaks the count: everything goes back, no scolding */
        hold = 0;
        objs.forEach(sendHome);
        ctx.say(ctx.t({ en: 'too many', ar: 'أكثر من اللازم' }), 'warn');
        return;
      }

      hold += dt;
      ctx.say('');
      if (hold < 1) return;

      done = true;
      slot.classList.add('is-done');
      inside[0].classList.add('is-landed');
      ctx.after(420, () => ctx.solve());
    });
  }
},

/* ─────────────────────────────────────────────────────────── 22 ───────── */
{
  id: 22,
  day: 7,
  name: { en: 'Again', ar: 'مرة أخرى' },
  instruction: 'RU VE NA',

  introducedToken: 'RU',
  mechanicIntroduced: 'echoRepeat',
  mechanicsRequired: ['dragObject', 'echoToken', 'echoTarget'],
  echoMarkChar: 'I',

  hint: {
    en: 'Something happened before the words arrived.',
    ar: 'حدث شيء قبل أن تظهر الكلمات.'
  },
  hint2: {
    en: 'The first word asks for it a second time.',
    ar: 'الكلمة الأولى تطلبه مرة ثانية.'
  },
  hint3: {
    en: 'Trace the same path: across, then down.',
    ar: 'ارسم المسار نفسه: عرضًا ثم نزولًا.'
  },
  note: 'RU VE NA',

  setup(ctx) {
    const UI = window.RULESET_ECHO_UI;
    const { w, h } = ctx.size();

    const PATTERN = ['right', 'down'];
    const STEP = 74;                      // how far a move must go to count

    const start = { x: Math.round(w * 0.24), y: Math.round(h * 0.26) };

    /* the demonstration, performed by a ghost before a single word appears */
    const ghost = ctx.el('div', 'echo-ghost', { x: start.x, y: start.y });
    const obj = ctx.el('div', 'echo-obj obj grab is-na', { x: start.x, y: start.y });

    const instr = ctx.instructionEl;
    instr.style.opacity = '0';
    instr.style.transition = 'opacity .6s var(--ease)';
    ctx.own(() => { instr.style.opacity = ''; instr.style.transition = ''; });

    const na = ctx.word('NA');
    if (na) {
      const link = UI.tether(ctx.board, na, obj);
      ctx.own(link.destroy);
      ctx.frame(link.update);
    }

    let demoing = false;

    function demo(then) {
      demoing = true;
      ghost.style.opacity = '1';
      ctx.place(ghost, start.x, start.y);
      ctx.after(140, () => ctx.place(ghost, start.x + 200, start.y));
      ctx.after(820, () => ctx.place(ghost, start.x + 200, start.y + 150));
      ctx.after(1520, () => ctx.place(ghost, start.x, start.y));
      ctx.after(2180, () => {
        ghost.style.opacity = '0';
        demoing = false;
        if (then) then();
      });
    }

    demo(() => { instr.style.opacity = '1'; });

    /* replay for anyone who missed it — no button, no English, just patience */
    let idle = 0;
    let done = false;

    /* reduce a drag into cardinal moves. Broad strokes only: this is about
       direction and order, never coordinates. */
    let last = null, acc = { x: 0, y: 0 }, seq = [];

    ctx.drag(obj, {
      affordance: false, bounds: 'stage', enabled: () => !done && !demoing,
      onGrab(el, e) { last = { x: e.clientX, y: e.clientY }; acc = { x: 0, y: 0 }; seq = []; },
      onMove(el, e) {
        if (!last) return;
        acc.x += e.clientX - last.x;
        acc.y += e.clientY - last.y;
        last = { x: e.clientX, y: e.clientY };
        idle = 0;

        if (Math.abs(acc.x) >= STEP && Math.abs(acc.x) > Math.abs(acc.y)) {
          seq.push(acc.x > 0 ? 'right' : 'left');
          acc = { x: 0, y: 0 };
        } else if (Math.abs(acc.y) >= STEP && Math.abs(acc.y) > Math.abs(acc.x)) {
          seq.push(acc.y > 0 ? 'down' : 'up');
          acc = { x: 0, y: 0 };
        }
      },
      onDrop() {
        if (done) return;
        const got = seq.slice(0, PATTERN.length).join(',');
        if (got === PATTERN.join(',')) {
          done = true;
          ctx.say('');
          obj.classList.add('is-landed');
          demo(() => ctx.solve());          // echo the original, then finish
          return;
        }
        obj.classList.add('is-springing');
        ctx.place(obj, start.x, start.y);
        ctx.after(470, () => obj.classList.remove('is-springing'));
        ctx.after(560, () => demo());        // show it again rather than explain
      }
    });

    ctx.frame(dt => {
      if (done || demoing) return;
      idle += dt;
      if (idle > 9) { idle = 0; demo(); }
    });
  }
},

/* ─────────────────────────────────────────────────────────── 23 ───────── */
{
  id: 23,
  day: 8,
  name: { en: 'Light', ar: 'ضوء' },
  instruction: 'LI NA',

  introducedToken: 'LI',
  mechanicIntroduced: 'echoReveal',
  mechanicsRequired: ['dragObject', 'echoToken', 'echoTarget'],
  echoMarkChar: 'L',

  hint: {
    en: 'You cannot move what you cannot see.',
    ar: 'لا يمكنك تحريك ما لا تراه.'
  },
  hint2: {
    en: 'The bright thing is yours to carry.',
    ar: 'الشيء المضيء لك أن تحمله.'
  },
  hint3: {
    en: 'Search the dark until something answers.',
    ar: 'فتّش العتمة حتى يستجيب شيء.'
  },
  note: 'LI NA',

  setup(ctx) {
    const UI = window.RULESET_ECHO_UI;
    const { w, h } = ctx.size();
    const R = 96;

    /* things in the room, all equally invisible until lit */
    const spots = [
      [w * 0.20, h * 0.30], [w * 0.44, h * 0.66],
      [w * 0.68, h * 0.26], [w * 0.78, h * 0.68]
    ];
    const things = spots.map(([x, y]) =>
      ctx.el('div', 'echo-hidden', { x: Math.round(x), y: Math.round(y) }));
    const hidden = things[2];

    const dark = ctx.el('div', 'echo-dark');

    const lamp = ctx.el('div', 'echo-lamp', {
      x: Math.round(w * 0.12), y: Math.round(h * 0.78)
    });
    ctx.drag(lamp, { affordance: false, bounds: 'stage' });

    /* the darkness is a mask with a hole in it, and the lamp is the hole */
    ctx.frame(() => {
      const lx = lamp.offsetLeft + 20, ly = lamp.offsetTop + 20;
      const g = 'radial-gradient(circle ' + R + 'px at ' + lx + 'px ' + ly + 'px,' +
                ' transparent 0%, transparent 38%, #000 100%)';
      dark.style.webkitMaskImage = g;
      dark.style.maskImage = g;
    });

    /* NA stays silent until the light finds it. Naming it up front would make
       the darkness decoration; this way the tether is the reward. */
    let link = null, lit = 0, done = false;
    const na = ctx.word('NA');

    ctx.frame(dt => {
      if (done) return;
      const found = ctx.near(lamp, hidden, R * 0.72);

      hidden.classList.toggle('is-found', found);
      if (found && !link && na) {
        link = UI.tether(ctx.board, na, hidden);
        ctx.own(() => link && link.destroy());
      }
      if (link) link.update();

      lit = found ? lit + dt : 0;
      if (lit < 0.7) return;

      done = true;
      /* the room comes up: LI was never only about the lamp */
      dark.style.transition = 'opacity .9s var(--ease)';
      dark.style.opacity = '0';
      ctx.after(760, () => ctx.solve());
    });
  }
},

/* ─────────────────────────────────────────────────────────── 24 ───────── */
{
  id: 24,
  day: 9,
  name: { en: 'Read it', ar: 'اقرأها' },
  instruction: 'VE NA OR MI',

  mechanicIntroduced: 'echoSentence',
  mechanicsRequired: ['dragObject', 'echoToken', 'echoTarget', 'echoDirection', 'echoCount'],
  echoMarkChar: 'T',

  hint: {
    en: 'Nothing here is new. Every word is doing its job.',
    ar: 'لا جديد هنا. كل كلمة تؤدي عملها.'
  },
  hint2: {
    en: 'Which one, which side, how many.',
    ar: 'أيّها، وأيّ جهة، وكم.'
  },
  hint3: {
    en: 'The tethered object, a left frame, and nothing else placed.',
    ar: 'الشيء الموصول، إطار على اليسار، ولا شيء آخر موضوع.'
  },
  note: 'VE NA OR MI',

  setup(ctx) {
    const UI = window.RULESET_ECHO_UI;
    const { w, h } = ctx.size();
    const Z = 84;

    const frame = (x, y) => {
      const z = ctx.el('div', 'echo-zone', {
        style: { width: Z + 'px', height: Z + 'px', left: Math.round(x) + 'px', top: Math.round(y) + 'px' }
      });
      ctx.el('i', 'echo-pip', { parent: z });
      return z;
    };

    const lefts  = [frame(w * 0.06, h * 0.16), frame(w * 0.06, h * 0.62)];
    const rights = [frame(w * 0.94 - Z, h * 0.16), frame(w * 0.94 - Z, h * 0.62)];
    const zones = lefts.concat(rights);

    const objs = [
      ctx.el('div', 'echo-obj obj grab', { x: Math.round(w * 0.42), y: Math.round(h * 0.20) }),
      ctx.el('div', 'echo-obj obj grab', { x: Math.round(w * 0.5 - 22), y: Math.round(h * 0.46) }),
      ctx.el('div', 'echo-obj obj grab', { x: Math.round(w * 0.42), y: Math.round(h * 0.72) })
    ];
    const chosen = objs[2];
    chosen.classList.add('is-na');

    const na = ctx.word('NA');
    if (na) {
      const link = UI.tether(ctx.board, na, chosen);
      ctx.own(link.destroy);
      ctx.frame(link.update);
    }

    const or = ctx.word('OR');
    if (or) {
      or.classList.add('echo-pulse');
      lefts.forEach(z => z.classList.add('echo-pulse'));
      ctx.own(() => or.classList.remove('echo-pulse'));
    }
    const mi = ctx.word('MI');
    if (mi) {
      mi.classList.add('has-pip');
      ctx.own(() => mi.classList.remove('has-pip', 'echo-pulse'));
    }

    objs.forEach(o => ctx.drag(o, {
      affordance: false, bounds: 'stage', magnet: () => zones
    }));

    let done = false;

    ctx.frame(() => {
      if (done) return;

      /* what is in a frame, and which frame */
      const placed = [];
      objs.forEach(o => {
        const z = zones.find(z => ctx.hits(o, z, -18));
        if (z) placed.push({ o, z });
      });

      zones.forEach(z => z.classList.toggle('is-hot', placed.some(p => p.z === z)));
      const one = placed.length === 1;
      zones.forEach(z => z.classList.toggle('is-count', one && placed[0].z === z));
      if (mi) mi.classList.toggle('echo-pulse', one);

      if (!one) return;
      if (placed[0].o !== chosen) return;
      if (lefts.indexOf(placed[0].z) < 0) return;

      done = true;
      const z = placed[0].z;
      z.classList.remove('is-hot', 'echo-pulse');
      z.classList.add('is-done');
      chosen.classList.add('is-landed');
      ctx.place(chosen,
        z.offsetLeft + (Z - chosen.offsetWidth) / 2,
        z.offsetTop + (Z - chosen.offsetHeight) / 2);
      ctx.after(620, () => ctx.solve());
    });
  }
},

/* ─────────────────────────────────────────────────────────── 25 ───────── */
{
  id: 25,
  day: 10,
  name: { en: 'Word order', ar: 'ترتيب الكلمات' },
  instruction: 'MI NA SE VE',

  mechanicIntroduced: 'echoGrammar',
  mechanicsRequired: ['reorderText', 'echoToken', 'echoDirection', 'echoCount'],
  echoMarkChar: ' ',

  hint: {
    en: 'These are all words you know. They are not in a shape you know.',
    ar: 'كل هذه كلمات تعرفها. لكنها ليست بالشكل الذي تعرفه.'
  },
  hint2: {
    en: 'The words can be picked up, as words always could.',
    ar: 'يمكن التقاط الكلمات، كما كان الحال دائمًا.'
  },
  hint3: {
    en: 'Action, target, direction, count. Then do what it says.',
    ar: 'فعل، ثم هدف، ثم جهة، ثم عدد. ثم افعل ما تقول.'
  },
  note: 'VE NA SE MI',

  setup(ctx) {
    const UI = window.RULESET_ECHO_UI;
    const { w, h } = ctx.size();
    const Z = 88;
    const WANT = 'VE NA SE MI';

    const frame = x => {
      const z = ctx.el('div', 'echo-zone', {
        style: { width: Z + 'px', height: Z + 'px', left: Math.round(x) + 'px', top: Math.round(h * 0.5 - Z / 2) + 'px' }
      });
      ctx.el('i', 'echo-pip', { parent: z });
      return z;
    };
    const left = frame(w * 0.07);
    const right = frame(w * 0.93 - Z);

    const objs = [
      ctx.el('div', 'echo-obj obj grab', { x: Math.round(w * 0.5 - 22), y: Math.round(h * 0.24) }),
      ctx.el('div', 'echo-obj obj grab', { x: Math.round(w * 0.5 - 22), y: Math.round(h * 0.62) })
    ];
    const chosen = objs[1];
    chosen.classList.add('is-na');

    /* nothing in the room answers until the sentence is a sentence */
    const stage = ctx.stage;
    stage.style.opacity = '.35';
    stage.style.transition = 'opacity .6s var(--ease)';
    ctx.own(() => { stage.style.opacity = ''; stage.style.transition = ''; });

    let live = false, done = false, link = null;

    const check = () => {
      const now = ctx.sentenceWords().map(x => x.toUpperCase()).join(' ');
      const ok = now === WANT;
      if (ok === live) return;
      live = ok;
      stage.style.opacity = ok ? '1' : '.35';
      if (ok && !link) {
        const na = ctx.word('NA');
        if (na) {
          link = UI.tether(ctx.board, na, chosen);
          ctx.own(() => link && link.destroy());
        }
        const se = ctx.word('SE');
        if (se) { se.classList.add('echo-pulse'); right.classList.add('echo-pulse'); }
        const mi = ctx.word('MI');
        if (mi) mi.classList.add('has-pip');
      }
    };

    ctx.reorder({ onChange: check });
    check();

    objs.forEach(o => ctx.drag(o, {
      affordance: false, bounds: 'stage', enabled: () => live && !done,
      magnet: () => [left, right]
    }));

    ctx.frame(() => {
      if (link) link.update();
      if (done || !live) return;

      const placed = [];
      objs.forEach(o => {
        const z = [left, right].find(z => ctx.hits(o, z, -18));
        if (z) placed.push({ o, z });
      });
      [left, right].forEach(z => z.classList.toggle('is-hot', placed.some(p => p.z === z)));
      const one = placed.length === 1;
      [left, right].forEach(z => z.classList.toggle('is-count', one && placed[0].z === z));

      /* ordering the words is necessary, not sufficient — you still have to
         carry the instruction out */
      if (!one || placed[0].o !== chosen || placed[0].z !== right) return;

      done = true;
      right.classList.remove('is-hot', 'echo-pulse');
      right.classList.add('is-done');
      chosen.classList.add('is-landed');
      ctx.place(chosen,
        right.offsetLeft + (Z - chosen.offsetWidth) / 2,
        right.offsetTop + (Z - chosen.offsetHeight) / 2);
      ctx.after(620, () => ctx.solve());
    });
  }
},

/* ─────────────────────────────────────────────────────────── 26 ───────── */
{
  id: 26,
  day: 11,
  name: { en: 'The ring', ar: 'الحلقة' },
  instruction: 'RU LI',

  mechanicIntroduced: 'echoRing',
  mechanicsRequired: ['echoToken', 'dragObject'],
  cipherCapabilitiesRequired: ['ring'],
  echoMarkChar: 'T',

  hint: {
    en: 'Eight words, eight days. Each arrived somewhere.',
    ar: 'ثماني كلمات، وثمانية أيام. كلٌّ منها وصل في موضع.'
  },
  hint2: {
    en: 'You do not have to remember. The game does.',
    ar: 'لست مضطرًا للتذكر. اللعبة تتذكر.'
  },
  hint3: {
    en: 'Put each word under the day it first appeared.',
    ar: 'ضع كل كلمة تحت اليوم الذي ظهرت فيه أول مرة.'
  },
  note: 'VE NA OR SE KA MI RU LI',

  setup(ctx) {
    const E = window.RULESET_ECHO;
    const LEVELS = window.RULESET_LEVELS;
    const ORDER = E.TOKENS.slice();               // VE NA OR SE KA MI RU LI
    const DAYS = [16, 17, 18, 19, 20, 21, 22, 23];

    const wrap = ctx.el('div', 'echo-order');
    const slots = ctx.el('div', 'echo-slots', { parent: wrap });
    const replay = ctx.el('div', 'echo-replay', { parent: wrap });
    const tray = ctx.el('div', 'echo-tray', { parent: wrap });

    const holes = DAYS.map(d => {
      const hole = ctx.el('div', 'echo-hole', { parent: slots, text: d });
      hole.dataset.day = d;
      return hole;
    });

    /* the rewind: RULESET replays what it showed, so nobody needs a notebook.
       It shows the instructions, not the answers — the new word each day is
       still the player's to spot. */
    const rewind = ctx.el('button', 'echo-rewind', {
      parent: wrap, text: '↺', attrs: { type: 'button' }
    });
    let playing = false;
    ctx.on(rewind, 'click', () => {
      if (playing) return;
      playing = true;
      DAYS.forEach((d, i) => ctx.after(i * 950, () => {
        const lv = LEVELS.find(l => l.id === d);
        replay.innerHTML = '';
        const b = document.createElement('b');
        b.textContent = d;
        replay.appendChild(b);
        replay.appendChild(document.createTextNode(lv ? ctx.t(lv.instruction) : ''));
        if (i === DAYS.length - 1) ctx.after(1100, () => { replay.textContent = ''; playing = false; });
      }));
    });

    /* eight tiles, shuffled deterministically so a restart is the same puzzle */
    const shuffled = [3, 6, 0, 5, 7, 1, 4, 2].map(i => ORDER[i]);
    const tiles = shuffled.map(tok => {
      const t = ctx.el('div', 'echo-tile', { parent: tray, text: tok });
      t.dataset.token = tok;
      const idx = document.createElement('span');
      idx.className = 'idx';
      t.appendChild(idx);
      return t;
    });

    const at = new Map();                          // hole -> tile
    let done = false;

    const seat = (tile, hole) => {
      const prev = at.get(hole);
      if (prev && prev !== tile) { prev.classList.remove('is-placed'); tray.appendChild(prev); }
      for (const [k, v] of at) if (v === tile) at.delete(k);
      at.set(hole, tile);
      hole.classList.add('is-filled');
      holes.forEach(hl => hl.classList.toggle('is-filled', !!at.get(hl)));
      tile.classList.add('is-placed');
      slots.appendChild(tile);
      tile.style.left = hole.offsetLeft + 'px';
      tile.style.top = hole.offsetTop + 'px';
    };

    tiles.forEach(tile => ctx.drag(tile, {
      affordance: false, enabled: () => !done,
      onGrab: () => { if (!tile.classList.contains('is-placed')) ctx.detach(tile); },
      onDrop: () => {
        const hole = holes.find(hl => ctx.hits(tile, hl, -16));
        if (hole) { seat(tile, hole); check(); return; }
        for (const [k, v] of at) if (v === tile) { at.delete(k); k.classList.remove('is-filled'); }
        tile.classList.remove('is-placed');
        tile.style.left = tile.style.top = '';
        tile.style.position = tile.style.width = tile.style.height = '';
        tray.appendChild(tile);
        check();
      }
    }));

    function check() {
      if (done) return;
      const got = holes.map(hl => (at.get(hl) || {}).dataset && at.get(hl).dataset.token);
      if (got.some(x => !x)) return;
      if (got.join(' ') !== ORDER.join(' ')) return;

      done = true;
      ctx.say('');
      /* Recorded here, not on solve: the discovery happens the moment the ring
         closes. If the player wanders off before the animation finishes, they
         have still seen it, and every later level may assume so. */
      if (window.RULESET_STATE) window.RULESET_STATE.learn('echoRing');
      reveal();
    }

    /* the revelation: the row closes into a circle, and only then do the
       positions turn out to have been numbers all along */
    function reveal() {
      const box = ctx.rect(ctx.stage);
      const cx = box.width / 2, cy = box.height / 2;
      const R = Math.min(box.width, box.height) * 0.30;

      holes.forEach(hl => { hl.style.opacity = '0'; });
      replay.textContent = '';
      rewind.style.opacity = '0';

      /* tiles must leave the row's flow before they can travel */
      const sRect = ctx.rect(slots);
      tiles.forEach(t => {
        const r = ctx.rect(t);
        ctx.stage.appendChild(t);
        t.style.left = (r.left - box.left) + 'px';
        t.style.top = (r.top - box.top) + 'px';
        t.classList.add('is-placed');
      });

      ctx.after(60, () => {
        ORDER.forEach((tok, i) => {
          const tile = tiles.find(t => t.dataset.token === tok);
          const a = (-90 + i * 45) * Math.PI / 180;
          tile.classList.add('is-ring');
          tile.style.left = Math.round(cx + Math.cos(a) * R - 26) + 'px';
          tile.style.top = Math.round(cy + Math.sin(a) * R - 26) + 'px';
        });
      });

      /* …and then the numbers */
      ctx.after(1100, () => {
        ORDER.forEach((tok, i) => {
          const tile = tiles.find(t => t.dataset.token === tok);
          ctx.after(i * 90, () => {
            tile.querySelector('.idx').textContent = i;
            tile.classList.add('shows-idx');
          });
        });
      });

      ctx.after(2500, () => ctx.solve());
    }
  }
},

/* ─────────────────────────────────────────────────────────── 27 ───────── */
{
  id: 27,
  day: 12,
  name: { en: 'Where they cross', ar: 'حيث تتقاطعان' },
  instruction: 'OR LI',

  mechanicIntroduced: 'echoCoordinate',
  mechanicsRequired: ['echoToken', 'echoRing'],
  cipherCapabilitiesRequired: ['ring'],
  echoMarkChar: 'H',

  hint: {
    en: 'The edges of the board are wearing the words you know.',
    ar: 'حواف اللوح ترتدي الكلمات التي تعرفها.'
  },
  hint2: {
    en: 'The first word is down the side. The second is along the top.',
    ar: 'الكلمة الأولى على الجانب. والثانية على الأعلى.'
  },
  hint3: {
    en: 'Two words name one square. Find where they meet.',
    ar: 'كلمتان تسمّيان مربعًا واحدًا. جد حيث تلتقيان.'
  },
  note: 'OR LI',

  setup(ctx) {
    const E = window.RULESET_ECHO;
    const UI = window.RULESET_ECHO_UI;

    /* Three rounds. The first is the pair the level was given; the other two
       exist so that finding it once cannot have been luck. */
    const ROUNDS = [['OR', 'LI'], ['KA', 'NA'], ['LI', 'VE']];
    let round = 0, done = false;

    const wrap = ctx.el('div', 'echo-order');
    const holder = ctx.el('div', null, { parent: wrap });

    const board = UI.grid(holder, {
      blank: true, hover: true, interactive: true,
      onPick(ch, r, c) {
        if (done) return;
        const [wantR, wantC] = ROUNDS[round];
        if (r !== E.indexOf(wantR) || c !== E.indexOf(wantC)) {
          ctx.reject();
          return;
        }
        board.lock(true);
        board.highlight(r, c);
        ctx.say('');

        round++;
        if (round >= ROUNDS.length) {
          done = true;
          ctx.after(700, () => ctx.solve());
          return;
        }
        /* the next pair simply replaces the instruction — the sentence is a
           live object, which this game established in its first three levels */
        ctx.after(620, () => {
          board.lock(false);
          board.clear();
          ctx.setInstruction(ROUNDS[round].join(' '));
        });
      }
    });
    ctx.own(board.destroy);
  }
},

/* ─────────────────────────────────────────────────────────── 28 ───────── */
{
  id: 28,
  day: 13,
  name: { en: 'Contents', ar: 'المحتويات' },
  instruction: 'VE RU NA RU',

  mechanicIntroduced: 'echoGrid',
  mechanicsRequired: ['echoCoordinate'],
  cipherCapabilitiesRequired: ['grid'],
  echoMarkChar: 'E',

  hint: {
    en: 'The squares are not empty any more.',
    ar: 'المربعات لم تعد فارغة.'
  },
  hint2: {
    en: 'Four words. That is two pairs, and each pair is a square.',
    ar: 'أربع كلمات. أي زوجان، وكل زوج مربع.'
  },
  hint3: {
    en: 'Open both squares and read what is in them, in order.',
    ar: 'افتح المربعين واقرأ ما فيهما، بالترتيب.'
  },
  note: 'VE RU NA RU',

  setup(ctx) {
    const E = window.RULESET_ECHO;
    const UI = window.RULESET_ECHO_UI;

    const PAIRS = [['VE', 'RU'], ['NA', 'RU']];        // → G, O
    const want = PAIRS.map(p => E.tokensToCharacter(p[0], p[1]));

    const wrap = ctx.el('div', 'echo-order');
    const found = ctx.el('div', 'echo-found', { parent: wrap });
    const cells = want.map(() => ctx.el('i', null, { parent: found }));

    const holder = ctx.el('div', null, { parent: wrap });
    let at = 0, done = false;

    const board = UI.grid(holder, {
      hover: true, interactive: true,
      onPick(ch, r, c) {
        if (done) return;
        const [wr, wc] = PAIRS[at];
        if (r !== E.indexOf(wr) || c !== E.indexOf(wc)) { ctx.reject(); return; }

        cells[at].textContent = ch;
        cells[at].classList.add('is-got');
        board.highlight(r, c);
        at++;
        if (at < PAIRS.length) return;

        /* both letters in hand: the word they spell becomes a thing you can do */
        done = true;
        board.lock(true);
        const act = ctx.el('button', 'gbtn is-on', {
          parent: wrap, text: want.join(''), attrs: { type: 'button' }
        });
        ctx.on(act, 'click', () => ctx.solve());
      }
    });
    ctx.own(board.destroy);
  }
},

/* ─────────────────────────────────────────────────────────── 29 ───────── */
{
  id: 29,
  day: 14,
  name: { en: 'Turn it', ar: 'أدرها' },
  instruction: 'OR OR NA SE OR',

  mechanicIntroduced: 'echoPhase',
  mechanicsRequired: ['echoGrid', 'echoRing'],
  cipherCapabilitiesRequired: ['phase'],
  echoMarkChar: ' ',

  hint: {
    en: 'Five words will not divide into pairs. One of them is not a coordinate.',
    ar: 'خمس كلمات لا تنقسم أزواجًا. إحداها ليست إحداثيًا.'
  },
  hint2: {
    en: 'The first one is standing apart. The ring can turn.',
    ar: 'الأولى واقفة على حدة. والحلقة تدور.'
  },
  hint3: {
    en: 'Turn the ring until the first word sits at the top.',
    ar: 'أدر الحلقة حتى تستقر الكلمة الأولى في الأعلى.'
  },
  note: 'OR OR NA SE OR',

  setup(ctx) {
    const E = window.RULESET_ECHO;
    const UI = window.RULESET_ECHO_UI;

    const MESSAGE = E.parse('OR OR NA SE OR');
    const PHASE = E.indexOf(MESSAGE[0]);               // 2
    const payload = MESSAGE.slice(1);

    /* Two columns, not four stacked rows: the ring, the message, the letters
       and the grid together are taller than any stage, and a clipped ring
       teaches nothing. */
    const wrap = ctx.el('div', 'echo-order is-row');
    const col = ctx.el('div', 'echo-col', { parent: wrap });

    const ring = UI.ring(col, {
      size: 132, indices: true, phase: 0,
      onPick(token, index) { setPhase(index); }
    });
    ctx.own(ring.destroy);

    /* the message, with the phase token set apart from the payload */
    const strip = UI.strip(col, { tokens: MESSAGE, phaseFirst: true, pairs: true });
    ctx.own(strip.destroy);

    const found = ctx.el('div', 'echo-found', { parent: col });
    const slots = [ctx.el('i', null, { parent: found }), ctx.el('i', null, { parent: found })];

    const holder = ctx.el('div', null, { parent: wrap });
    const board = UI.grid(holder, { small: true, hover: true, interactive: true, onPick: pick });
    ctx.own(board.destroy);

    let phase = 0, at = 0, done = false;

    /* Rotating IS the normalising. The chips rewrite themselves as the ring
       turns, so the player watches encoded become normalised rather than
       being told a rule about it. */
    function setPhase(p) {
      if (done) return;
      const before = phase;
      phase = E.mod8(p);
      ring.setPhase(phase);

      /* crossing the seam is the whole point of a ring, so say so */
      if (before !== phase && (before === 7 || phase === 0 || phase === 7)) ring.wrap();

      const shown = [MESSAGE[0]].concat(payload.map(t => E.normalizeToken(t, phase)));
      strip.set(shown);
      ctx.say(phase === PHASE
        ? ctx.t({ en: 'now read the pairs', ar: 'اقرأ الأزواج الآن' })
        : '');
    }

    function pick(ch, r, c) {
      if (done || phase !== PHASE) { if (!done) ctx.reject(); return; }
      const norm = [E.normalizeToken(payload[at * 2], phase),
                    E.normalizeToken(payload[at * 2 + 1], phase)];
      if (r !== E.indexOf(norm[0]) || c !== E.indexOf(norm[1])) { ctx.reject(); return; }

      slots[at].textContent = ch;
      slots[at].classList.add('is-got');
      board.highlight(r, c);
      at++;
      if (at < 2) return;

      done = true;
      board.lock(true);
      ctx.after(760, () => ctx.solve());
    }

    setPhase(0);
  }
},

/* ─────────────────────────────────────────────────────────── 30 ───────── */
{
  id: 30,
  day: 15,
  name: { en: 'A closed thing', ar: 'شيء مغلق' },

  /* MI is the phase (5); the four pairs that follow decode to OPEN */
  instruction: 'MI RU SE RU KA MI NA RU OR',

  mechanicIntroduced: 'echoMessage',
  mechanicsRequired: ['echoPhase', 'echoGrid'],
  cipherCapabilitiesRequired: ['phase', 'grid'],
  echoMarkChar: 'K',

  hint: {
    en: 'Nine words. One of them tells you how to read the other eight.',
    ar: 'تسع كلمات. واحدة منها تخبرك كيف تقرأ الثماني الأخريات.'
  },
  hint2: {
    en: 'Four pairs, four letters. The grid is beside you.',
    ar: 'أربعة أزواج، أربعة أحرف. والشبكة إلى جوارك.'
  },
  hint3: {
    en: 'Read it, then do it — to the one in the middle.',
    ar: 'اقرأها ثم افعلها — بالذي في المنتصف.'
  },
  note: 'MI RU SE RU KA MI NA RU OR',

  setup(ctx) {
    const E = window.RULESET_ECHO;
    const UI = window.RULESET_ECHO_UI;
    const { w, h } = ctx.size();

    const WORD = E.decodeText(ctx.t(this.instruction)).text;    // OPEN

    /* the grid, permanently to one side: by now it is a tool, not a lesson */
    const panel = ctx.el('div', null, {
      style: { position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }
    });
    const board = UI.grid(panel, { small: true, hover: true });
    ctx.own(board.destroy);

    /* On a narrow stage the grid cannot sit beside the doors, and five doors
       at their full width would overlap each other. Both adapt. */
    const narrow = w < 620;
    if (narrow) {
      panel.style.right = '';
      panel.style.top = '';
      panel.style.transform = '';
      panel.style.left = '50%';
      panel.style.bottom = '58px';
      panel.style.transform = 'translateX(-50%)';
    }

    /* five shut things; the middle one is the one the message is about */
    const doors = [];
    const N = 5;
    const dw = narrow ? 40 : 62;
    const dh = narrow ? 62 : 92;
    const span = narrow ? (w - 32 - dw) : Math.min(w * 0.52, 330);
    const x0 = narrow ? 16 : w * 0.06;
    const y0 = narrow ? h * 0.10 : h * 0.5 - dh / 2;
    for (let i = 0; i < N; i++) {
      const d = ctx.el('div', 'echo-door', {
        x: Math.round(x0 + (span / (N - 1)) * i),
        y: Math.round(y0),
        style: { width: dw + 'px', height: dh + 'px' }
      });
      doors.push(d);
    }
    const middle = doors[(N - 1) / 2 | 0];

    /* centred under the doors it belongs to, not under the stage */
    const input = ctx.el('input', 'field obj', {
      attrs: { type: 'text', maxlength: '12', autocomplete: 'off', spellcheck: 'false' },
      style: {
        left: narrow ? '50%' : Math.round(x0 + span / 2 + dw / 2) + 'px',
        bottom: narrow ? '10px' : '18px',
        top: 'auto',
        width: narrow ? '140px' : '170px',
        transform: 'translateX(-50%)'
      }
    });

    let armed = false, done = false;

    ctx.frame(() => {
      if (done) return;
      const said = input.value.trim().toUpperCase() === WORD;
      if (said === armed) return;
      armed = said;
      /* decoding is not the solution — it is permission to act */
      middle.classList.toggle('is-armed', armed);
    });

    doors.forEach(d => ctx.on(d, 'click', () => {
      if (done) return;
      if (!armed || d !== middle) {
        d.classList.remove('is-locked');
        void d.offsetWidth;
        d.classList.add('is-locked');
        return;
      }
      done = true;
      d.classList.remove('is-armed');
      d.classList.add('is-open');
      input.blur();
      ctx.after(720, () => ctx.solve());
    }));
  }
},

/* ─────────────────────────────────────────────────────────── 31 ───────── */
{
  id: 31,
  day: 16,
  name: { en: 'Two of them', ar: 'اثنتان منهما' },
  instruction: { en: 'SAME OR DIFFERENT?', ar: 'متطابقتان أم مختلفتان؟' },

  mechanicIntroduced: 'echoEquivalence',
  mechanicsRequired: ['echoMessage', 'echoPhase'],
  cipherCapabilitiesRequired: ['phase', 'grid'],
  echoMarkChar: 'E',

  hint: {
    en: 'They do not look alike. That is not the question.',
    ar: 'لا تتشابهان في الشكل. وليس هذا هو السؤال.'
  },
  hint2: {
    en: 'Each one begins by telling you how to read it.',
    ar: 'كلٌّ منهما تبدأ بإخبارك كيف تقرأها.'
  },
  hint3: {
    en: 'Read both. Then answer about what they say, not how they look.',
    ar: 'اقرأهما معًا. ثم أجب عمّا تقولانه، لا عن شكلهما.'
  },
  note: 'OPEN = OPEN',

  setup(ctx) {
    const E = window.RULESET_ECHO;
    const UI = window.RULESET_ECHO_UI;

    /* One plaintext, two phases. Nothing about the two strips looks alike. */
    const A = E.encodeText('OPEN', 1);
    const B = E.encodeText('OPEN', 6);

    /* two columns: the reading on the left, the reference on the right.
       Stacked vertically this runs past the bottom of the stage. */
    const wrap = ctx.el('div', 'echo-order is-row');
    const rows = ctx.el('div', 'echo-col', { parent: wrap });
    [A, B].forEach(msg => {
      const s = UI.strip(rows, { tokens: msg, phaseFirst: true, pairs: true });
      ctx.own(s.destroy);
    });

    const choices = ctx.el('div', null, {
      parent: rows, style: { display: 'flex', gap: '12px', marginTop: '6px' }
    });

    const holder = ctx.el('div', null, { parent: wrap });
    const board = UI.grid(holder, { small: true, hover: true });
    ctx.own(board.destroy);

    let done = false;
    const pick = (right, label) => {
      const b = ctx.el('button', 'gbtn', {
        parent: choices, text: label, attrs: { type: 'button' }
      });
      ctx.on(b, 'click', () => {
        if (done) return;
        if (!right) { ctx.reject(); return; }
        done = true;
        b.classList.add('is-on');
        ctx.after(560, () => ctx.solve());
      });
      return b;
    };
    /* nothing marks the correct one — the only way to know is to read both */
    pick(true, ctx.t({ en: 'SAME', ar: 'متطابقتان' }));
    pick(false, ctx.t({ en: 'DIFFERENT', ar: 'مختلفتان' }));
  }
},

/* ─────────────────────────────────────────────────────────── 32 ───────── */
{
  id: 32,
  day: 17,
  name: { en: 'The other way', ar: 'الاتجاه المعاكس' },
  instruction: 'SE · KEY',

  mechanicIntroduced: 'echoEncode',
  mechanicsRequired: ['echoMessage', 'echoPhase', 'echoGrid'],
  cipherCapabilitiesRequired: ['phase', 'grid'],
  echoMarkChar: 'Y',

  hint: {
    en: 'This time you are the one writing.',
    ar: 'هذه المرة أنت من يكتب.'
  },
  hint2: {
    en: 'Find each letter on the grid, then turn its two words by the phase.',
    ar: 'جد كل حرف في الشبكة، ثم أدر كلمتيه بمقدار الطور.'
  },
  hint3: {
    en: 'Three letters, two words each, all shifted the same distance.',
    ar: 'ثلاثة أحرف، لكل حرف كلمتان، وكلها مزاحة المسافة نفسها.'
  },
  note: 'SE · KEY',

  setup(ctx) {
    const E = window.RULESET_ECHO;
    const UI = window.RULESET_ECHO_UI;

    const PLAIN = 'KEY';
    const PHASE = E.indexOf('SE');                    // 3

    /* Never hardcode the answer: ask the shared encoder, so this level cannot
       drift away from the cipher the rest of the season uses. */
    const answer = E.encodeText(PLAIN, PHASE).slice(1);

    const wrap = ctx.el('div', 'echo-order is-row');
    const col = ctx.el('div', 'echo-col', { parent: wrap });

    const row = ctx.el('div', 'echo-slots', { parent: col });
    const holes = answer.map((_, i) => {
      const hole = ctx.el('div', 'echo-hole', { parent: row });
      hole.dataset.at = i;
      return hole;
    });
    const filled = answer.map(() => null);

    const palette = ctx.el('div', 'echo-tray', { parent: col, style: { maxWidth: '360px' } });
    const holder = ctx.el('div', null, { parent: wrap });
    const board = UI.grid(holder, { small: true, hover: true });
    ctx.own(board.destroy);

    let done = false;

    const paint = () => holes.forEach((h, i) => {
      h.textContent = filled[i] || '';
      h.classList.toggle('is-filled', !!filled[i]);
      h.classList.remove('is-hit', 'is-cross');
    });

    /* the palette is a source, not a supply: a token can be used many times */
    E.TOKENS.forEach(tok => {
      const tile = ctx.el('div', 'echo-tile', { parent: palette, text: tok });
      tile.dataset.token = tok;

      ctx.on(tile, 'click', () => {
        if (done) return;
        const at = filled.indexOf(null);
        if (at >= 0) { filled[at] = tok; paint(); }
      });

      ctx.drag(tile, {
        affordance: false, enabled: () => !done,
        onGrab() {
          const ghost = tile.cloneNode(true);
          ghost.classList.add('is-ghost');
          ctx.detach(tile);                 // the palette tile itself travels…
          tile._ghost = ghost;
          palette.insertBefore(ghost, tile.nextSibling);
        },
        onDrop() {
          const hole = holes.find(h => ctx.hits(tile, h, -14));
          if (hole && !done) { filled[+hole.dataset.at] = tok; paint(); }
          // …and is put straight back, so the palette never runs dry
          if (tile._ghost) { tile._ghost.replaceWith(tile); tile._ghost = null; }
          tile.removeAttribute('style');
        }
      });
    });

    holes.forEach(h => ctx.on(h, 'click', () => {
      if (done) return;
      filled[+h.dataset.at] = null;
      paint();
    }));

    const submit = ctx.el('button', 'gbtn', {
      parent: col, text: '↵', attrs: { type: 'button' }
    });

    ctx.on(submit, 'click', () => {
      if (done || filled.indexOf(null) >= 0) return;

      /* feedback per character, and only now — guessing a token at a time
         would make this a slot machine rather than an encoding */
      let good = 0;
      for (let c = 0; c * 2 < answer.length; c++) {
        const ok = filled[c * 2] === answer[c * 2] && filled[c * 2 + 1] === answer[c * 2 + 1];
        holes[c * 2].classList.add(ok ? 'is-hit' : 'is-cross');
        holes[c * 2 + 1].classList.add(ok ? 'is-hit' : 'is-cross');
        if (ok) good++;
      }
      if (good * 2 < answer.length) {
        ctx.reject();
        ctx.after(1100, paint);
        return;
      }
      done = true;
      ctx.after(620, () => ctx.solve());
    });

    paint();
  }
},

/* ─────────────────────────────────────────────────────────── 33 ───────── */
{
  id: 33,
  day: 18,
  name: { en: 'What holds still', ar: 'ما لا يتغيّر' },
  instruction: '',

  mechanicIntroduced: 'samePlaintextDifferentCiphertext',
  mechanicsRequired: ['echoMessage', 'echoPhase'],
  cipherCapabilitiesRequired: ['phase', 'grid'],
  echoMarkChar: '.',

  hint: {
    en: 'It was not the same message last time. Or was it?',
    ar: 'لم تكن الرسالة نفسها في المرة السابقة. أم كانت؟'
  },
  hint2: {
    en: 'Restart it. Watch what changes and what does not.',
    ar: 'أعد المستوى. راقب ما يتغير وما لا يتغير.'
  },
  hint3: {
    en: 'The words keep changing. Type what they keep saying.',
    ar: 'الكلمات تتبدّل باستمرار. اكتب ما تظلّ تقوله.'
  },
  note: 'ECHO',

  setup(ctx) {
    const E = window.RULESET_ECHO;
    const UI = window.RULESET_ECHO_UI;
    const PLAIN = 'ECHO';

    /* A different phase on every visit, in a fixed rotation so a restart is
       always visibly different rather than sometimes-different by luck. */
    const ORDER = [2, 5, 7, 1, 4, 6, 3, 0];
    this._seen = (this._seen | 0) + 1;
    const phase = ORDER[(this._seen - 1) % ORDER.length];

    ctx.setInstruction(E.encodeText(PLAIN, phase).join(' '));

    const wrap = ctx.el('div', 'echo-order');
    const holder = ctx.el('div', null, { parent: wrap });
    const board = UI.grid(holder, { small: true, hover: true });
    ctx.own(board.destroy);

    const input = ctx.el('input', 'field obj', {
      attrs: { type: 'text', maxlength: '12', autocomplete: 'off', spellcheck: 'false' },
      style: { left: '50%', bottom: '14px', top: 'auto', width: '180px', transform: 'translateX(-50%)' }
    });

    let done = false;

    ctx.frame(() => {
      if (done) return;
      if (input.value.trim().toUpperCase() !== PLAIN) return;
      done = true;
      input.blur();
      ctx.game.learn('samePlaintextDifferentCiphertext');
      /* recorded so a later level can ask what you found here, and so the
         game can answer for you rather than expecting a notebook */
      ctx.remember(PLAIN);
      reveal();
    });

    /* Several disguises, all of one word. */
    function reveal() {
      board.el.style.transition = 'opacity .5s var(--ease)';
      board.el.style.opacity = '0';
      input.style.opacity = '0';

      const stack = ctx.el('div', 'echo-col', {
        style: { position: 'absolute', left: '50%', top: '46%', transform: 'translate(-50%,-50%)' }
      });
      const shown = [0, 3, 5, 7].map(p => {
        const s = UI.strip(stack, { tokens: E.encodeText(PLAIN, p), phaseFirst: true, pairs: true });
        ctx.own(s.destroy);
        return s;
      });

      ctx.after(1000, () => {
        shown.forEach(s => {
          s.el.style.transition = 'opacity .6s var(--ease), transform .6s var(--ease-out)';
          s.el.style.opacity = '0';
          s.el.style.transform = 'translateY(14px) scale(.94)';
        });
        const word = ctx.el('div', 'bignum', {
          text: PLAIN,
          style: {
            position: 'absolute', left: '50%', top: '46%',
            transform: 'translate(-50%,-50%)', opacity: '0',
            transition: 'opacity .7s var(--ease)', letterSpacing: '.12em'
          }
        });
        ctx.after(120, () => { word.style.opacity = '1'; });
      });

      ctx.after(2600, () => ctx.solve());
    }
  }
},

/* ─────────────────────────────────────────────────────────── 34 ───────── */
{
  id: 34,
  day: 19,
  name: { en: 'Do as it says', ar: 'افعل ما تقول' },
  /* generated by encodeText('DRAG HINT', 4) — never hand-derived */
  instruction: 'KA KA LI RU MI KA KA KA OR VE VE KA SE MI KA MI NA RU LI',

  mechanicIntroduced: 'echoInstructsUI',
  mechanicsRequired: ['echoMessage', 'echoPhase', 'manipulateUI'],
  cipherCapabilitiesRequired: ['phase', 'grid'],
  globalElementsAllowed: ['hint'],
  echoMarkChar: ' ',

  hint: {
    en: 'Read it first. It is not asking about anything inside the box.',
    ar: 'اقرأها أولًا. إنها لا تسأل عن شيء داخل الصندوق.'
  },
  hint2: {
    en: 'It names something you have been able to press since the first day.',
    ar: 'إنها تسمّي شيئًا كنت تضغطه منذ اليوم الأول.'
  },
  hint3: {
    en: 'Buttons are objects. This one can be carried.',
    ar: 'الأزرار أشياء. وهذا يمكن حمله.'
  },
  note: 'DRAG HINT',

  setup(ctx) {
    const UI = window.RULESET_ECHO_UI;
    const { w, h } = ctx.size();

    const holder = ctx.el('div', null, {
      style: { position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }
    });
    const board = UI.grid(holder, { small: true, hover: true });
    ctx.own(board.destroy);

    const target = ctx.el('div', 'slot', {
      style: {
        width: '120px', height: '84px',
        left: Math.round(w * 0.22) + 'px',
        top: Math.round(h * 0.5 - 42) + 'px'
      }
    });

    /* The Hint button becomes a physical object — but only because this level
       declared it in globalElementsAllowed and asked for it. borrow() puts it
       back in the bottom bar afterwards, styles and position intact. */
    const hint = ctx.claim('hint', {});
    if (!hint) return;
    const held = ctx.borrow(hint.el);
    hint.el.classList.add('is-grabbable');

    let done = false;

    ctx.drag(hint.el, {
      affordance: false, enabled: () => !done,
      onGrab() { held.lift(); },
      onDrop() {
        if (done || !ctx.hits(hint.el, target, -20)) return;
        done = true;
        target.classList.add('is-done');
        hint.el.classList.remove('is-grabbable');
        ctx.after(640, () => ctx.solve());
      }
    });
  }
},

/* ─────────────────────────────────────────────────────────── 35 ───────── */
{
  id: 35,
  day: 20,
  name: { en: 'Where you are', ar: 'أين أنت' },

  /* No phase prefix. The level number is the phase. */
  /* encodeText('OPEN', levelPhase(35)) with the phase prefix removed */
  instruction: 'KA NA KA OR SE LI KA VE',

  mechanicIntroduced: 'echoImplicitPhase',
  mechanicsRequired: ['echoMessage', 'echoPhase', 'echoRing'],
  cipherCapabilitiesRequired: ['phase', 'grid', 'ring'],
  globalElementsAllowed: ['levelNumber'],
  echoMarkChar: 'U',

  hint: {
    en: 'Eight words. Four pairs. Nothing is left over to tell you the phase.',
    ar: 'ثماني كلمات. أربعة أزواج. ولا يتبقّى ما يخبرك بالطور.'
  },
  hint2: {
    en: 'The number in the corner has been counting since the season began.',
    ar: 'الرقم في الزاوية يعدّ منذ بدأ الموسم.'
  },
  hint3: {
    en: 'Put the level number on the ring and watch where it lands.',
    ar: 'ضع رقم المستوى على الحلقة وراقب أين يستقر.'
  },
  note: 'OPEN',

  setup(ctx) {
    const E = window.RULESET_ECHO;
    const UI = window.RULESET_ECHO_UI;
    const { w, h } = ctx.size();

    const PHASE = E.levelPhase(35);              // 3 — SE
    const WORD = E.decodeText([E.tokenAt(PHASE)].concat(E.parse(this.instruction))).text;

    const wrap = ctx.el('div', 'echo-order is-row');
    const col = ctx.el('div', 'echo-col', { parent: wrap });

    const ring = UI.ring(col, { size: 132, indices: true, phase: 0, interactive: false });
    ctx.own(ring.destroy);

    const counter = ctx.el('div', 'echo-replay', { parent: col });

    const holder = ctx.el('div', null, { parent: wrap });
    const board = UI.grid(holder, { small: true, hover: true, interactive: false });
    ctx.own(board.destroy);

    /* both live in the column, not floating over the grid */
    const door = ctx.el('div', 'echo-door', {
      parent: col,
      style: { position: 'relative', width: '54px', height: '58px' }
    });

    const input = ctx.el('input', 'field', {
      parent: col,
      attrs: { type: 'text', maxlength: '12', autocomplete: 'off', spellcheck: 'false' },
      style: { width: '150px', opacity: '.35' }
    });

    /* the level number, lifted out of the top bar */
    const num = ctx.claim('levelNumber', {});
    if (!num) return;
    const held = ctx.borrow(num.el);
    num.el.classList.add('is-grabbable');

    let walked = false, armed = false, done = false;

    ctx.drag(num.el, {
      affordance: false, enabled: () => !walked,
      onGrab() { held.lift(); },
      onDrop() {
        if (walked || !ctx.hits(num.el, ring.el, -10)) return;
        walked = true;
        num.el.classList.remove('is-grabbable');
        num.el.style.opacity = '0';
        walkTheSeason();
      }
    });

    /* Season II, counted out around the ring. Sixteen starts at the top; the
       count simply keeps going and the ring keeps coming round. No arithmetic
       is shown because none is needed — you can watch it land. */
    function walkTheSeason() {
      const FIRST = 16, LAST = 35;
      for (let n = FIRST; n <= LAST; n++) {
        const i = n - FIRST;
        ctx.after(i * 115, () => {
          const at = E.mod8(n - FIRST);
          ring.setPhase(0, false);
          ring.clear();
          ring.highlight(E.tokenAt(at));
          counter.textContent = n;
          if (at === 0 && n > FIRST) ring.wrap();
        });
      }
      ctx.after((LAST - FIRST + 1) * 115 + 420, () => {
        ring.setPhase(PHASE);
        ring.highlight(E.tokenAt(PHASE));
        counter.textContent = '';
        input.style.opacity = '1';
        input.focus();
      });
    }

    ctx.frame(() => {
      if (done) return;
      const said = input.value.trim().toUpperCase() === WORD;
      if (said !== armed) { armed = said; door.classList.toggle('is-armed', armed); }
    });

    ctx.on(door, 'click', () => {
      if (done) return;
      if (!armed) {
        door.classList.remove('is-locked');
        void door.offsetWidth;
        door.classList.add('is-locked');
        return;
      }
      done = true;
      door.classList.remove('is-armed');
      door.classList.add('is-open');
      input.blur();
      ctx.after(720, () => ctx.solve());
    });
  }
},

/* ─────────────────────────────────────────────────────────── 36 ───────── */
{
  id: 36,
  day: 21,
  name: { en: 'Keep it', ar: 'احتفظ بها' },
  /* encodeText('KEEP SE', 4) */
  instruction: 'KA MI RU KA VE KA VE MI SE VE VE RU RU KA VE',

  mechanicIntroduced: 'echoCarry',
  mechanicsRequired: ['echoMessage', 'echoPhase'],
  cipherCapabilitiesRequired: ['phase', 'grid'],
  globalElementsAllowed: ['echoTray'],
  echoMarkChar: 'S',

  hint: {
    en: 'Read it. Then find the thing it names — it is here, but not visible.',
    ar: 'اقرأها. ثم جد ما تسمّيه — إنه هنا، لكنه غير مرئي.'
  },
  hint2: {
    en: 'Something is the same colour as the room. Change the room.',
    ar: 'شيء ما بلون الغرفة نفسه. غيّر الغرفة.'
  },
  hint3: {
    en: 'Use the light and dark switch, then carry what appears to the corner.',
    ar: 'استخدم مفتاح الإضاءة، ثم احمل ما يظهر إلى الزاوية.'
  },
  note: 'KEEP SE',

  setup(ctx) {
    const UI = window.RULESET_ECHO_UI;
    const { w, h } = ctx.size();

    const holder = ctx.el('div', null, {
      style: { position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }
    });
    ctx.own(UI.grid(holder, { small: true, hover: true }).destroy);

    /* The token is painted in whatever colour the room is RIGHT NOW, and then
       never repainted. Whichever theme you are in, it is invisible — and
       whichever way you flip the switch, it appears. */
    const token = ctx.el('div', 'echo-token obj', {
      text: 'SE',
      x: Math.round(w * 0.26), y: Math.round(h * 0.46),
      style: { fontSize: '15px', padding: '6px 12px', cursor: 'grab', touchAction: 'none' }
    });
    const room = getComputedStyle(ctx.stage).backgroundColor;
    token.style.color = room;
    token.style.background = room;
    token.style.borderColor = room;

    const tray = ctx.claim('echoTray', {});
    if (!tray) return;
    tray.el.classList.add('is-live');

    let done = false;

    ctx.drag(token, {
      affordance: false, enabled: () => !done,
      onGrab() { ctx.detach(token); },
      onDrop() {
        if (done || !ctx.hits(token, tray.el, 10)) return;
        done = true;
        token.style.opacity = '0';
        tray.give('SE');                    // and nothing says for how long
        ctx.after(620, () => ctx.solve());
      }
    });
  }
},

/* ─────────────────────────────────────────────────────────── 37 ───────── */
{
  id: 37,
  day: 22,
  name: { en: 'Still there', ar: 'ما زالت هناك' },
  instruction: '· SE',

  mechanicIntroduced: 'echoSpend',
  mechanicsRequired: ['echoCarry', 'echoGrid'],
  cipherCapabilitiesRequired: ['grid'],
  globalElementsAllowed: ['echoTray'],
  echoMarkChar: 'E',

  hint: {
    en: 'A pair needs two. You have one, and you did not find it here.',
    ar: 'الزوج يحتاج اثنتين. لديك واحدة، ولم تجدها هنا.'
  },
  hint2: {
    en: 'Look at the corner. It has been carrying something.',
    ar: 'انظر إلى الزاوية. إنها تحمل شيئًا.'
  },
  hint3: {
    en: 'Drag the carried token into the empty half of the pair.',
    ar: 'اسحب الرمز المحمول إلى النصف الفارغ من الزوج.'
  },
  note: 'SE VE',

  setup(ctx) {
    const E = window.RULESET_ECHO;
    const UI = window.RULESET_ECHO_UI;

    const NEED = 'SE';
    const OTHER = 'VE';
    const CHAR = E.tokensToCharacter(NEED, OTHER);        // Y

    const wrap = ctx.el('div', 'echo-order is-row');
    const col = ctx.el('div', 'echo-col', { parent: wrap });

    const row = ctx.el('div', 'echo-slots', { parent: col });
    const gap = ctx.el('div', 'echo-hole', { parent: row });
    const fixed = ctx.el('div', 'echo-tile', { parent: row, text: OTHER });
    fixed.style.cursor = 'default';

    const out = ctx.el('div', 'echo-found', { parent: col });
    const slot = ctx.el('i', null, { parent: out });

    const holder = ctx.el('div', null, { parent: wrap });
    const board = UI.grid(holder, { small: true, hover: true });
    ctx.own(board.destroy);

    const tray = ctx.claim('echoTray', {});
    if (!tray) return;

    let done = false, filled = false;

    /* Spending SE here empties the tray for good, and the tray outlives the
       level. Without this, placing the token and then pressing Restart left a
       stage that could never be finished. A token that was genuinely earned on
       day 21 is handed back; one that was never earned still is not. */
    if (!tray.chip(NEED) && ctx.knows('echoCarry')) tray.give(NEED);

    /* No replacement is offered. If the token was never collected the level
       says so plainly rather than pretending to be solvable. */
    const chip = tray.chip(NEED);
    if (!chip) {
      ctx.say(ctx.t({ en: 'the tray is empty', ar: 'الدرج فارغ' }), 'warn');
      /* developer-only recovery, so the Lab can test this level in isolation */
      if (!dom_isDev()) return;
      const give = ctx.el('button', 'btn btn-sm', {
        parent: col, text: 'dev: grant SE', attrs: { type: 'button' }
      });
      ctx.on(give, 'click', () => { tray.give(NEED); ctx.solve(); });
      return;
    }

    tray.el.classList.add('is-live');

    ctx.drag(chip, {
      affordance: false, enabled: () => !done && !filled,
      onGrab() { ctx.detach(chip); },
      onDrop() {
        if (filled || !ctx.hits(chip, gap, -8)) return;
        filled = true;
        chip.style.display = 'none';
        gap.textContent = NEED;
        gap.classList.add('is-filled');

        /* spent — the tray is empty again, and stays that way */
        tray.take(NEED);

        board.highlightChar(CHAR);
        slot.textContent = CHAR;
        slot.classList.add('is-got');

        const act = ctx.el('button', 'gbtn is-on', {
          parent: col, text: CHAR, attrs: { type: 'button' }
        });
        ctx.on(act, 'click', () => {
          if (done) return;
          done = true;
          ctx.after(520, () => ctx.solve());
        });
      }
    });

    function dom_isDev() {
      const dev = document.getElementById('dev');
      return !!dev && !dev.hidden;
    }
  }
},

/* ─────────────────────────────────────────────────────────── 38 ───────── */
{
  id: 38,
  day: 23,
  name: { en: 'Back there', ar: 'هناك سابقًا' },
  /* encodeText('USE 33', 1) */
  instruction: 'NA SE MI SE SE NA MI MI MI KA RU KA RU',

  mechanicIntroduced: 'echoRecall',
  mechanicsRequired: ['echoMessage'],
  cipherCapabilitiesRequired: ['phase', 'grid'],
  echoMarkChar: ' ',

  hint: {
    en: 'It is pointing at a day you have already lived.',
    ar: 'إنها تشير إلى يوم عشته من قبل.'
  },
  hint2: {
    en: 'That level kept changing its words but never its meaning.',
    ar: 'ذلك المستوى ظلّ يغيّر كلماته ولا يغيّر معناه.'
  },
  hint3: {
    en: 'The game kept a record. Open it if you need to.',
    ar: 'اللعبة احتفظت بسجل. افتحه إن احتجت.'
  },
  note: 'USE 33',

  setup(ctx) {
    const UI = window.RULESET_ECHO_UI;
    const ANSWER = 'ECHO';

    const wrap = ctx.el('div', 'echo-order is-row');
    const col = ctx.el('div', 'echo-col', { parent: wrap });

    const lock = ctx.el('div', 'echo-wall', { parent: col });
    ctx.el('div', 'echo-wall-label', { parent: lock, text: '33' });
    const input = ctx.el('input', 'field', {
      parent: lock,
      attrs: { type: 'text', maxlength: '12', autocomplete: 'off', spellcheck: 'false' },
      style: { width: '170px' }
    });

    /* The promise the season made: no notebooks. The record shows what the
       player answered on day 33, and only when they ask for it. */
    const rewind = ctx.el('button', 'echo-rewind', {
      parent: col, text: '↺', attrs: { type: 'button' }
    });
    const record = ctx.el('div', 'echo-replay', { parent: col });
    ctx.on(rewind, 'click', () => {
      const said = ctx.game.answerOf(33);
      record.innerHTML = '';
      const b = document.createElement('b');
      b.textContent = '33';
      record.appendChild(b);
      record.appendChild(document.createTextNode(
        said || ctx.t({ en: 'no record — play it again', ar: 'لا سجل — العبه مجددًا' })));
    });

    const holder = ctx.el('div', null, { parent: wrap });
    ctx.own(UI.grid(holder, { small: true, hover: true }).destroy);

    let done = false;
    ctx.frame(() => {
      if (done) return;
      if (input.value.trim().toUpperCase() !== ANSWER) return;
      done = true;
      input.blur();
      lock.classList.add('is-open');
      ctx.after(640, () => ctx.solve());
    });
  }
},

/* ─────────────────────────────────────────────────────────── 39 ───────── */
{
  id: 39,
  day: 24,
  name: { en: 'Along the top', ar: 'على طول الأعلى' },
  /* encodeText('OPEN', 7) with the phase prefix removed — the bar states it */
  instruction: 'VE MI VE RU LI SE VE KA',

  mechanicIntroduced: 'echoPhaseByUI',
  mechanicsRequired: ['echoPhase', 'manipulateUI'],
  cipherCapabilitiesRequired: ['phase', 'grid'],
  globalElementsAllowed: ['progress'],
  echoMarkChar: 'I',

  hint: {
    en: 'Eight tokens, four pairs, and nothing announcing the phase.',
    ar: 'ثمانية رموز، أربعة أزواج، ولا شيء يعلن الطور.'
  },
  hint2: {
    en: 'The bar at the top has become something you can move. It has eight stops.',
    ar: 'الشريط في الأعلى صار شيئًا يمكنك تحريكه. وله ثماني وقفات.'
  },
  hint3: {
    en: 'One of those stops is named beside it. Stop there and read.',
    ar: 'إحدى تلك الوقفات مسمّاة بجانبه. قف عندها واقرأ.'
  },
  note: 'OPEN',

  setup(ctx) {
    const E = window.RULESET_ECHO;
    const UI = window.RULESET_ECHO_UI;
    const { w, h } = ctx.size();

    const RIGHT = 7;                                   // LI
    const payload = E.parse(this.instruction);
    const WORD = E.decodeText([E.tokenAt(RIGHT)].concat(payload)).text;

    const wrap = ctx.el('div', 'echo-order is-row');
    const col = ctx.el('div', 'echo-col', { parent: wrap });
    const strip = UI.strip(col, { tokens: payload, pairs: true });
    ctx.own(strip.destroy);

    const door = ctx.el('div', 'echo-door', {
      parent: col, style: { position: 'relative', width: '54px', height: '58px' }
    });
    const input = ctx.el('input', 'field', {
      parent: col,
      attrs: { type: 'text', maxlength: '12', autocomplete: 'off', spellcheck: 'false' },
      style: { width: '150px' }
    });

    const holder = ctx.el('div', null, { parent: wrap });
    ctx.own(UI.grid(holder, { small: true, hover: true }).destroy);

    /* the clue: one token, resting against the bar it belongs to */
    const clue = ctx.el('span', 'echo-token', {
      parent: document.getElementById('progress'),
      text: 'LI',
      style: { position: 'absolute', insetInlineEnd: '-34px', top: '-6px' }
    });
    clue.classList.add('echo-pulse');

    /* eight stops, because the ring has eight positions */
    const bar = ctx.claim('progress', {
      start: 0,
      onChange(v) {
        const p = Math.round(v * 7);
        if (p === shown) return;
        shown = p;
        strip.set(payload.map(t => E.normalizeToken(t, p)));
        bar.set(p / 7);
      }
    });
    let shown = -1;
    if (bar) bar.set(0);
    strip.set(payload.map(t => E.normalizeToken(t, 0)));
    shown = 0;

    let armed = false, done = false;

    ctx.frame(() => {
      if (done) return;
      const ok = input.value.trim().toUpperCase() === WORD;
      if (ok !== armed) { armed = ok; door.classList.toggle('is-armed', armed); }
    });

    ctx.on(door, 'click', () => {
      if (done) return;
      if (!armed) {
        door.classList.remove('is-locked');
        void door.offsetWidth;
        door.classList.add('is-locked');
        return;
      }
      done = true;
      door.classList.remove('is-armed');
      door.classList.add('is-open');
      ctx.after(700, () => ctx.solve());
    });
  }
},

/* ─────────────────────────────────────────────────────────── 40 ───────── */
{
  id: 40,
  day: 25,
  name: { en: 'Which is true', ar: 'أيّهما صادقة' },
  instruction: { en: 'ONE OF THESE WAS CHANGED', ar: 'إحداهما قد غُيِّرت' },

  mechanicIntroduced: 'echoChecksum',
  mechanicsRequired: ['echoMessage', 'echoRing'],
  cipherCapabilitiesRequired: ['phase', 'grid', 'checksum'],
  echoMarkChar: 'T',

  hint: {
    en: 'Each message carries one token more than its letters need.',
    ar: 'كل رسالة تحمل رمزًا زائدًا عمّا تحتاجه حروفها.'
  },
  hint2: {
    en: 'Walk the ring by each payload token in turn and see where you stop.',
    ar: 'امشِ على الحلقة بمقدار كل رمز بدوره وانظر أين تقف.'
  },
  hint3: {
    en: 'Where you stop should be the last token. In one message it is not.',
    ar: 'حيث تقف ينبغي أن يكون الرمز الأخير. في إحداهما ليس كذلك.'
  },
  note: 'A message can prove it was not changed.',

  setup(ctx) {
    const E = window.RULESET_ECHO;
    const UI = window.RULESET_ECHO_UI;

    const good = E.encodeText('GO', 3, { checksum: true });
    const bad = good.slice();
    bad[2] = E.tokenAt(E.indexOf(bad[2]) + 3);          // one payload token altered

    const wrap = ctx.el('div', 'echo-order is-row');
    const col = ctx.el('div', 'echo-col', { parent: wrap });

    const ring = UI.ring(col, { size: 124, indices: true, interactive: false });
    ctx.own(ring.destroy);
    const walkOut = ctx.el('div', 'echo-replay', { parent: col });

    const right = ctx.el('div', 'echo-col', { parent: wrap });
    const order = Math.random() < 0.5 ? [good, bad] : [bad, good];

    let done = false, busy = false;

    order.forEach(msg => {
      const box = ctx.el('div', 'echo-col', { parent: right, style: { gap: '6px' } });
      const s = UI.strip(box, { tokens: msg, phaseFirst: true, checksumLast: true, pairs: true });
      ctx.own(s.destroy);

      const row = ctx.el('div', null, { parent: box, style: { display: 'flex', gap: '8px' } });

      /* walking the ring IS the arithmetic, performed rather than written */
      const walk = ctx.el('button', 'btn btn-sm', { parent: row, text: '↻', attrs: { type: 'button' } });
      ctx.on(walk, 'click', () => {
        if (busy || done) return;
        busy = true;
        const phase = E.indexOf(msg[0]);
        const payload = msg.slice(1, -1).map(t => E.normalizeToken(t, phase));
        const stated = E.normalizeToken(msg[msg.length - 1], phase);
        let at = 0;
        ring.setPhase(0, false);
        payload.forEach((t, i) => ctx.after(i * 420, () => {
          at = E.mod8(at + E.indexOf(t));
          ring.clear().highlight(E.tokenAt(at));
          walkOut.textContent = t + ' → ' + E.tokenAt(at);
        }));
        ctx.after(payload.length * 420 + 500, () => {
          const ok = E.tokenAt(at) === stated;
          walkOut.textContent = E.tokenAt(at) + (ok ? ' = ' : ' ≠ ') + stated;
          busy = false;
        });
      });

      const choose = ctx.el('button', 'gbtn', {
        parent: row, text: ctx.t({ en: 'THIS ONE', ar: 'هذه' }), attrs: { type: 'button' }
      });
      ctx.on(choose, 'click', () => {
        if (done || busy) return;
        if (msg !== good) { ctx.reject(); return; }
        done = true;
        choose.classList.add('is-on');
        ctx.say(ctx.t({
          en: 'A message can hide its meaning and still prove whether it was changed.',
          ar: 'يمكن للرسالة أن تخفي معناها وتثبت مع ذلك ما إذا كانت قد غُيّرت.'
        }), 'good');
        ctx.after(2200, () => ctx.solve());
      });
    });
  }
},

/* ─────────────────────────────────────────────────────────── 41 ───────── */
{
  id: 41,
  day: 26,
  name: { en: 'Three claims', ar: 'ثلاث دعاوى' },
  instruction: { en: 'ONLY ONE IS INTACT', ar: 'واحدة فقط سليمة' },

  mechanicIntroduced: 'echoTrust',
  mechanicsRequired: ['echoChecksum'],
  cipherCapabilitiesRequired: ['phase', 'grid', 'checksum'],
  echoMarkChar: ' ',

  hint: {
    en: 'All three read as instructions. Only one of them is telling the truth.',
    ar: 'الثلاث تُقرأ كتعليمات. واحدة فقط تقول الصدق.'
  },
  hint2: {
    en: 'Check the last token of each before you obey any of them.',
    ar: 'تحقق من الرمز الأخير في كل منها قبل أن تطيع أيًّا منها.'
  },
  hint3: {
    en: 'Choose the intact one, then obey it — and obeying it means touching nothing at all.',
    ar: 'اختر السليمة ثم أطعها — وطاعتها ألّا تلمس شيئًا على الإطلاق.'
  },
  note: 'WAIT',

  setup(ctx) {
    const E = window.RULESET_ECHO;
    const UI = window.RULESET_ECHO_UI;
    const NEED = 5;

    const truth = E.encodeText('WAIT', 2, { checksum: true });
    const lie1 = E.encodeText('OPEN', 5, { checksum: true });
    const lie2 = E.encodeText('MOVE', 7, { checksum: true });
    /* the lies decode perfectly — only their checksums betray them */
    lie1[lie1.length - 1] = E.tokenAt(E.indexOf(lie1[lie1.length - 1]) + 2);
    lie2[lie2.length - 1] = E.tokenAt(E.indexOf(lie2[lie2.length - 1]) + 5);

    const wrap = ctx.el('div', 'echo-order is-row');
    const col = ctx.el('div', 'echo-col', { parent: wrap });

    let held = 0, picked = null, done = false;

    [lie1, truth, lie2].forEach(msg => {
      const s = UI.strip(col, { tokens: msg, phaseFirst: true, checksumLast: true, pairs: true });
      ctx.own(s.destroy);
      ctx.on(s.el, 'click', () => {
        if (done) return;
        held = 0;                                  // touching anything is acting
        picked = msg;
        [...col.querySelectorAll('.echo-strip')].forEach(e =>
          e.classList.toggle('is-picked', e === s.el));
      });
    });

    const holder = ctx.el('div', null, { parent: wrap });
    ctx.own(UI.grid(holder, { small: true, hover: true, interactive: true,
      onPick() { held = 0; } }).destroy);

    ctx.on(window, 'pointerdown', () => { if (!done) held = 0; });
    ctx.on(window, 'keydown', () => { if (!done) held = 0; });

    ctx.frame(dt => {
      if (done) return;
      /* obeying the intact message means doing nothing — and the level only
         counts stillness once that message is the one you chose */
      if (picked !== truth) { held = 0; return; }
      held += dt;
      if (held < NEED) return;
      done = true;
      ctx.after(300, () => ctx.solve());
    });
  }
},

/* ─────────────────────────────────────────────────────────── 42 ───────── */
{
  id: 42,
  day: 27,
  name: { en: 'Look back', ar: 'انظر خلفك' },
  instruction: '',                    // built in setup, from the encoder

  mechanicIntroduced: 'echoMemoryOpen',
  mechanicsRequired: ['echoChecksum', 'echoImplicitPhase'],
  cipherCapabilitiesRequired: ['phase', 'grid', 'checksum'],
  echoMarkChar: 'N',

  hint: {
    en: 'No phase is given, and one token at the end is not a letter.',
    ar: 'لا طور معطى، والرمز الأخير ليس حرفًا.'
  },
  hint2: {
    en: 'You know where you are. That has been enough since day twenty.',
    ar: 'أنت تعرف أين أنت. وهذا كافٍ منذ اليوم العشرين.'
  },
  hint3: {
    en: 'Read it, then use the rewind it turns on.',
    ar: 'اقرأها، ثم استخدم زر الإرجاع الذي تُفعّله.'
  },
  note: 'LOOK BACK',

  setup(ctx) {
    const E = window.RULESET_ECHO;
    const UI = window.RULESET_ECHO_UI;
    const PHASE = E.levelPhase(42);
    const WORD = 'LOOK BACK';

    /* implicit phase + checksum: the message carries no prefix, and its last
       token proves it arrived intact */
    const full = E.encodeText(WORD, PHASE, { checksum: true });
    ctx.setInstruction(full.slice(1).join(' '));

    const wrap = ctx.el('div', 'echo-order is-row');
    const col = ctx.el('div', 'echo-col', { parent: wrap });

    const input = ctx.el('input', 'field', {
      parent: col,
      attrs: { type: 'text', maxlength: '16', autocomplete: 'off', spellcheck: 'false' },
      style: { width: '190px' }
    });

    const rewind = ctx.el('button', 'echo-rewind', {
      parent: col, text: '↺', attrs: { type: 'button' }
    });
    rewind.disabled = true;
    rewind.style.opacity = '.3';

    const holder = ctx.el('div', null, { parent: wrap });
    ctx.own(UI.grid(holder, { small: true, hover: true }).destroy);

    let opened = false, done = false;

    ctx.frame(() => {
      if (done || !rewind.disabled) return;
      if (input.value.trim().toUpperCase() !== WORD) return;
      rewind.disabled = false;
      rewind.style.opacity = '1';
      rewind.classList.add('echo-pulse');
      input.blur();
    });

    ctx.on(rewind, 'click', () => {
      if (opened || rewind.disabled) return;
      opened = true;

      /* bank this level's own mark first, so the wall it opens is complete */
      window.RULESET.bankEchoMark(ctx.level);

      wrap.remove();
      const marks = ctx.game.marks();
      const memory = UI.wall(ctx.stage, {
        marks,
        label: ctx.t({ en: 'ECHO MEMORY', ar: 'ذاكرة إيكو' })
      });
      ctx.own(memory.destroy);
      memory.el.style.cssText =
        'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:14px';

      /* shown, never decoded — every one of them has been there all along */
      ctx.say(ctx.t({
        en: marks.length + ' collected',
        ar: marks.length + ' محفوظة'
      }));
      ctx.after(2400, () => { done = true; ctx.solve(); });
    });
  }
},

/* ─────────────────────────────────────────────────────────── 43 ───────── */
{
  id: 43,
  day: 28,
  name: { en: 'How to read one', ar: 'كيف تُقرأ واحدة' },
  instruction: { en: 'PRACTICE', ar: 'تدريب' },

  mechanicIntroduced: 'echoReadMark',
  mechanicsRequired: ['echoMemoryOpen', 'echoImplicitPhase'],
  cipherCapabilitiesRequired: ['phase', 'grid', 'ring'],
  echoMarkChar: 'O',

  hint: {
    en: 'A mark has no phase written on it. But it remembers where it came from.',
    ar: 'العلامة لا تحمل طورًا مكتوبًا. لكنها تتذكر من أين جاءت.'
  },
  hint2: {
    en: 'Its level number gives the phase, exactly as your own did on day twenty.',
    ar: 'رقم مستواها يعطي الطور، تمامًا كما فعل رقمك في اليوم العشرين.'
  },
  hint3: {
    en: 'Normalise the pair, then read it off the grid. Four of them spell a word.',
    ar: 'سوِّ الزوج ثم اقرأه من الشبكة. أربعتها تُهجّي كلمة.'
  },
  note: 'ECHO',

  setup(ctx) {
    const E = window.RULESET_ECHO;
    const UI = window.RULESET_ECHO_UI;

    /* Synthetic marks on obviously-unreal level numbers, so nothing here can
       be confused with the season's own record. */
    const PRACTICE = [[90, 'E'], [91, 'C'], [92, 'H'], [93, 'O']];
    const marks = PRACTICE.map(([lv, ch]) => ({
      levelId: lv, tokens: E.encodeEchoMark(ch, lv), char: ch
    }));

    const wrap = ctx.el('div', 'echo-order is-row');
    const col = ctx.el('div', 'echo-col', { parent: wrap });

    const memory = UI.wall(col, {
      marks,
      label: ctx.t({ en: 'PRACTICE MARKS', ar: 'علامات تدريب' }),
      onPick(cell, i) { select(i); }
    });
    ctx.own(memory.destroy);

    const info = ctx.el('div', 'echo-replay', { parent: col });
    const ring = UI.ring(col, { size: 118, indices: true, interactive: false });
    ctx.own(ring.destroy);

    const holder = ctx.el('div', null, { parent: wrap });
    const board = UI.grid(holder, { small: true, hover: true });
    ctx.own(board.destroy);

    const readCount = new Set();
    let at = -1, done = false;

    function select(i) {
      if (done) return;
      at = i;
      const m = marks[i];
      const phase = E.levelPhase(m.levelId);
      memory.select(i);
      ring.setPhase(phase);
      ring.clear();

      const norm = m.tokens.map(t => E.normalizeToken(t, phase));
      const ch = E.tokensToCharacter(norm[0], norm[1]);
      board.highlightChar(ch);

      /* the whole rule, performed on one mark: source level → phase →
         normalised pair → grid square */
      info.innerHTML = '';
      const b = document.createElement('b');
      b.textContent = m.levelId;
      info.appendChild(b);
      info.appendChild(document.createTextNode(
        m.tokens.join(' ') + '  →  ' + norm.join(' ') + '  →  ' + ch));

      memory.reveal(i, ch);
      readCount.add(i);
      if (readCount.size < marks.length) return;

      done = true;
      ctx.say(marks.map(m => m.char).join(''), 'good');
      ctx.after(1400, () => ctx.solve());
    }
  }
},

/* ─────────────────────────────────────────────────────────── 44 ───────── */
{
  id: 44,
  day: 29,
  name: { en: 'In what order', ar: 'بأي ترتيب' },
  instruction: { en: 'SORT THEM', ar: 'رتّبها' },

  mechanicIntroduced: 'echoOrderByLevel',
  mechanicsRequired: ['echoReadMark'],
  cipherCapabilitiesRequired: ['phase', 'grid'],
  echoMarkChar: 'W',

  hint: {
    en: 'Decoded as they lie, they say nothing.',
    ar: 'إن قرأتها كما هي، لا تقول شيئًا.'
  },
  hint2: {
    en: 'Each one still knows which day it came from.',
    ar: 'كلٌّ منها ما زالت تعرف من أي يوم جاءت.'
  },
  hint3: {
    en: 'Put them in the order those days happened.',
    ar: 'رتّبها بترتيب حدوث تلك الأيام.'
  },
  note: 'ORDER = LEVEL',

  setup(ctx) {
    const E = window.RULESET_ECHO;
    const UI = window.RULESET_ECHO_UI;

    /* READY, spread over five out-of-sequence sample days */
    const TRUE_ORDER = [[71, 'R'], [72, 'E'], [73, 'A'], [74, 'D'], [75, 'Y']];
    const SHUFFLED = [3, 0, 4, 1, 2];
    const marks = SHUFFLED.map(i => {
      const [lv, ch] = TRUE_ORDER[i];
      return { levelId: lv, tokens: E.encodeEchoMark(ch, lv), char: ch };
    });

    const wrap = ctx.el('div', 'echo-order');
    const memory = UI.wall(wrap, {
      marks,
      label: ctx.t({ en: 'PRACTICE MARKS', ar: 'علامات تدريب' })
    });
    ctx.own(memory.destroy);

    const out = ctx.el('div', 'echo-line', { parent: wrap });

    let done = false;

    const readAll = () => memory.order().map(lv => {
      const m = marks.find(x => x.levelId === lv);
      const p = E.levelPhase(lv);
      const n = m.tokens.map(t => E.normalizeToken(t, p));
      return E.tokensToCharacter(n[0], n[1]);
    }).join('');

    const paint = () => {
      const word = readAll();
      out.textContent = word;
      memory.cells.forEach((c, i) => memory.reveal(i, word[i]));
      if (done || !memory.inOrder()) return;
      done = true;
      out.textContent = word;
      ctx.say('ORDER = LEVEL', 'good');
      ctx.after(1800, () => ctx.solve());
    };

    /* drag one mark onto another to swap them */
    memory.cells.forEach(cell => {
      ctx.drag(cell, {
        affordance: false, enabled: () => !done,
        onGrab() { cell.classList.add('is-sel'); ctx.detach(cell); },
        onDrop() {
          cell.classList.remove('is-sel');
          /* Insert where it was dropped, rather than swapping with whatever it
             happens to overlap: a mark is wider than the gap between marks, so
             a drop always covers two neighbours and "swap with the one I am
             touching" has no single answer. */
          const cx = ctx.center(cell).x;
          cell.removeAttribute('style');
          const me = +cell.dataset.level;
          const others = memory.cells.filter(c => c !== cell);
          let at = others.findIndex(c => ctx.center(c).x > cx);
          if (at < 0) at = others.length;
          const order = memory.order().filter(v => v !== me);
          order.splice(at, 0, me);
          memory.arrange(order, true);
          paint();
        }
      });
    });

    paint();
  }
},

/* ═══════════════════════════════════════════════════════════ 45 ═════════
   SEASON II — FINALE
   ═══════════════════════════════════════════════════════════════════════ */
{
  id: 45,
  day: 30,
  name: { en: 'The key', ar: 'المفتاح' },
  instruction: '',                    // deliberately none

  mechanicIntroduced: 'echoSeasonEnd',
  mechanicsRequired: ['echoOrderByLevel', 'echoReadMark', 'echoRing'],
  cipherCapabilitiesRequired: ['phase', 'grid', 'ring'],
  /* no echoMarkChar — the season's message ends at 44 */

  hint: {
    en: 'Everything here is something you already did.',
    ar: 'كل ما هنا شيء فعلته من قبل.'
  },
  hint2: {
    en: 'They are out of order, and each one knows its day.',
    ar: 'إنها غير مرتّبة، وكلٌّ منها تعرف يومها.'
  },
  hint3: {
    en: 'Order them, read them, then give back the order you found on day eleven.',
    ar: 'رتّبها، اقرأها، ثم أعد الترتيب الذي اكتشفته في اليوم الحادي عشر.'
  },

  setup(ctx) {
    const E = window.RULESET_ECHO;
    const UI = window.RULESET_ECHO_UI;

    const held = ctx.game.marks().filter(m => m.levelId >= 16 && m.levelId <= 44);

    /* The season cannot be read if it was not lived. Rather than fake it, say
       so — and in the Lab, offer to fill it so the finale can be tested. */
    if (held.length < 29) {
      const box = ctx.el('div', 'echo-order');
      ctx.el('div', 'echo-line', {
        parent: box,
        text: held.length + ' / 29'
      });
      ctx.el('div', 'echo-wall-label', {
        parent: box,
        text: ctx.t({ en: 'the wall is incomplete', ar: 'الجدار غير مكتمل' })
      });
      const dev = document.getElementById('dev');
      if (dev && !dev.hidden) {
        const fill = ctx.el('button', 'btn btn-sm', {
          parent: box, text: 'dev: fill memory', attrs: { type: 'button' }
        });
        ctx.on(fill, 'click', () => {
          const LV = window.RULESET_LEVELS;
          for (let id = 16; id <= 44; id++) {
            const lv = LV.find(l => l.id === id);
            if (lv && lv.echoMarkChar) {
              ctx.game.remember(id, E.encodeEchoMark(lv.echoMarkChar, id), E.levelPhase(id));
            }
          }
          window.RULESET.load(window.RULESET.index);
        });
      }
      return;
    }

    /* ---------- act one: the wall, out of order ---------- */
    const shuffled = held.slice().sort((a, b) =>
      ((a.levelId * 7919) % 101) - ((b.levelId * 7919) % 101));

    const wrap = ctx.el('div', 'echo-order');
    const memory = UI.wall(wrap, { marks: shuffled });
    ctx.own(memory.destroy);

    const line = ctx.el('div', 'echo-line', { parent: wrap });
    const act = ctx.el('div', null, { parent: wrap, style: { display: 'flex', gap: '10px' } });

    const charOf = m => {
      const p = E.levelPhase(m.levelId);
      const n = m.tokens.map(t => E.normalizeToken(t, p));
      return E.tokensToCharacter(n[0], n[1]);
    };

    let sorted = 0, readTo = 0, phase = 'sort';

    /* Sorting twenty-nine tiles by hand is labour, not understanding. Show
       you know the rule on the first three and the wall will finish itself. */
    memory.cells.forEach(cell => {
      ctx.drag(cell, {
        affordance: false, enabled: () => phase === 'sort',
        onGrab() { cell.classList.add('is-sel'); ctx.detach(cell); },
        onDrop() {
          cell.classList.remove('is-sel');
          /* Insert where it was dropped, rather than swapping with whatever it
             happens to overlap: a mark is wider than the gap between marks, so
             a drop always covers two neighbours and "swap with the one I am
             touching" has no single answer. */
          const cx = ctx.center(cell).x;
          cell.removeAttribute('style');
          const me = +cell.dataset.level;
          const others = memory.cells.filter(c => c !== cell);
          let at = others.findIndex(c => ctx.center(c).x > cx);
          if (at < 0) at = others.length;
          const order = memory.order().filter(v => v !== me);
          order.splice(at, 0, me);
          memory.arrange(order, true);

          /* count how many of the leading marks are now in their true place */
          const now = memory.order();
          let run = 0;
          while (run < now.length && now[run] === 16 + run) run++;
          sorted = run;
          if (sorted >= 3 && !finishSort.parentElement) act.appendChild(finishSort);
        }
      });
    });

    const finishSort = document.createElement('button');
    finishSort.className = 'gbtn';
    finishSort.type = 'button';
    finishSort.textContent = ctx.t({ en: 'CONTINUE THE ORDER', ar: 'أكمل الترتيب' });
    ctx.own(() => finishSort.remove());
    ctx.on(finishSort, 'click', () => {
      memory.sortByLevel(true);
      finishSort.remove();
      phase = 'read';
      act.appendChild(readOne);
    });

    /* ---------- act two: normalising, then the same mercy ---------- */
    const readOne = document.createElement('button');
    readOne.className = 'gbtn';
    readOne.type = 'button';
    readOne.textContent = ctx.t({ en: 'NORMALISE', ar: 'سوِّ' });
    ctx.own(() => readOne.remove());

    const readSeq = document.createElement('button');
    readSeq.className = 'gbtn is-on';
    readSeq.type = 'button';
    readSeq.textContent = ctx.t({ en: 'NORMALISE ALL', ar: 'سوِّ الكل' });
    ctx.own(() => readSeq.remove());

    const ordered = () => memory.order().map(lv => held.find(m => m.levelId === lv));

    const revealOne = () => {
      const list = ordered();
      if (readTo >= list.length) return;
      const m = list[readTo];
      memory.reveal(readTo, charOf(m));
      memory.light(readTo);
      line.textContent = list.slice(0, readTo + 1).map(charOf).join('');
      readTo++;
      if (readTo === 4) act.appendChild(readSeq);      // rule shown; stop the labour
    };

    ctx.on(readOne, 'click', revealOne);

    ctx.on(readSeq, 'click', () => {
      readOne.remove(); readSeq.remove();
      const list = ordered();
      const step = () => {
        if (readTo >= list.length) { ctx.after(1500, lock); return; }
        revealOne();
        ctx.after(90, step);
      };
      step();
    });

    /* ---------- act three: the lock ---------- */
    function lock() {
      wrap.style.transition = 'opacity .9s var(--ease)';
      wrap.style.opacity = '0';

      ctx.after(950, () => {
        wrap.remove();
        const box = ctx.el('div', 'echo-order');
        const slots = ctx.el('div', 'echo-slots', { parent: box });
        const holes = E.TOKENS.map(() => ctx.el('div', 'echo-hole', { parent: slots }));
        const tray = ctx.el('div', 'echo-tray-row echo-tray', { parent: box });
        tray.hidden = false;

        const placed = E.TOKENS.map(() => null);
        const tiles = E.TOKENS.slice().sort(() => Math.random() - 0.5).map(tok => {
          const t = ctx.el('div', 'echo-tile', { parent: tray, text: tok });
          t.dataset.token = tok;
          ctx.on(t, 'click', () => {
            const i = placed.indexOf(null);
            if (i < 0 || t.dataset.used) return;
            placed[i] = tok;
            t.dataset.used = '1';
            t.style.opacity = '.25';
            paintLock();
          });
          ctx.drag(t, {
            affordance: false,
            onGrab() { ctx.detach(t); },
            onDrop() {
              const hole = holes.find(hl => ctx.hits(t, hl, -14));
              t.removeAttribute('style');
              if (!hole) return;
              const i = holes.indexOf(hole);
              placed[i] = tok;
              t.dataset.used = '1';
              t.style.opacity = '.25';
              paintLock();
            }
          });
          return t;
        });

        ctx.on(slots, 'click', e => {
          const hole = e.target.closest && e.target.closest('.echo-hole');
          if (!hole) return;
          const i = holes.indexOf(hole);
          if (placed[i] == null) return;
          const tok = placed[i];
          placed[i] = null;
          const t = tiles.find(x => x.dataset.token === tok);
          if (t) { delete t.dataset.used; t.style.opacity = ''; }
          paintLock();
        });

        function paintLock() {
          holes.forEach((hl, i) => {
            hl.textContent = placed[i] || '';
            hl.classList.toggle('is-filled', !!placed[i]);
          });
          if (placed.some(x => x == null)) return;
          if (placed.join(' ') !== E.TOKENS.join(' ')) {
            ctx.reject();
            ctx.after(700, () => {
              placed.fill(null);
              tiles.forEach(t => { delete t.dataset.used; t.style.opacity = ''; });
              paintLock();
            });
            return;
          }
          holes.forEach(hl => hl.classList.add('is-filled'));
          ctx.after(500, ending);
        }
      });
    }

    /* ---------- act four: the ending ---------- */
    function ending() {
      ctx.game.finishSeason(2);
      ctx.game.learn('echoSeasonEnd');

      const veil = ctx.el('div', 'echo-final');
      const a = ctx.el('div', 'big', { parent: veil });
      const b = ctx.el('div', 'ask', { parent: veil });

      ctx.after(60, () => veil.classList.add('is-on'));
      ctx.after(900, () => {
        a.textContent = ctx.t({
          en: 'YOU CAN READ RULESET NOW.',
          ar: 'يمكنك أن تقرأ RULESET الآن.'
        });
        a.classList.add('is-on');
      });
      ctx.after(3600, () => {
        b.textContent = ctx.t({
          en: 'BUT CAN RULESET READ YOU?',
          ar: 'لكن هل يستطيع RULESET أن يقرأك؟'
        });
        b.classList.add('is-on');
      });
      ctx.after(7200, () => ctx.solve());
    }
  }
}

];
