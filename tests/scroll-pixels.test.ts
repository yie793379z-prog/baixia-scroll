import {describe,it,expect} from 'vitest';
import {scrollPixelOffset,scrollTranslation} from '../src/viewer/scrollPixels';

describe('stable scroll compositing',()=>{
  it.each([1,1.25,2,3])('keeps a resting image on identical physical pixels at DPR %s',ratio=>{
    const x=-16701/ratio;
    const positions=[-1e-10,0,1e-10].map(e=>scrollPixelOffset({x:x+e,y:9e-14},ratio));
    expect(new Set(positions.map(p=>scrollTranslation(p.x,p.y))).size).toBe(1);
    expect(positions.every(p=>p.y===0)).toBe(true);
  });
  it.each([1,1.25,2,3])('does not toggle a half-pixel tie due to round-trip noise at DPR %s',ratio=>{
    const x=-16701.5/ratio;
    expect(new Set([-1e-10,0,1e-10].map(e=>scrollPixelOffset({x:x+e,y:0},ratio).x)).size).toBe(1);
  });
  it.each([1,1.25,2,3])('bounds rendering correction without reversing monotonic movement at DPR %s',ratio=>{
    let previous=-Infinity;
    for(let x=-2100;x<2100;x+=.17){
      const p=scrollPixelOffset({x,y:0},ratio);
      expect(Math.abs(p.dx)).toBeLessThanOrEqual(.5/ratio+1e-8);
      expect(p.x).toBeGreaterThanOrEqual(previous);previous=p.x;
    }
  });
  it('uses the same correction for backdrop and rebased high-resolution tiles',()=>{
    const globalX=-13642.064640617475;
    const p=scrollPixelOffset({x:globalX,y:0},2);
    for(const anchor of [0,10000,13024.5]){
      const tileLocal=14000-anchor;
      expect(globalX+anchor+p.dx+tileLocal).toBeCloseTo(p.x+14000,9);
    }
  });
  it('does not change the emitted transform for float noise after input stops',()=>{
    expect(scrollTranslation(-832.50000000009,9e-14)).toBe(scrollTranslation(-832.5000000001,0));
  });
});
