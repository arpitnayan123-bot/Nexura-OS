#!/usr/bin/env python3
"""Compute WCAG-passing color bumps that stay in the same hue family."""


def lum(hexs):
    hexs = hexs.lstrip("#")
    r, g, b = (int(hexs[i:i+2], 16) / 255 for i in (0, 2, 4))
    def f(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def ratio(fg, bg):
    l1, l2 = sorted([lum(fg), lum(bg)], reverse=True)
    return (l1 + 0.05) / (l2 + 0.05)


def brighten_toward(hexs, bg, target=4.8, step=0.04, cap=0.92):
    """Lighten fg (toward white) until ratio >= target."""
    hexs = hexs.lstrip("#")
    r, g, b = (int(hexs[i:i+2], 16) for i in (0, 2, 4))
    for t in [x / 100 for x in range(0, int(cap * 100) + 1, int(step * 100))]:
        nr = int(r + (255 - r) * t); ng = int(g + (255 - g) * t); nb = int(b + (255 - b) * t)
        c = f"#{nr:02x}{ng:02x}{nb:02x}"
        if ratio(c, bg) >= target:
            return c, round(ratio(c, bg), 2)
    return None, None


def darken_toward(hexs, bg, target=4.8, step=0.04, cap=0.9):
    hexs = hexs.lstrip("#")
    r, g, b = (int(hexs[i:i+2], 16) for i in (0, 2, 4))
    for t in [x / 100 for x in range(0, int(cap * 100) + 1, int(step * 100))]:
        nr = int(r * (1 - t)); ng = int(g * (1 - t)); nb = int(b * (1 - t))
        c = f"#{nr:02x}{ng:02x}{nb:02x}"
        if ratio(c, bg) >= target:
            return c, round(ratio(c, bg), 2)
    return None, None


CASES = [
    # (name, fg, bg, mode)  mode: 'lighten' or 'darken'
    ("kbd shared        ", "#8a8070", "#241f16", "lighten"),
    ("home eyebrow      ", "#b1aca8", "#faf7f2", "darken"),
    ("home muted/60     ", "#a29c97", "#f8f4ec", "darken"),
    ("pricing nav link  ", "#64748b", "#faf7f2", "darken"),
    ("pricing CTA white on gold", "#ffffff", "#b8860b", None),  # darken bg instead
    ("care/vitals eyebrow", "#a16207", "#141210", "lighten"),
    ("care chip text    ", "#8a8070", "#291e0f", "lighten"),
    ("care footer/muted ", "#6e6654", "#181511", "lighten"),
    ("care footer bg2   ", "#6e6654", "#141210", "lighten"),
    ("pharmacy gray on #0d0f12", "#6b7280", "#0d0f12", "lighten"),
    ("pharmacy gray on #111417", "#6b7280", "#111417", "lighten"),
    ("pharmacy gray4b on #0a0c0f", "#4b5563", "#0a0c0f", "lighten"),
    ("pharmacy amber/60 on #0a0c0f", "#97640d", "#0a0c0f", "lighten"),
]

print(f"{'case':28s} {'old ratio':>9s}  {'fix':>8s}  {'new ratio':>9s}")
for name, fg, bg, mode in CASES:
    old = round(ratio(fg, bg), 2)
    if name.startswith("pricing CTA"):
        # darken the BG (darkgoldenrod) until white text passes
        fix, new = darken_toward(bg, "#ffffff")
        print(f"{name:28s} {old:>9}  bg→{fix}  {new:>9}")
    else:
        fix, new = (brighten_toward(fg, bg) if mode == "lighten" else darken_toward(fg, bg))
        print(f"{name:28s} {old:>9}  {fix}  {new:>9}")
