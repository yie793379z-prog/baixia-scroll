// Traditional labels belong to the scroll UI; scene content keeps its original text.
const scrollTitles:Record<string,string>={
  rural_path:'鄉途尋跡',well:'一井千家',cart:'負重行旅',city_gate:'門影拼合',
  market:'市井稱量',water_gate:'水門行舟',farmland:'場院合力',signature:'畫外辨真',
  q_household:'灶邊日常',q_carpentry:'木屑之間',q_herding:'羊群入畫',q_basins:'眾手成事',
  q_roadside:'街邊百味',q_bridge:'一橋相逢',q_shop:'一碗街市',q_oxmarket:'車馬通衢',
  q_wharf:'橋上橋下',q_camel:'駝鈴入城',q_sail:'兩槳同舟',q_grazing:'田畔畜力',
};
export function scrollSceneTitle(scene:{sceneId:string;title:string}):string{
  return scrollTitles[scene.sceneId]??scene.title;
}
