import { getCloudConfig, getSupabaseBrowser } from "@/lib/supabase-browser";
import { prepareImportPhoto } from "@/lib/outfit-import";

export type PersonalItem = {
  id: string; user_id: string; client_item_id?: string; name: string; brand: string; category: string; subcategory: string;
  size: string; fit: string; primary_colour: string; material: string; notes: string;
  status: string; occasions: string[]; revision: number; photo_id: string | null;
  deleted_at: string | null; created_at: string; updated_at: string;
};
export type ItemDraft = Pick<PersonalItem, "name" | "brand" | "category" | "subcategory" | "size" | "fit" | "primary_colour" | "material" | "notes" | "status" | "occasions">;
export type PrivatePhoto = { id: string; item_id: string; user_id: string; path: string; state: "staged" | "current" | "removing" };
export const emptyDraft = (): ItemDraft => ({ name: "", brand: "", category: "tops", subcategory: "", size: "", fit: "unknown", primary_colour: "", material: "", notes: "", status: "available", occasions: [] });
export class WardrobeError extends Error {
  constructor(message: string, public kind: "setup" | "conflict" | "network" | "auth" = "network") { super(message); }
}

// Every request in an operation uses this exact verified token, never whatever
// account the singleton may have switched to during a multi-step photo operation.
export async function personalSession(userId: string, signal: AbortSignal) {
  const client = getSupabaseBrowser(), config = getCloudConfig();
  if (!client || !config) throw new WardrobeError("Sign in to open your personal wardrobe.", "auth");
  const { data, error } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token || data.session?.user.id !== userId) throw new WardrobeError("Sign in again to continue.", "auth");
  const verified = await client.auth.getUser(token);
  if (verified.error || verified.data.user?.id !== userId || signal.aborted) throw new WardrobeError("Your account changed. Reopen your wardrobe.", "auth");
  async function request(path: string, init: RequestInit = {}) {
    signal.throwIfAborted();
    let response: Response;
    try {
      response = await fetch(`${config!.url}${path}`, { ...init, signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]), cache: "no-store", headers: { apikey: config!.anonKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers } });
    } catch { throw new WardrobeError("Cloud sync could not be confirmed. Keep your changes here, reconnect and reload before retrying."); }
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401) throw new WardrobeError("Sign in again to continue.", "auth");
      if (result?.code === "40001" || result?.code === "23505") throw new WardrobeError("This item changed in another session. Reload and review the latest version before saving again.", "conflict");
      if (["42P01", "42703", "PGRST202", "PGRST204", "PGRST205"].includes(result?.code)) throw new WardrobeError("Personal wardrobe setup is pending. Apply the wardrobe database setup, then retry.", "setup");
      throw new WardrobeError("The cloud operation could not be confirmed. Reload and retry. Photo cleanup may still be pending.");
    }
    signal.throwIfAborted();
    return result;
  }
  const rpc = (name: string, body: object) => request(`/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify(body) });
  function ownedItem(row: PersonalItem) {
    if (!row || row.user_id !== userId || typeof row.id !== "string" || !Number.isInteger(row.revision)) throw new WardrobeError("Your wardrobe could not be verified.");
    return row;
  }
  return {
    async list(page: number) {
      const rows = await request(`/rest/v1/wardrobe_items?select=*&user_id=eq.${userId}&order=created_at.desc,id.desc&offset=${page * 20}&limit=21`);
      if (!Array.isArray(rows)) throw new WardrobeError("Your wardrobe could not be loaded.");
      return rows.map(ownedItem) as PersonalItem[];
    },
    async photos(itemId?: string | string[]): Promise<PrivatePhoto[]> {
      const rows = await request(`/rest/v1/wardrobe_photos?select=*&user_id=eq.${userId}${Array.isArray(itemId) ? `&item_id=in.(${itemId.join(",")})` : itemId ? `&item_id=eq.${itemId}` : ""}&order=created_at.desc&limit=1000`);
      if (!Array.isArray(rows) || rows.some(p => p.user_id !== userId || p.path !== `${userId}/${p.item_id}/${p.id}.jpg`)) throw new WardrobeError("Your photos could not be verified.");
      return rows;
    },
    async save(id: string, revision: number, draft: ItemDraft): Promise<PersonalItem> {
      return ownedItem(await rpc("save_wardrobe_item", { p_id: id, p_revision: revision, p_item: draft }));
    },
    async importCatalogue(sourceId: string, metadata: ItemDraft & { secondary_colours: string[]; seasons: string[]; pattern: string; wear_count: number; last_worn_date: string | null }) {
      if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(sourceId)) throw new WardrobeError("Invalid catalogue item.");
      const key = `catalog:v1:${sourceId}`;
      // DO NOTHING on the owner's stable source key: retries never overwrite edits.
      const rows = await request("/rest/v1/wardrobe_items?on_conflict=user_id,client_item_id", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=representation" }, body: JSON.stringify({ ...metadata, user_id: userId, client_item_id: key }) });
      if (!Array.isArray(rows) || rows.length > 1) throw new WardrobeError("Import could not be confirmed. Retry the same selection.");
      if (rows.length) {
        if (rows[0].client_item_id !== key) throw new WardrobeError("Imported item source could not be verified.");
        return { item: ownedItem(rows[0]), created: true };
      }
      const existing = await request(`/rest/v1/wardrobe_items?select=*&user_id=eq.${userId}&client_item_id=eq.${encodeURIComponent(key)}&limit=1`);
      if (!Array.isArray(existing) || existing.length !== 1) throw new WardrobeError("Existing import could not be confirmed. Reload before retrying.");
      if (existing[0].client_item_id !== key) throw new WardrobeError("Existing import source could not be verified.");
      return { item: ownedItem(existing[0]), created: false };
    },
    async signedPhoto(photo: PrivatePhoto) {
      if (photo.user_id !== userId || photo.state !== "current") throw new WardrobeError("Photo unavailable.");
      const result = await request(`/storage/v1/object/sign/wardrobe-private/${photo.path}`, { method: "POST", body: JSON.stringify({ expiresIn: 60 }) });
      // Only accept the project's own Storage endpoint; never render an arbitrary URL.
      const signed = result?.signedURL;
      if (typeof signed !== "string") throw new WardrobeError("Photo preview unavailable.");
      const url = new URL(signed.startsWith("/object/") ? `${config.url}/storage/v1${signed}` : signed, config.url);
      if (url.origin !== new URL(config.url).origin || !url.pathname.startsWith("/storage/v1/object/sign/wardrobe-private/")) throw new WardrobeError("Photo preview unavailable.");
      return url.href;
    },
    async upload(item: PersonalItem, file: File) {
      const prepared = await prepareImportPhoto(file);
      signal.throwIfAborted();
      const blob = await (await fetch(prepared.data)).blob();
      const id = crypto.randomUUID();
      const photo = await rpc("wardrobe_photo_action", { p_item_id: item.id, p_photo_id: id, p_revision: item.revision, p_action: "stage" }) as PrivatePhoto;
      if (photo.user_id !== userId || photo.path !== `${userId}/${item.id}/${id}.jpg`) throw new WardrobeError("Photo reservation could not be verified.");
      await request(`/storage/v1/object/wardrobe-private/${photo.path}`, { method: "POST", body: blob, headers: { "Content-Type": "image/jpeg", "cache-control": "max-age=0", "x-upsert": "false" } });
      return ownedItem(await rpc("wardrobe_photo_action", { p_item_id: item.id, p_photo_id: id, p_revision: item.revision, p_action: "attach" }));
    },
    async removePhoto(item: PersonalItem, photo: PrivatePhoto) {
      await rpc("wardrobe_photo_action", { p_item_id: item.id, p_photo_id: photo.id, p_revision: item.revision, p_action: "remove" });
      await request("/storage/v1/object/wardrobe-private", { method: "DELETE", body: JSON.stringify({ prefixes: [photo.path] }) });
      await rpc("wardrobe_photo_action", { p_item_id: item.id, p_photo_id: photo.id, p_revision: item.revision, p_action: "finish" });
    },
    async beginDelete(item: PersonalItem) { await rpc("delete_wardrobe_item", { p_id: item.id, p_revision: item.revision, p_finish: false }); },
    async finishDelete(item: PersonalItem) { await rpc("delete_wardrobe_item", { p_id: item.id, p_revision: item.revision, p_finish: true }); }
  };
}
