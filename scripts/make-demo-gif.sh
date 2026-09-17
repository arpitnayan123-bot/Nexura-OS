#!/bin/bash
# Build the Nexura OS README demo GIF from product screenshots.
# Slideshow with crossfades: homepage -> hospital -> clinic -> pharmacy
# -> portal -> KYH -> global -> connect. Output < 8MB, 1152x720, 12fps.
set -euo pipefail

cd /home/z/my-project/docs/screenshots

OUT=/home/z/my-project/docs/screenshots/nexura-demo.gif
FPS=8
DUR=2.0      # per-slide duration (s)
TRANS=0.7    # crossfade duration (s)
W=960
H=600

# Ordered slide list (flagship first)
SLIDES=(
  homepage.png
  hospital-command-center.png
  hospital-patient-records.png
  clinic.png
  pharmacy-inventory.png
  portal-dashboard.png
  know-your-health.png
  global.png
  connect.png
)

N=${#SLIDES[@]}
TOTAL=$(python3 -c "print(round($N * $DUR - ($N - 1) * $TRANS, 2))")
echo "slides=$N total=${TOTAL}s out=$OUT"

# Build the ffmpeg filtergraph: scale each input, then chain xfades.
INPUTS=()
for s in "${SLIDES[@]}"; do INPUTS+=(-loop 1 -t "$DUR" -i "$s"); done

FILTER=""
for i in "${!SLIDES[@]}"; do
  FILTER+="[$i:v]scale=${W}:${H}:flags=lanczos,setsar=1,fps=${FPS}[v${i}];"
done

# Chain the xfade offsets: offset_i = i*(DUR-TRANS)
PREV="v0"
OFFSET=0
for i in $(seq 1 $((N - 1))); do
  OFFSET=$(python3 -c "print(round($i * ($DUR - $TRANS), 2))")
  OUTL="x${i}"
  if [ "$i" -eq $((N - 1)) ]; then OUTL="vout"; fi
  FILTER+="[${PREV}][v${i}]xfade=transition=fade:duration=${TRANS}:offset=${OFFSET}[${OUTL}];"
  PREV="x${i}"
done
FILTER="${FILTER%;}"   # strip trailing semicolon

rm -f /tmp/palette.png "$OUT"
# Pass 1: palette (palettegen chained inside the complex graph)
ffmpeg -y -loglevel error "${INPUTS[@]}" -filter_complex "$FILTER;[vout]palettegen=max_colors=128[pal]" \
  -map "[pal]" /tmp/palette.png
# Pass 2: apply palette
ffmpeg -y -loglevel error "${INPUTS[@]}" -i /tmp/palette.png \
  -filter_complex "$FILTER;[vout][${N}:v]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle[out]" \
  -map "[out]" -loop 0 "$OUT"

SIZE=$(du -h "$OUT" | cut -f1)
echo "DONE: $OUT ($SIZE)"
