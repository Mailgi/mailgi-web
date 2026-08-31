"""
Social card generator.  python3 brand/genog.py  ->  og.png (1200x630)

Why a PNG and not the SVG we shipped first: X, Slack, Discord and LinkedIn all
decline to render an SVG og:image, so the earlier hand-written og.svg produced a
bare text link everywhere it mattered. This is the same design, rasterised.

Why generated and not drawn by hand: the first version had the accent as
#1f6f7d, picked by eye. The real token is oklch(0.52 0.11 200) -> #007b82. The
palette below is converted from the oklch values in styles.css at import time,
so it cannot drift from the site the way a pasted hex can.

Type note, deliberate rather than accidental: styles.css declares
`--serif: 'Newsreader', Georgia, serif`. Newsreader is a webfont and is not
installed locally, so this uses Georgia -- the site's own declared fallback.
The logo mark itself is immune to this, being geometry (see genlogo.py).
"""
import math
import os
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "og.png")


def oklch(L, C, Hdeg):
    """styles.css states the accent in oklch; convert rather than hardcode."""
    h = math.radians(Hdeg)
    a, b = C * math.cos(h), C * math.sin(h)
    l_, m_, s_ = L + .3963377774*a + .2158037573*b, L - .1055613458*a - .0638541728*b, L - .0894841775*a - 1.291485548*b
    l, m, s = l_**3, m_**3, s_**3
    r = 4.0767416621*l - 3.3077115913*m + .2309699292*s
    g = -1.2684380046*l + 2.6097574011*m - .3413193965*s
    bb = -.0041960863*l - .7034186147*m + 1.707614701*s

    def enc(x):
        x = max(0.0, min(1.0, x))
        return 12.92*x if x <= .0031308 else 1.055*x**(1/2.4) - .055
    return tuple(round(enc(v) * 255) for v in (r, g, bb))


# straight from the :root block in styles.css
BG      = (0xfb, 0xfb, 0xfa)
SURFACE = (0xf2, 0xf1, 0xec)
INK     = (0x16, 0x21, 0x1f)
MUTED   = (0x5c, 0x6a, 0x66)
MUTED2  = (0x7e, 0x8a, 0x86)
RULE    = (0xe3, 0xe5, 0xe2)
ACCENT  = oklch(0.52, 0.11, 200)

SERIF_I = "/System/Library/Fonts/Supplemental/Georgia Italic.ttf"
SERIF   = "/System/Library/Fonts/Supplemental/Georgia.ttf"
SANS    = "/System/Library/Fonts/Helvetica.ttc"
MONO    = "/System/Library/Fonts/Supplemental/Courier New.ttf"


def font(path, size):
    if not os.path.exists(path):
        raise SystemExit(f"missing font: {path}\nEdit the paths at the top of {__file__}.")
    return ImageFont.truetype(path, size)


img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

# accent rule along the top, as on the pages
d.rectangle([0, 0, W, 6], fill=ACCENT)

# ── brand lockup: mark + wordmark, matching the site nav ───────────────────
mark_px = 68
mark = Image.open(os.path.join(HERE, "logo-192.png")).convert("RGBA")
mark = mark.resize((mark_px, mark_px), Image.LANCZOS)
img.paste(mark, (64, 52), mark)
d.text((64 + mark_px + 20, 52 + mark_px // 2), "mailgi",
       font=font(SERIF_I, 40), fill=INK, anchor="lm")

# ── headline ──────────────────────────────────────────────────────────────
f_head = font(SERIF, 92)
f_head_i = font(SERIF_I, 92)
d.text((64, 232), "Email for", font=f_head, fill=INK)
d.text((64, 340), "AI Agents", font=f_head_i, fill=ACCENT)

# ── subline ───────────────────────────────────────────────────────────────
d.text((64, 470), "Real inboxes. Real deliverability. One REST API.",
       font=font(SANS, 27), fill=MUTED)

# ── bottom line ───────────────────────────────────────────────────────────
# The endpoint is already in the panel; repeating it in a chip here was
# redundant. This row carries the claim and the domain, nothing else.
cy0 = 536
d.text((64, cy0 + 28), "No OAuth.  No signup form.  Free while in beta.",
       font=font(SANS, 24), fill=MUTED, anchor="lm")

# ── response panel, right ─────────────────────────────────────────────────
# Echoes the dark codeblock beside the homepage hero, and stops the right half
# of the card being dead space at preview size.
px0, py0, px1, py1 = 646, 232, W - 64, 452
d.rounded_rectangle([px0, py0, px1, py1], radius=10, fill=INK)
f_c = font(MONO, 19)
lines = [
    ("$ curl -X POST /v1/agents/register", MUTED2),
    ("# =>", MUTED2),
    ('{ "emailAddress":', (0xcf, 0xd6, 0xd1)),
    ('    "buzzing-falcon@mailgi.xyz",', oklch(0.78, 0.10, 200)),
    ('  "apiKey": "amb_..." }', (0xcf, 0xd6, 0xd1)),
]
ty = py0 + 30
for txt, col in lines:
    if txt:
        d.text((px0 + 26, ty), txt, font=f_c, fill=col)
    ty += 34

# ── url, bottom right ─────────────────────────────────────────────────────
d.text((W - 64, cy0 + 28), "www.mailgi.xyz",
       font=font(MONO, 22), fill=MUTED2, anchor="rm")

img.save(OUT, optimize=True)
print("wrote %s  (%dx%d, %d bytes, accent %s)" % (
    os.path.normpath(OUT), W, H, os.path.getsize(OUT),
    "#%02x%02x%02x" % ACCENT))
