/** Local, deterministic planner. No external model, demographic inference or live weather. */
export type PlannerItem = {
  id: string; name: string; category: string; subcategory: string; colour: string;
  secondaryColours: string[]; material: string; occasions: string[]; status: string;
};
export type DressCode = "casual" | "smart-casual" | "formal" | "black-tie" | "active";
export type Brief = {
  event: string; dressCode: DressCode | null; setting: "indoors" | "outdoors" | null;
  weather: "cold" | "hot" | "mild" | "rain" | null; comfort: boolean; covered: boolean;
  excluded: string[]; preferredColour: string | null; anchorId: string | null;
};
export type Outfit = { id: string; items: PlannerItem[]; explanation: string; cautions: string[] };
export const emptyBrief = (): Brief => ({ event: "", dressCode: null, setting: null, weather: null, comfort: false, covered: false, excluded: [], preferredColour: null, anchorId: null });
const norm = (s: string) => s.toLowerCase().replace(/[_–—-]/g, " ").replace(/\s+/g, " ").trim();
const colours = ["black", "white", "navy", "blue", "grey", "gray", "cream", "beige", "brown", "green", "olive", "red", "pink", "purple", "yellow", "orange"];
const events: Array<[RegExp, string]> = [
  [/\bwedding\b/, "wedding"], [/\b(interview)\b/, "interview"], [/\b(office|work|meeting)\b/, "office"],
  [/\b(dinner|restaurant)\b/, "dinner"], [/\bdate\b/, "date"], [/\b(travel|airport|flight)\b/, "travel"],
  [/\b(party|birthday|celebration|diwali|eid|christmas)\b/, "celebration"], [/\b(graduation|ceremony)\b/, "ceremony"],
  [/\b(concert|festival)\b/, "concert"], [/\b(funeral|memorial)\b/, "memorial"], [/\b(gym|workout|sport)\b/, "workout"], [/\b(walk|hike)\b/, "walk"],
  [/\b(weekend|casual day)\b/, "weekend"]
];

export function updateBrief(previous: Brief, input: string, items: PlannerItem[]): Brief {
  const text = norm(input.slice(0, 600));
  const next = { ...previous, excluded: [...previous.excluded] };
  let matchedEvent = false;
  for (const [pattern, event] of events) if (pattern.test(text)) { next.event = event; matchedEvent = true; break; }
  if (!matchedEvent) {
    const named = text.match(/(?:plan (?:my |an? )?outfit for|event is) (.{2,80})/);
    if (named) next.event = named[1];
  }
  if (/\bblack tie\b/.test(text)) next.dressCode = "black-tie";
  else if (/\b(smart casual|business casual)\b/.test(text)) next.dressCode = "smart-casual";
  else if (/\b(formal|business formal)\b/.test(text)) next.dressCode = "formal";
  else if (/\b(casual|relaxed dress)\b/.test(text)) next.dressCode = "casual";
  else if (/\b(active|sportswear|athletic)\b/.test(text)) next.dressCode = "active";
  if (/\b(outdoor|outdoors|outside)\b/.test(text)) next.setting = "outdoors";
  else if (/\b(indoor|indoors|inside)\b/.test(text)) next.setting = "indoors";
  if (/\b(rain|rainy|wet)\b/.test(text)) next.weather = "rain";
  else if (/\b(cold|chilly|winter|freezing)\b/.test(text)) next.weather = "cold";
  else if (/\b(hot|warm|summer|sunny)\b/.test(text)) next.weather = "hot";
  else if (/\b(mild|dry|temperate)\b/.test(text)) next.weather = "mild";
  if (/\b(comfortable|comfort|walking|flat shoes)\b/.test(text)) next.comfort = true;
  if (/\b(modest|covered|coverage|long sleeves)\b/.test(text)) next.covered = true;
  if (/\b(clear preferences|no restrictions|reset preferences)\b/.test(text)) {
    next.excluded = []; next.anchorId = null; next.preferredColour = null; next.covered = false; next.comfort = false;
  }
  const terms = [...colours, "shorts", "jeans", "denim", "trainers", "sneakers", "heels", "sleeveless", "leather", "wool"];
  for (const term of terms) {
    if (new RegExp(`\\b(no|avoid|without|exclude) (?:any )?${term}\\b`).test(text)) next.excluded = [...new Set([...next.excluded, term])];
    if (new RegExp(`\\b(allow|include again) ${term}\\b`).test(text)) next.excluded = next.excluded.filter(entry => entry !== term);
  }
  for (const colour of colours) if (new RegExp(`\\b(prefer|like|include|with) (?:some )?${colour}\\b`).test(text)) next.preferredColour = colour;
  for (const item of items) {
    const name = norm(item.name);
    if (!name || !text.includes(name)) continue;
    if (text.includes(`no ${name}`) || text.includes(`avoid ${name}`) || text.includes(`without ${name}`)) {
      next.excluded = [...new Set([...next.excluded, name])];
      if (next.anchorId === item.id) next.anchorId = null;
    } else next.anchorId = item.id;
  }
  return next;
}

export function nextQuestion(brief: Brief): { text: string; options: string[] } | null {
  if (!brief.event) return { text: "What event are you dressing for? For example, an office day, wedding, dinner or travel.", options: ["Office", "Wedding", "Dinner", "Travel"] };
  if (!brief.dressCode) return { text: `What is the dress code for your ${brief.event}? I won't assume it from the event.`, options: ["Casual", "Smart casual", "Formal", "Black tie"] };
  if (!brief.setting) return { text: "Will you be indoors or outdoors? You can also tell me colours to avoid, a piece to build around or comfort preferences.", options: ["Indoors", "Outdoors"] };
  if (brief.setting === "outdoors" && !brief.weather) return { text: "What weather should I plan for? I use the conditions you provide, not a live forecast.", options: ["Cold", "Rainy", "Mild", "Hot"] };
  return null;
}

type Role = "top" | "bottom" | "one-piece" | "layer" | "shoes" | "other";
export function itemRole(item: PlannerItem): Role {
  const category = norm(item.category);
  if (["dress", "dresses", "jumpsuit", "jumpsuits", "one piece", "sets", "coordinated sets"].includes(category)) return "one-piece";
  if (["tops", "shirts", "knitwear", "blouses", "top"].includes(category)) return "top";
  if (["trousers", "jeans", "shorts", "skirts", "bottoms", "bottom"].includes(category)) return "bottom";
  if (["jackets", "coats", "outerwear", "layers"].includes(category)) return "layer";
  if (["shoes", "footwear"].includes(category)) return "shoes";
  return "other";
}
const matchesTerm = (text: string, term: string) => {
  if (["blue", "navy"].includes(term)) return /\b(blue|navy)\b/.test(text);
  if (["grey", "gray"].includes(term)) return /\b(grey|gray)\b/.test(text);
  if (["trainers", "sneakers"].includes(term)) return /\b(trainers|sneakers)\b/.test(text);
  return text.includes(term);
};
const itemText = (item: PlannerItem) => norm([item.name, item.category, item.subcategory, item.colour, ...item.secondaryColours, item.material].join(" "));
const isNeutral = (colour: string) => /\b(black|white|grey|gray|navy|cream|beige|brown|taupe|stone)\b/.test(norm(colour));

export function planOutfits(items: PlannerItem[], brief: Brief, seen: string[] = [], catalogueItemSets: readonly (readonly string[])[] = []): { outfits: Outfit[]; missing: string[]; message: string } {
  const formal = brief.dressCode === "formal" || brief.dressCode === "black-tie";
  const allowed = items.filter(item => {
    if (item.status !== "available") return false;
    const text = itemText(item);
    if (brief.excluded.some(term => matchesTerm(text, term))) return false;
    if (brief.covered && /\b(shorts|sleeveless|mini skirt|crop top)\b/.test(text)) return false;
    if (formal && !item.occasions.some(value => norm(value) === "formal" || norm(value) === "black tie")) return false;
    if (brief.dressCode === "black-tie" && itemRole(item) !== "shoes" && !item.occasions.some(value => norm(value) === "black tie")) return false;
    if (brief.dressCode === "smart-casual" && itemRole(item) !== "other" && !item.occasions.some(value => ["smart casual", "office", "formal"].includes(norm(value)))) return false;
    if (brief.dressCode === "active" && !item.occasions.some(value => /^(sport|active|workout)$/.test(norm(value)))) return false;
    return true;
  });
  const score = (item: PlannerItem) => {
    let value = 0;
    if (item.occasions.includes(brief.dressCode || "casual")) value += 6;
    if (item.occasions.includes(brief.event)) value += 3;
    if (brief.preferredColour && matchesTerm(norm(item.colour), brief.preferredColour)) value += 5;
    if (brief.comfort && /trainers|sneakers|flat|relaxed/.test(itemText(item))) value += 3;
    if (brief.weather === "hot" && /linen|cotton/.test(norm(item.material))) value += 3;
    return value;
  };
  const byRole = (role: Role) => {
    const sorted = allowed.filter(item => itemRole(item) === role).sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));
    const anchor = sorted.find(item => item.id === brief.anchorId);
    const shortlist = sorted.slice(0, 10);
    if (anchor && !shortlist.some(item => item.id === anchor.id)) shortlist[shortlist.length - 1] = anchor;
    return shortlist;
  };
  const tops = byRole("top"), bottoms = byRole("bottom"), pieces = byRole("one-piece"), shoes = byRole("shoes"), layers = byRole("layer");
  const needsLayer = brief.setting === "outdoors" && (brief.weather === "cold" || brief.weather === "rain");
  const missing: string[] = [];
  if (!pieces.length && !tops.length) missing.push("a suitable top or one-piece outfit");
  if (!pieces.length && !bottoms.length) missing.push("a suitable bottom or one-piece outfit");
  if (!shoes.length) missing.push("suitable footwear");
  if (needsLayer && !layers.length) missing.push("an outer layer for the conditions you provided");
  if (brief.anchorId && !allowed.some(item => item.id === brief.anchorId)) missing.push("your selected piece, which is unavailable or conflicts with your current preferences");
  if (missing.length) return { outfits: [], missing, message: `I can't build a complete ${brief.dressCode ?? "suitable"} outfit from the available items under these preferences. Missing: ${missing.join("; ")}. Change a preference or add suitable items to your wardrobe.` };
  const bases = [...pieces.map(piece => [piece]), ...tops.flatMap(top => bottoms.map(bottom => [top, bottom]))];
  const candidates: Array<{ items: PlannerItem[]; score: number; id: string }> = [];
  for (const base of bases) for (const shoe of shoes) for (const layer of needsLayer ? layers : [null]) {
    const set = [...base, shoe, ...(layer ? [layer] : [])];
    if (brief.anchorId && !set.some(item => item.id === brief.anchorId)) {
      const anchor = allowed.find(item => item.id === brief.anchorId);
      if (anchor && itemRole(anchor) === "other") set.push(anchor);
      else if (anchor && itemRole(anchor) === "layer" && !needsLayer) set.push(anchor);
      else continue;
    }
    const id = set.map(item => item.id).sort().join("|");
    if (seen.includes(id)) continue;
    const harmony = set.slice(0, 2).some(item => isNeutral(item.colour)) ? 2 : 0;
    candidates.push({ items: set, id, score: set.reduce((sum, item) => sum + score(item), harmony) });
  }
  // Prefer existing illustrated combinations only when every actual item still meets the brief.
  const byId = new Map(allowed.map(item => [item.id, item]));
  for (const ids of catalogueItemSets) {
    const seed = ids.map(id => byId.get(id));
    if (seed.some(item => !item) || new Set(ids).size !== ids.length) continue;
    const set = seed as PlannerItem[];
    const roles = set.map(itemRole);
    if (!(roles.includes("one-piece") || (roles.includes("top") && roles.includes("bottom"))) || !roles.includes("shoes") || (needsLayer && !roles.includes("layer")) || (brief.anchorId && !ids.includes(brief.anchorId))) continue;
    const id = [...ids].sort().join("|");
    if (seen.includes(id)) continue;
    const existing = candidates.find(candidate => candidate.id === id);
    if (existing) existing.score += 12;
    else candidates.push({ id, items: set, score: set.reduce((sum, item) => sum + score(item), 12) });
  }
  const choices = candidates.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const picked: typeof choices = [];
  for (const candidate of choices) {
    if (picked.some(entry => entry.id === candidate.id)) continue;
    // Prefer distinct base garments for the first alternatives rather than footwear-only swaps.
    const baseIds = candidate.items.filter(item => ["top", "bottom", "one-piece"].includes(itemRole(item))).map(item => item.id).join("|");
    if (picked.length && picked.some(entry => entry.items.filter(item => ["top", "bottom", "one-piece"].includes(itemRole(item))).map(item => item.id).join("|") === baseIds)) continue;
    picked.push(candidate);
    if (picked.length === 3) break;
  }
  if (!picked.length && choices.length) picked.push(choices[0]);
  const outfits = picked.map(choice => ({ id: choice.id, items: choice.items,
    explanation: `Built for your ${brief.event} using available wardrobe items${brief.dressCode ? ` and your ${brief.dressCode.replace(/-/g, " ")} brief` : ""}. ${choice.items.some(item => isNeutral(item.colour)) ? "Recorded neutral colours help connect the pieces." : "Compare the recorded colours to check the combination suits your preference."}${needsLayer ? " An outer layer is included." : ""}`,
    cautions: ["Suitability is a suggestion based on item metadata; confirm fit and the venue's dress code.", ...(brief.weather === "rain" ? ["Water resistance is not verified. Check your outerwear and footwear before going out."] : []), ...(brief.weather === "cold" ? ["Warmth is not verified. Check insulation and add layers if needed."] : []), ...(brief.covered ? ["Coverage is not fully recorded. Confirm lengths and sleeve coverage yourself."] : [])]
  }));
  return { outfits, missing: [], message: outfits.length ? `Here ${outfits.length === 1 ? "is one option" : `are ${outfits.length} options`} from this wardrobe. Tell me what to change, name a piece, or ask for another option.` : "I've reached the remaining combinations that meet this brief. Change a preference or start a new plan." };
}
