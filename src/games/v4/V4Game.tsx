import {useEffect,useRef,useState} from 'react';
import type {ActivityProps} from '../../scenes/types';
import {knowledgeCard} from '../../content/knowledge';
import {KnowledgeSources} from '../../ui/KnowledgeBook';
import {V4Engine,type GameView} from './engine';
import {specs,type GameId} from './specs';
import {cargoBalance,pointInEvidence} from './rules';
import './v4.css';

export function V4Game({scene,onComplete,onExit,reducedMotion}:ActivityProps){
 const kind:GameId=scene.sceneId==='city_gate'?'gate':'boat',spec=specs[kind];
 const host=useRef<HTMLDivElement>(null),engine=useRef<V4Engine|null>(null),exitTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [view,setView]=useState<GameView>({phase:'loading',notice:'正在展开纸上城郭…',step:0,failures:0,slots:Array(6).fill(null),balance:0,heading:0,loadMs:0});
 const [layer,setLayer]=useState<'model'|'original'|'sources'>('model'),[identified,setIdentified]=useState(false),[evidenceNotice,setEvidenceNotice]=useState(''),[closing,setClosing]=useState(false);
 const oarY=useRef<number|null>(null);
 const [evidenceMark,setEvidenceMark]=useState({x:0,y:0});
 const completed=view.phase==='completed';
 useEffect(()=>{if(!host.current)return;let current:V4Engine|null=null;
  try{current=new V4Engine(host.current,kind,setView);engine.current=current;}catch{setView(v=>({...v,phase:'error',notice:'这台设备暂未能显示三维场景，可以继续查看原画或返回长卷。'}));}
  return()=>{current?.dispose();engine.current=null;if(exitTimer.current)clearTimeout(exitTimer.current);};
 },[kind]);
 useEffect(()=>{engine.current?.pause(layer!=='model'||closing);},[layer,closing]);
 useEffect(()=>{if(completed)setLayer('original');},[completed]);
 const leave=(record=false)=>{if(closing)return;setClosing(true);exitTimer.current=setTimeout(()=>{if(record)onComplete({summary:spec.learning,evidenceIds:scene.evidenceIds,testFixture:false,reviewOnly:true,gameId:spec.id,gameTitle:spec.title,experience:{observed:scene.culture?.observation??'',operation:kind==='gate'?'沿四段相邻道路行走，找到门洞。':'装载六件货物，调匀配重，操桨通过三处水标。',learned:spec.learning,interpretation:spec.interpretation,asset:spec.asset}});else onExit();},reducedMotion?0:650);};
 const balance=cargoBalance(view.slots),phaseLabel=view.phase==='loading'?'展卷':view.phase==='intro'?'入景':completed?'识物留记':kind==='gate'?'识城门':view.phase==='loading-cargo'?'装稳再行':'循水行舟';
 return <section className={`v4-game ${closing?'v4-exiting':''}`} data-v4-game={kind} data-phase={view.phase} data-step={view.step} data-failures={view.failures} data-identified={identified}>
  <header className="v4-heading"><div><span className="eyebrow">立体入画 · {phaseLabel}</span><h2>{spec.title}</h2></div><span className="v4-seal">行</span></header>
  <div className="v4-layout"><aside className="v4-clue"><span className="eyebrow">见微的线索簿</span><p className="v4-motive">{spec.subtitle}</p><div className="v4-line"/>
   {kind==='gate'?<><strong>{view.step} <small>/ 4 段道路</small></strong><p>先看路标是否相邻，再看前方有无门洞。</p><div className="v4-route-dots">{[0,1,2,3,4].map(i=><i key={i} className={view.step>=i?'passed':''}>{i===0?'起':i}</i>)}</div></>:<><strong>{balance.loaded} <small>/ 6 件货物</small></strong><div className="v4-balance"><span>左舷 {balance.left}</span><span>右舷 {balance.right}</span></div><div className="v4-balance-line"><i style={{left:`${50+(balance.right-balance.left)/18*45}%`}}/></div><p>{view.phase==='loading-cargo'?'货物上的数字是游戏配重。拖到船舱空格，两边尽量放匀。':`已经过 ${view.step} / 3 处水标`}</p>{view.phase==='loading-cargo'&&<button className="primary" data-v4-launch onClick={()=>engine.current?.launch()}>握桨出航</button>}</>}
   <nav className="v4-layers" aria-label="场景层次"><button aria-pressed={layer==='model'} onClick={()=>setLayer('model')}>立体场景</button><button aria-pressed={layer==='original'} onClick={()=>setLayer('original')}>原画对照</button><button aria-pressed={layer==='sources'} onClick={()=>setLayer('sources')}>文化线索</button></nav>
   
  </aside>
  <div className="v4-stage">
   <div className="v4-canvas" ref={host} aria-hidden={layer!=='model'}/>
   {(view.phase==='loading'||view.phase==='intro'||closing)&&<div className={`v4-bridge ${view.phase==='intro'&&!closing?'unfolding':''}`}><img src={spec.crop} alt="进入三维前的原画局部"/><span>{closing?'循卷归来':view.phase==='loading'?'正在展开细处…':'从画中走近'}</span></div>}
   {layer==='original'&&<div className="v4-original"><div className="v4-evidence-art"><img src={spec.crop} alt={scene.culture?.observation} draggable={false} onClick={e=>{if(!completed)return;const img=e.currentTarget,r=img.getBoundingClientRect(),scale=Math.min(r.width/img.naturalWidth,r.height/img.naturalHeight),w=img.naturalWidth*scale,h=img.naturalHeight*scale,ok=pointInEvidence(kind,(e.clientX-r.left-(r.width-w)/2)/w,(e.clientY-r.top-(r.height-h)/2)/h);const parent=img.parentElement!.getBoundingClientRect();setEvidenceMark({x:e.clientX-parent.left,y:e.clientY-parent.top});setIdentified(ok);setEvidenceNotice(ok?'找到了。把这处发现记在行旅簿里。':kind==='gate'?'顺着铺地看，找右侧大墙体下的入口。':'留意门洞前、紧贴墙脚的有篷船。');}}/>{identified&&<span className={`v4-evidence-mark ${kind}`} style={{left:evidenceMark.x-20,top:evidenceMark.y-20}}>✓</span>}</div><p>{completed?spec.question:'原画局部 · 从这里读门、路与人的关系。'}</p>{completed&&<p role="status">{evidenceNotice||'点一下画中对应的对象。'}</p>}{identified&&<div className="v4-knowledge"><p>{spec.learning}</p><button className="primary" onClick={()=>leave(true)}>收入行旅簿</button></div>}</div>}
   {layer==='sources'&&<div className="v4-sources"><span className="eyebrow">画中细节 · 文献线索</span><h3>这一处，怎样读？</h3><p><b>画中所见</b><br/>{kind==='gate'?'墙体围合、门洞与门前道路可以辨认。':'水门前可见有篷船，船上人物正在活动。'}</p><p><b>文化线索</b><br/>{spec.learning}</p><KnowledgeSources card={knowledgeCard(spec.card)}/></div>}
   {view.phase==='error'&&<div className="v4-error"><img src={spec.crop} alt="原画局部"/><p role="alert">{view.notice}</p><button className="primary" onClick={()=>leave()}>返回长卷</button></div>}
   {layer==='model'&&!['loading','intro','error'].includes(view.phase)&&<div className={`v4-notice ${view.failures?'with-feedback':''}`} role="status">{view.notice}</div>}
   {kind==='gate'&&layer==='model'&&view.phase==='inspect'&&<button className="v4-view-reset" onClick={()=>engine.current?.resetView()}>回正视角</button>}
   {kind==='boat'&&layer==='model'&&view.phase==='sailing'&&<div className="v4-steer" aria-label="船头转向">{(['ArrowLeft','ArrowRight'] as const).map((key,i)=><button key={key} aria-label={i?'船头右转':'船头左转'} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);engine.current?.steer(key,true);}} onPointerUp={()=>engine.current?.steer(key,false)} onPointerCancel={()=>engine.current?.steer(key,false)} onLostPointerCapture={()=>engine.current?.steer(key,false)}>{i?'→':'←'}</button>)}</div>}
   {kind==='boat'&&layer==='model'&&view.phase==='sailing'&&<button className="v4-oar-handle" aria-label="握住桨柄上下划动" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);oarY.current=e.clientY;}} onPointerMove={e=>{if(oarY.current!==null){engine.current?.stroke(Math.abs(e.clientY-oarY.current));oarY.current=e.clientY;}}} onPointerUp={()=>oarY.current=null} onPointerCancel={()=>oarY.current=null} onLostPointerCapture={()=>oarY.current=null}><i/><span>握桨 ↕</span></button>}
  </div></div>
  <footer className="v4-footer"><span>{kind==='gate'?'左键拖动观察 · 点击相邻路标行走':'拖动货物装船 · ← → 转向 · 拖动桨柄 / ↑ 划行'} · Esc 返回</span><button className="text-button" onClick={()=>leave()}>继续行卷</button></footer>
 </section>;
}
