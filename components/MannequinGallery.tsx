"use client";
import { useEffect, useId, useState } from "react";
import { FrontViewBackground } from "@/components/FrontViewBackground";
import { mannequinViews, type MannequinBoard } from "@/lib/outfit-visuals";
export function MannequinGallery({ board, generated = false, onUnavailable }: { board: MannequinBoard; generated?: boolean; onUnavailable?: () => void }) {
  const [active, setActive] = useState(2);
  const [full, setFull] = useState(false);
  const [error, setError] = useState(false);
  const id = useId().replace(/:/g, "");
  useEffect(() => { setError(false); setActive(2); setFull(false); }, [board.asset]);
  const frame = board.frames[active];
  if (error) return <p className="chat-visual-note" role="status">This mannequin image could not be loaded. No unrelated preview has been substituted.</p>;
  return <section className="chat-mannequin-gallery" aria-label={`${board.label} mannequin views`}>
    <p className="chat-visual-label">{generated ? "Generated mannequin interpretation" : "Catalogue mannequin style preview"}</p>
    {full ? <img className="chat-mannequin-full" src={board.asset} alt={`${board.label}: complete five-view board`} onError={() => { setError(true); onUnavailable?.(); }} /> : <svg className="chat-mannequin-main" role="img" aria-label={`${board.label} — ${mannequinViews[active]}`} viewBox={frame.join(" ")} preserveAspectRatio="xMidYMid meet">
      <defs><clipPath id={`${id}-main`}><rect x={frame[0]} y={frame[1]} width={frame[2]} height={frame[3]} /></clipPath></defs>
      {active === 2 ? <FrontViewBackground frame={frame} sourceId={`${id}-main-source`} /> : null}
      <image id={`${id}-main-source`} href={board.asset} width={board.width} height={board.height} clipPath={`url(#${id}-main)`} onError={() => { setError(true); onUnavailable?.(); }} />
    </svg>}
    <div className="chat-mannequin-thumbs" aria-label="Mannequin poses">{mannequinViews.map((view, index) => {
      const crop = board.frames[index];
      return <button type="button" key={view} onClick={() => { setActive(index); setFull(false); }} aria-label={`Show ${view.toLowerCase()} mannequin view`} aria-pressed={!full && active === index}>
        <svg aria-hidden="true" viewBox={crop.join(" ")} preserveAspectRatio="xMidYMid meet"><defs><clipPath id={`${id}-${index}`}><rect x={crop[0]} y={crop[1]} width={crop[2]} height={crop[3]} /></clipPath></defs>{index === 2 ? <FrontViewBackground frame={crop} sourceId={`${id}-${index}-source`} /> : null}<image id={`${id}-${index}-source`} href={board.asset} width={board.width} height={board.height} clipPath={`url(#${id}-${index})`} /></svg><span>{view}</span>
      </button>;
    })}</div>
    <button type="button" className="chat-board-toggle" aria-pressed={full} onClick={() => setFull(value => !value)}>{full ? "Show selected pose" : "Show complete image board"}</button>
    <p className="chat-visual-note">{generated ? "Illustration based on the sourced outfit description. Check garment detail and pose layout; this is not an exact product render or a fit simulation." : "Existing illustrative catalogue imagery. Colours, accessories and garment detail may differ from the listed owned pieces."}</p>
  </section>;
}
