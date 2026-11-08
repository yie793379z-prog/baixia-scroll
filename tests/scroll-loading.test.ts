import {describe,it,expect} from 'vitest';
import {bufferedRange,SCROLL_BUFFER_SCREENS} from '../src/viewer/scrollLoading';

describe('continuous scroll tile window',()=>{
  it('prepares more than a screen in both directions',()=>{
    const range=bufferedRange(.4,.1);
    expect(range.x).toBeCloseTo(.275);expect(range.width).toBeCloseTo(.35);
    expect(.4-range.x).toBeGreaterThan(.1);
    expect(range.x+range.width-.5).toBeGreaterThan(.1);
  });
  it.each([0,.01,.45,.88,.9])('keeps visible pixels covered near x=%s without exceeding the painting',x=>{
    const range=bufferedRange(x,.1);
    expect(range.x).toBeGreaterThanOrEqual(0);
    expect(range.x+range.width).toBeLessThanOrEqual(1);
    expect(range.x).toBeLessThanOrEqual(x);
    expect(range.x+range.width).toBeGreaterThanOrEqual(x+.1);
    expect(range.width).toBeLessThanOrEqual(.1*(1+2*SCROLL_BUFFER_SCREENS)+1e-10);
  });
  it('clamps a viewport larger than the painting to the painting itself',()=>{
    expect(bufferedRange(0,2)).toEqual({x:0,width:1});
  });
});
