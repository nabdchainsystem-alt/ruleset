# Deploying RULESET to Vercel

Specific to this repository. Nothing here is generic Vercel advice.

## What this project actually is

**A static site with no build step.** No framework, no bundler, no
transpiler, no dependencies. `index.html` loads fourteen plain `.js` files and
six plain `.css` files with `<script src>` and `<link rel>`, in order. That
order is load-bearing — `game.js` expects `RULESET_LEVELS`, `RULESET_BREAKS`
and `RULESET_ROUTE` to already exist.

This has one consequence worth stating plainly, because it inverts the usual
advice: **the assets are not content-hashed.** `game.js` is served as
`game.js`, not `game.a3f9c1.js`. Long-lived immutable caching would therefore
strand players on whatever build they first loaded. See *Caching* below.

| | |
|---|---|
| Framework preset | **Other** (none — do not pick Vite/Next) |
| Build command | **none** (leave empty) |
| Install command | **none** |
| Output directory | **`.`** (the repository root — set explicitly in `vercel.json`) |
| Package manager | not used at deploy time |
| Node version | irrelevant — nothing runs server-side |
| Environment variables | **none.** See below. |

### Environment variables: there are none

`process.env` appears exactly twice in this repository, both times reading
`PORT`, both times inside the local co-op dev server (`server.mjs`) and its
test (`coop-tests.mjs`). Neither is deployed. There is deliberately **no
`.env.example`** — inventing one would imply configuration that does not
exist.

## First deployment

The Vercel CLI is not authenticated in the development environment this was
prepared in, so these are run by a human once:

```bash
cd /Users/max/ruleset
npx vercel login          # opens a browser
npx vercel link           # creates the project, writes .vercel/
npx vercel                # PREVIEW deploy — always do this first
```

Open the preview URL it prints and check it against
`docs/PRODUCTION_CHECKLIST.md`. Only then:

```bash
npx vercel --prod         # production
```

Vercel will ask about build settings on first link. Accept **Other** and
leave build/install commands empty. If it has already guessed something else,
override it in *Project → Settings → Build & Development Settings* to match
the table above.

### Deploying from GitHub instead

Import `nabdchainsystem-alt/ruleset`. Same settings. Every push to `main`
becomes production; every other branch and PR becomes a preview.

## What gets deployed — and what must not

`.vercelignore` is not housekeeping. **RULESET is a mystery, and several files
in this repository are its answer key:**

- `tests.html` drives every puzzle to its solution
- `invariants.mjs` prints the hidden sentence to stdout
- `docs/ECHO_SPEC.md` explains the cipher end to end
- `docs/BREAK_LEVELS.md` describes all thirty Break puzzles

Shipping any of them would let the first curious visitor read the ending
before playing the beginning. `browser-tests.mjs` asserts that four of these
paths return **404** on the deployed file set, so this cannot regress
silently.

Also excluded: `server.mjs` and `live.js`. Co-op is a long-running Node
process with an SSE stream; it has no meaning on static hosting and the
single-player game does not depend on it. `live.js` is injected by
`server.mjs` at serve time and is never referenced by `index.html`.

The deployed build is **28 files, about 640 KB**.

## Routing

**`/` is rewritten to `home.html`** (the landing page) and **`/play` to
`index.html`** (the game). Nothing else is rewritten.

The game deliberately stays at `index.html` rather than being renamed: about
fifteen references across the test suites, `global.html`, `server.mjs` and the
docs point at it, and `open index.html` off the disk has to keep working. Two
rewrites cost nothing and move none of that.

This is **not** an SPA and must not get a catch-all rewrite. Stage selection
uses a query string (`/play?level=52`), which static hosting serves correctly
because the path is unchanged. A catch-all would also break the `404`s that
keep the answer key off the public build — the opposite of what this project
needs. `browser-tests.mjs` serves the real file set through the real rewrite
table and asserts both routes plus all nine 404s.

### If the deploy 404s with `404 — not in /var/task`

That string is Vercel's **serverless runtime** answering for a project that
has no functions at all — it means the build produced no static output, so
every path fell through. It is a build-configuration failure, not a routing
one. Check, in this order:

1. **Is `vercel.json` actually in the deployed commit?** This exact failure
   happened once because the config existed locally and had never been pushed;
   Vercel was building a tree that contained only `package.json` and the game
   files, found no build script and no `public/` directory, and emitted
   nothing.
2. **Project → Settings → Build & Development Settings.** Framework Preset
   *Other*; Build Command, Install Command and Output Directory all with
   **Override off** (or Output Directory set to `.`). Dashboard values that
   were saved earlier stick around and will fight `vercel.json`.
3. **Root Directory** must be `./`, not a subfolder.

## Headers

`vercel.json` sets them. The Content-Security-Policy is built from what the
app actually loads, not copied from a template:

```
default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:;
font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self';
form-action 'self'; frame-ancestors 'self'
```

Notes on why it is this tight:

- **No `'unsafe-inline'` anywhere**, including styles. The game sets element
  styles constantly, but through CSSOM (`el.style.left = …`), which CSP does
  not govern. The one place that used `setAttribute('style', …)` — restoring
  a borrowed chrome element in `ctx.borrow()` — was changed to `style.cssText`
  specifically so this directive could stay clean.
- **`img-src` needs `data:`** for the inline SVG favicon.
- **`connect-src 'self'`** is generous: the deployed build makes no network
  requests at all.
- **No external hosts**, no web fonts, no CDN, no analytics.

`browser-tests.mjs` serves the real file set with these exact headers and
fails on any console error, so a CSP that breaks the game is caught locally
rather than in production.

## Caching

```json
{ "source": "/(.*)\\.(js|css)", "Cache-Control": "public, max-age=0, must-revalidate" }
{ "source": "/(.*)\\.html",     "Cache-Control": "public, max-age=0, must-revalidate" }
```

This is deliberate and it is the opposite of the usual recommendation.
Immutable caching is correct only for content-hashed filenames; these are not
hashed, so `max-age` would mean a released fix never reaches anyone who had
already loaded the game. Revalidation is cheap here — the whole build is
640 KB — and correctness matters more.

If a build step is ever introduced that emits hashed filenames, revisit this.

## Rollback

Vercel keeps every deployment. *Project → Deployments → ⋯ → Promote to
Production* on any earlier build, or:

```bash
npx vercel rollback            # to the previous production deployment
npx vercel ls ruleset          # list, then promote a specific one
npx vercel promote <url>
```

Because there is no build step, a rollback is exactly the old files — there
is no cache or artifact that can disagree with them.

## Before any production deploy

```bash
node invariants.mjs        # 42  — ECHO cannot be allowed to drift
node progress-tests.mjs    # 1226 — save/load, migration, malformed storage
node coop-tests.mjs        # 21  — local co-op only
node browser-tests.mjs     # 87  — Chromium + WebKit + Firefox, real headers
```

plus `tests.html` (551) and `sea-tests.html` (49) in a browser. All must be
green. `browser-tests.mjs` needs Playwright, which is intentionally *not* a
dependency of this repository:

```bash
npx playwright install chromium webkit firefox
npm install playwright     # or resolve it however you prefer
```
