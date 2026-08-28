export const styleProfile = {
  updatedAt: "2026-08-28",
  archetype: "Relaxed smart-casual",
  score: 86,
  tags: ["Smart casual", "Minimal", "Neutral & earthy", "Travel ready", "Texture-led", "Layer friendly"],
  palette: [
    { name: "Off-white", hex: "#ece7da" },
    { name: "Charcoal", hex: "#45494b" },
    { name: "Warm grey", hex: "#77736d" },
    { name: "Olive", hex: "#697057" },
    { name: "Brown", hex: "#765342" },
    { name: "Navy", hex: "#243147" }
  ],
  preferences: [
    "Relaxed or regular shirts with the sleeves casually rolled",
    "Textured shirts and overshirts rather than highly graphic tops",
    "Dark grey, black or olive bottoms as a grounding layer",
    "Clean neutral trainers or beige statement sneakers",
    "Simple accessories such as a brown or navy cap",
    "Outfits that move easily between city, travel and smart-casual settings"
  ],
  principles: [
    { title: "Light over dark", body: "Off-white, cream and pale grey tops work especially well over charcoal, black and washed-grey bottoms." },
    { title: "Texture over print", body: "Waffle, linen and washed fabrics add interest while preserving the minimal look you repeatedly wear." },
    { title: "One relaxed element", body: "A relaxed shirt, short or trouser gives the outfit ease without making the whole silhouette oversized." },
    { title: "Neutral shoe anchor", body: "White, cream and beige trainers connect strongly with your existing neutral tops and dark bottoms." }
  ],
  outfits: [
    {
      id: "city-minimal",
      name: "City Minimal",
      mood: "Clean · Versatile · Smart casual",
      score: 94,
      itemIds: ["white-textured-shirt", "grey-jeans", "adidas-white-black", "brown-cap"],
      why: "The textured light shirt brings brightness close to the face, while grey denim and clean white trainers keep the lower half restrained. The brown cap adds warmth without competing with the outfit."
    },
    {
      id: "weekend-ease",
      name: "Weekend Ease",
      mood: "Relaxed · Breezy · Travel ready",
      score: 92,
      itemIds: ["grey-linen-shirt", "light-grey-denim-shorts", "puma-white-green"],
      why: "The relaxed grey shirt and shorts keep the palette tonal, while the cream, tan and green Puma pair gives the outfit a controlled focal point."
    },
    {
      id: "layered-neutral",
      name: "Layered Neutral",
      mood: "Modern · Layered · Everyday",
      score: 90,
      itemIds: ["white-tee", "beige-overshirt", "black-jeans", "adidas-white-burgundy"],
      why: "A simple white base lets the beige overshirt provide texture. Black jeans sharpen the silhouette and the burgundy Adidas detail gives a small accent without breaking the neutral palette."
    },
    {
      id: "utility-travel",
      name: "Utility Travel",
      mood: "Functional · Earthy · Comfortable",
      score: 88,
      itemIds: ["cream-pocket-tee", "olive-cargo", "puma-white-green", "navy-mesh-cap"],
      why: "Cream and olive already sit naturally in your wardrobe palette. The sneakers repeat both tones and the navy cap adds contrast while remaining easy to wear."
    }
  ]
} as const;

export type StyleProfile = typeof styleProfile;
