"""Offline contour refinement. Requires numpy, Pillow, opencv-python-headless.
Review all generated mask edges before committing source-board changes.
"""
import cv2, json
import numpy as np
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
boards=json.loads((root/'data/garment-masks.json').read_text())
codes={'top':1,'trousers':2,'footwear':3,'layer':4,'cap':5}
(root/'public/lookbooks/masks').mkdir(exist_ok=True)
for key,board in boards.items():
 image=np.array(Image.open(root/f'public/lookbooks/{key}-approved-hq.webp').convert('RGB'))
 result=np.zeros(image.shape[:2],np.uint8)
 for part,polygons in board['parts'].items():
  prior=np.zeros(image.shape[:2],np.uint8)
  cv2.fillPoly(prior,[np.array(p,np.int32) for p in polygons],1)
  # Trace is a prior; edge-aware refinement follows actual garment contours.
  inner=cv2.erode(prior,np.ones((13,13),np.uint8))
  outer=cv2.dilate(prior,np.ones((17 if part=="footwear" else 33,)*2,np.uint8))
  if part=="trousers" and key=="layered-neutral": outer=prior.copy()
  gm=np.zeros(image.shape[:2],np.uint8)
  gm[outer==1]=cv2.GC_PR_BGD;gm[prior==1]=cv2.GC_PR_FGD
  lum=image @ np.array([.2126,.7152,.0722])/255
  # Never force a background pixel into a light garment, even if inside a trace.
  confident=inner.astype(bool)
  if part=='trousers' and key!='layered-neutral': confident &= lum>.45 if key!='utility-travel' else lum>.22
  if part=='footwear' and key!='city-minimal': confident &= lum>.45
  if part=='top' and key=='city-minimal': confident &= image[:,:,2].astype(float)-image[:,:,0]>5
  gm[confident]=cv2.GC_FGD
  cv2.grabCut(image,gm,None,np.zeros((1,65)),np.zeros((1,65)),5,cv2.GC_INIT_WITH_MASK)
  binary=(gm==cv2.GC_FGD)|(gm==cv2.GC_PR_FGD)
  # Exclude the inner leg gaps and mannequin skin using reviewed contours.
  exclusions=[]
  if part in ('top','layer'):
   exclusions=['227,75 233,70 263,70 267,82 257,100 244,98','691,140 701,133 764,133 777,160 755,184 739,192 718,184 700,167','1208,62 1263,62 1263,78 1210,78','1215,588 1256,578 1266,596 1233,614','180,611 220,627 237,637 220,672 202,671 187,650']
  if part=='trousers' and key=='layered-neutral':
   exclusions+=['718,555 728,595 736,669 750,743 759,819 765,909 764,945 741,938 735,840 726,760 716,688','1219,325 1230,316 1235,366 1234,478 1212,476']
  if part in ('top','layer'):
   exclusions += ['227,74 234,68 266,68 267,80 258,98 242,98','1211,53 1264,53 1264,79 1210,79','169,190 181,184 197,207 208,228 200,242 191,226 178,211','291,190 308,190 313,225 316,268 306,280 297,273 300,253 296,224','586,380 601,372 622,377 638,404 633,431 624,467 617,466 604,439 591,400','849,375 868,382 859,414 844,452 834,469 826,449 833,421','1167,200 1183,200 1192,228 1192,253 1182,239','1286,200 1301,201 1296,234 1285,256 1283,235','1253,717 1272,724 1253,749 1235,762 1220,767 1221,749 1239,728']
  if part=='footwear' and key=='utility-travel':
   binary[980:,421:1027]=False
  for points in exclusions:
   region=np.zeros(image.shape[:2],np.uint8)
   pts=np.array([[int(n) for n in point.split(',')] for point in points.split()],np.int32)
   cv2.fillPoly(region,[pts],1)
   binary[region==1]=False
  # Limit lightening of dark source fabrics while retaining fold detail.
  lum=image @ np.array([.2126,.7152,.0722])/255
  board['reference'][part]=float(np.median(lum[binary]))
  result[binary]=codes[part]
 Image.fromarray(result).save(root/f'public/lookbooks/masks/{key}.png')
 print(key,flush=True)
(root/'data/garment-masks.json').write_text(json.dumps(boards,separators=(',',':'))+'\n')

# Recover cool-blue collar/cuff pixels excluded by warm skin-protection contours.
from repair_city_shirt_mask import blue_shirt_candidates
p = root / "public/lookbooks/masks/city-minimal.png"
labels = np.array(Image.open(p))
source = np.asarray(Image.open(root / "public/lookbooks/city-minimal-approved-hq.webp").convert("RGB"))
labels[blue_shirt_candidates(source, labels)] = codes["top"]
Image.fromarray(labels).save(p)
