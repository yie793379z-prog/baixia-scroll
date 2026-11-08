import { describe,it,expect } from 'vitest';
import { initialBounds,imageToNormalized,normalizedToImage,validCamera,isIntentionalClick } from '../src/viewer/camera';
import { sceneReducer,exploring,type SceneState } from '../src/scenes/machine';
import { canEnterScene,type SceneSession } from '../src/scenes/types';
import { testScene } from '../src/content/scenes';
import { artwork } from '../src/content/artwork';
import { initialRole,parseRole,recordEntry } from '../src/roles/state';
const camera={imageId:artwork.imageId,center:{x:126000,y:2073},zoom:19.75};
const session:SceneSession={scene:testScene};
describe('image coordinates and camera',()=>{
  it('normalizes y by image width, and round trips without using slice origins',()=>{const p={x:114197,y:4146};expect(normalizedToImage(imageToNormalized(p,132458),132458)).toEqual(p);expect(imageToNormalized(p,132458).y).toBeCloseTo(.0313,4);});
  it.each([.45,1,1.8,3.2])('starts in the right content at viewport ratio %s',aspect=>{const b=initialBounds(artwork.width,artwork.height,aspect,artwork.initialRightPx);expect(b.x+b.width).toBeCloseTo(130800);expect(b.x).toBeGreaterThan(artwork.width*.85);expect(b.height).toBeGreaterThanOrEqual(artwork.height);});
  it('rejects foreign-version and impossible persisted cameras',()=>{expect(validCamera(camera,artwork.imageId,artwork.width,artwork.height)).toBe(true);for(const c of [{...camera,imageId:'yangdazhang_1791'},{...camera,zoom:NaN},{...camera,center:{x:-5,y:20}},{...camera,center:{x:140000,y:20}}])expect(validCamera(c,artwork.imageId,artwork.width,artwork.height)).toBe(false);});
  it('separates a click from a drag, long press or multi-touch',()=>{expect(isIntentionalClick(true,2,1)).toBe(true);expect(isIntentionalClick(true,9,1)).toBe(false);expect(isIntentionalClick(false,1,1)).toBe(false);expect(isIntentionalClick(true,0,2)).toBe(false);});
});
describe('scene access boundaries',()=>{
  it('keeps the fixture off by default and rejects the wrong painting',()=>{expect(canEnterScene(testScene,artwork,false)).toBe(false);expect(canEnterScene(testScene,artwork,true)).toBe(true);expect(canEnterScene({...testScene,imageId:'other'},artwork,true)).toBe(false);});
  it('never grants cultural approval from a test flag or missing evidence',()=>{const s={...testScene,testFixture:false};expect(canEnterScene(s,artwork,true)).toBe(false);expect(canEnterScene({...s,reviewStatus:'approved'},artwork,true)).toBe(false);expect(canEnterScene({...s,reviewStatus:'approved',evidenceIds:['e1'],sourceRefs:['source1']},artwork,false)).toBe(false);});
  it('rejects null, negative, nonfinite or out-of-image bounds',()=>{for(const boundsPx of [null,{x:132400,y:0,width:100,height:100},{x:NaN,y:0,width:100,height:100},{x:0,y:4000,width:100,height:500}])expect(canEnterScene({...testScene,boundsPx},artwork,true)).toBe(false);});
});
describe('interruptible scene lifecycle',()=>{
  it('finishes and exits directly into exploration',()=>{let s:SceneState=sceneReducer(exploring,{type:'ENTER',session});s=sceneReducer(s,{type:'FOCUSED'});s=sceneReducer(s,{type:'COMPLETE',result:{summary:'test',testFixture:true,evidenceIds:[]}});expect(s.phase).toBe('result');expect(sceneReducer(s,{type:'EXIT'})).toBe(exploring);});
  it.each(['focusing','activity','result'] as const)('exits %s without a camera-restoration stage',phase=>{const s=phase==='result'?{phase,session,result:{summary:'',evidenceIds:[],testFixture:true}}:{phase,session};expect(sceneReducer(s,{type:'EXIT'})).toBe(exploring);});
  it('ignores late focus and completion events after exit, and accepts the next visit',()=>{
    const focusing=sceneReducer(exploring,{type:'ENTER',session});expect(sceneReducer(focusing,{type:'ENTER',session})).toBe(focusing);
    const exited=sceneReducer(focusing,{type:'EXIT'});expect(sceneReducer(exited,{type:'FOCUSED'})).toBe(exploring);
    expect(sceneReducer(exited,{type:'COMPLETE',result:{summary:'late',testFixture:true,evidenceIds:[]}})).toBe(exploring);
    expect(sceneReducer(exited,{type:'EXIT'})).toBe(exploring);
    expect(sceneReducer(exited,{type:'ENTER',session})).toEqual({phase:'focusing',session});
  });
});
describe('role and notebook persistence',()=>{
  it('round trips the name, mode, camera and test notebook page',()=>{const r=recordEntry({...initialRole(),displayName:'小微',currentMode:'observe',currentScrollCamera:camera},{id:'test',sceneId:'test',title:'TEST',summary:'test only',evidenceIds:[],testFixture:true,createdAt:'2026-10-29'});expect(parseRole(JSON.stringify(r))).toEqual(r);expect(r.completedSceneIds).toEqual([]);expect(r.observedEvidenceIds).toEqual([]);});
  it('migrates the retired research mode without resetting notes or progress',()=>{
    const role=recordEntry({...initialRole(),displayName:'小微',currentScrollCamera:camera},{id:'well',sceneId:'well',title:'一井千家',summary:'旧札记',evidenceIds:['A-well'],testFixture:false,reviewOnly:true,reflection:'自己的旁记',createdAt:'2026-10-29'});
    expect(parseRole(JSON.stringify({...role,currentMode:'research'}))).toEqual({...role,currentMode:'seek'});
  });
  it('does not double count a repeated completion',()=>{const entry={id:'test',sceneId:'test',title:'TEST',summary:'test',evidenceIds:[],testFixture:true,createdAt:'2026-10-29'};const r=recordEntry(initialRole(),entry);expect(recordEntry(r,entry)).toBe(r);});
  it('recovers from corrupted and foreign-version storage',()=>{expect(parseRole('{oops')).toEqual(initialRole());expect(parseRole(JSON.stringify({...initialRole(),imageId:'yangdazhang_1791'}))).toEqual(initialRole());expect(parseRole(JSON.stringify({...initialRole(),currentScrollCamera:{...camera,zoom:-1}})).currentScrollCamera).toBeNull();});
  it('sanitizes invalid modes, names and notebook structures',()=>{const r=parseRole(JSON.stringify({...initialRole(),displayName:'   ',currentMode:'evil',notebookEntries:[null,{id:'wrong'}]}));expect(r.displayName).toBe('见微');expect(r.currentMode).toBe('seek');expect(r.notebookEntries).toEqual([]);});
});
