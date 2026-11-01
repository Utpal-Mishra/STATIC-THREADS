import { importKey, validBox, type GarmentCandidate, type ImportPhoto } from "./outfit-import";
import { planOutfits, type Brief, type PlannerItem } from "./outfit-planner";
export const rushStyles = ["unknown", "casual", "smart-casual", "formal", "black-tie", "active"] as const;
export type RushStyle = typeof rushStyles[number];
export type RushPhoto = ImportPhoto & { id: string };
export type RushPiece = GarmentCandidate & { photoId: string; style: RushStyle };
export const MAX_RUSH_PHOTOS = 3;
export const MAX_RUSH_PIECES = 20;
export function reviewedRushPieces(photos: RushPhoto[], pieces: RushPiece[]): RushPiece[] {
  const seen = new Set<string>();
  return pieces.filter(item => {
    const photo = photos.find(p => p.id === item.photoId);
    if (!item.selected || !photo || !item.name.trim() || item.name.length > 100 || !validBox(item.box)) return false;
    const key = importKey(photo.hash, item); if (seen.has(key)) return false; seen.add(key); return true;
  });
}
export function rushPlannerItems(photos: RushPhoto[], pieces: RushPiece[]): PlannerItem[] {
  return reviewedRushPieces(photos, pieces).map(item => ({ id: item.id, name: item.name.trim(), category: item.category, subcategory: item.detail, colour: item.colour, secondaryColours: [], material: "Unknown", status: "available", occasions: item.style === "unknown" ? [] : item.style === "black-tie" ? ["casual", "smart-casual", "formal", "black-tie"] : item.style === "formal" ? ["casual", "smart-casual", "formal"] : item.style === "smart-casual" ? ["casual", "smart-casual"] : [item.style] }));
}
export function planRushHour(photos: RushPhoto[], pieces: RushPiece[], brief: Brief, seen: string[] = []) {
  const result = planOutfits(rushPlannerItems(photos, pieces), brief, seen);
  return { ...result,
    message: result.missing.length ? `Add or confirm ${result.missing.join("; ")}. You can photograph/upload the missing option or adjust the brief and reviewed style labels.` : result.outfits.length ? `${result.outfits.length} option(s) from your confirmed Rush Hour pieces. Compare them or tell me what to change.` : "No more combinations meet this brief. Add another option, adjust a preference or start a new plan.",
    outfits: result.outfits.map(outfit => ({ ...outfit, explanation: outfit.explanation.replace("available wardrobe items", "the clothing options confirmed for this session") }))
  };
}
