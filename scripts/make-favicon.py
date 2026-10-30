#!/usr/bin/env python3
"""Generate src/app/favicon.ico — multi-size ICO drawn to match the brand
(amber rounded square + white 'N', derived from --primary oklch(0.55 0.115 80)
≈ #A16207 on the warm-paper background). Browsers request /favicon.ico by
default; without this file every such request fell through to the app
function (a pointless 500 while the function is broken, 404 otherwise)."""

from PIL import Image, ImageDraw, ImageFont

AMBER = (145, 93, 20, 255)      # darkened #A16207 for contrast on light tabs
AMBER_HI = (176, 118, 26, 255)
PAPER = (250, 250, 248, 255)    # #FAFAF8
SIZES = [16, 32, 48]

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def draw(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    radius = max(2, size // 5)
    # rounded amber tile
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=AMBER)
    # subtle top highlight band
    d.rounded_rectangle(
        [0, 0, size - 1, max(1, size // 3)], radius=radius, fill=AMBER_HI
    )
    # white 'N' — geometric fallback strokes when the font is unavailable
    try:
        f = ImageFont.truetype(FONT, int(size * 0.72))
        bbox = d.textbbox((0, 0), "N", font=f)
        w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
        d.text(((size - w) / 2 - bbox[0], (size - h) / 2 - bbox[1]), "N", font=f, fill=PAPER)
    except Exception:
        stroke = max(1, size // 8)
        x0, y0, x1, y1 = size * 0.22, size * 0.2, size * 0.78, size * 0.8
        d.line([x0, y1, x0, y0, x1, y1, x1, y0], fill=PAPER, width=stroke, joint="curve")
    return img


if __name__ == "__main__":
    import os

    out = os.path.join(os.path.dirname(__file__), "..", "src", "app", "favicon.ico")
    master = draw(48)  # PIL downscales this master into every requested size
    master.save(out, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    print("wrote", os.path.normpath(out), os.path.getsize(os.path.normpath(out)), "bytes")
