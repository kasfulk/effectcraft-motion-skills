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
  node -e 'const s=require(process.argv[1]);s.theme=process.argv[2];require("fs").writeFileSync(process.argv[3],JSON.stringify(s))' "$ROOT/examples/all-scenes.json" "$theme" "$TMP/all-$theme.json"
  node "$ROOT/bin/ecm.mjs" preview "$TMP/all-$theme.json" >"$TMP/$theme.out" 2>"$TMP/$theme.err"
  test -f "$TMP/all-$theme.sheet.png"
done
long=$(printf 'panjangsekali%.0s ' {1..80})
printf '%s\n' "{\"theme\":\"reel\",\"scenes\":[{\"type\":\"hook\",\"text\":\"$long\"}]}" > "$TMP/too-long.json"
set +e
node "$ROOT/bin/ecm.mjs" preview "$TMP/too-long.json" >"$TMP/too-long.out" 2>"$TMP/too-long.err"
status=$?
set -e
test "$status" -eq 1
grep -F 'scene 1 (hook): text too long' "$TMP/too-long.err"

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
run_success() {
  local jsx=$1 spec="$TMP/success-$RANDOM.json"
  printf '%s\n' "{\"theme\":\"reel\",\"scenes\":[{\"type\":\"custom\",\"jsx\":$(node -e 'process.stdout.write(JSON.stringify(process.argv[1]))' "$jsx")}]}" > "$spec"
  set +e
  node "$ROOT/bin/ecm.mjs" preview "$spec" >"$TMP/success.out" 2>"$TMP/success.err"
  local status=$?
  set -e
  if [ "$status" -ne 0 ]; then cat "$TMP/success.err" >&2; return "$status"; fi
}
run_success 'var t=text(comp,"one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twentyone twentytwo twentythree twentyfour twentyfive twentysix twentyseven twentyeight twentynine thirty thirtyone thirtytwo thirtythree thirtyfour thirtyfive thirtysix thirtyseven thirtyeight thirtynine",{size:300,min:48,maxW:850,maxH:1200}); t.layer.comment="decor";'
run_success 'var t=text(comp,"Halo",{size:120,x:CX,y:600,align:"center"}),r=t.layer.sourceRectAtTime(0,false),a=t.layer.transform.anchorPoint.value,p=t.layer.transform.position.value,top=p[1]-a[1]+r.top;if(Math.abs(top-600)>2)throw new Error("text top "+top);var q=text(comp,"Halo",{size:120,x:SAFE.x0,y:600,align:"left"}),s=q.layer.sourceRectAtTime(0,false),b=q.layer.transform.anchorPoint.value,c=q.layer.transform.position.value,left=c[0]-b[0]+s.left;if(Math.abs(left-SAFE.x0)>2)throw new Error("text left "+left);'
run_failure 'text(comp,"WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",{size:300,min:48,maxW:850,maxH:1200});' 'scene 1 (custom): text too long'
run_failure 'var r=rect(comp,{x:CX,y:850,w:400,h:400,fill:theme.colors.accent}); r.transform.scale.setValue([250,250]);' 'scene 1 (custom): rect outside safe area'

if pgrep -fl effectcraft-cli; then exit 1; fi
