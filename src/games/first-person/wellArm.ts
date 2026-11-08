import * as T from 'three';
import {createHumanHand} from './humanHand';

export const UPPER_ARM_LENGTH=.34,FOREARM_LENGTH=.31;
const up=new T.Vector3(0,1,0);
const axis=new T.Vector3(),pole=new T.Vector3();
/** Fixed-length two-bone IK. The pole keeps the elbow outside and below the hand. */
export function solveWellElbow(shoulder:T.Vector3,wrist:T.Vector3,out:T.Vector3){
 axis.copy(wrist).sub(shoulder);const distance=axis.length();axis.divideScalar(Math.max(distance,1e-6));
 const d=T.MathUtils.clamp(distance,.031,UPPER_ARM_LENGTH+FOREARM_LENGTH-.001);
 const along=(UPPER_ARM_LENGTH**2-FOREARM_LENGTH**2+d*d)/(2*d);
 pole.set(1,-.65,.20).addScaledVector(axis,-pole.dot(axis)).normalize();
 out.copy(shoulder).addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,UPPER_ARM_LENGTH**2-along*along)));
 return distance<=UPPER_ARM_LENGTH+FOREARM_LENGTH;
}

function sleeveGeometry(length:number,profiles:number[][]){
 const vertices:number[]=[],indices:number[]=[],rings=profiles.length,sides=20;
 for(let r=0;r<rings;r++)for(let i=0;i<sides;i++){
  const a=i/sides*Math.PI*2,[t,radius]=profiles[r];
  const fold=1+.035*Math.cos(a*5+t*8)+.022*Math.sin(a*3-t*11);
  vertices.push(Math.cos(a)*radius*fold,(t-.5)*length,Math.sin(a)*radius*.83*fold);
 }
 for(let r=0;r<rings-1;r++)for(let i=0;i<sides;i++){const a=r*sides+i,b=r*sides+(i+1)%sides,c=a+sides,d=b+sides;indices.push(a,c,b,b,c,d);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
}

export function createWellArm(scene:T.Scene){
 const root=new T.Group();root.name='well-throwing-arm';root.visible=false;scene.add(root);
 const cloth=new T.MeshStandardMaterial({color:'#687568',roughness:.96});
 const sphere=new T.SphereGeometry(1,24,16);
 const mesh=(g:T.BufferGeometry,m:T.Material,parent:T.Object3D=root)=>{const o=new T.Mesh(g,m);o.receiveShadow=true;parent.add(o);return o;};
 // The radius changes at the biceps, elbow and cuff; neither bone is scaled to reach.
 const upper=mesh(sleeveGeometry(UPPER_ARM_LENGTH,[[0,.065],[.08,.070],[.24,.073],[.47,.074],[.64,.070],[.78,.065],[.91,.067],[1,.060]]),cloth);
 const sleeveProfiles=[[0,.060],[.09,.064],[.18,.057],[.26,.060],[.38,.053],[.60,.046],[.78,.037],[.89,.030],[1,.027]];
 const forearm=mesh(sleeveGeometry(FOREARM_LENGTH,sleeveProfiles),cloth);
 forearm.frustumCulled=false;
 const sleevePositions=forearm.geometry.getAttribute('position') as T.BufferAttribute,sleeveNormals=forearm.geometry.getAttribute('normal') as T.BufferAttribute;
 const sleeveEnd=new T.Vector3(),control1=new T.Vector3(),control2=new T.Vector3(),center=new T.Vector3(),tangent=new T.Vector3(),across=new T.Vector3(),vertical=new T.Vector3(),normal=new T.Vector3(),handAcross=new T.Vector3();
 const elbowCloth=mesh(sphere,cloth);elbowCloth.scale.set(.060,.061,.054);
 const hand=new T.Group();root.add(hand);
 const human=createHumanHand(hand);
 const direction=new T.Vector3(),shoulder=new T.Vector3(),elbow=new T.Vector3(),wrist=new T.Vector3(),contact=new T.Vector3(),rest=new T.Vector3(),gripOrigin=new T.Vector3();
 const gripRotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),-Math.atan2(.07,.22));
 const cuffOffset=new T.Vector3(0,.028,.137);
 const handRotation=new T.Quaternion(),bodyRotation=new T.Quaternion(),bodyUp=new T.Vector3(0,1,0);
 const wristOffset=new T.Vector3(0,.038,.145),segment=(part:T.Object3D,a:T.Vector3,b:T.Vector3)=>{direction.copy(b).sub(a);part.position.copy(a).add(b).multiplyScalar(.5);part.quaternion.setFromUnitVectors(up,direction.normalize());};
 return {root,get ready(){return human.state==='ready';},dispose:()=>human.dispose(),update(camera:T.PerspectiveCamera,origin:T.Vector3,grip:number,reach:number,withdraw:number,visible:boolean){
  root.visible=visible&&human.state==='ready';if(!visible)return {reachError:0,contactError:0};
  bodyRotation.setFromAxisAngle(bodyUp,camera.rotation.y);
  shoulder.set(.22,-.25,.03).applyQuaternion(bodyRotation).add(camera.position);
  rest.set(.27,-.43,-.19).applyQuaternion(bodyRotation).add(camera.position);
  contact.copy(wristOffset).applyQuaternion(gripRotation).add(origin);
  wrist.copy(rest).lerp(contact,reach*(1-withdraw));
  // Wrist turns towards the bail during reach and relaxes again after release.
  handRotation.copy(bodyRotation).slerp(gripRotation,reach*(1-withdraw*.6));
  const reachable=solveWellElbow(shoulder,wrist,elbow);
  if(!reachable){direction.copy(wrist).sub(shoulder);wrist.copy(shoulder).addScaledVector(direction.normalize(),UPPER_ARM_LENGTH+FOREARM_LENGTH-.001);solveWellElbow(shoulder,wrist,elbow);}
  segment(upper,shoulder,elbow);elbowCloth.position.copy(elbow);
  gripOrigin.copy(wristOffset).applyQuaternion(handRotation);hand.position.copy(wrist).sub(gripOrigin);hand.quaternion.copy(handRotation);
  // A curved sleeve ends around the actual skin opening; its last ring follows
  // the wrist frame, so bending cannot reveal a detached cylinder or a gap.
  sleeveEnd.copy(cuffOffset).applyQuaternion(handRotation).add(hand.position);
  control1.copy(elbow).lerp(sleeveEnd,.38);
  control2.set(0,0,.055).applyQuaternion(handRotation).add(sleeveEnd);
  handAcross.set(1,0,0).applyQuaternion(handRotation);
  for(let r=0;r<sleeveProfiles.length;r++){
   const [t,radius]=sleeveProfiles[r],u=1-t;
   center.copy(elbow).multiplyScalar(u*u*u).addScaledVector(control1,3*u*u*t).addScaledVector(control2,3*u*t*t).addScaledVector(sleeveEnd,t*t*t);
   tangent.copy(control1).sub(elbow).multiplyScalar(3*u*u).addScaledVector(direction.copy(control2).sub(control1),6*u*t).addScaledVector(direction.copy(sleeveEnd).sub(control2),3*t*t).normalize();
   across.copy(handAcross).addScaledVector(tangent,-handAcross.dot(tangent)).normalize();vertical.crossVectors(across,tangent).normalize();
   for(let i=0;i<20;i++){
    const a=i/20*Math.PI*2,fold=1+.025*Math.cos(a*5+t*8),j=r*20+i;
    normal.copy(across).multiplyScalar(Math.cos(a)).addScaledVector(vertical,Math.sin(a)/.72).normalize();
    sleeveNormals.setXYZ(j,normal.x,normal.y,normal.z);
    normal.copy(center).addScaledVector(across,Math.cos(a)*radius*fold).addScaledVector(vertical,Math.sin(a)*radius*.72*fold);
    sleevePositions.setXYZ(j,normal.x,normal.y,normal.z);
   }
  }
  sleevePositions.needsUpdate=true;sleeveNormals.needsUpdate=true;
  human.update(grip);
  return {reachError:Math.max(0,shoulder.distanceTo(contact)-UPPER_ARM_LENGTH-FOREARM_LENGTH),contactError:grip>.98?wrist.distanceTo(contact):0};
 }};
}
