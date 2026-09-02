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
  imageUrl?: string;
  imageAlt?: string;
  availability?: string;
  productCode?: string;
};

export const shopSuggestions: ShopSuggestion[] = [
  {
    id: "next-stone-tapered-chinos",
    retailer: "NEXT",
    name: "Stone Regular Tapered Fit Stretch Chinos",
    category: "trousers",
    colour: "Stone",
    priceLabel: "€32",
    match: 97,
    pairsWith: ["grey-linen-shirt", "white-textured-shirt", "cream-pocket-tee", "adidas-white-black"],
    reason: "Stone trousers are the most useful missing bridge between your white/cream shirts and darker tops. They recreate several of your saved smart-casual references without becoming formal.",
    href: "https://www.next.ie/en/style/st525777/ag4042",
    sourceType: "product",
    checkedAt: "2026-09-02",
    availability: "Listed on NEXT Ireland when checked",
    productCode: "AG4-042",
    imageUrl: "https://xcdn.next.co.uk/common/items/default/default/itemimages/3_4Ratio/product/lge/AG4042s.jpg",
    imageAlt: "NEXT stone tapered fit chinos"
  },
  {
    id: "hm-black-relaxed-shorts",
    retailer: "H&M",
    name: "Relaxed Fit Shorts",
    category: "shorts",
    colour: "Black",
    priceLabel: "€29.99",
    match: 96,
    pairsWith: ["grey-linen-shirt", "white-textured-shirt", "puma-white-green"],
    reason: "This is the closest ready-made version of the relaxed dark-short silhouette already visible in your outfits. It keeps the look clean rather than sporty.",
    href: "https://www2.hm.com/en_ie/productpage.1265992001.html",
    sourceType: "product",
    checkedAt: "2026-09-02",
    availability: "Listed on H&M Ireland when checked",
    productCode: "1265992001"
  },
  {
    id: "zara-white-linen-shirt",
    retailer: "Zara",
    name: "100% Linen Regular Fit Shirt",
    category: "shirt",
    colour: "White",
    priceLabel: "€45.95",
    match: 95,
    pairsWith: ["grey-jeans", "black-jeans", "olive-cargo", "adidas-white-black"],
    reason: "Your strongest repeated look is a breathable light shirt with a relaxed collar and rolled sleeves. This current Zara linen shirt is a direct extension of that pattern.",
    href: "https://www.zara.com/ie/en/100-linen-regular-fit-shirt-p01063410.html",
    sourceType: "product",
    checkedAt: "2026-09-02",
    availability: "Add-to-bag listing visible on Zara Ireland when checked",
    productCode: "1063/410/250"
  },
  {
    id: "uniqlo-cotton-linen-shirt-jacket",
    retailer: "UNIQLO",
    name: "Cotton Linen Blend Shirt Jacket",
    category: "overshirt",
    colour: "Beige / Natural",
    priceLabel: "€29.90",
    sale: "Reduced from €49.90 when checked",
    match: 94,
    pairsWith: ["white-tee", "grey-jeans", "black-jeans", "puma-white-green"],
    reason: "A lightweight natural overshirt gives you the same easy layering effect as your current cream and beige pieces without becoming too formal.",
    href: "https://www.uniqlo.com/eu-ie/en/products/E482443-000/00?colorDisplayCode=69",
    sourceType: "product",
    checkedAt: "2026-09-02",
    availability: "Listed on UNIQLO Ireland when checked",
    productCode: "482443",
    imageUrl: "https://image.uniqlo.com/UQ/ST3/eu/imagesgoods/482443/feature/eugoods_482443_feature1.jpg",
    imageAlt: "UNIQLO cotton linen blend shirt jacket"
  },
  {
    id: "zara-relaxed-trousers",
    retailer: "Zara",
    name: "Relaxed Fit Pleated / Linen Trousers",
    category: "trousers",
    colour: "Charcoal / Stone",
    priceLabel: "from €35.95",
    match: 93,
    pairsWith: ["white-textured-shirt", "grey-linen-shirt", "cream-pocket-tee", "adidas-white-burgundy"],
    reason: "A slightly fuller charcoal or stone trouser preserves your dark-bottom preference while giving the silhouette more polish than denim.",
    href: "https://www.zara.com/ie/en/man-trousers-l838.html",
    sourceType: "category",
    checkedAt: "2026-09-02",
    availability: "Current Zara Ireland trouser range"
  },
  {
    id: "cos-beige-overshirt",
    retailer: "COS",
    name: "Contrast-Panel Cotton Overshirt",
    category: "overshirt",
    colour: "Beige",
    priceLabel: "€129",
    match: 92,
    pairsWith: ["white-tee", "black-jeans", "grey-jeans", "adidas-white-black"],
    reason: "The relaxed beige utility shape fits directly into your existing neutral layering system and is more refined than adding another graphic layer.",
    href: "https://www.cos.com/en-ie/men/menswear/shirts/cottonshirts/product/contrast-panel-cotton-overshirt-beige-1326530001",
    sourceType: "product",
    checkedAt: "2026-09-02",
    availability: "Listed on COS Ireland when checked",
    productCode: "1326530001"
  },
  {
    id: "mango-linen-shirt",
    retailer: "MANGO",
    name: "Regular-fit 100% Linen Shirt",
    category: "shirt",
    colour: "Natural / Sand",
    priceLabel: "€40.00",
    sale: "33% off when checked",
    match: 90,
    pairsWith: ["grey-jeans", "black-jeans", "light-grey-denim-shorts", "timberland-brown"],
    reason: "Mango's linen shirt gives you the same relaxed shirt language with a slightly cleaner, more grown-up finish.",
    href: "https://shop.mango.com/ie/en/p/men/shirts/linen/regular-fit-100-linen-shirt/27085939/57/00",
    sourceType: "product",
    checkedAt: "2026-09-02",
    availability: "Last-few-items / notify-me state when checked",
    productCode: "27085939"
  }
];
