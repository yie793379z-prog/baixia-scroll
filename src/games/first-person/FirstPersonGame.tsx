import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import type { SceneDefinition } from '../../scenes/types';
import { cargoBalance, cargoReady, initialWell, placeCargo, stepWell, type CargoSlots } from '../core/rules';
import { createWorld, disposeWorld, cartObstacles, type WorldKind } from './world';
import {departCargoBoat,CARGO_DEPARTURE_SECONDS} from './departure';
import {createRendering} from '../visuals/rendering';
import './first-person.css';
import {canWalkCourtyard} from './courtyard';
import {createWellInteraction} from './wellInteraction';
import {wellCastPose,WELL_FILL_TIME,WELL_RELEASE_TIME,WELL_IMPACT_TIME} from '../core/wellMotion';
import {loadHeroAssets} from './heroAssets';
interface Props {scene:SceneDefinition;kind:WorldKind;onEnd:(success:boolean,message:string)=>void;reducedMotion:boolean}
interface Hud {hint:string;progress:string;detail:string;action:string;carrying:string}
export function FirstPersonGame({scene,kind,onEnd,reducedMotion}:Props){
 const host=useRef<HTMLDivElement>(null),keys=useRef(new Set<string>()),action=useRef<()=>void>(()=>{}),end=useRef(onEnd);end.current=onEnd;
 const [hud,setHud]=useState<Hud>({hint:'走近画里的日常，亲自动手。',progress:'',detail:'',action:'伸手 · E',carrying:''}),[error,setError]=useState(false),[compact,setCompact]=useState(false);
 useEffect(()=>{
  const node=host.current!;let renderer:T.WebGLRenderer;try{renderer=new T.WebGLRenderer({antialias:true,alpha:false});}catch{setError(true);return;}
  node.appendChild(renderer.domElement);
  const world=createWorld(kind),{camera}=world,pipeline=createRendering(renderer,world.scene,camera);
  const wellVisuals=kind==='well'?createWellInteraction(world):null;let castTime:number|null=null,wellMotion:ReturnType<ReturnType<typeof createWellInteraction>['update']>|null=null;
  let approach:{radius:number;angle:number;yaw:number;pitch:number;duration:number}|null=null;
  const smooth=(v:number)=>{v=T.MathUtils.clamp(v,0,1);return v*v*(3-2*v);};
  pipeline.setQuality('fine');node.dataset.visualQuality='fine';
  renderer.info.autoReset=false;
  const cancelAssets=loadHeroAssets(kind,world,state=>{node.dataset.heroAsset=state;if(state==='ready')renderer.shadowMap.needsUpdate=true;});
  let nextFrame=0;const frameWindow:number[]=[];node.dataset.frameLimit="60";
  let disposed=false,finished=false,raf=0,last=performance.now(),lastHud=0,yaw=kind==='well'?.42:0,pitch=kind==='well'?-.07:-.12,drag=false,dragPoint:{x:number;y:number}|null=null,grabY:number|null=null,pull=0,wellStarted=false,well=initialWell(),checkpoint=0,carrying:number|null=null,slots:CargoSlots=[null,null,null],launch=0,cartSpeed=0,cartHeading=0,stability=1,hint='';
  const position=world.spawn.clone();
  const active=+(document.documentElement.dataset.activeFpsRenderers??0)+1;document.documentElement.dataset.activeFpsRenderers=String(active);
  const near=(x:number,z:number,d=2.4)=>Math.hypot(position.x-x,position.z-z)<d;
  const finish=(ok:boolean,message:string)=>{if(finished)return;finished=true;keys.current.clear();end.current(ok,message);};
  const doAction=()=>{
   if(finished||document.hidden)return;
   if(kind==='well'){if(!near(0,-2,2.9)){hint='走到井边，再放桶。';return;}if(!wellStarted){wellStarted=true;const radius=Math.hypot(position.x,position.z+2),angle=Math.atan2(position.x,position.z+2);const duration=Math.max(.35,Math.min(2.2,(Math.abs(radius-1.65)+Math.abs(angle)*1.65)/2.4));approach={radius,angle,yaw,pitch,duration};castTime=-duration;pull=0;keys.current.delete(' ');hint='伸手送桶，松开桶柄，让桶落入井水。';}else{pull=0;keys.current.delete(' ');hint='先松手，让桶稳一稳。';}}
   if(kind==='cargo'){
    if(launch)return;
    const slot=[-2,0,2].map((x,i)=>({i,d:Math.hypot(position.x-x,position.z+1.3)})).sort((a,b)=>a.d-b.d)[0];
    if(carrying!==null){if(slot.d<2.6&&slots[slot.i]===null){slots=placeCargo(slots,carrying,slot.i);world.crates[carrying].position.set([-2,0,2][slot.i],.75,-2.5);carrying=null;hint=cargoReady(slots)?'三件货物稳了。再按 E，将船送离岸边。':'重包放中间，前后尽量相抵。';}else hint='靠近空船舱再放下；用 A / D 走到前、中、后舱。';return;}
    if(near(0,-1.3,4)&&cargoReady(slots)){launch=0.01;hint='船头转向水门，稳稳离岸。';return;}
    const closest=world.crates.map((c,id)=>({id,d:Math.hypot(position.x-c.position.x,position.z-c.position.z)})).sort((a,b)=>a.d-b.d)[0];if(closest.d<2.7){carrying=closest.id;slots=slots.map(x=>x===carrying?null:x);hint=`拿起了${3-carrying}号包裹。走到空舱，按 E 放下。`;}else hint='走近地面的包裹，按 E 拿起。';
   }
  };action.current=doAction;
  const lookBy=(dx:number,dy:number)=>{yaw-=dx*.0026;pitch=T.MathUtils.clamp(pitch-dy*.0026,-1.15,.7);};
  const pointerMove=(e:globalThis.PointerEvent)=>{if(finished||document.hidden)return;if(grabY!==null&&kind==='well'){pull=T.MathUtils.clamp((grabY-e.clientY)/150,0,1);return;}if(drag&&dragPoint){lookBy(e.clientX-dragPoint.x,e.clientY-dragPoint.y);dragPoint={x:e.clientX,y:e.clientY};}};
  const wheelLook=(e:WheelEvent)=>{
   e.preventDefault();e.stopPropagation();
   if(finished||document.hidden||e.ctrlKey||e.metaKey||(castTime!==null&&castTime<WELL_FILL_TIME))return;
   // macOS and Windows touchpads both emit wheel deltas; honor the system scroll direction.
   // Normalize non-pixel devices and limit a single burst without amplifying fine movement.
   const unit=e.deltaMode===WheelEvent.DOM_DELTA_LINE?16:e.deltaMode===WheelEvent.DOM_DELTA_PAGE?node.clientHeight:1;
   const dx=T.MathUtils.clamp(e.deltaX*unit,-120,120),dy=T.MathUtils.clamp(e.deltaY*unit,-120,120);
   if(!dx&&!dy)return;
   node.focus({preventScroll:true});lookBy(-dx,-dy);
  };
  const down=(e:globalThis.PointerEvent)=>{if(finished||document.hidden||e.button!==0)return;node.focus({preventScroll:true});dragPoint={x:e.clientX,y:e.clientY};if(kind==='well'&&wellStarted&&near(0,-2,2.9)){grabY=e.clientY;}else{drag=true;}node.setPointerCapture(e.pointerId);e.preventDefault();};
  const up=()=>{drag=false;dragPoint=null;grabY=null;pull=0;};
  const resetPosition=()=>{if(castTime!==null&&castTime<WELL_FILL_TIME)return;position.copy(world.spawn);yaw=kind==='well'?.42:0;cartHeading=cartSpeed=0;keys.current.clear();pull=0;hint='回到起点，可以慢慢再来。';};
  const keyDown=(e:KeyboardEvent)=>{if(finished||document.hidden)return;if((e.target as HTMLElement).closest('input,textarea,select'))return;const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','e','r'].includes(k)){e.preventDefault();keys.current.add(k);}if(k==='e'&&!e.repeat)doAction();if(k==='r'&&!e.repeat)resetPosition();};
  const keyUp=(e:KeyboardEvent)=>keys.current.delete(e.key.toLowerCase());const blur=()=>{keys.current.clear();up();};
  const resume=()=>{cancelAnimationFrame(raf);last=performance.now();node.dataset.renderPaused=String(document.hidden);if(!disposed&&!finished&&!document.hidden)raf=requestAnimationFrame(tick);};
  const visibility=()=>{blur();resume();};
  const contextLost=(e:Event)=>{e.preventDefault();finished=true;blur();cancelAnimationFrame(raf);setError(true);};
  const contextMenu=(e:Event)=>e.preventDefault();
  node.addEventListener('pointerdown',down);node.addEventListener('pointerup',up);node.addEventListener('pointercancel',up);node.addEventListener('lostpointercapture',up);node.addEventListener('contextmenu',contextMenu);node.addEventListener('wheel',wheelLook,{passive:false});window.addEventListener('pointermove',pointerMove);window.addEventListener('keydown',keyDown,true);window.addEventListener('keyup',keyUp);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);renderer.domElement.addEventListener('webglcontextlost',contextLost);
  const resize=()=>{pipeline.resize(node.clientWidth,node.clientHeight);};const observer=new ResizeObserver(resize);observer.observe(node);resize();
  const tick=(now:number)=>{if(disposed||finished)return;
   // Keep 60 Hz motion without doubling all shadow/reflection work on 120/144 Hz displays.
   if(nextFrame===0||now-nextFrame>100)nextFrame=now;
   if(now+.75<nextFrame){raf=requestAnimationFrame(tick);return;}nextFrame+=1000/60;
   const frameMs=now-last,dt=Math.min(.04,frameMs/1000);last=now;frameWindow.push(frameMs);if(frameWindow.length>120)frameWindow.shift();const held=keys.current;
   let forward=Number(held.has('w')||held.has('arrowup'))-Number(held.has('s')||held.has('arrowdown')),side=Number(held.has('d'))-Number(held.has('a'));
   const casting=kind==='well'&&castTime!==null&&castTime<WELL_FILL_TIME;if(casting){forward=0;side=0;}
   if(kind==='cart'){
    const previousPosition=position.clone();const steer=side+Number(held.has('arrowright'))-Number(held.has('arrowleft'));cartSpeed+=(forward*3-cartSpeed)*dt*2;cartHeading-=steer*dt*.65*Math.min(1,Math.abs(cartSpeed)+.2);position.x-=Math.sin(cartHeading)*cartSpeed*dt;position.z-=Math.cos(cartHeading)*cartSpeed*dt;if(cartObstacles.some(o=>Math.hypot(position.x-o.x,position.z-o.z)<1.05)){position.copy(previousPosition);cartSpeed=0;hint='A / D 转向，绕过路石后继续慢行。';}const road=Math.sin((6-position.z)/9)*1.2;const off=Math.abs(position.x-road);if(off>2.1){cartSpeed*=.92;stability=Math.max(0,stability-dt*.12);hint='路边颠簸，松开 W，轻轻转回土路。';}else stability=Math.min(1,stability+dt*.06);position.x=T.MathUtils.clamp(position.x,-7,7);position.z=T.MathUtils.clamp(position.z,-30,10);world.cart.position.set(position.x,0,position.z-1.5);world.cart.rotation.y=cartHeading;world.cart.rotation.z=reducedMotion?0:Math.sin(now*.009)*Math.abs(cartSpeed)*.012*(off>1.6?3:1);world.wheels.forEach(w=>w.rotation.x-=cartSpeed*dt);if(checkpoint<4&&position.z<=-2-checkpoint*7&&off<2.2){world.beacons[checkpoint].visible=false;checkpoint++;}if(stability<.3)finish(false,'车轮偏离土路，货物颠得厉害。下一次放缓，在路中央转向。');if(checkpoint===4)finish(true,'木轮吱呀，货物稳当。你把满载的木车沿土路送到了终点。');
   }else{
    if(!casting)yaw+=(Number(held.has('arrowleft'))-Number(held.has('arrowright')))*dt*1.25;const speed=carrying!==null?1.9:2.8,normal=Math.max(1,Math.hypot(forward,side));forward/=normal;side/=normal;const nx=position.x+(side*Math.cos(yaw)-forward*Math.sin(yaw))*speed*dt,nz=position.z+(-forward*Math.cos(yaw)-side*Math.sin(yaw))*speed*dt;
    if(kind==='well'){if(world.scene.userData.courtyardReady){if(canWalkCourtyard(nx,position.z))position.x=nx;if(canWalkCourtyard(position.x,nz))position.z=nz;}else if(Math.hypot(nx,nz+2)>1.35&&Math.abs(nx)<8.3&&nz>-7.3&&nz<8.3){position.x=nx;position.z=nz;}}
    else if(kind==='cargo'){position.x=T.MathUtils.clamp(nx,-7.5,7.5);position.z=T.MathUtils.clamp(nz,-.8,9);}
    else {position.x=T.MathUtils.clamp(nx,-8,8);position.z=T.MathUtils.clamp(nz,-15,14);if(Math.abs(position.z)<4.5&&Math.abs(position.x)>1.65){position.x=T.MathUtils.clamp(position.x,-1.65,1.65);hint='踏稳桥板，沿桥中央过去。';}}
   }
   if(kind==='route'&&checkpoint<4){const mark=world.beacons[checkpoint];if(near(mark.position.x,mark.position.z,1.4)){mark.visible=false;checkpoint++;hint=['桥前停一停，看水路与陆路相接。','桥栏在身边，慢慢走过。','到了彼岸，继续朝树下走。',''][checkpoint-1];}if(checkpoint===4)finish(true,'你从桥前走到彼岸，再沿土路走到树下。脚下木板轻响，身旁一河流水。');}
   if(kind==='well'){
    if(castTime!==null){const wasFilling=castTime<WELL_FILL_TIME;castTime+=dt;if(wasFilling&&castTime>=WELL_FILL_TIME)hint='水桶已装满。按住空格缓提，或按住鼠标向上拖；到井沿后松开。';}const canLift=castTime!==null&&castTime>=WELL_FILL_TIME;const force=canLift&&near(0,-2,3)?(held.has(' ')? .64:pull):0;if(canLift)well=stepWell(well,force,dt);if(well.status==='success')finish(true,`你走到井边，将水桶稳稳提出，保住约${Math.round(well.water*100)}%的水。慢提轻放，把清水送到了井沿。`);if(well.status==='failure')finish(false,'提得太猛，水洒出了许多。放轻动作，接近井沿后松手。可以立刻重试。');
   }
   if(kind==='cargo'){
    world.crates.forEach((crate,id)=>crate.children.forEach(child=>{if(child instanceof T.Sprite)child.visible=id!==carrying;}));if(carrying!==null){world.crates[carrying].position.set(position.x-Math.sin(yaw)*.85,1.0,position.z-Math.cos(yaw)*.85);world.crates[carrying].rotation.y=yaw;}
    const wave=world.sampleWater(world.boat.position.x,world.boat.position.z),boatYaw=world.boat.rotation.y;
    world.boat.position.y=wave.height*.72;
    world.boat.rotation.z=-cargoBalance(slots)*.18+Math.atan(wave.dx*Math.cos(boatYaw)-wave.dz*Math.sin(boatYaw))*.38;
    world.boat.rotation.x=-Math.atan(wave.dx*Math.sin(boatYaw)+wave.dz*Math.cos(boatYaw))*.38;
    
    if(launch){launch+=dt;departCargoBoat(world.boat,world.crates,slots,launch);if(launch>CARGO_DEPARTURE_SECONDS)finish(true,'你把三件包裹亲手搬上船，调整前后载重，让船平稳离岸。船头划开水纹，今日这一趟装得稳稳当当。');}
    world.boat.updateMatrixWorld();slots.forEach((id,slot)=>{if(id!==null){const crate=world.crates[id];crate.position.set([-2,0,2][slot],.75,0).applyMatrix4(world.boat.matrixWorld);crate.quaternion.copy(world.boat.quaternion);}});
   }
   if(castTime!==null&&castTime<WELL_FILL_TIME&&approach){
    if(castTime<0){const t=smooth(1+castTime/approach.duration),r=T.MathUtils.lerp(approach.radius,1.65,t),a=approach.angle*(1-t);position.x=Math.sin(a)*r;position.z=-2+Math.cos(a)*r;yaw=T.MathUtils.lerp(approach.yaw,0,t);pitch=T.MathUtils.lerp(approach.pitch,-.38,t);}
    else {position.x=0;position.z=-.35;yaw=0;const aim=castTime<WELL_RELEASE_TIME?-.38:-.78;pitch+=(aim-pitch)*Math.min(1,dt*5);}
   }
   camera.position.copy(position);
   if(castTime!==null&&castTime>=0&&castTime<WELL_FILL_TIME){const pose=wellCastPose(castTime);camera.position.z-=.56*pose.send*(1-smooth((castTime-WELL_RELEASE_TIME-.08)/.64));}
   if(!reducedMotion&&Math.abs(forward)+Math.abs(side)>0&&kind!=='cart')camera.position.y+=Math.sin(now*.008)*.018;camera.rotation.set(pitch,yaw+(kind==='cart'?cartHeading:0),0,'YXZ');if(wellVisuals)wellMotion=wellVisuals.update(dt,castTime,well,near(0,-2,3.5),reducedMotion);world.update(now/1000,reducedMotion);renderer.info.reset();pipeline.render();
   if(now-lastHud>120){lastHud=now;node.dataset.playerX=position.x.toFixed(3);node.dataset.playerZ=position.z.toFixed(3);node.dataset.lookYaw=String(camera.rotation.y);node.dataset.lookPitch=String(camera.rotation.x);node.dataset.checkpoint=String(checkpoint);node.dataset.heading=String(cartHeading);node.dataset.stability=String(stability);node.dataset.loadedCargo=String(slots.filter(s=>s!==null).length);node.dataset.wellHeight=well.height.toFixed(3);if(wellMotion){node.dataset.wellPhase=wellMotion.phase;node.dataset.wellFill=wellMotion.fill.toFixed(3);node.dataset.waterRipple=wellMotion.ripple.toFixed(4);node.dataset.waterTilt=wellMotion.waterTilt.toFixed(4);node.dataset.wellArm=String(wellMotion.armVisible);node.dataset.humanHandReady=String(wellMotion.handReady);node.dataset.bucketY=world.bucket.position.y.toFixed(3);node.dataset.wellGrip=wellMotion.grip.toFixed(3);node.dataset.wellContactError=wellMotion.contactError.toFixed(4);node.dataset.wellReachError=wellMotion.reachError.toFixed(4);}if(kind==='cargo'){node.dataset.boatX=String(world.boat.position.x);node.dataset.boatZ=String(world.boat.position.z);node.dataset.boatYaw=String(world.boat.rotation.y);node.dataset.boatLaunch=String(launch);node.dataset.cargoPositions=JSON.stringify(world.crates.map(c=>({x:c.position.x,z:c.position.z,yaw:c.rotation.y})));}node.dataset.natureTime=world.nature.time.value.toFixed(3);node.dataset.windMeshes=String(world.nature.stats.windMeshes);node.dataset.waterSurfaces=String(world.nature.stats.waterSurfaces+(world.water.visible?1:0));node.dataset.drawCalls=String(renderer.info.render.calls);node.dataset.triangles=String(renderer.info.render.triangles);node.dataset.frameMs=frameMs.toFixed(1);node.dataset.frameP95=(frameWindow.slice().sort((a,b)=>a-b)[Math.min(frameWindow.length-1,Math.floor(frameWindow.length*.95))]??0).toFixed(1);const nextHud:Hud={hint:hint||({route:'穿过桥面，再到彼岸树下。',well:'走近井口，按 E 放桶。',cargo:'先找重包裹，放到船的中舱。',cart:'W 前行，A / D 缓缓转向；松手会减速。'}[kind]),progress:kind==='well'?(castTime===null?'水桶就位':castTime<WELL_FILL_TIME?(castTime<WELL_IMPACT_TIME?'伸手放桶':'井中装水'):`提起 ${Math.round(well.height*100)}% · 余水 ${Math.round(well.water*100)}%`):kind==='cargo'?`已装 ${slots.filter(s=>s!==null).length} / 3`: `路标 ${checkpoint} / 4`,detail:kind==='cart'?`货物稳定 ${Math.round(stability*100)}%`:kind==='well'?(well.height>.99?'松开手，等待水桶平稳。':'井边按住空格缓提；也可向上拖动提绳。'):kind==='cargo'?'3 号重包放中舱，1 与 2 分放两端。':'WASD 移动 · 鼠标拖动 / 双指滑动环顾',action:kind==='well'?(castTime!==null&&castTime<WELL_FILL_TIME?'放桶中…':wellStarted?'放缓 · E':'下桶 · E'):kind==='cargo'?(carrying!==null?'放下 · E':cargoReady(slots)?'送船离岸 · E':'拿起 · E'):'',carrying:carrying!==null?`手中：${3-carrying} 号包裹`:''};setHud(prev=>Object.keys(nextHud).every(k=>prev[k as keyof Hud]===nextHud[k as keyof Hud])?prev:nextHud);}
   raf=requestAnimationFrame(tick);
  };raf=requestAnimationFrame(tick);node.focus({preventScroll:true});
  return()=>{disposed=true;cancelAnimationFrame(raf);keys.current.clear();observer.disconnect();node.removeEventListener('pointerdown',down);node.removeEventListener('pointerup',up);node.removeEventListener('pointercancel',up);node.removeEventListener('lostpointercapture',up);node.removeEventListener('contextmenu',contextMenu);node.removeEventListener('wheel',wheelLook);window.removeEventListener('pointermove',pointerMove);window.removeEventListener('keydown',keyDown,true);window.removeEventListener('keyup',keyUp);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);renderer.domElement.removeEventListener('webglcontextlost',contextLost);cancelAssets();wellVisuals?.dispose();pipeline.dispose();disposeWorld(world);renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();document.documentElement.dataset.activeFpsRenderers=String(Math.max(0,+(document.documentElement.dataset.activeFpsRenderers??1)-1));action.current=()=>{};keys.current.clear();};
 },[kind,reducedMotion]);
 return <div className={`first-person-game ${compact?'compact-hints':''}`} data-fps-kind={kind} data-visual-quality="fine">
  <div ref={host} tabIndex={0} className="first-person-canvas" aria-label={`${scene.title}第一人称三维空间`}/>
  {error?<div className="fps-error">此浏览器暂不能启动 3D，请返回后重试，或使用支持 WebGL 的浏览器。</div>:<>
   <div className="fps-crosshair"/>
   <div className="fps-top"><span className="fps-world-label">{scene.title}</span><strong>{hud.progress}</strong></div>
   <button className="fps-hint-toggle" aria-pressed={!compact} onClick={()=>setCompact(v=>!v)}>{compact?'展开提示':'收起提示'}</button>
   <div className="fps-bottom">
    <div><p>{hud.hint}</p><small>{hud.detail}</small>{hud.carrying&&<b>{hud.carrying}</b>}</div>
    <div className="fps-actions">{hud.action&&<button disabled={kind==='well'&&hud.action==='放桶中…'} onClick={()=>action.current()}>{hud.action}</button>}{kind==='well'&&<button onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);keys.current.add(' ');}} onPointerUp={()=>keys.current.delete(' ')} onPointerCancel={()=>keys.current.delete(' ')}>按住缓提</button>}</div>
   </div>
   <div className="fps-keypad" aria-label="移动控制">{[['↑','w'],['←','a'],['↓','s'],['→','d']].map(([label,key])=><button key={key} aria-label={`移动 ${key.toUpperCase()}`} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);keys.current.add(key);}} onPointerUp={()=>keys.current.delete(key)} onPointerCancel={()=>keys.current.delete(key)}>{label}</button>)}</div>
   <span className="fps-help">WASD / 方向键 · 鼠标拖动 / 触控板双指滑动环顾 · R 回起点 · Esc 回卷</span>
  </>}
 </div>;
}
