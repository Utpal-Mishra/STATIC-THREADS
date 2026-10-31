"use client";
import { useEffect, useRef, useState } from "react";
import { catalogueMannequin, type MannequinBoard } from "@/lib/outfit-visuals";
import { renderWebOutfit, searchWebOutfits, webOutfitsEnabled, type WebOutfit } from "@/lib/web-outfit-client";
import type { Brief, Outfit } from "@/lib/outfit-planner";
import { MannequinGallery } from "@/components/MannequinGallery";

type RenderState = { status: "waiting" | "rendering" | "ready" | "error"; board?: MannequinBoard; message?: string };
export function OutfitVisuals({ outfit, brief }: { outfit: Outfit; brief: Brief }) {
  const catalogue = catalogueMannequin(outfit.items);
  const [confirm, setConfirm] = useState(false);
  const [status, setStatus] = useState<"idle" | "searching" | "ready" | "error">("idle");
  const [message, setMessage] = useState("");
  const [results, setResults] = useState<WebOutfit[]>([]);
  const [renders, setRenders] = useState<Record<number, RenderState>>({});
  const request = useRef<AbortController | null>(null);
  const busy = useRef(false);
  useEffect(() => () => request.current?.abort(), []);
  async function render(index: number, result: WebOutfit, controller: AbortController) {
    if (controller.signal.aborted) return;
    setRenders(current => ({ ...current, [index]: { status: "rendering" } }));
    try {
      const board = await renderWebOutfit(result.ticket, controller.signal);
      if (!controller.signal.aborted) setRenders(current => ({ ...current, [index]: { status: "ready", board } }));
    } catch (error) {
      if (!controller.signal.aborted) setRenders(current => ({ ...current, [index]: { status: "error", message: error instanceof Error ? error.message : "Mannequin generation failed." } }));
    }
  }
  async function search() {
    if (busy.current) return;
    busy.current = true;
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setStatus("searching"); setMessage(""); setResults([]); setRenders({}); setConfirm(false);
    try {
      const found = await searchWebOutfits(brief, outfit, controller.signal);
      if (controller.signal.aborted) return;
      setResults(found); setStatus("ready");
      setMessage(found.length ? `${found.length} web outfit suggestion(s). These are inspiration, not owned wardrobe items.` : "No sufficiently sourced outfits were found for this request.");
      // Two requests at a time; each generates one full five-view outfit board.
      for (let index = 0; index < found.length && !controller.signal.aborted; index += 2) {
        await Promise.all(found.slice(index, index + 2).map((result, offset) => render(index + offset, result, controller)));
      }
    } catch (error) {
      if (!controller.signal.aborted) { setStatus("error"); setMessage(error instanceof Error ? error.message : "Web outfit search failed."); }
    } finally { if (request.current === controller) busy.current = false; }
  }
  return <div className="chat-outfit-visuals">
    {catalogue ? <MannequinGallery board={catalogue} /> : <>
      <p className="chat-visual-note">No matching mannequin set is available in the catalogue for this combination.</p>
      <button type="button" className="chat-web-outfit-button" disabled={status === "searching" || busy.current} onClick={() => setConfirm(true)}>Suggest top 5 outfits from the web</button>
      {confirm ? <div className="chat-web-consent">
        <p>Search for up to five sourced outfit ideas and generate a five-view mannequin interpretation for each suitable result?</p>
        <p>Your event brief and the garment descriptions in this option will be sent to the connected search/image provider. Photos and account details are not included. Provider usage may incur charges.</p>
        {!webOutfitsEnabled() ? <p role="status">This service is not connected yet. Catalogue previews remain available.</p> : null}
        <button type="button" disabled={!webOutfitsEnabled()} onClick={() => void search()}>Search and create mannequin previews</button><button type="button" onClick={() => setConfirm(false)}>Cancel</button>
      </div> : null}
    </>}
    {message ? <p className="chat-visual-note" role={status === "error" ? "alert" : "status"}>{message}</p> : null}
    {status === "searching" ? <p className="chat-visual-note" role="status">Searching for sourced outfit ideas…</p> : null}
    {results.map((result, index) => <section className="chat-web-result" key={`${result.title}-${index}`} aria-label={`Web outfit ${index + 1}`}>
      <h4>Web outfit {index + 1}: {result.title}</h4><p>{result.description}</p><ul>{result.pieces.map((piece, i) => <li key={i}>{piece}</li>)}</ul>
      <p className="chat-visual-note">Checked {result.checkedAt}. Stock, prices and styling may change.</p>
      <div className="chat-web-sources">{result.sourceUrls.map((url, i) => <a key={url} href={url} target="_blank" rel="noreferrer">Source {i + 1}: {new URL(url).hostname}</a>)}</div>
      {renders[index]?.board ? <MannequinGallery board={renders[index].board!} generated /> : <p className="chat-visual-note" role="status">{renders[index]?.status === "error" ? renders[index].message : renders[index]?.status === "rendering" ? "Creating this outfit's five-view mannequin board…" : "Mannequin preview queued…"}</p>}
      {renders[index]?.status === "error" ? <button type="button" onClick={() => { if (request.current && !request.current.signal.aborted) void render(index, result, request.current); }}>Retry mannequin preview</button> : null}
    </section>)}
  </div>;
}
