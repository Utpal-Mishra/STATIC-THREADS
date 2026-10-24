import masks from '@/data/garment-masks.json';

export type GarmentPart = 'top' | 'trousers' | 'layer' | 'cap' | 'footwear';
export type GarmentColours = Partial<Record<GarmentPart, string>>;
type MaskBoard = { width: number; height: number; reference: Partial<Record<GarmentPart, number>>; parts: Partial<Record<GarmentPart, number[][][]>> };
export const garmentBoards: Record<string, MaskBoard> = masks;
export const nativeFootwearColours: Record<string, string> = {
  'city-minimal': 'Brown', 'weekend-ease': 'White',
  'layered-neutral': 'White', 'utility-travel': 'Cream'
};
export const colourHex: Record<string, string> = {
  White: '#f1efe7', Cream: '#e8ddc4', 'Light grey': '#b1b6b8', Grey: '#777b7f',
  Charcoal: '#45494d', Black: '#17191c', Beige: '#c7b697', Stone: '#aaa18f',
  Sand: '#c9b58f', Khaki: '#9c946f', Olive: '#687153', Navy: '#243049',
  Brown: '#75523f', Chocolate: '#5b3b2f', 'Powder blue': '#aabfcd'
};

// Reuse decoded sources, never previously recoloured pixels. Evict failed loads
// so a retry can recover. One render is shared by all five gallery crops.
const sources = new Map<string, Promise<HTMLImageElement>>();
export function loadLookbook(url: string) {
  let pending = sources.get(url);
  if (!pending) {
    pending = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => { sources.delete(url); reject(new Error('Could not load outfit preview.')); };
      image.src = url;
    });
    sources.set(url, pending);
  }
  return pending;
}

export function recolourLookbook(image: HTMLImageElement, outfitId: string, colours: GarmentColours, segmentation: HTMLImageElement): string {
  const board = garmentBoards[outfitId];
  if (!board) throw new Error('No garment masks for this outfit.');
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Outfit preview is unavailable in this browser.');
  ctx.drawImage(image, 0, 0);
  const source = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const output = new ImageData(new Uint8ClampedArray(source.data), canvas.width, canvas.height);
  const mask = document.createElement('canvas');
  mask.width = canvas.width; mask.height = canvas.height;
  const mctx = mask.getContext('2d', { willReadFrequently: true })!;
  mctx.drawImage(segmentation, 0, 0, mask.width, mask.height);
  const labels = mctx.getImageData(0, 0, mask.width, mask.height).data;
  const parts: GarmentPart[] = ['top', 'trousers', 'footwear', 'layer', 'cap'];
  const targets = parts.map((part) => {
    // Preserve the source footwear's leather, soles, straps and accent colours.
    if (part === 'footwear' && colours.footwear === nativeFootwearColours[outfitId]) return null;
    const hex = colours[part] && colourHex[colours[part]!];
    return hex ? [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)) : null;
  });
  for (let i = 0; i < output.data.length; i += 4) {
    const index = labels[i] - 1;
    const target = targets[index];
    if (!target) continue;
    const part = parts[index];
    const lum = (.2126 * source.data[i] + .7152 * source.data[i + 1] + .0722 * source.data[i + 2]) / 255;
    const reference = board.reference[part] ?? .6;
    const shade = Math.max(.5, Math.min(1.2, .85 + .18 * Math.log2(Math.max(.05, lum / reference))));
    for (let channel = 0; channel < 3; channel++) output.data[i + channel] = Math.min(255, target[channel] * shade);
  }
  ctx.putImageData(output, 0, 0);
  return canvas.toDataURL('image/webp', .94);
}
