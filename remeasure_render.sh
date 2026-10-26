#!/bin/sh
# Re-render hashflow (dark) + hashflow-light at the SAME conditions as before:
# 900x600, deviceScaleFactor 2, H.264 yuv420p CRF 20. Overwrites the existing mp4s.
set -e
cd "$(dirname "$0")"
VENV="/home/ew3/agents/papertrail/project/v2/tests/venv/bin/python"
TMP="/tmp/hf_remake"
rm -rf "$TMP"; mkdir -p "$TMP"

render_one() {
    THEME="$1"   # "" (dark) or "light"
    OUT_MP4="$2"
    RDIR="$TMP/$THEME"
    mkdir -p "$RDIR"
    echo "=== rendering $OUT_MP4 ($([ -n "$THEME" ] && echo $THEME || echo dark)) ==="
    PW_URL="http://127.0.0.1:9001/staging2.html" \
    PW_THEME="$THEME" \
    PW_OUT="$RDIR" \
    PW_W=900 PW_H=600 PW_SCALE=2 PW_WAIT=45 \
        "$VENV" render_video.py
    WEBM=$(cat "$RDIR/last_video.txt")
    echo "webm: $WEBM"
    ffmpeg -y -loglevel error -i "$WEBM" \
        -c:v libx264 -pix_fmt yuv420p -crf 20 -movflags +faststart \
        "$OUT_MP4"
    echo "  -> $OUT_MP4"
}

render_one "" "hashflow.mp4"
render_one "light" "hashflow-light.mp4"

echo ""
echo "=== final dimensions ==="
for f in hashflow.mp4 hashflow-light.mp4; do
    printf "%s: " "$f"
    ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of csv=p=0 "$f"
done
echo "DONE"
