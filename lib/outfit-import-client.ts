import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { importKey, uniqueCandidates, validateCandidates, type GarmentCandidate, type ImportPhoto } from "@/lib/outfit-import";
export const recognitionEnabled = () => process.env.NEXT_PUBLIC_OUTFIT_IMPORT_ENABLED === "true";
async function verified(userId: string) {
  const client = getSupabaseBrowser(); if (!client) throw new Error("Account service is not connected. You can keep pieces in this session.");
  const { data, error } = await client.auth.getUser(); if (error || data.user?.id !== userId) throw new Error("Sign in again before continuing.");
  return client;
}
export async function detectGarments(photo: ImportPhoto, userId: string, signal: AbortSignal) {
  if (!recognitionEnabled()) throw new Error("Automatic recognition is not connected yet. Add and review pieces manually.");
  const client = await verified(userId); const { data } = await client.auth.getSession();
  if (!data.session) throw new Error("Sign in again before continuing.");
  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/outfit-import`, { method: "POST", signal, headers: { "Content-Type": "application/json", apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ consent: true, image: photo.data }) });
  if (!response.ok) throw new Error(response.status === 429 ? "Your daily photo allowance is used. Add pieces manually or try tomorrow." : response.status === 401 ? "Sign in again before recognizing garments." : "Recognition is unavailable. Your photo has not been saved; add pieces manually or retry.");
  return validateCandidates((await response.json()).candidates);
}
export async function saveImportedGarments(photo: ImportPhoto, items: GarmentCandidate[], userId: string) {
  const client = await verified(userId);
  const chosen = uniqueCandidates(photo.hash, validateCandidates(items).map((v, i) => ({ ...v, id: items[i].id })));
  if (!chosen.length) throw new Error("Select at least one reviewed item.");
  const { data, error } = await client.rpc("import_outfit_items", { p_items: chosen.map(item => ({ client_item_id: importKey(photo.hash, item), name: item.name, category: item.category, primary_colour: item.colour, subcategory: item.detail })) });
  if (error || !Array.isArray(data) || data.length !== chosen.length || data.some(row => row.user_id !== userId || typeof row.id !== "string")) throw new Error("Saving could not be confirmed. Keep this page open and retry; the same reviewed items will not be inserted twice.");
  return data;
}
export async function loadImportedGarments(userId: string, signal: AbortSignal) {
  const client = await verified(userId);
  const { data, error } = await client.from("wardrobe_items").select("id,user_id,name,category,primary_colour").eq("user_id", userId).like("client_item_id", "photo:%").order("created_at", { ascending: false }).limit(100).abortSignal(signal);
  if (error || (data ?? []).some(row => row.user_id !== userId)) throw new Error("Your imported wardrobe items could not be loaded.");
  return data ?? [];
}
