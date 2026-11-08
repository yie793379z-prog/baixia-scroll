import {describe,it,expect} from 'vitest';
import {gateRoute,validGateStep,cargoBalance,placeCargo,safeWaterPosition,pointInEvidence} from '../src/games/v4/rules';
import {sceneReducer} from '../src/scenes/machine';
import {reviewScenes} from '../src/content/culture';
describe('v4 operation rules',()=>{
 it('requires every adjacent route segment; cannot skip to the final gate',()=>{expect(gateRoute).toHaveLength(5);expect(validGateStep(0,4)).toBe(false);expect(validGateStep(0,0)).toBe(false);expect(validGateStep(3,4)).toBe(true);expect(validGateStep(4,5)).toBe(false);});
 it('loads each cargo once and refuses occupied positions',()=>{let slots:(number|null)[]=Array(6).fill(null);slots=placeCargo(slots,0,0)!;expect(placeCargo(slots,1,0)).toBeNull();slots=placeCargo(slots,0,3)!;expect(slots[0]).toBeNull();expect(slots[3]).toBe(0);expect(cargoBalance(slots).loaded).toBe(1);});
 it('distinguishes balanced and unbalanced complete loads',()=>{expect(cargoBalance([0,1,2,3,4,5])).toEqual({left:9,right:9,ratio:0,loaded:6});expect(cargoBalance([0,3,1,2,4,5]).ratio).toBeGreaterThan(.2);});
 it('lets a full unbalanced boat recover by physically swapping cargo',()=>{const next=placeCargo([0,3,1,2,4,5],3,3)!;expect(next).toEqual([0,2,1,3,4,5]);expect(cargoBalance(next).ratio).toBe(0);expect(new Set(next).size).toBe(6);});
 it('blocks banks and gate piers while allowing the centre of the actual opening',()=>{expect(safeWaterPosition(3.3,1)).toBe(false);expect(safeWaterPosition(1.3,-6)).toBe(false);expect(safeWaterPosition(0,-6)).toBe(true);expect(safeWaterPosition(0,-7.8)).toBe(true);});
 it('requires identifying the pictured doorway or boat before the journal action',()=>{expect(pointInEvidence('gate',.64,.58)).toBe(true);expect(pointInEvidence('boat',.52,.44)).toBe(true);expect(pointInEvidence('gate',.1,.1)).toBe(false);expect(pointInEvidence('boat',.8,.8)).toBe(false);});
 it('keeps human approval pending and ignores late completion after exit',()=>{const s=reviewScenes.find(x=>x.sceneId==='city_gate')!;expect(s.reviewStatus).toBe('in_review');const session={scene:s};const out=sceneReducer({phase:'activity',session},{type:'EXIT'});expect(sceneReducer(out,{type:'COMPLETE',result:{summary:'late',evidenceIds:[],testFixture:false}})).toEqual(out);});
});
