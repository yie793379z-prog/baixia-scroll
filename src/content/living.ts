import manifest from '../../data/ai-depth-manifest.v3.json';
export const livingScenes=manifest.scenes;
export function supportsLiving(sceneId:string){return livingScenes.some(s=>s.sceneId===sceneId);}
// Coordinates below are relative to the inspected derivative crops, never invented mother-image anchors.
// Ellipses softly localize micro-motion; the depth mesh supplies foreground/background separation.
export const livingMotion:Record<string,{water:[number,number,number,number];leaves:[number,number,number,number];actor:[number,number,number,number];line:string}>={
 cart:{water:[0,0,0,0],leaves:[.9,.73,.13,.1],actor:[.45,.37,.13,.17],line:'车轮悠悠，路上的担子跟着步子轻晃。'},
 city_gate:{water:[0,0,0,0],leaves:[.15,.7,.14,.2],actor:[.58,.67,.045,.075],line:'穿过重门，树影掩映着来往行人。'},
 market:{water:[0,0,0,0],leaves:[.51,.2,.07,.18],actor:[.455,.66,.055,.085],line:'街市渐近，脚步与器物的轻响交错。'},
 farmland:{water:[0,0,0,0],leaves:[.8,.63,.16,.3],actor:[.39,.73,.055,.12],line:'风过田畦，场院里起落相接。'},
 rural_path:{water:[.64,.43,.11,.1],leaves:[.83,.61,.16,.35],actor:[.745,.22,.025,.07],line:'风过树梢，桥下有水声。'},
 well:{water:[.268,.52,.035,.015],leaves:[.75,.25,.24,.23],actor:[.32,.48,.065,.09],line:'井绳轻响，一桶清水缓缓提起。'},
 water_gate:{water:[.71,.4,.12,.17],leaves:[.93,.55,.1,.2],actor:[.533,.447,.07,.05],line:'听水拍船舷，看轻舟经过水门。'},
 q_sail:{water:[.33,.18,.3,.13],leaves:[.78,.67,.2,.3],actor:[.35,.5,.22,.15],line:'两桨拨开水纹，树影在岸边摇曳。'},
};
