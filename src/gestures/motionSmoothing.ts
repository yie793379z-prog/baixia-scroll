// Algorithm references and tuning rationale: docs/HAND_GESTURE_CONTROL.md.
// Both filters retain state; a new camera sample must not restart the animation.
export class AdaptiveHandFilter {
  private value=0;
  private previous=0;
  private derivative=0;
  private time:number|null=null;
  reset(){this.time=null;this.derivative=0;}
  sample(value:number,time:number):number {
    if(this.time===null){this.time=time;this.previous=this.value=value;return value;}
    const dt=(time-this.time)/1000;if(dt<=0)return this.value;
    const alpha=(cutoff:number)=>1/(1+1/(2*Math.PI*cutoff*dt));
    const speed=(value-this.previous)/dt;
    this.derivative+=alpha(1.5)*(speed-this.derivative);
    // One Euro: stronger filtering at rest, less lag during deliberate motion.
    const cutoff=3+8*Math.abs(this.derivative);
    this.value+=alpha(cutoff)*(value-this.value);
    this.previous=value;this.time=time;return this.value;
  }
}

/** Critically damped relative target, solved analytically for the actual frame dt. */
export class ScrollDamping {
  private remaining=0;
  private velocity=0;
  get speed(){return this.velocity;}
  reset(){this.remaining=0;this.velocity=0;}
  add(distance:number){this.remaining=Math.max(-.35,Math.min(.35,this.remaining+distance));}
  step(seconds:number):number {
    if(seconds<=0)return 0;
    const dt=Math.min(.05,seconds),omega=24;
    const decay=Math.exp(-omega*dt),c=omega*this.remaining-this.velocity;
    const remaining=(this.remaining+c*dt)*decay;
    let move=this.remaining-remaining;
    this.velocity=(this.velocity+omega*c*dt)*decay;
    const maxMove=3*dt;
    if(Math.abs(move)>maxMove){move=Math.sign(move)*maxMove;this.velocity=Math.sign(move)*3;}
    // A reversal can carry velocity toward a nearby target: stop at it, never bounce.
    if(move*this.remaining>=0&&Math.abs(move)>Math.abs(this.remaining)){
      move=this.remaining;this.velocity=0;
    }
    this.remaining-=move;
    if(Math.abs(this.remaining)<.00002&&Math.abs(this.velocity)<.0005){move+=this.remaining;this.reset();}
    return move;
  }
}

/** Finger-lift style release: continuous initial speed, finite ease-out, no bounce. */
export class ReleaseGlide {
  private velocity=0;
  private elapsed=0;
  private duration=0;
  get active(){return this.elapsed<this.duration;}
  reset(){this.velocity=0;this.elapsed=this.duration=0;}
  start(velocity:number){
    this.reset();
    if(!Number.isFinite(velocity)||Math.abs(velocity)<.025)return;
    this.velocity=Math.max(-3,Math.min(3,velocity));
    // v(t)=v0*(1-t/T)^2. Limit the integral to 0.16 viewport widths.
    this.duration=Math.min(.42,.48/Math.abs(this.velocity));
  }
  step(seconds:number):number {
    if(!this.active||seconds<=0)return 0;
    const before=this.elapsed/this.duration;
    this.elapsed=Math.min(this.duration,this.elapsed+seconds);
    const after=this.elapsed/this.duration;
    return this.velocity*this.duration/3*((1-before)**3-(1-after)**3);
  }
}
