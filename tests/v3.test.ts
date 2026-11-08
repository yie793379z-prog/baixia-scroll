import {describe,it,expect} from 'vitest';
import {fixedBounds,fixedCamera,draggedCenter,wheelTravel} from '../src/viewer/fixedCamera';
import {artwork} from '../src/content/artwork';
import {sources,reviewScenes,approvedScenes} from '../src/content/culture';
import {canEnterScene} from '../src/scenes/types';
import {initialRole,parseRole,recordEntry} from '../src/roles/state';
import {advanceRoute,initialRoute,roadPath,initialWell,stepWell,cargoReady,cargoBalance,placeCargo,safeStroke,evidenceCards,classifyEvidence} from '../src/games/core/rules';
describe('v3 fixed reading camera',()=>{
 it.each([[1280,676],[1600,856],[1920,1036]])('fits full painting height at %sx%s',(w,h)=>{const b=fixedBounds(w/h);expect(b.height).toBe(4146);expect(b.y).toBe(0);expect(b.x+b.width).toBeCloseTo(130800);expect(fixedCamera(w/h).center.y).toBe(2073);});
 it('left drag decreases x and right drag returns with fixed zoom',()=>{const c=fixedCamera(1280/676);const x=draggedCenter(c.center.x,-200,1280,1280/676);expect(x).toBeLessThan(c.center.x);expect(draggedCenter(x,200,1280,1280/676)).toBeCloseTo(c.center.x);expect(fixedCamera(1280/676,x).zoom).toBe(c.zoom);});
 it('clamps both ends instead of showing empty world',()=>{const left=fixedBounds(2,-999),right=fixedBounds(2,999999);expect(left.x).toBe(0);expect(right.x+right.width).toBe(132458);});
});
describe('human review remains a real gate',()=>{
 it('has twenty evidenced candidates and zero formally approved scenes',()=>{expect(reviewScenes).toHaveLength(20);expect(approvedScenes).toHaveLength(0);for(const s of reviewScenes){expect(s.reviewStatus).toBe('in_review');expect(canEnterScene(s,artwork,true)).toBe(false);expect(canEnterScene(s,artwork,false,true)).toBe(true);}});
 it('a status string or an opt-in cannot bypass missing provenance',()=>{const s=reviewScenes[0];expect(canEnterScene({...s,reviewStatus:'approved'},artwork,false,true)).toBe(false);expect(canEnterScene({...s,culture:undefined},artwork,false,true)).toBe(false);expect(canEnterScene({...s,culture:{...s.culture!,humanReview:{approvedBy:'fixture reviewer',approvedAt:'2026-10-29'}},reviewStatus:'approved'},artwork,false)).toBe(true);});
 it('does not turn rehearsal notes into formal evidence or completions',()=>{const e={id:'well',sceneId:'well',title:'well',summary:'prototype',evidenceIds:['A-well'],testFixture:false,reviewOnly:true,createdAt:'2026-10-29',reflection:'my own observation'};const r=recordEntry(initialRole(),e);expect(r.notebookEntries).toHaveLength(1);expect(r.observedEvidenceIds).toEqual([]);expect(r.completedSceneIds).toEqual([]);expect(recordEntry(r,e)).toBe(r);expect(parseRole(JSON.stringify(r)).notebookEntries[0].reviewOnly).toBe(true);});
 it('P1 dismissed intro does not silently dismiss the v3 cinema',()=>{const old={...initialRole(),openingDismissed:true,introVersionSeen:undefined};expect(parseRole(JSON.stringify(old)).introVersionSeen).toBe(0);expect(parseRole(JSON.stringify({...old,introVersionSeen:2})).introVersionSeen).toBe(2);expect(parseRole(JSON.stringify({...old,introVersionSeen:3})).introVersionSeen).toBe(3);expect(parseRole(JSON.stringify({...old,introVersionSeen:4})).introVersionSeen).toBe(4);});
});
describe('four different playable rules',()=>{
 it('requires continuous travel along every road waypoint',()=>{let s=initialRoute();s=advanceRoute(s,roadPath[0]);for(let i=1;i<roadPath.length;i++){const a=roadPath[i-1],b=roadPath[i];for(let t=1;t<=10;t++)s=advanceRoute(s,{x:a.x+(b.x-a.x)*t/10,y:a.y+(b.y-a.y)*t/10});}expect(s.status).toBe('success');expect(advanceRoute(initialRoute(),{x:30,y:30}).status).toBe('failure');expect(advanceRoute(advanceRoute(initialRoute(),roadPath[0]),roadPath.at(-1)!).status).toBe('failure');});
 it('slow lifting succeeds only after settling; forceful lifting spills',()=>{let calm=initialWell();for(let i=0;i<650;i++)calm=stepWell(calm,.65,.016);expect(calm.height).toBe(1);expect(calm.status).toBe('playing');for(let i=0;i<90;i++)calm=stepWell(calm,0,.016);expect(calm.status).toBe('success');expect(calm.water).toBeGreaterThan(.9);let rough=initialWell();for(let i=0;i<700;i++)rough=stepWell(rough,1,.016);expect(rough.status).toBe('failure');});
 it('enforces unique cargo, balance and a bounded rowing rhythm',()=>{expect(cargoReady([0,1,2])).toBe(false);expect(cargoReady([1,0,2])).toBe(true);expect(cargoReady([0,0,0])).toBe(false);expect(cargoReady([null,null,null])).toBe(false);expect(cargoBalance([1,0,2])).toBeCloseTo(-1/6);expect(placeCargo([0,1,2],0,2)).toEqual([null,1,0]);expect(safeStroke(800)).toBe(true);expect(safeStroke(100)).toBe(false);expect(safeStroke(1800)).toBe(false);});
 it('separates visible inscription, sources, attributed hypothesis and fiction',()=>{const all=Object.fromEntries(evidenceCards.map(c=>[c.id,c.grade]));expect(classifyEvidence(all).success).toBe(true);expect(classifyEvidence({...all,hypothesis:'B'}).incorrect).toEqual(['hypothesis']);expect(classifyEvidence({}).incorrect).toHaveLength(6);});
});

describe('macOS trackpad scrolling',()=>{
 const event={deltaX:120,deltaY:3,deltaMode:0,ctrlKey:false,metaKey:false};
 it('maps dominant horizontal and vertical scrolling into horizontal travel',()=>{expect(wheelTravel(event,1280)).toBe(-120);expect(wheelTravel({...event,deltaX:2,deltaY:-80},1280)).toBe(80);expect(wheelTravel({...event,deltaX:3,deltaY:0,deltaMode:1},1280)).toBe(-48);});
 it('blocks pinch zoom modifiers and nonfinite input',()=>{expect(wheelTravel({...event,ctrlKey:true},1280)).toBe(0);expect(wheelTravel({...event,metaKey:true},1280)).toBe(0);expect(wheelTravel({...event,deltaX:Infinity},1280)).toBe(0);});
});

describe('expanded cultural play',()=>{
 it('keeps a personal reflection on replay without adding the generated game summary',()=>{
  const old={id:'cart',sceneId:'cart',title:'cart',summary:'observation card',evidenceIds:['A-cart'],testFixture:false,reviewOnly:true,createdAt:'2026-10-29',reflection:'my own note'};
  const first=recordEntry(initialRole(),old),next=recordEntry(first,{...old,summary:'completed first-person driving',reflection:''});expect(next.notebookEntries).toHaveLength(1);expect(next.notebookEntries[0].summary).toBe('');expect(next.notebookEntries[0].reflection).toBe('my own note');expect(next.completedSceneIds).toEqual([]);expect(next.observedEvidenceIds).toEqual([]);
 });
 it('offers eight distinct operation games plus twelve two-question sites',()=>{
  const games=reviewScenes.filter(s=>s.culture?.mechanic!=='quiz'),quizzes=reviewScenes.filter(s=>s.culture?.mechanic==='quiz');
  expect(games).toHaveLength(8);expect(new Set(games.map(s=>s.culture!.mechanic)).size).toBe(8);expect(quizzes).toHaveLength(12);
  expect(new Set(reviewScenes.map(s=>s.sceneId)).size).toBe(20);
  for(const q of quizzes){expect(q.culture!.questions).toHaveLength(2);for(const question of q.culture!.questions!){expect(question.answer).toBeGreaterThanOrEqual(0);expect(question.answer).toBeLessThan(question.options.length);expect(question.explanation.length).toBeGreaterThan(10);expect(question.hint.trim()).toBeTruthy();expect(question.locator).toBeTruthy();if(question.grade==='B')expect(question.sourceIds.length).toBeGreaterThan(0);}}
 });
 it('keeps every new quiz crop separate from existing and other quiz locations',()=>{
  for(const q of reviewScenes.filter(s=>s.culture?.mechanic==='quiz'))for(const s of reviewScenes){if(q===s)continue;const a=q.boundsPx!,b=s.boundsPx!;expect(a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y).toBe(false);}
 });
 it('connects every lesson to a picture clue and a readable source',()=>{
  const all=reviewScenes.flatMap(s=>s.culture?.questions??[]);
  for(const q of all){
   expect(q.pictureClue.trim()).toBeTruthy();expect(q.knowledgePoint.trim()).toBeTruthy();
   expect(q.sourceIds.length).toBeGreaterThan(0);
   expect(q.sourceIds.every(id=>sources.some(s=>s.id===id&&s.url.startsWith('https://')&&s.locator))).toBe(true);
   expect(q.prompt+q.explanation+q.pictureClue).not.toMatch(/待考|仍需|有待复核|未核实|不作定论/);
   if(q.kind==='poem'){
    expect(q.grade).toBe('B');expect(q.verse?.text).toBeTruthy();expect(q.verse?.author).toBeTruthy();
    expect(q.sourceIds.some(id=>id.startsWith('S-P12-'))).toBe(true);
    expect(q.prompt).not.toMatch(/接一句|____/);
   }
  }
  const sheep=reviewScenes.find(s=>s.sceneId==='q_herding')!.culture!.questions!;
  expect(sheep.find(q=>q.kind==='poem')!.verse!.title).toBe('小雅·无羊');
  const boat=reviewScenes.find(s=>s.sceneId==='q_sail')!.culture!.questions!;
  expect(boat.some(q=>q.sourceIds.includes('S-Q12-13'))).toBe(true);
 });
});


describe('restored task entry defaults',()=>{
 it('opens interaction mode for old saves while clearing automatic notes and preserving the camera',()=>{
  const saved={...initialRole(),interactionVersionSeen:undefined,currentMode:'observe' as const,displayName:'旧札记',currentScrollCamera:fixedCamera(2),notebookEntries:[{id:'well',sceneId:'well',title:'井边',summary:'已有记录',evidenceIds:[],testFixture:false,reviewOnly:true,createdAt:'2026-10-29'}]};
  const restored=parseRole(JSON.stringify(saved));expect(restored.currentMode).toBe('seek');expect(restored.displayName).toBe(saved.displayName);expect(restored.notebookEntries).toEqual([]);expect(restored.completedActivityIds).toEqual(['well']);expect(restored.currentScrollCamera).toEqual(saved.currentScrollCamera);
  expect(parseRole(JSON.stringify({...restored,currentMode:'observe'})).currentMode).toBe('observe');
 });
});
