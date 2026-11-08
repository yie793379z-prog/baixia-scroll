import {PaintingMedia} from '../ui/PaintingMedia';
import { useEffect, useRef, useState } from 'react';
import type { ActivityProps } from '../scenes/types';
import { sources } from '../content/culture';
export function QuizActivity({scene,onComplete,onExit}:ActivityProps){
 const questions=scene.culture!.questions!;
 const [step,setStep]=useState(0),[chosen,setChosen]=useState<number|null>(null),[done,setDone]=useState(false),[reflection,setReflection]=useState(''),[hint,setHint]=useState(false);
 const question=questions[step],correct=chosen===question.answer;
 const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{if(step>0)heading.current?.focus({preventScroll:true});},[step]);
 const kinds={look:'画中线索',poem:'诗里人间',craft:'手艺窍门',life:'生活掌故'};
 return <div className="quiz-activity" data-quiz={scene.sceneId} data-quiz-step={step}>
  <header className="workshop-heading"><h2>{scene.title}</h2></header>
  <div className="quiz-layout"><figure><PaintingMedia src={scene.culture!.previewPath} alt={scene.culture!.observation}/><p className="quiz-picture-clue"><b>画中线索</b>{done?scene.culture!.observation:question.pictureClue}</p></figure><div>
   {!done?<><span className="model-label">{kinds[question.kind]} · {step+1} / {questions.length}</span><div className="quiz-progress" aria-label={`已完成 ${step+(correct?1:0)} / ${questions.length} 题`}>{questions.map((_,i)=><span key={i} className={i<step||i===step&&correct?'passed':''}/>)}</div>
    {question.verse&&<blockquote className="quiz-verse"><p>{question.verse.text}</p><cite>{question.verse.author} ·《{question.verse.title}》</cite></blockquote>}
    <h3 ref={heading} tabIndex={-1}>{question.prompt}</h3><div className="quiz-options">{question.options.map((option,i)=><button key={step+'-'+i} data-option={i} aria-pressed={chosen===i} disabled={correct} className={chosen===i?(correct?'correct':'try-again'):''} onClick={()=>{setChosen(i);if(i!==question.answer)setHint(true);}}><span>{['甲','乙','丙','丁'][i]??i+1}</span>{option}</button>)}</div>
    {!correct&&<div className="quiz-help"><button className="text-button" onClick={()=>setHint(true)}>给我一点提示</button>{hint&&<><p role="status">{chosen!==null&&!correct?'再看一眼就好。':''}见微悄悄说：{question.hint}</p><button className="text-button" onClick={()=>setChosen(question.answer)}>一起看看答案</button></>}</div>}
    {correct&&<div className="quiz-feedback" role="status"><strong>{question.knowledgePoint}</strong><p>{question.explanation}</p><details><summary>这段知识的出处</summary><small>{question.locator}</small>{sources.filter(s=>question.sourceIds.includes(s.id)).map(s=><a key={s.id} href={s.url} target="_blank" rel="noreferrer">{s.author} · {s.title} ↗</a>)}</details></div>}
    {correct&&<button className="primary" onClick={()=>{if(step===questions.length-1)setDone(true);else{setStep(n=>n+1);setChosen(null);setHint(false);}}}>{step===questions.length-1?'收下这份小发现':'再来一道'}</button>}
   </>:<><span className="outcome-seal">知</span><h3>细看一处，多知一点。</h3><ul className="quiz-discoveries">{questions.map(q=><li key={q.knowledgePoint}>{q.knowledgePoint}</li>)}</ul><label className="reflection-label">札记<textarea aria-label="札记" value={reflection} maxLength={200} onChange={e=>setReflection(e.target.value)} placeholder="哪一处手艺或故事，让你重新看了这幅画？"/></label><button className="primary" onClick={()=>onComplete({summary:scene.culture!.observation+' '+questions.map(q=>q.explanation).join(' '),evidenceIds:scene.evidenceIds,testFixture:false,reviewOnly:scene.reviewStatus!=='approved',reflection})}>{reflection.trim()?'保存札记':'完成'}</button></>}
  </div></div><footer className="workshop-footer"><span>慢慢看，轻松答。</span><button className="text-button" onClick={onExit}>继续行卷</button></footer>
 </div>;
}
