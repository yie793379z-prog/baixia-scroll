// All thresholds and masses below are game models, never historical measurements.
export interface Point {x:number;y:number}
export const roadPath:Point[]=[{x:1350,y:230},{x:1250,y:245},{x:1110,y:215},{x:1010,y:250},{x:950,y:285},{x:880,y:310},{x:790,y:340},{x:640,y:375},{x:500,y:380}];
export interface RouteState {next:number;trail:Point[];status:'playing'|'success'|'failure'}
export const initialRoute=():RouteState=>({next:0,trail:[],status:'playing'});
export function distanceToSegment(p:Point,a:Point,b:Point):number {
  const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
export function advanceRoute(s:RouteState,p:Point):RouteState {
  if(s.status!=='playing')return s;
  if(s.next===0&&Math.hypot(p.x-roadPath[0].x,p.y-roadPath[0].y)>65)return {...s,status:'failure'};
  if(s.trail.length&&Math.hypot(p.x-s.trail.at(-1)!.x,p.y-s.trail.at(-1)!.y)>160)return {...s,status:'failure'};
  const onRoad=roadPath.slice(1).some((b,i)=>distanceToSegment(p,roadPath[i],b)<46);
  if(!onRoad)return {...s,status:'failure'};
  const target=roadPath[Math.min(s.next,roadPath.length-1)];
  const next=s.next+(Math.hypot(p.x-target.x,p.y-target.y)<60?1:0);
  return {next,trail:[...s.trail,p].slice(-1500),status:next>=roadPath.length?'success':'playing'};
}
export interface WellState {height:number;velocity:number;swing:number;water:number;status:'playing'|'success'|'failure'}
export const initialWell=():WellState=>({height:0,velocity:0,swing:0,water:1,status:'playing'});
export function stepWell(s:WellState,pull:number,dt:number):WellState {
  if(s.status!=='playing')return s;dt=Math.max(0,Math.min(.05,dt));
  const velocity=s.velocity+(Math.max(0,Math.min(1,pull))*.2-s.velocity)*Math.min(1,dt*4);
  const acceleration=(velocity-s.velocity)/Math.max(dt,.001);
  const swing=Math.max(0,s.swing+Math.abs(acceleration)*dt*2.4-dt*.14);
  const water=Math.max(0,s.water-Math.max(0,swing-.32)*dt*.38-Math.max(0,pull-.82)*dt*.5);
  const height=Math.min(1,s.height+velocity*dt);
  const status=water<.55?'failure':height>=.999&&velocity<.022?'success':'playing';
  return {height,velocity,swing,water,status};
}
export const cargoWeights=[3,2,1] as const;
export type CargoSlots=(number|null)[];
export function cargoBalance(slots:CargoSlots):number {
  const masses:number[]=slots.map(id=>id===null?0:cargoWeights[id]??0),total=masses.reduce((a,b)=>a+b,0);
  return total?(masses[2]-masses[0])/total:0;
}
export function cargoReady(slots:CargoSlots):boolean {
  return slots.length===3&&slots.every(x=>Number.isInteger(x)&&x!>=0&&x!<=2)&&new Set(slots).size===3&&Math.abs(cargoBalance(slots))<=.2;
}
export function placeCargo(slots:CargoSlots,packageId:number,slot:number):CargoSlots {
  if(![0,1,2].includes(packageId)||![0,1,2].includes(slot))return slots;
  const next=slots.map(x=>x===packageId?null:x);next[slot]=packageId;return next;
}
export function safeStroke(interval:number):boolean{return interval>=450&&interval<=1400;}
export type Grade='A'|'B'|'C'|'D';
export const evidenceCards:{id:string;text:string;grade:Grade;basis:string}[]=[
 {id:'visible-date',text:'这张款识裁切中能看到“乾隆五十九年”。',grade:'A',basis:'直接观察当前母版款识。'},
 {id:'visible-name',text:'款识中能看到“臣冯宁”。',grade:'A',basis:'直接观察当前母版款识。'},
 {id:'museum-date',text:'馆藏条目把冯宁此卷标为1794年。',grade:'B',basis:'德基艺术博物馆藏品条目·年代。'},
 {id:'scholar-copy',text:'聂崇正论述此卷与杨大章摹本的关系。',grade:'B',basis:'聂崇正正文第4段。'},
 {id:'hypothesis',text:'失佚祖本或有明代渊源——邱士华的推测。',grade:'C',basis:'邱士华在图20之后提出的推论。'},
 {id:'fiction',text:'见微受客店掌柜委托，编写见闻录。',grade:'D',basis:'本游戏原创身份和任务。'},
];
export function classifyEvidence(answers:Record<string,Grade|undefined>){const incorrect=evidenceCards.filter(c=>answers[c.id]!==c.grade).map(c=>c.id);return {success:incorrect.length===0,incorrect};}
