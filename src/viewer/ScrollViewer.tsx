import {scrollSceneTitle} from '../ui/scrollLabels';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import OpenSeadragon from 'openseadragon';
import {CompositedDrawer} from './CompositedDrawer';
import {ScrollBackdrop} from './ScrollBackdrop';
import {bufferedRange} from './scrollLoading';
import { artwork } from '../content/artwork';
import {characterAt,type PaintedCharacter} from '../content/characters';
import { isIntentionalClick, type BoundsPx, type Camera } from './camera';
import { draggedCenter, fixedBounds, fixedCamera, wheelTravel } from './fixedCamera';
import type { Mode, SceneDefinition } from '../scenes/types';
export interface ViewerHandle {
  snapshot():Camera|null;
  preparePresentation():void;
  present(centerX:number):void;
  finishPresentation():Camera|null;
  pointAt(clientX:number,clientY:number):{x:number;y:number}|null;
  focus(bounds:BoundsPx):Promise<void>;
  finishActivity():Camera|null;
  reset():void;
  pan(direction:-1|1):void;
  panByFraction(fraction:number):void;
  finishGesture():void;
}
interface Props {
  initialCamera:Camera|null; mode:Mode; scenes:SceneDefinition[]; locked:boolean; reducedMotion:boolean;
  onReady():void; onCamera(camera:Camera,settled:boolean):void;
  onSceneClick(scene:SceneDefinition):void; onCharacterClick(character:PaintedCharacter):void; onError(message:string):void;
}
export const ScrollViewer=forwardRef<ViewerHandle,Props>(function ScrollViewer(props,ref){
  const host=useRef<HTMLDivElement>(null);
  const viewer=useRef<OpenSeadragon.Viewer|null>(null);
  const current=useRef(props); current.current=props;
  const presenting=useRef(false);
  const gestureMoving=useRef(false);
  const presentationMetadataAt=useRef(0);
  const cancelMove=useRef<(()=>void)|null>(null);
  const updateMarkers=useRef<()=>void>(()=>{});
  const aspect=(v:OpenSeadragon.Viewer)=>v.viewport.getAspectRatio();
  const read=():Camera|null=>{
    const v=viewer.current, item=v?.world.getItemAt(0); if(!v||!item)return null;
    const c=item.viewportToImageCoordinates(v.viewport.getCenter(true));
    return {imageId:artwork.imageId,center:{x:c.x,y:c.y},zoom:v.viewport.getZoom(true)};
  };
  const browse=(v:OpenSeadragon.Viewer,x?:number,immediate=true)=>{
    const item=v.world.getItemAt(0);if(!item)return;
    const b=fixedBounds(aspect(v),x);
    v.viewport.fitBounds(item.imageToViewportRectangle(b.x,b.y,b.width,b.height),immediate);
  };
  const move=(action:(v:OpenSeadragon.Viewer,immediate:boolean)=>void)=>new Promise<void>(resolve=>{
    cancelMove.current?.();
    const v=viewer.current;if(!v?.world.getItemAt(0)){resolve();return;}
    let ended=false;
    const finish=(commit=true)=>{if(ended)return;ended=true;clearTimeout(timer);v.removeHandler('animation-finish',done);if(commit)action(v,true);cancelMove.current=null;resolve();};
    const done=()=>finish();
    const timer=setTimeout(done,current.current.reducedMotion?30:700);
    cancelMove.current=()=>finish(false);
    v.addHandler('animation-finish',done);action(v,current.current.reducedMotion);
    if(current.current.reducedMotion)finish();
  });
  useImperativeHandle(ref,()=>({
    snapshot:read,
    preparePresentation:()=>{const v=viewer.current;if(!v?.world.getItemAt(0))return;presenting.current=true;browse(v,artwork.width,true);},
    present:centerX=>{
      const v=viewer.current,item=v?.world.getItemAt(0);if(!v||!item)return;
      if(!presenting.current){presenting.current=true;browse(v,centerX,true);}
      else v.viewport.panTo(item.imageToViewportCoordinates(centerX,artwork.height/2),true);
      const now=performance.now();
      if(host.current&&now-presentationMetadataAt.current>=100){
        presentationMetadataAt.current=now;
        host.current.dataset.presentationX=String(centerX);
        host.current.dataset.presentationZoom=String(v.viewport.getZoom(true));
      }
    },
    finishPresentation:()=>{presenting.current=false;presentationMetadataAt.current=0;return read();},
    pointAt:(clientX,clientY)=>{const v=viewer.current,item=v?.world.getItemAt(0);if(!v||!item)return null;const rect=v.element.getBoundingClientRect();return item.viewportToImageCoordinates(v.viewport.pointFromPixel(new OpenSeadragon.Point(clientX-rect.left,clientY-rect.top),true));},
    // Enter at the ordinary reading scale so closing an activity needs no camera return.
    focus:bounds=>move((v,immediate)=>browse(v,bounds.x+bounds.width/2,immediate)),
    finishActivity:()=>{
      cancelMove.current?.();
      const v=viewer.current,c=read();
      // Stop an interrupted entrance at its current position; never restore the origin.
      if(v&&c)browse(v,c.center.x,true);
      return read();
    },
    reset:()=>{const v=viewer.current;if(v&&!current.current.locked)browse(v,undefined,current.current.reducedMotion);},
    pan:direction=>{const v=viewer.current,c=read();if(!v||!c||current.current.locked)return;const b=fixedBounds(aspect(v));browse(v,c.center.x+direction*b.width*.4,current.current.reducedMotion);},
    panByFraction:fraction=>{
      const v=viewer.current,item=v?.world.getItemAt(0),c=read();
      if(!v||!item||!c||current.current.locked||presenting.current||!Number.isFinite(fraction))return;
      cancelMove.current?.();gestureMoving.current=true;
      const b=fixedBounds(aspect(v),c.center.x+fraction*fixedBounds(aspect(v)).width);
      v.viewport.panTo(item.imageToViewportCoordinates(b.x+b.width/2,artwork.height/2),true);
    },
    finishGesture:()=>{if(!gestureMoving.current)return;gestureMoving.current=false;const c=read();if(c&&!presenting.current)current.current.onCamera(c,true);},
  }));
  useEffect(()=>{
    const el=host.current;if(!el)return;
    const gestures={clickToZoom:false,dblClickToZoom:false,dblClickDragToZoom:false,scrollToZoom:false,dragToPan:false,pinchToZoom:false,flickEnabled:false};
    const v=OpenSeadragon({element:el,drawer:[CompositedDrawer,'canvas'],showNavigationControl:false,showNavigator:false,
      mouseNavEnabled:false,keyboardNavEnabled:false,gestureSettingsMouse:gestures,gestureSettingsTouch:gestures,gestureSettingsPen:gestures,
      immediateRender:true,animationTime:.65,blendTime:0,springStiffness:8,visibilityRatio:1,constrainDuringPan:true,
      minZoomLevel:1,maxZoomPixelRatio:2,maxImageCacheCount:256,imageLoaderLimit:12,maxTilesPerFrame:8,
      crossOriginPolicy:false,ajaxWithCredentials:false});
    viewer.current=v;el.dataset.renderer=v.drawer.getType();let alive=true,initialized=false,ready=false,raf=0,resizeRaf=0;
    const backdrop=new ScrollBackdrop(v);
    if(v.drawer instanceof CompositedDrawer)v.addHandler('tile-loaded',async event=>{
      const cache=event.tile.getCache();if(!alive||!cache)return;
      try{
        const image:unknown=await cache.getDataAs('image',false);
        if(alive&&image instanceof HTMLImageElement)await image.decode();
      }catch{/* A cancelled view or unsupported decode must not stall the tile queue. */}
    });
    const saved=current.current.initialCamera;
    const markers:HTMLElement[]=[];
    const markerScenes=new Map<HTMLElement,SceneDefinition>();
    const visibility=()=>{const item=v.world.getItemAt(0);if(!item)return;for(const m of markers){const s=markerScenes.get(m),b=s?.boundsPx;if(!s||!b)continue;const pt=v.viewport.pixelFromPoint(item.imageToViewportCoordinates(s.anchorPx?.x??b.x+b.width/2,s.anchorPx?.y??b.y+b.height/2),true);const visible=pt.x>=22&&pt.x<=el.clientWidth-22&&pt.y>=22&&pt.y<=el.clientHeight-22;const visibility=visible?'visible':'hidden';if(m.style.visibility!==visibility){m.style.visibility=visibility;m.tabIndex=visible?0:-1;}}};
    const notify=(settled:boolean)=>{if(presenting.current)return;visibility();const c=read();if(alive&&initialized&&c&&!presenting.current)current.current.onCamera(c,settled);};
    const syncMarkers=()=>{
      for(const m of markers)v.removeOverlay(m);markers.length=0;markerScenes.clear();
      const item=v.world.getItemAt(0);if(!item)return;
      if(current.current.mode==='observe'||current.current.locked)return;
      for(const s of current.current.scenes){
        const b=s.boundsPx;if(!b)continue;
        const m=document.createElement('button');m.className='scene-marker';m.dataset.sceneId=s.sceneId;
        m.setAttribute('aria-label',scrollSceneTitle(s));m.textContent=s.testFixture?'試':s.culture?.mechanic==='quiz'?'問':s.kind==='minigame'?'遊':'微';m.dataset.review=s.reviewStatus;
        const label=document.createElement('span');label.textContent=scrollSceneTitle(s);m.append(label);
        m.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!current.current.locked){e.preventDefault();current.current.onSceneClick(s);}});
        v.addOverlay({element:m,location:item.imageToViewportCoordinates(s.anchorPx?.x??b.x+b.width/2,s.anchorPx?.y??b.y+b.height/2),placement:OpenSeadragon.Placement.CENTER,checkResize:false});markers.push(m);markerScenes.set(m,s);
      }visibility();
    };
    updateMarkers.current=syncMarkers;
    v.addHandler('open',()=>{
      if(!alive)return;
      const item=v.world.getItemAt(0),getVisibleArea=item.getDrawArea.bind(item);
      // This single, unrotated artwork uses normalized image coordinates.
      // OSD owns loading and eviction; its public draw-area hook warms nearby
      // columns before they enter the clipped screen.
      item.getDrawArea=()=>{
        const area=getVisibleArea();if(!area)return area;
        const range=bufferedRange(area.x,area.width);
        return new OpenSeadragon.Rect(range.x,area.y,range.width,area.height);
      };
      initialized=true;browse(v,saved?.center.x,true);syncMarkers();notify(true);
    });
    v.addHandler('update-viewport',()=>{if(!ready&&initialized&&alive&&backdrop.settled&&v.world.getItemAt(0)?.lastDrawn.length){ready=true;current.current.onReady();}});
    v.addHandler('open-failed',()=>current.current.onError('画卷暂未展开。请检查本机瓦片，然后重试。'));
    v.addHandler('tile-load-failed',()=>current.current.onError('部分原画瓦片未能加载。请重新展开画卷。'));
    v.addHandler('viewport-change',()=>{if(presenting.current)return;cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>notify(false));});
    v.addHandler('animation-finish',()=>{if(!gestureMoving.current)notify(true);});
    let start={x:0,y:0},startCenter=0,maxDistance=0,maxPointers=0,startAt=0;
    const pointers=new Set<number>();
    const down=(e:PointerEvent)=>{
      if(current.current.locked||!ready||e.button>0)return;
      pointers.add(e.pointerId);maxPointers=Math.max(maxPointers,pointers.size);
      if(pointers.size===1){cancelMove.current?.();const c=read();startCenter=c?.center.x??0;start={x:e.clientX,y:e.clientY};maxDistance=0;maxPointers=1;startAt=performance.now();}
      el.setPointerCapture(e.pointerId);el.classList.add('dragging');e.preventDefault();
    };
    const moving=(e:PointerEvent)=>{
      if(!pointers.has(e.pointerId)||current.current.locked)return;
      const dx=e.clientX-start.x;maxDistance=Math.max(maxDistance,Math.hypot(dx,e.clientY-start.y));
      if(maxPointers===1&&maxDistance>8)browse(v,draggedCenter(startCenter,dx,el.clientWidth,aspect(v)),true);
    };
    const up=(e:PointerEvent)=>{
      if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);
      if(el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId);
      if(pointers.size)return;el.classList.remove('dragging');notify(true);
      if(current.current.locked||current.current.mode==='observe'||!isIntentionalClick(performance.now()-startAt<500,maxDistance,maxPointers))return;
      const item=v.world.getItemAt(0),rect=el.getBoundingClientRect();if(!item)return;
      const pt=new OpenSeadragon.Point(e.clientX-rect.left,e.clientY-rect.top);
      const matches=current.current.scenes.map(s=>{const b=s.boundsPx;return {s,d:b?pt.distanceTo(v.viewport.pixelFromPoint(item.imageToViewportCoordinates(s.anchorPx?.x??b.x+b.width/2,s.anchorPx?.y??b.y+b.height/2),true)):Infinity};}).sort((a,b)=>a.d-b.d);
      if(matches[0]?.d<=30){current.current.onSceneClick(matches[0].s);return;}
      const world=item.viewportToImageCoordinates(v.viewport.pointFromPixel(pt,true));
      const near=item.viewportToImageCoordinates(v.viewport.pointFromPixel(pt.plus(new OpenSeadragon.Point(5,0)),true));
      const character=characterAt(world.x,world.y,Math.abs(near.x-world.x));if(character)current.current.onCharacterClick(character);
    };
    const cancel=(e:PointerEvent)=>{pointers.delete(e.pointerId);maxDistance=Infinity;el.classList.remove('dragging');};
    let wheelFrame=0,wheelDistance=0,wheelSettled:ReturnType<typeof setTimeout>|undefined;
    const wheel=(e:WheelEvent)=>{
      e.preventDefault();
      if(current.current.locked||!ready)return;
      const distance=wheelTravel(e,el.clientWidth);if(!distance)return;
      cancelMove.current?.();wheelDistance+=distance;
      if(!wheelFrame)wheelFrame=requestAnimationFrame(()=>{wheelFrame=0;const dx=wheelDistance;wheelDistance=0;const c=read();if(c&&!current.current.locked)browse(v,draggedCenter(c.center.x,dx,el.clientWidth,aspect(v)),true);});
      clearTimeout(wheelSettled);wheelSettled=setTimeout(()=>{if(!current.current.locked)notify(true);},120);
    };
    const block=(e:Event)=>e.preventDefault();
    el.addEventListener('pointerdown',down);el.addEventListener('pointermove',moving);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',cancel);
    el.addEventListener('wheel',wheel,{passive:false,capture:true});el.addEventListener('dblclick',block);el.addEventListener('contextmenu',block);
    const observer=new ResizeObserver(()=>{cancelAnimationFrame(resizeRaf);resizeRaf=requestAnimationFrame(()=>{if(initialized){const c=read();browse(v,c?.center.x,true);notify(true);}});});observer.observe(el);
    const openFrame=requestAnimationFrame(()=>{if(alive)v.open({tileSource:artwork.dziUrl});});
    return()=>{alive=false;cancelMove.current?.();observer.disconnect();cancelAnimationFrame(openFrame);cancelAnimationFrame(raf);cancelAnimationFrame(resizeRaf);
      el.removeEventListener('pointerdown',down);el.removeEventListener('pointermove',moving);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',cancel);
      cancelAnimationFrame(wheelFrame);clearTimeout(wheelSettled);el.removeEventListener('wheel',wheel,true);el.removeEventListener('dblclick',block);el.removeEventListener('contextmenu',block);backdrop.destroy();v.destroy();viewer.current=null;updateMarkers.current=()=>{};
    };
  },[]);
  useEffect(()=>{updateMarkers.current();},[props.locked,props.mode,props.scenes]);
  return <div ref={host} tabIndex={-1} data-testid="scroll-canvas" id="scroll-viewer" className="scroll-viewer" role="region" aria-label="冯宁版长卷，左拖或双指滑动阅读，固定倍率" data-fixed-zoom={viewer.current?fixedCamera(aspect(viewer.current)).zoom:undefined}/>;
});
