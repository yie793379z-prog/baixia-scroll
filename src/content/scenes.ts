import type { SceneDefinition } from '../scenes/types';
import { artwork } from './artwork';
import { approvedScenes } from './culture';
// Synthetic geometry inside the verified image canvas. No historical object or source is claimed.
export const testScene: SceneDefinition = {
  sceneId:'engine_test_01',imageId:artwork.imageId,title:'TEST · 镜头往返',
  boundsPx:{x:126600,y:1500,width:1400,height:1100},testFixture:true,
  reviewStatus:'candidate',evidenceIds:[],sourceRefs:[],learningGoal:'只验证交互引擎，不提供文化知识。',
  fictionDisclosure:'这是测试交互点，不是经考据的文化热点，也不指认画中人物或建筑。',
  moduleId:'engine-test',kind:'dialogue',
};
export const culturalScenes: SceneDefinition[] = approvedScenes;
