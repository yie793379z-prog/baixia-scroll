import * as T from 'three';
import {createNatureClock} from './waves';

/** Separate connected leaves retain a stable pivot; low blades bend from the root. */
export function prepareWindGeometry(geometry:T.BufferGeometry,matrix:T.Matrix4){
 const position=geometry.getAttribute('position'),count=position.count,parent=Int32Array.from({length:count},(_,i)=>i);
 const find=(a:number):number=>{while(parent[a]!==a){parent[a]=parent[parent[a]];a=parent[a];}return a;};
 const join=(a:number,b:number)=>{parent[find(a)]=find(b);};
 const index=geometry.index;
 for(let i=0;i<(index?.count??count);i+=3){const a=index?index.getX(i):i,b=index?index.getX(i+1):i+1,c=index?index.getX(i+2):i+2;join(a,b);join(a,c);}
 const groups=new Map<number,{sum:T.Vector3;min:T.Vector3;max:T.Vector3;count:number}>(),point=new T.Vector3();
 for(let i=0;i<count;i++){const id=find(i);let g=groups.get(id);if(!g){g={sum:new T.Vector3(),min:new T.Vector3(Infinity,Infinity,Infinity),max:new T.Vector3(-Infinity,-Infinity,-Infinity),count:0};groups.set(id,g);}point.fromBufferAttribute(position,i);g.sum.add(point);g.min.min(point);g.max.max(point);g.count++;}
 const anchors=new Float32Array(count*3),info=new Float32Array(count*2),pivots=new Map<number,{local:T.Vector3;phase:number;grass:number}>(),inverse=matrix.clone().invert();
 for(const [id,g] of groups){const center=g.sum.divideScalar(g.count),world=center.clone().applyMatrix4(matrix),bounds=new T.Box3(g.min,g.max).applyMatrix4(matrix);const grass=bounds.max.y<1.4&&bounds.max.y-bounds.min.y<1.4?1:0;
   if(grass)world.y=bounds.min.y;
   pivots.set(id,{local:world.clone().applyMatrix4(inverse),phase:Math.sin(world.x*12.9898+world.z*78.233+world.y*7.73)*437.585,grass});}
 for(let i=0;i<count;i++){const pivot=pivots.get(find(i))!;pivot.local.toArray(anchors,i*3);info[i*2]=pivot.phase;info[i*2+1]=pivot.grass;}
 geometry.setAttribute('windAnchor',new T.BufferAttribute(anchors,3));geometry.setAttribute('windInfo',new T.BufferAttribute(info,2));
 // The GPU displacement stays within this margin; prevent edge-of-screen popping.
 geometry.computeBoundingSphere();if(geometry.boundingSphere)geometry.boundingSphere.radius+=.3;
 return groups.size;
}

function windGLSL(leaf:boolean){return `
 uniform float natureTime;uniform mat4 natureInverse;
 ${leaf?'attribute vec3 windAnchor;attribute vec2 windInfo;':''}
 vec3 windRotate(vec3 p,float angle){vec3 a=normalize(vec3(.5,.12,-.86));float c=cos(angle),s=sin(angle);return p*c+cross(a,p)*s+a*dot(a,p)*(1.-c);}
 float windFlutter(){${leaf?'return (sin(natureTime*4.2+windInfo.x)*.065+sin(natureTime*7.8+windInfo.x*1.7)*.025)*(1.+windInfo.y*1.6);':'return 0.;'}}
 vec3 windPosition(vec3 p){
   vec3 w=(modelMatrix*vec4(p,1.)).xyz;
   ${leaf?'vec3 anchor=(modelMatrix*vec4(windAnchor,1.)).xyz;w=anchor+windRotate(w-anchor,windFlutter());':''}
   float height=smoothstep(.15,5.,w.y),gust=.75+.25*sin(natureTime*.23+w.x*.09+w.z*.07);
   float bend=sin(natureTime*.72+w.x*.13+w.z*.11)*.10+sin(natureTime*1.3+w.z*.15)*.025;
   w.xz+=vec2(1.,.38)*bend*height*gust;
   return (natureInverse*vec4(w,1.)).xyz;
 }
 `;}

export function createNatureEffects(){
 const clock=createNatureClock(),attached=new WeakSet<T.Mesh>(),auxiliary=new Set<T.Material>(),originals=new Set<T.Material>(),geometries=new Set<T.BufferGeometry>();
 const stats={windMeshes:0,waterSurfaces:0,leafClusters:0};
 function attach(root:T.Object3D){
  root.updateWorldMatrix(true,true);
  root.traverse(o=>{
   if(!(o instanceof T.Mesh)||o instanceof T.InstancedMesh||attached.has(o)||Array.isArray(o.material))return;
   const original=o.material as T.MeshStandardMaterial,name=original.name.toLowerCase();
   const leaf=/_leaf\d|foliage|leaves/.test(name),bark=/_bark/.test(name),water=/_water$|_water\./.test(name);
   if(!leaf&&!bark&&!water)return;
   attached.add(o);originals.add(original);const material=original.clone();o.material=material;
   const inverse={value:o.matrixWorld.clone().invert()};
   if(leaf||bark){
    if(leaf){geometries.add(o.geometry);o.geometry=o.geometry.clone();stats.leafClusters+=prepareWindGeometry(o.geometry,o.matrixWorld);material.side=T.DoubleSide;material.roughness=.68;if(name.includes('foliage')){material.alphaTest=.48;material.transparent=false;material.depthWrite=true;material.alphaToCoverage=true;}}
    stats.windMeshes++;o.castShadow=true;o.receiveShadow=true;
    const patch=(m:T.Material,normal:boolean)=>{m.onBeforeCompile=shader=>{
      shader.uniforms.natureTime=clock.time;shader.uniforms.natureInverse=inverse;
      shader.vertexShader=windGLSL(leaf)+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed=windPosition(transformed);');
      if(normal&&leaf)shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal=normalize(mat3(natureInverse)*windRotate(normalize(mat3(modelMatrix)*objectNormal),windFlutter()));');
      if(normal&&leaf)shader.fragmentShader=shader.fragmentShader.replace('#include <shadowmap_pars_fragment>','#include <shadowmap_pars_fragment>\n#include <shadowmask_pars_fragment>').replace('#include <opaque_fragment>',`vec3 sunView=normalize(mat3(viewMatrix)*vec3(-.355,.6,.717));
        float thinLeaf=pow(max(dot(-normal,sunView),0.),1.5)*getShadowMask();
        outgoingLight+=diffuseColor.rgb*vec3(.38,.58,.22)*thinLeaf*.55;
        #include <opaque_fragment>`);
     };m.customProgramCacheKey=()=>`nature-wind-2-${leaf}-${normal}`;};
    patch(material,true);
    o.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,side:material.side,map:material.map,alphaMap:material.alphaMap,alphaTest:material.alphaTest});
    o.customDistanceMaterial=new T.MeshDistanceMaterial({side:material.side,map:material.map,alphaMap:material.alphaMap,alphaTest:material.alphaTest});
    for(const m of [o.customDepthMaterial,o.customDistanceMaterial]){patch(m,false);auxiliary.add(m);}
   }else{
    stats.waterSurfaces++;o.castShadow=false;material.roughness=.13;material.metalness=0;material.envMapIntensity=1.25;material.color.set('#34594c');
    material.onBeforeCompile=shader=>{
     shader.uniforms.natureTime=clock.time;shader.uniforms.natureInverse=inverse;
     shader.vertexShader=`uniform float natureTime;uniform mat4 natureInverse;varying vec2 waterXZ;\n`+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
       waterXZ=(modelMatrix*vec4(position,1.)).xz;
       float wave=sin(dot(waterXZ,vec2(12.,7.))-natureTime*2.4)*.002+sin(dot(waterXZ,vec2(-7.,16.))-natureTime*3.1)*.001;
       transformed+=mat3(natureInverse)*vec3(0.,wave,0.);`);
     shader.fragmentShader=`uniform float natureTime;varying vec2 waterXZ;\n`+shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
       vec2 slope=vec2(12.,7.)*cos(dot(waterXZ,vec2(12.,7.))-natureTime*2.4)*.002+vec2(-7.,16.)*cos(dot(waterXZ,vec2(-7.,16.))-natureTime*3.1)*.001;
       normal=normalize(normal+mat3(viewMatrix)*vec3(-slope.x,0.,-slope.y));`);
    };material.customProgramCacheKey=()=> 'nature-basin-water-2';
   }
   material.needsUpdate=true;
  });
 }
 return {attach,stats,time:clock.time,update:clock.update,dispose(){for(const m of auxiliary)m.dispose();for(const m of originals)m.dispose();for(const g of geometries)g.dispose();auxiliary.clear();originals.clear();geometries.clear();}};
}
