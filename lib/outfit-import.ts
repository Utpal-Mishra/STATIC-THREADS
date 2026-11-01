export const clothingCategories = ["tops", "shirts", "knitwear", "jackets", "bottoms", "skirts", "dresses", "jumpsuits", "sets", "shoes", "accessories", "other"] as const;
export type ClothingCategory = typeof clothingCategories[number];
export type GarmentCandidate = { id: string; name: string; category: ClothingCategory; colour: string; detail: string; confidence: number; box: [number, number, number, number]; selected: boolean };
export type ImportPhoto = { data: string; width: number; height: number; hash: string };
export function validBox(box: unknown): box is [number, number, number, number] {
  return Array.isArray(box) && box.length === 4 && box.every(n => typeof n === "number" && Number.isFinite(n)) && box[0] >= 0 && box[1] >= 0 && box[2] >= .02 && box[3] >= .02 && box[0] + box[2] <= 1.000001 && box[1] + box[3] <= 1.000001;
}
export function validateCandidates(value: unknown): GarmentCandidate[] {
  if (!Array.isArray(value) || value.length > 20) throw new Error("The service returned an invalid garment list. Try again or add pieces manually.");
  return value.map((raw, index) => {
    if (!raw || typeof raw !== "object") throw new Error("Invalid garment result.");
    const v = raw as Record<string, unknown>;
    if (typeof v.name !== "string" || !v.name.trim() || v.name.length > 100 || !clothingCategories.includes(v.category as ClothingCategory) || typeof v.colour !== "string" || v.colour.length > 40 || typeof v.detail !== "string" || v.detail.length > 200 || typeof v.confidence !== "number" || !Number.isFinite(v.confidence) || v.confidence < 0 || v.confidence > 1 || !validBox(v.box)) throw new Error("The garment descriptions or crop coordinates need correction. Add pieces manually instead.");
    return { id: `detected-${index}`, name: v.name.trim(), category: v.category as ClothingCategory, colour: v.colour.trim() || "Unknown", detail: v.detail.trim(), confidence: v.confidence, box: [...v.box], selected: true };
  });
}
export function importKey(hash: string, item: GarmentCandidate): string {
  // Stable for the same photo, reviewed description and crop; never uses filenames.
  return `photo:${hash}:${JSON.stringify([item.name.trim().toLowerCase(), item.category, item.colour.trim().toLowerCase(), item.box.map(n => Math.round(n * 1000))])}`;
}
export function uniqueCandidates(hash: string, items: GarmentCandidate[]): GarmentCandidate[] {
  const seen = new Set<string>();
  return items.filter(item => { const key = importKey(hash, item); if (seen.has(key)) return false; seen.add(key); return true; });
}
export async function prepareImportPhoto(file: File): Promise<ImportPhoto> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 12 * 1024 * 1024 || !file.size) throw new Error("Choose a JPEG, PNG or WebP photo up to 12 MB. Convert HEIC photos to JPEG first.");
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error("This photo could not be opened. Try another JPEG, PNG or WebP."); });
  try {
    if (bitmap.width * bitmap.height > 40_000_000 || Math.max(bitmap.width, bitmap.height) > 12000) throw new Error("This photo is too large to process. Resize it below 40 megapixels.");
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Photo processing is unavailable in this browser.");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    // Re-encoding strips file metadata; nothing leaves the browser at this step.
    const data = canvas.toDataURL("image/jpeg", .85);
    if (data.length > 2_800_000) throw new Error("The prepared photo is too large. Choose a smaller image.");
    const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(await file.arrayBuffer()));
    return { data, width: canvas.width, height: canvas.height, hash: Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, "0")).join("") };
  } finally { bitmap.close(); }
}
