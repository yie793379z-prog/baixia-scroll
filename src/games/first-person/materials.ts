import * as T from 'three';
export function createPalette(){
 let seed=7919;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const textures:T.Texture[]=[];
 const canvas=(size:number,paint:(c:CanvasRenderingContext2D,n:number)=>void)=>{const node=document.createElement('canvas');node.width=node.height=size;paint(node.getContext('2d')!,size);const t=new T.CanvasTexture(node);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;textures.push(t);return t;};
 const wood=canvas(1024,(c,n)=>{c.fillStyle='#95846b';c.fillRect(0,0,n,n);for(let i=0;i<1100;i++){const y=random()*n;c.strokeStyle=`rgba(${random()>.5?'51,34,18':'219,188,133'},${.03+random()*.14})`;c.lineWidth=.3+random()*1.2;c.beginPath();c.moveTo(0,y);for(let x=0;x<=n;x+=16)c.lineTo(x,y+Math.sin(x/37+i)*(.4+random()*2));c.stroke();}for(let i=0;i<12;i++){c.strokeStyle='#49312155';c.lineWidth=.7;c.beginPath();c.ellipse(random()*n,random()*n,12+random()*25,1+random()*3,0,0,Math.PI*2);c.stroke();}});
 const stone=canvas(1024,(c,n)=>{
  c.fillStyle='#b1b1a4';c.fillRect(0,0,n,n);
  for(let i=0;i<450;i++){const x=random()*n,y=random()*n,r=15+random()*100,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,i%2?'#39473b28':'#f2ebd333');g.addColorStop(1,'#00000000');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
  for(let i=0;i<52000;i++){c.fillStyle=random()>.48?'#eee7d735':'#38443b32';const size=.5+random()*3;c.fillRect(random()*n,random()*n,size,size);}
  for(let i=0;i<18;i++){c.strokeStyle='#3b443b45';c.lineWidth=.5+random();c.beginPath();let x=random()*n,y=random()*n;c.moveTo(x,y);for(let j=0;j<9;j++)c.lineTo(x+=(random()-.4)*15,y+=random()*12);c.stroke();}
 });
 const bark=canvas(512,(c,n)=>{c.fillStyle='#7a7766';c.fillRect(0,0,n,n);for(let i=0;i<800;i++){const x=random()*n;c.strokeStyle=i%3?'#302f2450':'#c1b39b60';c.lineWidth=.6+random()*3;c.beginPath();c.moveTo(x,0);for(let y=0;y<=n;y+=12)c.lineTo(x+Math.sin(y*.025+i)*3+Math.sin(y*.09+i),y);c.stroke();}for(let i=0;i<70;i++){c.fillStyle='#9ca07e26';c.beginPath();c.ellipse(random()*n,random()*n,4+random()*12,8+random()*20,0,0,Math.PI*2);c.fill();}});
 bark.center.set(.5,.5);bark.rotation=Math.PI/2;
 const plaster=canvas(512,(c,n)=>{c.fillStyle='#e1dac5';c.fillRect(0,0,n,n);for(let i=0;i<6000;i++){c.fillStyle=i%3?'#b3ac9620':'#fff6e320';c.beginPath();c.arc(random()*n,random()*n,random()*5,0,Math.PI*2);c.fill();}const g=c.createLinearGradient(0,n*.55,0,n);g.addColorStop(0,'#787a5800');g.addColorStop(1,'#787a5840');c.fillStyle=g;c.fillRect(0,0,n,n);});
 const earth=canvas(1024,(c,n)=>{c.fillStyle='#a89b79';c.fillRect(0,0,n,n);for(let i=0;i<125000;i++){c.fillStyle=i%3?'#5c61462a':'#e5d7aa55';c.fillRect(random()*n,random()*n,.6+random()*2,.5+random()*2);}});earth.repeat.set(48,48);
 const leaves=canvas(256,(c,n)=>{c.clearRect(0,0,n,n);for(let i=0;i<48;i++){const x=30+random()*196,y=30+random()*196;c.save();c.translate(x,y);c.rotate(random()*6.28);c.fillStyle=['#c7c99b','#9ca96d','#6c8150','#a9b880'][i%4];c.beginPath();c.ellipse(0,0,6+random()*13,3+random()*6,0,0,6.28);c.fill();c.restore();}});
 const brick=canvas(1024,(c,n)=>{c.fillStyle='#777d74';c.fillRect(0,0,n,n);for(let row=0;row<16;row++)for(let col=-1;col<8;col++){const x=col*128+(row%2)*64,y=row*64,v=130+Math.floor(random()*20);c.fillStyle='rgb('+v+','+(v+5)+','+(v-3)+')';c.fillRect(x+2,y+2,124,60);c.strokeStyle='#d2cdb64a';c.lineWidth=2;c.strokeRect(x+4,y+4,120,56);}for(let i=0;i<15000;i++){c.fillStyle=i%2?'#303a3614':'#eeebd318';c.fillRect(random()*n,random()*n,2,2);}});
 const linen=canvas(256,(c,n)=>{c.fillStyle='#c7bca0';c.fillRect(0,0,n,n);for(let i=0;i<n;i+=4){c.fillStyle='#8e826c44';c.fillRect(i,0,1,n);c.fillRect(0,i,n,1);c.fillStyle='#f3e9cf77';c.fillRect(i+1,0,1,n);}});
 const normalFrom=(map:T.Texture)=>{const source=map.image as HTMLCanvasElement,n=source.width,c=document.createElement('canvas');c.width=c.height=n;const ctx=c.getContext('2d')!,data=source.getContext('2d')!.getImageData(0,0,n,n).data,out=ctx.createImageData(n,n);const h=(x:number,y:number)=>{const k=(((y+n)%n)*n+(x+n)%n)*4;return(data[k]+data[k+1]+data[k+2])/765;};for(let y=0;y<n;y++)for(let x=0;x<n;x++){const dx=(h(x-1,y)-h(x+1,y))*1.1,dy=(h(x,y+1)-h(x,y-1))*1.1,z=1/Math.hypot(dx,dy,1),i=(y*n+x)*4;out.data.set([(dx*z*.5+.5)*255,(dy*z*.5+.5)*255,(z*.5+.5)*255,255],i);}ctx.putImageData(out,0,0);const normal=new T.CanvasTexture(c);normal.wrapS=normal.wrapT=T.RepeatWrapping;normal.repeat.copy(map.repeat);normal.center.copy(map.center);normal.rotation=map.rotation;textures.push(normal);return normal;};
 const normals=new Map<T.Texture,T.Texture>();
 const windTime={value:0};
 const m=(color:T.ColorRepresentation,map?:T.Texture,roughness=.9)=>{if(map&&!normals.has(map))normals.set(map,normalFrom(map));return new T.MeshStandardMaterial({color,...(map?{map,normalMap:normals.get(map)}:{}),normalScale:new T.Vector2(.7,.7),roughness});};
 const leafSolid=new T.MeshStandardMaterial({color:'#a5b778',side:T.DoubleSide,roughness:.86,emissive:'#3e5427',emissiveIntensity:.12});
 leafSolid.onBeforeCompile=shader=>{shader.uniforms.uWindTime=windTime;shader.vertexShader='uniform float uWindTime;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 #ifdef USE_INSTANCING
 vec3 origin=instanceMatrix[3].xyz;transformed.x+=sin(uWindTime*.75+origin.x*1.7+origin.z)*.035;transformed.z+=cos(uWindTime*.6+origin.y)*.02;
 #endif
 `);};
 return {random,textures,windTime,bark:m('#a59b80',bark),brick:m('#b4beb5',brick),timber:m('#cbb393',wood),lightWood:m('#e2ceb0',wood),darkWood:m('#817365',wood),stone:m('#e0e1d7',stone),darkStone:m('#939e94',stone),wall:m('#fff8e9',plaster),roof:m('#4e6260',stone),roofLight:m('#718079',stone),earth:m('#c6b792',earth),path:m('#d1bf99',stone),moss:m('#64794a',stone),iron:new T.MeshStandardMaterial({color:'#454b47',metalness:.72,roughness:.45}),cloth:m('#dbccb0',linen),ceramic:m('#87745b',undefined,.42),rope:m('#c8b080',wood),leafSolid,leaf:new T.MeshStandardMaterial({color:'#a0b57b',map:leaves,alphaTest:.5,side:T.DoubleSide,roughness:1}),water:new T.MeshPhysicalMaterial({color:'#698c85',roughness:.43,metalness:.05,clearcoat:.45,clearcoatRoughness:.4})};
}
