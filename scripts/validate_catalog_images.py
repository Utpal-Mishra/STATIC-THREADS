"""Check every representative closet image against its reviewed manifest."""
import hashlib
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
catalog = json.loads((root / 'data/catalog.json').read_text())['items']
manifest = json.loads((root / 'data/catalog-image-sets.json').read_text())['items']
assert len(catalog) == len(manifest) == 26
by_id = {item['id']: item for item in manifest}
assert len(by_id) == len(manifest)
for item in catalog:
    record = by_id[item['id']]
    assert item['image'] == record['asset']
    path = root / 'public' / item['image'].lstrip('/')
    data = path.read_bytes()
    assert hashlib.sha256(data).hexdigest() == record['sha256'], item['id']
    assert len(data) == record['bytes'] > 0, item['id']
    with Image.open(path) as image:
        assert image.format == 'WEBP'
        assert image.size == (record['width'], record['height']) == (1254, 1254)
        image.verify()
print('Validated 26 unique full-resolution closet images, references and checksums')
