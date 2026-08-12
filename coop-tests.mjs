/* ==========================================================================
   RULESET — co-op transport tests
   --------------------------------------------------------------------------
     node coop-tests.mjs        (starts its own server on a spare port)

   Two independent clients against one hub, proving that a message typed on
   one machine reaches the other. This is deliberately NOT a browser test:
   an open SSE stream keeps a page from ever reaching network-idle, so
   Chrome's --virtual-time-budget never advances, the test's own timers never
   fire, and it deadlocks before it can close anything. The transport is plain
   HTTP, so Node exercises it honestly and finishes.
   ========================================================================== */

import { spawn } from 'node:child_process';
import { request, get } from 'node:http';

const PORT = Number(process.env.PORT) || 5399;
const BASE = `http://127.0.0.1:${PORT}`;

let fails = 0;
const lines = [];
function log(ok, msg) {
  if (!ok) fails++;
  lines.push((ok ? '  ok  ' : ' FAIL ') + msg);
  console.log(lines[lines.length - 1]);
}
const wait = ms => new Promise(r => setTimeout(r, ms));

/* ------------------------------------------------------------- clients -- */

/** One connected client: its own stream, its own id, its own inbox. */
function client(id, name) {
  const c = { id, name, chat: [], roster: [], backlog: [], open: false, req: null };

  c.req = get(`${BASE}/live/stream`, res => {
    c.open = true;
    res.setEncoding('utf8');
    let buf = '';
    res.on('data', chunk => {
      buf += chunk;
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const frame = buf.slice(0, i);
        buf = buf.slice(i + 2);
        const ev = /^event: (.+)$/m.exec(frame);
        const da = /^data: (.+)$/m.exec(frame);
        if (!ev || !da) continue;                    // ": ping" keep-alives
        let payload;
        try { payload = JSON.parse(da[1]); } catch { continue; }
        if (ev[1] === 'chat') c.chat.push(payload);
        else if (ev[1] === 'roster') c.roster = payload;
        else if (ev[1] === 'backlog') c.backlog = payload;
      }
    });
  });
  c.req.on('error', () => {});

  const post = (path, obj) => new Promise(res => {
    const data = JSON.stringify(obj);
    const rq = request({
      host: '127.0.0.1', port: PORT, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, r => { r.resume(); r.on('end', res); });
    rq.on('error', res);
    rq.end(data);
  });

  c.say = text => post('/live/chat', { id, name, text });
  c.report = extra => post('/live/state',
    Object.assign({ id, name, level: 1, solved: 0, total: 30 }, extra));
  c.close = () => { try { c.req.destroy(); } catch {} };
  return c;
}

const said = c => c.chat.filter(m => m.kind === 'chat').map(m => m.text);
const raw = (c, text) => c.chat.filter(m => m.kind === 'chat').find(m => m.text === text);

/* ---------------------------------------------------------------- run --- */

const server = spawn(process.execPath, ['server.mjs'], {
  cwd: new URL('.', import.meta.url).pathname,
  env: { ...process.env, PORT: String(PORT) },
  stdio: 'ignore'
});

const alive = [];
try {
  await wait(700);

  /* ------------------------------------------------ two clients meet -- */
  const A = client('aaa1', 'Max');
  const B = client('bbb2', 'Brother');
  alive.push(A, B);
  await wait(300);
  log(A.open && B.open, 'two independent streams connect');

  await A.report(); await B.report();
  await wait(200);
  log(A.roster.length === 2, 'A sees both players (' + A.roster.map(p => p.name).join(', ') + ')');
  log(B.roster.length === 2, 'B sees both players');

  /* --------------------------------- the reported bug: does it cross -- */
  await A.say('hello from the other pc');
  await wait(250);
  log(said(B).includes('hello from the other pc'),
      "B receives A's message — the symptom that was reported");
  log(said(A).includes('hello from the other pc'), 'and A sees their own');

  await B.say('got it');
  await wait(250);
  log(said(A).includes('got it'), 'and it crosses in the other direction');

  /* --------------------------------------- identity travels with it --- */
  const got = raw(B, 'hello from the other pc');
  log(!!got && got.id === 'aaa1', 'the sender id travels with the message');
  log(!!got && got.name === 'Max', 'as does the name');

  const C = client('ccc3', 'player');
  const D = client('ddd4', 'player');
  alive.push(C, D);
  await wait(250);
  await C.say('from C');
  await wait(250);
  const atD = raw(D, 'from C');
  log(!!atD && atD.id === 'ccc3',
      'two players sharing a name are still told apart by id');

  /* ------------------------------------------------ roster movement --- */
  await A.report({ level: 7, solved: 6 });
  await wait(250);
  const seen = B.roster.find(p => p.id === 'aaa1');
  log(!!seen && seen.level === 7 && seen.solved === 6, "B sees A's progress move");

  /* -------------------------------------------------------- backlog --- */
  const late = client('eee5', 'Latecomer');
  alive.push(late);
  await wait(350);
  log(late.backlog.filter(m => m.kind === 'chat').length >= 2,
      'a latecomer is given the recent history');
  log(late.backlog.some(m => m.id === 'aaa1'), 'and that history carries ids');

  /* --------------------------------------------- a dropped listener --- */
  B.close();
  await wait(200);
  await A.say('after B dropped');
  await wait(250);
  log(said(A).includes('after B dropped'),
      'one dropped stream does not stop the others being served');
  log(said(late).includes('after B dropped'), 'the remaining listeners still receive');

  const back = client('bbb2', 'Brother');
  alive.push(back);
  await wait(350);
  log(back.backlog.some(m => m.text === 'after B dropped'),
      'and reconnecting replays what was missed');

  /* ------------------------------------------------ rapid reporting --- */
  const before = A.roster.length;
  for (let i = 0; i < 25; i++) await A.report({ level: (i % 9) + 1 });
  await wait(300);
  log(A.roster.length === before, 'rapid reporting does not duplicate players');
  log(A.roster.filter(p => p.id === 'aaa1').length === 1, 'a player appears exactly once');

  /* ---------------------------------------------------- odd input ----- */
  await A.say('<img src=x onerror=alert(1)>');
  await wait(250);
  log(!!raw(back, '<img src=x onerror=alert(1)>'),
      'markup in a message is carried as plain text, unescaped and unexecuted');

  await client('fff6', '').say('nameless');
  await wait(250);
  const anon = raw(back, 'nameless');
  log(!!anon && anon.name === 'player', 'an empty name falls back to a default');

  const longName = 'x'.repeat(200);
  const L = client('ggg7', longName);
  alive.push(L);
  await L.report();
  await wait(250);
  const trimmed = back.roster.find(p => p.id === 'ggg7');
  log(!!trimmed && trimmed.name.length <= 40, 'an over-long name is trimmed by the server');

  await A.say('y'.repeat(600));
  await wait(250);
  const longMsg = back.chat.filter(m => m.kind === 'chat').pop();
  log(longMsg.text.length <= 300, 'an over-long message is trimmed by the server');

  console.log('');
  console.log(fails ? `RESULT: ${fails} FAILURE(S)` : 'RESULT: all green');
  console.log('assertions: ' + lines.filter(l => l.startsWith('  ok')).length);
} catch (err) {
  console.log(' FAIL harness threw: ' + (err && err.stack || err));
  fails++;
} finally {
  alive.forEach(c => c.close());
  server.kill();
  await wait(120);
  process.exit(fails ? 1 : 0);
}
