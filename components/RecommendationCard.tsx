"use client";

import { useRef, useState } from 'react';
import { RecommendationLookbook } from '@/components/RecommendationLookbook';
import { recommendationColourVariants, type RecommendationColourVariant, type RecommendationColourVariantId } from '@/data/recommendation-colour-variants';
import { colourHex } from '@/lib/palette-colours';
import type { WardrobeItem } from '@/types/catalog';

type Outfit = { id: string; name: string; mood: string; score?: number; why: string };
type Visual = { asset: string; views: readonly string[] };
const decodedBoards = new Map<string, Promise<void>>();

function loadBoard(url: string) {
  let pending = decodedBoards.get(url);
  if (!pending) {
    pending = new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => image.decode().then(resolve, reject);
      image.onerror = () => reject(new Error('Image unavailable'));
      image.src = url;
    }).catch((error) => { decodedBoards.delete(url); throw error; });
    decodedBoards.set(url, pending);
  }
  return pending;
}

export function RecommendationCard({ outfit, items, visual, publicBasePath, imageVariants, inspirationPieces }: {
  outfit: Outfit; items: WardrobeItem[]; visual: Visual; publicBasePath: string;
  imageVariants?: readonly RecommendationColourVariant[]; inspirationPieces?: readonly string[];
}) {
  const variants = imageVariants ?? recommendationColourVariants[outfit.id as RecommendationColourVariantId] ?? [];
  const [selectedId, setSelectedId] = useState(variants[0]?.id);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const request = useRef(0);
  const selected = variants.find((variant) => variant.id === selectedId) ?? variants[0];
  if (!selected) return null;

  const selectCombination = async (id: string) => {
    const next = variants.find((variant) => variant.id === id);
    if (!next) return;
    const currentRequest = ++request.current;
    setError(false);
    if (id === selected.id) { setPendingId(null); return; }
    setPendingId(id);
    try {
      await loadBoard(`${publicBasePath}${next.asset}`);
      if (currentRequest !== request.current) return;
      setSelectedId(id);
      setPendingId(null);
    } catch {
      if (currentRequest !== request.current) return;
      setPendingId(null);
      setError(true);
    }
  };

  return (
    <article className={`outfit-card visual-outfit-card${inspirationPieces ? " inspiration-outfit-card" : ""}`} data-outfit-id={outfit.id} aria-busy={pendingId !== null}>
      <div className="outfit-card-topline"><span>{inspirationPieces ? "Inspiration" : `${outfit.score}% match`}</span><small>{outfit.mood}</small></div>
      <h3>{outfit.name}</h3>
      <RecommendationLookbook
        title={outfit.name}
        asset={selected.asset}
        views={visual.views}
        publicBasePath={publicBasePath}
        paletteLabel={selected.label}
        frames={selected.frames}
        boardWidth={selected.width}
        boardHeight={selected.height}
      />

      <div className="colour-filter-panel combination-panel">
        <div className="colour-filter-heading">
          <div><span className="micro-label">Colour combinations</span><strong>Choose the complete look</strong></div>
          <span className="combination-count">{variants.findIndex((v) => v.id === selected.id) + 1} / {variants.length}</span>
        </div>
        <div className="combination-toggle-group" role="group" aria-label={`${outfit.name} colour combinations`}>
          {variants.map((variant, index) => (
            <button
              type="button"
              key={variant.id}
              className={`combination-toggle ${selected.id === variant.id ? 'is-selected' : ''}`}
              aria-label={variant.label}
              aria-pressed={selected.id === variant.id}
              onClick={() => void selectCombination(variant.id)}
            >
              <span className="combination-swatches" aria-hidden="true">
                {Array.from(new Set(Object.values(variant.colours))).map((colour) => (
                  <i key={colour} style={{ backgroundColor: colourHex[colour] ?? '#747a76' }} />
                ))}
              </span>
              <span>{variant.label}</span>
              {pendingId === variant.id ? <small>Loading…</small> : variant.original || (inspirationPieces && index === 0) ? <small>{inspirationPieces ? "Saved palette" : "Original"}</small> : null}
            </button>
          ))}
        </div>
        <div className="combination-status" role="status" aria-live="polite">
          {error ? <span>That image could not load. Your current look is kept; select a combination to retry.</span>
            : pendingId ? <span>Loading the complete outfit…</span>
            : <span>{selected.label} · Five coordinated views</span>}
        </div>
        <a className="full-board-link" href={`${publicBasePath}${selected.asset}`} target="_blank" rel="noreferrer">View full-resolution image ↗</a>
      </div>

      <div className="outfit-stack" aria-label={`${outfit.name} ${inspirationPieces ? "inspiration pieces" : "owned items"}`}>
        {inspirationPieces && (selected.pieces ?? inspirationPieces).map((piece) => (
          <div className="outfit-piece" key={piece}>
            <div><strong>{piece}</strong><small>Style inspiration · Not marked as owned</small></div>
          </div>
        ))}
        {items.map((item) => (
          <div className="outfit-piece" key={item.id}>
            <span className="outfit-piece-swatch" style={{ background: colourHex[item.primaryColour] ?? '#747a76' }} />
            <div><strong>{item.name}</strong><small>{item.brand} · Owned: {item.primaryColour}</small></div>
          </div>
        ))}
      </div>
      <p className="outfit-why">{outfit.why}</p>
      <small className="combination-disclaimer">{inspirationPieces ? "Generated style inspiration based on your saved direction; these pieces are not marked as owned." : "Style inspiration; the garments shown may differ from your owned pieces."}</small>
    </article>
  );
}
