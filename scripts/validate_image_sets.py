"""Validate complete image presets, lossless pixels and five-view crop geometry."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sets = json.loads((ROOT / 'data/recommendation-image-sets.json').read_text())
assert set(sets) == {'city-minimal', 'weekend-ease', 'layered-neutral', 'utility-travel'}
inspiration = json.loads((ROOT / 'data/inspiration-image-sets.json').read_text())
assert set(inspiration) == {'powder-blue-cream', 'stripe-denim-knit', 'brown-black-olive', 'espresso-cream', 'forest-cream', 'black-light-denim', 'black-cream-sandal', 'teal-washed-grey'}
assets = set()
for outfit, variants in {**sets, **inspiration}.items():
    count = 4 if outfit in sets else 3
    assert len(variants) == count
    assert sum(v['original'] for v in variants) == (1 if outfit in sets else 0)
    assert len({v['id'] for v in variants}) == count
    if outfit in sets: assert variants[0]['original']
    for variant in variants:
        asset = variant['asset']
        assert asset.startswith('/lookbooks/collections/v1/' if outfit in sets else '/lookbooks/inspiration/v1/') and asset not in assets
        assets.add(asset)
        path = ROOT / 'public' / asset.lstrip('/')
        assert hashlib.sha256(path.read_bytes()).hexdigest() == variant['sha256'], path
        with Image.open(path) as image:
            image.load()
            assert image.size == (variant['width'], variant['height'])
            assert image.width >= 1448 and image.height >= 1086
            assert hashlib.sha256(image.convert('RGB').tobytes()).hexdigest() == variant['pixelSha256'], ('Lossless pixel mismatch', path)
        assert len(variant['frames']) == 5
        for x, y, w, h in variant['frames']:
            assert x >= 0 and y >= 0 and w > 200 and h > 400
            assert x+w <= variant['width'] and y+h <= variant['height']
        assert variant['colours']['top'] and variant['colours']['trousers']
        if outfit in inspiration: assert len(variant['pieces']) >= 3
        print(f"Validated {outfit} / {variant['id']}: full-resolution lossless board, 5 views")
card = (ROOT / 'components/RecommendationCard.tsx').read_text()
lookbook = (ROOT / 'components/RecommendationLookbook.tsx').read_text()
for old in ['recolour-lookbook', 'recolourLookbook', 'garmentBoards', 'getImageData', 'colour-filter-options']:
    assert old not in card, ('Runtime recolour path returned', old)
assert 'preserveAspectRatio="xMidYMid meet"' in lookbook
assert 'viewBox=' in lookbook and '<image href=' in lookbook
assert 'clipPathUnits="userSpaceOnUse"' in lookbook and 'clipPath={`url(' in lookbook, 'Native frame clipping must prevent adjacent-panel bleed'
assert 'data:image/' not in card + lookbook
print('All 40 boards / 200 views validated; runtime uses complete images without recolouring')
