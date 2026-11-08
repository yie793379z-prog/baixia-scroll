import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {LANDSCAPE_ASSETS} from './landscapeAssets';
import type { GameWorld, WorldKind } from './environment';

export type HeroAssetState='loading'|'ready'|'fallback';
let decodingJobs=0;
async function parseLandscape(data:ArrayBuffer){
  if(decodingJobs++===0)try{MeshoptDecoder.useWorkers(2);}catch{/* CSP can require the in-thread decoder. */}
  try{return await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(data,`${location.origin}/models/landscapes-web-v05/`);}
  finally{if(--decodingJobs===0)MeshoptDecoder.useWorkers(0);}
}
function release(root:T.Object3D) {
  const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>(),images=new Set<ImageBitmap>();
  root.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
  for(const m of materials){for(const value of Object.values(m))if(value instanceof T.Texture)textures.add(value);m.dispose();}
  for(const texture of textures){if(typeof ImageBitmap!=='undefined'&&texture.image instanceof ImageBitmap)images.add(texture.image);texture.dispose();}
  for(const image of images)image.close();for(const geometry of geometries)geometry.dispose();
}

/** Swap only visual children. The existing gameplay roots, hit areas and wheel pivots stay intact. */
export function loadHeroAssets(kind:WorldKind,world:GameWorld,onState:(state:HeroAssetState)=>void) {
  const abort=new AbortController();let disposed=false;
  const timer=window.setTimeout(()=>abort.abort(),60000);
  const targets:Record<string,T.Object3D>=kind==='route'?{BRIDGE:world.bridgeVisual}:kind==='well'?{WELL:world.wellVisual,BUCKET:world.bucket}:kind==='cart'?{CART:world.cart,WHEEL_L:world.wheels[0],WHEEL_R:world.wheels[1]}:{BOAT:world.boat};
  targets.ENVIRONMENT=world.courtyardVisual;
  onState('loading');
  void (async()=>{
    let loaded:T.Group|null=null;
    try {
      const response=await fetch(LANDSCAPE_ASSETS[kind],{signal:abort.signal});
      if(!response.ok)throw new Error('asset-unavailable');
      const data=await response.arrayBuffer();if(disposed)return;
      const gltf=await parseLandscape(data);loaded=gltf.scene;
      if(disposed||abort.signal.aborted){release(loaded);loaded=null;if(!disposed)onState('fallback');return;}
      const parts=Object.entries(targets).map(([name,target])=>({name,target,source:loaded!.getObjectByName(name)??loaded!.children.find(o=>o.userData.gameNode===name)}));
      if(parts.some(p=>!p.source))throw new Error('asset-nodes');
      // Detach wheels before moving their parent CART. Each target owns its original pivot.
      for(const part of parts)part.source!.removeFromParent();
      for(const {name,target,source} of parts){
        const fallback=new T.Group();fallback.name=`${name}_fallback`;
        for(const child of [...target.children])if(!(child instanceof T.Sprite)&&!world.wheels.includes(child)&&!child.userData.runtimeWell)fallback.add(child);
        fallback.visible=false;target.add(fallback);
        source!.position.set(0,0,0);source!.quaternion.identity();source!.scale.setScalar(1);
        source!.traverse(obj=>{if(obj instanceof T.Mesh){obj.castShadow=obj.receiveShadow=true;if(name==='BUCKET'&&!Array.isArray(obj.material)&&/water/i.test(obj.material.name))obj.visible=false;for(const mat of Array.isArray(obj.material)?obj.material:[obj.material]){const m=mat as T.MeshStandardMaterial;for(const tex of [m.map,m.normalMap,m.roughnessMap])if(tex)tex.anisotropy=8;}}});
        target.add(source!);
      }
      // Photographed grass is dry straw: a restrained material tint brings the
      // banks into the same living green palette as the authored canopy.
      const graded=new Set<T.Material>();
      world.courtyardVisual.traverse(o=>{if(o instanceof T.Mesh)for(const material of Array.isArray(o.material)?o.material:[o.material]){
        if(graded.has(material))continue;graded.add(material);
        const m=material as T.MeshStandardMaterial;
        if(m.name.includes('_grass'))m.color.setRGB(.42,.64,.37);
        if(m.name.includes('_stone')||m.name.includes('_paver'))m.color.setRGB(.95,1.08,1.25);
      }});
      world.scenery.visible=false;
      if(kind==='well')world.scene.userData.courtyardReady=true;
      world.scene.updateMatrixWorld(true);
      for(const {source} of parts)world.nature.attach(source!);
      world.scene.userData.heroAsset='ready';
      onState('ready');loaded=null;
    }catch{
      if(loaded)release(loaded);
      if(!disposed)onState('fallback');
    }finally{window.clearTimeout(timer);}
  })();
  return ()=>{disposed=true;abort.abort();window.clearTimeout(timer);};
}
