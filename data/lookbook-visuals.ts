export const visualLookbooks = {
  "city-minimal": {
    title: "City Minimal",
    asset: "/lookbooks/recommendation-lookbooks-atlas.webp",
    atlasPosition: "0% 0%",
    model: "mannequin",
    fidelity: "style-preview",
    views: ["Walking", "Sitting", "Front View", "Back View", "Side View"],
    futureModel: "user-avatar"
  },
  "weekend-ease": {
    title: "Weekend Ease",
    asset: "/lookbooks/recommendation-lookbooks-atlas.webp",
    atlasPosition: "100% 0%",
    model: "mannequin",
    fidelity: "style-preview",
    views: ["Walking", "Sitting", "Front View", "Back View", "Side View"],
    futureModel: "user-avatar"
  },
  "layered-neutral": {
    title: "Layered Neutral",
    asset: "/lookbooks/recommendation-lookbooks-atlas.webp",
    atlasPosition: "0% 100%",
    model: "mannequin",
    fidelity: "style-preview",
    views: ["Walking", "Sitting", "Front View", "Back View", "Side View"],
    futureModel: "user-avatar"
  },
  "utility-travel": {
    title: "Utility Travel",
    asset: "/lookbooks/recommendation-lookbooks-atlas.webp",
    atlasPosition: "100% 100%",
    model: "mannequin",
    fidelity: "style-preview",
    views: ["Walking", "Sitting", "Front View", "Back View", "Side View"],
    futureModel: "user-avatar"
  }
} as const;

export type VisualLookbookId = keyof typeof visualLookbooks;
