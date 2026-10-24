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

# Regression: collars/cuffs must not retain any detected source-blue fabric.
from repair_city_shirt_mask import blue_shirt_candidates
labels = np.asarray(Image.open(ROOT / "public/lookbooks/masks/city-minimal.png"))
source = np.asarray(Image.open(ROOT / "public/lookbooks/city-minimal-approved-hq.webp").convert("RGB"))
assert not np.any(blue_shirt_candidates(source, labels) & (labels != CODES["top"])), "City Minimal collar/cuff coverage regressed"
print("City Minimal collar/cuff coverage passed")

# Regression: waistband, lap and both legs must be included in all five poses.
labels = np.asarray(Image.open(ROOT / "public/lookbooks/masks/layered-neutral.png"))
for x, y in [(246,258),(197,414),(221,342),(142,787),(211,807),(228,813),(112,806),(304,811),(203,937),(724,483),(754,480),(691,600),(802,700),(1211,282),(1256,280),(1245,801),(1253,930)]:
    assert labels[y,x] == CODES["trousers"], ("Layered denim coverage",x,y)
for x, y in [(251,805),(215,880),(749,800),(1225,450),(210,996),(698,358)]:
    assert labels[y,x] != CODES["trousers"], ("Protected hand/chair/gap/shoe/shirt",x,y)
print("Layered trouser waistband/lap/legs and protected regions passed")
