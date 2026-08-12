#!/usr/bin/env bash
#
# RULESET — produce the deployable site.
#
# Vercel's zero-config detection failed twice on this repository, both times
# with "404 — not in /var/task": the serverless runtime answering for a project
# that has no functions, because the build produced no static output at all.
# Rather than keep guessing at what it infers, this writes the Build Output API
# directly. `.vercel/output/static` is served verbatim and `config.json` carries
# the headers and routes, so what ships is decided here and can be read.
#
#   ./build.sh          then look in .vercel/output/static
#
set -euo pipefail
cd "$(dirname "$0")"

OUT=".vercel/output"
rm -rf "$OUT"
mkdir -p "$OUT/static"

# ---------------------------------------------------------------- the site --
# Named explicitly. A glob would eventually sweep in the next file someone adds
# to the repository, and some of those files are the answer key.
FILES=(
  index.html home.html global.html
  styles.css breaks2.css breaks3.css breaks4.css
  vault.css recovery.css invite.css solved.css home.css global.css
  home.js
  i18n.js state.js echo.js echo-ui.js levels.js
  breaks.js breaks2.js breaks3.js breaks4.js
  route.js game.js lab.js vault.js invite.js
  physics.js messages.js simulation.js
  logo.svg logo-mark.svg
)

for f in "${FILES[@]}"; do
  if [ ! -f "$f" ]; then echo "build: missing $f" >&2; exit 1; fi
  cp "$f" "$OUT/static/$f"
done

# --------------------------------------------------------- what must NOT go --
# RULESET is a mystery and several files in this repository give it away:
# tests.html drives every puzzle to its solution, invariants.mjs prints the
# hidden sentence, docs/ECHO_SPEC.md explains the cipher, and output/pdf holds
# a full written solution to every level. None are copied above; this is the
# assertion that keeps it that way.
for bad in tests.html sea-tests.html invariants.mjs progress-tests.mjs \
           browser-tests.mjs viewport-tests.mjs coop-tests.mjs \
           server.mjs live.js README.md docs output logo-source.png; do
  if [ -e "$OUT/static/$bad" ]; then echo "build: $bad must not ship" >&2; exit 1; fi
done

# ------------------------------------------------------------------ routing --
# The landing page is the front door; the game stays at index.html so every
# test, relative link and `open index.html` off the disk keeps working.
#
# Caching is deliberately short: these filenames are not content-hashed, so
# immutable caching would strand players on whatever build they first loaded.
cat > "$OUT/config.json" <<'JSON'
{
  "version": 3,
  "routes": [
    { "src": "/", "dest": "/home.html" },
    { "src": "/play", "dest": "/index.html" },
    {
      "src": "/(.*)",
      "headers": {
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
        "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'",
        "Cache-Control": "public, max-age=0, must-revalidate"
      },
      "continue": true
    }
  ]
}
JSON

echo "build: $(ls -1 "$OUT/static" | wc -l | tr -d ' ') files -> $OUT/static"
