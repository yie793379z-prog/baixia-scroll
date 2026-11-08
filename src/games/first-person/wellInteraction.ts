import * as T from 'three';
import {createWellArm} from './wellArm';
import {bucketSurfaceHeight,initialWaterSlosh,stepWaterSlosh,wellCastPose,WELL_IMPACT_TIME,WELL_RELEASE_TIME} from '../core/wellMotion';
import type {WellState} from '../core/rules';
import type {GameWorld} from './environment';

/** Local geometry only: a visible hand releases the handle; a thin free surface
 * responds to acceleration. No extra render target, texture fetch or frame loop. */
export function createWellInteraction(world:GameWorld){
 const {bucket,rope,scene,camera}=world;
 const bucketScale=.75;bucket.scale.setScalar(bucketScale);
 bucket.traverse(o=>{if(o instanceof T.Mesh&&o.material instanceof T.MeshPhysicalMaterial)o.visible=false;});
 const waterGeometry=new T.RingGeometry(0,.253,64,12);waterGeometry.rotateX(-Math.PI/2);
 const waterMaterial=new T.MeshPhysicalMaterial({color:'#29443e',metalness:0,roughness:.12,ior:1.333,specularIntensity:.9,envMapIntensity:.75,transparent:true,opacity:.84,depthWrite:false,side:T.DoubleSide});
 waterMaterial.name='bucket-free-surface';
 const water=new T.Mesh(waterGeometry,waterMaterial);water.name='bucket-free-surface';water.userData.runtimeWell=true;water.visible=false;water.castShadow=false;water.receiveShadow=true;bucket.add(water);
 const pos=waterGeometry.getAttribute('position') as T.BufferAttribute;
 const arm=createWellArm(scene);
 // A restrained, short-lived entry splash belongs to the well, not to the water in the bucket.
 const splashMaterial=new T.MeshBasicMaterial({color:'#b8cbc0',transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide});
 const splash=new T.Mesh(new T.RingGeometry(.26,.28,48),splashMaterial);splash.rotation.x=-Math.PI/2;splash.position.set(0,-1.42,-2);splash.visible=false;scene.add(splash);
 const up=new T.Vector3(0,1,0),gripOrigin=new T.Vector3(),releaseGrip=new T.Vector3(),handle=new T.Vector3(),anchor=new T.Vector3(0,2.5,-2),direction=new T.Vector3(),previous=bucket.position.clone(),velocity=new T.Vector3(),lastVelocity=new T.Vector3();
 let slosh=initialWaterSlosh(),time=0,initialized=false,lastPhase='idle';
 const releasePose=wellCastPose(WELL_RELEASE_TIME);releaseGrip.set(.085*bucketScale,releasePose.y+(.62-.085*.07/.22)*bucketScale,releasePose.z);
 const segment=(part:T.Mesh,a:T.Vector3,b:T.Vector3)=>{direction.copy(b).sub(a);part.position.copy(a).add(b).multiplyScalar(.5);part.scale.y=direction.length();part.quaternion.setFromUnitVectors(up,direction.normalize());};
 return {water,get ready(){return arm.ready;},dispose:()=>arm.dispose(),update(dt:number,castTime:number|null,well:WellState,near:boolean,reduced:boolean){
  time+=dt;
  const pose=castTime===null||castTime<0?null:wellCastPose(castTime),lifting=pose?.phase==='lifting';
  const phase=pose?.phase??'idle';
  const sway=lifting?well.swing*.13:0;
  bucket.position.set(Math.sin(time*4.3)*sway,lifting?-1.6+well.height*2.8:pose?.y??1.12,lifting?-2+Math.sin(time*3.6)*sway*.6:pose?.z??-.72);
  bucket.rotation.set(lifting?Math.sin(time*3.6)*well.swing*.16:pose?.tilt??0,0,lifting?Math.sin(time*4.3)*well.swing*.14:0);
  const fill=lifting?well.water:pose?.fill??0;
  if(!initialized){previous.copy(bucket.position);initialized=true;}
  velocity.copy(bucket.position).sub(previous).divideScalar(Math.max(dt,.001));
  const ax=(velocity.x-lastVelocity.x)/Math.max(dt,.001),az=(velocity.z-lastVelocity.z)/Math.max(dt,.001),ay=(velocity.y-lastVelocity.y)/Math.max(dt,.001);
  if(phase==='filling'&&lastPhase==='falling'){slosh.ripple=.025;slosh.vz=.28;}
  slosh=stepWaterSlosh(slosh,ax,az,Math.abs(ay)+Math.abs(velocity.y)*1.2,dt);lastVelocity.copy(velocity);previous.copy(bucket.position);lastPhase=phase;
  water.visible=fill>.02;
  if(water.visible){
   for(let i=0;i<pos.count;i++)pos.setY(i,bucketSurfaceHeight(pos.getX(i),pos.getZ(i),reduced?0:time,fill,slosh,bucket.rotation.x,bucket.rotation.z));
   pos.needsUpdate=true;waterGeometry.computeVertexNormals();
  }
  bucket.updateMatrixWorld(true);handle.set(0,.625,0).applyMatrix4(bucket.matrixWorld);
  segment(rope,anchor,handle);
  // The held frame is attached to the bail. After release it remains independent
  // of the falling bucket, so the open hand withdraws without chasing it.
  const visible=near&&!!pose&&pose.handVisibility>0;
  if(castTime!==null&&castTime<WELL_RELEASE_TIME)gripOrigin.set(.085,.62-.085*.07/.22,0).applyMatrix4(bucket.matrixWorld);
  else gripOrigin.copy(releaseGrip);
  const armState=arm.update(camera,gripOrigin,pose?.grip??0,pose?.reach??0,pose?.withdraw??0,visible);
  const splashAge=castTime===null?-1:castTime-WELL_IMPACT_TIME;
  splash.visible=splashAge>=0&&splashAge<.55;
  if(splash.visible){splash.scale.setScalar(1+splashAge*2.1);splashMaterial.opacity=(1-splashAge/.55)*.27;}
  return {phase,fill,waterTilt:Math.hypot(slosh.x,slosh.z),ripple:slosh.ripple,armVisible:visible&&arm.ready,handReady:arm.ready,grip:pose?.grip??0,contactError:armState.contactError,reachError:armState.reachError};
 }};
}
