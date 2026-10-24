"""Recover blue shirt fabric at collar/cuff exclusions without including skin.
Run after source-mask refinement. Uses the same Pillow/NumPy dependencies as CI.
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]

def blue_shirt_candidates(source, labels):
    # Restrict recovery to the immediate shirt silhouette. The source shirt is
    # cool blue; the mannequin is warm-neutral, including in collar shadows.
    near = np.asarray(Image.fromarray((labels == 1).astype('uint8') * 255).filter(ImageFilter.MaxFilter(61))) > 0
    rgb = source.astype('int16')
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return near & (b - r >= 4) & (b - g >= -3) & (np.max(rgb, axis=2) > 70) & (np.ptp(rgb, axis=2) >= 8)

if __name__ == '__main__':
    path = ROOT / 'public/lookbooks/masks/city-minimal.png'
    labels = np.array(Image.open(path))
    source = np.asarray(Image.open(ROOT / 'public/lookbooks/city-minimal-approved-hq.webp').convert('RGB'))
    recover = blue_shirt_candidates(source, labels) & (labels != 1)
    labels[recover] = 1
    Image.fromarray(labels).save(path)
    print(f'Recovered {np.count_nonzero(recover)} collar, cuff and fabric-edge pixels')
