"use client";

import { useEffect, useMemo, useState } from "react";
import { RecommendationLookbook } from "@/components/RecommendationLookbook";
import { recommendationColourVariants, type RecommendationColourVariant, type RecommendationColourVariantId } from "@/data/recommendation-colour-variants";
import { colourHex, nativeFootwearColours, garmentBoards, loadLookbook, recolourLookbook } from "@/lib/recolour-lookbook";
import type { WardrobeItem } from "@/types/catalog";

type Visual = {
  asset: string;
  views: readonly string[];
};

type Outfit = {
  id: string;
  name: string;
  mood: string;
  score: number;
  why: string;
};

type PartKey = "top" | "trousers" | "layer" | "cap" | "footwear";

const partLabels: Record<PartKey, string> = {
  top: "Shirt / Top",
  trousers: "Pants / Trousers",
  layer: "Jacket / Layer",
  cap: "Cap",
  footwear: "Footwear"
};

const itemPart = (item: WardrobeItem): PartKey | null => {
  const category = item.category.toLowerCase();
  const type = item.subcategory.toLowerCase();
  const name = item.name.toLowerCase();

  if (category.includes("access") || type.includes("cap") || name.includes("cap")) return "cap";
  if (category.includes("shoe") || type.includes("trainer") || type.includes("shoe") || name.includes("adidas") || name.includes("puma") || name.includes("timberland")) return "footwear";
  if (category.includes("jean") || category.includes("trouser") || category.includes("short") || category.includes("bottom") || type.includes("jean") || type.includes("trouser") || type.includes("cargo") || type.includes("short")) return "trousers";
  if (category.includes("jacket") || category.includes("outer") || type.includes("overshirt") || type.includes("jacket")) return "layer";
  if (category.includes("top") || type.includes("shirt") || type.includes("t-shirt") || type.includes("tee")) return "top";
  return null;
};

const colourFor = (name: string) => colourHex[name] ?? "#747a76";

export function RecommendationCard({
  outfit,
  items,
  visual,
  publicBasePath
}: {
  outfit: Outfit;
  items: WardrobeItem[];
  visual: Visual;
  publicBasePath: string;
}) {
  const variants = (recommendationColourVariants[outfit.id as RecommendationColourVariantId] ?? []) as readonly RecommendationColourVariant[];
  const original = variants[0];
  const [colours, setColours] = useState<Record<PartKey, string | undefined>>({
    top: original?.colours.top,
    trousers: original?.colours.trousers,
    layer: original?.colours.layer,
    cap: original?.colours.cap,
    footwear: original?.colours.footwear
  });

  const supportedParts = useMemo(() => Object.keys(garmentBoards[outfit.id]?.parts ?? {}) as PartKey[], [outfit.id]);

  const changed = useMemo(
    () =>
      Boolean(original) &&
      supportedParts.some((part) => colours[part] !== original.colours[part]),
    [colours, original, supportedParts]
  );

  const selectedVariant = useMemo(
    () =>
      variants.find((variant) =>
        supportedParts.filter((part) => part !== "footwear").every(
          (part) => (variant.colours[part] ?? undefined) === (colours[part] ?? undefined)
        )
      ),
    [colours, variants, supportedParts]
  );

  const renderedVariants = variants;
  const [preview, setPreview] = useState<{ key: string; asset: string } | null>(null);
  const [renderError, setRenderError] = useState(false);
  const paletteKey = JSON.stringify([outfit.id, visual.asset, publicBasePath, colours]);
  const ready = preview?.key === paletteKey;
  const activeAsset = ready ? preview.asset : visual.asset;

  useEffect(() => {
    let cancelled = false;
    setRenderError(false);
    Promise.all([loadLookbook(`${publicBasePath}${visual.asset}`), loadLookbook(`${publicBasePath}/lookbooks/masks/${outfit.id}.png?v=20261024-trousers-3`)])
      .then(([image, segmentation]) => {
        if (cancelled) return;
        const asset = recolourLookbook(image, outfit.id, colours, segmentation);
        setPreview({ key: paletteKey, asset });
      })
      .catch(() => { if (!cancelled) setRenderError(true); });
    return () => { cancelled = true; };
  }, [paletteKey, colours, outfit.id, visual.asset, publicBasePath]);

  const options = useMemo(() => {
    const result = {} as Record<PartKey, string[]>;
    (Object.keys(partLabels) as PartKey[]).forEach((part) => {
      if (!supportedParts.includes(part)) {
        result[part] = [];
        return;
      }

      result[part] = Array.from(
        new Set(
          renderedVariants
            .map((variant) => variant.colours[part])
            .filter((value): value is string => Boolean(value))
        )
      );
    });
    return result;
  }, [renderedVariants, supportedParts]);

  const applyRenderedVariantForColour = (part: PartKey, colour: string) => {
    setColours((current) => ({ ...current, [part]: colour }));
  };

  const reset = () => {
    if (!original) return;
    setColours({
      top: original.colours.top,
      trousers: original.colours.trousers,
      layer: original.colours.layer,
      cap: original.colours.cap,
      footwear: original.colours.footwear
    });
  };

  return (
    <article className="outfit-card visual-outfit-card" data-outfit-id={outfit.id} aria-busy={!ready && !renderError}>
      <div className="outfit-card-topline">
        <span>{outfit.score}% match</span>
        <small>{outfit.mood}</small>
      </div>

      <h3>{outfit.name}</h3>

      <RecommendationLookbook
        title={outfit.name}
        asset={activeAsset}
        views={visual.views}
        publicBasePath={ready ? "" : publicBasePath}
        paletteLabel={supportedParts.map((part) => `${partLabels[part]}: ${colours[part]}`).join(", ")}
        pending={!ready}
      />

      <div className="colour-filter-panel">
        <div className="colour-filter-heading">
          <div>
            <span className="micro-label">Colour filter</span>
            <strong>Try another colour direction</strong>
          </div>
          {changed ? <button type="button" onClick={reset}>Reset</button> : null}
        </div>

        <div className="rendered-preset-row" aria-label="Rendered colour presets">
          {renderedVariants.map((variant) => (
            <button
              type="button"
              key={variant.id}
              className={selectedVariant?.id === variant.id ? "is-selected" : ""}
              aria-pressed={selectedVariant?.id === variant.id}
              onClick={() =>
                setColours((current) => {
                  const next = { ...current };
                  supportedParts.forEach((part) => {
                    if (part !== "footwear") next[part] = variant.colours[part];
                  });
                  return next;
                })
              }
            >
              {variant.label}
              <span>Preview</span>
            </button>
          ))}
        </div>

        <div className="colour-filter-groups">
          {(Object.keys(partLabels) as PartKey[]).map((part) => {
            if (!options[part]?.length) return null;
            return (
              <div className="colour-filter-group" key={part}>
                <small>{partLabels[part]}</small>
                <div className="colour-filter-options">
                  {options[part].map((colour) => (
                    <button
                      type="button"
                      key={colour}
                      className={colours[part] === colour ? "is-selected" : ""}
                      onClick={() => applyRenderedVariantForColour(part, colour)}
                      aria-pressed={colours[part] === colour}
                      title={`${partLabels[part]}: ${colour}`}
                    >
                      <span style={{ background: colourFor(colour) }} />
                      <b>{colour}{part === "footwear" && colour === nativeFootwearColours[outfit.id] ? " · Original" : ""}</b>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className={`colour-visual-status ${changed ? "is-rendered" : "is-original"}`} role="status" aria-live="polite">
          <span>{renderError ? "Preview unavailable" : !ready ? "Updating outfit colours…" : changed ? "Custom colour preview" : "Original colour preview"}</span>
          <small>{renderError ? "Please reload to retry. The mannequin could not be updated." : "Clothing presets keep your footwear selection. Original footwear retains its natural texture and details. Style preview: garment shapes may differ from your owned pieces."}</small>
          {outfit.id === "city-minimal" ? <small>The owned cap is listed below; this mannequin is not wearing a cap.</small> : null}
        </div>
      </div>

      <div className="outfit-stack" aria-label={`${outfit.name} items`}>
        {items.map((item) => {
          const part = itemPart(item);
          const selectedColour = part ? colours[part] : undefined;
          return (
            <div className="outfit-piece" key={item.id}>
              <span
                className="outfit-piece-swatch"
                style={{ background: selectedColour ? colourFor(selectedColour) : colourFor(item.primaryColour) }}
              />
              <div>
                <strong>{item.name}</strong>
                <small>{item.brand} · Owned: {item.primaryColour}{part && supportedParts.includes(part) && selectedColour ? ` · Preview: ${selectedColour}` : ""}</small>
              </div>
            </div>
          );
        })}
      </div>

      <p className="outfit-why">{outfit.why}</p>
    </article>
  );
}
