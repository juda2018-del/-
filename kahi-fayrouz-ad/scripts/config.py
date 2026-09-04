#!/usr/bin/env python3
"""Config for كاهي فيروز motion ad."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
AUDIO = ASSETS / "audio"
GRAPHICS = ASSETS / "graphics"
FRAMES = ROOT / "frames"
OUTPUT = ROOT / "output"
PREVIEW = ROOT / "preview"
STORYBOARD = ROOT / "storyboard"

WIDTH = 1080
HEIGHT = 1920
FPS = 30
DURATION_SEC = 26.0
TOTAL_FRAMES = int(DURATION_SEC * FPS)

# Brand colors (فيروز + warm breakfast)
COLORS = {
    "night": (8, 22, 30),
    "dawn_deep": (14, 48, 58),
    "fayrouz": (14, 124, 123),
    "fayrouz_bright": (36, 178, 170),
    "gold": (212, 160, 23),
    "honey": (232, 186, 74),
    "cream": (255, 246, 232),
    "pastry": (196, 137, 74),
    "pastry_dark": (138, 78, 36),
    "geymar": (255, 250, 240),
    "steam": (230, 240, 240),
    "text": (255, 252, 245),
    "text_dim": (220, 230, 228),
    "ink": (18, 28, 32),
}

FONTS = {
    "display": "/usr/share/fonts/truetype/noto/NotoSansArabic-Bold.ttf",
    "display_reg": "/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf",
    "body": "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Bold.ttf",
    "body_reg": "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf",
}

# Scene timing (seconds)
SCENES = [
    {"id": 1, "start": 0.0, "end": 3.0, "name": "dawn"},
    {"id": 2, "start": 3.0, "end": 6.0, "name": "tea"},
    {"id": 3, "start": 6.0, "end": 10.0, "name": "dough"},
    {"id": 4, "start": 10.0, "end": 15.0, "name": "dishes"},
    {"id": 5, "start": 15.0, "end": 20.0, "name": "hero"},
    {"id": 6, "start": 20.0, "end": 23.0, "name": "brand"},
    {"id": 7, "start": 23.0, "end": 26.0, "name": "cta"},
]

OUTPUT_MP4 = OUTPUT / "kahi-fayrouz-ad.mp4"
