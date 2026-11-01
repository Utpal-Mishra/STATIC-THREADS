"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FrontViewBackground, FrontViewBlendEdges } from "@/components/FrontViewBackground";
import type { BoardFrame } from "@/data/recommendation-colour-variants";

type RecommendationLookbookProps = {
  title: string;
  paletteLabel?: string;
  frames: readonly BoardFrame[];
  boardWidth: number;
  boardHeight: number;
  asset: string;
  views: readonly string[];
  publicBasePath: string;
};

const cropClasses = ["pose-walking", "pose-sitting", "pose-front", "pose-back", "pose-side"] as const;

export function RecommendationLookbook({ title, asset, views, publicBasePath, paletteLabel, frames, boardWidth, boardHeight }: RecommendationLookbookProps) {
  const [active, setActive] = useState(0);
  const frameClipId = useId().replace(/:/g, "");
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 680px)");
    if (!media.matches) return;

    const timer = window.setInterval(() => {
      setActive((current) => {
        const next = (current + 1) % views.length;
        const track = trackRef.current;
        const child = track?.children.item(next) as HTMLElement | null;
        if (track && child) track.scrollTo({ left: child.offsetLeft - track.offsetLeft - (track.clientWidth - child.clientWidth) / 2, behavior: "smooth" });
        return next;
      });
    }, 3600);

    return () => window.clearInterval(timer);
  }, [views.length]);

  const goTo = (index: number) => {
    const normalized = (index + views.length) % views.length;
    setActive(normalized);

    if (window.matchMedia("(max-width: 680px)").matches) {
      const track = trackRef.current;
      const child = track?.children.item(normalized) as HTMLElement | null;
      if (track && child) track.scrollTo({ left: child.offsetLeft - track.offsetLeft - (track.clientWidth - child.clientWidth) / 2, behavior: "smooth" });
    }
  };

  const showcaseClass = (index: number) => {
    const total = views.length;
    const forward = (index - active + total) % total;
    if (forward === 0) return "is-active";
    if (forward === 1) return "is-next";
    if (forward === total - 1) return "is-prev";
    if (forward === 2) return "is-far-next";
    return "is-far-prev";
  };

  const step = (direction: -1 | 1) => {
    goTo(active + direction);
  };

  return (
    <div className="lookbook-shell">
      <div
        className="lookbook-five-view"
        ref={trackRef}
        onScroll={(event) => {
          if (window.innerWidth > 680) return;
          const element = event.currentTarget;
          const center = element.scrollLeft + element.clientWidth / 2;
          let nearest = 0;
          let distance = Number.POSITIVE_INFINITY;
          Array.from(element.children).forEach((child, index) => {
            const node = child as HTMLElement;
            const childCenter = node.offsetLeft + node.clientWidth / 2;
            const nextDistance = Math.abs(childCenter - center);
            if (nextDistance < distance) {
              nearest = index;
              distance = nextDistance;
            }
          });
          if (nearest !== active) setActive(nearest);
        }}
        aria-label={`${title} five-view outfit preview`}
      >
        {views.map((view, index) => (
          <figure className={`lookbook-pose ${cropClasses[index] ?? "pose-front"} ${showcaseClass(index)}`} key={view}>
            <svg
              className="lookbook-pose-image"
              role="img"
              aria-label={`${title} — ${view}${paletteLabel ? ` — ${paletteLabel}` : ""}`}
              viewBox={(frames[index] ?? frames[2]).join(" ")}
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <clipPath id={`${frameClipId}-${index}`} clipPathUnits="userSpaceOnUse">
                  <rect x={(frames[index] ?? frames[2])[0]} y={(frames[index] ?? frames[2])[1]} width={(frames[index] ?? frames[2])[2]} height={(frames[index] ?? frames[2])[3]} />
                </clipPath>
              </defs>
              {index === 2 ? <FrontViewBackground frame={frames[index] ?? frames[2]} sourceId={`${frameClipId}-${index}-source`} /> : null}
              <image href={`${publicBasePath}${asset}`} id={`${frameClipId}-${index}-source`} width={boardWidth} height={boardHeight} clipPath={`url(#${frameClipId}-${index})`} />
              {index === 2 ? <FrontViewBlendEdges frame={frames[index] ?? frames[2]} sourceId={`${frameClipId}-${index}-source`} /> : null}
            </svg>
            <figcaption>{view}</figcaption>
          </figure>
        ))}
      </div>

      <div className="lookbook-desktop-slider-controls" aria-label={`${title} desktop slider controls`}>
        <button type="button" onClick={() => step(-1)} aria-label="Previous outfit view">←</button>
        <span>{active + 1} / {views.length}</span>
        <button type="button" onClick={() => step(1)} aria-label="Next outfit view">→</button>
      </div>

      <div className="lookbook-carousel-controls" aria-label={`${title} carousel controls`}>
        {views.map((view, index) => (
          <button
            type="button"
            key={view}
            className={active === index ? "is-active" : ""}
            onClick={() => goTo(index)}
            aria-label={`Show ${view}`}
            aria-pressed={active === index}
          >
            <span />
          </button>
        ))}
      </div>

      <div className="lookbook-model-note">
        <strong>Model: faceless mannequin</strong>
        <small>One complete colour combination, shown from five angles.</small>
      </div>
    </div>
  );
}
