import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { PlannerItem } from "@/lib/outfit-planner";

type Row = Record<string, unknown>;
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
export function mapWardrobeRow(row: Row): PlannerItem {
  if (typeof row.id !== "string" || typeof row.name !== "string" || typeof row.category !== "string") throw new Error("Invalid wardrobe record");
  return { id: row.id, name: row.name, category: row.category, subcategory: String(row.subcategory || ""), colour: String(row.primary_colour || "Unknown"), secondaryColours: strings(row.secondary_colours), material: String(row.material || "Unknown"), occasions: strings(row.occasions), status: String(row.status || "unavailable") };
}
async function verifiedClient(userId: string) {
  const client = getSupabaseBrowser();
  if (!client) throw new Error("Account service unavailable");
  const { data, error } = await client.auth.getUser();
  if (error || data.user?.id !== userId) throw new Error("Sign in again to access your wardrobe");
  return client;
}
export async function loadPersonalWardrobe(userId: string, signal: AbortSignal) {
  const client = await verifiedClient(userId);
  const { data, error } = await client.from("wardrobe_items")
    .select("id,user_id,name,category,subcategory,primary_colour,secondary_colours,material,occasions,status")
    .eq("user_id", userId).order("id").limit(500).abortSignal(signal);
  if (error) throw error;
  if ((data ?? []).some(row => row.user_id !== userId)) throw new Error("Wardrobe owner mismatch");
  return (data ?? []).map(mapWardrobeRow);
}
export async function recordPersonalOutfit(userId: string, itemIds: string[], action: "saved" | "worn", occasion: string) {
  const client = await verifiedClient(userId);
  // Recheck ownership and availability when writing; do not trust old UI selections.
  const { data, error } = await client.from("wardrobe_items").select("id,user_id,status").eq("user_id", userId).in("id", itemIds);
  if (error || !data || data.length !== itemIds.length || data.some(row => row.user_id !== userId || row.status !== "available")) throw new Error("These pieces are no longer available in your wardrobe");
  const result = await client.from("outfit_events").insert({ user_id: userId, item_ids: itemIds, action, occasion });
  if (result.error) throw result.error;
}

const DEMO_KEY = "static-threads-outfit-chat-demo-v1";
export type DemoActions = { version: 1; saved: string[]; worn: Array<{ outfit: string; date: string }> };
export function readDemoActions(): DemoActions {
  try {
    const value = JSON.parse(localStorage.getItem(DEMO_KEY) || "null");
    if (value?.version === 1 && Array.isArray(value.saved) && Array.isArray(value.worn)) return { version: 1, saved: value.saved.filter((s: unknown) => typeof s === "string").slice(-100), worn: value.worn.filter((x: { outfit?: unknown; date?: unknown }) => typeof x?.outfit === "string" && typeof x?.date === "string").slice(-100) };
  } catch { /* Missing/corrupt/blocked storage is handled when writing. */ }
  return { version: 1, saved: [], worn: [] };
}
export function recordDemoOutfit(outfit: string, action: "saved" | "worn") {
  const current = readDemoActions();
  if (action === "saved") current.saved = [...new Set([...current.saved, outfit])].slice(-100);
  else current.worn = [...current.worn, { outfit, date: new Date().toISOString() }].slice(-100);
  localStorage.setItem(DEMO_KEY, JSON.stringify(current));
  return current;
}
