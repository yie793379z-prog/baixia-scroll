import OpenSeadragon from 'openseadragon';
import {artwork} from '../content/artwork';
import {mediaUrl} from '../media/mediaUrl';
import {scrollPixelOffset,scrollTranslation} from './scrollPixels';

/** A decoded, complete painting stays underneath the bounded high-resolution tile window. */
export class ScrollBackdrop {
  readonly element=document.createElement('div');
  readonly image=new Image();
  settled=false;
  private disposed=false;
  private transform='';

  constructor(private viewer:OpenSeadragon.Viewer){
    this.element.className='scroll-backdrop';
    this.element.style.cssText='position:absolute;inset:0;overflow:clip;contain:strict;pointer-events:none;';
    this.element.setAttribute('aria-hidden','true');
    this.image.alt='';this.image.draggable=false;this.image.decoding='async';this.image.fetchPriority='high';
    this.image.style.cssText='position:absolute;left:0;top:0;max-width:none;visibility:hidden;transform-origin:0 0;will-change:transform;';
    this.element.appendChild(this.image);
    viewer.drawer.canvas.before(this.element);
    viewer.addHandler('update-viewport',this.update);
    this.image.onload=async()=>{
      try{await this.image.decode();}catch{/* A loaded image can still be painted if decode is unavailable. */}
      if(this.disposed)return;
      this.image.style.width=this.image.naturalWidth+'px';this.image.style.height=this.image.naturalHeight+'px';
      this.image.style.visibility='visible';this.image.dataset.ready='true';this.settled=true;
      this.update();viewer.forceRedraw();
    };
    this.image.onerror=()=>{if(!this.disposed){this.settled=true;viewer.forceRedraw();}};
    // Already derived from DZI tiles; the original painting is never loaded or rewritten.
    this.image.crossOrigin='anonymous';
    this.image.src=mediaUrl('/cinematic/fengning-unfurl.webp');
  }

  private update=()=>{
    const item=this.viewer.world.getItemAt(0);
    if(this.disposed||!item||!this.image.naturalWidth)return;
    const origin=item.imageToViewerElementCoordinates(new OpenSeadragon.Point(0,0));
    const end=item.imageToViewerElementCoordinates(new OpenSeadragon.Point(artwork.width,artwork.height));
    const offset=scrollPixelOffset(origin,window.devicePixelRatio);
    const width=`${(end.x-origin.x).toFixed(6)}px`,height=`${(end.y-origin.y).toFixed(6)}px`;
    if(this.image.style.width!==width)this.image.style.width=width;
    if(this.image.style.height!==height)this.image.style.height=height;
    const transform=scrollTranslation(offset.x,offset.y);
    if(transform!==this.transform){this.image.style.transform=transform;this.transform=transform;}
  };

  destroy(){
    this.disposed=true;this.viewer.removeHandler('update-viewport',this.update);
    this.image.onload=null;this.image.onerror=null;this.image.removeAttribute('src');this.element.remove();
  }
}
