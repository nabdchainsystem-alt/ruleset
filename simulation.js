/* ==========================================================================
   GLOBAL SEA — simulation
   --------------------------------------------------------------------------
   Fake traffic so the concept can be judged before any backend exists, plus
   the staged stress test that answers "how many bubbles can a browser hold?".

   All content is generated locally. No network, no external APIs.
   ========================================================================== */

window.SEA = window.SEA || {};

SEA.Sim = (function () {
'use strict';

/* ---------------------------------------------------------------- names -- */

const HANDLES = [
  'nova', 'atlas', 'yara', 'kite', 'moss', 'orbit', 'pixel', 'delta', 'juno',
  'reef', 'ember', 'salt', 'lumen', 'cobalt', 'wren', 'onyx', 'sable', 'vega',
  'noor', 'sami', 'layla', 'omar', 'hana', 'zaid', 'mira', 'faris', 'dana',
  'kenji', 'sora', 'mateo', 'ines', 'tobi', 'ada', 'rin', 'kai', 'nia'
];
const SUFFIX = ['', '', '', '_', '.exe', '99', '_x', '01', 'ish', '__', '7'];

/* ------------------------------------------------------------- messages -- */

const LINES = [
  'hello from Riyadh', 'anyone awake?', 'good morning Tokyo', 'what is happening here',
  'this is beautiful', 'first time here', 'is this real time?', 'hello world',
  'rain again', 'it is 3am and I am here', 'why can I not stop watching this',
  'the bubbles are hypnotic', 'greetings from Lisbon', 'testing testing',
  'who else is up', 'this feels alive', 'coffee number four', 'sending love',
  'the internet used to feel like this', 'I like the little strings',
  'my message is floating away', 'someone reply to me', 'we are all in the same water',
  'made it', 'signal received', 'still here', 'good night everyone',
  'مساء الخير', 'أنا هنا', 'صباح الخير من جدة', 'شكرا', 'من وين انتم',
  'هذا جميل جدا', 'كيف الحال', 'أول مرة أجرب هذا', 'الله يعطيكم العافية',
  'وينكم', 'ما شاء الله', 'تصبحون على خير', 'حلو والله',
  '😂😂', '🔥', '👀', '🌊', '✨', '❤️', '😭', '🫡', '👋', '🙌', '🥲', '💀',
  'lol', 'wait what', 'omg', 'yes!!', 'no way', 'same', 'hi', 'hey', 'yo',
  'true', 'wow', 'stop', 'okay this is cool', 'brb', 'agreed', 'exactly'
];

const REPLIES = [
  'same here', 'agreed', 'no way', 'why though', 'I disagree', 'true',
  'say more', 'this', 'exactly this', 'hmm', 'not sure about that',
  'you are right', 'wait really?', 'proof?', 'lol no', 'ok fair',
  'أوافقك', 'ليش؟', 'صحيح', 'لا أعتقد', 'بالضبط', 'هههه',
  '😂', '🔥', '👆', '❤️', '🤔', 'nope', 'yep', 'kind of'
];

const pick = a => a[(Math.random() * a.length) | 0];

function handle() {
  return pick(HANDLES) + pick(SUFFIX);
}

function line(isReply) {
  return isReply && Math.random() < 0.75 ? pick(REPLIES) : pick(LINES);
}

/* ------------------------------------------------------------ scheduler -- */

/**
 * @param {object} host  { spawn(opts), replyTargets() }
 */
function createScheduler(host) {
  let rate = 0;
  let acc = 0;

  return {
    get rate() { return rate; },
    setRate(r) { rate = Math.max(0, r); acc = 0; },

    update(dt) {
      if (rate <= 0) return;
      acc += rate * dt;
      let budget = 60;                       // never spawn unboundedly in one frame
      while (acc >= 1 && budget-- > 0) {
        acc -= 1;
        this.one();
      }
      if (acc > 8) acc = 8;
    },

    /** One organic message: sometimes a reply, so threads form on their own. */
    one(scatter) {
      const targets = host.replyTargets();
      const wantsReply = targets.length > 0 && Math.random() < 0.34;
      const parent = wantsReply ? pick(targets) : null;
      host.spawn({
        username: handle(),
        text: line(!!parent),
        parent,
        scatter: !!scatter && !parent
      });
    },

    /**
     * A burst. A handful still drop in from the top, because that arrival is
     * the signature moment — but a hundred at once would stack into an
     * unreadable wall, so large bursts are backfill scattered across the sea.
     */
    burst(n) {
      const scatter = n > 10;
      for (let i = 0; i < n; i++) this.one(scatter);
    }
  };
}

/* ---------------------------------------------------------- stress test -- */

const STAGES = [100, 250, 500, 750, 1000, 1500, 2000, 3000];
const DWELL = 5000;      // ms at each stage
const SETTLE = 900;      // ignore the first moments while bubbles spawn

/**
 * Walks the sea up through STAGES, sampling FPS at each, then reports the
 * largest population that held ~50fps.
 *
 * @param {object} host { count(), fill(n), fps(), onStage(s), onDone(report) }
 */
function createStressTest(host) {
  let running = false;
  let stage = 0;
  let t0 = 0;
  let samples = [];
  const results = [];

  function begin() {
    running = true;
    stage = 0;
    results.length = 0;
    enter();
  }

  function enter() {
    const target = STAGES[stage];
    host.fill(target);
    samples = [];
    t0 = performance.now();
    host.onStage({ index: stage, total: STAGES.length, target });
  }

  function update() {
    if (!running) return;
    const now = performance.now();
    const dt = now - t0;
    if (dt > SETTLE) samples.push(host.fps());

    if (dt >= DWELL) {
      const avg = samples.length
        ? samples.reduce((a, b) => a + b, 0) / samples.length
        : 0;
      const low = samples.length ? Math.min.apply(null, samples) : 0;
      results.push({ count: STAGES[stage], fps: avg, min: low });

      stage++;
      // give up early once it is clearly on its knees
      if (stage >= STAGES.length || avg < 24) return finish();
      enter();
    }
  }

  function finish() {
    running = false;
    let recommended = 0;
    for (const r of results) if (r.fps >= 50) recommended = r.count;
    if (!recommended && results.length) recommended = results[0].count;
    host.onDone({ results, recommended });
  }

  function stop() { running = false; }

  return { begin, update, stop, get running() { return running; }, STAGES };
}

return { createScheduler, createStressTest, handle, line, LINES, STAGES };

})();
