import type { Camera } from '../viewer/camera';
import { validCamera } from '../viewer/camera';
import type { Mode, Theme, GameExperience } from '../scenes/types';
import { artwork } from '../content/artwork';
import {INTRO_VERSION} from '../cinematic/opening';
import {initialKnowledge,parseKnowledge,learnFromScene,type KnowledgeProgress} from '../content/knowledge';
export interface NotebookEntry { id:string; sceneId:string; title:string; summary:string; evidenceIds:string[]; testFixture:boolean; createdAt:string; reviewOnly?:boolean; theme?:Theme; reflection?:string; knowledgeCardId?:string;experience?:GameExperience }
export interface RoleState {
  schemaVersion:1; interactionVersionSeen:1; imageId:string; roleId:'jianwei'; displayName:string; currentMode:Mode;
  completedSceneIds:string[]; completedActivityIds:string[]; observedEvidenceIds:string[]; notebookVersion:number; notebookEntries:NotebookEntry[]; relationshipNotes:string[];
  currentScrollCamera:Camera|null; reducedMotion:boolean; openingDismissed:boolean; introVersionSeen:number;
  knowledge:KnowledgeProgress;
}
export const STORAGE_KEY='baixia.role.v1.fengning_1794';
export const NOTEBOOK_VERSION=1;
export function initialRole():RoleState { return { schemaVersion:1,interactionVersionSeen:1,imageId:artwork.imageId,roleId:'jianwei',displayName:'见微',currentMode:'seek',completedSceneIds:[],completedActivityIds:[],observedEvidenceIds:[],notebookVersion:NOTEBOOK_VERSION,notebookEntries:[],relationshipNotes:[],currentScrollCamera:null,reducedMotion:false,openingDismissed:false,introVersionSeen:0,knowledge:initialKnowledge() }; }
const strings=(v:unknown):v is string[]=>Array.isArray(v)&&v.length<=1000&&v.every(x=>typeof x==='string'&&x.length<500);
const reflectionText=(value:unknown)=>typeof value==='string'?Array.from(value.trim()).slice(0,200).join(''):'';
// Keep the storage shape compatible, but never save generated prose as a journal entry.
const personalEntry=(entry:NotebookEntry,reflection:string):NotebookEntry=>({
  id:entry.id,sceneId:entry.sceneId,title:entry.title,summary:'',evidenceIds:[],
  testFixture:entry.testFixture,createdAt:entry.createdAt,reviewOnly:entry.reviewOnly,
  theme:entry.theme,knowledgeCardId:entry.knowledgeCardId,reflection,
});
const includeIds=(current:string[],ids:string[])=>ids.every(id=>current.includes(id))?current:[...new Set([...current,...ids])];
export function parseRole(raw:string|null):RoleState {
  const base=initialRole(); if(!raw)return base;
  try {
    const v=JSON.parse(raw) as Partial<RoleState>;
    if(v.schemaVersion!==1||v.imageId!==artwork.imageId)return base;
    const entries=Array.isArray(v.notebookEntries)?v.notebookEntries.filter((e):e is NotebookEntry=>!!e&&typeof e.id==='string'&&typeof e.sceneId==='string'&&typeof e.title==='string'&&typeof e.summary==='string'&&typeof e.testFixture==='boolean'&&typeof e.createdAt==='string'&&strings(e.evidenceIds)).slice(0,500):[];
    // This one-time reset is explicitly requested: old automatic/sample notes are cleared.
    const notebookEntries=v.notebookVersion===NOTEBOOK_VERSION?entries.flatMap(e=>{const text=reflectionText(e.reflection);return text?[personalEntry(e,text)]:[];}):[];
    const completedActivityIds=includeIds(strings(v.completedActivityIds)?v.completedActivityIds:[],entries.filter(e=>!e.testFixture).map(e=>e.id));
    return {...base,displayName:typeof v.displayName==='string'&&v.displayName.trim()?Array.from(v.displayName.trim()).slice(0,12).join(''):base.displayName,
      currentMode:v.interactionVersionSeen===1&&['observe','seek'].includes(v.currentMode as string)?v.currentMode!:base.currentMode,
      completedSceneIds:strings(v.completedSceneIds)?v.completedSceneIds:[],observedEvidenceIds:strings(v.observedEvidenceIds)?v.observedEvidenceIds:[],
      relationshipNotes:strings(v.relationshipNotes)?v.relationshipNotes:[],notebookEntries,completedActivityIds,knowledge:entries.reduce((p,e)=>learnFromScene(p,e.sceneId),parseKnowledge(v.knowledge)),
      currentScrollCamera:validCamera(v.currentScrollCamera,artwork.imageId,artwork.width,artwork.height)?v.currentScrollCamera:null,
      reducedMotion:v.reducedMotion===true,openingDismissed:v.openingDismissed===true,introVersionSeen:v.introVersionSeen===INTRO_VERSION?INTRO_VERSION:v.introVersionSeen===3?3:v.introVersionSeen===2?2:0};
  }catch{return base;}
}
export function recordEntry(role:RoleState,entry:NotebookEntry):RoleState {
  if(role.notebookVersion!==NOTEBOOK_VERSION)role=parseRole(JSON.stringify(role));
  const previous=role.notebookEntries.find(e=>e.id===entry.id);
  const reflection=reflectionText(entry.reflection);
  let notebookEntries=role.notebookEntries;
  if(reflection&&(!previous||previous.reflection!==reflection||previous.title!==entry.title)){
    const next=personalEntry(entry,reflection);
    notebookEntries=previous?role.notebookEntries.map(e=>e.id===entry.id?next:e):[...role.notebookEntries,next];
  }
  const knowledge={...learnFromScene(role.knowledge,entry.sceneId)};
  if(entry.knowledgeCardId){knowledge.unlocked=[...new Set([...knowledge.unlocked,entry.knowledgeCardId])];knowledge.completed=[...new Set([...knowledge.completed,entry.knowledgeCardId])];}
  const completedActivityIds=entry.testFixture?role.completedActivityIds:includeIds(role.completedActivityIds,[entry.id]);
  const observedEvidenceIds=entry.testFixture||entry.reviewOnly?role.observedEvidenceIds:includeIds(role.observedEvidenceIds,entry.evidenceIds);
  const completedSceneIds=entry.testFixture||entry.reviewOnly?role.completedSceneIds:includeIds(role.completedSceneIds,[entry.sceneId]);
  if(notebookEntries===role.notebookEntries&&completedActivityIds===role.completedActivityIds&&observedEvidenceIds===role.observedEvidenceIds&&completedSceneIds===role.completedSceneIds&&JSON.stringify(knowledge)===JSON.stringify(role.knowledge))return role;
  return {...role,knowledge,notebookEntries,completedActivityIds,observedEvidenceIds,completedSceneIds};
}
