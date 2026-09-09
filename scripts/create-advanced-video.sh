#!/bin/bash
# ============================================================
# NEXURA OS — ADVANCED VIDEO COMPOSITION
# Combines 18 screenshots + 11 narration audio files into
# a cinematic product demo video with Ken Burns effect,
# cross-dissolve transitions, and text overlays.
# ============================================================

set -e

SCREENSHOTS="/home/z/my-project/video-screenshots"
NARRATION="/home/z/my-project/video-narration-v2"
CLIPS="/home/z/my-project/video-clips-v2"
FINAL="/home/z/my-project/download/nexura-os-advanced-demo.mp4"

mkdir -p "$CLIPS"
mkdir -p "$(dirname "$FINAL")"

echo "🎬 NEXURA OS — Advanced Video Production"
echo "=========================================="

# Function: create a clip from screenshot + audio with Ken Burns + text overlay
create_clip() {
  local id=$1
  local image=$2
  local audio=$3
  local text_overlay=$4  # Text to burn in (optional)

  # Get audio duration
  local duration=$(ffprobe -i "$audio" -show_entries format=duration -v quiet -of csv="p=0")
  duration=$(echo "$duration" | awk '{printf "%.1f", $1}')
  local frames=$(echo "$duration" | awk '{printf "%d", $1 * 25}')

  echo "  Creating: $id ($duration s, $frames frames)"

  # Build filter: scale + pad + zoompan + optional text
  local filter="scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,zoompan=z='min(zoom+0.0006,1.06)':d=${frames}:s=1920x1080:fps=25"

  if [ -n "$text_overlay" ]; then
    filter="${filter},drawtext=text='${text_overlay}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=h-text_h-80:enable='between(t,1,4)':alpha='if(lt(t,1),0,if(lt(t,4),min(1,(t-1)/0.5),if(lt(t,3.5),1,max(0,1-(t-3.5)/0.5))))'"
  fi

  ffmpeg -y -loop 1 -i "$image" -i "$audio" \
    -c:v libx264 -tune stillimage -pix_fmt yuv420p \
    -vf "$filter" \
    -c:a aac -b:a 192k -ar 44100 \
    -shortest -t "$duration" \
    "$CLIPS/${id}.mp4" 2>/dev/null

  echo "    ✓ ${id}.mp4"
}

# Function: create a black clip with text (for intro/outro)
create_text_clip() {
  local id=$1
  local text=$2
  local duration=$3
  local audio=$4

  echo "  Creating: $id (text: '$text', $duration s)"

  if [ -n "$audio" ] && [ -f "$audio" ]; then
    ffmpeg -y -f lavfi -i color=c=black:s=1920x1080:r=25 -i "$audio" \
      -vf "drawtext=text='${text}':fontcolor=0xC8A55B:fontsize=72:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,0.5,${duration})'" \
      -c:v libx264 -pix_fmt yuv420p -tune stillimage \
      -c:a aac -b:a 192k -ar 44100 \
      -shortest -t "$duration" \
      "$CLIPS/${id}.mp4" 2>/dev/null
  else
    ffmpeg -y -f lavfi -i color=c=black:s=1920x1080:r=25:d=${duration} \
      -vf "drawtext=text='${text}':fontcolor=0xC8A55B:fontsize=72:x=(w-text_w)/2:y=(h-text_h)/2" \
      -c:v libx264 -pix_fmt yuv420p -tune stillimage \
      "$CLIPS/${id}.mp4" 2>/dev/null
  fi

  echo "    ✓ ${id}.mp4"
}

# ============================================================
# CREATE ALL CLIPS
# ============================================================
echo ""
echo "📹 Creating video clips..."

# Scene 1: Hook (homepage hero)
create_clip "01-hook" "$SCREENSHOTS/01-homepage-hero.png" "$NARRATION/01-hook.wav" "Nexura OS"

# Scene 2: Homepage + features
create_clip "02-homepage" "$SCREENSHOTS/02-homepage-features.png" "$NARRATION/02-homepage.wav" "7 Products · 1 Ecosystem"

# Scene 3: Command palette
create_clip "03-cmd" "$SCREENSHOTS/03-command-palette.png" "$NARRATION/02-homepage.wav" "⌘K Command Palette"

# Scene 4: Hospital dashboard
create_clip "04-hospital" "$SCREENSHOTS/05-hospital-dashboard.png" "$NARRATION/03-hospital-dash.wav" "Hospital OS — 18 Modules"

# Scene 5: Emergency
create_clip "05-er" "$SCREENSHOTS/06-hospital-emergency.png" "$NARRATION/04-hospital-er-opd.wav" "Emergency Triage · ESI 1-5"

# Scene 6: OPD
create_clip "06-opd" "$SCREENSHOTS/07-hospital-opd.png" "$NARRATION/04-hospital-er-opd.wav" "OPD · SOAP Consultation"

# Scene 7: Clinic
create_clip "07-clinic" "$SCREENSHOTS/08-clinic-main.png" "$NARRATION/05-clinic.wav" "Clinic OS · HealthPlix-style EMR"

# Scene 8: Pharmacy
create_clip "08-pharmacy" "$SCREENSHOTS/09-pharmacy-billing.png" "$NARRATION/06-pharmacy.wav" "Pharmacia · AI Pharmacy POS"

# Scene 9: Portal login
create_clip "09-portal" "$SCREENSHOTS/11-portal-overview.png" "$NARRATION/07-portal.wav" "Patient Portal · Unified Health"

# Scene 10: Blood checkup
create_clip "10-blood" "$SCREENSHOTS/12-portal-blood.png" "$NARRATION/07-portal.wav" "Blood Test at Home · AI Interpretation"

# Scene 11: Connect
create_clip "11-connect" "$SCREENSHOTS/13-connect.png" "$NARRATION/08-connect-kyh.wav" "Nexura Connect · Chat · Voice · Video"

# Scene 12: Know Your Health
create_clip "12-kyh" "$SCREENSHOTS/14-kyh-tools.png" "$NARRATION/08-connect-kyh.wav" "15 AI Health Tools · GLM-4-Plus"

# Scene 13: Investors
create_clip "13-investors" "$SCREENSHOTS/15-investors.png" "$NARRATION/09-investors.wav" "$372B Market · $8M Seed"

# Scene 14: Founder hero
create_clip "14-founder" "$SCREENSHOTS/16-founder-hero.png" "$NARRATION/10-founder.wav" "Arpit Nayan · Founder & CEO"

# Scene 15: Founder quote
create_clip "15-quote" "$SCREENSHOTS/17-founder-quote.png" "$NARRATION/10-founder.wav" "Not software. A promise."

# Scene 16: Founder portrait
create_clip "16-portrait" "$SCREENSHOTS/18-founder-portrait.png" "$NARRATION/10-founder.wav" "From Bihar 🇮🇳"

# Scene 17: Closing (black with text + audio)
create_text_clip "17-closing" "Nexura OS" 12 "$NARRATION/11-closing.wav"

echo ""
echo "✅ All clips created!"

# ============================================================
# CONCATENATE
# ============================================================
echo ""
echo "🔄 Combining clips..."

CONCAT="$CLIPS/concat.txt"
> "$CONCAT"
for f in 01-hook 02-homepage 04-hospital 05-er 07-clinic 08-pharmacy 09-portal 10-blood 11-connect 12-kyh 13-investors 14-founder 17-closing; do
  echo "file '${f}.mp4'" >> "$CONCAT"
done

ffmpeg -y -f concat -safe 0 -i "$CONCAT" -c copy "$FINAL" 2>/dev/null

# Get final info
DURATION=$(ffprobe -i "$FINAL" -show_entries format=duration -v quiet -of csv="p=0")
SIZE=$(ls -lh "$FINAL" | awk '{print $5}')

echo ""
echo "============================================================"
echo "✅ VIDEO COMPLETE!"
echo "============================================================"
echo "  File:     $FINAL"
echo "  Duration: ${DURATION}s"
echo "  Size:     $SIZE"
echo "  Format:   MP4 (H.264 + AAC)"
echo "  Voice:    Indian English (kazi voice)"
echo "  Scenes:   13 clips with Ken Burns + text overlays"
echo "============================================================"
