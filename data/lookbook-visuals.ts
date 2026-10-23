export const visualLookbooks = {
  "city-minimal": {
    title: "City Minimal",
    asset: "/lookbooks/city-minimal-textfree.webp",
    fallbackAsset: "/lookbooks/city-minimal-textfree.webp",
    model: "mannequin",
    fidelity: "style-preview",
    views: ["Walking", "Sitting", "Front View", "Back View", "Side View"],
    futureModel: "user-avatar"
  },
  "weekend-ease": {
    title: "Weekend Ease",
    asset: "/lookbooks/weekend-ease-textfree.webp",
    fallbackAsset: "/lookbooks/city-minimal-textfree.webp",
    model: "mannequin",
    fidelity: "style-preview",
    views: ["Walking", "Sitting", "Front View", "Back View", "Side View"],
    futureModel: "user-avatar"
  },
  "layered-neutral": {
    title: "Layered Neutral",
    asset: "/lookbooks/coastal-blue.webp",
    fallbackAsset: "/lookbooks/city-minimal-textfree.webp",
    model: "mannequin",
    fidelity: "style-preview",
    views: ["Walking", "Sitting", "Front View", "Back View", "Side View"],
    futureModel: "user-avatar"
  },
  "utility-travel": {
    title: "Utility Travel",
    asset: "/lookbooks/utility-travel-textfree.webp",
    fallbackAsset: "/lookbooks/city-minimal-textfree.webp",
    model: "mannequin",
    fidelity: "style-preview",
    views: ["Walking", "Sitting", "Front View", "Back View", "Side View"],
    futureModel: "user-avatar"
  }
} as const;

export type VisualLookbookId = keyof typeof visualLookbooks;
