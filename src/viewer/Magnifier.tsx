import { useEffect, useRef, useState, type RefObject } from 'react';
import OpenSeadragon from 'openseadragon';
import { artwork } from '../content/artwork';
import type { ViewerHandle } from './ScrollViewer';
const SIZE=236;
export function Magnifier({viewer,disabled,onActiveChange}:{viewer:RefObject<ViewerHandle|null>;disabled:boolean;onActiveChange:(active:boolean)=>void}){
 const [active,setActive]=useState(false),[loaded,setLoaded]=useState(false),[error,setError]=useState(false),[zoom,setZoom]=useState(3),[position,setPosition]=useState({x:400,y:300}),[aim,setAim]=useState({x:400,y:300});
 const host=useRef<HTMLDivElement>(null),glass=useRef<OpenSeadragon.Viewer|null>(null),pointer=useRef({x:0,y:0}),factor=useRef(zoom);factor.current=zoom;
 const toggle=(next:boolean)=>{setActive(next);onActiveChange(next);};
 useEffect(()=>{if(disabled&&active){setActive(false);onActiveChange(false);}},[disabled,active,onActiveChange]);
 useEffect(()=>{if(!active||!host.current)return;setLoaded(false);setError(false);const el=host.current;let live=true,frame=0,opened=false;
  const source=document.getElementById('scroll-viewer')!;const box=source.getBoundingClientRect();pointer.current={x:box.left+box.width*.7,y:box.top+box.height*.55};setAim({x:box.width*.7,y:box.height*.55});setPosition({x:box.width*.7,y:box.height*.55});
  const v=OpenSeadragon({element:el,drawer:'canvas',showNavigationControl:false,showNavigator:false,mouseNavEnabled:false,keyboardNavEnabled:false,animationTime:0,blendTime:.1,visibilityRatio:0,constrainDuringPan:false,maxZoomLevel:10000,minZoomLevel:1,maxImageCacheCount:48,imageLoaderLimit:3});glass.current=v;
  const update=()=>{frame=0;if(!live)return;const r=source.getBoundingClientRect();const px=Math.max(0,Math.min(r.width,pointer.current.x-r.left)),py=Math.max(0,Math.min(r.height,pointer.current.y-r.top));setAim({x:px,y:py});setPosition({x:Math.max(SIZE/2+8,Math.min(r.width-SIZE/2-8,px)),y:Math.max(SIZE/2+8,Math.min(r.height-SIZE/2-8,py))});if(!opened)return;const rect=source.getBoundingClientRect(),p=viewer.current?.pointAt(pointer.current.x,pointer.current.y),c=viewer.current?.snapshot(),item=v.world.getItemAt(0);if(!p||!c||!item)return;const side=artwork.width/c.zoom*SIZE/rect.width/factor.current;v.viewport.fitBounds(item.imageToViewportRectangle(p.x-side/2,p.y-side/2,side,side),true);};
  const move=(e:globalThis.PointerEvent)=>{const rect=source.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)return;pointer.current={x:e.clientX,y:e.clientY};if(!frame)frame=requestAnimationFrame(update);};
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setActive(false);onActiveChange(false);return;}const directions:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(!directions[e.key]||(e.target as HTMLElement).closest('input,textarea,select'))return;e.preventDefault();const [dx,dy]=directions[e.key],r=source.getBoundingClientRect(),step=e.shiftKey?48:18;pointer.current={x:Math.max(r.left,Math.min(r.right,pointer.current.x+dx*step)),y:Math.max(r.top,Math.min(r.bottom,pointer.current.y+dy*step))};if(!frame)frame=requestAnimationFrame(update);};
  const zoomChange=()=>update();v.addHandler('open',()=>{opened=true;update();});v.addHandler('tile-drawn',()=>{if(live)setLoaded(true);});v.addHandler('open-failed',()=>{if(live)setError(true);});
  window.addEventListener('pointermove',move);window.addEventListener('keydown',key);window.addEventListener('resize',zoomChange);el.addEventListener('magnifier-zoom',zoomChange);
  const openFrame=requestAnimationFrame(()=>{if(live)v.open({tileSource:artwork.dziUrl});});
  return()=>{live=false;cancelAnimationFrame(frame);cancelAnimationFrame(openFrame);window.removeEventListener('pointermove',move);window.removeEventListener('keydown',key);window.removeEventListener('resize',zoomChange);el.removeEventListener('magnifier-zoom',zoomChange);v.destroy();glass.current=null;};
 },[active,viewer,onActiveChange]);
 useEffect(()=>{host.current?.dispatchEvent(new Event('magnifier-zoom'));},[zoom]);
 return <div className="magnifier-layer">
  {active&&<span className="magnifier-aim" style={{left:aim.x,top:aim.y}}/>}{active&&<div className="magnifying-glass" data-testid="magnifying-glass" style={{left:position.x-SIZE/2,top:position.y-SIZE/2,width:SIZE,height:SIZE}}><div className="magnifier-optics" ref={host}/>{!loaded&&<span className="magnifier-loading">{error?'细节暂未加载，请放回后重试':'正在细看…'}</span>}<span className="magnifier-power">{zoom}× · 高清原画</span></div>}
  <div className="magnifier-controls">{active&&<div className="magnifier-options"><span>移动光标 / 方向键细看 · Esc 放回</span>{[2,3,5].map(n=><button key={n} aria-pressed={zoom===n} onClick={()=>setZoom(n)}>{n}×</button>)}</div>}<button className={`magnifier-tool ${active?'picked-up':''}`} disabled={disabled} aria-label={active?'放回放大镜':'拿起放大镜'} aria-pressed={active} onClick={()=>toggle(!active)}><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="13" cy="13" r="8.5"/><path d="m19.5 19.5 8 8"/><path d="M9 11c1-3 4-4 6-3"/></svg><span>{active?'放回':'细看'}</span></button></div>
 </div>;
}
