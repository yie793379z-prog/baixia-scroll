import {describe,it,expect} from 'vitest';
import {initialRole,parseRole,recordEntry,NOTEBOOK_VERSION,type NotebookEntry} from '../src/roles/state';

const entry:NotebookEntry={id:'knowledge:K08',sceneId:'q_shop',title:'百业寻物',summary:'系统自动生成的游戏总结',evidenceIds:['A-K08'],testFixture:false,reviewOnly:true,knowledgeCardId:'K08',theme:'业',createdAt:'2026-11-01'};

describe('player-written journal',()=>{
 it('clears all pre-update notes once, retaining completion, identity and camera',()=>{
  const camera={imageId:'fengning_1794',center:{x:90000,y:2073},zoom:10};
  const old={...initialRole(),notebookVersion:undefined,completedActivityIds:undefined,displayName:'旅人',currentScrollCamera:camera,
   notebookEntries:[entry,{...entry,id:'v4:G06',sceneId:'water_gate',knowledgeCardId:undefined,reflection:'旧版内置感想'},{...entry,id:'well',sceneId:'well',knowledgeCardId:undefined,reflection:'清空前的文字'}]};
  const migrated=parseRole(JSON.stringify(old));
  expect(migrated.notebookEntries).toEqual([]);
  expect(migrated.notebookVersion).toBe(NOTEBOOK_VERSION);
  expect(migrated.completedActivityIds).toEqual(['knowledge:K08','v4:G06','well']);
  expect(migrated.displayName).toBe('旅人');expect(migrated.currentScrollCamera).toEqual(camera);
  expect(migrated.knowledge.unlocked).toContain('K05');
  const written=recordEntry(migrated,{...entry,reflection:'现在由我自己写。'});
  expect(parseRole(JSON.stringify(written)).notebookEntries).toEqual(written.notebookEntries);
 });
 it.each([undefined,'',' \n\t '])('does not create a note from an empty submission (%s)',reflection=>{
  const role=recordEntry(initialRole(),{...entry,reflection});
  expect(role.notebookEntries).toEqual([]);
  expect(role.completedActivityIds).toEqual(['knowledge:K08']);
  expect(role.knowledge.completed).toContain('K08');
  expect(role.completedSceneIds).toEqual([]);expect(role.observedEvidenceIds).toEqual([]);
  expect(parseRole(JSON.stringify(role)).notebookEntries).toEqual([]);
  expect(recordEntry(role,{...entry,reflection})).toBe(role);
 });
 it('stores only the entered text and preserves its line breaks',()=>{
  const role=recordEntry(initialRole(),{...entry,reflection:'  第一行\n第二行  ',experience:{observed:'自动观察',operation:'自动操作',learned:'自动知识',interpretation:'自动说明',asset:'model'}});
  expect(role.notebookEntries).toHaveLength(1);
  expect(role.notebookEntries[0]).toMatchObject({summary:'',reflection:'第一行\n第二行',evidenceIds:[]});
  expect(role.notebookEntries[0].experience).toBeUndefined();
  expect(JSON.stringify(role.notebookEntries)).not.toContain('自动');
  expect(parseRole(JSON.stringify(role)).notebookEntries).toEqual(role.notebookEntries);
 });
 it('updates a personal note without duplicating it or erasing it on a blank replay',()=>{
  const first=recordEntry(initialRole(),{...entry,reflection:'第一次的想法'});
  expect(recordEntry(first,{...entry,reflection:''})).toBe(first);
  const updated=recordEntry(first,{...entry,reflection:'重看后的想法'});
  expect(updated.notebookEntries.map(e=>e.reflection)).toEqual(['重看后的想法']);
  expect(updated.completedActivityIds).toEqual(['knowledge:K08']);
 });
 it('ignores malformed and blank note text when loading current saves',()=>{
  const saved={...initialRole(),notebookEntries:[entry,{...entry,id:'blank',reflection:'  '},{...entry,id:'invalid',reflection:{text:'not text'}}]};
  expect(parseRole(JSON.stringify(saved)).notebookEntries).toEqual([]);
 });
});
