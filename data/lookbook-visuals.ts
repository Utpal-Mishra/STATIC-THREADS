export const visualLookbooks = {
  "city-minimal": {
    title: "City Minimal",
    asset: null,
    model: "mannequin",
    views: ["Walking", "Sitting", "Front View", "Back View", "Side View"],
    futureModel: "user-avatar"
  },
  "weekend-ease": {
    title: "Weekend Ease",
    asset: null,
    model: "mannequin",
    views: ["Walking", "Sitting", "Front View", "Back View", "Side View"],
    futureModel: "user-avatar"
  },
  "layered-neutral": {
    title: "Layered Neutral",
    asset: null,
    model: "mannequin",
    views: ["Walking", "Sitting", "Front View", "Back View", "Side View"],
    futureModel: "user-avatar"
  },
  "utility-travel": {
    title: "Utility Travel",
    asset: null,
    model: "mannequin",
    views: ["Walking", "Sitting", "Front View", "Back View", "Side View"],
    futureModel: "user-avatar"
  }
} as const;

export type VisualLookbookId = keyof typeof visualLookbooks;
