import { verifiedWardrobeRequest } from "@/lib/personal-wardrobe";

export type OutfitAction = "saved" | "liked" | "worn";
export type OutfitEvent = {
  id: string;
  item_ids: string[];
  action: OutfitAction;
  occasion: string | null;
  created_at: string;
};

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const PAGE_SIZE = 25;

function canonicalIds(ids: string[]) {
  if (!Array.isArray(ids) || !ids.length || ids.length > 20 || !ids.every(id => UUID.test(id))) {
    throw new Error("This outfit has invalid clothing references.");
  }
  return [...new Set(ids.map(id => id.toLowerCase()))].sort();
}

export function outfitKey(ids: string[]) {
  return canonicalIds(ids).join("|");
}

async function collectionId(userId: string, action: OutfitAction, ids: string[]) {
  // A stable UUID lets separate devices safely insert the same collection entry.
  const data = new TextEncoder().encode(JSON.stringify(["static-threads-outfit-v1", userId, action, ids]));
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", data)).slice(0, 16);
  bytes[6] = (bytes[6] & 15) | 128;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}

export async function outfitLibrary(userId: string, signal: AbortSignal) {
  if (!UUID.test(userId)) throw new Error("Sign in to access your outfits.");
  const { request } = await verifiedWardrobeRequest(userId, signal);
  const events = "/rest/v1/outfit_events";
  const owner = `user_id=eq.${userId}`;
  function matching(action: OutfitAction, ids: string[]) {
    const array = encodeURIComponent(`{${ids.join(",")}}`);
    return `${owner}&action=eq.${action}&item_ids=cs.${array}&item_ids=cd.${array}`;
  }
  async function ownedRows(path: string) {
    const rows = await request(path);
    if (!Array.isArray(rows) || rows.some(row => row?.user_id !== userId)) {
      throw new Error("Your outfit data could not be verified.");
    }
    return rows;
  }
  return {
    async page(action: OutfitAction, cursor?: OutfitEvent) {
      const after = cursor
        ? `&or=(created_at.lt.${encodeURIComponent(cursor.created_at)},and(created_at.eq.${encodeURIComponent(cursor.created_at)},id.lt.${cursor.id}))`
        : "";
      const rows = await ownedRows(`${events}?select=id,user_id,item_ids,action,occasion,created_at&${owner}&action=eq.${action}&order=created_at.desc,id.desc&limit=${PAGE_SIZE + 1}${after}`);
      const entries = rows.slice(0, PAGE_SIZE).map((row): OutfitEvent => {
        if (!UUID.test(row.id) || row.action !== action || typeof row.created_at !== "string" || !Number.isFinite(Date.parse(row.created_at))) {
          throw new Error("An outfit record could not be verified.");
        }
        return { id: row.id, action, item_ids: canonicalIds(row.item_ids), occasion: typeof row.occasion === "string" ? row.occasion : null, created_at: row.created_at };
      });
      const ids = [...new Set(entries.flatMap(entry => entry.item_ids))];
      const batches = [];
      for (let i = 0; i < ids.length; i += 50) {
        batches.push(ownedRows(`/rest/v1/wardrobe_items?select=id,user_id,name,status&${owner}&deleted_at=is.null&id=in.(${ids.slice(i, i + 50).join(",")})`));
      }
      const pieces = (await Promise.all(batches)).flat();
      const names = Object.fromEntries(pieces.filter(row => UUID.test(row.id) && typeof row.name === "string").map(row => [row.id, row.name as string]));
      return { entries, names, next: rows.length > PAGE_SIZE ? entries.at(-1) : undefined };
    },
    async record(action: OutfitAction, itemIds: string[], occasion: string, wearId?: string) {
      const ids = canonicalIds(itemIds);
      const id = action === "worn" ? (wearId ?? crypto.randomUUID()) : await collectionId(userId, action, ids);
      if (!UUID.test(id)) throw new Error("Invalid outfit action.");
      const find = `${events}?select=id,user_id&${matching(action, ids)}${action === "worn" ? `&id=eq.${id}` : ""}&limit=1`;
      if (action !== "worn" && (await ownedRows(find)).length) return;
      const wardrobe = await ownedRows(`/rest/v1/wardrobe_items?select=id,user_id,status&${owner}&deleted_at=is.null&id=in.(${ids.join(",")})`);
      const available = new Set(wardrobe.filter(row => action === "liked" || row.status === "available").map(row => row.id));
      if (!ids.every(piece => available.has(piece))) {
        if (action === "worn" && (await ownedRows(find)).length) return;
        throw new Error("Some pieces are no longer available in your wardrobe.");
      }
      try {
        await request(events, { method: "POST", body: JSON.stringify({ id, user_id: userId, item_ids: ids, action, occasion }) });
      } catch (error) {
        if ((error as { code?: string }).code !== "23505" || !(await ownedRows(find)).length) throw error;
      }
    },
    async remove(action: "saved" | "liked", itemIds: string[]) {
      await request(`${events}?${matching(action, canonicalIds(itemIds))}`, { method: "DELETE" });
    }
  };
}
