import {describe,it,expect} from 'vitest';
import {reviewScenes} from '../src/content/culture';
import {taskEntry,isTaskAvailable,sceneActivities,resolveActivity,playEntries,isActivityComplete} from '../src/content/tasks';
import {sceneReducer,exploring} from '../src/scenes/machine';
import {advanceCargoBoat} from '../src/games/first-person/departure';

describe('same-place activities keep distinct entrances and journal progress',()=>{
 const gate=reviewScenes.find(s=>s.sceneId==='city_gate')!;
 const water=reviewScenes.find(s=>s.sceneId==='water_gate')!;
 it('only the original gate puzzle remains accessible, including older requests',()=>{
  const completed=['v4:G04'];
  expect(sceneActivities(gate)).toEqual(['original']);
  expect(isTaskAvailable(gate,'three')).toBe(false);
  expect(isTaskAvailable(gate,'games')).toBe(true);
  expect(resolveActivity(gate,'three')).toBe('original');
  expect(completed.includes(taskEntry(gate,'games').id)).toBe(false);
 });
 it('water gate keeps only first-person cargo, including older requests',()=>{
  const choices=(['games','knowledge'] as const).map(c=>taskEntry(water,c));
  expect(sceneActivities(water)).toEqual(['original']);
  expect(isTaskAvailable(water,'knowledge')).toBe(false);
  expect(resolveActivity(water,'knowledge')).toBe('original');
  expect(choices.map(c=>c.id)).toEqual(['water_gate','water_gate']);
  expect(choices.map(c=>c.choice)).toEqual(['original','original']);
  expect(isTaskAvailable(water,'games')).toBe(true);
  expect(resolveActivity(water,'three')).toBe('original');
  expect(reviewScenes.filter(s=>isTaskAvailable(s,'three')).map(s=>s.sceneId)).toEqual([]);
  expect(reviewScenes.filter(s=>isTaskAvailable(s,'games'))).toHaveLength(7);
 });
 it('the shop quiz opens the quiz and does not inherit object-hunt completion',()=>{
  const shop=reviewScenes.find(s=>s.sceneId==='q_shop')!;
  expect(taskEntry(shop,'quizzes').choice).toBe('original');
  expect(taskEntry(shop,'quizzes').id).not.toBe(taskEntry(shop,'knowledge').id);
 });
 it('merges play at each place without duplicating the well activity',()=>{
  const places=reviewScenes.filter(s=>isTaskAvailable(s,'play'));
  const entries=places.flatMap(playEntries);
  expect(places).toHaveLength(8);expect(entries).toHaveLength(8);
  expect(new Set(entries.map(e=>e.id)).size).toBe(entries.length);
  const well=reviewScenes.find(s=>s.sceneId==='well')!;
  expect(playEntries(well).map(e=>e.id)).toEqual(['well']);
  expect(resolveActivity(well,'knowledge')).toBe('original');
  expect(isActivityComplete('well',['knowledge:K05'])).toBe(true);
  expect(isActivityComplete('water_gate',['knowledge:K10'])).toBe(false);
  expect(playEntries(water).map(e=>e.id)).toEqual(['water_gate']);
  expect(playEntries(reviewScenes.find(s=>s.sceneId==='signature')!)).toEqual([]);
  const shop=reviewScenes.find(s=>s.sceneId==='q_shop')!;
  expect(playEntries(shop).map(e=>e.id)).toEqual(['knowledge:K08']);
  expect(isTaskAvailable(shop,'quizzes')).toBe(true);
 });
 it('keeps the selected activity during play and exits without restoring a past camera',()=>{
  const session={scene:water,initialActivity:'original' as const};
  const focused=sceneReducer(sceneReducer(exploring,{type:'ENTER',session}),{type:'FOCUSED'});
  expect(focused).toEqual({phase:'activity',session});
  expect(sceneReducer(focused,{type:'EXIT'})).toBe(exploring);
 });
});

describe('first-person boat departure',()=>{
 it('moves bow-first and carries loaded cargo without moving packages on shore',()=>{
  for(const [yaw,expectedX,expectedZ] of [[0,-.65,0],[Math.PI/2,0,.65],[Math.PI,-.65*-1,0]]){
   const boat={position:{x:0,z:-2.5},rotation:{y:yaw}};
   const crates=[{position:{x:-2,z:-2.5}},{position:{x:0,z:-2.5}},{position:{x:3,z:2}}];
   for(let frame=0;frame<30;frame++)advanceCargoBoat(boat,crates,[0,1,null],1/60);
   expect(boat.position.x).toBeCloseTo(expectedX);
   expect(boat.position.z+2.5).toBeCloseTo(expectedZ);
   expect(crates[0].position.x-boat.position.x).toBeCloseTo(-2);
   expect(crates[0].position.z-boat.position.z).toBeCloseTo(0);
   expect(crates[1].position.x-boat.position.x).toBeCloseTo(0);
   expect(crates[1].position.z-boat.position.z).toBeCloseTo(0);
   expect(crates[2].position).toEqual({x:3,z:2});
  }
 });
});
