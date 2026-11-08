import {PaintingMedia} from '../ui/PaintingMedia';
import { useEffect, useRef, useState } from 'react';
import type { SceneDefinition } from '../scenes/types';
import {FIELD_CYCLE_MS,FIELD_WINDOW,fieldBeat,strikeField} from './core/fieldRhythm';
import './field-rhythm.css';
type End=(ok:boolean,message:string)=>void;
export {WeighGame} from './WeighGame';
export function FieldGame({scene,onEnd}:{scene:SceneDefinition;onEnd:End}){
 const [hits,setHits]=useState(0),[message,setMessage]=useState('看准亮绿色窄区：先抬起，再落下。每圈只接一次动作。'),[ready,setReady]=useState(false);
 const meter=useRef<HTMLSpanElement>(null),stage=useRef<HTMLDivElement>(null),ref=useRef({hits:0,lastCycle:-1}),finished=useRef(false),end=useRef(onEnd);end.current=onEnd;
 const base=useRef(performance.now()),wasReady=useRef(false);
 const hit=(key:'j'|'k')=>{
  if(finished.current||document.hidden)return;
  const next=strikeField(ref.current,key,performance.now()-base.current);ref.current=next;setHits(next.hits);
  if(next.result==='used'){setMessage('这一圈已经出手了，等下一圈再接。');return;}
  if(next.result==='order'||next.result==='timing'){setMessage((next.result==='order'?'顺序错了。':'没踩准亮绿区。')+'退回一步，下一圈再接'+(next.hits%2?'落下。':'抬起。'));return;}
  setMessage(next.hits%2?'抬起接住了！下一圈落下。':'这一回合合上了！下一圈抬起。');
  if(next.hits===8){finished.current=true;end.current(true,'你在窄拍点里接上了四回合起落。先抬起、再落下，动作齐整，场院上的配合更利落了。');}
 };
 const hitRef=useRef(hit);hitRef.current=hit;
 useEffect(()=>{let frame=0,hiddenAt:number|null=null;
  const tick=(now:number)=>{const beat=fieldBeat(now-base.current),canHit=beat.ready&&beat.cycle!==ref.current.lastCycle;
   if(meter.current)meter.current.style.left=`${beat.phase*100}%`;
   if(stage.current){stage.current.dataset.phase=String(beat.phase);stage.current.dataset.cycle=String(beat.cycle);stage.current.dataset.ready=String(canHit);}
   if(wasReady.current!==canHit){wasReady.current=canHit;setReady(canHit);}
   frame=requestAnimationFrame(tick);
  };
  const visibility=()=>{if(document.hidden){hiddenAt=performance.now();cancelAnimationFrame(frame);}else{if(hiddenAt!==null)base.current+=performance.now()-hiddenAt;hiddenAt=null;frame=requestAnimationFrame(tick);}};
  const key=(e:KeyboardEvent)=>{const k=e.key.toLowerCase();if((k==='j'||k==='k')&&!e.repeat&&!(e.target as HTMLElement).closest('input,textarea,select')){e.preventDefault();hitRef.current(k);}};
  frame=requestAnimationFrame(tick);window.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility);};
 },[]);
 return <div className="field-game" ref={stage} data-field-hits={hits}>
  <div className="field-picture"><PaintingMedia playSceneId={scene.sceneId} src={scene.culture!.previewPath} alt="原画中持长柄木具的劳动者"/><div className={`field-tool ${hits%2?'raised':''}`} aria-hidden="true"/></div>
  <div className="field-controls"><span className="model-label">跟着同伴，一起起落</span><h3>场院合力</h3>
   <div className={`field-beat ${ready?'is-ready':''}`}>
    <strong>{ready?(hits%2?'现在落下 · K':'现在抬起 · J'):'等指针进入亮绿区'}</strong>
    <div className="field-meter" aria-label="指针进入中间亮绿区时出手"><i style={{left:`${FIELD_WINDOW.start*100}%`,width:`${(FIELD_WINDOW.end-FIELD_WINDOW.start)*100}%`}}/><span ref={meter}/></div>
    <small>每圈 {FIELD_CYCLE_MS/1000} 秒 · 绿色区间约 0.13 秒</small>
   </div>
   <p aria-live="polite">{message}</p><div className="field-action-buttons"><button aria-pressed={hits%2===0} onClick={()=>hit('j')}>抬起 · J</button><button aria-pressed={hits%2===1} onClick={()=>hit('k')}>落下 · K</button></div>
   <p>配合 {Math.floor(hits/2)} / 4 回合 · 失误退一步</p>
  </div>
 </div>;
}
const initialTiles=[4,0,8,1,6,2,7,3,5];
export function PuzzleGame({scene,onEnd}:{scene:SceneDefinition;onEnd:End}){
 const [tiles,setTiles]=useState(initialTiles),[selected,setSelected]=useState<number|null>(null),[original,setOriginal]=useState(false),[moves,setMoves]=useState(0);const complete=useRef(false);
 const swap=(a:number,b:number)=>{if(a===b)return;setTiles(prev=>{const next=[...prev];[next[a],next[b]]=[next[b],next[a]];return next;});setMoves(n=>n+1);setSelected(null);};
 useEffect(()=>{if(tiles.every((v,i)=>v===i)&&!complete.current){complete.current=true;onEnd(true,'门洞、城墙与道路重新连在了一起。沿着砖缝和树枝，细节都找回了自己的位置。');}},[tiles,onEnd]);
 return <div className="puzzle-game"><div className="puzzle-grid" style={{aspectRatio:'1600/1321'}}>{original?<img src={scene.culture!.previewPath} alt="完整城门裁切" decoding="async"/>:tiles.map((piece,index)=><button key={index} data-puzzle-slot={index} data-piece={piece} aria-label={`位置${index+1}，碎片${piece+1}`} aria-pressed={selected===index} draggable onDragStart={e=>e.dataTransfer.setData('text/plain',String(index))} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain');if(/^[0-8]$/.test(id))swap(+id,index);}} onClick={()=>selected===null?setSelected(index):swap(selected,index)} style={{backgroundImage:`url(${scene.culture!.previewPath})`,backgroundSize:'300% 300%',backgroundPosition:`${piece%3*50}% ${Math.floor(piece/3)*50}%`}}><span>{index+1}</span></button>)}</div><div><span className="model-label">循着线条拼回长卷</span><h3>沿着线条，找回重门。</h3><p>拖动交换两块，或依次点击两块。看砖缝、屋脊、树枝和道路怎样相接。</p><button className="primary" onClick={()=>setOriginal(v=>!v)}>{original?'继续拼合':'看一眼原画'}</button><p>已合 {tiles.filter((p,i)=>p===i).length} / 9 块 · 交换 {moves} 次</p></div></div>;
}
