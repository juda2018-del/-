#!/usr/bin/env python3
"""Full pipeline: audio → frames → encode → preview stills."""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent


def run_py(name: str) -> None:
    env = os.environ.copy()
    env["PYTHONPATH"] = str(SCRIPTS)
    print(f"\n=== {name} ===")
    subprocess.run([sys.executable, str(SCRIPTS / name)], check=True, cwd=str(ROOT), env=env)


def main() -> None:
    run_py("make_text_assets.py")
    run_py("make_audio.py")
    run_py("render_frames.py")
    run_py("encode_video.py")
    run_py("make_preview.py")
    out = ROOT / "output" / "kahi-fayrouz-ad.mp4"
    print("\n✅ Final video:", out)
    print("Run from repo root: npm run video:render")


if __name__ == "__main__":
    main()
