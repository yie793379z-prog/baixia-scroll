import type {ActivityChoice,SceneDefinition} from '../scenes/types';
import {linkedKnowledge} from './knowledge';

export type TaskCategory='three'|'knowledge'|'games'|'quizzes'|'play';
export function sceneActivities(scene:SceneDefinition):ActivityChoice[]{
 if(scene.sceneId==='signature')return [];
 if(scene.sceneId==='water_gate')return ['original'];
 if(scene.sceneId==='city_gate'||scene.sceneId==='well')return ['original'];
 return linkedKnowledge[scene.sceneId]?['knowledge','original']:['original'];
}
export function resolveActivity(scene:SceneDefinition,requested?:ActivityChoice):ActivityChoice{
 const available=sceneActivities(scene);
 return requested&&available.includes(requested)?requested:available[0];
}
export function isTaskAvailable(scene:SceneDefinition,category:TaskCategory){
 const available=sceneActivities(scene);
 if(category==='play')return playEntries(scene).length>0;
 return category==='three'?available.includes('three'):category==='knowledge'?available.includes('knowledge'):category==='games'?scene.kind==='minigame'&&available.includes('original'):scene.culture?.mechanic==='quiz'&&available.includes('original');
}
export const knowledgeActivityTitles:Record<string,string>={K08:'百业寻物'};
const operations:Record<string,string>={route:'走过木桥，沿路寻访',well:'走近井沿，缓缓提水',cargo:'亲手搬货，调匀船载',cart:'推车转弯，绕石稳行',puzzle:'交换画片，接续砖缝',weigh:'校零移砣，算出重量',field:'抬起落下，合力劳作',evidence:'观察款识，整理依据',quiz:'看画读诗，轻松发现'};
export function taskEntry(scene:SceneDefinition,category:TaskCategory){
 const card=linkedKnowledge[scene.sceneId];
 const choice=resolveActivity(scene,category==='three'?'three':category==='knowledge'?'knowledge':'original');
 if(choice==='three')return {choice,id:'v4:G06',title:'水门行舟',action:'装货配重，操桨过门'};
 if(choice==='knowledge')return {choice,id:'knowledge:'+card,title:knowledgeActivityTitles[card]??scene.title,action:card==='K05'?'握绳缓提，留住清水':card==='K08'?'辨认器物，寻找原位':'循着水道，描行至船旁'};
 return {choice,id:scene.sceneId,title:scene.title,action:operations[scene.culture?.mechanic??'']??'走近画中，亲手试试'};
}

// A place has one card; distinct operations keep their own saved journal IDs.
export function playEntries(scene:SceneDefinition){
 return sceneActivities(scene).flatMap(choice=>{
  if(choice==='knowledge')return [taskEntry(scene,'knowledge')];
  return choice==='original'&&scene.kind==='minigame'?[taskEntry(scene,'games')]:[];
 });
}
export function isActivityComplete(id:string,completedIds:string[]){
 // The retired rope-lifting activity shares the same learning experience at the well.
 return completedIds.includes(id)||(id==='well'&&completedIds.includes('knowledge:K05'));
}
