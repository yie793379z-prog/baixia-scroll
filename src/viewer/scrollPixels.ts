/** Use one physical-pixel grid for every layer, throughout motion and at rest. */
export function scrollPixelOffset(origin:{x:number;y:number},pixelRatio:number){
  const ratio=Number.isFinite(pixelRatio)&&pixelRatio>0?pixelRatio:1;
  const x=Math.round(Number((origin.x*ratio).toFixed(8)))/ratio;
  const y=Math.round(Number((origin.y*ratio).toFixed(8)))/ratio;
  return {x,y,dx:x-origin.x,dy:y-origin.y};
}

/** Discard coordinate-conversion noise before writing a compositor transform. */
export function scrollTranslation(x:number,y:number){
  return `translate3d(${x.toFixed(6)}px,${y.toFixed(6)}px,0)`;
}
