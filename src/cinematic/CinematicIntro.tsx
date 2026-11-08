import {useEffect,useRef,useState} from 'react';
import {openingPoem,LINE_INTERVAL_MS,FULL_POEM_HOLD_MS} from './opening';
import {ScrollUnfurl} from './ScrollUnfurl';
import './unfurl.css';

export function CinematicIntro({ready,error,reducedMotion,onEnter,onRetry,onFrame,onPrepare}:{ready:boolean;error:string;reducedMotion:boolean;onEnter:()=>void;onRetry:()=>void;onFrame:(centerX:number)=>void;onPrepare:()=>void}) {
  const lines=openingPoem.lines;
  const [step,setStep]=useState(reducedMotion?lines.length:-1);
  const [entering,setEntering]=useState(false);
  const [unfurling,setUnfurling]=useState(false);
  const button=useRef<HTMLButtonElement>(null);
  const titleVisible=step>=lines.length;
  const visibleLines=reducedMotion?lines.length:Math.max(0,Math.min(lines.length,step+1));

  useEffect(()=>{
    if(reducedMotion){setStep(lines.length);return;}
    if(titleVisible)return;
    const delay=step<0?450:step===lines.length-1?FULL_POEM_HOLD_MS:LINE_INTERVAL_MS;
    const timer=setTimeout(()=>setStep(s=>s+1),delay);
    return()=>clearTimeout(timer);
  },[step,reducedMotion,titleVisible,lines.length]);
  useEffect(()=>{if(titleVisible)button.current?.focus();},[titleVisible]);
  // Clicking 入卷 always requests the complete unfolding, including for a
  // reduced-motion first visit. Prepare the same viewport before revealing it.
  useEffect(()=>{if(ready&&(!reducedMotion||entering))onPrepare();},[ready,reducedMotion,entering,onPrepare]);
  useEffect(()=>{if(!entering)return;const timer=setTimeout(()=>setUnfurling(true),700);return()=>clearTimeout(timer);},[entering]);
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Tab'){
        const controls=Array.from(document.querySelectorAll<HTMLButtonElement>('.cinematic-intro button:not(:disabled)')).filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
        const first=controls[0],last=controls.at(-1);
        if(first&&last&&((e.shiftKey&&document.activeElement===first)||(!e.shiftKey&&document.activeElement===last))){e.preventDefault();(e.shiftKey?last:first).focus();}
        return;
      }
      if(entering)return;
      if(!['Escape','Enter',' '].includes(e.key))return;
      e.preventDefault();
      if(!titleVisible)setStep(lines.length);
      else if(e.key!=='Escape'&&ready&&!error)setEntering(true);
    };
    window.addEventListener('keydown',key);
    return()=>window.removeEventListener('keydown',key);
  },[titleVisible,ready,error,lines.length,entering]);

  return <section className={`cinematic-intro ${entering?'preparing':''} ${unfurling?'unfurling':''}`} data-testid="cinematic-intro" data-intro-motion={reducedMotion&&!entering?'reduced':'full'} data-intro-stage={entering?'unfurl':titleVisible?'title':'poem'} data-visible-lines={visibleLines} aria-label="白下行卷序幕" role="dialog" aria-modal="true">
    <div className={`cinematic-center ${reducedMotion?'with-poem':''}`}>
      {(!titleVisible||reducedMotion)&&<div className={`cinematic-poem ${step===lines.length-1&&!reducedMotion?'finishing':''}`} aria-live="polite" aria-atomic="false">
        {lines.map((line,i)=><p key={line} className={`poem-line ${i<visibleLines?'visible':''}`} aria-hidden={i>=visibleLines}>{i<visibleLines?line:'\u00a0'}</p>)}
        <p className={`poem-credit ${visibleLines===lines.length?'visible':''}`} aria-hidden={visibleLines<lines.length}>{visibleLines===lines.length?`${openingPoem.author} ·《${openingPoem.title}》`:'\u00a0'}</p>
      </div>}
      {titleVisible&&<div className="cinematic-title"><h1>白下行卷</h1><button ref={button} data-testid="enter-scroll" disabled={!ready||!!error||entering} onClick={()=>setEntering(true)}>{ready?'入卷':'正在备卷'}</button></div>}
      {error&&<div className="cinematic-error" role="alert"><p>{error}</p><button onClick={onRetry}>重新展开</button></div>}
    </div>
    {unfurling&&<ScrollUnfurl onFrame={onFrame} onComplete={onEnter}/>}
  </section>;
}
