"""Generate Prompt Atelier app icon — Chinese red rounded rect with white quill."""
from PIL import Image, ImageDraw
import math, os

SIZE = 1024
OUT = os.path.join(os.path.dirname(__file__), "icon_1024.png")

img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Rounded rect background (Chinese red)
r = 180  # corner radius (macOS style)
draw.rounded_rectangle([(0, 0), (SIZE - 1, SIZE - 1)], radius=r, fill=(196, 30, 58, 255))

# Draw a white quill/pen icon
# Simplified quill: diagonal feather shape + nib
cx, cy = SIZE / 2, SIZE / 2
scale = SIZE / 800  # scale factor

def pt(x, y):
    return (cx + x * scale, cy + y * scale)

white = (255, 255, 255, 255)

# Quill shaft (diagonal line from top-right to bottom-left area)
shaft_start = pt(60, -140)
shaft_end = pt(-160, 180)
draw.line([shaft_start, shaft_end], fill=white, width=max(3, int(18 * scale)))

# Feather body (filled polygon on upper side of shaft)
feather = [
    pt(80, -120),
    pt(200, -160),
    pt(240, -30),
    pt(180, 20),
    pt(140, -20),
    pt(100, -60),
]
draw.polygon(feather, fill=white)

# Feather cuts (notches along the right edge)
cuts = [
    (pt(220, -120), pt(185, -90)),
    (pt(230, -60), pt(185, -40)),
    (pt(195, 0), pt(170, -5)),
]
for a, b in cuts:
    draw.polygon([a, b, ((a[0] + b[0]) / 2 + 20 * scale, (a[1] + b[1]) / 2)], fill=(196, 30, 58, 255))

# Nib (small triangle at the writing end)
nib = [
    shaft_end,
    (shaft_end[0] - 25 * scale, shaft_end[1] + 8 * scale),
    (shaft_end[0] + 8 * scale, shaft_end[1] - 18 * scale),
]
draw.polygon(nib, fill=white)

# Ink drop
ink_center = (shaft_end[0] - 35 * scale, shaft_end[1] + 45 * scale)
ink_r = 18 * scale
draw.ellipse([
    ink_center[0] - ink_r, ink_center[1] - ink_r,
    ink_center[0] + ink_r, ink_center[1] + ink_r
], fill=white)

img.save(OUT)
print(f"Saved {OUT}")
