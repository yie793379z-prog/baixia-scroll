import {PaintingMedia} from '../ui/PaintingMedia';
import {lazy,Suspense,useState} from 'react';
import type {ActivityProps} from '../scenes/types';
import {knowledgeCard,knowledgeLocations,linkedKnowledge,shortKnowledge} from '../content/knowledge';
import {resolveActivity,sceneActivities,knowledgeActivityTitles} from '../content/tasks';
import {KnowledgeSources,MicroQuestion} from '../ui/KnowledgeBook';
import {GameWorkshop} from './GameWorkshop';
import {QuizActivity} from './QuizActivity';
const V4Game=lazy(()=>import('./v4/V4Game').then(m=>({default:m.V4Game})));

const directions:Record<string,string>={K08:'留意三件器物的形状，把细节卡拖回画中原位；也可先选卡片，再点画中位置。'};
export function LinkedActivity(props:ActivityProps){
 const id=linkedKnowledge[props.scene.sceneId],available=sceneActivities(props.scene);
 const [selected,setSelected]=useState(()=>resolveActivity(props.scene,props.initialActivity));
 const activity=resolveActivity(props.scene,selected);
 return <div className="linked-activity">{available.length>1&&<nav className="activity-switch" aria-label="此处玩法">{available.map(choice=><button key={choice} aria-pressed={activity===choice} onClick={()=>setSelected(choice)}>{choice==='three'?'立体入画 · 水门行舟':choice==='knowledge'?'游画 · '+knowledgeActivityTitles[id]:props.scene.sceneId==='water_gate'?'第一人称 · 搬货装船':props.scene.culture?.mechanic==='quiz'?'问画':'游画'}</button>)}</nav>}{activity==='three'?<Suspense fallback={<p role="status">正在展开细处…</p>}><V4Game {...props}/></Suspense>:activity==='knowledge'?<KnowledgeActivity {...props} cardId={id}/>:props.scene.culture?.mechanic==='quiz'?<QuizActivity {...props}/>:<GameWorkshop {...props}/>}</div>;
}
export function KnowledgeActivity({scene,cardId,onComplete,onExit}:ActivityProps&{cardId:string}){
 const card=knowledgeCard(cardId),[phase,setPhase]=useState<'intro'|'play'|'success'>('intro'),[attempt,setAttempt]=useState(0),[quiz,setQuiz]=useState(false),[reflection,setReflection]=useState('');
 return <section className="knowledge-activity" data-knowledge-game={cardId} data-knowledge-phase={phase}><header className="workshop-heading"><h2>{knowledgeActivityTitles[cardId]}</h2></header>
  {phase==='intro'&&<div className="knowledge-intro"><PaintingMedia playSceneId={scene.sceneId} src={`/culture/${cardId}.jpg`} alt={`${knowledgeActivityTitles[cardId]}场景视频`}/><div><p className="observation">{shortKnowledge[cardId]}</p><p>{directions[cardId]}</p><button className="primary" onClick={()=>setPhase('play')}>动手试试</button><KnowledgeSources card={card}/></div></div>}
  {phase==='play'&&<><p className="game-instructions">{directions[cardId]}</p><MatchGame key={attempt} onDone={()=>setPhase('success')}/></>}
  {phase==='success'&&<div className="knowledge-success"><PaintingMedia playSceneId={scene.sceneId} src={`/culture/${cardId}.jpg`} alt={`${knowledgeActivityTitles[cardId]}场景视频`}/><div><span className="outcome-seal">得</span><h3>器物归位，细处生趣。</h3><p>{shortKnowledge[cardId]}</p><details onToggle={e=>setQuiz(e.currentTarget.open)}><summary>再想一道轻松小题</summary>{quiz&&<MicroQuestion card={card}/>}</details><KnowledgeSources card={card}/><label className="reflection-label">札记<textarea aria-label="札记" value={reflection} onChange={e=>setReflection(e.target.value)} maxLength={200} placeholder="写下今天新发现的小细节……"/></label><div className="outcome-actions"><button className="primary" onClick={()=>onComplete({summary:shortKnowledge[cardId],evidenceIds:[`A-${cardId}`,`B-${cardId}`],testFixture:false,reviewOnly:true,knowledgeCardId:cardId,reflection})}>{reflection.trim()?'保存札记':'完成'}</button><button onClick={()=>{setAttempt(n=>n+1);setPhase('play');}}>再试一次</button></div></div></div>}
  <footer className="workshop-footer"><span>看一处，亲手试一回。</span><button className="text-button" onClick={onExit}>继续行卷</button></footer>
 </section>;
}
const objectLabels=['悬挂的白色器物','台上的圆形容器','左侧的提梁桶'];
function MatchGame({onDone}:{onDone:()=>void}){
 const location=knowledgeLocations.find(l=>l.cardId==='K08')!,b=location.boundsPx!,objects=location.objects!;
 const [selected,setSelected]=useState<number|null>(null),[found,setFound]=useState<number[]>([]),[hint,setHint]=useState(false),[notice,setNotice]=useState('');
 const place=(target:number,id=selected)=>{if(id===null||found.includes(target))return;if(id!==target){setNotice('再看形状和周围的位置。可以打开提示找找轮廓。');return;}const next=[...found,target];setFound(next);setSelected(null);setNotice('找到'+objectLabels[target]+'了。');if(next.length===objects.length)onDone();};
 return <div className="knowledge-match"><div className={`match-image ${hint?'show-hints':''}`}><img src="/culture/K08.jpg" alt="街市铺面原画" decoding="async"/>{objects.map((o,i)=><button key={i} className={`match-target ${found.includes(i)?'found':''}`} data-match-target={i} aria-label={'画中位置 '+(i+1)} disabled={found.includes(i)} style={{left:`${(o.x-b.x)/b.width*100}%`,top:`${(o.y-b.y)/b.height*100}%`,width:`${o.width/b.width*100}%`,height:`${o.height/b.height*100}%`}} onClick={()=>place(i)} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain');if(/^[0-2]$/.test(id))place(i,Number(id));}}><span>{found.includes(i)?'✓':hint?i+1:''}</span></button>)}</div><div className="match-controls"><span className="eyebrow">从画里取出的三件小物</span><div className="match-tray">{[2,0,1].map(i=><button data-match-piece={i} key={i} disabled={found.includes(i)} draggable aria-pressed={selected===i} onClick={()=>setSelected(i)} onDragStart={e=>{e.dataTransfer.setData('text/plain',String(i));setSelected(i);}}><img src={`/culture/K08-object-${i}.png`} alt={objectLabels[i]}/><small>{found.includes(i)?'已归位':objectLabels[i]}</small></button>)}</div><p role="status">{notice||'选一件，回画中找一找。'} 已找到 {found.length} / 3</p><button className="text-button" aria-pressed={hint} onClick={()=>setHint(!hint)}>{hint?'收起轮廓':'给我一点提示'}</button></div></div>;
}
