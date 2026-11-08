import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { WorldKind } from './environment';
import type { createPalette } from './materials';
type Palette=ReturnType<typeof createPalette>;

/** Scenic dressing stays outside the existing walkable routes and interaction volumes. */
export function dressLandscape(kind:WorldKind,root:T.Group,p:Palette) {
  const random=p.random;
  const object=new T.Object3D();
  const mesh=(geo:T.BufferGeometry,mat:T.Material,x:number,y:number,z:number,parent:T.Object3D=root)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
  const box=(w:number,h:number,d:number,x:number,y:number,z:number,mat:T.Material=p.timber,parent:T.Object3D=root)=>mesh(new RoundedBoxGeometry(w,h,d,1,Math.min(.025,w/5,h/5,d/5)),mat,x,y,z,parent);
  const beam=(a:T.Vector3,b:T.Vector3,r:number,mat:T.Material=p.darkWood,parent:T.Object3D=root)=>{const m=mesh(new T.CylinderGeometry(r*.8,r,a.distanceTo(b),8),mat,0,0,0,parent);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());return m;};
  const tube=(pts:T.Vector3[],r:number,mat:T.Material,parent:T.Object3D=root)=>mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),24,r,6,false),mat,0,0,0,parent);
  const batch=(geo:T.BufferGeometry,mat:T.Material,items:{x:number;y:number;z:number;scale:number;angle:number}[],tint=false)=>{
    const m=new T.InstancedMesh(geo,mat,items.length);items.forEach((a,i)=>{object.position.set(a.x,a.y,a.z);object.rotation.set(0,a.angle,0);object.scale.setScalar(a.scale);object.updateMatrix();m.setMatrixAt(i,object.matrix);if(tint)m.setColorAt(i,new T.Color().setHSL(.18+random()*.06,.23+random()*.24,.38+random()*.25));});m.receiveShadow=true;m.castShadow=false;root.add(m);return m;
  };
  // Four curved blades per tuft; their dark base gives soil-to-leaf contact without opaque patches.
  const bladeVertices:number[]=[],bladeColors:number[]=[],bladeIndices:number[]=[];
  for(let blade=0;blade<4;blade++){
    const a=blade*2.4,offset=bladeVertices.length/3,h=.22+random()*.26;
    for(let row=0;row<=4;row++)for(const side of [-1,1]){
      const t=row/4,width=(1-t)*.035,lean=t*t*.18;
      bladeVertices.push(Math.cos(a)*lean+Math.sin(a)*width*side,h*t,Math.sin(a)*lean-Math.cos(a)*width*side);
      bladeColors.push(.25+t*.65,.32+t*.65,.17+t*.38);
    }
    for(let row=0;row<4;row++){const i=offset+row*2;bladeIndices.push(i,i+1,i+3,i,i+3,i+2);}
  }
  const grassGeo=new T.BufferGeometry();grassGeo.setAttribute('position',new T.Float32BufferAttribute(bladeVertices,3));grassGeo.setAttribute('color',new T.Float32BufferAttribute(bladeColors,3));grassGeo.setIndex(bladeIndices);grassGeo.computeVertexNormals();
  const grassMat=new T.MeshStandardMaterial({color:'#9dad68',vertexColors:true,side:T.DoubleSide,roughness:.9});
  grassMat.onBeforeCompile=shader=>{shader.uniforms.uWindTime=p.windTime;shader.vertexShader='uniform float uWindTime;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    #ifdef USE_INSTANCING
      vec3 center=instanceMatrix[3].xyz;transformed.x+=sin(uWindTime*.9+center.x*.8+center.z*.6)*position.y*position.y*.15;
    #endif`);};
  const tufts:{x:number;y:number;z:number;scale:number;angle:number}[]=[],flowers:typeof tufts=[];
  for(let i=0;i<11000;i++){
    const x=(random()-.5)*54,z=12-random()*55;
    const roadX=kind==='cart'?Math.sin((6-z)/9)*1.2:0;
    const safe=kind==='well'?(Math.abs(x)>7&&Math.abs(x)<8.6&&z>-7&&z<8):kind==='cargo'?(z>1&&Math.abs(x)>8.7):kind==='route'?(Math.abs(z)>4.6&&Math.abs(x)>3.2):Math.abs(x-roadX)>2.8;
    if(!safe||Math.sin(x*.7)*Math.cos(z*.55)<-.6)continue;
    const scale=.45+random()*1.15;
    tufts.push({x,y:-.075,z,scale,angle:random()*6.28});
    if(i%28===0)flowers.push({x,y:.12*scale,z,scale:.4+random()*.5,angle:random()*6.28});
  }
  batch(grassGeo,grassMat,tufts,true);
  const petalGeo=new T.SphereGeometry(.055,5,3);petalGeo.scale(1,.3,1);
  batch(petalGeo,new T.MeshStandardMaterial({color:'#e9dab1',roughness:.9}),flowers);
  // Small irregular stones rather than perfectly round, uniformly spaced ground objects.
  const stones:typeof tufts=[];
  for(let i=0;i<450;i++){
    const z=10-random()*42,side=random()>.5?1:-1,x=side*(3+random()*5)+(kind==='cart'?Math.sin((6-z)/9)*1.2:0);
    if(kind==='well'||kind==='cargo'&&z<0||kind==='route'&&Math.abs(z)<4.6)continue;
    stones.push({x,y:-.03,z,scale:.07+random()*.16,angle:random()*6.28});
  }
  const rockGeo=new T.IcosahedronGeometry(1,1);rockGeo.scale(1,.4,.75);batch(rockGeo,p.stone,stones);
  const fence=(x:number,z:number,length:number,angle=0)=>{
    const g=new T.Group();g.position.set(x,0,z);g.rotation.y=angle;root.add(g);
    for(let i=0;i<=length;i++){const xx=i*.65;beam(new T.Vector3(xx,0,0),new T.Vector3(xx+.03,.9+random()*.12,0),.035,p.lightWood,g);}
    for(const y of [.32,.72])beam(new T.Vector3(-.1,y,.025),new T.Vector3(length*.65+.1,y,.025),.028,p.darkWood,g);
    for(let i=0;i<length;i+=2)beam(new T.Vector3(i*.65,.15,0),new T.Vector3((i+1.8)*.65,.86,0),.021,p.timber,g);
  };
  const basket=(x:number,z:number,size=1)=>{
    const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(size);root.add(g);
    const body=mesh(new T.CylinderGeometry(.32,.23,.45,24,1,true),p.cloth,0,.24,0,g);body.material=p.cloth;
    for(let row=0;row<8;row++){const ring=mesh(new T.TorusGeometry(.235+row*.011,.012,5,24),p.rope,0,.04+row*.056,0,g);ring.rotation.x=Math.PI/2;}
    for(let i=0;i<16;i++){const a=i/16*Math.PI*2;beam(new T.Vector3(Math.sin(a)*.23,.04,Math.cos(a)*.23),new T.Vector3(Math.sin(a)*.32,.46,Math.cos(a)*.32),.008,p.darkWood,g);}
    tube([new T.Vector3(-.32,.42,0),new T.Vector3(-.22,.7,0),new T.Vector3(.22,.7,0),new T.Vector3(.32,.42,0)],.018,p.rope,g);
  };
  const lantern=(x:number,z:number)=>{
    beam(new T.Vector3(x,0,z),new T.Vector3(x,2.8,z),.065);
    beam(new T.Vector3(x,2.7,z),new T.Vector3(x+.55,2.7,z),.045);
    beam(new T.Vector3(x+.45,2.7,z),new T.Vector3(x+.45,2.4,z),.012,p.iron);
    const paper=new T.MeshStandardMaterial({color:'#e5c493',emissive:'#edaa55',emissiveIntensity:.22,roughness:.8});
    box(.34,.48,.34,x+.45,2.17,z,paper);
    for(const y of [1.9,2.44])box(.43,.065,.43,x+.45,y,z,p.darkWood);
    for(const a of [-.17,.17])for(const b of [-.17,.17])box(.025,.5,.025,x+.45+a,2.17,z+b,p.darkWood);
  };
  const reeds=(x:number,z:number)=>{
    for(let i=0;i<12;i++){
      const xx=x+(random()-.5)*1.1,zz=z+(random()-.5)*.6,h=.65+random()*.6;
      beam(new T.Vector3(xx,-.03,zz),new T.Vector3(xx+.12,h,zz),.012,p.moss);
      const head=mesh(new T.CylinderGeometry(.023,.03,.24,6),p.darkWood,xx+.12,h,zz);head.rotation.z=-.1;
    }
  };
  const plasterWall=(x:number,z:number,length:number,angle=0)=>{
    const g=new T.Group();g.position.set(x,0,z);g.rotation.y=angle;root.add(g);
    box(length,1.35,.25,0,.65,0,p.wall,g);box(length,.24,.29,0,.08,0,p.darkStone,g);box(length+.18,.12,.44,0,1.38,0,p.roof,g);
    for(let xx=-length/2;xx<=length/2;xx+=2.5){box(.38,1.55,.38,xx,.7,0,p.wall,g);box(.48,.12,.5,xx,1.52,0,p.roof,g);}
  };
  if(kind==='route'){
    for(const side of [-1,1]){
      fence(side*3.4,-6.5,13,side*Math.PI/2);
      lantern(side*2.65,5.2);
      for(let x=-23;x<24;x+=1.3){if(Math.abs(x)<2.3)continue;const r=mesh(new T.IcosahedronGeometry(.55,1),p.darkStone,x,-.05,side*4.35);r.scale.set(1.3,.65,.85);r.rotation.y=random()*6;}
      for(let i=0;i<6;i++)reeds(side*(4.2+i*2.1),(i%2?1:-1)*3.9);
    }
    basket(4,-10,.85);plasterWall(9,-10,5,-.2);plasterWall(-8,-13,5,.35);
  }else if(kind==='well'){
    basket(2.9,-1,.9);basket(3.8,-.7,.75);basket(-3,-3,.8);
    // Weathered rim details, winding rope and a stone drain make the well read at close range.
    for(let i=0;i<12;i++){const a=i/12*Math.PI*2;const m=mesh(new T.IcosahedronGeometry(.08,0),p.moss,Math.sin(a)*1.1,.055,-2+Math.cos(a)*1.1);m.scale.set(1.4,.3,1);}
    for(let i=0;i<14;i++){const ring=mesh(new T.TorusGeometry(.185,.013,6,28),p.rope,-.2+i*.03,2.5,-2);ring.rotation.y=Math.PI/2;}
    const basin=mesh(new T.LatheGeometry([new T.Vector2(.4,0),new T.Vector2(.55,.12),new T.Vector2(.6,.32),new T.Vector2(.54,.34),new T.Vector2(.49,.12)].map(v=>v),32),p.darkStone,2.5,0,-3);
    basin.receiveShadow=true;
    const pool=mesh(new T.CircleGeometry(.49,32),p.water,2.5,.13,-3);pool.rotation.x=-Math.PI/2;
    for(let i=0;i<9;i++)box(.26,.015,.55,1.1+i*.29,.05,-2.9,p.darkStone);
    for(const x of [-7.8,7.8])for(const z of [-5,0,5]){box(.5,2.55,.42,x,1.2,z,p.wall);box(.62,.16,.6,x,2.56,z,p.roof);}
    fence(2,-6,8);lantern(-3.2,-1.9);
    // A slightly sagging linen drying cloth, modeled as cloth rather than a flat billboard.
    for(const x of [-6.9,-3.1])beam(new T.Vector3(x,0,1),new T.Vector3(x,2.5,1),.045);
    tube([new T.Vector3(-6.9,2.4,1),new T.Vector3(-5,2.25,1),new T.Vector3(-3.1,2.4,1)],.012,p.rope);
    const fabric=new T.PlaneGeometry(1.7,1,24,14),v=fabric.attributes.position;
    for(let i=0;i<v.count;i++)v.setZ(i,Math.sin(v.getX(i)*12)*.045*(.6-v.getY(i)));
    fabric.computeVertexNormals();const cloth=p.cloth.clone();cloth.side=T.DoubleSide;mesh(fabric,cloth,-5.1,1.75,1);
  }else if(kind==='cargo'){
    for(const side of [-1,1]){
      lantern(side*5.9,.2);basket(side*5,2.5,1);basket(side*5.7,2.9,.8);
      for(let i=0;i<5;i++)box(2,.16,.65,side*6.8,-.06-i*.15,-1.6-i*.6,p.stone);
      plasterWall(side*11,-8,8,0);reeds(side*10,-3.7);
      for(let row=0;row<12;row++)for(let col=0;col<7;col++)box(.49,.2,.08,side*5-1.8+col*.55+(row%2)*.24,.35+row*.45,-10.25,row%4?p.brick:p.darkStone);
      box(4.3,.14,1.65,side*5.1,5.45,-11,p.darkStone);if(side===1)box(14.4,.14,1.65,0,6.9,-11,p.darkStone);
      fence(side*10,1,9,Math.PI/2);
    }
    // Reed canopy placed beyond the playable loading deck on a moored background skiff.
    const skiff=new T.Group();skiff.position.set(-11,-.05,-6);skiff.rotation.y=.18;root.add(skiff);
    box(5,.4,1.25,0,.18,0,p.darkWood,skiff);
    for(let i=0;i<9;i++){
      const x=-1.4+i*.34;const pts=[];for(let j=0;j<=12;j++){const a=j/12*Math.PI;pts.push(new T.Vector3(x,.4+Math.sin(a)*1.1,Math.cos(a)*.65));}tube(pts,.025,p.lightWood,skiff);
    }
    const canopy=new T.CylinderGeometry(.98,.98,2.9,28,1,true,0,Math.PI);canopy.rotateZ(Math.PI/2);canopy.rotateX(Math.PI/2);mesh(canopy,p.cloth,0,.4,0,skiff);
    for(let x=-6.8;x<=6.8;x+=1.2)box(.8,.13,1.65,x,7.6,-11,p.darkStone);
  }else{
    fence(-4.1,6,44,Math.PI/2);fence(4.7,-10,24,Math.PI/2);
    const crops:typeof tufts=[];
    for(const side of [-1,1])for(let row=0;row<13;row++)for(let col=0;col<35;col++){
      const x=side*(6+row*.45),z=5-col*.68; crops.push({x,y:-.06,z,scale:1.35+random()*.5,angle:random()*.5});
    }
    const cropMat=grassMat.clone();cropMat.color.set('#b4ab58');cropMat.onBeforeCompile=grassMat.onBeforeCompile;batch(grassGeo,cropMat,crops);
    for(const [x,z] of [[-5,-23],[5.3,-25],[-6.1,-24]]){
      const hay=mesh(new T.CylinderGeometry(.15,.72,1.5,12),p.cloth,x,.72,z);hay.rotation.z=.05;
      for(const y of [.4,.9]){const ring=mesh(new T.TorusGeometry(y===.4?.54:.32,.025,6,24),p.rope,x,y,z);ring.rotation.x=Math.PI/2;}
    }
    basket(4.5,-25);plasterWall(6,-23,6);lantern(3.7,-26);
  }
}
