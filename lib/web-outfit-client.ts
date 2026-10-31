import { getSupabaseBrowser, getCloudConfig } from "@/lib/supabase-browser";
import type { Brief, Outfit } from "@/lib/outfit-planner";
import type { MannequinBoard } from "@/lib/outfit-visuals";
export type WebOutfit = { title: string; description: string; pieces: string[]; sourceUrls: string[]; ticket: string; checkedAt: string };
export function webOutfitsEnabled() { return process.env.NEXT_PUBLIC_OUTFIT_VISUALS_ENABLED === "true"; }
async function invoke(payload: unknown, signal: AbortSignal) {
  if (!webOutfitsEnabled()) throw new Error("Web outfit search and new mannequin generation are not connected yet.");
  const client = getSupabaseBrowser(), config = getCloudConfig();
  if (!client || !config) throw new Error("Sign in to use web outfit search and generation.");
  const { data: identity, error } = await client.auth.getUser();
  if (error || !identity.user) throw new Error("Sign in to use web outfit search and generation.");
  const { data } = await client.auth.getSession();
  if (!data.session) throw new Error("Sign in again to continue.");
  const response = await fetch(`${config.url}/functions/v1/outfit-visuals`, {
    method: "POST", signal,
    headers: { "Content-Type": "application/json", apikey: config.anonKey, Authorization: `Bearer ${data.session.access_token}` },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    if (response.status === 429) throw new Error("Daily web outfit allowance reached. Please try again tomorrow.");
    if (response.status === 401) throw new Error("Sign in again to continue.");
    if (response.status === 503) throw new Error("Web outfit search and image generation need server configuration.");
    throw new Error("This web outfit request could not be completed. Try again later.");
  }
  return response.json();
}
function safeUrl(value: unknown): value is string { try { return typeof value === "string" && new URL(value).protocol === "https:"; } catch { return false; } }
export async function searchWebOutfits(brief: Brief, outfit: Outfit, signal: AbortSignal): Promise<WebOutfit[]> {
  const data = await invoke({ action: "search", consent: true, brief: { event: brief.event, dressCode: brief.dressCode, setting: brief.setting, weather: brief.weather, excluded: brief.excluded, preferredColour: brief.preferredColour, comfort: brief.comfort, covered: brief.covered }, pieces: outfit.items.map(item => `${item.name} (${item.category}, ${item.colour})`) }, signal);
  if (!Array.isArray(data.outfits) || data.outfits.length > 5) throw new Error("The service returned invalid outfit suggestions.");
  return data.outfits.filter((value: WebOutfit) => typeof value.title === "string" && typeof value.description === "string" && Array.isArray(value.pieces) && value.pieces.every(piece => typeof piece === "string") && Array.isArray(value.sourceUrls) && value.sourceUrls.length > 0 && value.sourceUrls.every(safeUrl) && typeof value.ticket === "string" && typeof value.checkedAt === "string");
}
export async function renderWebOutfit(ticket: string, signal: AbortSignal): Promise<MannequinBoard> {
  const data = await invoke({ action: "render", ticket }, signal);
  const board = data.board;
  if (!board || typeof board.asset !== "string" || !board.asset.startsWith("data:image/png;base64,") || board.asset.length > 12000000 || typeof board.label !== "string" || !Number.isInteger(board.width) || !Number.isInteger(board.height) || board.width < 100 || board.height < 100 || !Array.isArray(board.frames) || board.frames.length !== 5 || !board.frames.every((f: unknown) => Array.isArray(f) && f.length === 4 && f.every(Number.isFinite) && f[0] >= 0 && f[1] >= 0 && f[2] > 0 && f[3] > 0 && f[0] + f[2] <= board.width && f[1] + f[3] <= board.height)) throw new Error("The mannequin image response was invalid.");
  return board;
}
