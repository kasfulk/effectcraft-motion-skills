#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

node --test "$ROOT"/test/*.test.mjs
mkdir -p "$TMP/dir with space"
cp "$ROOT/examples/hostile.json" "$TMP/dir with space/"
set +e
(cd / && "$ROOT/bin/ecm" preview "$TMP/dir with space/hostile.json") >"$TMP/out" 2>"$TMP/err"
status=$?
set -e
test "$status" -eq 0
base="$TMP/dir with space/hostile"
test -f "$base.ecproj"
test -f "$base.sheet.png"
text=$(effectcraft-cli get S1_hook text text/sourceText --json "$base.ecproj")
node -e 'const v=JSON.parse(process.argv[1]).value.replace(/\r/g," "); if(v!==String.raw`Kata "kutip" \ dan </script>`) { console.error("hostile text not preserved: "+JSON.stringify(v)); process.exit(1); }' "$text"
printf '%s\n' '{"theme":"reel","scenes":[{"type":"bars","items":[{"label":"Jan","value":1},{"label":"Feb","value":2}],"highlight":0}]}' > "$TMP/untitled-bars.json"
"$ROOT/bin/ecm" preview "$TMP/untitled-bars.json" >"$TMP/untitled-bars.out" 2>"$TMP/untitled-bars.err"
if effectcraft-cli get S1_bars title text/sourceText --json "$TMP/untitled-bars.ecproj" >"$TMP/no-title.out" 2>"$TMP/no-title.err"; then
  echo 'unexpected title layer in untitled bars scene' >&2; exit 1
fi
for theme in reel pitch infopop kinetik tenang edukasi; do
  node -e 'const s=require(process.argv[1]);s.theme=process.argv[2];require("fs").writeFileSync(process.argv[3],JSON.stringify(s))' "$ROOT/examples/all-scenes.json" "$theme" "$TMP/all-$theme.json"
  "$ROOT/bin/ecm" preview "$TMP/all-$theme.json" >"$TMP/$theme.out" 2>"$TMP/$theme.err"
  test -f "$TMP/all-$theme.sheet.png"
done
for counter in '4|Rp 1.250.000' '5|2,5 jt'; do
  scene=${counter%%|*}; expected=${counter#*|}
  value=$(effectcraft-cli get "S${scene}_stat" value text/sourceText --time 2 --json "$TMP/all-reel.ecproj")
  [[ "$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).evaluated)' "$value")" == *"$expected"* ]]
done
long=$(printf 'panjangsekali%.0s ' {1..80})
printf '%s\n' "{\"theme\":\"reel\",\"scenes\":[{\"type\":\"hook\",\"text\":\"$long\"}]}" > "$TMP/too-long.json"
steps_long=$(printf 'kata%.0s ' {1..60})
printf '%s\n' "{\"theme\":\"reel\",\"scenes\":[{\"type\":\"steps\",\"items\":[\"$steps_long\"]}]}" > "$TMP/too-long-steps.json"
set +e
"$ROOT/bin/ecm" preview "$TMP/too-long-steps.json" >"$TMP/too-long-steps.out" 2>"$TMP/too-long-steps.err"
status=$?
set -e
test "$status" -eq 1
grep -F 'scene 1 (steps): text too long' "$TMP/too-long-steps.err"
printf '%s\n' '{"theme":"reel","scenes":[{"type":"compare","bg":"ink","left":{"title":"Before","points":["One","Two","Three"]},"right":{"title":"After","points":["Four","Five","Six"]}}]}' > "$TMP/compare-ink.json"
"$ROOT/bin/ecm" preview "$TMP/compare-ink.json" >"$TMP/compare-ink.out" 2>"$TMP/compare-ink.err"
test -f "$TMP/compare-ink.sheet.png"
# Ambient elements must not push the settle point past an explicit duration.
printf '%s\n' '{"theme":"kinetik","scenes":[{"type":"kinetic","lines":["Satu","Dua"],"duration":10,"elements":["rays"]}]}' > "$TMP/elem-dur.json"
"$ROOT/bin/ecm" preview "$TMP/elem-dur.json" >"$TMP/elem-dur.out" 2>"$TMP/elem-dur.err"
# zoom speed is a rate: speed 2 fits four levels in 4 s.
printf '%s\n' '{"theme":"kinetik","scenes":[{"type":"zoom","levels":[{"label":"A","kind":"rings","n":2},{"label":"B","kind":"rings","n":3},{"label":"C","kind":"rings","n":4},{"label":"D","kind":"dot"}],"speed":2,"duration":4}]}' > "$TMP/zoom-speed.json"
"$ROOT/bin/ecm" preview "$TMP/zoom-speed.json" >"$TMP/zoom-speed.out" 2>"$TMP/zoom-speed.err"
printf '%s\n' '{"theme":"pitch","scenes":[{"type":"steps","title":"Judul","items":["a","b"],"bg":"ink"}]}' > "$TMP/steps-ink-title.json"
"$ROOT/bin/ecm" preview "$TMP/steps-ink-title.json" >"$TMP/steps-ink-title.out" 2>"$TMP/steps-ink-title.err"
test -f "$TMP/steps-ink-title.sheet.png"
steps_title=$(effectcraft-cli get S1_steps title transform/opacity --time 1.5 --json "$TMP/steps-ink-title.ecproj")
node -e 'const v=JSON.parse(process.argv[1]).value;if(Math.abs(v-70)>=0.01)process.exit(1)' "$steps_title"
# layout ring is pinned explicitly: theme reel defaults donut to "multi", which has no track ring.
printf '%s\n' '{"theme":"reel","scenes":[{"type":"donut","value":72,"label":"x","layout":"ring"}]}' > "$TMP/donut-opacity.json"
"$ROOT/bin/ecm" preview "$TMP/donut-opacity.json" >"$TMP/donut-opacity.out" 2>"$TMP/donut-opacity.err"
test -f "$TMP/donut-opacity.sheet.png"
printf '%s\n' '{"theme":"reel","scenes":[{"type":"stat","value":72},{"type":"donut","value":40}]}' > "$TMP/nolabel.json"
"$ROOT/bin/ecm" preview "$TMP/nolabel.json" >"$TMP/nolabel.out" 2>"$TMP/nolabel.err"
test -f "$TMP/nolabel.sheet.png"
if effectcraft-cli get S1_stat label text/sourceText --json "$TMP/nolabel.ecproj" >"$TMP/no-stat-label.out" 2>"$TMP/no-stat-label.err"; then
  echo 'unexpected label layer in label-less stat scene' >&2; exit 1
fi
if effectcraft-cli get S2_donut label text/sourceText --json "$TMP/nolabel.ecproj" >"$TMP/no-donut-label.out" 2>"$TMP/no-donut-label.err"; then
  echo 'unexpected label layer in label-less donut scene' >&2; exit 1
fi
# address the track ring by name: layer indices shift when the theme adds grain/vignette
donut_track=$(effectcraft-cli get S1_donut donut-track transform/opacity --time 1.5 --json "$TMP/donut-opacity.ecproj")
node -e 'const v=JSON.parse(process.argv[1]).value;if(Math.abs(v-30)>=0.01)process.exit(1)' "$donut_track"
set +e
"$ROOT/bin/ecm" preview "$TMP/too-long.json" >"$TMP/too-long.out" 2>"$TMP/too-long.err"
status=$?
set -e
test "$status" -eq 1
grep -F 'scene 1 (hook): text too long' "$TMP/too-long.err"

run_failure() {
  local jsx=$1 expected=$2
  local spec="$TMP/failing-$RANDOM.json"
  printf '%s\n' "{\"theme\":\"reel\",\"scenes\":[{\"type\":\"custom\",\"jsx\":$(node -e 'process.stdout.write(JSON.stringify(process.argv[1]))' "$jsx")}]}" > "$spec"
  set +e
  "$ROOT/bin/ecm" preview "$spec" >"$TMP/fail.out" 2>"$TMP/fail.err"
  status=$?
  set -e
  test "$status" -eq 1
  grep -F "$expected" "$TMP/fail.err"
  ! grep -F '.build.jsx' "$TMP/fail.err"
}
# assertFonts was removed from the engine; missing fonts now fail in checkFonts from the spec's theme override.
printf '%s\n' '{"theme":"reel","fonts":{"display":"NoSuchFont-Bold"},"scenes":[{"type":"hook","text":"halo"}]}' > "$TMP/bad-font.json"
set +e
"$ROOT/bin/ecm" preview "$TMP/bad-font.json" >"$TMP/bad-font.out" 2>"$TMP/bad-font.err"
status=$?
set -e
test "$status" -eq 1
grep -F 'fonts not installed: display=NoSuchFont-Bold (not bundled)' "$TMP/bad-font.err"
run_failure 'return (;' 'scene 1 (custom): SyntaxError'
run_failure 'return 1;' 'scene 1 (custom): renders blank'
run_failure 'rect(comp,{x:1000,y:850,w:200,h:200,fill:theme.colors.accent});' 'scene 1 (custom): rect outside safe area'
run_success() {
  local jsx=$1 spec="$TMP/success-$RANDOM.json"
  printf '%s\n' "{\"theme\":\"reel\",\"scenes\":[{\"type\":\"custom\",\"jsx\":$(node -e 'process.stdout.write(JSON.stringify(process.argv[1]))' "$jsx")}]}" > "$spec"
  set +e
  "$ROOT/bin/ecm" preview "$spec" >"$TMP/success.out" 2>"$TMP/success.err"
  local status=$?
  set -e
  if [ "$status" -ne 0 ]; then cat "$TMP/success.err" >&2; return "$status"; fi
}
run_success 'var t=text(comp,"one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twentyone twentytwo twentythree twentyfour twentyfive twentysix twentyseven twentyeight twentynine thirty thirtyone thirtytwo thirtythree thirtyfour thirtyfive thirtysix thirtyseven thirtyeight thirtynine",{size:300,min:48,maxW:850,maxH:1200}); t.layer.comment="decor";'
run_success 'var t=text(comp,"Halo",{size:120,x:CX,y:600,align:"center"}),r=t.layer.sourceRectAtTime(0,false),a=t.layer.transform.anchorPoint.value,p=t.layer.transform.position.value,top=p[1]-a[1]+r.top;if(Math.abs(top-600)>2)throw new Error("text top "+top);var q=text(comp,"Halo",{size:120,x:SAFE.x0,y:600,align:"left"}),s=q.layer.sourceRectAtTime(0,false),b=q.layer.transform.anchorPoint.value,c=q.layer.transform.position.value,left=c[0]-b[0]+s.left;if(Math.abs(left-SAFE.x0)>2)throw new Error("text left "+left);'
run_success 'var f=text(comp,"formatter"); if(fmtID(-1250000)!=="-1.250.000"||fmtID(0)!=="0"||fmtID(2.5)!=="2,5")throw new Error("fmtID");'
run_failure 'text(comp,"WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",{size:300,min:48,maxW:850,maxH:1200});' 'scene 1 (custom): text too long'
run_failure 'var r=rect(comp,{x:CX,y:850,w:400,h:400,fill:theme.colors.accent}); r.transform.scale.setValue([250,250]);' 'scene 1 (custom): rect outside safe area'

if pgrep -x effectcraft-cli; then exit 1; fi

printf '%s\n' '{"template":"themed","slides":[{"text":"Tiga hal yang membuat carousel ini dibaca sampai habis.","lead":"Sebelum mulai","emphasis":"sampai habis","source":"Catatan lapangan"},{"text":"Simpan ini untuk nanti."}]}' > "$TMP/deck.json"
"$ROOT/bin/ecm" slides "$TMP/deck.json" --out "$TMP/deck-out" >"$TMP/deck.out" 2>"$TMP/deck.err"
test -f "$TMP/deck-out/01.png"
test -f "$TMP/deck-out/02.png"
# ImageMagick 7 has "magick identify"; Debian/Ubuntu IM6 only has "identify".
identify_cmd=identify; command -v magick >/dev/null 2>&1 && identify_cmd="magick identify"
test "$($identify_cmd -format '%wx%h' "$TMP/deck-out/01.png")" = '1080x1440'
set +e
printf '%s\n' '{"template":"themed","slides":[{"text":"Halo dunia","emphasis":"hilang"}]}' > "$TMP/deck-bad-emphasis.json"
"$ROOT/bin/ecm" slides "$TMP/deck-bad-emphasis.json" --out "$TMP/deck-bad" >"$TMP/deck-bad.out" 2>"$TMP/deck-bad.err"
status=$?
set -e
test "$status" -eq 1
grep -F 'slide 1: emphasis not found in text' "$TMP/deck-bad.err"

LOCK=/tmp/ecm-render.lock
own_lock=0
trap 'if [ "$own_lock" -eq 1 ]; then rm -rf "$LOCK"; fi; rm -rf "$TMP"' EXIT
if [ -e "$LOCK" ]; then echo 'render lock held; finish or remove /tmp/ecm-render.lock first' >&2; exit 1; fi
mkdir "$LOCK"
own_lock=1
set +e
"$ROOT/bin/ecm" render "$ROOT/examples/hemat.json" >"$TMP/locked.out" 2>"$TMP/locked.err"
status=$?
set -e
test "$status" -eq 1
grep -F 'another render is running' "$TMP/locked.err"
rmdir "$LOCK"
own_lock=0
printf '%s\n' 'null' > "$TMP/null.json"
set +e
"$ROOT/bin/ecm" check "$TMP/null.json" >"$TMP/null.out" 2>"$TMP/null.err"
status=$?
set -e
test "$status" -eq 1
grep -F 'spec: must be an object' "$TMP/null.err"
printf '%s\n' '{"theme":"nope","scenes":[]}' > "$TMP/invalid-render.json"
set +e
"$ROOT/bin/ecm" render "$TMP/invalid-render.json" >"$TMP/invalid-render.out" 2>"$TMP/invalid-render.err"
status=$?
set -e
test "$status" -eq 1
test ! -e "$LOCK"
cp "$ROOT/examples/hemat.json" "$TMP/hemat.json"
node -e 'const fs=require("fs"),p=process.argv[1],s=require(p);s.scenes.push({type:"stat",value:7});s.out="nested/hemat.mp4";fs.writeFileSync(p,JSON.stringify(s))' "$TMP/hemat.json"
# layout center is pinned: reel's "pill" outro scales the pill but never fades the cta in.
printf '%s\n' '{"theme":"reel","scenes":[{"type":"outro","text":"Done","cta":"Follow","layout":"center"}]}' > "$TMP/cta.json"
"$ROOT/bin/ecm" preview "$TMP/cta.json" >"$TMP/cta.out" 2>"$TMP/cta.err"
cta_early=$(effectcraft-cli get S1_outro cta transform/opacity --time 0.3 --json "$TMP/cta.ecproj")
cta_late=$(effectcraft-cli get S1_outro cta transform/opacity --time 1.4 --json "$TMP/cta.ecproj")
node -e 'if(Math.abs(JSON.parse(process.argv[1]).value)>0.01||Math.abs(JSON.parse(process.argv[2]).value-100)>0.01)process.exit(1)' "$cta_early" "$cta_late"
"$ROOT/bin/ecm" render "$TMP/hemat.json" >"$TMP/render.out" 2>"$TMP/render.err"
mp4=$(tail -n 1 "$TMP/render.out")
test -f "$mp4"
total=$(grep '^total  ' "$TMP/render.out" | awk '{print $2}')
probe=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate -of csv=p=0 "$mp4")
test "$probe" = '1080,1920,30/1'
duration=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$mp4")
node -e 'if(Math.abs(Number(process.argv[1])-Number(process.argv[2]))>0.05)process.exit(1)' "$duration" "$total"
test ! -e "$LOCK"

# audio spec: check plan + render + mux
cp "$ROOT/examples/hemat-audio.json" "$TMP/hemat-audio.json"
"$ROOT/bin/ecm" check "$TMP/hemat-audio.json" >"$TMP/audio-check.out" 2>"$TMP/audio-check.err"
grep -F 'audio  bed rain' "$TMP/audio-check.out"
grep -F 'audio  sfx keypress-001' "$TMP/audio-check.out"
"$ROOT/bin/ecm" render "$TMP/hemat-audio.json" >"$TMP/audio-render.out" 2>"$TMP/audio-render.err"
amp4=$(tail -n 1 "$TMP/audio-render.out")
test -f "$amp4"
grep -F 'audio: muxed 3 sfx + bed' "$TMP/audio-render.out"
test "$(ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of csv=p=0 "$amp4")" = 'aac'
aduration=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$amp4")
# compare against this render's own total: $total belongs to the earlier, longer spec.
atotal=$(grep '^total  ' "$TMP/audio-render.out" | awk '{print $2}')
node -e 'if(Math.abs(Number(process.argv[1])-Number(process.argv[2]))>0.1)process.exit(1)' "$aduration" "$atotal"
test ! -e "$LOCK"
