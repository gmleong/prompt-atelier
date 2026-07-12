"""Generate Prompt Atelier app icon — clean red rounded rect with bold white pen."""
from PIL import Image, ImageDraw
import math, os

SIZE = 1024
OUT = os.path.join(os.path.dirname(__file__), "icon_1024.png")

img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# macOS-style rounded square background (Chinese red)
r = SIZE * 0.225  # ~230px corner radius for macOS squircle feel
draw.rounded_rectangle([(0, 0), (SIZE - 1, SIZE - 1)], radius=r, fill=(196, 30, 58, 255))

# Draw a bold, simple pen — diagonal, thick strokes
# Pen shaft: diagonal from upper-right to lower-left
cx, cy = SIZE / 2, SIZE / 2
m = SIZE / 1024  # multiplier for scaling

white = (255, 255, 255, 255)
SW = int(64 * m)  # stroke width

# Shaft
x1, y1 = cx + 120 * m, cy - 260 * m  # top-right
x2, y2 = cx - 260 * m, cy + 200 * m  # bottom-left
draw.line([(x1, y1), (x2, y2)], fill=white, width=SW)

# Feather — simple elongated teardrop on upper side
# Use a polygon approximating a feather shape
feather_w = 220 * m
pts = [
    (x1 + 30 * m, y1 - 10 * m),
    (x1 + feather_w, y1 - 120 * m),
    (x1 + feather_w * 0.85, y1 + 100 * m),
    (x1 - 10 * m, y1 + 120 * m),
    (x1 - 30 * m, y1 + 15 * m),
]
draw.polygon(pts, fill=white)

# Cutout notch in feather for definition
notch_size = 100 * m
notch = [
    (x1 + feather_w * 0.8, y1 - 40 * m),
    (x1 + feather_w * 0.7, y1 + 30 * m),
    (x1 + feather_w * 0.4, y1),
]
draw.polygon(notch, fill=(196, 30, 58, 255))

# Nib tip — small triangle at writing end
nib_w = 40 * m
draw.polygon([
    (x2, y2),
    (x2 - nib_w, y2 + 15 * m),
    (x2 + 15 * m, y2 - nib_w),
], fill=white)

# Small ink drop
ink_x, ink_y = x2 - 40 * m, y2 + 80 * m
ink_r = 30 * m
draw.ellipse([ink_x - ink_r, ink_y - ink_r, ink_x + ink_r, ink_y + ink_r], fill=white)

img.save(OUT)
print(f"Saved {OUT}")
