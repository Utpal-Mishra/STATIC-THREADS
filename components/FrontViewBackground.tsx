import type { BoardFrame } from "@/data/recommendation-colour-variants";

// Continue background texture at its native scale rather than stretching a
// few columns into horizontal bands. Feather only the outer background edge;
// the central mannequin retains the original pixels and transform.
export function FrontViewBackground({ frame, sourceId }: { frame: BoardFrame; sourceId: string }) {
  const [x, y, width, height] = frame;
  const strip = Math.min(width * .12, 96);
  const feather = Math.min(width * .06, 40);
  const maskId = `${sourceId}-edge-mask`;
  return <g aria-hidden="true" data-front-background="true" pointerEvents="none">
    <defs>
      <filter id={`${sourceId}-soften`} colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" x={x - height} y={y} width={width + height * 2} height={height}><feGaussianBlur stdDeviation={`${Math.min(width * .03, 18)} 0`} /></filter>
      <linearGradient id={`${sourceId}-fade`} x1={x} x2={x + width} y1={0} y2={0} gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="white" stopOpacity="1" /><stop offset={feather / width} stopColor="white" stopOpacity="0" />
        <stop offset={1 - feather / width} stopColor="white" stopOpacity="0" /><stop offset="1" stopColor="white" stopOpacity="1" />
      </linearGradient>
      <mask id={maskId} maskUnits="userSpaceOnUse" x={x - 4} y={y} width={width + 8} height={height}>
        <rect x={x - 4} y={y} width={width + 8} height={height} fill={`url(#${sourceId}-fade)`} />
      </mask>
      {[0, 1].map(side => {
        const edge = side === 0 ? x + 6 : x + width - strip - 6;
        return <pattern key={side} id={`${sourceId}-scene-${side}`} patternUnits="userSpaceOnUse" x={x} y={y} width={strip * 2} height={height}>
          <svg width={strip} height={height} viewBox={[edge, y, strip, height].join(" ")} preserveAspectRatio="none"><use href={`#${sourceId}`} /></svg>
          <svg x={strip} width={strip} height={height} viewBox={[edge, y, strip, height].join(" ")} preserveAspectRatio="none"><use href={`#${sourceId}`} transform={`translate(${2 * edge + strip} 0) scale(-1 1)`} /></svg>
        </pattern>;
      })}
    </defs>
    <g filter={`url(#${sourceId}-soften)`}><rect x={x - height * 4} y={y} width={height * 4 + feather} height={height} fill={`url(#${sourceId}-scene-0)`} />
    <rect x={x + width - feather} y={y} width={height * 4 + feather} height={height} fill={`url(#${sourceId}-scene-1)`} /></g>
  </g>;
}

// Blend just the empty scene edges over the original photo; do not mask or
// re-rasterize the mannequin itself.
export function FrontViewBlendEdges({ frame, sourceId }: { frame: BoardFrame; sourceId: string }) {
  const [x, y, width, height] = frame;
  const feather = Math.min(width * .06, 40);
  return <g aria-hidden="true" pointerEvents="none" mask={`url(#${sourceId}-edge-mask)`}>
    <g filter={`url(#${sourceId}-soften)`}>
      <rect x={x - feather} y={y} width={feather * 2} height={height} fill={`url(#${sourceId}-scene-0)`} />
      <rect x={x + width - feather} y={y} width={feather * 2} height={height} fill={`url(#${sourceId}-scene-1)`} />
    </g>
  </g>;
}
