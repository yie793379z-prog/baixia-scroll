export const gateRoute=[[-2.4,6.4],[-.8,4.6],[1.4,3],[1.4,1.4],[1.4,-.8]] as const;
export const cargoWeights=[2,3,4,2,3,4] as const;
export function validGateStep(current:number,next:number){return Number.isInteger(next)&&next===current+1&&next<gateRoute.length;}
export function cargoBalance(slots:(number|null)[]){
 let left=0,right=0;slots.forEach((cargo,index)=>{if(cargo!==null){if(index<3)left+=cargoWeights[cargo]??0;else right+=cargoWeights[cargo]??0;}});
 return {left,right,ratio:Math.abs(left-right)/(left+right||1),loaded:slots.filter(x=>x!==null).length};
}
export function placeCargo(slots:(number|null)[],cargo:number,slot:number){
 if(cargo<0||cargo>=6||slot<0||slot>=6||!Number.isInteger(cargo)||!Number.isInteger(slot))return null;
 const old=slots.indexOf(cargo),occupant=slots[slot];if(occupant!==null&&occupant!==cargo&&old<0)return null;
 const next=slots.map(x=>x===cargo?null:x);if(old>=0&&occupant!==null&&occupant!==cargo)next[old]=occupant;next[slot]=cargo;return next;
}
export function safeWaterPosition(x:number,z:number){return Math.abs(x)<3.15&&z<9&&z>-9&&(z> -4.8||z< -7.1||Math.abs(x)<.9);}
export function pointInEvidence(kind:'gate'|'boat',x:number,y:number){return kind==='gate'?x>.55&&x<.72&&y>.43&&y<.72:x>.38&&x<.61&&y>.28&&y<.55;}
