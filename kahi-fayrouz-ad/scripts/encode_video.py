#!/usr/bin/env python3
"""Encode frames + audio into final MP4."""
from __future__ import annotations

import subprocess
from pathlib import Path

from config import AUDIO, FPS, FRAMES, HEIGHT, OUTPUT, OUTPUT_MP4, TOTAL_FRAMES, WIDTH


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    audio = AUDIO / "final_mix.wav"
    if not audio.exists():
        raise SystemExit(f"Missing audio: {audio}")

    frames = sorted(FRAMES.glob("frame_*.jpg"))
    if len(frames) < TOTAL_FRAMES:
        raise SystemExit(f"Expected {TOTAL_FRAMES} frames, found {len(frames)}")

    cmd = [
        "ffmpeg", "-y",
        "-framerate", str(FPS),
        "-i", str(FRAMES / "frame_%05d.jpg"),
        "-i", str(audio),
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        "-movflags", "+faststart",
        "-vf", f"scale={WIDTH}:{HEIGHT}",
        str(OUTPUT_MP4),
    ]
    print("Encoding", OUTPUT_MP4)
    subprocess.run(cmd, check=True)

    # probe
    probe = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height,r_frame_rate,duration",
            "-show_entries", "format=duration,size",
            "-of", "json",
            str(OUTPUT_MP4),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    (OUTPUT / "probe.json").write_text(probe.stdout)
    print(probe.stdout)
    print("Done:", OUTPUT_MP4)


if __name__ == "__main__":
    main()
