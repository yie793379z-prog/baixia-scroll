import gateManifest from '../../../assets/3d/g04_gate_v04.manifest.json';
import boatManifest from '../../../assets/3d/g06_boat_v05.manifest.json';
export type GameId='gate'|'boat';
export const specs={
 gate:{id:'G04',title:'城门回环',subtitle:'沿门前的路，替见微寻一个入口。',card:'K07',asset:'/models/g04_gate_v04.glb',required:gateManifest.requiredNodes,crop:'/culture/K07.jpg',learning:'门洞连接道路，墙体限定通行空间。顺着画中的铺地与入口观察，才能读懂这片城门的安排。',question:'在原画里，点出刚才走向的门洞。',interpretation:'可见门洞与外墙为图像依据；尺寸、背面及路径节点为示意。'},
 boat:{id:'G06',title:'水门行舟',subtitle:'装稳六件货，摇桨沿水道来到门前。',card:'K10',asset:'/models/g06_boat_v05.glb',required:boatManifest.requiredNodes,crop:'/culture/K10.jpg',learning:'画中有篷船紧邻水门，船、人、岸与门洞共同构成水边活动空间。先看可见的形态，再思考水路怎样连接城与外部。',question:'在原画里，点出水门前那条有篷船。',interpretation:'船与水门据原画塑形；装载权重、航点及操桨规则为教学模拟。'},
} as const;
