"use client";

import { useMemo, useState } from "react";
import { RecommendationLookbook } from "@/components/RecommendationLookbook";
import { recommendationColourVariants, type RecommendationColourVariant, type RecommendationColourVariantId } from "@/data/recommendation-colour-variants";
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

const colourHex: Record<string, string> = {
  White: "#f1efe7",
  Cream: "#e8ddc4",
  "Light grey": "#b1b6b8",
  Grey: "#777b7f",
  Charcoal: "#45494d",
  Black: "#17191c",
  Beige: "#c7b697",
  Stone: "#aaa18f",
  Sand: "#c9b58f",
  Khaki: "#9c946f",
  Olive: "#687153",
  Navy: "#243049",
  Brown: "#75523f",
  Chocolate: "#5b3b2f",
  "Powder blue": "#aabfcd"
};

const itemPart = (item: WardrobeItem): PartKey | null => {
  const category = item.category.toLowerCase();
  const type = item.subcategory.toLowerCase();
  const name = item.name.toLowerCase();

  if (category.includes("access") || type.includes("cap") || name.includes("cap")) return "cap";
  if (category.includes("shoe") || type.includes("trainer") || type.includes("shoe") || name.includes("adidas") || name.includes("puma") || name.includes("timberland")) return "footwear";
  if (category.includes("bottom") || type.includes("jean") || type.includes("trouser") || type.includes("cargo") || type.includes("short")) return "trousers";
  if (category.includes("outer") || type.includes("overshirt") || type.includes("jacket")) return "layer";
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

  const changed = useMemo(
    () =>
      Boolean(original) &&
      (Object.keys(partLabels) as PartKey[]).some((part) => colours[part] !== original.colours[part]),
    [colours, original]
  );

  const selectedVariant = useMemo(
    () =>
      variants.find((variant) =>
        (Object.keys(partLabels) as PartKey[]).every(
          (part) => (variant.colours[part] ?? undefined) === (colours[part] ?? undefined)
        )
      ),
    [colours, variants]
  );

  const activeAsset = selectedVariant?.asset ?? visual.asset;
  const hasExactRender = Boolean(selectedVariant?.asset);

  const options = useMemo(() => {
    const result = {} as Record<PartKey, string[]>;
    (Object.keys(partLabels) as PartKey[]).forEach((part) => {
      result[part] = Array.from(
        new Set(
          variants
            .map((variant) => variant.colours[part])
            .filter((value): value is string => Boolean(value))
        )
      );
    });
    return result;
  }, [variants]);

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
    <article className="outfit-card visual-outfit-card">
      <div className="outfit-card-topline">
        <span>{outfit.score}% match</span>
        <small>{outfit.mood}</small>
      </div>

      <h3>{outfit.name}</h3>

      <RecommendationLookbook
        title={outfit.name}
        asset={activeAsset}
        views={visual.views}
        publicBasePath={publicBasePath}
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
          {variants.filter((variant) => variant.asset).map((variant) => (
            <button
              type="button"
              key={variant.id}
              className={selectedVariant?.id === variant.id ? "is-selected" : ""}
              onClick={() =>
                setColours({
                  top: variant.colours.top,
                  trousers: variant.colours.trousers,
                  layer: variant.colours.layer,
                  cap: variant.colours.cap,
                  footwear: variant.colours.footwear
                })
              }
            >
              {variant.label}
              <span>HQ</span>
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
                      onClick={() => setColours((current) => ({ ...current, [part]: colour }))}
                      aria-pressed={colours[part] === colour}
                      title={`${partLabels[part]}: ${colour}`}
                    >
                      <span style={{ background: colourFor(colour) }} />
                      <b>{colour}</b>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className={`colour-visual-status ${hasExactRender ? (changed ? "is-rendered" : "is-original") : "is-preview"}`}>
          <span>{hasExactRender ? (changed ? "HQ colour render" : "Original HQ render") : "Palette preview"}</span>
          <small>
            {hasExactRender
              ? changed
                ? "The five mannequin poses now match this approved colour combination."
                : "The five mannequin poses match the original recommendation palette."
              : "This custom mix updates the palette below. Choose an approved rendered combination to update the mannequin."}
          </small>
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
                <small>{item.brand} · {selectedColour ?? item.primaryColour}</small>
              </div>
            </div>
          );
        })}
      </div>

      <p className="outfit-why">{outfit.why}</p>
    </article>
  );
}
