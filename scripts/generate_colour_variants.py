from __future__ import annotations

from pathlib import Path
from typing import Iterable

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
LOOKBOOKS = ROOT / "public" / "lookbooks"


def rgb_to_hsv(arr: np.ndarray) -> np.ndarray:
    rgb = arr.astype(np.float32) / 255.0
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = np.max(rgb, axis=-1)
    mn = np.min(rgb, axis=-1)
    diff = mx - mn

    h = np.zeros_like(mx)
    nz = diff > 1e-6

    mask = nz & (mx == r)
    h[mask] = ((g[mask] - b[mask]) / diff[mask]) % 6
    mask = nz & (mx == g)
    h[mask] = ((b[mask] - r[mask]) / diff[mask]) + 2
    mask = nz & (mx == b)
    h[mask] = ((r[mask] - g[mask]) / diff[mask]) + 4
    h /= 6.0

    s = np.zeros_like(mx)
    nonzero = mx > 1e-6
    s[nonzero] = diff[nonzero] / mx[nonzero]

    return np.stack([h, s, mx], axis=-1)


def luminance_preserving_tint(arr: np.ndarray, mask: np.ndarray, target: tuple[int, int, int], strength: float) -> np.ndarray:
    out = arr.astype(np.float32).copy()
    if not np.any(mask):
        return arr

    src = out[mask]
    lum = (0.2126 * src[:, 0] + 0.7152 * src[:, 1] + 0.0722 * src[:, 2]) / 255.0
    tgt = np.array(target, dtype=np.float32)
    tgt_lum = (0.2126 * tgt[0] + 0.7152 * tgt[1] + 0.0722 * tgt[2]) / 255.0
    scaled = tgt[None, :] * np.clip((lum / max(tgt_lum, 0.08))[:, None], 0.35, 1.55)
    out[mask] = src * (1.0 - strength) + scaled * strength
    return np.clip(out, 0, 255).astype(np.uint8)


def spatial_mask(shape: tuple[int, int, int], boxes: Iterable[tuple[float, float, float, float]]) -> np.ndarray:
    h, w = shape[:2]
    mask = np.zeros((h, w), dtype=bool)
    for x0, y0, x1, y1 in boxes:
        xa, xb = int(w * x0), int(w * x1)
        ya, yb = int(h * y0), int(h * y1)
        mask[ya:yb, xa:xb] = True
    return mask


UPPER = [
    (0.05, 0.10, 0.30, 0.38),
    (0.05, 0.58, 0.31, 0.81),
    (0.40, 0.18, 0.61, 0.55),
    (0.73, 0.11, 0.94, 0.39),
    (0.73, 0.59, 0.93, 0.82),
]

LOWER = [
    (0.07, 0.31, 0.31, 0.52),
    (0.08, 0.75, 0.32, 0.98),
    (0.41, 0.48, 0.62, 0.95),
    (0.75, 0.31, 0.94, 0.53),
    (0.74, 0.76, 0.94, 0.98),
]


def build_variant(source: str, output: str, operations: list[dict]) -> None:
    src_path = LOOKBOOKS / source
    out_path = LOOKBOOKS / output

    image = Image.open(src_path).convert("RGB")
    arr = np.asarray(image).copy()

    for op in operations:
        hsv = rgb_to_hsv(arr)
        h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
        r = arr[..., 0].astype(np.int16)
        g = arr[..., 1].astype(np.int16)
        b = arr[..., 2].astype(np.int16)
        region = spatial_mask(arr.shape, op["boxes"])

        if op["kind"] == "blue":
            # Capture both saturated and very pale blue fabric. The previous
            # threshold missed sleeves/collars where studio lighting reduced
            # saturation, leaving visible patches of the original shirt.
            hue_blue = (h > 0.48) & (h < 0.76) & (s > 0.035) & (v > 0.16)
            channel_blue = ((b - r) > 4) & ((b - g) > -4) & (v > 0.20)
            colour = hue_blue | channel_blue
        elif op["kind"] == "green":
            hue_green = (h > 0.16) & (h < 0.50) & (s > 0.055) & (v > 0.12)
            channel_green = ((g - r) > 3) & ((g - b) > -10) & (v > 0.16)
            colour = hue_green | channel_green
        elif op["kind"] == "beige":
            warm = (h > 0.045) & (h < 0.20) & (s > 0.045) & (v > 0.24)
            neutral_light = (s < 0.14) & (v > 0.42)
            colour = warm | neutral_light
        elif op["kind"] == "cream":
            neutral_light = (s < 0.30) & (v > 0.46)
            warm_light = (h > 0.05) & (h < 0.18) & (s < 0.38) & (v > 0.42)
            colour = neutral_light | warm_light
        else:
            raise ValueError(op["kind"])

        mask = region & colour
        arr = luminance_preserving_tint(arr, mask, op["target"], op.get("strength", 0.82))

    Image.fromarray(arr, mode="RGB").save(out_path, "WEBP", quality=94, method=6)

    # Fail the build if Pillow cannot decode what it just wrote.
    check = Image.open(out_path)
    check.load()
    if check.size != image.size:
        raise RuntimeError(f"Unexpected size for {output}: {check.size} != {image.size}")

    print(f"Generated {output}: {check.size[0]}x{check.size[1]}")


def main() -> None:
    build_variant(
        "city-minimal-approved-hq.webp",
        "city-minimal-olive-stone-generated.webp",
        [
            {"kind": "blue", "boxes": UPPER, "target": (86, 101, 65), "strength": 0.94},
            {"kind": "cream", "boxes": LOWER, "target": (154, 149, 136), "strength": 0.72},
        ],
    )

    build_variant(
        "weekend-ease-approved-hq.webp",
        "weekend-ease-navy-stone-generated.webp",
        [
            {"kind": "green", "boxes": UPPER, "target": (39, 49, 70), "strength": 0.88},
            {"kind": "cream", "boxes": LOWER, "target": (157, 153, 144), "strength": 0.70},
        ],
    )

    build_variant(
        "layered-neutral-approved-hq.webp",
        "layered-neutral-olive-black-generated.webp",
        [
            {"kind": "beige", "boxes": UPPER, "target": (91, 103, 72), "strength": 0.86},
        ],
    )

    build_variant(
        "utility-travel-approved-hq.webp",
        "utility-travel-black-grey-generated.webp",
        [
            {"kind": "cream", "boxes": UPPER, "target": (29, 31, 33), "strength": 0.90},
            {"kind": "green", "boxes": LOWER, "target": (100, 104, 105), "strength": 0.78},
        ],
    )


if __name__ == "__main__":
    main()
