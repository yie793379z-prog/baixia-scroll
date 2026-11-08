import data from '../../data/character-dialogue-regions.v8.json';

export interface PaintedCharacter {id:string;x:number;y:number;width:number;height:number;line:number}
export const characters:PaintedCharacter[]=data.characters;
// Fictional small talk uses static cutout coordinates, never movement or speech playback.
export const travelLines=[
 '慢些走，前头还有好风景。',
 '走了一路，正好在这里歇歇脚。',
 '沿着河走，转过弯又是另一番景致。',
 '看看桥边，再看看街市，总能发现些小细节。',
 '停一停，看看来往的人，赶路也有赶路的趣味。',
 '你也来逛逛？咱们一道往前看看。',
 '路上人来人往，慢慢走，莫要走散了。',
 '树荫底下歇一会儿，再去寻些有趣的事。',
];
export function characterAt(x:number,y:number,padding=0):PaintedCharacter|undefined {
 return characters.filter(c=>x>=c.x-padding&&x<=c.x+c.width+padding&&y>=c.y-padding&&y<=c.y+c.height+padding)
  .sort((a,b)=>Math.hypot(x-a.x-a.width/2,y-a.y-a.height/2)-Math.hypot(x-b.x-b.width/2,y-b.y-b.height/2))[0];
}
