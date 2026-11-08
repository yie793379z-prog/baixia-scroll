import {useState} from 'react';
import {mediaUrl} from '../media/mediaUrl';
import type {SceneDefinition} from '../scenes/types';
import {travelLines,type PaintedCharacter} from '../content/characters';
import {isTaskAvailable,taskEntry,playEntries,isActivityComplete} from '../content/tasks';
import type {ActivityChoice} from '../scenes/types';
import {taskPoem,taskPoemCredit} from '../content/taskPoems';

interface TaskProps {scenes:SceneDefinition[];onEnter:(scene:SceneDefinition,choice?:ActivityChoice)=>void;completedIds:string[]}
export function TravelTasks({scenes,onEnter,completedIds}:TaskProps){
 const [tab,setTab]=useState<'play'|'quizzes'>('play');
 const groups={play:scenes.filter(s=>isTaskAvailable(s,'play')),quizzes:scenes.filter(s=>isTaskAvailable(s,'quizzes'))};
 const selected=[...groups[tab]].sort((a,b)=>(b.anchorPx?.x??0)-(a.anchorPx?.x??0));
 const entriesFor=(scene:SceneDefinition)=>tab==='play'?playEntries(scene):[taskEntry(scene,'quizzes')];
 const entries=selected.flatMap(entriesFor),visited=entries.filter(e=>isActivityComplete(e.id,completedIds)).length;
 return <section className="travel-tasks"><span className="eyebrow">见微 · 一路寻事</span><h2>卷中寻访</h2><p>看一眼画中此处，挑一件事亲手试试。</p>
  <div className="task-tabs" aria-label="卷中寻访分类">{([['play','游画'],['quizzes','问画']] as const).map(([key,title])=><button key={key} aria-pressed={tab===key} onClick={()=>setTab(key)}>{title} · {groups[key].length}</button>)}</div>
  <div className="task-list-caption"><span>循卷右 → 卷左</span><span>已完成 {visited} / {entries.length}</span></div>
  <div className="travel-task-list">{selected.map(s=>{
   const choices=entriesFor(s),allDone=choices.every(e=>isActivityComplete(e.id,completedIds)),poem=taskPoem(s.sceneId,tab),multiple=choices.length>1;
   return <article key={s.sceneId} data-task-id={s.sceneId} data-task-completed={allDone} className={'travel-task illustrated-task'+(multiple?' multi-entry-task':'')}>
    <img src={s.culture?.previewPath?mediaUrl(s.culture.previewPath):undefined} alt="" loading="lazy" decoding="async" crossOrigin="anonymous" draggable={false}/><div className="task-copy"><strong>{multiple?s.title:choices[0].title}</strong>{poem&&<span className="task-poem" title={taskPoemCredit(poem)}>{poem.line}</span>}</div>
    <div className="task-entry-actions">{choices.map(entry=>{const done=isActivityComplete(entry.id,completedIds);return <button key={entry.id} aria-label={entry.title+' · '+entry.action+' · '+(done?'再访':'前往')} data-task-entry={entry.id} data-task-choice={entry.choice} data-task-completed={done} onClick={()=>onEnter(s,entry.choice)}>{multiple&&<b>{entry.choice==='original'&&s.sceneId==='water_gate'?'第一人称 · 搬货装船':entry.title}</b>}<em>{done?'再访':'前往'} ›</em></button>;})}</div>
   </article>;
  })}</div>
 </section>;
}

export function TravelTalk({character,scenes,onEnter}:{character:PaintedCharacter;scenes:SceneDefinition[];onEnter:(s:SceneDefinition)=>void}){
 const [line,setLine]=useState(character.line),[showTasks,setShowTasks]=useState(false);
 const nearby=[...scenes].sort((a,b)=>Math.abs((a.anchorPx?.x??0)-character.x)-Math.abs((b.anchorPx?.x??0)-character.x)).slice(0,3);
 return <><span className="eyebrow">见微 · 途中相逢</span><h2>沿途闲谈</h2><p className="travel-reply" role="status">{travelLines[line%travelLines.length]}</p>
  <div className="dialogue-choices"><button onClick={()=>setLine(n=>n+1)}>再聊一句</button><button onClick={()=>setShowTasks(true)}>附近有什么可做的？</button></div>
  {showTasks&&<div className="travel-task-list">{nearby.map(s=><button className="travel-task" key={s.sceneId} data-nearby-task={s.sceneId} onClick={()=>onEnter(s)}><span><strong>{s.title}</strong><small>{s.kind==='minigame'?'聊聊这件事，再亲手试试':'看看画里的细节，答一道小题'}</small></span><em>前往 ›</em></button>)}</div>}
 </>;
}
