import raw from '../../data/knowledge-cards.v10.json';
import locations from '../../data/knowledge-locations.v10.json';
export type KnowledgeCard = typeof raw.cards[number];
const feedback:Record<string,string>={
 K02:'从画面右端开始，一路向左展开。本作左拖前行、右拖回看；触控板双指也可行卷。',
 K03:'乡野、街市与郊野风光沿卷相接，构成一段丰富的城市行旅。',
 K04:'纺车的旋转与牵引配合，把纤维逐渐捻成纱线。手上的节奏很重要。',
 K05:'留意取水人的双手、井口与盛水容器，一桶清水连着日常生活。',
 K06:'把目光放在人物之间的动作与照料关系，家常生活也藏在长卷里。',
 K07:'顺着道路看门洞，再沿墙体辨认围合关系，就能读出城门的层次。',
 K09:'车马沿路行走，舟船循水而来；多种运送方式连接着城市生活。',
 K10:'水门让水道穿过城墙，舟船、岸边和门洞共同组成水边的通行空间。',
 K11:'德基艺术博物馆统计其所藏冯宁卷中共有533个人物、90只动物。',
 K12:'取水、运输与场院劳作，一城繁华由许多普通人的劳动连接。',
 K13:'冯宁于1794年完成这件摹本；画作沿袭的图像传统，还可以循着其他摹本继续追寻。',
 K14:'见微是陪伴这次行旅的游戏角色。画面、文献、研究推想与故事，各有来处。',
 R01:'台北故宫馆藏登记为纸本，报纸论文记作绢本。对读时可以分别找到这两条记录。',
 R02:'周安庆、张宏提出，杨大章卷末的捕鱼场景或出自画家的增绘。',
 R03:'研究者结合地图、门洞方向与不同版本的画面，讨论这座城门的身份。',
};
const shopQuiz={prompt:'清代靴鞋店把放大的靴子模型挂在门外，让路人一看就知道卖什么。这种广告叫什么？',options:['写店名的招牌','展示商品形象的幌子','记录买卖的账簿'],answer_index:1,feedback:'这叫“幌子”。幌子可用实物、模型或图画标示商品，招牌多用文字标明店名、商号。国博介绍的《乾隆南巡图》中，就有悬挂大靴子模型的靴鞋店。'};
export const knowledgeCards:KnowledgeCard[]=raw.cards.map(c=>({...c,
 ...(c.id==='K07'?{learning_goal:'从建筑细节中理解城门与道路的组织'}:c.id==='R02'?{learning_goal:'认识研究者如何根据图像提出假说'}:c.id==='K14'?{title:'读画寻踪：线索各有来处'}:{}),
 micro_quiz:c.id==='K08'?shopQuiz:{...c.micro_quiz,feedback:feedback[c.id]??c.micro_quiz.feedback},
 ...(c.id==='K08'?{source_ids:[...c.source_ids,'NMC_SHOP'],source_basis:c.source_basis+'；文化小题据国博王芳《清代的商业广告》所举靴鞋店模型幌例。'}:{}),
}));
export const knowledgeSources={...raw.sources,
 NMC_SHOP:{name:'王芳《清代的商业广告》· 中国国家博物馆',type:'museum_research',locator:'《文物里的古代中国》下册，官网“清代的商业广告”幌子与招牌部分',url:'https://www.chnmuseum.cn/yj/xscg/xslw/201812/t20181224_33276.shtml',scope:'清代店铺招牌、实物幌与模型幌；以馆藏乾隆南巡图等举例'},
 P2015:{...raw.sources.P2015,scope:'杨大章版与清代摹本研究'},
 DEJI_LIANG:{...raw.sources.DEJI_LIANG,scope:'冯宁版瓮城、纺车、汲水与家庭生活'},
 NANJING_HIST:{...raw.sources.NANJING_HIST,scope:'冯宁版城门、水路与空间识读'},
};
export const knowledgeLocations=locations;
export const linkedKnowledge:Record<string,string>={q_shop:'K08'};
export const sceneKnowledge:Record<string,string>={...linkedKnowledge,well:'K05',water_gate:'K10',city_gate:'K07',cart:'K09',farmland:'K12',signature:'K13'};
export const globalKnowledgeIds=['K01','K02','K03','K11'];
export const activeKnowledgeCards=knowledgeCards.filter(c=>globalKnowledgeIds.includes(c.id)||locations.some(l=>l.cardId===c.id&&l.boundsPx));
export function knowledgeCard(id:string){return knowledgeCards.find(c=>c.id===id)!;}
export interface KnowledgeProgress {unlocked:string[];completed:string[];visitedAreas:string[];laborScenes:string[]}
export const initialKnowledge=():KnowledgeProgress=>({unlocked:['K01'],completed:[],visitedAreas:[],laborScenes:[]});
const unique=(items:string[])=>[...new Set(items)];
export function parseKnowledge(value:unknown):KnowledgeProgress {
 const v=value as Partial<KnowledgeProgress>|null;
 const valid=(list:unknown,allowed:string[])=>Array.isArray(list)?unique(list.filter((x):x is string=>typeof x==='string'&&allowed.includes(x))):[];
 const ids=activeKnowledgeCards.map(c=>c.id);
 const completed=valid(v?.completed,ids);
 return {unlocked:unique(['K01',...valid(v?.unlocked,ids),...completed]),completed,visitedAreas:valid(v?.visitedAreas,['rural','market','water']),laborScenes:valid(v?.laborScenes,['well','cart','farmland'])};
}
// Discovery windows are observed crops, not claimed boundaries of historical districts.
export const discoveryAreas=[{id:'rural',label:'乡野',x:121800,end:128000},{id:'market',label:'街市',x:55800,end:66000},{id:'water',label:'水乡',x:22500,end:37100}];
export function discoverKnowledge(p:KnowledgeProgress,x:number,moved:boolean):KnowledgeProgress {
 const visited=unique([...p.visitedAreas,...discoveryAreas.filter(a=>x>=a.x&&x<=a.end).map(a=>a.id)]);
 const unlocked=unique([...p.unlocked,...(moved?['K02']:[]),...(visited.length===3?['K03','K11']:[])]);
 return unlocked.length===p.unlocked.length&&visited.length===p.visitedAreas.length?p:{...p,unlocked,visitedAreas:visited};
}
export function learnFromScene(p:KnowledgeProgress,sceneId:string):KnowledgeProgress {
 const card=sceneKnowledge[sceneId];if(!card)return p;
 const labor=unique([...p.laborScenes,...(['well','cart','farmland'].includes(sceneId)?[sceneId]:[])]);
 return {...p,laborScenes:labor,unlocked:unique([...p.unlocked,card,...(labor.length===3?['K11','K12']:[])])};
}
export const shortKnowledge:Record<string,string>={
 K01:'谢遂1787年、杨大章1791年、冯宁1794年。三卷承接同一图像传统，我们眼前的是冯宁卷。',
 K02:'从右端徐徐向左，一段乡路、一座城门、一片水面，长卷把观看变成一次行旅。',
 K03:'乡野、街市与郊野水乡沿卷相连。道路送来行旅，河道载着舟船，城市与周围的生活彼此相依。',
 K05:'井口、绳索与盛水容器连起日常用水。稳稳提起一桶水，也是一份细致的劳动。',
 K07:'门洞与墙体组织着通行的空间。顺着画中的开口观察，城门的层次就清楚起来。',
 K08:'檐下器物、台上容器和提梁桶各有形状与位置。先认外形，再看周围，市井细节就在眼前。',
 K09:'车、畜与随行人物组成一段运送关系。城中的流动，也由这些普通劳动连接。',
 K10:'门洞下的水面与舟船相接。水道穿过城市的边界，也连起岸边的人家与街市。',
 K11:'德基艺术博物馆对冯宁卷统计出533个人物、90只动物。这是这一个版本里的画中百态。',
 K12:'取水、运送、场院劳作，各有手上的功夫。一城繁华，就藏在这些日常动作里。',
 K13:'卷尾可见冯宁款署及乾隆五十九年十一月。1794年是这件摹本的创作年代。',
 K14:'画面、文献、研究推测和游戏故事各有来处。辨清依据，古画里的故事就读得更深。',
};
