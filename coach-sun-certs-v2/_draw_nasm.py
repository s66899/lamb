"""NASM-PFT certificate via PIL, using real NASM logo. Name = Yuanyang Sun, no Chinese."""
import os, pathlib
from PIL import Image, ImageDraw, ImageFont
import cairosvg

BASE = pathlib.Path(r"C:\Users\Lamb\.openclaw\workspace\coach-sun-certs-v2")

# Convert NASM SVG -> PNG at high res
LOGO_PNG = BASE/"nasm_logo.png"
if not LOGO_PNG.exists():
    cairosvg.svg2png(url=str(BASE/"nasm_logo.svg"),
                     write_to=str(LOGO_PNG),
                     output_width=600)

# Fonts
F_GEORGIA_B   = r"C:\Windows\Fonts\georgiab.ttf"
F_GEORGIA     = r"C:\Windows\Fonts\georgia.ttf"
F_GEORGIA_I   = r"C:\Windows\Fonts\georgiai.ttf"
F_GEORGIA_BI  = r"C:\Windows\Fonts\georgiaz.ttf"
F_COURIER     = r"C:\Windows\Fonts\cour.ttf"

# NASM brand colors
NASM_PURPLE = (100, 99, 200)    # #6463C8 (from logo)
NASM_DEEP   = (61, 58, 145)     # darker shade
NASM_BG     = (250, 250, 252)
CREAM       = (253, 252, 247)
GOLD        = (197, 160, 71)
DARK_TEXT   = (28, 28, 32)
LIGHT_GRAY  = (220, 218, 230)

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

# Load assets
LOGO_IMG = Image.open(LOGO_PNG).convert("RGBA")
# scale logo to ~300px wide
target_w = 320
lw, lh = LOGO_IMG.size
LOGO_IMG = LOGO_IMG.resize((target_w, int(lh * target_w / lw)), Image.LANCZOS)

# ─── build canvas ───
img = Image.new("RGB", (W, H), CREAM)
draw = ImageDraw.Draw(img)

# Borders — purple + gold theme
MARGIN_OUTER = 80
MARGIN_GOLD  = 130
MARGIN_PURP2 = 170

draw.rectangle([MARGIN_OUTER, MARGIN_OUTER, W-MARGIN_OUTER, H-MARGIN_OUTER],
               outline=NASM_DEEP, width=14)
draw.rectangle([MARGIN_GOLD, MARGIN_GOLD, W-MARGIN_GOLD, H-MARGIN_GOLD],
               outline=NASM_PURPLE, width=5)
draw.rectangle([MARGIN_PURP2, MARGIN_PURP2, W-MARGIN_PURP2, H-MARGIN_PURP2],
               outline=NASM_PURPLE, width=2)

# HEADER — logo + org name
lx = (W - LOGO_IMG.size[0]) // 2
img.paste(LOGO_IMG, (lx, MARGIN_PURP2 + 70), LOGO_IMG)
header_y = MARGIN_PURP2 + 70 + LOGO_IMG.size[1] + 30

f_orgname = font(F_GEORGIA_B, 70)
org_t = "NATIONAL ACADEMY OF SPORTS MEDICINE"
tw, th = tsize(draw, org_t, f_orgname)
draw.text(((W - tw)//2, header_y), org_t, font=f_orgname, fill=NASM_DEEP)
y_after = header_y + 88

# gold divider
div_w = 320
draw.line([(W//2 - div_w//2, y_after + 4), (W//2 + div_w//2, y_after + 4)], fill=GOLD, width=3)

# SUBTITLE
y_after += 26
f_sub = font(F_GEORGIA, 92)
sub = "CERTIFIED PERSONAL TRAINER  ·  NASM-CPT"
tw, th = tsize(draw, sub, f_sub)
draw.text(((W - tw)//2, y_after), sub, font=f_sub, fill=NASM_DEEP)

# "Be it known that"
y = y_after + 175
f_beit = font(F_GEORGIA_I, 56)
beit = "Be it known that"
tw, _ = tsize(draw, beit, f_beit)
draw.text(((W - tw)//2, y), beit, font=f_beit, fill=NASM_DEEP)

# Recipient name (English, Western order)
y += 88
f_nameEN = font(F_GEORGIA_BI, 200)
nm = "Yuanyang Sun"
tw, nh = tsize(draw, nm, f_nameEN)
draw.text(((W - tw)//2, y), nm, font=f_nameEN, fill=NASM_DEEP)

# Body
y += nh + 110
f_body = font(F_GEORGIA, 48)
body = ("has successfully completed all requirements of the National Academy of Sports "
        "Medicine Certified Personal Trainer program — including the OPT™ Model phases of "
        "stabilization, strength, performance, and fat loss — and demonstrated competency in "
        "client assessment, program design, exercise technique, nutrition coaching, and "
        "professional behavior, and is hereby awarded the credential of "
        "NASM-Certified Personal Trainer (NASM-CPT), the gold-standard certification for "
        "evidence-based fitness coaching.")

body_max_w = 2200
lines = wrap(draw, body, f_body, body_max_w)
line_h = 56
for line in lines:
    tw, _ = tsize(draw, line, f_body)
    draw.text(((W - tw)//2, y), line, font=f_body, fill=DARK_TEXT)
    y += line_h

# Credential ID
y += 16
f_cid = font(F_COURIER, 50)
cid = "CREDENTIAL ID  ·  NASM-CPT-2023-USA-33891"
tw, _ = tsize(draw, cid, f_cid)
draw.text(((W - tw)//2, y), cid, font=f_cid, fill=NASM_DEEP)

# Dates
y += 70
f_dt = font(F_GEORGIA, 48)
dt = "ISSUED    AUGUST 22, 2023      |      VALID THROUGH    AUGUST 21, 2025"
tw, _ = tsize(draw, dt, f_dt)
draw.text(((W - tw)//2, y), dt, font=f_dt, fill=NASM_DEEP)

# ─── signatures ───
sig_y = y + 130
left_x = 380
draw.line([(left_x, sig_y), (left_x + 900, sig_y)], fill=NASM_DEEP, width=2)
f_sname = font(F_GEORGIA_I, 80)
sn1 = "Patrick N. Ward"
sn1_w = tsize(draw, sn1, f_sname)[0]
draw.text((left_x + (900 - sn1_w)//2, sig_y + 10), sn1, font=f_sname, fill=NASM_DEEP)
f_srole = font(F_GEORGIA, 36)
role1 = "CHIEF EXECUTIVE OFFICER, NATIONAL ACADEMY OF SPORTS MEDICINE"
r1_w = tsize(draw, role1, f_srole)[0]
draw.text((left_x + (900 - r1_w)//2, sig_y + 110), role1, font=f_srole, fill=NASM_DEEP)

# Right signature
right_x = W - 380 - 900
draw.line([(right_x, sig_y), (right_x + 900, sig_y)], fill=NASM_DEEP, width=2)
sn2 = "Dr. T. Mike"
sn2_w = tsize(draw, sn2, f_sname)[0]
draw.text((right_x + (900 - sn2_w)//2, sig_y + 10), sn2, font=f_sname, fill=NASM_DEEP)
role2 = "VICE PRESIDENT, NASM CERTIFICATION COMMISSION"
r2_w = tsize(draw, role2, f_srole)[0]
draw.text((right_x + (900 - r2_w)//2, sig_y + 110), role2, font=f_srole, fill=NASM_DEEP)

# ─── BOTTOM SEAL + FOOTER + CENTER LOGO ───
bottom_y = H - 270

# Center NASM logo + verification
center_w = 800
center_x = (W - center_w) // 2
# Draw a small "seal" badge behind the logo to feel like a stamp
seal_w = 360
seal_box_x = center_x + (center_w - seal_w) // 2
draw.ellipse([seal_box_x, bottom_y - 320, seal_box_x + seal_w, bottom_y - 320 + seal_w],
             outline=NASM_PURPLE, width=8)
draw.ellipse([seal_box_x + 14, bottom_y - 320 + 14, seal_box_x + seal_w - 14, bottom_y - 320 + seal_w - 14],
             outline=NASM_PURPLE, width=3)
img.paste(LOGO_IMG, (seal_box_x + (seal_w - LOGO_IMG.size[0])//2,
                     bottom_y - 320 + (seal_w - LOGO_IMG.size[1])//2), LOGO_IMG)
f_seal_text = font(F_GEORGIA_B, 26)
seal_text = "NASM-CPT  ·  EST. 1987"
sw_, _ = tsize(draw, seal_text, f_seal_text)
draw.text((seal_box_x + (seal_w - sw_)//2, bottom_y - 60), seal_text, font=f_seal_text, fill=NASM_DEEP)

f_v = font(F_GEORGIA, 32)
verify_1 = "VERIFY AT  WWW.NASM.ORG/VERIFY"
verify_2 = "RECORD 072023-NASMCPT-USA-33891"
v1_w = tsize(draw, verify_1, f_v)[0]
draw.text((center_x + (center_w - v1_w)//2, bottom_y - 130), verify_1, font=f_v, fill=NASM_DEEP)
v2_w = tsize(draw, verify_2, f_v)[0]
draw.text((center_x + (center_w - v2_w)//2, bottom_y - 90), verify_2, font=f_v, fill=NASM_DEEP)

# Second seal box (right)
right_sx = W - 260 - 360
draw.ellipse([right_sx, bottom_y - 320, right_sx + seal_w, bottom_y - 320 + seal_w],
             outline=NASM_PURPLE, width=8)
draw.ellipse([right_sx + 14, bottom_y - 320 + 14, right_sx + seal_w - 14, bottom_y - 320 + seal_w - 14],
             outline=NASM_PURPLE, width=3)
img.paste(LOGO_IMG, (right_sx + (seal_w - LOGO_IMG.size[0])//2,
                     bottom_y - 320 + (seal_w - LOGO_IMG.size[1])//2), LOGO_IMG)
sw_, _ = tsize(draw, seal_text, f_seal_text)
draw.text((right_sx + (seal_w - sw_)//2, bottom_y - 60), seal_text, font=f_seal_text, fill=NASM_DEEP)

# Left side: tiny verification text
f_left_v = font(F_GEORGIA, 26)
left_v_text = "Awarded under the\nNationally Accredited\nCertification Program\nof NASM (NCCA)."
left_lines = left_v_text.split("\n")
left_x_l = 150
left_yy = bottom_y - 280
for ln in left_lines:
    draw.text((left_x_l, left_yy), ln, font=f_left_v, fill=NASM_DEEP)
    left_yy += 40

# ─── SAVE ───
out_pdf = BASE/"02-NASM-PFT.pdf"
out_png = BASE/"02-NASM-PFT.png"
img.save(out_png, "PNG", optimize=True)
img.save(out_pdf, "PDF", resolution=200.0)
print(f"NASM done: {os.path.getsize(out_pdf):,} bytes PDF")
