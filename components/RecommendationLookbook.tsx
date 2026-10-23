"use client";

import { useEffect, useRef, useState } from "react";

type RecommendationLookbookProps = {
  title: string;
  asset: string;
  views: readonly string[];
  publicBasePath: string;
};

const cropClasses = ["pose-walking", "pose-sitting", "pose-front", "pose-back", "pose-side"] as const;

export function RecommendationLookbook({ title, asset, views, publicBasePath }: RecommendationLookbookProps) {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 680px)");
    if (!media.matches) return;

    const timer = window.setInterval(() => {
      setActive((current) => {
        const next = (current + 1) % views.length;
        const track = trackRef.current;
        const child = track?.children.item(next) as HTMLElement | null;
        child?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        return next;
      });
    }, 3600);

    return () => window.clearInterval(timer);
  }, [views.length]);

  const goTo = (index: number) => {
    setActive(index);
    const child = trackRef.current?.children.item(index) as HTMLElement | null;
    child?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  };

  return (
    <div className="lookbook-shell">
      <div
        className="lookbook-five-view"
        ref={trackRef}
        onScroll={(event) => {
          const element = event.currentTarget;
          if (window.innerWidth > 680) return;
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
          <figure className={`lookbook-pose ${cropClasses[index] ?? "pose-front"}`} key={view}>
            <div
              className="lookbook-pose-image"
              role="img"
              aria-label={`${title} — ${view}`}
              style={{ backgroundImage: `url("${publicBasePath}${asset}")` }}
            />
            <figcaption>{view}</figcaption>
          </figure>
        ))}
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
        <small>Five-view presentation. Exact garment rendering and user-photo try-on are the next fidelity layers.</small>
      </div>
    </div>
  );
}
