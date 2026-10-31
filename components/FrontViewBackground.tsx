import type { BoardFrame } from "@/data/recommendation-colour-variants";

// Extend only the scene at the outer edges of a front-view crop. The original
// image stays on top with its existing crop and transform, so the mannequin
// never scales, stretches or gets cropped to fill the surrounding frame.
export function FrontViewBackground({ frame, sourceId }: { frame: BoardFrame; sourceId: string }) {
  const [x, y, width, height] = frame;
  const extension = height * 4;
  const strip = Math.min(4, width / 20);
  return <g aria-hidden="true" data-front-background="true" pointerEvents="none">
    <svg x={x - extension} y={y} width={extension} height={height} viewBox={[x, y, strip, height].join(" ")} preserveAspectRatio="none">
      <use href={`#${sourceId}`} />
    </svg>
    <svg x={x + width} y={y} width={extension} height={height} viewBox={[x + width - strip, y, strip, height].join(" ")} preserveAspectRatio="none">
      <use href={`#${sourceId}`} />
    </svg>
  </g>;
}
