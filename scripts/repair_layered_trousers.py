"""Apply reviewed, source-specific trouser contours for all five layered poses.
The black denim is close to the studio background; colour clustering alone cannot
reliably separate its waistband/lap from the chair or the gap between the legs.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parents[1]

# Source board coordinates (1448 x 1086). Each contour follows actual denim,
# including the waistband and seated lap; the leg gap is outside the contours.
CONTOURS = [
 '199,236 211,228 236,242 272,252 277,255 274,283 273,320 270,357 276,403 284,455 270,460 257,468 247,443 233,397 225,374 218,388 211,423 202,430 185,425 183,417 192,402 204,383 217,355 213,336 207,302 201,275',
 '105,815 103,804 108,781 121,765 143,761 164,764 183,776 194,802 203,851 214,908 225,940 202,949 185,958 172,927 162,879 149,828 129,826 111,823',
 '143,764 167,764 190,774 213,783 235,789 241,765 259,753 276,762 290,760 312,764 326,775 330,797 333,849 338,894 348,921 319,928 290,941 280,880 276,829 260,829 245,827 226,826 203,827 173,825 161,806',
 '627,467 641,481 668,494 687,463 733,468 772,466 785,495 815,479 831,461 836,500 839,540 837,642 836,730 837,823 838,925 819,934 798,934 774,946 765,910 763,851 756,780 752,734 742,679 734,626 726,584 721,548 714,535 714,584 713,637 719,697 722,750 730,820 735,903 733,932 711,934 697,930 673,934 662,913 658,870 649,817 642,756 638,698 634,637 630,576 626,526',
 '1188,254 1211,264 1252,264 1270,256 1284,244 1286,270 1282,301 1277,338 1274,381 1272,428 1271,469 1261,475 1239,475 1237,461 1238,420 1234,378 1231,343 1232,310 1235,275 1227,309 1217,353 1212,390 1208,435 1206,470 1197,475 1178,470 1178,439 1179,404 1182,364 1184,326 1186,287',
 '1206,765 1213,758 1220,751 1234,766 1242,751 1252,759 1278,779 1277,815 1279,855 1284,891 1286,929 1288,973 1279,977 1277,991 1253,992 1233,982 1227,957 1225,923 1218,890 1213,853 1208,813'
]

def reviewed_trouser_region(source):
    shape = Image.new('L', (source.shape[1], source.shape[0]))
    draw = ImageDraw.Draw(shape)
    for text in CONTOURS:
        draw.polygon([tuple(map(int, point.split(','))) for point in text.split()], fill=255)
    # Protect warm, light mannequin hands and the light base/outer layer where
    # they occlude the lap/waist. This threshold never clips the dark denim.
    rgb = source.astype('int16')
    warm_skin = ((rgb[...,0] - rgb[...,2]) > 10) & ((rgb[...,0] - rgb[...,1]) > 3)
    return (np.asarray(shape) > 0) & (np.mean(source, axis=2) < 100) & ~warm_skin

if __name__ == '__main__':
    path = ROOT / 'public/lookbooks/masks/layered-neutral.png'
    labels = np.array(Image.open(path))
    source = np.asarray(Image.open(ROOT / 'public/lookbooks/layered-neutral-approved-hq.webp').convert('RGB'))
    before = labels == 2
    region = reviewed_trouser_region(source) & (labels != 3)
    labels[before] = 0
    labels[region] = 2
    Image.fromarray(labels).save(path)
    data_path = ROOT / 'data/garment-masks.json'
    data = json.loads(data_path.read_text())
    data['layered-neutral']['parts']['trousers'] = [
        [list(map(int, point.split(','))) for point in text.split()] for text in CONTOURS
    ]
    data['layered-neutral']['reference']['trousers'] = float(np.median((source @ np.array([.2126,.7152,.0722]) / 255)[region]))
    data_path.write_text(json.dumps(data, separators=(',', ':')) + '\n')
    print(f'Recovered {np.count_nonzero(region & ~before)} denim pixels; removed {np.count_nonzero(before & ~region)} pixels outside reviewed denim contours')
