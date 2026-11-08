import {describe,it,expect} from 'vitest';
import {canWalkCourtyard} from '../src/games/first-person/courtyard';
describe('authored courtyard circulation',()=>{
 it('keeps a continuous approach from the entrance to operating distance',()=>{
  for(let t=0;t<=1;t+=.02)expect(canWalkCourtyard(3.2*(1-t),5.1-4.5*t)).toBe(true);
 });
 it('blocks the open shaft and both timber uprights',()=>{
  for(const [x,z] of [[0,-2],[.9,-2],[-1.55,-2],[1.55,-2]])expect(canWalkCourtyard(x,z)).toBe(false);
 });
 it('allows the player to walk around both sides of the well',()=>{
  for(const x of [-2.3,2.3])for(let z=-4;z<=1;z+=.2)expect(canWalkCourtyard(x,z)).toBe(true);
 });
 it('blocks trees, furniture and the enclosing architecture',()=>{
  for(const [x,z] of [[-4.8,-3.8],[6.2,5.8],[5.6,-5.8],[8,0],[-8,0],[0,-7.5],[0,8.5]])expect(canWalkCourtyard(x,z)).toBe(false);
 });
});

