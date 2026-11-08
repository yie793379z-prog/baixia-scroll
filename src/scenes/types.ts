import type { ComponentType } from 'react';
import type { BoundsPx, PointPx } from '../viewer/camera';
export type Mode = 'observe' | 'seek';
export type ActivityKind = 'dialogue' | 'minigame' | 'parallax';
export type Theme='人'|'业'|'路'|'声'|'画';
export type Mechanic='route'|'well'|'cargo'|'evidence'|'observation'|'cart'|'weigh'|'field'|'puzzle'|'quiz';
export interface CultureQuestion {
 kind:'look'|'poem'|'craft'|'life';knowledgePoint:string;pictureClue:string;
 verse?:{text:string;author:string;title:string};
 hint:string;prompt:string;options:string[];answer:number;explanation:string;
 grade:'A'|'B'|'C';sourceIds:string[];locator:string;
}
export interface CultureData {
  theme:Theme; mechanic:Mechanic; previewPath:string; detailPath:string; observation:string;
  sourceSha256:string; cropSha256:string;
  claims:{id:string;grade:'A'|'B'|'C'|'D';text?:string;sourceIds?:string[]}[];
  humanReview:{approvedBy:string|null;approvedAt:string|null};
  questions?:CultureQuestion[];
}
export interface SceneDefinition {
  sceneId:string;imageId:string;title:string;boundsPx:BoundsPx|null;anchorPx?:PointPx;
  testFixture:boolean;reviewStatus:'candidate'|'visually_verified'|'source_verified'|'in_review'|'approved';
  evidenceIds:string[];sourceRefs:string[];learningGoal:string;fictionDisclosure:string;
  moduleId:string;kind:ActivityKind;culture?:CultureData;
}
export interface GameExperience {observed:string;operation:string;learned:string;interpretation:string;asset:string}
export interface ActivityResult {summary:string;evidenceIds:string[];testFixture:boolean;reflection?:string;reviewOnly?:boolean;knowledgeCardId?:string;gameId?:'G04'|'G06';gameTitle?:string;experience?:GameExperience}
export type ActivityChoice='three'|'knowledge'|'original';
export interface ActivityProps {scene:SceneDefinition;onComplete:(result:ActivityResult)=>void;onExit:()=>void;reducedMotion?:boolean;initialActivity?:ActivityChoice}
export interface SceneModule {Component:ComponentType<ActivityProps>;dispose?:()=>void}
export type SceneLoader=()=>Promise<SceneModule>;
export interface SceneSession {scene:SceneDefinition;initialActivity?:ActivityChoice}
export function hasReviewedEvidence(scene:SceneDefinition):boolean {
  const c=scene.culture;
  return !!c&&!!c.previewPath&&c.sourceSha256.length===64&&c.cropSha256.length===64&&
    c.claims.some(x=>x.grade==='A'&&!!x.text)&&c.claims.some(x=>x.grade==='B'&&x.sourceIds?.length)&&
    scene.sourceRefs.length>0&&scene.evidenceIds.length>0&&!!scene.learningGoal&&!!scene.fictionDisclosure;
}
export function canEnterScene(scene:SceneDefinition,image:{imageId:string;width:number;height:number},testsEnabled:boolean,reviewEnabled=false):boolean {
  const b=scene.boundsPx;
  if(scene.imageId!==image.imageId||!b||![b.x,b.y,b.width,b.height].every(Number.isFinite)||b.x<0||b.y<0||b.width<=0||b.height<=0||b.x+b.width>image.width||b.y+b.height>image.height)return false;
  if(scene.testFixture)return testsEnabled;
  if(!hasReviewedEvidence(scene))return false;
  return (scene.reviewStatus==='in_review'&&reviewEnabled)||
    (scene.reviewStatus==='approved'&&!!scene.culture?.humanReview.approvedBy&&!!scene.culture?.humanReview.approvedAt);
}
