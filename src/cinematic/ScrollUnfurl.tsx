import {useEffect,useRef} from 'react';
import {unfurlFrame,UNFURL_DURATION} from './unfurl';

export function ScrollUnfurl({onFrame,onComplete}:{onFrame:(centerX:number)=>void;onComplete:()=>void}){
  const layer=useRef<HTMLDivElement>(null);
  const roller=useRef<HTMLDivElement>(null);
  const grain=useRef<HTMLDivElement>(null);
  const seam=useRef<HTMLDivElement>(null);
  const topGrain=useRef<HTMLSpanElement>(null);
  const bottomGrain=useRef<HTMLSpanElement>(null);
  const current=useRef({onFrame,onComplete});current.current={onFrame,onComplete};
  useEffect(()=>{
    const root=layer.current;if(!root)return;
    let frame=0,elapsed=0,previous=0,lastMetadata=-Infinity,lastFrameSlot=-1,framesRendered=0;
    let width=0,height=0,rollerWidth=0,lastPhase='',lastOpacity=1,lastRollerOpacity=1;
    const measure=()=>{width=root.clientWidth;height=root.clientHeight;rollerWidth=roller.current?.offsetWidth??64;};
    const observer=new ResizeObserver(measure);observer.observe(root);measure();
    const visibility=()=>{previous=0;};
    document.addEventListener('visibilitychange',visibility);
    const render=(now:number)=>{
      if(previous&&!document.hidden)elapsed+=now-previous;
      previous=now;
      if(document.hidden){frame=requestAnimationFrame(render);return;}
      // A bounded 60 Hz film avoids rendering a full Retina canvas 120–240
      // times per second. Missed frames are skipped, never queued or replayed.
      const frameSlot=Math.floor(elapsed*60/1000);
      if(frameSlot===lastFrameSlot&&elapsed<UNFURL_DURATION){frame=requestAnimationFrame(render);return;}
      lastFrameSlot=frameSlot;framesRendered++;
      const f=unfurlFrame(elapsed,width,height);
      current.current.onFrame(f.centerX);
      const distance=f.progress*(f.paperWidth-width),angle=distance/34;
      // These small, pre-rasterized layers only move on the compositor.
      // Never animate gradients, background-position, left, or inherited variables.
      if(grain.current)grain.current.style.transform=`translate3d(${(-distance%96).toFixed(2)}px,0,0)`;
      if(seam.current){seam.current.style.transform=`translate3d(${((.5+Math.sin(angle)*.48)*rollerWidth).toFixed(2)}px,0,0)`;seam.current.style.opacity=String(Math.max(0,Math.cos(angle))*.24);}
      const rotation=`rotate(${(angle%(Math.PI*2)).toFixed(4)}rad)`;
      if(topGrain.current)topGrain.current.style.transform=rotation;
      if(bottomGrain.current)bottomGrain.current.style.transform=rotation;
      if(roller.current&&f.rollerOpacity!==lastRollerOpacity){roller.current.style.opacity=String(f.rollerOpacity);lastRollerOpacity=f.rollerOpacity;}
      if(f.controlsOpacity!==lastOpacity){root.style.opacity=String(f.controlsOpacity);lastOpacity=f.controlsOpacity;}
      if(f.phase!==lastPhase){root.dataset.unfurlPhase=f.phase;lastPhase=f.phase;}
      if(now-lastMetadata>=100||elapsed>=UNFURL_DURATION){
        lastMetadata=now;
        root.dataset.unfurlFrames=String(framesRendered);
        root.dataset.unfurlProgress=f.progress.toFixed(6);
        root.dataset.unfurlReturnProgress=f.returnProgress.toFixed(6);
        root.dataset.unfurlCameraX=f.centerX.toFixed(3);
        root.dataset.unfurlScale=String(f.scale);
      }
      if(elapsed>=UNFURL_DURATION){current.current.onComplete();return;}
      frame=requestAnimationFrame(render);
    };
    frame=requestAnimationFrame(render);root.focus({preventScroll:true});
    return()=>{cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('visibilitychange',visibility);};
  },[]);
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();current.current.onComplete();}
    };
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[]);
  return <div ref={layer} className="scroll-unfurl" data-testid="scroll-unfurl" tabIndex={-1} aria-label="画卷完整展开后，向右回到游戏开头">
    <div ref={roller} className="unfurl-roller" data-testid="unfurl-roller" aria-hidden="true">
      <div className="unfurl-roller-shadow"/>
      <div className="unfurl-paper-curl"/>
      <div className="unfurl-roller-spindle"/>
      <div className="unfurl-roller-cap top"><span ref={topGrain}/></div>
      <div className="unfurl-roller-cap bottom"><span ref={bottomGrain}/></div>
      <div className="unfurl-roller-paper">
        <div ref={grain} className="unfurl-roller-grain"/>
        <div ref={seam} className="unfurl-roller-seam"/>
        <div className="unfurl-roller-light"/>
      </div>
      <div className="unfurl-roller-ring top"/>
      <div className="unfurl-roller-ring bottom"/>
    </div>
  </div>;
}
