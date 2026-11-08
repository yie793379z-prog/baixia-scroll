// Seconds/metres: send the bucket over the rim before gravity takes over.
export const WELL_GRIP_TIME=.50;
export const WELL_RELEASE_TIME=1.22;
export const WELL_IMPACT_TIME=1.97;
export const WELL_FILL_TIME=2.57;
const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v));
const ease=(t:number)=>{t=clamp(t);return t*t*(3-2*t);};
export function wellCastPose(time:number){
 const duration=WELL_RELEASE_TIME-WELL_GRIP_TIME,send=clamp((time-WELL_GRIP_TIME)/duration);
 const fallTime=clamp(time-WELL_RELEASE_TIME,0,WELL_IMPACT_TIME-WELL_RELEASE_TIME),fall=fallTime/(WELL_IMPACT_TIME-WELL_RELEASE_TIME);
 // A Hermite carry ends with exactly the velocity used by the free fall.
 const carry=(a:number,b:number,v:number)=>a+(b-a)*(3*send*send-2*send**3)+v*duration*(send**3-send*send);
 const vy=-.08,vz=-.4/(WELL_IMPACT_TIME-WELL_RELEASE_TIME),gravity=2*(2.74+vy*.75)/(.75*.75);
 const fill=ease((time-WELL_IMPACT_TIME)/(WELL_FILL_TIME-WELL_IMPACT_TIME));
 return {phase:time<.30?'reaching':time<WELL_GRIP_TIME?'gripping':time<WELL_RELEASE_TIME?'sending':time<WELL_IMPACT_TIME?'falling':time<WELL_FILL_TIME?'filling':'lifting',
  y:time<WELL_RELEASE_TIME?carry(1.12,1.14,vy):1.14+vy*fallTime-.5*gravity*fallTime*fallTime,
  z:time<WELL_RELEASE_TIME?carry(-.72,-1.6,vz):-1.6+vz*fallTime,
  grip:ease((time-.30)/.20)*(1-ease((time-WELL_RELEASE_TIME+.16)/.16)),
  reach:ease(time/.30),send:ease((time-WELL_GRIP_TIME)/duration),
  withdraw:ease((time-WELL_RELEASE_TIME-.06)/.45),
  handVisibility:1-ease((time-WELL_RELEASE_TIME-.38)/.20),fill,
  tilt:Math.sin(fall*Math.PI)*.14};
}
export interface WaterSlosh {x:number;z:number;vx:number;vz:number;ripple:number}
export const initialWaterSlosh=():WaterSlosh=>({x:0,z:0,vx:0,vz:0,ripple:0});
export function stepWaterSlosh(s:WaterSlosh,ax:number,az:number,agitation:number,dt:number):WaterSlosh{
 const next={...s},duration=clamp(dt,0,.05),steps=Math.max(1,Math.ceil(duration*120)),h=duration/steps;
 for(let i=0;i<steps;i++){
  next.vx+=(-48*next.x-3.8*next.vx-clamp(ax,-6,6)*1.8)*h;
  next.vz+=(-48*next.z-3.8*next.vz-clamp(az,-6,6)*1.8)*h;
  next.x=clamp(next.x+next.vx*h,-.24,.24);next.z=clamp(next.z+next.vz*h,-.24,.24);
 }
 next.ripple=Math.min(.025,next.ripple*Math.exp(-duration*2.2)+clamp(agitation,0,12)*duration*.014);
 return next;
}
export function bucketSurfaceHeight(x:number,z:number,time:number,fill:number,slosh:WaterSlosh,tiltX=0,tiltZ=0){
 const radius=Math.hypot(x,z),edge=Math.max(0,1-(radius/.255)**4);
 const slopeX=slosh.x-Math.sin(tiltZ),slopeZ=slosh.z+Math.sin(tiltX);
 const ripples=(Math.sin(x*23+z*11-time*7.2)+Math.sin(z*27-x*9-time*6.1)*.55)*(slosh.ripple+.0006)*edge;
 // The free surface has no dome and stays below the wooden rim.
 return clamp(-.19+clamp(fill)*.32+x*slopeX+z*slopeZ+ripples,-.20,.205);
}
