import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import manifest from '../public/models/human-hand/manifest.json';
const raw=readFileSync(resolve(process.cwd(),'public/models/human-hand',manifest.file));
const jsonLength=raw.readUInt32LE(12),document=JSON.parse(raw.subarray(20,20+jsonLength).toString());
describe('anatomical right hand asset',()=>{
 it('ships one skinned surface with embedded skin and a finger grip clip',()=>{
  expect(raw.byteLength).toBeLessThan(1024*1024);expect(document.meshes).toHaveLength(1);
  expect(document.meshes[0].primitives).toHaveLength(1);expect(document.skins).toHaveLength(1);
  expect(document.images.length).toBeGreaterThan(0);expect(document.images.every((i:{bufferView?:number;uri?:string})=>i.bufferView!==undefined&&!i.uri)).toBe(true);
  expect(document.animations.some((a:{name:string})=>a.name==='grip')).toBe(true);
  expect(manifest.license).toBe('CC0-1.0');
  expect(document.materials.every((m:{normalTexture?:unknown})=>!m.normalTexture)).toBe(true);
 });
 it('keeps the skin attached and finite through opening and closing',async()=>{
  // Texture decoding is browser-owned; this test checks the unchanged vertex/skin/animation data.
  const j=JSON.parse(JSON.stringify(document));j.images=[];j.textures=[];j.materials=[];
  for(const mesh of j.meshes)for(const p of mesh.primitives)delete p.material;
  const text=Buffer.from(JSON.stringify(j)),padded=Buffer.alloc(Math.ceil(text.length/4)*4,32);text.copy(padded);
  const bin=raw.subarray(20+jsonLength),glb=Buffer.alloc(20+padded.length+bin.length);raw.copy(glb,0,0,20);glb.writeUInt32LE(glb.length,8);glb.writeUInt32LE(padded.length,12);padded.copy(glb,20);bin.copy(glb,20+padded.length);
  const loaded=await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.byteLength),'');
  const mixer=new T.AnimationMixer(loaded.scene);mixer.clipAction(loaded.animations[0]).play();const point=new T.Vector3(),bounds=new T.Box3();
  for(const fraction of [0,.5,.999999]){
   mixer.setTime(fraction*loaded.animations[0].duration);loaded.scene.updateMatrixWorld(true);bounds.makeEmpty();
   loaded.scene.traverse(o=>{if(o instanceof T.SkinnedMesh){o.skeleton.update();for(let i=0;i<o.geometry.getAttribute('position').count;i++){o.getVertexPosition(i,point).applyMatrix4(o.matrixWorld);bounds.expandByPoint(point);}}});
   expect(bounds.min.toArray().every(Number.isFinite)).toBe(true);expect(bounds.max.toArray().every(Number.isFinite)).toBe(true);
   expect(bounds.min.x).toBeGreaterThan(-.15);expect(bounds.max.x).toBeLessThan(.15);
   expect(bounds.min.y).toBeGreaterThan(-.12);expect(bounds.max.y).toBeLessThan(.12);
   expect(bounds.min.z).toBeGreaterThan(-.18);expect(bounds.max.z).toBeLessThan(.20);
  }
 });
});
