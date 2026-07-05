"""GitHub Open Source contributor certificate via PIL. Modern dark navy + teal.
   Name = Yuanyang Sun, no Chinese.
"""
import os, math, pathlib
from PIL import Image, ImageDraw, ImageFont

BASE = pathlib.Path(r"C:\Users\Lamb\.openclaw\workspace\coach-sun-certs-v2")

# Fonts
F_SANS_B    = r"C:\Windows\Fonts\segoeuib.ttf"
F_SANS      = r"C:\Windows\Fonts\segoeui.ttf"
F_GEORGIA   = r"C:\Windows\Fonts\georgia.ttf"
F_GEORGIA_I = r"C:\Windows\Fonts\georgiai.ttf"
F_GEORGIA_BI= r"C:\Windows\Fonts\georgiaz.ttf"
F_MONO      = r"C:\Windows\Fonts\cour.ttf"

# GitHub brand colors
GH_DARK     = (13, 17, 23)      # #0d1117
GH_PANEL    = (22, 27, 34)      # #161b22
GH_BORDER   = (48, 54, 61)      # #30363d
GH_TEAL     = (47, 209, 196)    # bright accent
GH_TEAL_D   = (31, 122, 140)
GH_TEXT     = (230, 237, 243)   # #e6edf3
GH_TEXT_DIM = (139, 148, 158)   # #8b949e

# A4 landscape @ 200dpi
W, H = 3508, 2480

def font(p, s): return ImageFont.truetype(p, s)
def tsize(d, t, f):
    b = d.textbbox((0,0), t, font=f); return b[2]-b[0], b[3]-b[1]

def wrap(d, text, fnt, max_w):
    lines, cur = [], ""
    for w in text.split():
        test = (cur + " " + w).strip()
        tw, _ = tsize(d, test, fnt)
        if tw > max_w and cur:
            lines.append(cur); cur = w
        else:
            cur = test
    if cur: lines.append(cur)
    return lines

# ─── build canvas ───
img = Image.new("RGB", (W, H), GH_DARK)
draw = ImageDraw.Draw(img)

# Decorative top "circuit" line pattern
import random
random.seed(7)
for _ in range(80):
    x1 = random.randint(0, W)
    y1 = random.randint(MARGIN := 80, 280)
    x2 = x1 + random.randint(-200, 200)
    draw.line([(x1, y1), (x2, y1)], fill=GH_BORDER, width=2)
for _ in range(15):
    x1 = random.randint(0, W)
    y1 = random.randint(MARGIN, 280)
    draw.ellipse([x1-6, y1-6, x1+6, y1+6], outline=GH_TEAL, width=2)

# Borders
draw.rectangle([80, 80, W-80, H-80], outline=GH_BORDER, width=8)
draw.rectangle([130, 130, W-130, H-130], outline=GH_TEAL, width=3)

# Top bar — GitHub header style with octocat-ish circle
def draw_gh_circle(d, cx, cy, r):
    # outer teal ring
    d.ellipse([cx-r, cy-r, cx+r, cy+r], outline=GH_TEAL, width=8)
    d.ellipse([cx-r+12, cy-r+12, cx+r-12, cy+r-12], outline=GH_TEAL, width=3)
    # Cross hair lines (octocat suggestion)
    d.line([(cx-r+18, cy), (cx+r-18, cy)], fill=GH_TEAL, width=2)
    d.line([(cx, cy-r+18), (cx, cy+r-18)], fill=GH_TEAL, width=2)
    # small node circles at branch ends
    d.ellipse([cx-22, cy-22, cx-12, cy-12], fill=GH_TEAL)
    d.ellipse([cx+12, cy-22, cx+22, cy-12], fill=GH_TEAL)
    d.ellipse([cx-22, cy+12, cx-12, cy+22], fill=GH_TEAL)
    d.ellipse([cx+12, cy+12, cx+22, cy+22], fill=GH_TEAL)
    # center monogram "G"
    f_c = font(F_GEORGIA_BI, 130)
    cw, ch = tsize(d, "G", f_c)
    draw.text((cx - cw//2, cy - ch//2 - 8), "G", font=f_c, fill=GH_TEAL)

# Place gh seal at top center
draw_gh_circle(draw, W//2, 360, 130)

# "github" wordmark and label
f_wm = font(F_SANS_B, 70)
wm = "GITHUB  ·  OPEN  SOURCE  RECOGNITION"
tw, th = tsize(draw, wm, f_wm)
draw.text(((W - tw)//2, 530), wm, font=f_wm, fill=GH_TEXT)

# gold divider (teal divider here)
div_w = 320
draw.line([(W//2 - div_w//2, 530 + th + 30), (W//2 + div_w//2, 530 + th + 30)],
          fill=GH_TEAL, width=3)

# Subtitle
y = 530 + th + 60
f_sub = font(F_GEORGIA, 88)
sub = "CERTIFICATE OF OPEN SOURCE CONTRIBUTION"
tw, _ = tsize(draw, sub, f_sub)
draw.text(((W - tw)//2, y), sub, font=f_sub, fill=GH_TEXT)
y += 130

# presented to
f_pres = font(F_GEORGIA_I, 50)
pres = "Presented to"
tw, _ = tsize(draw, pres, f_pres)
draw.text(((W - tw)//2, y), pres, font=f_pres, fill=GH_TEXT_DIM)
y += 75

# Recipient (Western order, GitHub handle-style)
f_name = font(F_GEORGIA_BI, 180)
nm = "Yuanyang Sun"
tw, nh = tsize(draw, nm, f_name)
draw.text(((W - tw)//2, y), nm, font=f_name, fill=GH_TEXT)
y += nh + 50

# Handle line
f_handle = font(F_MONO, 48)
handle = '<  @yuanyang-sun  ·  Yuanyang Sun  >'
tw, _ = tsize(draw, handle, f_handle)
draw.text(((W - tw)//2, y), handle, font=f_handle, fill=GH_TEAL)
y += 80

# Body
f_body = font(F_GEORGIA, 46)
body = ("for outstanding contributions to the open-source  badminton-knowledge-base  "
        "repository — including technical documentation of training methodology, "
        "expert review of conditioning protocols, and ongoing community mentorship that "
        "has measurably improved the quality and accessibility of strength-and-conditioning "
        "knowledge for athletes and coaches worldwide.")
lines = wrap(draw, body, f_body, 2200)
for line in lines:
    tw, _ = tsize(draw, line, f_body)
    draw.text(((W - tw)//2, y), line, font=f_body, fill=GH_TEXT)
    y += 56

# ── Recognition ID ──
y += 30
f_id = font(F_MONO, 46)
rid = "RECOGNITION ID  ·  GH-BKB-2026-CON-0058"
tw, _ = tsize(draw, rid, f_id)
draw.text(((W - tw)//2, y), rid, font=f_id, fill=GH_TEAL)
y += 70

# Date
f_dt = font(F_GEORGIA, 46)
dt = "ISSUED  ·  2026-07-05    |    VERIFIABLE AT GITHUB.COM/BADGE/BKB-2026-CON-0058"
tw, _ = tsize(draw, dt, f_dt)
draw.text(((W - tw)//2, y), dt, font=f_dt, fill=GH_TEXT_DIM)

# ─── BOTTOM: seal + signatures + footer ───
bottom_y = H - 220

# Left "Maintainer" signature
left_x = 380
sig_y = bottom_y - 220
draw.line([(left_x, sig_y), (left_x + 900, sig_y)], fill=GH_TEAL, width=2)
f_sname = font(F_GEORGIA_I, 80)
sn1 = "Wei Zhang"
sn1_w = tsize(draw, sn1, f_sname)[0]
draw.text((left_x + (900 - sn1_w)//2, sig_y + 10), sn1, font=f_sname, fill=GH_TEXT)
f_srole = font(F_GEORGIA, 32)
role1 = "PROJECT MAINTAINER, BADMINTON-KNOWLEDGE-BASE"
r1_w = tsize(draw, role1, f_srole)[0]
draw.text((left_x + (900 - r1_w)//2, sig_y + 100), role1, font=f_srole, fill=GH_TEXT_DIM)

# Right "Core Team" signature
right_x = W - 380 - 900
draw.line([(right_x, sig_y), (right_x + 900, sig_y)], fill=GH_TEAL, width=2)
sn2 = "M. Chen"
sn2_w = tsize(draw, sn2, f_sname)[0]
draw.text((right_x + (900 - sn2_w)//2, sig_y + 10), sn2, font=f_sname, fill=GH_TEXT)
role2 = "CORE CONTRIBUTOR LEAD, GITHUB OPEN SOURCE PROGRAM"
r2_w = tsize(draw, role2, f_srole)[0]
draw.text((right_x + (900 - r2_w)//2, sig_y + 100), role2, font=f_srole, fill=GH_TEXT_DIM)

# GitHub seal circle — left bottom
draw_gh_circle(draw, 470, bottom_y - 180, 100)
f_st = font(F_SANS_B, 26)
st = "GITHUB  ·  OPEN SOURCE"
st_w, _ = tsize(draw, st, f_st)
draw.text((470 - st_w//2, bottom_y - 50), st, font=f_st, fill=GH_TEAL)

# GitHub seal circle — right bottom
draw_gh_circle(draw, W - 470, bottom_y - 180, 100)
st_w, _ = tsize(draw, st, f_st)
draw.text((W - 470 - st_w//2, bottom_y - 50), st, font=f_st, fill=GH_TEAL)

# ── SAVE ──
out_pdf = BASE/"07-GitHub-OSS-Contribution.pdf"
out_png = BASE/"07-GitHub-OSS-Contribution.png"
img.save(out_png, "PNG", optimize=True)
img.save(out_pdf, "PDF", resolution=200.0)
print(f"GitHub done: {os.path.getsize(out_pdf):,} bytes PDF")
