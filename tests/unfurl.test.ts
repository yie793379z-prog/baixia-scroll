import {describe,it,expect} from 'vitest';
import {unfurlFrame,UNFURL_DURATION,UNFURL_TRAVEL_START,UNFURL_TRAVEL_MS,UNFURL_RETURN_START,UNFURL_RETURN_MS} from '../src/cinematic/unfurl';
import {artwork} from '../src/content/artwork';
import {fixedBounds} from '../src/viewer/fixedCamera';

describe('full-screen fixed-scale handscroll',()=>{
  it.each([[1600,900],[1280,720],[1920,1080],[756,1100]])('fills %s × %s throughout, with no zoom or uncovered edges',(w,h)=>{
    const initial=unfurlFrame(0,w,h);
    let previousX=Infinity,previousProgress=0;
    for(let ms=0;ms<=UNFURL_DURATION;ms+=100){
      const f=unfurlFrame(ms,w,h);
      expect(f.scale).toBe(initial.scale);
      expect(f.paperHeight).toBe(h);
      expect(f.top).toBe(0);
      expect(f.left).toBeLessThanOrEqual(.0001);
      expect(f.left+f.paperWidth).toBeGreaterThanOrEqual(w-.0001);
      expect(f.paperWidth/f.paperHeight).toBeCloseTo(artwork.width/artwork.height);
      if(ms<=UNFURL_RETURN_START)expect(f.centerX).toBeLessThanOrEqual(previousX);
      else expect(f.centerX).toBeGreaterThanOrEqual(previousX);
      expect(f.progress).toBeGreaterThanOrEqual(previousProgress);
      previousX=f.centerX;previousProgress=f.progress;
    }
  });
  it('fully reveals the left end, then returns to the game opening before handoff',()=>{
    const w=1600,h=900,start=unfurlFrame(0,w,h),end=unfurlFrame(UNFURL_DURATION,w,h);
    const expanded=unfurlFrame(UNFURL_TRAVEL_START+UNFURL_TRAVEL_MS,w,h),opening=fixedBounds(w/h);
    expect(start.left+start.paperWidth).toBeCloseTo(w);
    expect(expanded.left).toBeCloseTo(0);
    expect(expanded.progress).toBe(1);
    expect(unfurlFrame(UNFURL_RETURN_START,w,h).centerX).toBe(expanded.centerX);
    expect(end.centerX).toBeCloseTo(opening.x+opening.width/2);
    expect(end.progress).toBe(1);
    expect(end.returnProgress).toBe(1);
    expect(end.controlsOpacity).toBe(0);
    expect(end.scale).toBe(start.scale);
  });
  it('returns faster with smooth boundaries and no re-rolling of the painting',()=>{
    const frame=(ms:number)=>unfurlFrame(ms,1600,900);
    expect(UNFURL_RETURN_MS).toBeLessThan(UNFURL_TRAVEL_MS);
    expect(frame(UNFURL_RETURN_START).rollerOpacity).toBe(0);
    expect(frame(UNFURL_RETURN_START+UNFURL_RETURN_MS/2).phase).toBe('returning');
    expect(frame(UNFURL_RETURN_START+UNFURL_RETURN_MS/2).returnProgress).toBeCloseTo(.5);
    for(const boundary of [UNFURL_RETURN_START,UNFURL_RETURN_START+UNFURL_RETURN_MS]){
      expect(Math.abs(frame(boundary+1).centerX-frame(boundary-1).centerX)).toBeLessThan(.1);
    }
    expect(frame(UNFURL_DURATION+5000).centerX).toBe(frame(UNFURL_DURATION).centerX);
    expect(UNFURL_DURATION+700).toBe(13000);
  });
  it('holds the opening detail, then traverses at an even reading speed',()=>{
    expect(unfurlFrame(UNFURL_TRAVEL_START,1600,900).progress).toBe(0);
    const positions=[.2,.4,.6,.8].map(p=>unfurlFrame(UNFURL_TRAVEL_START+p*UNFURL_TRAVEL_MS,1600,900).centerX);
    expect(positions[0]).toBeGreaterThan(positions[3]);
    expect(positions[0]-positions[1]).toBeCloseTo(positions[1]-positions[2]);
    expect(positions[1]-positions[2]).toBeCloseTo(positions[2]-positions[3]);
    expect(unfurlFrame(UNFURL_TRAVEL_START+UNFURL_TRAVEL_MS,1600,900).progress).toBe(1);
  });
});
