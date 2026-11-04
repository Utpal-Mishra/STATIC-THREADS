// Pixel-based local cleanup. No model, provider call or generated garment detail.
export type BrushMark = { x: number; y: number; radius: number; keep: boolean };
export type CleanupOptions = { removeBackground: boolean; tolerance: number; marks: BrushMark[]; crop: [number, number, number, number]; exposure: number; background: string };
export const defaultCleanup = (): CleanupOptions => ({ removeBackground: true, tolerance: 28, marks: [], crop: [0, 0, 1, 1], exposure: 0, background: "#eee9df" });
const distance = (pixels: Uint8ClampedArray, a: number, colour: number[]) => Math.hypot(pixels[a] - colour[0], pixels[a + 1] - colour[1], pixels[a + 2] - colour[2]);
export function foregroundMask(pixels: Uint8ClampedArray, width: number, height: number, options: CleanupOptions) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width * height > 2_560_000 || pixels.length !== width * height * 4) throw new Error("Unsupported photo dimensions.");
  if (!Number.isFinite(options.tolerance) || options.tolerance < 0 || options.tolerance > 100 || options.marks.length > 1500) throw new Error("Invalid cleanup controls.");
  const mask = new Uint8Array(width * height).fill(255);
  const corners = [0, width - 1, (height - 1) * width, width * height - 1];
  const opaqueCorners = corners.filter(p => pixels[p * 4 + 3] > 0);
  const colour = [0, 1, 2].map(c => opaqueCorners.reduce((sum, p) => sum + pixels[p * 4 + c], 0) / Math.max(1, opaqueCorners.length));
  let warning = "";
  if (options.removeBackground && opaqueCorners.length) {
    if (opaqueCorners.some(p => distance(pixels, p * 4, colour) > 55)) warning = "The background is uneven. Automatic removal was skipped; use the erase brush or crop, or keep the original.";
    else {
      const queue = new Int32Array(width * height); let head = 0, tail = 0;
      const add = (p: number) => { if (mask[p] && distance(pixels, p * 4, colour) <= options.tolerance) { mask[p] = 0; queue[tail++] = p; } };
      // Only edge-connected pixels are removed, protecting enclosed similar colours.
      for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
      for (let y = 0; y < height; y++) { add(y * width); add(y * width + width - 1); }
      while (head < tail) { const p = queue[head++], x = p % width; if (x) add(p - 1); if (x + 1 < width) add(p + 1); if (p >= width) add(p - width); if (p + width < width * height) add(p + width); }
    }
  }
  for (const mark of options.marks) {
    if (![mark.x, mark.y, mark.radius].every(Number.isFinite) || mark.x < 0 || mark.x > 1 || mark.y < 0 || mark.y > 1 || mark.radius <= 0 || mark.radius > .2) throw new Error("Invalid brush mark.");
    const cx = mark.x * width, cy = mark.y * height, radius = mark.radius * Math.min(width, height);
    for (let y = Math.max(0, Math.floor(cy - radius)); y <= Math.min(height - 1, Math.ceil(cy + radius)); y++) for (let x = Math.max(0, Math.floor(cx - radius)); x <= Math.min(width - 1, Math.ceil(cx + radius)); x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) mask[y * width + x] = mark.keep ? 255 : 0;
  }
  const [left, top, right, bottom] = options.crop;
  if (![left, top, right, bottom].every(Number.isFinite) || left < 0 || top < 0 || right > 1 || bottom > 1 || right - left < .05 || bottom - top < .05) throw new Error("Keep at least 5% of the photo in each crop direction.");
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = y * width + x;
    if (x < left * width || y < top * height || x >= right * width || y >= bottom * height || pixels[p * 4 + 3] === 0) mask[p] = 0;
    if (mask[p]) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  }
  if (maxX < 0) throw new Error("No garment remains. Reduce removal strength, restore pixels or use the original.");
  return { mask, bounds: [minX, minY, maxX - minX + 1, maxY - minY + 1] as [number, number, number, number], warning };
}
export async function cleanupSource(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || !file.size || file.size > 12 * 1024 * 1024) throw new Error("Choose a JPEG, PNG or WebP up to 12 MB. Convert HEIC first.");
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error("This photo could not be opened."); });
  try {
    if (bitmap.width * bitmap.height > 40_000_000 || Math.max(bitmap.width, bitmap.height) > 12000) throw new Error("Resize this photo below 40 megapixels.");
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d"); if (!context) throw new Error("Photo preparation is unavailable.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return context.getImageData(0, 0, canvas.width, canvas.height);
  } finally { bitmap.close(); }
}
export function renderCleanup(source: ImageData, options: CleanupOptions, canvas: HTMLCanvasElement) {
  if (!/^#[a-f\d]{6}$/i.test(options.background) || !Number.isFinite(options.exposure) || Math.abs(options.exposure) > 20) throw new Error("Invalid preview controls.");
  const { mask, bounds, warning } = foregroundMask(source.data, source.width, source.height, options);
  const cutout = document.createElement("canvas"); cutout.width = source.width; cutout.height = source.height;
  const context = cutout.getContext("2d"); if (!context) throw new Error("Photo preview is unavailable.");
  const pixels = new Uint8ClampedArray(source.data), gain = 1 + options.exposure / 100;
  for (let p = 0; p < mask.length; p++) { pixels[p * 4 + 3] = Math.min(pixels[p * 4 + 3], mask[p]); if (options.exposure) for (let c = 0; c < 3; c++) pixels[p * 4 + c] = Math.min(255, Math.round(pixels[p * 4 + c] * gain)); }
  context.putImageData(new ImageData(pixels, source.width, source.height), 0, 0);
  const [x, y, w, h] = bounds;
  canvas.width = Math.max(4, Math.min(1280, Math.ceil(Math.max(w / .84, h / .84 * .8)))); canvas.height = Math.ceil(canvas.width / .8);
  const out = canvas.getContext("2d"); if (!out) throw new Error("Photo preview is unavailable.");
  out.fillStyle = options.background; out.fillRect(0, 0, canvas.width, canvas.height);
  const scale = Math.min(canvas.width * .84 / w, canvas.height * .84 / h, 1);
  out.drawImage(cutout, x, y, w, h, (canvas.width - w * scale) / 2, (canvas.height - h * scale) / 2, w * scale, h * scale);
  return warning;
}
