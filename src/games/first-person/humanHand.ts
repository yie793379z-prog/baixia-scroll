import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import asset from '../../../public/models/human-hand/manifest.json';

export const HUMAN_HAND_URL=`/models/human-hand/${asset.file}`;

function release(root:T.Object3D){
 const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>(),skeletons=new Set<T.Skeleton>(),images=new Set<ImageBitmap>();
 root.removeFromParent();
 root.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}if(o instanceof T.SkinnedMesh)skeletons.add(o.skeleton);});
 for(const m of materials){for(const v of Object.values(m))if(v instanceof T.Texture)textures.add(v);m.dispose();}
 textures.forEach(t=>{if(typeof ImageBitmap!=='undefined'&&t.image instanceof ImageBitmap)images.add(t.image);t.dispose();});
 images.forEach(i=>i.close());geometries.forEach(g=>g.dispose());skeletons.forEach(s=>s.dispose());
}

/** One continuous, photographed-skin mesh. The FK animation runs only as fingers move. */
export function createHumanHand(parent:T.Group){
 const abort=new AbortController();let disposed=false,model:T.Group|null=null,mixer:T.AnimationMixer|null=null,duration=1,lastGrip=-1,state:'loading'|'ready'|'error'='loading';
 const ready=(async()=>{
  try{
   const response=await fetch(HUMAN_HAND_URL,{signal:abort.signal});if(!response.ok)throw new Error('hand-unavailable');
   const data=await response.arrayBuffer();if(disposed)return;
   const gltf=await new GLTFLoader().parseAsync(data,`${location.origin}/models/human-hand/`);
   if(disposed){release(gltf.scene);return;}
   model=gltf.scene;model.name='anatomical-right-hand';
   model.traverse(o=>{if(o instanceof T.Mesh){o.frustumCulled=false;o.receiveShadow=true;o.castShadow=false;for(const material of Array.isArray(o.material)?o.material:[o.material]){const m=material as T.MeshStandardMaterial;m.roughness=.65;m.metalness=0;if(m.map)m.map.anisotropy=4;}}});
   const clip=gltf.animations.find(a=>a.name==='grip')??gltf.animations[0];if(!clip)throw new Error('hand-grip-missing');
   mixer=new T.AnimationMixer(model);duration=clip.duration;mixer.clipAction(clip).play();mixer.setTime(0);
   parent.add(model);state='ready';parent.userData.handState=state;
  }catch{if(model){release(model);model=null;}if(!disposed){state='error';parent.userData.handState=state;}}
 })();
 parent.userData.handState=state;
 return {ready,get state(){return state;},update(grip:number){
  if(!mixer||Math.abs(lastGrip-grip)<.0001)return;lastGrip=grip;
  // Avoid LoopRepeat wrapping a fully closed hand back to the open pose.
  mixer.setTime(T.MathUtils.clamp(grip,0,1)*duration*.999999);
 },dispose(){disposed=true;abort.abort();if(mixer&&model){mixer.stopAllAction();mixer.uncacheRoot(model);}if(model)release(model);model=null;mixer=null;}};
}
