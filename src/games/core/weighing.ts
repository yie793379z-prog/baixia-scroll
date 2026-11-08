// A calibrated teaching steelyard. d0 accounts for the empty pan/beam torque.
// After zeroing: goodsMass * goodsArm = poiseMass * (poiseDistance - zeroDistance).
export const STEELYARD={poiseMass:100,goodsArm:5,zeroDistance:5,minDistance:5,maxDistance:35,step:.5} as const;
export const weighingRounds=[
 {mass:200,title:'第一笔 · 看懂平衡',instruction:'这包货是 200 克。先用它试秤：秤砣不变重，往外挪就更能压住货物。'},
 {mass:300,title:'第二笔 · 自己读秤',instruction:'这次不告诉你货重。把秤杆调平，用秤砣离定盘星的距离算一算。'},
 {mass:400,title:'第三笔 · 再称一包',instruction:'换一包货，再独立称一次。仍用这杆秤配好的 100 克秤砣。'},
] as const;
export function steelyardReading(distance:number){return STEELYARD.poiseMass*(distance-STEELYARD.zeroDistance)/STEELYARD.goodsArm;}
export function steelyardBalanced(distance:number,mass:number){return Number.isFinite(distance)&&distance>=STEELYARD.minDistance&&distance<=STEELYARD.maxDistance&&Math.abs(steelyardReading(distance)-mass)<5;}
export function correctWeighing(distance:number,mass:number,answer:string){return steelyardBalanced(distance,mass)&&/^\d+(?:\.\d+)?$/.test(answer.trim())&&Number(answer)===mass;}
