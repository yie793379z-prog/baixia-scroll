import type { SceneLoader } from './types';
const workshop:SceneLoader=async()=>({Component:(await import('../games/KnowledgeActivity')).LinkedActivity});
const modules = new Map<string,SceneLoader>([
  ['culture-quiz',workshop],
  ...['game-route','game-well','game-cargo','culture-observation','game-cart','game-weigh','game-field','game-puzzle'].map(id=>[id,workshop] as [string,SceneLoader]),
  ['engine-test',async()=>{const m=await import('./TestActivity');return {Component:m.TestActivity};}],
]);
export function registerSceneModule(id:string,loader:SceneLoader):()=>void {
  if(modules.has(id))throw new Error(`Scene module already registered: ${id}`);
  modules.set(id,loader);return ()=>{modules.delete(id);};
}
export function loadSceneModule(id:string) { const loader=modules.get(id);if(!loader)throw new Error(`Unknown scene module: ${id}`);return loader(); }
