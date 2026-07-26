export type ItemCategory =
  | "tops"
  | "shirts"
  | "knitwear"
  | "jackets"
  | "trousers"
  | "jeans"
  | "shorts"
  | "shoes"
  | "accessories";

export type ItemStatus = "available" | "laundry" | "repair" | "stored";
export type Fit = "slim" | "regular" | "relaxed" | "oversized" | "unknown";
export type Season = "spring" | "summer" | "autumn" | "winter" | "all-season";
export type Occasion =
  | "casual"
  | "smart-casual"
  | "office"
  | "formal"
  | "sport"
  | "travel";

export interface WardrobeItem {
  id: string;
  name: string;
  brand: string;
  category: ItemCategory;
  subcategory: string;
  size: string;
  fit: Fit;
  primaryColour: string;
  secondaryColours: string[];
  pattern: string;
  material: string;
  seasons: Season[];
  occasions: Occasion[];
  image: string;
  status: ItemStatus;
  purchasePrice?: number;
  currency?: "EUR" | "GBP" | "USD";
  purchaseDate?: string;
  wearCount: number;
  lastWornDate?: string;
  notes?: string;
}

export interface WardrobeCatalog {
  version: number;
  updatedAt: string;
  items: WardrobeItem[];
}
