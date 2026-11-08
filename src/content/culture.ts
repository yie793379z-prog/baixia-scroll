import rawScenes from '../../data/culture-scenes.v3.json';
import rawSources from '../../data/culture-sources.v3.json';
import quizSources from '../../data/quiz-sources.v12.json';
import rawQuizzes from '../../data/culture-quizzes.v3.json';
import review from '../../data/culture-review.v3.json';
import type { SceneDefinition, Theme, Mechanic, CultureData } from '../scenes/types';
const sourceSummaries:Record<string,string>={
 'S-FN-04':'邱士华提出祖本可能具有明代渊源的假说，并讨论三种摹本的传承与变化。',
 'S-FN-05':'德基艺术博物馆数字展提供角色入画与实时跟随体验。',
 'S-FN-06':'周运中讨论右侧城门的地理解释，并与其他研究者的辨认相对读。',
 'S-FN-07':'德基艺术博物馆的《石渠典藏·金陵图》书目介绍。',
};
const weighingSources=[
 {id:'S-WEIGH-01',author:'OpenStax / Rice University',title:'University Physics Volume 1 · 12.2 Examples of Static Equilibrium',url:'https://openstax.org/books/university-physics-volume-1/pages/12-2-examples-of-static-equilibrium',locator:'第12.2节，静力平衡与力矩计算',summary:'杠杆两侧力矩平衡；教学秤在扣除空盘与秤杆的零点影响后，用质量与力臂计算货重。'},
 {id:'S-WEIGH-02',author:'中国国家博物馆',title:'戥子',url:'https://www.chnmuseum.cn/zp/zpml/201812/t20181218_26223.shtml',locator:'馆藏条目首段，头毫与二毫分度、称金银和药品的用途',summary:'明代戥子分刻精细，可称两以下的钱、分，用于金银和药品等贵重物品。'},
];
export const sources=[...rawSources,...quizSources,...weighingSources].map(s=>({...s,summary:sourceSummaries[s.id]??s.summary}));
export const reviewScenes:SceneDefinition[]=[...rawScenes,...rawQuizzes].map(s=>({
  sceneId:s.sceneId,imageId:s.imageId,title:s.title,boundsPx:s.boundsPx,anchorPx:s.anchorPx,
  testFixture:false,reviewStatus:(review.approvedSceneIds as string[]).includes(s.sceneId)&&review.approvedBy?'approved':'in_review',
  evidenceIds:s.evidenceIds,sourceRefs:s.sceneId==='market'?[...s.sourceRefs,...weighingSources.map(source=>source.id)]:s.sourceRefs,learningGoal:s.sceneId==='market'?'认识提绳、秤星、定盘星与配套秤砣，校零后用力臂关系计算货重。':s.learningGoal,fictionDisclosure:s.fictionDisclosure,
  moduleId:s.mechanic==='quiz'?'culture-quiz':s.mechanic==='observation'?'culture-observation':`game-${s.mechanic}`,kind:s.mechanic==='observation'||s.mechanic==='quiz'?'dialogue':'minigame',
  culture:{theme:s.theme as Theme,mechanic:s.mechanic as Mechanic,previewPath:s.previewPath,detailPath:s.mechanic==='quiz'?s.previewPath:`/review/${s.sceneId}-detail.jpg`,observation:s.observation,
    questions:('questions' in s?s.questions:undefined) as CultureData['questions'],
    sourceSha256:s.sourceSha256,cropSha256:s.cropSha256,
    claims:s.claims as CultureData['claims'],
    humanReview:{approvedBy:review.approvedBy,approvedAt:review.approvedAt}},
}));
// Keep retired scene evidence available to existing journals, outside live entrances.
export const activeReviewScenes=reviewScenes.filter(s=>s.sceneId!=='signature');
export const approvedScenes=activeReviewScenes.filter(s=>s.reviewStatus==='approved');
