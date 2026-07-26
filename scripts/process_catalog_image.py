from __future__ import annotations

import argparse
import io
from pathlib import Path
from typing import Final

from PIL import Image, ImageChops, ImageOps

try:
    from pillow_heif import register_heif_opener

    register_heif_opener()
except ImportError:
    pass

CANVAS_SIZE: Final[int] = 1600
PADDING_RATIO: Final[float] = 0.08
BACKGROUND: Final[tuple[int, int, int, int]] = (247, 246, 241, 255)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Clean a wardrobe image and create a catalogue-ready WebP asset."
    )
    parser.add_argument("--input", required=True, type=Path, help="Original private image path")
    parser.add_argument("--output", required=True, type=Path, help="Approved WebP output path")
    parser.add_argument(
        "--remove-background",
        action="store_true",
        help="Use rembg to isolate the main clothing or shoe item",
    )
    parser.add_argument(
        "--transparent",
        action="store_true",
        help="Keep a transparent canvas rather than the default neutral background",
    )
    return parser.parse_args()


def remove_background(image: Image.Image) -> Image.Image:
    try:
        from rembg import remove
    except ImportError as exc:
        raise RuntimeError(
            "Background removal requires rembg. Install requirements-image.txt first."
        ) from exc

    source = io.BytesIO()
    image.save(source, format="PNG")
    result = remove(source.getvalue())
    return Image.open(io.BytesIO(result)).convert("RGBA")


def trim_empty_space(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    bbox = alpha.getbbox()

    if bbox:
        return rgba.crop(bbox)

    background = Image.new("RGBA", rgba.size, rgba.getpixel((0, 0)))
    difference = ImageChops.difference(rgba, background)
    bbox = difference.getbbox()
    return rgba.crop(bbox) if bbox else rgba


def fit_to_canvas(image: Image.Image, transparent: bool) -> Image.Image:
    padding = int(CANVAS_SIZE * PADDING_RATIO)
    available = CANVAS_SIZE - (padding * 2)

    item = ImageOps.contain(
        image,
        (available, available),
        method=Image.Resampling.LANCZOS,
    )

    background = (0, 0, 0, 0) if transparent else BACKGROUND
    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), background)
    x = (CANVAS_SIZE - item.width) // 2
    y = (CANVAS_SIZE - item.height) // 2
    canvas.alpha_composite(item, (x, y))
    return canvas


def process_image(
    input_path: Path,
    output_path: Path,
    should_remove_background: bool,
    transparent: bool,
) -> None:
    if not input_path.exists():
        raise FileNotFoundError(f"Input image not found: {input_path}")

    if output_path.suffix.lower() != ".webp":
        raise ValueError("Catalogue output must use the .webp extension")

    with Image.open(input_path) as source:
        image = ImageOps.exif_transpose(source).convert("RGBA")

    if should_remove_background:
        image = remove_background(image)

    image = trim_empty_space(image)
    image = fit_to_canvas(image, transparent=transparent)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(output_path, format="WEBP", quality=92, method=6)

    print(f"Created catalogue image: {output_path}")
    print(f"Dimensions: {image.width}x{image.height}")


def main() -> None:
    args = parse_args()
    process_image(
        input_path=args.input,
        output_path=args.output,
        should_remove_background=args.remove_background,
        transparent=args.transparent,
    )


if __name__ == "__main__":
    main()
