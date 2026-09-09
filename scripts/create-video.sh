#!/bin/bash
# ============================================================
# NEXURA OS — SCREEN RECORDING + VIDEO COMPOSITION
# Records each feature of the website, then combines with
# TTS narration to create a professional product video.
# ============================================================

set -e

OUTPUT_DIR="/home/z/my-project/video-narration"
RECORDING_DIR="/home/z/my-project/video-recordings"
FINAL_VIDEO="/home/z/my-project/download/nexura-os-demo.mp4"
BASE_URL="http://localhost:3000"

mkdir -p "$RECORDING_DIR"
mkdir -p "$(dirname "$FINAL_VIDEO")"

echo "🎬 NEXURA OS — Video Production"
echo "================================"

# Function: navigate + record a scene
record_scene() {
  local scene_id=$1
  local url=$2
  local actions=$3  # JavaScript to execute after load
  local duration=$4  # recording duration in seconds

  echo "  Recording: $scene_id ($duration s)"

  # Navigate to URL
  agent-browser open "$url" > /dev/null 2>&1
  sleep 4

  # Execute actions if provided
  if [ -n "$actions" ]; then
    agent-browser eval "$actions" > /dev/null 2>&1
    sleep 2
  fi

  # Take a screenshot instead of video recording (more reliable)
  agent-browser screenshot > /dev/null 2>&1
  local screenshot=$(ls -t /home/z/.agent-browser/tmp/screenshots/ | head -1)
  cp "/home/z/.agent-browser/tmp/screenshots/$screenshot" "$RECORDING_DIR/${scene_id}.png"

  echo "    ✓ Screenshot saved: $sceneId.png"
}

# Function: create video clip from screenshot + audio
create_clip() {
  local scene_id=$1
  local audio_file="$OUTPUT_DIR/${scene_id}.wav"
  local image_file="$RECORDING_DIR/${scene_id}.png"

  # Get audio duration
  local duration=$(ffprobe -i "$audio_file" -show_entries format=duration -v quiet -of csv="p=0")
  duration=$(echo "$duration" | awk '{printf "%.1f", $1}')

  # Create video clip: image + audio with subtle zoom effect
  ffmpeg -y -loop 1 -i "$image_file" -i "$audio_file" \
    -c:v libx264 -tune stillimage -pix_fmt yuv420p \
    -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,zoompan=z='min(zoom+0.0008,1.08)':d=${duration%.*}*25:s=1920x1080:fps=25" \
    -c:a aac -b:a 192k -ar 44100 \
    -shortest -t "$duration" \
    "$RECORDING_DIR/${scene_id}.mp4" 2>/dev/null

  echo "    ✓ Clip created: ${scene_id}.mp4 (${duration}s)"
}

# ============================================================
# STEP 1: Record screenshots of each feature
# ============================================================
echo ""
echo "📸 Step 1: Capturing screenshots..."

# Scene 1: Homepage
record_scene "01-intro" "$BASE_URL/" "" 35

# Scene 2: Homepage features
record_scene "02-homepage" "$BASE_URL/" "window.scrollTo(0, 600)" 43

# Scene 3: Hospital dashboard
record_scene "03-hospital" "$BASE_URL/hospital" "" 64

# Scene 4: Clinic
record_scene "04-clinic" "$BASE_URL/clinic" "" 30

# Scene 5: Pharmacy
record_scene "05-pharmacy" "$BASE_URL/pharmacy" "" 47

# Scene 6: Patient Portal
record_scene "06-portal" "$BASE_URL/portal/login" "" 40

# Scene 7: Connect
record_scene "07-connect" "$BASE_URL/connect" "" 41

# Scene 8: Know Your Health
record_scene "08-kyh" "$BASE_URL/know-your-health" "" 49

# Scene 9: Investors
record_scene "09-investors" "$BASE_URL/investors" "" 52

# Scene 10: Founder
record_scene "10-founder" "$BASE_URL/founder" "" 46

echo ""
echo "✅ All screenshots captured!"

# ============================================================
# STEP 2: Create video clips (screenshot + narration audio)
# ============================================================
echo ""
echo "🎬 Step 2: Creating video clips..."

for scene in 01-intro 02-homepage 03-hospital 04-clinic 05-pharmacy 06-portal 07-connect 08-kyh 09-investors 10-founder; do
  create_clip "$scene"
done

echo ""
echo "✅ All clips created!"

# ============================================================
# STEP 3: Concatenate all clips into final video
# ============================================================
echo ""
echo "🔄 Step 3: Combining clips into final video..."

# Create concat file
CONCAT_FILE="$RECORDING_DIR/concat.txt"
> "$CONCAT_FILE"
for scene in 01-intro 02-homepage 03-hospital 04-clinic 05-pharmacy 06-portal 07-connect 08-kyh 09-investors 10-founder; do
  echo "file '${scene}.mp4'" >> "$CONCAT_FILE"
done

# Concatenate
ffmpeg -y -f concat -safe 0 -i "$CONCAT_FILE" \
  -c:v libx264 -pix_fmt yuv420p -preset medium -crf 20 \
  -c:a aac -b:a 192k -ar 44100 \
  "$FINAL_VIDEO" 2>/dev/null

# Get final video info
VIDEO_DURATION=$(ffprobe -i "$FINAL_VIDEO" -show_entries format=duration -v quiet -of csv="p=0")
VIDEO_SIZE=$(ls -lh "$FINAL_VIDEO" | awk '{print $5}')

echo ""
echo "============================================================"
echo "✅ VIDEO COMPLETE!"
echo "============================================================"
echo "  File:     $FINAL_VIDEO"
echo "  Duration: ${VIDEO_DURATION}s"
echo "  Size:     $VIDEO_SIZE"
echo "  Format:   MP4 (H.264 + AAC)"
echo "  Voice:    English (jam accent)"
echo ""
echo "  10 scenes covering:"
echo "    01. Introduction"
echo "    02. Homepage + Features"
echo "    03. Hospital OS (18 modules)"
echo "    04. Clinic OS"
echo "    05. Pharmacia (Pharmacy POS)"
echo "    06. Patient Portal + Blood Test"
echo "    07. Nexura Connect"
echo "    08. Know Your Health (15 AI tools)"
echo "    09. Investor Deck"
echo "    10. Founder Story"
echo "============================================================"
