#!/usr/bin/env python3
"""Export preview stills + storyboard contact sheet."""
from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
import arabic_reshaper
from bidi.algorithm import get_display

from config import FPS, FRAMES, OUTPUT, OUTPUT_MP4, PREVIEW, STORYBOARD, WIDTH, HEIGHT


def ar(text: str) -> str:
    return get_display(arabic_reshaper.reshape(text))


def main() -> None:
    PREVIEW.mkdir(parents=True, exist_ok=True)
    STORYBOARD.mkdir(parents=True, exist_ok=True)

    picks = [
        (int(0.8 * FPS), "01_dawn"),
        (int(4.2 * FPS), "02_tea"),
        (int(7.5 * FPS), "03_dough"),
        (int(12.0 * FPS), "04_dishes"),
        (int(17.0 * FPS), "05_hero"),
        (int(21.2 * FPS), "06_brand"),
        (int(24.2 * FPS), "07_cta"),
    ]

    thumbs = []
    for idx, name in picks:
        src = FRAMES / f"frame_{idx:05d}.jpg"
        if not src.exists():
            continue
        dest = PREVIEW / f"{name}.jpg"
        Image.open(src).save(dest, quality=92)
        thumbs.append((dest, name))

    # contact sheet
    if thumbs:
        tw, th = 270, 480
        sheet = Image.new("RGB", (tw * len(thumbs) + 20 * (len(thumbs) + 1), th + 80), (18, 28, 32))
        d = ImageDraw.Draw(sheet)
        try:
            f = ImageFont.truetype("/usr/share/fonts/truetype/noto/NotoKufiArabic-Bold.ttf", 22)
        except Exception:
            f = ImageFont.load_default()
        x = 20
        for path, name in thumbs:
            im = Image.open(path).resize((tw, th))
            sheet.paste(im, (x, 40))
            label = name.split("_", 1)[1]
            d.text((x + 10, 10), label, fill=(230, 230, 220), font=f)
            x += tw + 20
        sheet_path = STORYBOARD / "contact-sheet.jpg"
        sheet.save(sheet_path, quality=92)
        print("Contact sheet:", sheet_path)

    # also extract a midframe from final mp4 if present
    if OUTPUT_MP4.exists():
        subprocess.run(
            [
                "ffmpeg", "-y", "-ss", "17", "-i", str(OUTPUT_MP4),
                "-frames:v", "1", str(PREVIEW / "from_mp4_hero.jpg"),
            ],
            check=False,
            capture_output=True,
        )
    print("Preview stills:", PREVIEW)


if __name__ == "__main__":
    main()
