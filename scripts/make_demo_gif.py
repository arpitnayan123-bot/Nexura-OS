#!/usr/bin/env python3
"""Build the Nexura OS README demo GIF with Pillow (fast, no ffmpeg xfade chain).

Slideshow with linear crossfades:
homepage -> hospital command center -> patient records -> clinic -> pharmacy
-> portal -> KYH -> global -> connect. Target: <= 6 MB, 800x500, 8 fps.
"""
from PIL import Image
import os

SRC = "/home/z/my-project/docs/screenshots"
OUT = os.path.join(SRC, "nexura-demo.gif")
W, H = 800, 500
FPS = 8
HOLD = 11          # frames each slide is shown (~1.4 s)
FADE = 4           # crossfade frames between slides

SLIDES = [
    "homepage.png",
    "hospital-command-center.png",
    "hospital-patient-records.png",
    "clinic.png",
    "pharmacy-inventory.png",
    "portal-dashboard.png",
    "know-your-health.png",
    "global.png",
    "connect.png",
]


def load(path: str) -> Image.Image:
    im = Image.open(path).convert("RGB")
    # high-quality downscale to exact target
    return im.resize((W, H), Image.LANCZOS)


def main() -> None:
    imgs = [load(os.path.join(SRC, s)) for s in SLIDES]
    n = len(imgs)

    frames: list[Image.Image] = []
    for i, im in enumerate(imgs):
        # hold frames
        for _ in range(HOLD):
            frames.append(im.copy())
        # crossfade into the next slide (wrap-around to the first for looping)
        nxt = imgs[(i + 1) % n]
        for f in range(1, FADE):
            alpha = f / FADE
            blended = Image.blend(im, nxt, alpha)
            frames.append(blended)

    # quantize each frame adaptively (256 colors) and save as looping GIF
    qframes = [f.quantize(colors=192, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG) for f in frames]
    durations = [1000 // FPS] * len(qframes)
    qframes[0].save(
        OUT,
        save_all=True,
        append_images=qframes[1:],
        duration=durations,
        loop=0,
        optimize=True,
        disposal=1,
    )
    size = os.path.getsize(OUT) / (1024 * 1024)
    print(f"DONE: {OUT}  frames={len(qframes)}  size={size:.2f} MB")


if __name__ == "__main__":
    main()
