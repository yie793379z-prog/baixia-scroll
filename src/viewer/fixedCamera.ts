import type { BoundsPx, Camera } from './camera';
import { artwork } from '../content/artwork';
export function fixedBounds(aspect:number, centerX?:number):BoundsPx {
  const height=artwork.height;
  const width=Math.min(artwork.width,height*Math.max(.2,aspect));
  const requested=centerX??artwork.initialRightPx-width/2;
  const x=Math.max(0,Math.min(artwork.width-width,requested-width/2));
  return {x,y:0,width,height};
}
export function fixedCamera(aspect:number, centerX?:number):Camera {
  const b=fixedBounds(aspect,centerX);
  return {imageId:artwork.imageId,center:{x:b.x+b.width/2,y:artwork.height/2},zoom:artwork.width/b.width};
}
export function draggedCenter(centerX:number,dx:number,cssWidth:number,aspect:number):number {
  const b=fixedBounds(aspect,centerX);
  return fixedCamera(aspect,centerX+dx*b.width/Math.max(1,cssWidth)).center.x;
}
// WheelEvent is also how macOS trackpads deliver two-finger scrolling.
// A pinch arrives with ctrlKey and must never change the reading camera.
export function wheelTravel(e:{deltaX:number;deltaY:number;deltaMode:number;ctrlKey:boolean;metaKey:boolean},pageWidth:number):number {
  if(e.ctrlKey||e.metaKey)return 0;
  const delta=Math.abs(e.deltaX)>=Math.abs(e.deltaY)?e.deltaX:e.deltaY;
  if(!Number.isFinite(delta))return 0;
  return -delta*(e.deltaMode===1?16:e.deltaMode===2?pageWidth:1);
}
