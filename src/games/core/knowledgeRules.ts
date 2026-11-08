export interface TracePoint{x:number;y:number}
export const waterRoute:TracePoint[]=[{x:900,y:190},{x:810,y:200},{x:730,y:220},{x:680,y:250},{x:650,y:280},{x:620,y:325}];
// The SVG boat points along +X; use the travel tangent, keeping turns continuous.
export function traceHeading(from:TracePoint,to:TracePoint,previous:number){
 const dx=to.x-from.x,dy=to.y-from.y;
 if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.hypot(dx,dy)<.5)return previous;
 const angle=Math.atan2(dy,dx)*180/Math.PI;
 return previous+((angle-previous+540)%360+360)%360-180;
}
const distance=(a:TracePoint,b:TracePoint)=>Math.hypot(a.x-b.x,a.y-b.y);
function lineDistance(p:TracePoint,a:TracePoint,b:TracePoint){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));return distance(p,{x:a.x+t*dx,y:a.y+t*dy});}
export interface WaterTrace {next:number;trail:TracePoint[];status:'playing'|'failed'|'success'}
export const initialWaterTrace=():WaterTrace=>({next:0,trail:[],status:'playing'});
export function traceWater(s:WaterTrace,p:TracePoint):WaterTrace {
 if(s.status!=='playing'||![p.x,p.y].every(Number.isFinite))return s;
 if(!s.trail.length){return distance(p,waterRoute[0])<=28?{...s,next:1,trail:[p]}:{...s,status:'failed'};}
 const last=s.trail.at(-1)!;
 if(distance(last,p)>65||Math.min(...waterRoute.slice(1).map((v,i)=>lineDistance(p,waterRoute[i],v)))>30)return {...s,status:'failed'};
 const next=distance(p,waterRoute[s.next])<=24?s.next+1:s.next;
 return {next,trail:[...s.trail,p].slice(-1800),status:next===waterRoute.length?'success':'playing'};
}
export interface WaterLift{height:number;water:number;status:'playing'|'failed'|'success'}
export const initialWaterLift=():WaterLift=>({height:0,water:1,status:'playing'});
export function liftWater(s:WaterLift,dy:number,ms:number):WaterLift {
 if(s.status!=='playing'||!Number.isFinite(dy)||!Number.isFinite(ms)||dy<=0||ms<=0)return s;
 const speed=dy/Math.max(16,ms),water=Math.max(0,s.water-Math.max(0,speed-.9)*dy/260),height=Math.min(1,s.height+Math.min(70,dy)/600);
 return {height,water,status:water<.35?'failed':height>=1?'success':'playing'};
}
export const timelineOrder=['谢遂 · 1787','杨大章 · 1791','冯宁 · 1794'];
export function swapOrder<T>(values:T[],a:number,b:number):T[]{if(a<0||b<0||a>=values.length||b>=values.length)return values;const next=[...values];[next[a],next[b]]=[next[b],next[a]];return next;}
