import type { WardrobeItem } from "@/types/catalog";
import type { ItemDraft } from "@/lib/personal-wardrobe";
export function catalogueMetadata(item: WardrobeItem): ItemDraft & { secondary_colours: string[]; seasons: string[]; pattern: string; wear_count: number; last_worn_date: string | null } {
  return { name: item.name, category: item.category, brand: item.brand || "", subcategory: item.subcategory || "", size: item.size || "", fit: item.fit || "unknown", primary_colour: item.primaryColour || "", material: item.material || "", notes: [item.notes, "Imported existing catalogue. Its catalogue image was an illustrative preview, not a newly photographed garment."].filter(Boolean).join("\n").slice(0, 1000), status: item.status, occasions: item.occasions ?? [], secondary_colours: item.secondaryColours ?? [], seasons: item.seasons ?? [], pattern: item.pattern || "", wear_count: item.wearCount || 0, last_worn_date: item.lastWornDate || null };
}
export function catalogueAssetUrl(image: string, origin: string, basePath: string) {
  if (!/^\/catalog\/[a-z0-9-]+\.(webp|png|jpg|jpeg)$/.test(image)) throw new Error("No approved catalogue image is available for this item.");
  return `${origin}${basePath}${image}`;
}
export async function cataloguePhoto(item: WardrobeItem, signal: AbortSignal) {
  const url = catalogueAssetUrl(item.image, window.location.origin, process.env.NEXT_PUBLIC_BASE_PATH ?? "");
  const response = await fetch(url, { signal, cache: "no-store", redirect: "error" });
  if (!response.ok) throw new Error("Catalogue image could not be loaded. The clothing details can still be imported.");
  const blob = await response.blob();
  if (!["image/jpeg", "image/png", "image/webp"].includes(blob.type.split(";")[0]) || !blob.size || blob.size > 12 * 1024 * 1024) throw new Error("Catalogue image could not be verified.");
  return new File([blob], "catalogue-item." + item.image.split(".").pop(), { type: blob.type.split(";")[0] });
}
