import {PaintingMedia} from '../ui/PaintingMedia';
import { lazy, Suspense, useState } from 'react';
import type { ActivityProps, SceneDefinition, Mechanic } from '../scenes/types';
import { sources } from '../content/culture';
const FirstPersonGame=lazy(()=>import('./first-person/FirstPersonGame').then(m=>({default:m.FirstPersonGame})));
import {WeighGame,FieldGame,PuzzleGame} from './ExtendedGames';
type End=(success:boolean,message:string)=>void;
const instructions:Partial<Record<Mechanic,string>>={
 cart:'进入三维道路，W 前行，A / D 转向，松开会减速。稳住货物，沿路标慢慢送到终点。',
 weigh:'先给空盘校零，再移动秤砣找平衡。看清力臂，用一小步计算读出三包货的重量。',
 field:'指针进入亮绿色窄区时，按 J 抬起、K 落下。每圈只接一次动作，完成四回合；按早、按晚或顺序错会退一步。',
 puzzle:'把真实城门裁切的九块拼回原位。拖动或点击两块即可交换，可随时对照原画。',
 route:'亲自走到桥前，穿过桥面，再沿土路到树下。WASD 走动，按住画面拖动或用触控板双指滑动环顾；方向键也可控制。',
 well:'走到井边，按 E 下桶。按住空格缓提，或在井边按住鼠标向上拖动。到井沿后松手，让水桶稳下来。',
 cargo:'在岸边找到三件包裹，按 E 拿起和放下。重包 3 放中舱，1 与 2 分放两端；配稳后再按 E 送船驶向水门。',
};
export function EvidenceCard({scene}:{scene:SceneDefinition}){return <section className="source-card"><h3>画里的线索</h3><p>{scene.culture?.observation}</p><details><summary>翻一翻相关研究</summary>{sources.filter(s=>scene.sourceRefs.includes(s.id)).map(s=><div className="source-line" key={s.id}><a href={s.url} target="_blank" rel="noreferrer">{s.author}《{s.title}》 ↗</a><small>{s.locator}</small><p>{s.summary}</p></div>)}</details></section>}
export function GameWorkshop({scene,onComplete,onExit,reducedMotion=false}:ActivityProps){
 const mechanic=scene.culture!.mechanic;
 const [phase,setPhase]=useState<'intro'|'playing'|'success'|'failure'|'review'>('intro');
 const [attempt,setAttempt]=useState(0),[message,setMessage]=useState(''),[reflection,setReflection]=useState('');
 const isFps=['route','well','cargo','cart'].includes(mechanic);
 const description=instructions[mechanic]??'走近画中，亲手试试。';
 const finish:End=(ok,text)=>{setMessage(text);setPhase(ok?'success':'failure');};
 const start=()=>{setAttempt(n=>n+1);setPhase('playing');};
 return <div className={`workshop workshop-${mechanic}`} data-game={mechanic} data-game-phase={phase}>
   <header className="workshop-heading"><h2>{scene.title}</h2></header>
   {phase==='intro'&&<div className="workshop-intro"><div className="crop-frame"><PaintingMedia playSceneId={scene.sceneId} src={scene.culture!.previewPath} alt={`${scene.title}场景视频`}/></div><div className="intro-copy"><p className="observation">{scene.culture?.observation}</p><p>{description}</p>{isFps&&<p className="fps-intro-note">第一人称 3D · WASD 走动 · 鼠标拖动 / 双指滑动环顾 · E 动手</p>}<button className="primary" onClick={start}>{mechanic==='observation'?'细看此处':isFps?'走进画中 · 3D':'开始游玩'}</button></div></div>}
   {phase==='playing'&&<div key={attempt} className="game-play"><p className="game-instructions">{description}</p>{isFps?<Suspense fallback={<p>正在展开三维空间…</p>}><FirstPersonGame scene={scene} kind={mechanic as 'route'|'well'|'cargo'|'cart'} onEnd={finish} reducedMotion={reducedMotion}/></Suspense>:mechanic==='weigh'?<WeighGame scene={scene} onEnd={finish}/>:mechanic==='field'?<FieldGame scene={scene} onEnd={finish}/>:mechanic==='puzzle'?<PuzzleGame scene={scene} onEnd={finish}/>:null}</div>}
   {(phase==='success'||phase==='failure')&&<div className="game-outcome" role="status"><span className="outcome-seal">{phase==='success'?'得':'再'}</span><h3>{phase==='success'?'细处，有所见。':'不妨再试一次。'}</h3><p>{message}</p><div className="outcome-actions">{phase==='failure'?<button className="primary" onClick={start}>重新尝试</button>:<button className="primary" onClick={()=>setPhase('review')}>记下这段见闻</button>}<button className="text-button" onClick={onExit}>暂且回到画中</button>{phase==='success'&&<button onClick={start}>再玩一次</button>}</div></div>}
   {phase==='review'&&<div className="review-layout"><PaintingMedia playSceneId={scene.sceneId} className="review-detail" src={scene.culture!.previewPath} alt={`${scene.title}场景视频`}/><div><EvidenceCard scene={scene}/><label className="reflection-label">札记<textarea aria-label="札记" value={reflection} onChange={e=>setReflection(e.target.value)} maxLength={200} placeholder="写下今天新发现的小细节……"/></label><button className="primary" onClick={()=>onComplete({summary:message,evidenceIds:scene.evidenceIds,testFixture:false,reviewOnly:scene.reviewStatus!=='approved',reflection})}>{reflection.trim()?'保存札记':'完成'}</button></div></div>}
   <footer className="workshop-footer"><span>按 Esc 随时回卷</span></footer>
 </div>
}
