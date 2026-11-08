export const SCROLL_BUFFER_SCREENS=1.25;

/** Keep nearby columns loaded in either reading direction without caching the whole roll. */
export function bufferedRange(x:number,width:number,limit=1){
  const start=Math.max(0,x-width*SCROLL_BUFFER_SCREENS);
  const end=Math.min(limit,x+width*(1+SCROLL_BUFFER_SCREENS));
  return {x:start,width:Math.max(0,end-start)};
}
