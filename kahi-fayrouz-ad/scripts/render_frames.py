#!/usr/bin/env python3
"""Cinematic frame renderer for كاهي فيروز ad — 1080x1920."""
from __future__ import annotations

import math
import random
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

from config import COLORS, FPS, FRAMES, GRAPHICS, HEIGHT, TOTAL_FRAMES, WIDTH


def ease_out_cubic(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 3


def ease_in_out(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return 3 * t * t - 2 * t * t * t


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def lerp_color(c1, c2, t: float):
    t = max(0.0, min(1.0, t))
    return tuple(int(lerp(c1[i], c2[i], t)) for i in range(3))


def clamp01(t: float) -> float:
    return max(0.0, min(1.0, t))


@lru_cache(maxsize=64)
def load_text(key: str) -> Image.Image:
    return Image.open(GRAPHICS / "text" / f"text_{key}.png").convert("RGBA")


def paste_text(base: Image.Image, key: str, y: float, alpha: float = 1.0, y_offset: float = 0.0, scale: float = 1.0):
    if alpha <= 0.01:
        return
    txt = load_text(key)
    if scale != 1.0:
        tw, th = txt.size
        txt = txt.resize((max(1, int(tw * scale)), max(1, int(th * scale))), Image.Resampling.LANCZOS)
    if alpha < 0.999:
        a = txt.split()[-1].point(lambda p: int(p * alpha))
        txt = txt.copy()
        txt.putalpha(a)
    x = (WIDTH - txt.size[0]) // 2
    yy = int(y + y_offset)
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    layer.paste(txt, (x, yy), txt)
    base.alpha_composite(layer)


def vertical_gradient(img: Image.Image, top, bottom) -> None:
    draw = ImageDraw.Draw(img)
    for y in range(HEIGHT):
        c = lerp_color(top, bottom, y / (HEIGHT - 1))
        draw.line([(0, y), (WIDTH, y)], fill=c)


def radial_glow(img: Image.Image, cx: float, cy: float, radius: float, color, strength: float = 0.55):
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    steps = 32
    for i in range(steps, 0, -1):
        r = radius * (i / steps)
        a = int(255 * strength * ((i / steps) ** 2) * 0.32)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*color, a))
    img.alpha_composite(overlay)


def soft_rect(draw, xy, radius, fill):
    draw.rounded_rectangle(xy, radius=radius, fill=fill)


def draw_kahi_plate(base: Image.Image, cx, cy, scale=1.0, steam_phase=0.0, show_geymar=True, show_honey=True):
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    s = scale

    # soft table shadow
    d.ellipse([cx - 260 * s, cy + 70 * s, cx + 260 * s, cy + 130 * s], fill=(0, 0, 0, 70))

    # ceramic plate with rim
    prx, pry = 250 * s, 100 * s
    d.ellipse([cx - prx, cy - pry + 18 * s, cx + prx, cy + pry + 18 * s], fill=(210, 205, 195, 255))
    d.ellipse([cx - prx + 14 * s, cy - pry + 28 * s, cx + prx - 14 * s, cy + pry + 6 * s], fill=(248, 245, 238, 255))
    d.ellipse([cx - prx + 34 * s, cy - pry + 42 * s, cx + prx - 34 * s, cy + pry - 8 * s], fill=(255, 252, 246, 255))

    # flaky kahi layers with richer shading
    layers_spec = [
        (-55, 8, 210, 78, (120, 70, 28), (168, 105, 48)),
        (-20, -8, 230, 86, (150, 90, 35), (205, 140, 70)),
        (25, 4, 200, 74, (175, 110, 45), (225, 165, 90)),
        (-5, -22, 185, 68, (190, 125, 55), (235, 185, 110)),
        (40, -12, 160, 58, (160, 95, 40), (215, 155, 85)),
    ]
    for ox, oy, w, h, dark, light in layers_spec:
        box = [cx + ox * s - w * s / 2, cy + oy * s - h * s / 2, cx + ox * s + w * s / 2, cy + oy * s + h * s / 2]
        d.ellipse(box, fill=(*dark, 255))
        inset = [box[0] + 10 * s, box[1] + 6 * s, box[2] - 8 * s, box[3] - 14 * s]
        d.ellipse(inset, fill=(*light, 255))
        # flake lines
        for k in range(4):
            yy = cy + oy * s - h * s / 3 + k * (h * s / 5)
            d.arc([box[0] + 20 * s, yy - 8 * s, box[2] - 20 * s, yy + 18 * s], 200, 340, fill=(255, 220, 160, 110), width=2)

    if show_geymar:
        # thick geymar mound
        d.ellipse([cx + 20 * s, cy - 48 * s, cx + 175 * s, cy + 42 * s], fill=(255, 250, 240, 255))
        d.ellipse([cx + 40 * s, cy - 62 * s, cx + 155 * s, cy + 8 * s], fill=(255, 255, 252, 240))
        d.ellipse([cx + 70 * s, cy - 55 * s, cx + 115 * s, cy - 20 * s], fill=(255, 255, 255, 200))
        d.ellipse([cx + 30 * s, cy + 18 * s, cx + 165 * s, cy + 48 * s], fill=(210, 190, 160, 55))

    if show_honey:
        pts = []
        for i in range(22):
            t = i / 21
            x = cx - 55 * s + t * 150 * s
            y = cy - 58 * s + math.sin(t * math.pi * 2.4) * 16 * s + t * 62 * s
            pts.append((x, y))
        d.line(pts, fill=(212, 150, 20, 230), width=max(5, int(8 * s)))
        d.ellipse([cx + 60 * s, cy + 10 * s, cx + 98 * s, cy + 42 * s], fill=(232, 180, 40, 210))
        d.ellipse([cx - 10 * s, cy - 20 * s, cx + 18 * s, cy + 4 * s], fill=(232, 180, 40, 180))

    # pistachio flecks
    rng = random.Random(11)
    for _ in range(14):
        x = cx + rng.uniform(-90, 120) * s
        y = cy + rng.uniform(-30, 35) * s
        r = rng.uniform(2.5, 5) * s
        d.ellipse([x - r, y - r / 2, x + r, y + r / 2], fill=(90, 140, 60, 200))

    # crumbs
    for _ in range(22):
        x = cx + rng.uniform(-220, 220) * s
        y = cy + rng.uniform(55, 105) * s
        r = rng.uniform(2, 6) * s
        d.ellipse([x - r, y - r, x + r, y + r], fill=(170, 110, 55, 170))

    # steam
    for i in range(6):
        phase = steam_phase * 2.3 + i * 0.85
        sx = cx - 50 * s + i * 30 * s
        for j in range(12):
            yy = cy - 80 * s - j * 15 * s - (steam_phase * 42) % 55
            xx = sx + math.sin(phase + j * 0.45) * (10 + j * 1.1)
            a = int(max(0, 120 - j * 9))
            rr = (7 + j * 0.9) * s
            d.ellipse([xx - rr, yy - rr, xx + rr, yy + rr], fill=(245, 250, 250, a))

    # light catch on plate rim
    d.arc([cx - prx + 20 * s, cy - pry + 24 * s, cx + prx - 20 * s, cy + 10 * s], 200, 340, fill=(255, 255, 255, 70), width=3)

    base.alpha_composite(layer)


def draw_tea_glass(base: Image.Image, cx, cy, scale=1.0, steam_phase=0.0):
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    s = scale
    top_w, bot_w, h = 78 * s, 52 * s, 180 * s

    # shadow
    d.ellipse([cx - 100 * s, cy + h / 2 + 4 * s, cx + 100 * s, cy + h / 2 + 40 * s], fill=(0, 0, 0, 60))

    # glass
    d.polygon(
        [(cx - top_w, cy - h / 2), (cx + top_w, cy - h / 2), (cx + bot_w, cy + h / 2), (cx - bot_w, cy + h / 2)],
        fill=(220, 235, 235, 55),
    )
    # tea
    d.polygon(
        [
            (cx - top_w + 10 * s, cy - h / 2 + 28 * s),
            (cx + top_w - 10 * s, cy - h / 2 + 28 * s),
            (cx + bot_w - 6 * s, cy + h / 2 - 10 * s),
            (cx - bot_w + 6 * s, cy + h / 2 - 10 * s),
        ],
        fill=(150, 58, 18, 235),
    )
    # tea surface highlight
    d.ellipse([cx - top_w + 18 * s, cy - h / 2 + 20 * s, cx + top_w - 18 * s, cy - h / 2 + 48 * s], fill=(190, 90, 30, 120))
    # glass rim
    d.ellipse([cx - top_w - 2 * s, cy - h / 2 - 8 * s, cx + top_w + 2 * s, cy - h / 2 + 14 * s], outline=(230, 240, 240, 160), width=3)
    # highlight streak
    d.line([(cx - top_w + 22 * s, cy - h / 2 + 24 * s), (cx - bot_w + 16 * s, cy + h / 2 - 24 * s)], fill=(255, 255, 255, 100), width=4)
    # saucer
    d.ellipse([cx - 105 * s, cy + h / 2 - 8 * s, cx + 105 * s, cy + h / 2 + 34 * s], fill=(240, 235, 225, 235))
    d.ellipse([cx - 70 * s, cy + h / 2 - 2 * s, cx + 70 * s, cy + h / 2 + 18 * s], fill=(250, 246, 238, 200))

    for i in range(5):
        phase = steam_phase * 2.6 + i
        for j in range(10):
            xx = cx - 24 * s + i * 14 * s + math.sin(phase + j * 0.5) * 7
            yy = cy - h / 2 - 8 * s - j * 13 * s - (steam_phase * 32) % 45
            a = max(0, 110 - j * 11)
            r = 6 + j * 0.8
            d.ellipse([xx - r, yy - r, xx + r, yy + r], fill=(240, 245, 245, a))
    base.alpha_composite(layer)


def draw_flour_burst(base: Image.Image, cx, cy, phase: float, count=55):
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    rng = random.Random(99)
    for i in range(count):
        ang = rng.random() * math.pi * 2
        dist = (0.15 + 0.85 * ((phase + rng.random() * 0.3) % 1.0)) * 300
        x = cx + math.cos(ang) * dist
        y = cy + math.sin(ang) * dist * 0.72
        r = rng.uniform(2, 8)
        a = int(190 * max(0, 1 - dist / 340))
        d.ellipse([x - r, y - r, x + r, y + r], fill=(250, 245, 235, max(0, a)))
    base.alpha_composite(layer)


def draw_baghdad_skyline(base: Image.Image, y_base: float, alpha: int = 160):
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    buildings = [
        (30, 240, 95), (140, 170, 75), (230, 300, 115), (360, 200, 85),
        (460, 340, 105), (580, 220, 80), (680, 280, 100), (800, 190, 75),
        (900, 320, 125), (1010, 210, 70),
    ]
    for x, h, w in buildings:
        d.rectangle([x, y_base - h, x + w, y_base + 50], fill=(8, 16, 22, alpha))
        for wy in range(int(y_base - h + 18), int(y_base - 18), 26):
            for wx in range(int(x + 10), int(x + w - 10), 16):
                if (wx * 3 + wy) % 7 != 0:
                    d.rectangle([wx, wy, wx + 5, wy + 7], fill=(255, 195, 110, 85))
    # abstract dome
    d.ellipse([485, y_base - 390, 620, y_base - 240], fill=(8, 16, 22, alpha))
    d.rectangle([532, y_base - 260, 572, y_base - 40], fill=(8, 16, 22, alpha))
    d.polygon([(552, y_base - 430), (540, y_base - 360), (564, y_base - 360)], fill=(8, 16, 22, alpha))
    base.alpha_composite(layer)


def draw_logo_mark(base: Image.Image, cx, cy, scale=1.0):
    """Temporary original mark — NOT the official restaurant logo."""
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    s = scale
    r = 120 * s
    # outer disc
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*COLORS["fayrouz"], 255))
    d.ellipse([cx - r + 8 * s, cy - r + 8 * s, cx + r - 8 * s, cy + r - 8 * s], outline=(*COLORS["cream"], 255), width=max(3, int(5 * s)))
    # pastry leaf / crescent forms (unique, not concentric ripples)
    d.pieslice([cx - 70 * s, cy - 40 * s, cx + 40 * s, cy + 70 * s], 200, 340, fill=(*COLORS["honey"], 255))
    d.pieslice([cx - 35 * s, cy - 55 * s, cx + 75 * s, cy + 55 * s], 220, 20, fill=(*COLORS["pastry"], 255))
    d.ellipse([cx - 18 * s, cy - 18 * s, cx + 34 * s, cy + 34 * s], fill=(*COLORS["cream"], 255))
    # tiny gem
    d.ellipse([cx + 8 * s, cy - 8 * s, cx + 28 * s, cy + 12 * s], fill=(*COLORS["fayrouz_bright"], 255))
    base.alpha_composite(layer)


def draw_dish_card(base: Image.Image, cx, cy, text_key: str, phase: float):
    appear = ease_out_cubic(clamp01(phase))
    if appear <= 0:
        return
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    yoff = (1 - appear) * 36
    w, h = 460, 118
    x0, y0 = cx - w / 2, cy - h / 2 + yoff
    soft_rect(d, [x0, y0, x0 + w, y0 + h], 28, (12, 28, 32, int(175 * appear)))
    soft_rect(d, [x0 + 2, y0 + 2, x0 + w - 2, y0 + h - 2], 26, (16, 58, 60, int(210 * appear)))
    d.rounded_rectangle([x0 + 22, y0 + 28, x0 + 30, y0 + h - 28], radius=4, fill=(*COLORS["honey"], int(255 * appear)))
    base.alpha_composite(layer)
    paste_text(base, text_key, y0 + 8, alpha=appear, scale=0.95)


def scene_at(t: float) -> str:
    if t < 3:
        return "dawn"
    if t < 6:
        return "tea"
    if t < 10:
        return "dough"
    if t < 15:
        return "dishes"
    if t < 20:
        return "hero"
    if t < 23:
        return "brand"
    return "cta"


def render_frame(frame_idx: int) -> Image.Image:
    t = frame_idx / FPS
    img = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 255))
    scene = scene_at(t)

    if scene == "dawn":
        local = t / 3.0
        top = lerp_color(COLORS["night"], COLORS["dawn_deep"], ease_in_out(local))
        bottom = lerp_color((18, 28, 36), (242, 168, 64), ease_in_out(local))
        vertical_gradient(img, top, bottom)
        glow_y = lerp(1420, 1120, ease_in_out(local))
        radial_glow(img, WIDTH / 2, glow_y, 560, COLORS["gold"], 0.28 + 0.42 * local)
        radial_glow(img, WIDTH / 2, glow_y - 90, 300, COLORS["fayrouz_bright"], 0.22 * local)
        draw_baghdad_skyline(img, 1520 - 50 * local, alpha=int(210 - 50 * local))
        leak = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
        ImageDraw.Draw(leak).polygon([(0, 0), (240, 0), (90, HEIGHT), (0, HEIGHT)], fill=(255, 170, 70, int(28 + 38 * local)))
        img.alpha_composite(leak)
        a = ease_out_cubic(clamp01((t - 0.4) / 0.7))
        paste_text(img, "hook", 400, alpha=a, y_offset=(1 - a) * 28)

    elif scene == "tea":
        local = (t - 3) / 3.0
        vertical_gradient(img, (16, 46, 50), (42, 26, 16))
        radial_glow(img, WIDTH / 2, 920, 500, COLORS["fayrouz"], 0.38)
        radial_glow(img, WIDTH / 2, 720, 280, COLORS["gold"], 0.22)
        push = 1.15 + 0.2 * ease_in_out(local)
        draw_tea_glass(img, WIDTH / 2, 1000, scale=push, steam_phase=t)
        a = ease_out_cubic(clamp01((local - 0.08) / 0.5))
        paste_text(img, "start_right", 340, alpha=a, y_offset=(1 - a) * 22)

    elif scene == "dough":
        local = (t - 6) / 4.0
        vertical_gradient(img, (28, 20, 14), (72, 42, 20))
        radial_glow(img, WIDTH / 2, 1020, 520, COLORS["pastry"], 0.4)
        draw_flour_burst(img, WIDTH / 2, 980, (local * 1.35) % 1.0)
        scale = 0.9 + 0.28 * ease_out_cubic(clamp01((local - 0.2) / 0.55))
        draw_kahi_plate(img, WIDTH / 2, 1060, scale=scale, steam_phase=t, show_geymar=local > 0.5, show_honey=local > 0.68)
        a = ease_out_cubic(clamp01((local - 0.04) / 0.4))
        paste_text(img, "dough", 320, alpha=a, y_offset=(1 - a) * 18)
        if local > 0.88:
            blur = img.filter(ImageFilter.GaussianBlur(radius=1.1))
            img = Image.blend(img, blur, 0.28)

    elif scene == "dishes":
        local = (t - 10) / 5.0
        vertical_gradient(img, (10, 38, 42), (20, 26, 28))
        radial_glow(img, WIDTH / 2, 720, 440, COLORS["fayrouz_bright"], 0.28)
        paste_text(img, "mornings", 250, alpha=ease_out_cubic(clamp01(local / 0.35)))
        cards = [
            (10.25, "dish_kahi", 480),
            (11.35, "dish_geymar", 640),
            (12.45, "dish_tea", 800),
            (13.55, "dish_honey", 960),
        ]
        for start, key, y in cards:
            draw_dish_card(img, WIDTH / 2, y, key, (t - start) / 0.5)
        if t > 10.5:
            draw_kahi_plate(img, WIDTH / 2, 1400, scale=0.78, steam_phase=t * 0.85, show_geymar=True, show_honey=True)

    elif scene == "hero":
        local = (t - 15) / 5.0
        vertical_gradient(img, (14, 32, 36), (50, 28, 14))
        scale = 1.08 + 0.32 * ease_in_out(local)
        cy = 1020 - 50 * ease_in_out(local)
        radial_glow(img, WIDTH / 2, cy, 580, COLORS["gold"], 0.45)
        radial_glow(img, WIDTH / 2 - 30, cy - 130, 280, COLORS["fayrouz_bright"], 0.28)
        draw_kahi_plate(img, WIDTH / 2, cy, scale=scale, steam_phase=t, show_geymar=True, show_honey=True)
        layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        rng = random.Random(7)
        for i in range(36):
            px = (rng.random() * WIDTH + t * 35 * (0.5 - rng.random())) % WIDTH
            py = (900 + rng.random() * 500 + math.sin(t * 2 + i) * 18) % HEIGHT
            r = rng.uniform(1.5, 4.5)
            d.ellipse([px - r, py - r, px + r, py + r], fill=(255, 230, 170, 110))
        img.alpha_composite(layer)
        a = ease_out_cubic(clamp01((local - 0.04) / 0.45))
        paste_text(img, "taste", 300, alpha=a, y_offset=(1 - a) * 18)

    elif scene == "brand":
        local = (t - 20) / 3.0
        vertical_gradient(img, (8, 34, 38), (12, 58, 56))
        radial_glow(img, WIDTH / 2, 780, 440, COLORS["fayrouz_bright"], 0.48)
        s = 0.72 + 0.38 * ease_out_cubic(clamp01(local / 0.55))
        draw_logo_mark(img, WIDTH / 2, 760, scale=s)
        a = ease_out_cubic(clamp01((local - 0.22) / 0.45))
        paste_text(img, "brand", 1000, alpha=a, y_offset=(1 - a) * 20)
        note = ease_out_cubic(clamp01((local - 0.42) / 0.4))
        paste_text(img, "brand_note", 1165, alpha=note)

    else:
        local = (t - 23) / 3.0
        vertical_gradient(img, (10, 54, 55), (16, 36, 40))
        radial_glow(img, WIDTH / 2, 880, 520, COLORS["fayrouz"], 0.42)
        radial_glow(img, WIDTH / 2, 680, 260, COLORS["gold"], 0.18)
        draw_logo_mark(img, WIDTH / 2, 560, scale=0.88)
        a1 = ease_out_cubic(clamp01(local / 0.22))
        a2 = ease_out_cubic(clamp01((local - 0.12) / 0.25))
        a3 = ease_out_cubic(clamp01((local - 0.22) / 0.28))
        paste_text(img, "brand", 760, alpha=a1)
        paste_text(img, "tagline", 920, alpha=a2)
        paste_text(img, "location", 1080, alpha=a3)
        paste_text(img, "delivery", 1180, alpha=a3)
        if local > 0.85:
            fade = Image.new("RGBA", (WIDTH, HEIGHT), (8, 22, 28, int(170 * ((local - 0.85) / 0.15))))
            img.alpha_composite(fade)

    # film grain
    grain = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grain)
    rng = random.Random(frame_idx * 997)
    for _ in range(700):
        x = rng.randint(0, WIDTH - 1)
        y = rng.randint(0, HEIGHT - 1)
        v = rng.randint(190, 255)
        gd.point((x, y), fill=(v, v, v, 16))
    img.alpha_composite(grain)

    # gentle vignette
    vig = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    vd = ImageDraw.Draw(vig)
    for i, a in enumerate((50, 30, 14)):
        m = 40 + i * 35
        vd.rectangle([0, 0, WIDTH, m], fill=(0, 0, 0, a))
        vd.rectangle([0, HEIGHT - m, WIDTH, HEIGHT], fill=(0, 0, 0, a))
    img.alpha_composite(vig)

    return img.convert("RGB")


def _render_one(args):
    idx, out_dir = args
    out = Path(out_dir) / f"frame_{idx:05d}.jpg"
    if out.exists():
        return idx
    render_frame(idx).save(out, quality=93, optimize=True)
    return idx


def main() -> None:
    FRAMES.mkdir(parents=True, exist_ok=True)
    existing = list(FRAMES.glob("frame_*.jpg"))
    if existing:
        for p in existing:
            p.unlink()

    print(f"Rendering {TOTAL_FRAMES} frames @ {WIDTH}x{HEIGHT} {FPS}fps...")
    jobs = [(i, str(FRAMES)) for i in range(TOTAL_FRAMES)]
    done = 0
    with ThreadPoolExecutor(max_workers=6) as ex:
        futures = [ex.submit(_render_one, job) for job in jobs]
        for fut in as_completed(futures):
            fut.result()
            done += 1
            if done % 30 == 0 or done == TOTAL_FRAMES:
                print(f"  {done}/{TOTAL_FRAMES}")
    print("Frames done.")


if __name__ == "__main__":
    main()
