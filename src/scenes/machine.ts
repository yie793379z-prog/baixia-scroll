import type { ActivityResult, SceneSession } from './types';
export type SceneState = { phase: 'exploring' } | { phase: 'focusing'; session: SceneSession } | { phase: 'activity'; session: SceneSession } | { phase: 'result'; session: SceneSession; result: ActivityResult };
export type SceneEvent = { type: 'ENTER'; session: SceneSession } | { type: 'FOCUSED' } | { type: 'COMPLETE'; result: ActivityResult } | { type: 'EXIT' };
export const exploring: SceneState = { phase: 'exploring' };
export function sceneReducer(state: SceneState, event: SceneEvent): SceneState {
  if (event.type==='ENTER' && state.phase==='exploring') return { phase:'focusing',session:event.session };
  if (event.type==='FOCUSED' && state.phase==='focusing') return { phase:'activity',session:state.session };
  if (event.type==='COMPLETE' && state.phase==='activity') return { phase:'result',session:state.session,result:event.result };
  if (event.type==='EXIT' && state.phase!=='exploring') return exploring;
  return state;
}
