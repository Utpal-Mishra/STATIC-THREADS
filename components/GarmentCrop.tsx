import type { GarmentCandidate, ImportPhoto } from "@/lib/outfit-import";
export function GarmentCrop({ photo, item, className = "import-crop" }: { photo: ImportPhoto; item: GarmentCandidate; className?: string }) {
  const [x, y, w, h] = item.box;
  return <svg className={className} role="img" aria-label={`Visible crop of ${item.name || "garment"}`} viewBox={[x * photo.width, y * photo.height, w * photo.width, h * photo.height].join(" ")}><image href={photo.data} width={photo.width} height={photo.height} /></svg>;
}
