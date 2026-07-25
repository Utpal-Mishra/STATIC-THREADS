from __future__ import annotations

import json
from pathlib import Path
from typing import Any

CATALOG_PATH = Path("data/catalog.json")
REQUIRED_FIELDS = {
    "id",
    "name",
    "brand",
    "category",
    "subcategory",
    "size",
    "fit",
    "primaryColour",
    "secondaryColours",
    "pattern",
    "material",
    "seasons",
    "occasions",
    "image",
    "status",
    "wearCount",
}
VALID_STATUSES = {"available", "laundry", "repair", "stored"}


def fail(message: str) -> None:
    raise ValueError(message)


def validate_item(item: dict[str, Any], index: int) -> None:
    missing = REQUIRED_FIELDS.difference(item)
    if missing:
        fail(f"Item {index} is missing fields: {', '.join(sorted(missing))}")

    if not isinstance(item["id"], str) or not item["id"].strip():
        fail(f"Item {index} has an invalid id")

    if item["status"] not in VALID_STATUSES:
        fail(f"Item {item['id']} has invalid status: {item['status']}")

    if not isinstance(item["wearCount"], int) or item["wearCount"] < 0:
        fail(f"Item {item['id']} must have a non-negative integer wearCount")

    image = item["image"]
    if not isinstance(image, str) or not image.startswith("/catalog/") or not image.endswith(".webp"):
        fail(f"Item {item['id']} must reference a /catalog/*.webp image")

    image_path = Path("public") / image.lstrip("/")
    if not image_path.exists():
        fail(f"Item {item['id']} references a missing image: {image_path}")


def main() -> None:
    if not CATALOG_PATH.exists():
        fail(f"Catalogue not found: {CATALOG_PATH}")

    data = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    items = data.get("items")
    if not isinstance(items, list):
        fail("catalog.items must be a list")

    seen_ids: set[str] = set()
    for index, item in enumerate(items):
        if not isinstance(item, dict):
            fail(f"Item {index} must be an object")
        validate_item(item, index)
        if item["id"] in seen_ids:
            fail(f"Duplicate catalogue id: {item['id']}")
        seen_ids.add(item["id"])

    print(f"Catalogue valid: {len(items)} item(s)")


if __name__ == "__main__":
    main()
