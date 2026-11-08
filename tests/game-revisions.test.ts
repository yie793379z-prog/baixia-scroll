import {describe,it,expect} from 'vitest';
import {activeReviewScenes,reviewScenes} from '../src/content/culture';
import {knowledgeCard,linkedKnowledge,learnFromScene,initialKnowledge} from '../src/content/knowledge';
import {STEELYARD,steelyardReading,steelyardBalanced,correctWeighing} from '../src/games/core/weighing';
import {FIELD_CYCLE_MS,fieldBeat,strikeField} from '../src/games/core/fieldRhythm';
import {departCargoBoat,cargoDeparturePose,CARGO_CAST_OFF_SECONDS} from '../src/games/first-person/departure';

describe('current playable entrances retain old evidence and notes',()=>{
 it('removes signature from live hotspots and water tracing from playable links',()=>{
  expect(activeReviewScenes.map(s=>s.sceneId)).not.toContain('signature');
  expect(reviewScenes.map(s=>s.sceneId)).toContain('signature');
  expect(activeReviewScenes).toHaveLength(19);
  expect(linkedKnowledge.water_gate).toBeUndefined();
  expect(learnFromScene(initialKnowledge(),'water_gate').unlocked).toContain('K10');
 });
 it('the optional shop question teaches a documented advertising object',()=>{
  const q=knowledgeCard('K08');expect(q.micro_quiz.options[q.micro_quiz.answer_index]).toContain('幌子');
  expect(q.micro_quiz.feedback).toContain('靴子模型');expect(q.source_ids).toContain('NMC_SHOP');
 });
});
describe('steelyard calculations require calibration offset and a level beam',()=>{
 it('subtracts the empty-pan zero rather than counting pan/beam weight as goods',()=>{
  expect(steelyardReading(STEELYARD.zeroDistance)).toBe(0);
  expect(steelyardReading(15)).toBe(200);expect(steelyardReading(20)).toBe(300);expect(steelyardReading(25)).toBe(400);
  expect(steelyardBalanced(5,0)).toBe(true);expect(steelyardBalanced(12,0)).toBe(false);
 });
 it('rejects a guessed correct mass when the beam is not level and rejects incorrect units',()=>{
  expect(correctWeighing(5,300,'300')).toBe(false);
  expect(correctWeighing(20,300,'300')).toBe(true);
  for(const answer of ['400','300kg','','NaN','Infinity'])expect(correctWeighing(20,300,answer)).toBe(false);
  expect(steelyardBalanced(Infinity,300)).toBe(false);
 });
});
describe('faster field rhythm has one action per beat',()=>{
 it('only accepts the short green window and prevents rapid J/K completion in one pass',()=>{
  expect(fieldBeat(FIELD_CYCLE_MS*.18).ready).toBe(false);expect(fieldBeat(FIELD_CYCLE_MS*.5).ready).toBe(true);expect(fieldBeat(FIELD_CYCLE_MS*.86).ready).toBe(false);
  const first=strikeField({hits:0,lastCycle:-1},'j',FIELD_CYCLE_MS*.5);
  expect(first.hits).toBe(1);expect(strikeField(first,'k',FIELD_CYCLE_MS*.52).result).toBe('used');
  expect(strikeField(first,'k',FIELD_CYCLE_MS*1.5).hits).toBe(2);
 });
 it('penalizes a mistimed action once, preserves progress at zero, and can finish in eight beats',()=>{
  const miss=strikeField({hits:3,lastCycle:2},'k',FIELD_CYCLE_MS*3.8);
  expect(miss.hits).toBe(2);expect(strikeField(miss,'k',FIELD_CYCLE_MS*3.9).hits).toBe(2);
  expect(strikeField({hits:0,lastCycle:-1},'k',0).hits).toBe(0);
  let state={hits:0,lastCycle:-1};for(let i=0;i<8;i++)state=strikeField(state,i%2?'k':'j',FIELD_CYCLE_MS*(i+.5));
  expect(state.hits).toBe(8);expect(strikeField(state,'j',FIELD_CYCLE_MS*8.5).result).toBe('done');
 });
});
describe('cargo casts off toward the gate with the whole load',()=>{
 it('points the local -X bow toward negative Z and sails bow first after turning',()=>{
  const a=cargoDeparturePose(CARGO_CAST_OFF_SECONDS),b=cargoDeparturePose(CARGO_CAST_OFF_SECONDS+1);
  expect(a.yaw).toBeCloseTo(-Math.PI/2);expect(b.z).toBeLessThan(a.z);expect(b.x).toBe(0);
  const dx=b.x-a.x,dz=b.z-a.z;expect((-Math.cos(b.yaw)*dx+Math.sin(b.yaw)*dz)/Math.hypot(dx,dz)).toBeCloseTo(1);
  expect(cargoDeparturePose(5.6).z).toBeLessThan(-8);
 });
 it('keeps loaded cargo in its own hold throughout the turn; shore cargo stays put',()=>{
  for(const frames of [30,144]){
   const boat={position:{x:0,z:-2.5},rotation:{y:0}},crates=[{position:{x:-2,z:-2.5},rotation:{y:0}},{position:{x:2,z:-2.5},rotation:{y:0}},{position:{x:3,z:2},rotation:{y:0}}];
   for(let i=1;i<=frames;i++){
    departCargoBoat(boat,crates,[0,null,1],4*i/frames);
    for(const [id,localX] of [[0,-2],[1,2]]){
     const x=crates[id].position.x-boat.position.x,z=crates[id].position.z-boat.position.z;
     expect(x*Math.cos(boat.rotation.y)-z*Math.sin(boat.rotation.y)).toBeCloseTo(localX);
     expect(x*Math.sin(boat.rotation.y)+z*Math.cos(boat.rotation.y)).toBeCloseTo(0);
     expect(crates[id].rotation.y).toBeCloseTo(boat.rotation.y);
    }
   }
   expect(crates[2]).toEqual({position:{x:3,z:2},rotation:{y:0}});
  }
 });
});
