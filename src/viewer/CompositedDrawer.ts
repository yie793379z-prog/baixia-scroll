import OpenSeadragon from 'openseadragon';
import {scrollPixelOffset,scrollTranslation} from './scrollPixels';

/**
 * The main scroll never rotates or filters its pixels. Keep decoded DZI tiles
 * as persistent image layers so panning only changes compositor transforms;
 * a Retina-sized canvas would otherwise be copied/redrawn on every frame.
 * OpenSeadragon still owns level selection, loading, blending and eviction.
 */
export class CompositedDrawer extends OpenSeadragon.DrawerBase {
  private tiles = new Map<OpenSeadragon.Tile, {image:HTMLImageElement;geometry:number;opacity:string}>();
  private anchorX=0;
  private translation='';
  private pixelsPerUnit=0;
  private geometry=0;

  static isSupported(){return CSS.supports('transform','translate3d(0,0,0)');}
  getType(){return 'composited';}
  getSupportedDataFormats(){return ['image'];}
  canRotate(){return false;}
  setImageSmoothingEnabled(){}

  // DrawerBase's documented drawing-element hook (also used by HTMLDrawer).
  _createDrawingElement(){
    const surface=document.createElement('div');
    surface.className='composited-scroll';
    surface.style.cssText='overflow:clip;isolation:isolate;contain:strict;';
    const plane=document.createElement('div');
    plane.style.cssText='position:absolute;inset:0;contain:layout style;will-change:transform;transform-origin:0 0;';
    surface.appendChild(plane);
    return surface;
  }

  draw(images:OpenSeadragon.TiledImage[]){
    // This drawer belongs to the single-artwork main viewer. Magnifiers and
    // other canvases retain their own standard drawers.
    const item=images[0];if(!item)return;
    const center=item.viewportToImageCoordinates(this.viewport.getCenter(true));
    const span=item.viewportToImageRectangle(this.viewport.getBounds(true)).width;
    if(Math.abs(center.x-this.anchorX)>span*2){this.anchorX=center.x;this.geometry++;}
    const pixelsPerUnit=this.viewport.getZoom(true)*this.viewport.getContainerSize().x;
    if(Math.abs(pixelsPerUnit-this.pixelsPerUnit)>1e-7){this.pixelsPerUnit=pixelsPerUnit;this.geometry++;}
    const origin=item.imageToViewerElementCoordinates(new OpenSeadragon.Point(this.anchorX,0));
    const plane=this.canvas.firstElementChild as HTMLDivElement;
    // Snap the global artwork origin, not the rebased tile plane: the same
    // correction must apply to backdrop and tiles even when the local anchor changes.
    const globalOrigin=item.imageToViewerElementCoordinates(new OpenSeadragon.Point(0,0));
    const offset=scrollPixelOffset(globalOrigin,window.devicePixelRatio);
    const translation=scrollTranslation(origin.x+offset.dx,origin.y+offset.dy);
    if(translation!==this.translation){plane.style.transform=translation;this.translation=translation;}
    const visible=new Set<OpenSeadragon.Tile>();
    if(item.getOpacity()){
      for(const {tile} of item.getTilesToDraw()){
        if(!tile.loaded||!tile.position||!tile.size)continue;
        const source:unknown=this.getDataToDraw(tile);
        if(!(source instanceof HTMLImageElement)||!source.naturalWidth)continue;
        visible.add(tile);
        let entry=this.tiles.get(tile);
        if(!entry){
          // Reuse the decoded cache image: an asynchronous clone could leave a
          // newly visible column empty for another frame even after it loaded.
          const image=source;
          image.alt='';image.draggable=false;image.decoding='sync';
          image.style.cssText='position:absolute;left:0;top:0;max-width:none;pointer-events:none;';
          image.style.zIndex=String(tile.level);
          plane.appendChild(image);
          entry={image,geometry:-1,opacity:''};this.tiles.set(tile,entry);
        }
        // Tile geometry stays unchanged during a pan. Recalculate it only for
        // a newly loaded tile, zoom/resize, or a local-coordinate rebase.
        if(entry.geometry!==this.geometry){
          // Rasterize tiles at their final size in one moving plane. Independent
          // scaled GPU layers can be re-rasterized with a different phase at rest.
          entry.image.style.left=`${(tile.position.x-origin.x).toFixed(6)}px`;
          entry.image.style.top=`${(tile.position.y-origin.y).toFixed(6)}px`;
          entry.image.style.width=`${tile.size.x.toFixed(6)}px`;
          entry.image.style.height=`${tile.size.y.toFixed(6)}px`;
          entry.geometry=this.geometry;
        }
        const opacity=String((tile.opacity??1)*item.getOpacity());
        if(opacity!==entry.opacity){entry.image.style.opacity=opacity;entry.opacity=opacity;}
      }
    }
    // The drawing area includes a bounded buffer on both sides of the viewport.
    // Retain those ready columns, releasing them once they leave the buffer.
    for(const [tile,entry] of this.tiles){
      if(!visible.has(tile)){entry.image.remove();this.tiles.delete(tile);}
    }
  }

  destroy(){
    for(const entry of this.tiles.values())entry.image.remove();
    this.tiles.clear();this.canvas.remove();super.destroy();
  }
}
