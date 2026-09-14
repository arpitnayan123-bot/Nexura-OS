#!/usr/bin/env python3
"""Generate the Open Graph share image (public/og.png) — 1200x630."""
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
BG = (23, 19, 16)          # warm near-black
GOLD = (201, 150, 46)
GOLD_SOFT = (217, 184, 124)
CREAM = (245, 240, 232)
MUTED = (154, 143, 132)

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

# subtle radial glow top-left (gold)
glow = Image.new("L", (W, H), 0)
gd = ImageDraw.Draw(glow)
gd.ellipse((-300, -350, 700, 550), fill=38)
gold_layer = Image.new("RGB", (W, H), (60, 46, 24))
img = Image.composite(gold_layer, img, glow)
d = ImageDraw.Draw(img)

serif = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"
sans = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
f_title = ImageFont.truetype(serif, 148)
f_tag = ImageFont.truetype(sans, 40)
f_sub = ImageFont.truetype(sans, 26)
f_small = ImageFont.truetype(sans, 22)

# gold accent rule
d.rectangle((110, 148, 300, 152), fill=GOLD)

d.text((108, 190), "Nexura", font=f_title, fill=CREAM)
d.text((112, 372), "A Calmer Operating System for Health", font=f_tag, fill=GOLD_SOFT)
d.text((112, 448), "Hospital OS · Clinic · Pharmacy · Patient Portal · Know Your Health", font=f_sub, fill=MUTED)
d.text((112, 520), "Secure · server-side AI · hash-chained audit trail", font=f_small, fill=MUTED)

img.save("/home/z/my-project/public/og.png", "PNG", optimize=True)
print("og.png written:", img.size)
