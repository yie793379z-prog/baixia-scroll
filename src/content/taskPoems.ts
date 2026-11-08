import type {TaskCategory} from './tasks';

type TaskPoem =
 | {line:string;kind:'quotation';author:string;work:string;url:string}
 | {line:string;kind:'original'};

// Menu verse is separate from quiz answers and painting evidence.
// Newly written lines are never attributed to historical poets.
export const taskPoems:Record<string,TaskPoem>={
 rural_path:{line:'一径入烟村，溪桥接远津。',kind:'original'},
 well:{line:'凿井而饮，耕田而食。',kind:'quotation',author:'佚名',work:'击壤歌',url:'https://zh.wikisource.org/zh-hans/擊壤歌'},
 cart:{line:'辙印连阡陌，车声入市廛。',kind:'original'},
 city_gate:{line:'重门通巷陌，行客入烟城。',kind:'original'},
 market:{line:'一杆衡轻重，分毫见寸心。',kind:'original'},
 'knowledge:K08':{line:'市声藏百物，细看识人间。',kind:'original'},
 water_gate:{line:'水穿城阙去，舟载市声来。',kind:'original'},
 farmland:{line:'笑歌声里轻雷动，一夜连枷响到明。',kind:'quotation',author:'范成大',work:'四时田园杂兴',url:'https://zh.wikisource.org/zh-hans/四時田園雜興'},
 signature:{line:'一卷留城郭，数行识姓名。',kind:'original'},
 q_household:{line:'三日入厨下，洗手作羹汤。',kind:'quotation',author:'王建',work:'新嫁娘',url:'https://zh.wikisource.org/zh-hans/新嫁娘'},
 q_carpentry:{line:'墨线分曲直，锯声落木香。',kind:'original'},
 q_herding:{line:'尔羊来思，其角濈濈。',kind:'quotation',author:'佚名',work:'诗经·小雅·无羊',url:'https://zh.wikisource.org/zh-hans/詩經/無羊'},
 q_basins:{line:'一筛分粟秕，万粒见辛勤。',kind:'original'},
 q_roadside:{line:'市声随步近，饼气隔帘香。',kind:'original'},
 q_bridge:{line:'一桥连两岸，百担趁朝阳。',kind:'original'},
 q_shop:{line:'风吹柳花满店香，吴姬压酒唤客尝。',kind:'quotation',author:'李白',work:'金陵酒肆留别',url:'https://zh.wikisource.org/zh-hans/金陵酒肆留別'},
 q_oxmarket:{line:'车声通百巷，辙迹系千家。',kind:'original'},
 q_wharf:{line:'缓辙循桥下，轻舟傍岸横。',kind:'original'},
 q_camel:{line:'双峰驮远道，一步近人烟。',kind:'original'},
 q_sail:{line:'双桨分流水，孤篷载远天。',kind:'original'},
 q_grazing:{line:'农月无闲人，倾家事南亩。',kind:'quotation',author:'王维',work:'新晴野望',url:'https://zh.wikisource.org/zh-hans/新晴野望'},
};

export function taskPoem(sceneId:string,category:TaskCategory){
 return taskPoems[sceneId==='q_shop'&&category==='play'?'knowledge:K08':sceneId];
}
export function taskPoemCredit(poem:TaskPoem){
 return poem.kind==='quotation'?`${poem.author}《${poem.work}》`:'白下行卷 · 原创题句';
}
