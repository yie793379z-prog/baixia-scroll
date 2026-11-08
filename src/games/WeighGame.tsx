import {useRef,useState,type PointerEvent} from 'react';
import type {SceneDefinition} from '../scenes/types';
import {PaintingMedia} from '../ui/PaintingMedia';
import {STEELYARD as scale,weighingRounds,steelyardReading,steelyardBalanced,correctWeighing} from './core/weighing';
import './weighing.css';

export function WeighGame({scene,onEnd}:{scene:SceneDefinition;onEnd:(ok:boolean,message:string)=>void}){
 const [calibrated,setCalibrated]=useState(false),[round,setRound]=useState(0),[distance,setDistance]=useState(12),[answer,setAnswer]=useState(''),[note,setNote]=useState('先称空盘。把秤砣移到定盘星，让秤杆水平。'),[done,setDone]=useState(false),[choice,setChoice]=useState<number|null>(null);
 const dragging=useRef<number|null>(null),finished=useRef(false);
 const order=weighingRounds[round],mass=calibrated?order.mass:0,reading=steelyardReading(distance),balanced=steelyardBalanced(distance,mass),tilt=Math.max(-12,Math.min(12,(reading-mass)*.045));
 const pivot=160,poiseX=pivot+distance*10,zeroX=pivot+scale.zeroDistance*10;
 const adjust=(value:number)=>setDistance(Math.max(scale.minDistance,Math.min(scale.maxDistance,Math.round(value/scale.step)*scale.step)));
 const move=(e:PointerEvent<SVGSVGElement>)=>{const matrix=e.currentTarget.getScreenCTM();if(!matrix)return;const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());adjust((p.x-pivot)/10);};
 const submit=()=>{
  if(!balanced){setNote(reading<mass?'货物一端还低：把秤砣向外移，增大它的力臂。':'秤砣一端还低：把秤砣往提绳处收一点。');return;}
  if(!calibrated){setCalibrated(true);setNote('空盘已校零。接下来先称这包已知 200 克的货物。');return;}
  if(!correctWeighing(distance,mass,answer)){setNote(`先算 ${distance} − 5 = ${distance-5} 厘米，再算 100 × ${distance-5} ÷ 5。把得到的克数写进账里。`);return;}
  if(round===weighingRounds.length-1){setDone(true);return;}
  setRound(n=>n+1);setDistance(5);setAnswer('');setNote(`${mass} 克，记好了。换一包货，重新找平衡。`);
 };
 if(done)return <section className="weigh-complete">
  <span className="model-label">三笔都称准了</span><h3>小秤砣，也能称出大分量。</h3>
  <p>你称出了 200、300、400 克。秤砣重量不变，货越重，就要把它移得离提绳越远。</p>
  <p>真实杆秤要先校零、使用配套秤砣，并按对应提绳的秤星读数；不能随意换一枚秤砣后照旧读刻度。</p>
  <details className="weigh-culture"><summary>再想一道轻松小题 · 认识戥子</summary>
   <h4>旧时买少量贵重药材，要称到“两”以下的钱、分，适合用哪一种衡器？</h4>
   <div className="quiz-options">{['称大宗粮食的大秤','称金银、药品的戥子','量谷物容积的斗'].map((label,i)=><button key={label} disabled={choice===1} aria-pressed={choice===i} className={choice===i?(i===1?'correct':'try-again'):''} onClick={()=>setChoice(i)}>{label}</button>)}</div>
   {choice!==null&&<p role="status">{choice===1?'答对了。':'再想想：'}戥子（děng zi）是一种精细衡器。中国国家博物馆收藏的明代戥子，能称到钱、分，适合金银、药品等贵重物品。</p>}
   <a href="https://www.chnmuseum.cn/zp/zpml/201812/t20181218_26223.shtml" target="_blank" rel="noreferrer">中国国家博物馆 · 戥子 ↗</a>
  </details>
  <button className="primary" onClick={()=>{if(finished.current)return;finished.current=true;onEnd(true,'先校零，再移砣，三笔货物分别称出200、300、400克。学会用货重×货物力臂＝秤砣重×离定盘星的距离验算，并知道真实杆秤要用配套秤砣和对应刻度。');}}>记好三笔称量</button>
 </section>;
 return <div className="weigh-game" data-weigh-round={calibrated?round+1:0} data-balanced={balanced}>
  <aside className="weigh-lesson">
   <PaintingMedia playSceneId={scene.sceneId} src={scene.culture!.previewPath} alt="原画中的市井交易场景"/>
   <span className="model-label">秤里的小知识</span><h3>认得秤，也会用秤。</h3>
   <p><b>提绳</b>是支点。<b>秤砣</b>在长杆上移动；<b>秤星</b>是读数刻度；空盘平衡的位置叫<b>定盘星</b>。</p>
   <p>货物这一边短，秤砣那一边长。移动秤砣改变的是<b>力臂</b>，不是秤砣本身的重量。</p>
   <details><summary>看懂计算与实物</summary><p>这是一杆已校准的教学秤：用克、厘米练习。空盘和秤杆的影响已计入定盘星，计算时要减去这段零点距离。</p><p>真实杆秤按配套秤砣与秤星读数，不必逐次计算。</p><a href="https://openstax.org/books/university-physics-volume-1/pages/12-2-examples-of-static-equilibrium" target="_blank" rel="noreferrer">OpenStax · 杠杆与静力平衡 ↗</a><br/><a href="https://www.chnmuseum.cn/zp/zpml/201812/t20181218_26223.shtml" target="_blank" rel="noreferrer">中国国家博物馆 · 戥子 ↗</a></details>
  </aside>
  <div className="weigh-workbench">
   <div className="weigh-steps" aria-label="称量步骤">{['校零','第一笔','第二笔','第三笔'].map((label,i)=><span key={label} aria-current={(calibrated?round+1:0)===i?'step':undefined}>{label}</span>)}</div>
   <h3>{calibrated?order.title:'先校零 · 空盘不算货重'}</h3><p>{calibrated?order.instruction:'空盘时，把秤砣挂在定盘星，让两端平衡，再放货物。'}</p>
   <svg viewBox="0 0 580 300" role="img" aria-label={`杆秤：${balanced?'水平平衡':reading<mass?'货物一端下沉':'秤砣一端下沉'}，秤砣距支点${distance}厘米`} onPointerDown={e=>{dragging.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);move(e);}} onPointerMove={e=>{if(dragging.current===e.pointerId)move(e);}} onPointerUp={()=>dragging.current=null} onPointerCancel={()=>dragging.current=null} onLostPointerCapture={()=>dragging.current=null}>
    <path d="M160 50V145" stroke="#805a34" strokeWidth="4"/><path d="M145 42Q160 21 175 42" fill="none" stroke="#805a34" strokeWidth="6"/><text x="175" y="54">提绳 · 支点</text>
    <line x1="65" y1="150" x2="535" y2="150" stroke="#b5afa1" strokeDasharray="5 5"/>
    <g transform={`rotate(${tilt} 160 150)`}>
     <line x1="85" y1="150" x2="535" y2="150" stroke="#664321" strokeWidth="10" strokeLinecap="round"/>
     {Array.from({length:31},(_,i)=>i+5).map(d=><line key={d} x1={pivot+d*10} x2={pivot+d*10} y1={d%5===0?137:143} y2="154" stroke={d===5?'#e7ad35':'#f5e8c9'} strokeWidth={d%5===0?3:1.5}/>)}
     {[5,10,15,20,25,30,35].map(d=><text key={d} x={pivot+d*10} y="126" textAnchor="middle">{d===5?'0':steelyardReading(d)}</text>)}
     <text x="250" y="103" textAnchor="middle">定盘星：零刻度</text><text x="480" y="103">秤星 / 克</text><circle cx={zeroX} cy="150" r="5" fill="#ffda57"/>
     <path d="M110 156V211M77 211H143L134 243H86Z" fill="#c7a16a" stroke="#755535" strokeWidth="3"/>
     {calibrated&&<><rect x="89" y="182" width="42" height="30" rx="5" fill="#8b592e"/><text x="110" y="202" textAnchor="middle" fill="#fff8e7">{round===0?'200g':'待称'}</text></>}
     <line x1={poiseX} x2={poiseX} y1="150" y2="187" stroke="#485b51" strokeWidth="3"/><rect x={poiseX-24} y="185" width="48" height="42" rx="7" fill="#264d42"/><text x={poiseX} y="211" textAnchor="middle" fill="#fff8e7">100g</text>
     <circle cx="160" cy="150" r="6" fill="#e9c477" stroke="#6c4b29"/>
    </g>
    <path d="M110 266H160M110 261V271M160 261V271" stroke="#70583d"/><text x="135" y="290" textAnchor="middle">货物力臂 5cm</text>
    <text x="345" y="270" textAnchor="middle" className={balanced?'weigh-level':'weigh-unlevel'}>{balanced?'✓ 秤杆水平，可以读数':reading<mass?'货物端低 → 秤砣向外移':'秤砣端低 ← 秤砣往回收'}</text>
   </svg>
   <label className="weigh-distance">秤砣距支点 <output>{distance} cm</output><input aria-label="秤砣距支点" type="range" min={scale.minDistance} max={scale.maxDistance} step={scale.step} value={distance} onChange={e=>adjust(+e.target.value)}/></label>
   <div className="weigh-equation"><span>校零后，货重 × 货物力臂 = 秤砣重 × 离定盘星的距离</span><strong>{calibrated?'?':'0'} 克 × 5 厘米 = 100 克 ×（{distance} − 5）厘米</strong>{calibrated&&round===0&&<small>算一算：100 × {distance-5} ÷ 5 = {reading} 克。秤杆平衡时，才是货物的重量。</small>}</div>
   <form onSubmit={e=>{e.preventDefault();submit();}}>
    {calibrated&&<label className="weigh-answer">这包货重<input aria-label="称出的重量" inputMode="decimal" autoComplete="off" value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="填克数"/>克</label>}
    <button className="primary" type="submit">{calibrated?'验算并落账':'校零，开始称货'}</button>
   </form><p className="weigh-feedback" role="status">{note}</p>
  </div>
 </div>;
}
