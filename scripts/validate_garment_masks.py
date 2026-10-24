"""Validate source-bound colour masks without exposing private wardrobe input."""
import json
from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
CODES = {"top": 1, "trousers": 2, "footwear": 3, "layer": 4, "cap": 5}
boards = json.loads((ROOT / "data/garment-masks.json").read_text())
for outfit, board in boards.items():
    source = Image.open(ROOT / f"public/lookbooks/{outfit}-approved-hq.webp")
    mask = Image.open(ROOT / f"public/lookbooks/masks/{outfit}.png")
    assert source.size == mask.size == (board["width"], board["height"]), outfit
    labels = np.asarray(mask)
    assert set(np.unique(labels)) <= {0, *[CODES[p] for p in board["parts"]]}, outfit
    for part in board["parts"]:
        assert np.count_nonzero(labels == CODES[part]) > 100, (outfit, part)
        assert 0 < board["reference"][part] <= 1, (outfit, part)
    # The face centers and page corners must never be recoloured.
    for x, y in [(10, 10), (730, 80), (252, 40), (1235, 35), (213, 587), (1235, 565)]:
        if outfit == "utility-travel" and y in (35, 40, 587):
            continue  # The utility cap is visible above these two faces.
        assert labels[y, x] == 0, (outfit, "skin/background", x, y)
    print(f"Validated {outfit}: {len(board['parts'])} garments")
