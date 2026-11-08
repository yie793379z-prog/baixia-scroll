import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {cargoBalance,cargoWeights,gateRoute,placeCargo,safeWaterPosition,validGateStep} from './rules';
import {specs,type GameId} from './specs';
import {createV4Presentation} from './presentation';

export type Phase='loading'|'intro'|'inspect'|'traverse'|'loading-cargo'|'sailing'|'completed'|'knowledge'|'error'|'exiting';
export interface GameView {phase:Phase;notice:string;step:number;failures:number;slots:(number|null)[];balance:number;heading:number;loadMs:number;}
export interface Diagnostic {kind:GameId;loadMs:number;frames:number;p95Ms:number;durationMs:number;geometries:number;textures:number;drawCalls:number;triangles:number;disposed?:boolean;}
declare global {interface Window {__v4Diagnostics?:Diagnostic[];}}
function disposeObject(root:T.Object3D){
 const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();
 root.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Sprite){if(o instanceof T.Mesh)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const value of Object.values(m))if(value instanceof T.Texture)textures.add(value);}}});
 textures.forEach(t=>{t.dispose();const image=t.source.data;if(typeof ImageBitmap!=='undefined'&&image instanceof ImageBitmap)image.close();});materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());
}
function label(text:string,color='#584936'){
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d')!;
 ctx.fillStyle='#f5e7c6';ctx.beginPath();ctx.arc(64,64,44,0,Math.PI*2);ctx.fill();ctx.lineWidth=3;ctx.strokeStyle=color;ctx.stroke();ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='46px serif';ctx.fillText(text,64,66);
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;const sprite=new T.Sprite(new T.SpriteMaterial({map:tex,depthTest:true}));sprite.scale.set(.8,.8,.8);
 const raycast=sprite.raycast.bind(sprite);sprite.raycast=(ray,hits)=>{const found:T.Intersection[]=[];raycast(ray,found);hits.push(...found.filter(h=>h.uv&&(h.uv.x-.5)**2+(h.uv.y-.5)**2<.12));};return sprite;
}
export class V4Engine {
 private presentation:ReturnType<typeof createV4Presentation>;
 private renderer:T.WebGLRenderer;private scene=new T.Scene();private camera=new T.PerspectiveCamera(36,1,.1,160);private controls:OrbitControls;
 private root:T.Group|null=null;private disposed=false;private raf=0;private abort=new AbortController();private resize:ResizeObserver;
 private last=0;private started=performance.now();private renderedAt=0;private intervals:number[]=[];private stamp=0;private introAt=0;
 private ray=new T.Raycaster();private pointer=new T.Vector2();private down:{x:number;y:number;id:number}|null=null;private keys=new Set<string>();
 private nodes:T.Object3D[]=[];private pickups:T.Object3D[]=[];private slotMeshes:T.Mesh[]=[];private walking:{from:T.Vector3;to:T.Vector3;progress:number}|null=null;
 private view:GameView={phase:'loading',notice:'正在展开纸上城郭…',step:0,failures:0,slots:Array(6).fill(null),balance:0,heading:0,loadMs:0};
 private cargoDrag:{index:number;parent:T.Object3D;position:T.Vector3}|null=null;private propulsion=0;private boatHeading=0;private checkpoint=new T.Vector3(0,0,6.5);private gateFlash=0;
 private oarDrag:{y:number;id:number}|null=null;private paused=false;private callbacks:(view:GameView)=>void;
 constructor(private host:HTMLDivElement,readonly kind:GameId,onView:(view:GameView)=>void){
  this.callbacks=onView;this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  this.presentation=createV4Presentation(this.scene,this.renderer,this.camera);
  this.renderer.domElement.setAttribute('aria-label',kind==='gate'?'三维城门：拖动观察，点击相邻路标行走':'三维水门：拖货装船，摇桨行舟');this.renderer.domElement.tabIndex=0;host.appendChild(this.renderer.domElement);
  this.camera.position.set(kind==='gate'?16:16,kind==='gate'?21:19,kind==='gate'?25:26);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,1.6,0);this.controls.enablePan=false;this.controls.enableZoom=false;this.controls.enableDamping=true;this.controls.dampingFactor=.09;this.controls.rotateSpeed=.55;this.controls.minPolarAngle=.3;this.controls.maxPolarAngle=1.15;this.controls.minAzimuthAngle=-.1;this.controls.maxAzimuthAngle=1.15;this.controls.enabled=false;this.controls.update();
  this.resize=new ResizeObserver(()=>this.resizeView());this.resize.observe(host);this.resizeView();
  const c=this.renderer.domElement;c.addEventListener('pointerdown',this.pointerDown);c.addEventListener('pointermove',this.pointerMove);c.addEventListener('pointerup',this.pointerUp);c.addEventListener('pointercancel',this.pointerCancel);c.addEventListener('lostpointercapture',this.pointerCancel);c.addEventListener('contextmenu',this.context);c.addEventListener('webglcontextlost',this.contextLost);window.addEventListener('keydown',this.keyDown);window.addEventListener('keyup',this.keyUp);window.addEventListener('blur',this.blur);document.addEventListener('visibilitychange',this.visibility);
  this.emit();this.raf=requestAnimationFrame(this.frame);void this.load();
 }
 private resizeView(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.camera.aspect=w/h;this.camera.fov=T.MathUtils.radToDeg(2*Math.atan(Math.tan(T.MathUtils.degToRad(36)/2)*Math.max(1,1.3/this.camera.aspect)));this.camera.updateProjectionMatrix();this.presentation.resize(w,h);}
 private emit(){if(!this.disposed)this.callbacks({...this.view,slots:[...this.view.slots]});}
 private async load(){
  const timer=setTimeout(()=>this.abort.abort(),15000);let loaded:T.Group|undefined;
  try{
   const response=await fetch(specs[this.kind].asset,{signal:this.abort.signal});if(!response.ok)throw new Error('asset');
   const data=await response.arrayBuffer();if(this.disposed)return;
   const gltf=await new GLTFLoader().parseAsync(data,location.origin+'/models/');loaded=gltf.scene;
   if(this.disposed){disposeObject(loaded);return;}
   if(specs[this.kind].required.some(name=>!loaded!.getObjectByName(name)))throw new Error('nodes');
   loaded.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;for(const m of Array.isArray(o.material)?o.material:[o.material]){m.side=T.DoubleSide;if(m instanceof T.MeshStandardMaterial&&m.map)m.map.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());}}});
   this.root=loaded;this.scene.add(loaded);this.presentation.attach(loaded,this.kind);this.view.loadMs=performance.now()-this.started;
   if(this.kind==='gate')this.setupGate();else this.setupBoat();
   this.view.phase='intro';this.introAt=performance.now();this.view.notice=this.kind==='gate'?'见微：先认门洞，再循路而行。':'船家：六件货，放稳了再走。';this.emit();
  }catch(error){if(loaded&&loaded!==this.root)disposeObject(loaded);if(!this.disposed){this.view.phase='error';this.view.notice=error instanceof Error&&error.message==='nodes'?'这份模型缺少必要部件，请返回后重新展开。':this.abort.signal.aborted?'加载较久，可以返回画卷稍后再试。':'三维场景暂时未能展开。原画仍可查看，随时返回。';this.emit();}}
  finally{clearTimeout(timer);}
 }
 private setupGate(){
  gateRoute.forEach(([x,z],i)=>{const group=new T.Group();group.name='route_'+i;group.position.set(x,.13,z);group.userData.route=i;
   const ring=new T.Mesh(new T.TorusGeometry(.4,.045,6,28),new T.MeshStandardMaterial({color:i===0?'#64765b':'#b68a4c',roughness:1}));ring.rotation.x=Math.PI/2;group.add(ring);const l=label(i===0?'起':String(i));l.position.y=.65;group.add(l);this.scene.add(group);this.nodes.push(group);});
 }
 private setupBoat(){
  for(let i=0;i<6;i++)this.pickups.push(this.root!.getObjectByName(`BOAT_cargo_${String(i+1).padStart(2,'0')}`)!);
  const hull=this.root!.getObjectByName('BOAT_hull')!;
  for(let i=0;i<6;i++){const slot=new T.Mesh(new T.BoxGeometry(.73,.025,.78),new T.MeshStandardMaterial({color:i<3?'#7c9e99':'#d1aa68',transparent:true,opacity:.7,roughness:1}));slot.position.copy(this.slotPosition(i));slot.userData.slot=i;hull.add(slot);this.slotMeshes.push(slot);}
  [-3,1,7.8].forEach((y,i)=>{const ring=new T.Mesh(new T.TorusGeometry(.55,.035,5,32),new T.MeshBasicMaterial({color:'#9d6b3e',transparent:true,opacity:.75}));ring.rotation.x=Math.PI/2;ring.position.set(0,.02,-y);ring.name='water_'+i;this.scene.add(ring);this.nodes.push(ring);});
  this.pickups.forEach((o,i)=>{const l=label(String(cargoWeights[i]));l.position.y=1.2;o.add(l);});
 }
 private slotPosition(i:number){return new T.Vector3(i<3?-.43:.43,.49,-1.5+(i%3)*.85);}
 private hit(e:PointerEvent,objects:T.Object3D[]){const r=this.renderer.domElement.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);return this.ray.intersectObjects(objects,true);}
 private planePoint(e:PointerEvent){this.hit(e,[]);const p=new T.Vector3();return this.ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-.65),p);}
 private pointerDown=(e:PointerEvent)=>{
  if(this.paused||e.button!==0||!['inspect','loading-cargo','sailing'].includes(this.view.phase))return;
  e.preventDefault();this.renderer.domElement.focus({preventScroll:true});this.down={x:e.clientX,y:e.clientY,id:e.pointerId};
  if(this.kind==='boat'&&this.view.phase==='loading-cargo'){
   const hits=this.hit(e,this.pickups);if(hits.length){let o:T.Object3D|null=hits[0].object;while(o&&!this.pickups.includes(o))o=o.parent;if(o){const index=this.pickups.indexOf(o);this.cargoDrag={index,parent:o.parent!,position:o.position.clone()};this.host.dataset.dragging=String(index);this.scene.attach(o);this.renderer.domElement.setPointerCapture(e.pointerId);this.view.notice=`拿起配重 ${cargoWeights[index]} 的货物。放到空格，或与已装货物交换。`;this.emit();}}
  }else if(this.kind==='boat'&&this.view.phase==='sailing'&&this.hit(e,[this.root!.getObjectByName('BOAT_oars')!]).length){this.oarDrag={y:e.clientY,id:e.pointerId};this.renderer.domElement.setPointerCapture(e.pointerId);}
 };
 private pointerMove=(e:PointerEvent)=>{
  if(this.cargoDrag){const p=this.planePoint(e);if(p){p.y=1;this.pickups[this.cargoDrag.index].position.copy(p);}}
  if(this.oarDrag&&this.oarDrag.id===e.pointerId){this.stroke(Math.abs(e.clientY-this.oarDrag.y));this.oarDrag.y=e.clientY;}
 };
 private pointerUp=(e:PointerEvent)=>{
  const d=this.down;this.down=null;
  if(this.cargoDrag){this.dropCargo(e);return;}this.oarDrag=null;
  if(!d||Math.hypot(e.clientX-d.x,e.clientY-d.y)>7||this.kind!=='gate'||this.view.phase!=='inspect'||this.paused)return;
  const hits=this.hit(e,[...this.nodes,...(this.root?[this.root]:[])]);if(!hits.length)return;
  let o:T.Object3D|null=hits[0].object;while(o&&o.userData.route===undefined)o=o.parent;
  if(o)this.walk(Number(o.userData.route));else this.fail('此处是墙体或屋舍。找一段与门洞相接的道路。');
 };
 private dropCargo(e:PointerEvent){
  const drag=this.cargoDrag!;this.cargoDrag=null;delete this.host.dataset.dragging;const cargo=this.pickups[drag.index],p=this.planePoint(e),hull=this.root!.getObjectByName('BOAT_hull')!;
  const local=p?hull.worldToLocal(p.clone()):null;
  let slot=-1;if(local&&Math.abs(local.x)<1.35&&local.z>-2.3&&local.z<1){const side=local.x<0?0:3;slot=side+Math.min(2,Math.max(0,Math.round((local.z+1.5)/.85)));}
  const next=slot>=0?placeCargo(this.view.slots,drag.index,slot):null;
  if(next){next.forEach((index,i)=>{if(index!==null){const item=this.pickups[index];hull.add(item);item.position.copy(this.slotPosition(i));item.position.y=.52;item.rotation.set(0,0,0);}});this.view.slots=next;const b=cargoBalance(next);this.view.balance=b.ratio;this.view.notice=b.loaded===6?(b.ratio<=.2?'货已放稳。握桨出航吧。':'船身偏了。拖动两件已装货物交换位置，再试出航。'):`已装 ${b.loaded} / 6 件。青格是左舷，赭格是右舷。`;this.emit();}
  else {drag.parent.add(cargo);cargo.position.copy(drag.position);this.fail(slot<0?'把货拖到船舱里的彩色空格。':'这格已有货物，换一个空格。');}
 };
 private pointerCancel=()=>{if(this.cargoDrag){const d=this.cargoDrag,o=this.pickups[d.index];d.parent.add(o);o.position.copy(d.position);this.cargoDrag=null;}delete this.host.dataset.dragging;this.down=null;this.oarDrag=null;};
 private context=(e:Event)=>e.preventDefault();
 private visibility=()=>{this.blur();this.updateLoop();};
 private updateLoop(){cancelAnimationFrame(this.raf);this.last=0;this.renderedAt=0;this.host.dataset.renderPaused=String(this.paused||document.hidden);if(!this.disposed&&!this.paused&&!document.hidden)this.raf=requestAnimationFrame(this.frame);}
 resetView(){if(this.kind!=='gate')return;this.camera.position.set(16,21,25);this.controls.target.set(0,1.6,0);this.controls.update();}
 steer(direction:'ArrowLeft'|'ArrowRight',held:boolean){if(held&&!this.paused)this.keys.add(direction);else this.keys.delete(direction);}
 private contextLost=(e:Event)=>{e.preventDefault();if(this.disposed)return;this.view.phase='error';this.view.notice='图形显示已中断，请返回画卷重新展开。';this.emit();};
 private keyDown=(e:KeyboardEvent)=>{if(this.paused||!this.root||(e.target as HTMLElement).closest('input,textarea,select')||((e.target as HTMLElement).closest('button')&&!(e.target as HTMLElement).closest('.v4-oar-handle,.v4-steer')))return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)){e.preventDefault();this.keys.add(e.key);}};
 private keyUp=(e:KeyboardEvent)=>this.keys.delete(e.key);private blur=()=>{this.keys.clear();this.pointerCancel();};
 private fail(notice:string){this.view.failures++;this.view.notice=notice+(this.kind==='gate'&&this.view.failures>=3?' 留意编号相邻的路标。':'');this.gateFlash=.6;this.emit();}
 private walk(index:number){if(!validGateStep(this.view.step,index)){this.fail('这段路还接不上。先走到相邻的路标，再向门洞前行。');return;}const p=this.root!.getObjectByName('GATE_player_marker')!;const [x,z]=gateRoute[index];this.walking={from:p.position.clone(),to:new T.Vector3(x,.12,z),progress:0};this.view.phase='traverse';this.view.notice='见微循着铺地向前走。';this.controls.enabled=false;this.emit();}
 launch(){if(this.view.phase!=='loading-cargo')return;const b=cargoBalance(this.view.slots);if(b.loaded!==6){this.fail('岸边还有货。六件都装上，再看看平衡。');return;}if(b.ratio>.2){this.fail('船身偏了。先调整左右配重，稳了再行。');return;}this.view.phase='sailing';this.view.notice='按 ← → 调整船头；握住桨柄上下拖动，或按住 ↑ 划行。';this.controls.enabled=false;this.renderer.domElement.focus({preventScroll:true});this.emit();}
 stroke(distance:number){if(this.view.phase==='sailing'&&!this.paused)this.propulsion=Math.min(1.8,this.propulsion+Math.min(35,distance)*.018);}
 pause(value:boolean){this.paused=value;this.keys.clear();this.pointerCancel();this.controls.enabled=!value&&this.kind==='gate'&&this.view.phase==='inspect';this.updateLoop();}
 private frame=(time:number)=>{
  if(this.disposed)return;this.raf=requestAnimationFrame(this.frame);const dt=Math.min(.05,this.last?(time-this.last)/1000:0);this.last=time;
  if(this.renderedAt&&document.visibilityState==='visible')this.intervals.push(time-this.renderedAt);this.renderedAt=time;if(this.intervals.length>18000)this.intervals.shift();
  if(this.root&&!this.paused){
   if(this.view.phase==='intro'&&time-this.introAt>1100){this.view.phase=this.kind==='gate'?'inspect':'loading-cargo';this.view.notice=this.kind==='gate'?'拖动看一看城门，再点相邻的路标。':'拖动岸边六件货物，放进船舱左右空格。数字是游戏配重。';this.controls.enabled=this.kind==='gate';this.emit();}
   if(this.kind==='gate')this.updateGate(dt,time);else this.updateBoat(dt,time);
  }
  this.controls.update();this.presentation.render(time,matchMedia("(prefers-reduced-motion: reduce)").matches);
  if(time-this.stamp>250){this.stamp=time;this.expose();}
 };
 private updateGate(dt:number,time:number){
  if(this.walking){const w=this.walking,p=this.root!.getObjectByName('GATE_player_marker')!,distance=w.from.distanceTo(w.to);w.progress=Math.min(1,w.progress+dt*1.8/distance);p.position.lerpVectors(w.from,w.to,w.progress);p.rotation.y=Math.atan2(w.to.x-w.from.x,w.to.z-w.from.z)+Math.PI;
   ['L','R'].forEach((side,i)=>{const limb=p.getObjectByName('JW_leg_'+side),arm=p.getObjectByName('JW_arm_'+side);if(limb)limb.rotation.x=Math.sin(time*.012+i*Math.PI)*.28;if(arm)arm.rotation.x=Math.sin(time*.012+i*Math.PI)*.3;});p.position.y=.12+Math.abs(Math.sin(time*.012))*.04;
   if(w.progress===1){this.walking=null;this.view.step++;this.view.phase=this.view.step===gateRoute.length-1?'completed':'inspect';this.view.notice=this.view.phase==='completed'?'门道找到了。回画中认一认这个入口。':'路已接上，继续往门洞走。';this.controls.enabled=this.view.phase==='inspect';this.emit();}
  }
  this.nodes.forEach((node,i)=>{const ring=node.children[0] as T.Mesh;const mat=ring.material as T.MeshStandardMaterial;mat.color.set(i<=this.view.step?'#62795f':this.gateFlash>0?'#ab5840':'#b68a4c');});this.gateFlash=Math.max(0,this.gateFlash-dt);
 }
 private updateBoat(dt:number,time:number){
  const hull=this.root!.getObjectByName('BOAT_hull')!,oars=this.root!.getObjectByName('BOAT_oars')!;const b=cargoBalance(this.view.slots);const roll=(b.left-b.right)/(b.left+b.right||1)*.14;
  if(this.view.phase==='loading-cargo'){this.camera.position.lerp(new T.Vector3(10,12,18),dt*1.8);this.controls.target.lerp(new T.Vector3(2,.8,3.5),dt*1.8);}
  else if(this.view.phase==='sailing'){this.camera.position.lerp(new T.Vector3(16,19,26),dt*1.8);this.controls.target.lerp(new T.Vector3(0,1.6,0),dt*1.8);}
  hull.rotation.z=T.MathUtils.lerp(hull.rotation.z,roll,dt*4);hull.position.y=Math.sin(time*.0016)*.018;
  if(this.view.phase!=='sailing')return;
  if(this.keys.has('ArrowLeft'))this.boatHeading+=dt*.65;if(this.keys.has('ArrowRight'))this.boatHeading-=dt*.65;
  if(this.keys.has('ArrowUp')||this.keys.has(' '))this.propulsion=Math.min(1.8,this.propulsion+dt*2.4);
  this.propulsion=Math.max(0,this.propulsion-dt*.45);const speed=this.propulsion*1.5;
  hull.position.x-=Math.sin(this.boatHeading)*speed*dt;hull.position.z-=Math.cos(this.boatHeading)*speed*dt;hull.rotation.y=this.boatHeading;oars.rotation.y=Math.sin(time*.007)*Math.min(.23,this.propulsion*.16);
  if(!safeWaterPosition(hull.position.x,hull.position.z)){hull.position.copy(this.checkpoint);this.boatHeading=0;hull.rotation.y=0;this.propulsion=0;this.fail('这里通道狭窄。已停回上一处水标；把船头摆正再行。');}
  const target=this.nodes[this.view.step];if(target&&hull.position.distanceTo(new T.Vector3(target.position.x,0,target.position.z))<1){this.view.step++;this.checkpoint.copy(hull.position);(target as T.Mesh).visible=false;this.view.notice=this.view.step===3?'稳稳来到水门里。回画中看看有篷船。':`已过第 ${this.view.step} 处水标。${this.view.step===2?'正对门洞，放慢划桨。':'沿开阔水面继续前行。'}`;if(this.view.step===3){this.view.phase='completed';this.propulsion=0;}this.emit();}
  this.view.heading=this.boatHeading;
 }
 private screen(p:T.Vector3){const q=p.clone().project(this.camera);return {x:(q.x+1)/2*this.host.clientWidth,y:(1-q.y)/2*this.host.clientHeight};}
 private expose(){
  const hull=this.root?.getObjectByName('BOAT_hull');this.host.dataset.points=JSON.stringify({nodes:this.nodes.map(o=>this.screen(o.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,this.kind==='gate'?.65:0,0)))),cargo:this.pickups.map(o=>this.screen(o.children.find(c=>c instanceof T.Sprite)!.getWorldPosition(new T.Vector3()))),slots:hull?this.slotMeshes.map(o=>this.screen(o.getWorldPosition(new T.Vector3()))):[],boat:hull?{x:hull.position.x,z:hull.position.z,heading:this.boatHeading}:null});
  const anchors=this.kind==='gate'?[[1.4,2,0],[-5,4.7,1.15],[7.4,5,0]]:[[0,2.4,-6],[0,.6,6.5],[5.1,.6,-6]];
  this.host.dataset.anchors=JSON.stringify(anchors.map(p=>this.screen(new T.Vector3(...p))));this.host.dataset.slots=JSON.stringify(this.view.slots);this.host.dataset.metrics=JSON.stringify(this.metrics());this.host.dataset.phase=this.view.phase;
 }
 metrics():Diagnostic{const sorted=[...this.intervals].sort((a,b)=>a-b);return {kind:this.kind,loadMs:Math.round(this.view.loadMs),frames:sorted.length,p95Ms:Math.round((sorted[Math.floor(sorted.length*.95)]??0)*100)/100,durationMs:Math.round(performance.now()-this.started),geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures,drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles};}
 dispose(){if(this.disposed)return;const diagnostic={...this.metrics(),disposed:true};this.disposed=true;this.abort.abort();cancelAnimationFrame(this.raf);this.resize.disconnect();this.controls.dispose();this.blur();
  const c=this.renderer.domElement;c.removeEventListener('pointerdown',this.pointerDown);c.removeEventListener('pointermove',this.pointerMove);c.removeEventListener('pointerup',this.pointerUp);c.removeEventListener('pointercancel',this.pointerCancel);c.removeEventListener('lostpointercapture',this.pointerCancel);c.removeEventListener('contextmenu',this.context);c.removeEventListener('webglcontextlost',this.contextLost);window.removeEventListener('keydown',this.keyDown);window.removeEventListener('keyup',this.keyUp);window.removeEventListener('blur',this.blur);document.removeEventListener('visibilitychange',this.visibility);
  this.presentation.dispose();disposeObject(this.scene);this.renderer.renderLists.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();window.__v4Diagnostics=[...(window.__v4Diagnostics??[]).slice(-19),diagnostic];
 }
}
