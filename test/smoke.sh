#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

node --test "$ROOT"/test/*.test.mjs
mkdir -p "$TMP/dir with space"
cp "$ROOT/examples/hostile.json" "$TMP/dir with space/"
set +e
(cd / && node "$ROOT/bin/ecm.mjs" preview "$TMP/dir with space/hostile.json") >"$TMP/out" 2>"$TMP/err"
status=$?
set -e
test "$status" -eq 0
base="$TMP/dir with space/hostile"
test -f "$base.ecproj"
test -f "$base.sheet.png"
text=$(~/.local/bin/effectcraft-cli get S1_hook text text/sourceText --json "$base.ecproj")
[[ "$text" == *'Kata "kutip" \\ dan </script>'* ]]
for theme in reel pitch infopop kinetik tenang edukasi; do
  printf '%s\n' "{\"theme\":\"$theme\",\"scenes\":[{\"type\":\"hook\",\"text\":\"Theme $theme\"}]}" > "$TMP/$theme.json"
  node "$ROOT/bin/ecm.mjs" preview "$TMP/$theme.json" >"$TMP/$theme.out" 2>"$TMP/$theme.err"
  test -f "$TMP/$theme.sheet.png"
done

run_failure() {
  local jsx=$1 expected=$2
  local spec="$TMP/failing-$RANDOM.json"
  printf '%s\n' "{\"theme\":\"reel\",\"scenes\":[{\"type\":\"custom\",\"jsx\":$(node -e 'process.stdout.write(JSON.stringify(process.argv[1]))' "$jsx")}]}" > "$spec"
  set +e
  node "$ROOT/bin/ecm.mjs" preview "$spec" >"$TMP/fail.out" 2>"$TMP/fail.err"
  status=$?
  set -e
  test "$status" -eq 1
  grep -F "$expected" "$TMP/fail.err"
  ! grep -F '.build.jsx' "$TMP/fail.err"
}
run_failure 'assertFonts({fonts:{display:"NoSuchFont-Bold"}})' 'scene 1 (custom): font NoSuchFont-Bold is not installed'
run_failure 'return (;' 'scene 1 (custom): SyntaxError'
run_failure 'return 1;' 'scene 1 (custom): renders blank'
run_failure 'rect(comp,{x:1000,y:850,w:200,h:200,fill:theme.colors.accent});' 'scene 1 (custom): rect outside safe area'

if pgrep -fl effectcraft-cli; then exit 1; fi
