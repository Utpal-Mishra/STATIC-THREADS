export const visualLookbooks = {
  "city-minimal": {
    title: "City Minimal",
    asset: "/lookbooks/collections/v1/city-minimal-powder-blue-cream.webp",
    fallbackAsset: "/lookbooks/city-minimal-textfree.webp",
    model: "mannequin",
    fidelity: "style-preview",
    views: ["Walking", "Sitting", "Front View", "Back View", "Side View"],
    futureModel: "user-avatar"
  },
  "weekend-ease": {
    title: "Weekend Ease",
    asset: "/lookbooks/collections/v1/weekend-ease-olive-cream.webp",
    fallbackAsset: "/lookbooks/city-minimal-textfree.webp",
    model: "mannequin",
    fidelity: "style-preview",
    views: ["Walking", "Sitting", "Front View", "Back View", "Side View"],
    futureModel: "user-avatar"
  },
  "layered-neutral": {
    title: "Layered Neutral",
    asset: "/lookbooks/collections/v1/layered-neutral-beige-black.webp",
    fallbackAsset: "/lookbooks/city-minimal-textfree.webp",
    model: "mannequin",
    fidelity: "style-preview",
    views: ["Walking", "Sitting", "Front View", "Back View", "Side View"],
    futureModel: "user-avatar"
  },
  "utility-travel": {
    title: "Utility Travel",
    asset: "/lookbooks/collections/v1/utility-travel-cream-olive.webp",
    fallbackAsset: "/lookbooks/city-minimal-textfree.webp",
    model: "mannequin",
    fidelity: "style-preview",
    views: ["Walking", "Sitting", "Front View", "Back View", "Side View"],
    futureModel: "user-avatar"
  }
} as const;

export type VisualLookbookId = keyof typeof visualLookbooks;
