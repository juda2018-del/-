#!/usr/bin/env python3
"""Pre-render Arabic text overlays with FFmpeg HarfBuzz shaping."""
from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

from PIL import Image

from config import GRAPHICS

FONT = "/usr/share/fonts/truetype/noto/NotoSansArabic-Bold.ttf"

TEXTS = {
    "hook": {"text": "بعدك ما بديت يومك؟", "size": 64, "color": "white", "rgb": (255, 248, 231), "w": 1000, "h": 160},
    "start_right": {"text": "خلي البداية صح", "size": 62, "color": "white", "rgb": (255, 248, 231), "w": 1000, "h": 150},
    "dough": {"text": "من العجينة للطعم", "size": 58, "color": "white", "rgb": (255, 248, 231), "w": 1000, "h": 150},
    "mornings": {"text": "أشهى صباحات بغداد", "size": 42, "color": "white", "rgb": (232, 186, 74), "w": 900, "h": 120},
    "taste": {"text": "طعم الصبح ببغداد", "size": 60, "color": "white", "rgb": (255, 248, 231), "w": 1000, "h": 150},
    "brand": {"text": "كاهي فيروز", "size": 78, "color": "white", "rgb": (255, 248, 231), "w": 1000, "h": 170},
    "brand_note": {"text": "علامة مؤقتة · ليست الشعار الرسمي", "size": 26, "color": "white", "rgb": (200, 212, 210), "w": 980, "h": 80},
    "tagline": {"text": "صباحك أحلى من هنا", "size": 52, "color": "white", "rgb": (232, 186, 74), "w": 1000, "h": 130},
    "location": {"text": "زيونة · بغداد", "size": 40, "color": "white", "rgb": (220, 230, 228), "w": 800, "h": 100},
    "delivery": {"text": "متوفر للتوصيل", "size": 36, "color": "white", "rgb": (36, 178, 170), "w": 800, "h": 100},
    "dish_kahi": {"text": "كاهي", "size": 46, "color": "white", "rgb": (255, 246, 232), "w": 360, "h": 100},
    "dish_geymar": {"text": "قيمر", "size": 46, "color": "white", "rgb": (255, 246, 232), "w": 360, "h": 100},
    "dish_tea": {"text": "شاي مهيل", "size": 46, "color": "white", "rgb": (255, 246, 232), "w": 420, "h": 100},
    "dish_honey": {"text": "عسل", "size": 46, "color": "white", "rgb": (255, 246, 232), "w": 360, "h": 100},
}


def luminance_to_colored_alpha(raw: Image.Image, rgb: tuple[int, int, int]) -> Image.Image:
    """White-on-black → colored RGBA with clean alpha."""
    gray = raw.convert("L")
    # slight threshold to kill noise
    alpha = gray.point(lambda p: 0 if p < 18 else min(255, int((p - 18) * 1.15)))
    out = Image.new("RGBA", raw.size)
    r, g, b = rgb
    colored = Image.new("RGBA", raw.size, (r, g, b, 255))
    out = Image.composite(colored, Image.new("RGBA", raw.size, (0, 0, 0, 0)), alpha)
    return out


def render_one(key: str, meta: dict, out_dir: Path) -> Path:
    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        txt = td / "t.txt"
        txt.write_text(meta["text"], encoding="utf-8")
        raw = td / "raw.png"
        vf = (
            f"drawtext=fontfile={FONT}:textfile={txt}:"
            f"fontsize={meta['size']}:fontcolor={meta['color']}:"
            f"x=(w-text_w)/2:y=(h-text_h)/2:text_shaping=1"
        )
        subprocess.run(
            [
                "ffmpeg", "-y",
                "-f", "lavfi",
                "-i", f"color=c=black:s={meta['w']}x{meta['h']}:d=0.04",
                "-vf", vf,
                "-frames:v", "1",
                "-update", "1",
                str(raw),
            ],
            check=True,
            capture_output=True,
        )
        out = out_dir / f"text_{key}.png"
        luminance_to_colored_alpha(Image.open(raw), meta["rgb"]).save(out)
        return out


def main() -> None:
    out_dir = GRAPHICS / "text"
    out_dir.mkdir(parents=True, exist_ok=True)
    for key, meta in TEXTS.items():
        path = render_one(key, meta, out_dir)
        print("text", key, "->", path)


if __name__ == "__main__":
    main()
