import * as T from 'three';
import {createRendering} from '../visuals/rendering';
import {createRiver} from '../visuals/atmosphere';
import {createNatureEffects} from '../visuals/nature';
import type {GameId} from './specs';

/** Shared with the asset viewer so inspected assets use the actual game's lighting. */
export function createV4Presentation(scene:T.Scene,renderer:T.WebGLRenderer,camera:T.PerspectiveCamera){
 const nature=createNatureEffects();
 const stage=new T.Group();stage.name='presentation-stage';scene.add(stage);
 scene.background=new T.Color('#c6d3c9');scene.fog=new T.Fog('#c6d3c9',45,110);
 stage.add(new T.HemisphereLight('#dfeced','#6c7968',1.45));
 const sun=new T.DirectionalLight('#ffe4b5',3);sun.position.set(-12,23,16);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-19,right:19,top:19,bottom:-19,near:1,far:70});sun.shadow.bias=-.0001;sun.shadow.normalBias=.025;sun.shadow.radius=3;stage.add(sun);
 const fill=new T.DirectionalLight('#bad5df',.65);fill.position.set(16,12,-15);stage.add(fill);
 const ground=new T.Mesh(new T.PlaneGeometry(220,220),new T.MeshStandardMaterial({color:'#acb5a1',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.43;ground.receiveShadow=true;stage.add(ground);
 const pipeline=createRendering(renderer,scene,camera);renderer.info.autoReset=false;
 try{pipeline.setQuality(localStorage.getItem('baixia.visualQuality')==='light'?'light':'fine');}catch{/* Fine quality remains available without storage. */}
 let river:ReturnType<typeof createRiver>|null=null;
 const removeRiver=()=>{if(river){river.water.removeFromParent();river.water.geometry.dispose();river.water.dispose();river=null;}};
 return {
  attach(root:T.Group,kind:GameId){
   removeRiver();root.updateMatrixWorld(true);nature.attach(root);
   if(kind==='boat'){
    const old=root.getObjectByName('BOAT_waterplane');
    if(old){const bounds=new T.Box3().setFromObject(old),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());river=createRiver(size.x,size.z,center.z);river.water.position.set(center.x,bounds.max.y+.004,center.z);scene.add(river.water);old.visible=false;const ink=root.getObjectByName('BOAT_ink_ripples');if(ink)ink.visible=false;}
   }
   renderer.shadowMap.needsUpdate=true;
  },
  render(time:number,reduced=false){river?.update(nature.update(time/1000,reduced));renderer.info.reset();pipeline.render();},
  resize:(width:number,height:number)=>pipeline.resize(width,height),
  dispose(){removeRiver();nature.dispose();pipeline.dispose();stage.removeFromParent();ground.geometry.dispose();ground.material.dispose();sun.shadow.dispose();stage.clear();},
 };
}
