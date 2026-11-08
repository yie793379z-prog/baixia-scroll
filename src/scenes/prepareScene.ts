import type {SceneDefinition} from './types';
import {loadSceneModule} from './registry';
export function prepareScene(scene:SceneDefinition){
 void loadSceneModule(scene.moduleId).catch(()=>{/* The normal scene loader owns its retry UI. */});
}
