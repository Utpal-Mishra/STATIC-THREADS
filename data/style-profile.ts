export const styleProfile = {
  updatedAt: "2026-08-30",
  archetype: "Relaxed smart-casual",
  score: 88,
  tags: ["Smart casual", "Minimal", "Neutral & earthy", "Travel ready", "Texture-led", "Layer friendly", "Relaxed tailoring"],
  palette: [
    { name: "Off-white", hex: "#ece7da" },
    { name: "Charcoal", hex: "#45494b" },
    { name: "Warm grey", hex: "#77736d" },
    { name: "Olive", hex: "#697057" },
    { name: "Brown", hex: "#765342" },
    { name: "Navy", hex: "#243147" },
    { name: "Powder blue", hex: "#aabfcd" },
    { name: "Burgundy", hex: "#6f2f3c" }
  ],
  preferences: [
    "Relaxed or regular shirts with the sleeves casually rolled",
    "Textured shirts and overshirts rather than highly graphic tops",
    "Dark grey, black or olive bottoms as a grounding layer",
    "Clean neutral trainers or beige statement sneakers",
    "Simple accessories such as a brown or navy cap",
    "Outfits that move easily between city, travel and smart-casual settings",
    "Light trousers paired with deep brown, navy, green or burgundy tops",
    "Relaxed tailoring and wider-leg trousers when the rest of the outfit is restrained"
  ],
  principles: [
    { title: "Light over dark", body: "Off-white, cream and pale grey tops work especially well over charcoal, black and washed-grey bottoms." },
    { title: "Dark over light", body: "Your newer references repeatedly pair brown, navy, black and forest green tops with cream or off-white trousers for a sharper summer look." },
    { title: "Texture over print", body: "Waffle, linen, washed cotton and subtle stripes add interest while preserving the minimal look you repeatedly prefer." },
    { title: "One relaxed element", body: "A relaxed shirt, trouser or draped knit gives the outfit ease without making the whole silhouette oversized." },
    { title: "Neutral shoe anchor", body: "White, cream, brown and black footwear connects strongly with your preferred neutral and earth-tone combinations." }
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
    },
    {
      id: "dark-earth-city",
      name: "Dark Earth City",
      mood: "Sharp · Earthy · Evening casual",
      score: 91,
      itemIds: ["taupe-tee", "black-jeans", "timberland-brown"],
      why: "This translates the brown-on-dark references into pieces you already own: a warm neutral top, black lower half and brown footwear."
    },
    {
      id: "green-grey-tonal",
      name: "Green Grey Tonal",
      mood: "Muted · Modern · Everyday",
      score: 90,
      itemIds: ["green-tee", "grey-jeans", "adidas-white-black"],
      why: "The forest and olive references reinforce green as a strong top colour for you. Grey denim keeps it urban while white trainers prevent the combination feeling heavy."
    }
  ],
  inspirationLooks: [
    {
      id: "powder-blue-cream",
      name: "Powder Blue + Cream",
      mood: "Summer · Relaxed tailoring",
      pieces: ["Powder-blue relaxed shirt", "Cream or off-white wide trousers", "White trainers or dark sandals", "Optional white cap"],
      why: "A recurring reference in the latest set. The cool shirt and warm light trouser balance each other and create a clean, expensive-looking summer palette."
    },
    {
      id: "stripe-denim-knit",
      name: "Stripe + Light Denim + Knit",
      mood: "Preppy · Layered · Travel",
      pieces: ["Fine blue/white striped shirt", "Light-wash relaxed jeans", "Navy knit draped over shoulders", "Cream sneakers", "Brown leather bag"],
      why: "The striped shirt gives structure while the knit layer adds depth without adding visual noise. This is a strong direction for transitional weather."
    },
    {
      id: "brown-black-olive",
      name: "Chocolate + Black + Olive",
      mood: "Refined · Earth tone · City",
      pieces: ["Chocolate-brown shirt", "Black tailored trousers", "Olive or sage knit layer", "Brown leather bag", "Black footwear"],
      why: "This is one of the strongest new palettes in the references: warm brown up top, dark trousers and a muted green layer create depth while staying restrained."
    },
    {
      id: "espresso-cream",
      name: "Espresso + Cream",
      mood: "Minimal · Rich · Everyday",
      pieces: ["Dark-brown knit or polo", "Cream straight trousers", "Black loafers or clean black shoes"],
      why: "High contrast without relying on black and white. It fits the minimal, earth-tone direction and works particularly well for casual dinners or smarter weekends."
    },
    {
      id: "forest-cream",
      name: "Forest Green + Cream",
      mood: "Clean · Summer · Relaxed",
      pieces: ["Forest-green tee or shirt", "Cream/off-white trousers", "Brown sandals or white trainers", "Black belt when tucked"],
      why: "Green is already present in your wardrobe and the new references show it works best when lifted by a light neutral lower half."
    },
    {
      id: "black-light-denim",
      name: "Black + Light Denim",
      mood: "Casual · Modern · Easy",
      pieces: ["Black tee or fine knit", "Light-wash relaxed jeans", "White trainers", "Optional cap and brown tote"],
      why: "A simple high-confidence combination. The washed denim softens the black top and makes the look more relaxed than black-on-black."
    },
    {
      id: "black-cream-sandal",
      name: "Black + Cream + Sandal",
      mood: "Warm-weather minimal",
      pieces: ["Black fitted tee", "Cream relaxed trousers", "Brown leather sandals", "Black belt"],
      why: "This keeps the top visually sharp while the relaxed cream trousers and sandals make it summer-appropriate."
    },
    {
      id: "teal-washed-grey",
      name: "Teal + Washed Grey",
      mood: "Moody · Relaxed · Evening",
      pieces: ["Deep teal or green shirt", "Washed charcoal/grey relaxed jeans", "Black shoes", "Dark brown tote"],
      why: "A darker tonal direction for evenings. The muted green and washed grey combination is softer and more distinctive than default black-on-black."
    }
  ]
} as const;

export type StyleProfile = typeof styleProfile;
