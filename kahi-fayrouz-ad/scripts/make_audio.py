#!/usr/bin/env python3
"""Generate royalty-free sound design + mix Iraqi VO for the ad."""
from __future__ import annotations

import math
import subprocess
import wave
from pathlib import Path

from config import AUDIO, DURATION_SEC, FPS, OUTPUT

SAMPLE_RATE = 44100


def run(cmd: list[str]) -> None:
    print("+", " ".join(cmd[:8]), "...")
    subprocess.run(cmd, check=True)


def write_wav(path: Path, samples: list[float]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        frames = bytearray()
        for s in samples:
            v = max(-1.0, min(1.0, s))
            frames += int(v * 32767).to_bytes(2, "little", signed=True)
        wf.writeframes(frames)


def tone(freq: float, t: float, amp: float = 0.2) -> float:
    return amp * math.sin(2 * math.pi * freq * t)


def envelope(t: float, attack: float, hold: float, release: float, start: float) -> float:
    local = t - start
    if local < 0 or local > attack + hold + release:
        return 0.0
    if local < attack:
        return local / max(attack, 1e-6)
    if local < attack + hold:
        return 1.0
    return max(0.0, 1.0 - (local - attack - hold) / max(release, 1e-6))


def noise(t: float, seed: float = 0.0) -> float:
    # deterministic pseudo-noise
    x = math.sin(t * 43758.5453 + seed) * 23421.631
    return (x - math.floor(x)) * 2 - 1


def build_bed(n: int) -> list[float]:
    out = [0.0] * n
    for i in range(n):
        t = i / SAMPLE_RATE
        # Warm cinematic pad (royalty-free synthesized)
        pad = (
            tone(110, t, 0.045)
            + tone(164.81, t, 0.03)
            + tone(220, t, 0.025)
            + tone(329.63, t, 0.018)
            + tone(392, t, 0.012)
        )
        # Soft filter motion
        pad *= 0.65 + 0.35 * math.sin(2 * math.pi * 0.07 * t)
        # Morning texture
        ambience = noise(t, 1.2) * 0.018 * (0.4 + 0.6 * math.sin(t * 0.5))
        # Soft pulse
        pulse = tone(55, t, 0.04) * (0.5 + 0.5 * math.sin(2 * math.pi * 1.25 * t))
        # Dawn swell first 4s
        dawn = envelope(t, 1.5, 2.0, 1.0, 0.0) * tone(174.61, t, 0.05)
        # Brand swell near end
        brand = envelope(t, 0.8, 2.2, 1.5, 20.0) * (
            tone(196, t, 0.04) + tone(246.94, t, 0.03) + tone(293.66, t, 0.02)
        )
        out[i] = pad + ambience + pulse * 0.35 + dawn + brand
    return out


def add_whoosh(buf: list[float], start: float, dur: float = 0.35, amp: float = 0.35) -> None:
    n = len(buf)
    for i in range(n):
        t = i / SAMPLE_RATE
        e = envelope(t, 0.04, dur * 0.25, dur * 0.7, start)
        if e <= 0:
            continue
        # band-limited noise sweep
        f = 400 + 2200 * ((t - start) / max(dur, 1e-6))
        buf[i] += e * amp * noise(t * f * 0.001, 3.3) * 0.55 + e * amp * tone(f, t, 0.08)


def add_impact(buf: list[float], start: float, amp: float = 0.4) -> None:
    n = len(buf)
    for i in range(n):
        t = i / SAMPLE_RATE
        e = envelope(t, 0.005, 0.04, 0.25, start)
        if e <= 0:
            continue
        buf[i] += e * amp * (
            tone(70, t, 0.7) + tone(140, t, 0.3) + noise(t, 9.1) * 0.25
        )


def add_sizzle(buf: list[float], start: float, dur: float = 2.2, amp: float = 0.12) -> None:
    n = len(buf)
    for i in range(n):
        t = i / SAMPLE_RATE
        e = envelope(t, 0.2, dur * 0.6, dur * 0.3, start)
        if e <= 0:
            continue
        buf[i] += e * amp * noise(t * 18.0, 7.7) * (0.5 + 0.5 * noise(t * 3.1, 2.2))


def add_pour(buf: list[float], start: float, dur: float = 1.1, amp: float = 0.16) -> None:
    n = len(buf)
    for i in range(n):
        t = i / SAMPLE_RATE
        e = envelope(t, 0.08, dur * 0.5, dur * 0.4, start)
        if e <= 0:
            continue
        bub = tone(620 + 80 * math.sin(t * 40), t, 0.2)
        buf[i] += e * amp * (bub + noise(t * 9.0, 4.4) * 0.35)


def add_birds(buf: list[float], start: float = 0.4, amp: float = 0.05) -> None:
    chirps = [0.6, 1.1, 1.7, 2.3]
    for c in chirps:
        for i in range(len(buf)):
            t = i / SAMPLE_RATE
            e = envelope(t, 0.01, 0.05, 0.08, start + c)
            if e <= 0:
                continue
            f = 1800 + 400 * math.sin((t - start - c) * 60)
            buf[i] += e * amp * tone(f, t, 1.0)


def make_sfx_bed() -> Path:
    n = int(SAMPLE_RATE * DURATION_SEC)
    buf = build_bed(n)
    add_birds(buf)
    add_whoosh(buf, 2.85, 0.4, 0.3)
    add_pour(buf, 3.2, 1.0, 0.14)
    add_whoosh(buf, 5.85, 0.35, 0.28)
    add_sizzle(buf, 6.4, 2.4, 0.11)
    add_impact(buf, 6.3, 0.28)
    add_whoosh(buf, 9.85, 0.3, 0.26)
    for t in (10.4, 11.5, 12.6, 13.7):
        add_impact(buf, t, 0.22)
    add_whoosh(buf, 14.85, 0.35, 0.3)
    add_impact(buf, 15.1, 0.35)
    add_sizzle(buf, 15.2, 1.5, 0.08)
    add_whoosh(buf, 19.85, 0.4, 0.28)
    add_impact(buf, 20.15, 0.32)
    add_whoosh(buf, 22.9, 0.35, 0.25)
    add_impact(buf, 23.15, 0.28)

    # soft fade out
    fade = int(0.6 * SAMPLE_RATE)
    for i in range(fade):
        buf[n - fade + i] *= 1.0 - i / fade

    path = AUDIO / "sfx_bed.wav"
    write_wav(path, buf)
    return path


def mix_final(sfx: Path) -> Path:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    mixed = AUDIO / "final_mix.wav"

    # Place VO clips on timeline (seconds)
    # vo_01 @ 0.35, vo_02 @ 3.35, vo_03 @ 15.4, vo_04 @ 23.2
    filter_complex = (
        "[1:a]adelay=350|350,volume=1.15[v1];"
        "[2:a]adelay=3350|3350,volume=1.1[v2];"
        "[3:a]adelay=15400|15400,volume=1.1[v3];"
        "[4:a]adelay=23200|23200,volume=1.2[v4];"
        "[0:a]volume=0.85[bed];"
        "[bed][v1][v2][v3][v4]amix=inputs=5:duration=first:dropout_transition=0,"
        f"afade=t=in:st=0:d=0.4,afade=t=out:st={DURATION_SEC-0.7}:d=0.7[aout]"
    )

    run(
        [
            "ffmpeg", "-y",
            "-i", str(sfx),
            "-i", str(AUDIO / "vo_01.mp3"),
            "-i", str(AUDIO / "vo_02.mp3"),
            "-i", str(AUDIO / "vo_03.mp3"),
            "-i", str(AUDIO / "vo_04.mp3"),
            "-filter_complex", filter_complex,
            "-map", "[aout]",
            "-ar", str(SAMPLE_RATE),
            "-ac", "2",
            str(mixed),
        ]
    )
    return mixed


def main() -> None:
    AUDIO.mkdir(parents=True, exist_ok=True)
    sfx = make_sfx_bed()
    mix = mix_final(sfx)
    print(f"Audio ready: {mix}")


if __name__ == "__main__":
    main()
