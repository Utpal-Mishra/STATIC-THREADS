export type ShopSuggestion = {
  id: string;
  retailer: string;
  name: string;
  category: "shirt" | "overshirt" | "trousers" | "shorts" | "shoes";
  colour: string;
  priceLabel: string;
  match: number;
  pairsWith: string[];
  reason: string;
  href: string;
  sourceType: "product" | "category";
  checkedAt: string;
  sale?: string;
};

export const shopSuggestions: ShopSuggestion[] = [
  {
    id: "hm-black-relaxed-shorts",
    retailer: "H&M",
    name: "Relaxed Fit Shorts",
    category: "shorts",
    colour: "Black",
    priceLabel: "€8.99",
    sale: "70% off when checked",
    match: 96,
    pairsWith: ["grey-linen-shirt", "white-textured-shirt", "puma-white-green"],
    reason: "This is the closest ready-made version of the relaxed dark-short silhouette already visible in your outfits. It keeps the look clean rather than sporty.",
    href: "https://www2.hm.com/en_ie/productpage.1265992001.html",
    sourceType: "product",
    checkedAt: "2026-08-28"
  },
  {
    id: "zara-white-textured-shirt",
    retailer: "Zara",
    name: "Textured / Linen Relaxed Shirt",
    category: "shirt",
    colour: "White / Off-white",
    priceLabel: "from €29.95",
    match: 95,
    pairsWith: ["grey-jeans", "black-jeans", "olive-cargo", "adidas-white-black"],
    reason: "Your strongest repeated look is a breathable light shirt with a relaxed collar and rolled sleeves. Zara currently lists textured and linen relaxed-fit options in this family.",
    href: "https://www.zara.com/ie/en/man-shirts-white-l1753.html?v1=1282807",
    sourceType: "category",
    checkedAt: "2026-08-28"
  },
  {
    id: "zara-relaxed-trousers",
    retailer: "Zara",
    name: "Relaxed Fit Pleated Trousers",
    category: "trousers",
    colour: "Charcoal / Stone",
    priceLabel: "around €49.95",
    match: 93,
    pairsWith: ["white-textured-shirt", "grey-linen-shirt", "cream-pocket-tee", "adidas-white-burgundy"],
    reason: "A slightly fuller charcoal or stone trouser would preserve your dark-bottom preference while giving the silhouette more polish than denim.",
    href: "https://www.zara.com/ie/en/man-trousers-l838.html",
    sourceType: "category",
    checkedAt: "2026-08-28"
  },
  {
    id: "cos-beige-overshirt",
    retailer: "COS",
    name: "Contrast-Panel Cotton Overshirt",
    category: "overshirt",
    colour: "Beige",
    priceLabel: "€58",
    sale: "reduced from €129 when checked",
    match: 92,
    pairsWith: ["white-tee", "black-jeans", "grey-jeans", "adidas-white-black"],
    reason: "The relaxed beige utility shape fits directly into your existing neutral layering system and is more refined than adding another graphic layer.",
    href: "https://www.cos.com/en-ie/men/menswear/shirts/cottonshirts/product/contrast-panel-cotton-overshirt-beige-1326530001",
    sourceType: "product",
    checkedAt: "2026-08-28"
  },
  {
    id: "uniqlo-cotton-linen-shirt-jacket",
    retailer: "UNIQLO",
    name: "Cotton Linen Blend Shirt Jacket",
    category: "overshirt",
    colour: "Beige / Natural",
    priceLabel: "€29.90 when checked",
    match: 91,
    pairsWith: ["white-tee", "grey-jeans", "black-jeans", "puma-white-green"],
    reason: "A lightweight natural overshirt gives you the same easy layering effect as your current cream and beige pieces without becoming too formal.",
    href: "https://www.uniqlo.com/eu-ie/en/men/shirts-and-polos?colorCodes=COL30%2CCOL31%2CCOL32&tagSleeveLength=long-sleeve",
    sourceType: "category",
    checkedAt: "2026-08-28"
  },
  {
    id: "mango-linen-shirt",
    retailer: "MANGO",
    name: "100% Linen Shirt",
    category: "shirt",
    colour: "White / Sand / Charcoal",
    priceLabel: "€59.99",
    match: 89,
    pairsWith: ["grey-jeans", "black-jeans", "light-grey-denim-shorts", "timberland-brown"],
    reason: "Mango's linen edit is useful when you want the same relaxed shirt language with a slightly cleaner, more grown-up finish.",
    href: "https://shop.mango.com/ie/en/c/men/shirts/85ceefeb",
    sourceType: "category",
    checkedAt: "2026-08-28"
  }
];
