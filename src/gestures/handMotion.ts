import {AdaptiveHandFilter,ReleaseGlide,ScrollDamping} from './motionSmoothing';
export interface HandPoint { x:number; y:number; z:number }
export type HandStatus='waiting'|'closed'|'acquiring'|'tracking'|'coasting';
const distance=(a:HandPoint,b:HandPoint)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

/** Finger extension is measured relative to the palm, independent of hand rotation. */
export function openPalm(points:HandPoint[],world:HandPoint[]=points):boolean {
  if(points.length!==21||world.length!==21||[...points,...world].some(p=>![p.x,p.y,p.z].every(Number.isFinite)))return false;
  if(distance(points[0],points[9])<.045)return false;
  let extended=0;
  for(const base of [5,9,13,17]){
    const a=world[base],b=world[base+1],c=world[base+3];
    const ab=distance(a,b),cb=distance(c,b);
    const cosine=((a.x-b.x)*(c.x-b.x)+(a.y-b.y)*(c.y-b.y)+(a.z-b.z)*(c.z-b.z))/Math.max(ab*cb,1e-8);
    if(cosine<-.65&&distance(c,world[0])>distance(b,world[0])*1.12)extended++;
  }
  return extended>=3;
}

/** Relative control: reacquiring a hand establishes a new anchor, never jumps. */
export class HandMotion {
  status:HandStatus='waiting';
  private anchor:number|null=null;
  private raw:number|null=null;
  private seen=0;
  private confirmed=0;
  private filter=new AdaptiveHandFilter();
  private damping=new ScrollDamping();
  private glide=new ReleaseGlide();
  private afterGlide:HandStatus='waiting';
  private tick=0;
  reset(status:HandStatus='waiting'){
    this.anchor=null;this.raw=null;this.filter.reset();this.damping.reset();this.glide.reset();this.confirmed=0;this.seen=0;this.tick=0;this.status=status;this.afterGlide='waiting';
  }
  private release(after:HandStatus='waiting'){
    // Empty frames after release must never extend or restart the coast.
    if(this.status==='coasting')return;
    const speed=this.status==='tracking'?this.damping.speed:0,tick=this.tick;
    this.reset(after);this.tick=tick;this.afterGlide=after;
    this.glide.start(speed);if(this.glide.active)this.status='coasting';
  }
  observe(points:HandPoint[]|undefined,world:HandPoint[]|undefined,time:number){
    if(!points?.length){this.release();return;}
    if(!openPalm(points,world)){
      // A hand leaving the image may be partially cropped before detection
      // disappears. Do not mistake that intermediate frame for an explicit fist.
      const cropped=points.some(p=>p.x<.02||p.x>.98||p.y<.02||p.y>.98);
      if(cropped)this.release();else this.reset('closed');
      return;
    }
    if(this.status==='coasting')this.reset();
    if(this.seen&&time<=this.seen)return;
    const rawX=1-[0,5,9,13,17].reduce((sum,i)=>sum+points[i].x,0)/5;
    if(this.seen&&time-this.seen>220)this.reset();
    if(this.raw!==null&&Math.abs(rawX-this.raw)>.16)this.reset();
    this.seen=time;this.raw=rawX;
    const x=this.filter.sample(rawX,time);
    if(this.anchor===null||this.confirmed<3){this.anchor=x;this.confirmed++;this.status='acquiring';return;}
    this.status='tracking';
    const delta=x-this.anchor;
    // Retain the slop instead of releasing the whole threshold in a jump.
    const accepted=Math.sign(delta)*Math.max(0,Math.abs(delta)-.003);
    if(accepted){this.damping.add(-accepted*2.4);this.anchor+=accepted;}
  }
  step(time:number):number {
    const dt=this.tick?Math.max(0,time-this.tick):16.67;this.tick=time;
    if(dt>250){this.reset();return 0;}
    if(this.seen&&time-this.seen>220)this.release();
    if(this.status==='coasting'){
      const move=this.glide.step(dt/1000);
      if(!this.glide.active)this.status=this.afterGlide;
      return move;
    }
    if(this.status!=='tracking')return 0;
    return this.damping.step(dt/1000);
  }
}
