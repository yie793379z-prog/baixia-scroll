import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {solveWellElbow,UPPER_ARM_LENGTH,FOREARM_LENGTH} from '../src/games/first-person/wellArm';
import {wellCastPose,WELL_RELEASE_TIME,WELL_IMPACT_TIME,WELL_FILL_TIME,initialWaterSlosh,stepWaterSlosh,bucketSurfaceHeight} from '../src/games/core/wellMotion';

describe('visible well casting',()=>{
 it('keeps the bucket clear of the rim, releases it, then fills only after impact',()=>{
  expect(wellCastPose(0)).toMatchObject({phase:'reaching',fill:0,grip:0});
  const release=wellCastPose(WELL_RELEASE_TIME);expect(release.phase).toBe('falling');expect(release.y).toBeCloseTo(1.14);
  for(let t=0;t<WELL_IMPACT_TIME;t+=.01){const p=wellCastPose(t);expect(p.fill).toBe(0);if(p.y<1)expect(Math.abs(p.z+2)).toBeLessThan(.55);}
  expect(wellCastPose(WELL_IMPACT_TIME)).toMatchObject({phase:'filling',fill:0,grip:0,handVisibility:0});
  expect(wellCastPose(WELL_FILL_TIME)).toMatchObject({phase:'lifting',fill:1,z:-2});
 });
 it('grips a stationary handle before carrying, and releases with continuous velocity',()=>{
  expect(wellCastPose(.5).grip).toBe(1);expect(wellCastPose(.5).z).toBe(-.72);
  expect(wellCastPose(.8).grip).toBe(1);expect(wellCastPose(WELL_RELEASE_TIME).grip).toBe(0);
  const h=1e-4,a=wellCastPose(WELL_RELEASE_TIME-h),b=wellCastPose(WELL_RELEASE_TIME),c=wellCastPose(WELL_RELEASE_TIME+h);
  for(const key of ['y','z'] as const)expect((b[key]-a[key])/h).toBeCloseTo((c[key]-b[key])/h,2);
 });
 it('keeps anatomical bone lengths and exact hand contact across the cast',()=>{
  const shoulder=new T.Vector3(),wrist=new T.Vector3(),elbow=new T.Vector3();
  for(let t=.3;t<=WELL_RELEASE_TIME;t+=1/60){
   const p=wellCastPose(t);shoulder.set(.22,1.45,-.32-.56*p.send);
   wrist.set(.085*.75+.038*Math.sin(Math.atan2(.07,.22)),p.y+(.62-.085*.07/.22)*.75+.038*Math.cos(Math.atan2(.07,.22)),p.z+.145);
   expect(solveWellElbow(shoulder,wrist,elbow)).toBe(true);
   expect(elbow.distanceTo(shoulder)).toBeCloseTo(UPPER_ARM_LENGTH,6);
   expect(elbow.distanceTo(wrist)).toBeCloseTo(FOREARM_LENGTH,6);
  }
 });
 it('keeps the free surface approximately level when the bucket tilts',()=>{
  const s=initialWaterSlosh(),a=.12,x=.2;
  const y=bucketSurfaceHeight(x,0,0,1,s,0,a);
  expect(y*Math.cos(a)+x*Math.sin(a)).toBeCloseTo(.13*Math.cos(a),3);
 });
 it('has no teleport at hand release or water entry',()=>{
  for(const boundary of [WELL_RELEASE_TIME,WELL_IMPACT_TIME,WELL_FILL_TIME]){
   const a=wellCastPose(boundary-1e-5),b=wellCastPose(boundary+1e-5);
   expect(Math.abs(a.y-b.y)).toBeLessThan(.001);expect(Math.abs(a.z-b.z)).toBeLessThan(.001);
  }
 });
});
describe('bucket free surface',()=>{
 it('responds to acceleration, oscillates after release, and dissipates energy at rest',()=>{
  let s=initialWaterSlosh();for(let i=0;i<12;i++)s=stepWaterSlosh(s,3,1,5,1/60);
  expect(Math.abs(s.x)).toBeGreaterThan(.02);expect(s.ripple).toBeGreaterThan(.005);
  const sign=Math.sign(s.x);let crossed=false;
  for(let i=0;i<600;i++){s=stepWaterSlosh(s,0,0,0,1/60);if(Math.sign(s.x)!==sign)crossed=true;}
  expect(crossed).toBe(true);expect(Math.abs(s.x)+Math.abs(s.z)+s.ripple).toBeLessThan(.00001);
 });
 it('stays below the rim, exposes a near-flat calm surface, and lowers with water loss',()=>{
  const calm=initialWaterSlosh(),full=bucketSurfaceHeight(0,0,0,1,calm),half=bucketSurfaceHeight(0,0,0,.5,calm);
  expect(full-half).toBeCloseTo(.16);expect(full).toBeCloseTo(.13);
  for(let t=0;t<3;t+=.1)for(let i=0;i<64;i++){
   const x=Math.cos(i/64*Math.PI*2)*.253,z=Math.sin(i/64*Math.PI*2)*.253;
   expect(Math.abs(bucketSurfaceHeight(x,z,t,1,calm)-full)).toBeLessThan(.002);
   expect(bucketSurfaceHeight(x,z,t,1,{...calm,x:.24,z:.24,ripple:.025},.2,-.2)).toBeLessThanOrEqual(.205);
  }
 });
 it('remains consistent at 30 and 60 Hz',()=>{
  const run=(hz:number)=>{let s=initialWaterSlosh();for(let i=0;i<hz*2;i++)s=stepWaterSlosh(s,i<hz*.5?2:0,0,0,1/hz);return s;};
  expect(run(30).x).toBeCloseTo(run(60).x,5);
 });
});
