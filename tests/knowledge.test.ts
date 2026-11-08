import {describe,it,expect} from 'vitest';
import {knowledgeCards,activeKnowledgeCards,knowledgeLocations,initialKnowledge,parseKnowledge,discoverKnowledge,learnFromScene,shortKnowledge} from '../src/content/knowledge';
import {initialWaterLift,liftWater,initialWaterTrace,traceWater,waterRoute,swapOrder,traceHeading} from '../src/games/core/knowledgeRules';
import {initialRole,parseRole,recordEntry} from '../src/roles/state';
import {reviewScenes,approvedScenes} from '../src/content/culture';
describe('knowledge package provenance',()=>{
 it('keeps all 17 cards, empty package coordinates and separate located candidates',()=>{
  expect(knowledgeCards).toHaveLength(17);expect(new Set(knowledgeCards.map(c=>c.id)).size).toBe(17);
  for(const c of knowledgeCards){expect(c.hotspot.approved_by_human).toBe(false);expect(c.hotspot.world_x).toBeNull();expect(c.micro_quiz.options[c.micro_quiz.answer_index]).toBeTruthy();}
  expect(knowledgeLocations.filter(c=>c.boundsPx)).toHaveLength(7);expect(knowledgeLocations.filter(c=>!c.boundsPx).map(c=>c.cardId)).toEqual(['K04','K06']);
  expect(approvedScenes).toHaveLength(0);expect(reviewScenes).toHaveLength(20);
 });
 it('ties every located crop and object to the existing Fengning image space',()=>{
  for(const l of knowledgeLocations.filter(l=>l.boundsPx)){const b=l.boundsPx!,s=reviewScenes.find(s=>s.sceneId===l.sceneId)!;expect(b).toEqual(s.boundsPx);expect(l.sourceSha256).toBe(s.culture!.sourceSha256);expect(l.approvedByHuman).toBe(false);
   for(const o of l.objects!){expect(o.x).toBeGreaterThanOrEqual(b.x);expect(o.y).toBeGreaterThanOrEqual(b.y);expect(o.x+o.width).toBeLessThanOrEqual(b.x+b.width);expect(o.y+o.height).toBeLessThanOrEqual(b.y+b.height);}}
  for(const s of Object.values(shortKnowledge))expect(Array.from(s).length).toBeLessThanOrEqual(70);
 });
});
describe('saved knowledge and gradual discovery',()=>{
 it('clears old automatic notes while keeping identity, learning, mode and camera',()=>{
  const old={...initialRole(),displayName:'旧行旅',currentMode:'observe',introVersionSeen:3,knowledge:undefined,currentScrollCamera:{imageId:'fengning_1794',center:{x:90000,y:2073},zoom:10},notebookEntries:[{id:'well',sceneId:'well',title:'井',summary:'旧札记',evidenceIds:['A-well'],testFixture:false,reviewOnly:true,createdAt:'2026-10-29'}]};
  const next=parseRole(JSON.stringify(old));expect(next.currentMode).toBe('observe');expect(next.displayName).toBe('旧行旅');expect(next.currentScrollCamera).toEqual(old.currentScrollCamera);expect(next.notebookEntries).toEqual([]);expect(next.completedActivityIds).toEqual(['well']);expect(next.knowledge.unlocked).toEqual(['K01','K05']);
 });
 it('unlocks three-scene knowledge only after visiting observed places',()=>{
  let p=discoverKnowledge(initialKnowledge(),125000,false);expect(p.unlocked).toEqual(['K01']);expect(p.visitedAreas).toEqual(['rural']);
  p=discoverKnowledge(p,80000,true);expect(p.unlocked).toContain('K02');expect(p.unlocked).not.toContain('K03');
  p=discoverKnowledge(p,60000,true);p=discoverKnowledge(p,34000,true);expect(p.unlocked).toContain('K03');expect(p.unlocked).toContain('K11');expect(p.unlocked).not.toContain('K14');
  expect(discoverKnowledge(p,4000,true).unlocked).not.toContain('K14');expect(discoverKnowledge(p,34000,false)).toBe(p);
 });
 it('tracks distinct labor and rejects research/pending cards in progress',()=>{
  let p=learnFromScene(initialKnowledge(),'well');p=learnFromScene(p,'well');expect(p.laborScenes).toEqual(['well']);p=learnFromScene(learnFromScene(p,'cart'),'farmland');expect(p.unlocked).not.toContain('K14');expect(p.unlocked).toContain('K12');
  expect(parseKnowledge({unlocked:['K04','R01','fake','K05'],completed:['K06','K01'],visitedAreas:['fake','water'],laborScenes:['well','well'] })).toEqual({unlocked:['K01','K05'],completed:['K01'],visitedAreas:['water'],laborScenes:['well']});
 });
 it('removes retired research discovery from old progress while retaining learned culture',()=>{
  expect(activeKnowledgeCards.some(c=>c.id==='K14'||c.id.startsWith('R'))).toBe(false);
  const old={unlocked:['K01','K02','K14','K05'],completed:['K01','K14','K05'],visitedAreas:['rural','water'],laborScenes:['well']};
  expect(parseKnowledge(old)).toEqual({...old,unlocked:['K01','K02','K05'],completed:['K01','K05']});
 });
 it('records the new loop separately from the old game without granting approval',()=>{
  let role=recordEntry(initialRole(),{id:'well',sceneId:'well',title:'3D',summary:'原玩法',evidenceIds:['A-well'],testFixture:false,reviewOnly:true,createdAt:'now'});
  role=recordEntry(role,{id:'knowledge:K05',sceneId:'well',title:'井边一瓢',summary:shortKnowledge.K05,evidenceIds:['A-K05'],testFixture:false,reviewOnly:true,knowledgeCardId:'K05',createdAt:'now'});
  expect(role.notebookEntries).toHaveLength(0);expect(role.completedActivityIds).toEqual(['well','knowledge:K05']);expect(role.completedSceneIds).toEqual([]);expect(role.observedEvidenceIds).toEqual([]);expect(role.knowledge.completed).toEqual(['K05']);expect(parseRole(JSON.stringify(role)).knowledge.completed).toEqual(['K05']);
 });
});
describe('new physical and spatial rules',()=>{
 it('keeps the boat bow aligned with travel, including reversals and angle wrap',()=>{
  const origin={x:0,y:0};
  for(const p of [{x:10,y:0},{x:-10,y:0},{x:0,y:10},{x:0,y:-10},{x:-9,y:4}]){
   const heading=traceHeading(origin,p,179)*Math.PI/180,length=Math.hypot(p.x,p.y);
   expect(Math.cos(heading)*p.x/length+Math.sin(heading)*p.y/length).toBeCloseTo(1);
  }
  expect(traceHeading(origin,{x:-10,y:-.1},179)).toBeGreaterThan(180);
  expect(traceHeading(origin,origin,42)).toBe(42);
  expect(traceHeading(origin,{x:NaN,y:0},42)).toBe(42);
 });
 it('rewards steady repeated pulls and spills with a sudden yank',()=>{let s=initialWaterLift();for(let i=0;i<60;i++)s=liftWater(s,10,100);expect(s.status).toBe('success');expect(s.water).toBe(1);expect(liftWater(initialWaterLift(),400,16).status).toBe('failed');expect(liftWater(initialWaterLift(),-50,100)).toEqual(initialWaterLift());expect(liftWater(initialWaterLift(),Infinity,100)).toEqual(initialWaterLift());});
 it('requires a continuous water route and rejects walls/jumps',()=>{let s=traceWater(initialWaterTrace(),waterRoute[0]);expect(traceWater(s,waterRoute.at(-1)!).status).toBe('failed');expect(traceWater(initialWaterTrace(),{x:50,y:50}).status).toBe('failed');for(let i=1;i<waterRoute.length;i++){const a=waterRoute[i-1],b=waterRoute[i];for(let k=1;k<=8;k++)s=traceWater(s,{x:a.x+(b.x-a.x)*k/8,y:a.y+(b.y-a.y)*k/8});}expect(s.status).toBe('success');});
 it('timeline swapping preserves the set and leaves invalid input unchanged',()=>{const a=[2,0,1];expect(swapOrder(swapOrder(a,0,1),1,2)).toEqual([0,1,2]);expect(a).toEqual([2,0,1]);expect(swapOrder(a,-1,9)).toBe(a);});
});
