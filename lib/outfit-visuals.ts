import { styleProfile } from "@/data/style-profile";
import { recommendationColourVariants } from "@/data/recommendation-colour-variants";
import type { BoardFrame } from "@/data/recommendation-colour-variants";
import type { PlannerItem } from "@/lib/outfit-planner";
export const mannequinViews = ["Walking", "Sitting", "Front", "Back", "Side"] as const;
export type MannequinBoard = { asset: string; width: number; height: number; frames: readonly BoardFrame[]; label: string };
export function catalogueMannequin(items: PlannerItem[]): MannequinBoard | null {
  const ids = items.map(item => item.id).sort().join("|");
  const look = styleProfile.outfits.find(outfit => [...outfit.itemIds].sort().join("|") === ids);
  if (!look || !(look.id in recommendationColourVariants)) return null;
  const variants = recommendationColourVariants[look.id as keyof typeof recommendationColourVariants];
  // Existing boards are labelled style previews, never exact product/fit renders.
  const best = variants.find(variant => {
    const tones = Object.values(variant.colours).join(" ").toLowerCase();
    return items.filter(item => item.category !== "accessories").every(item => tones.includes(item.colour.toLowerCase()));
  }) ?? variants.find(variant => variant.original) ?? variants[0];
  return { asset: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${best.asset}`, width: best.width, height: best.height, frames: best.frames, label: `${look.name} · ${best.label}` };
}
