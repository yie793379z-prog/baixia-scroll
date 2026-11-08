/** Walkable courtyard in game metres; models use the same authored layout. */
const circles = [
  {x:0,z:-2,r:1.38}, {x:-1.55,z:-2,r:.35}, {x:1.55,z:-2,r:.35},
  {x:-4.8,z:-3.8,r:.48}, {x:6.2,z:5.8,r:.4},
  {x:6.9,z:-6.6,r:.55}, {x:6.2,z:-6.7,r:.4}, {x:-6.9,z:6.4,r:.45},
];
export function canWalkCourtyard(x:number,z:number):boolean {
  if(x<=-7.25||x>=7.25||z<=-7.1||z>=8.25)return false;
  if(circles.some(c=>Math.hypot(x-c.x,z-c.z)<c.r))return false;
  return !(x>4.3&&x<6.9&&z>-6.3&&z<-5.25);
}

