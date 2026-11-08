export interface PointPx { x: number; y: number }
export interface BoundsPx extends PointPx { width: number; height: number }
export interface Camera { imageId: string; center: PointPx; zoom: number }
export function validCamera(value: unknown, imageId: string, width: number, height: number): value is Camera {
  if (!value || typeof value !== 'object') return false;
  const c = value as Partial<Camera>;
  return c.imageId === imageId && !!c.center && Number.isFinite(c.center.x) && Number.isFinite(c.center.y)
    && c.center.x >= 0 && c.center.x <= width && c.center.y >= 0 && c.center.y <= height
    && typeof c.zoom === 'number' && Number.isFinite(c.zoom) && c.zoom >= 1 && c.zoom <= 10000;
}
export function initialBounds(width: number, height: number, aspect: number, rightPx = width): BoundsPx {
  const h = height * 1.04; const w = Math.min(width, h * Math.max(.2, aspect));
  return { x: Math.max(0, Math.min(width-w, rightPx-w)), y: (height-h)/2, width: w, height: h };
}
export function imageToNormalized(p: PointPx, imageWidth: number): PointPx {
  return { x: p.x/imageWidth, y: p.y/imageWidth };
}
export function normalizedToImage(p: PointPx, imageWidth: number): PointPx {
  return { x: p.x*imageWidth, y: p.y*imageWidth };
}
export function readingProgress(centerX: number, width: number): number {
  return Math.min(1,Math.max(0,1-centerX/width));
}
export function isIntentionalClick(quick: boolean, maxDistance: number, maxPointers: number): boolean {
  return quick && maxDistance <= 8 && maxPointers === 1;
}
