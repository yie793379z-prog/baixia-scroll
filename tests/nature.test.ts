import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {RIVER_WAVES,sampleRiver,createNatureClock} from '../src/games/visuals/waves';
import {prepareWindGeometry,createNatureEffects} from '../src/games/visuals/nature';

describe('physical river waves',()=>{
 it('stay within the sum of wave amplitudes and advance without losing continuity',()=>{
  const limit=RIVER_WAVES.reduce((n,w)=>n+w.amplitude,0);
  for(let i=0;i<100;i++)expect(Math.abs(sampleRiver(i*.38,-i*.17,i*.23).height)).toBeLessThanOrEqual(limit);
  const a=sampleRiver(3,-7,4),b=sampleRiver(3,-7,4.001),c=sampleRiver(3,-7,4.8);
  expect(Math.abs(a.height-b.height)).toBeLessThan(.001);expect(Math.abs(a.height-c.height)).toBeGreaterThan(.005);
 });
 it('uses slopes that agree with numerical derivatives for boat buoyancy',()=>{
  const h=.00001;
  for(const [x,z,t] of [[0,0,0],[1.3,-3.2,18],[-5,9,200]]){
   const w=sampleRiver(x,z,t);
   expect(w.dx).toBeCloseTo((sampleRiver(x+h,z,t).height-sampleRiver(x-h,z,t).height)/(2*h),6);
   expect(w.dz).toBeCloseTo((sampleRiver(x,z+h,t).height-sampleRiver(x,z-h,t).height)/(2*h),6);
  }
 });
 it('freezes reduced motion and bounds the step after a background pause',()=>{
  const c=createNatureClock();expect(c.update(100)).toBe(0);expect(c.update(100.02)).toBeCloseTo(.02);
  expect(c.update(200,true)).toBeCloseTo(.02);expect(c.update(201,true)).toBeCloseTo(.02);
  expect(c.update(201.02)).toBeCloseTo(.04);expect(c.update(1000)).toBeCloseTo(.09);
 });
});
describe('individual vegetation and matching shadows',()=>{
 it('keeps photographed leaf cutouts in the visible mesh and both shadow passes',()=>{
  const texture=new T.Texture(),material=new T.MeshStandardMaterial({map:texture,transparent:true});material.name='Jinling_v05_foliage0';
  const leaf=new T.Mesh(new T.PlaneGeometry(.18,.24,1,2),material),effects=createNatureEffects();leaf.position.y=4;
  effects.attach(leaf);const visible=leaf.material as T.MeshStandardMaterial,depth=leaf.customDepthMaterial as T.MeshDepthMaterial,distance=leaf.customDistanceMaterial as T.MeshDistanceMaterial;
  expect(visible.transparent).toBe(false);expect(visible.alphaTest).toBe(.48);
  expect(depth.map).toBe(texture);expect(distance.map).toBe(texture);expect(depth.alphaTest).toBe(visible.alphaTest);expect(distance.alphaTest).toBe(visible.alphaTest);
  effects.dispose();leaf.geometry.dispose();visible.dispose();texture.dispose();
 });
 it('keeps leaves independent and pins low blades to the ground in world coordinates',()=>{
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([0,0,0,.1,0,0,0,.5,0, 3,4,0,3.2,4,0,3,4.3,0],3));g.setIndex([0,1,2,3,4,5]);
  expect(prepareWindGeometry(g,new T.Matrix4())).toBe(2);
  const a=g.getAttribute('windAnchor'),i=g.getAttribute('windInfo');
  expect(a.getY(0)).toBe(0);expect(i.getY(0)).toBe(1);expect(i.getY(3)).toBe(0);
  expect(a.getX(0)).toEqual(a.getX(2));expect(a.getX(3)).toBeGreaterThan(3);expect(i.getX(0)).not.toBe(i.getX(3));g.dispose();
 });
 it('attaches once, animates water, and leaves terrain grass rigid',()=>{
  const root=new T.Group();for(const name of ['Jinling_v03_leaf0','Jinling_v03_bark','Jinling_v03_water','Jinling_v03_grass']){const m=new T.MeshStandardMaterial();m.name=name;const mesh=new T.Mesh(new T.BoxGeometry(.2,.4,.1),m);mesh.position.y=3;root.add(mesh);}
  const effects=createNatureEffects();effects.attach(root);effects.attach(root);
  expect(effects.stats.windMeshes).toBe(2);expect(effects.stats.waterSurfaces).toBe(1);
  expect((root.children[0] as T.Mesh).customDepthMaterial).toBeInstanceOf(T.MeshDepthMaterial);
  expect((root.children[1] as T.Mesh).customDistanceMaterial).toBeInstanceOf(T.MeshDistanceMaterial);
  expect((root.children[3] as T.Mesh).customDepthMaterial).toBeUndefined();
  effects.dispose();root.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(o.material as T.Material).dispose();}});
 });
});
