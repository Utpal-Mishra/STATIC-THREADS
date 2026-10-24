import imageSets from './recommendation-image-sets.json';

export type GarmentPart = 'top' | 'trousers' | 'layer' | 'cap' | 'footwear';
export type BoardFrame = readonly [number, number, number, number];
export type RecommendationColourVariant = {
  id: string;
  label: string;
  colours: Partial<Record<GarmentPart, string>>;
  note: string;
  asset: string;
  width: number;
  height: number;
  frames: readonly BoardFrame[];
  original: boolean;
  pieces?: readonly string[];
};
export type RecommendationColourVariantId = 'city-minimal' | 'weekend-ease' | 'layered-neutral' | 'utility-travel';
export const recommendationColourVariants = imageSets as unknown as Record<RecommendationColourVariantId, readonly RecommendationColourVariant[]>;
