export type RecommendationColourVariant = {
  id: string;
  label: string;
  colours: {
    top?: string;
    trousers?: string;
    layer?: string;
    cap?: string;
    footwear?: string;
  };
  note: string;
  asset?: string;
};

export const recommendationColourVariants = {
  "city-minimal": [
    {
      id: "original",
      label: "Original",
      colours: { top: "Cream", trousers: "Grey", cap: "Brown", footwear: "White" },
      note: "Current wardrobe combination.",
      asset: "/lookbooks/city-minimal-approved-hq.webp"
    },
    {
      id: "powder-blue-cream",
      label: "Powder Blue + Cream",
      colours: { top: "Powder blue", trousers: "Cream", cap: "Brown", footwear: "Brown" },
      note: "A lighter summer direction with warm accessories."
    },
    {
      id: "olive-stone",
      label: "Olive + Stone",
      colours: { top: "Olive", trousers: "Stone", cap: "Navy", footwear: "White" },
      note: "Earthy and understated while keeping the city-minimal silhouette."
    },
    {
      id: "white-charcoal",
      label: "White + Charcoal",
      colours: { top: "White", trousers: "Charcoal", cap: "Brown", footwear: "White" },
      note: "Highest-contrast neutral option."
    }
  ],
  "weekend-ease": [
    {
      id: "original",
      label: "Original",
      colours: { top: "Grey", trousers: "Light grey", footwear: "Cream" },
      note: "Current wardrobe combination.",
      asset: "/lookbooks/weekend-ease-approved-hq.webp"
    },
    {
      id: "olive-cream",
      label: "Olive + Cream",
      colours: { top: "Olive", trousers: "Cream", footwear: "White" },
      note: "Relaxed earth-tone weekend palette."
    },
    {
      id: "powder-blue-sand",
      label: "Powder Blue + Sand",
      colours: { top: "Powder blue", trousers: "Sand", footwear: "Cream" },
      note: "Breezy warm-weather direction."
    },
    {
      id: "navy-stone",
      label: "Navy + Stone",
      colours: { top: "Navy", trousers: "Stone", footwear: "White" },
      note: "A slightly sharper travel-ready option."
    }
  ],
  "layered-neutral": [
    {
      id: "original",
      label: "Original",
      colours: { top: "White", trousers: "Black", layer: "Beige", footwear: "White" },
      note: "Current wardrobe combination.",
      asset: "/lookbooks/layered-neutral-approved-hq.webp"
    },
    {
      id: "chocolate-cream",
      label: "Chocolate + Cream",
      colours: { top: "Cream", trousers: "Cream", layer: "Chocolate", footwear: "Brown" },
      note: "Warm layered neutral with stronger contrast in the outer layer."
    },
    {
      id: "olive-black",
      label: "Olive + Black",
      colours: { top: "White", trousers: "Black", layer: "Olive", footwear: "White" },
      note: "Keeps the dark base and swaps the layer for a muted green."
    },
    {
      id: "navy-grey",
      label: "Navy + Grey",
      colours: { top: "White", trousers: "Grey", layer: "Navy", footwear: "White" },
      note: "Cooler layered option for city and travel."
    }
  ],
  "utility-travel": [
    {
      id: "original",
      label: "Original",
      colours: { top: "Cream", trousers: "Olive", cap: "Navy", footwear: "Cream" },
      note: "Current wardrobe combination.",
      asset: "/lookbooks/utility-travel-approved-hq.webp"
    },
    {
      id: "white-olive",
      label: "White + Olive",
      colours: { top: "White", trousers: "Olive", cap: "Navy", footwear: "White" },
      note: "Cleaner high-contrast travel palette."
    },
    {
      id: "black-grey",
      label: "Black + Grey",
      colours: { top: "Black", trousers: "Grey", cap: "Black", footwear: "White" },
      note: "More urban and functional while keeping the same silhouette."
    },
    {
      id: "powder-blue-khaki",
      label: "Powder Blue + Khaki",
      colours: { top: "Powder blue", trousers: "Khaki", cap: "Navy", footwear: "Cream" },
      note: "Softer travel palette with a light upper half."
    }
  ]
} as const;

export type RecommendationColourVariantId = keyof typeof recommendationColourVariants;
