import {describe,it,expect} from 'vitest';
import {HandMotion,openPalm,type HandPoint} from '../src/gestures/handMotion';
import {AdaptiveHandFilter,ReleaseGlide,ScrollDamping} from '../src/gestures/motionSmoothing';
function palm(offset=0,closed=false):HandPoint[]{
  const points=Array.from({length:21},()=>({x:.5+offset,y:.8,z:0}));
  for(const [i,x] of [[5,.42],[9,.48],[13,.54],[17,.60]]){
    for(let j=0;j<4;j++)points[i+j]={x:x+offset,y:closed&&j>1?.65+(j-2)*.05:.6-j*.1,z:0};
  }
  return points;
}
function arm(m:HandMotion,offset=0,start=100){for(let i=0;i<4;i++){m.observe(palm(offset),undefined,start+i*50);m.step(start+i*50);}}
describe('camera hand control',()=>{
  it('accepts an open palm but rejects curled fingers, tiny hands and malformed landmarks',()=>{
    expect(openPalm(palm())).toBe(true);expect(openPalm(palm(0,true))).toBe(false);
    expect(openPalm(palm().map(p=>({...p,x:p.x*.01,y:p.y*.01})))).toBe(false);
    const invalid=palm();invalid[8].x=NaN;expect(openPalm(invalid)).toBe(false);expect(openPalm([])).toBe(false);
  });
  it('accepts a rotated palm',()=>{expect(openPalm(palm().map(p=>({x:p.y,y:1-p.x,z:0})))).toBe(true);});
  it('follows a continuously moving open palm without a stationary hold or fist step',()=>{
    const m=new HandMotion();let distance=0;
    for(let i=0;i<10;i++){const t=100+i*50;m.observe(palm(i*.01),undefined,t);distance+=m.step(t);if(i>=3)expect(m.status).toBe('tracking');}
    expect(distance).toBeGreaterThan(.03);
  });
  it('ignores idle jitter without accumulating drift',()=>{
    const m=new HandMotion();arm(m);let travel=0;
    for(let i=0;i<100;i++){const t=300+i*50;m.observe(palm(Math.sin(i)*.002),undefined,t);travel+=Math.abs(m.step(t));}
    expect(travel).toBe(0);
  });
  it('mirrors the camera and moves the artwork in the same direction as the visible hand',()=>{
    const m=new HandMotion();arm(m);m.observe(palm(-.04),undefined,300);
    const first=m.step(300);expect(first).toBeLessThan(0);expect(Math.abs(first)).toBeLessThan(.096);
    let total=first;for(let i=1;i<15;i++){m.observe(palm(-.04),undefined,300+i*40);total+=m.step(300+i*40);}
    expect(total).toBeCloseTo(-(.04-.003)*2.4,3);
  });
  it('stops immediately on a deliberate fist and reacquires without a jump',()=>{
    for(const sample of [palm(0,true)]){
      const m=new HandMotion();arm(m);m.observe(palm(.08),undefined,300);expect(m.step(300)).toBeGreaterThan(0);
      m.observe(sample,undefined,350);expect(m.step(350)).toBe(0);expect(m.step(370)).toBe(0);
      arm(m,-.2,400);expect(m.step(570)).toBe(0);
    }
  });
  it('continues moving after the hand leaves and decelerates without extending on empty frames',()=>{
    const m=new HandMotion();arm(m);
    for(let i=1;i<=10;i++){const t=250+i*50;m.observe(palm(i*.012),undefined,t);m.step(t);}
    m.observe(undefined,undefined,760);expect(m.status).toBe('coasting');
    const moves:number[]=[];for(let i=1;i<=40;i++){const t=750+i*16;m.observe(undefined,undefined,t);moves.push(m.step(t));}
    expect(moves[0]).toBeGreaterThan(0);expect(moves[1]).toBeLessThan(moves[0]);
    expect(moves.every((d,i)=>d>=0&&(i===0||d<=moves[i-1]+1e-10))).toBe(true);
    expect(moves.reduce((a,b)=>a+b,0)).toBeLessThanOrEqual(.160001);
    expect(m.status).toBe('waiting');expect(m.step(1410)).toBe(0);
  });
  it('does not fling a stationary hand and cancels old momentum when a hand returns',()=>{
    const m=new HandMotion();arm(m);m.observe(undefined,undefined,270);expect(m.step(280)).toBe(0);
    arm(m,0,300);m.observe(palm(.08),undefined,500);m.step(500);m.observe(undefined,undefined,510);expect(m.step(516)).toBeGreaterThan(0);
    m.observe(palm(-.2),undefined,530);expect(m.step(532)).toBe(0);expect(m.status).toBe('acquiring');
    arm(m,-.2,550);expect(m.step(710)).toBe(0);
  });
  it('coasts through a partially cropped hand instead of mistaking it for a fist',()=>{
    const m=new HandMotion();arm(m);m.observe(palm(.08),undefined,300);m.step(300);
    m.observe(palm(.45,true),undefined,310);expect(m.status).toBe('coasting');expect(m.step(316)).toBeGreaterThan(0);
    m.reset();expect(m.step(332)).toBe(0);
  });
  it('discards stale motion and sudden hand substitution',()=>{
    const m=new HandMotion();arm(m);m.observe(palm(.05),undefined,300);expect(m.step(600)).toBe(0);expect(m.status).toBe('waiting');
    arm(m,0,650);m.observe(palm(.25),undefined,850);expect(m.step(850)).toBe(0);expect(m.status).toBe('acquiring');
  });
  it('resets for modal/manual input without residual movement',()=>{
    const m=new HandMotion();arm(m);m.observe(palm(.08),undefined,300);m.step(300);m.reset();expect(m.step(320)).toBe(0);arm(m,.15,400);expect(m.step(560)).toBe(0);
  });
  it('limits sudden movement per rendered frame',()=>{
    const m=new HandMotion();arm(m);m.observe(palm(.15),undefined,300);expect(Math.abs(m.step(300))).toBeLessThanOrEqual(.15);
    expect(Math.abs(m.step(316))).toBeLessThanOrEqual(.048);
  });
  it('does not pulse between 20 Hz detections during a steady swipe',()=>{
    for(const speed of [.03,.12,.4]){
      const m=new HandMotion();arm(m,-.3);const velocities:number[]=[];
      for(let frame=1;frame<=90;frame++){
        const time=250+frame*1000/60;
        if(frame%3===0)m.observe(palm(-.3+speed*frame/60),undefined,time);
        const velocity=m.step(time)*60;if(frame>30)velocities.push(velocity);
      }
      const mean=velocities.reduce((sum,v)=>sum+v,0)/velocities.length;
      const deviation=Math.sqrt(velocities.reduce((sum,v)=>sum+(v-mean)**2,0)/velocities.length);
      expect(deviation/Math.abs(mean)).toBeLessThan(.08);
    }
  });
});

describe('short release glide',()=>{
  it('starts at the current speed and then slows smoothly in both directions',()=>{
    for(const speed of [-3,-.6,.6,3]){
      const glide=new ReleaseGlide();glide.start(speed);
      expect(glide.step(.00001)/.00001).toBeCloseTo(speed,3);
      const moves=Array.from({length:60},()=>glide.step(1/60));
      expect(moves.every((d,i)=>(d===0||Math.sign(d)===Math.sign(speed))&&(i===0||Math.abs(d)<=Math.abs(moves[i-1])+1e-10))).toBe(true);
      expect(Math.abs(moves.reduce((a,b)=>a+b,0))).toBeLessThanOrEqual(.16);expect(glide.active).toBe(false);
    }
  });
  it('has equal travel at 30/60/120 Hz and can be cancelled immediately',()=>{
    const totals=[30,60,120].map(hz=>{const g=new ReleaseGlide();g.start(.6);let x=0;for(let i=0;i<hz;i++)x+=g.step(1/hz);return x;});
    expect(Math.max(...totals)-Math.min(...totals)).toBeLessThan(1e-8);
    const g=new ReleaseGlide();g.start(.6);g.step(.016);g.reset();expect(g.step(.016)).toBe(0);
  });
});

describe('continuous scroll easing',()=>{
  it('eases in, then eases out to the target without a bounce',()=>{
    const spring=new ScrollDamping();spring.add(.2);
    const moves=Array.from({length:45},()=>spring.step(1/60));
    expect(moves[1]).toBeGreaterThan(moves[0]);expect(moves[2]).toBeGreaterThan(moves[1]);
    expect(moves[10]).toBeLessThan(moves[5]);expect(moves.every(d=>d>=0)).toBe(true);
    expect(moves.reduce((a,b)=>a+b,0)).toBeCloseTo(.2,6);expect(spring.step(1/60)).toBe(0);
  });
  it('preserves velocity when another camera sample updates the target',()=>{
    const spring=new ScrollDamping();spring.add(.1);spring.step(.03);
    const before=spring.step(.001)/.001;spring.add(.03);const after=spring.step(.001)/.001;
    expect(Math.abs(after-before)/before).toBeLessThan(.05);
  });
  it('has the same travel at 30, 60 and 120 Hz',()=>{
    const positions=[30,60,120].map(hz=>{const s=new ScrollDamping();s.add(.24);let x=0;for(let i=0;i<hz/2;i++)x+=s.step(1/hz);return x;});
    expect(Math.max(...positions)-Math.min(...positions)).toBeLessThan(.00001);
  });
  it('brakes continuously on reversal and stops at the new target',()=>{
    const spring=new ScrollDamping();spring.add(.1);let x=0;
    for(let i=0;i<5;i++)x+=spring.step(1/60);
    spring.add(-.15);const path=Array.from({length:60},()=>{x+=spring.step(1/60);return x;});
    expect(path.every(Number.isFinite)).toBe(true);expect(Math.min(...path)).toBeGreaterThanOrEqual(-.050001);
    expect(x).toBeCloseTo(-.05,6);expect(spring.step(1/60)).toBe(0);
  });
  it('bounds buffered travel after a very fast swipe',()=>{
    const spring=new ScrollDamping();for(let i=0;i<100;i++)spring.add(.1);
    const moves=Array.from({length:90},()=>spring.step(1/60));
    expect(Math.max(...moves)).toBeLessThanOrEqual(.05);expect(moves.reduce((a,b)=>a+b,0)).toBeCloseTo(.35,5);
  });
  it('suppresses camera noise while reducing lag for faster deliberate movement',()=>{
    const filter=new AdaptiveHandFilter();filter.sample(.5,100);const samples=[];
    for(let i=1;i<=40;i++)samples.push(filter.sample(.5+(i%2?.003:-.003),100+i*50));
    expect(Math.max(...samples)-Math.min(...samples)).toBeLessThan(.004);
    let followed=0;for(let i=1;i<=8;i++)followed=filter.sample(.5+i*.025,2100+i*50);
    expect(.7-followed).toBeLessThan(.02);
    filter.reset();expect(filter.sample(.2,3000)).toBe(.2);
  });
});
