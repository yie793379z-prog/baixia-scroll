import { Suspense, lazy, useCallback, useEffect, useReducer, useRef, useState, type ComponentType } from 'react';
import { artwork } from '../content/artwork';
import { culturalScenes } from '../content/scenes';
import type { ViewerHandle } from '../viewer/ScrollViewer';
const ScrollViewer=lazy(()=>import('../viewer/ScrollViewer').then(m=>({default:m.ScrollViewer})));
import { readingProgress, type Camera } from '../viewer/camera';
import { initialRole, parseRole, recordEntry, STORAGE_KEY, NOTEBOOK_VERSION, type RoleState } from '../roles/state';
import { sceneReducer, exploring } from '../scenes/machine';
import { canEnterScene, type ActivityProps, type ActivityChoice, type Mode, type SceneDefinition, type SceneSession } from '../scenes/types';
import { loadSceneModule } from '../scenes/registry';
import {prepareScene} from '../scenes/prepareScene';
import { Dialog } from '../ui/Dialog';
import {TravelTasks,TravelTalk} from '../ui/TravelTasks';
import type {PaintedCharacter} from '../content/characters';
import { ActivityBoundary } from '../scenes/ActivityBoundary';
import { reviewScenes, activeReviewScenes } from '../content/culture';
import {useBackgroundMusic} from '../sound/useBackgroundMusic';
import {MusicToggle} from '../sound/MusicControls';
import type { Theme } from '../scenes/types';
const Magnifier=lazy(()=>import('../viewer/Magnifier').then(m=>({default:m.Magnifier})));
const HandScroll=lazy(()=>import('../gestures/HandScroll').then(m=>({default:m.HandScroll})));
import { CinematicIntro } from '../cinematic/CinematicIntro';
import {INTRO_VERSION} from '../cinematic/opening';
import {discoverKnowledge,knowledgeCard} from '../content/knowledge';
import {knowledgeActivityTitles} from '../content/tasks';
import {ProjectLinks} from '../ui/ProjectLinks';
function loadRole(){try{return parseRole(localStorage.getItem(STORAGE_KEY));}catch{return initialRole();}}
export function App(){
  const music=useBackgroundMusic();
  const appElement=useRef<HTMLElement>(null),progressElement=useRef<HTMLDivElement>(null);
  const [systemReduced,setSystemReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{const m=window.matchMedia('(prefers-reduced-motion: reduce)');const change=()=>setSystemReduced(m.matches);m.addEventListener('change',change);return()=>m.removeEventListener('change',change);},[]);
  const [role,setRole]=useState<RoleState>(loadRole),roleRef=useRef(role);roleRef.current=role;
  useEffect(()=>{setRole(r=>r.notebookVersion===NOTEBOOK_VERSION?r:parseRole(JSON.stringify(r)));},[]);
  // Opening the site always starts with the film. Saved progress must never
  // dismiss it on a new visit; only entering during this visit does that.
  const [intro,setIntro]=useState(true);
  // Each arrival at the painting starts music; later manual pauses stay paused.
  useEffect(()=>{if(!intro)music.setEnabled(true);},[intro,music.setEnabled]);
  // An explicit replay requests the full film for this run only.
  const [introReplay,setIntroReplay]=useState(0);
  const [scene,dispatch]=useReducer(sceneReducer,exploring),sceneRef=useRef(scene);sceneRef.current=scene;
  const viewer=useRef<ViewerHandle>(null),[ready,setReady]=useState(false),[camera,setCamera]=useState<Camera|null>(null);
  const [panel,setPanel]=useState<'notebook'|'settings'|'tasks'|'talk'|null>(null);
  const [error,setError]=useState(''),[storageError,setStorageError]=useState(false),[reload,setReload]=useState(0);
  const [Activity,setActivity]=useState<ComponentType<ActivityProps>|null>(null),[activitySession,setActivitySession]=useState<SceneSession|null>(null),[moduleError,setModuleError]=useState('');
  const [character,setCharacter]=useState<PaintedCharacter|null>(null);
  const [magnifying,setMagnifying]=useState(false);
  const [handControl,setHandControl]=useState(false);
  const [reviewEnabled,setReviewEnabled]=useState(()=>new URLSearchParams(location.search).get('review')!=='0');
  const [theme,setTheme]=useState<Theme|null>(null);
  const locked=scene.phase!=='exploring', reduced=role.reducedMotion||systemReduced;
  const progress=readingProgress(camera?.center.x??artwork.width,artwork.width);
  const culturalEntries=role.notebookVersion===NOTEBOOK_VERSION?role.notebookEntries.filter(e=>!e.testFixture&&e.reflection?.trim()):[];
  const scenes=reviewEnabled?activeReviewScenes:culturalScenes;
  useEffect(()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(role));setStorageError(false);}catch{setStorageError(true);}},[role]);
  useEffect(()=>{const persist=()=>{const c=viewer.current?.snapshot();try{localStorage.setItem(STORAGE_KEY,JSON.stringify({...roleRef.current,currentScrollCamera:c??roleRef.current.currentScrollCamera}));}catch{/* Keep the in-memory session. */}};window.addEventListener('pagehide',persist);return()=>window.removeEventListener('pagehide',persist);},[]);
  const exit=useCallback(()=>{
    if(sceneRef.current.phase==='exploring')return;
    
    const c=viewer.current?.finishActivity();
    if(c){setCamera(c);setRole(r=>({...r,currentScrollCamera:c}));}
    dispatch({type:'EXIT'});
    requestAnimationFrame(()=>document.getElementById('scroll-viewer')?.focus({preventScroll:true}));
  },[]);
  const enter=useCallback((s:SceneDefinition,initialActivity?:ActivityChoice)=>{if(sceneRef.current.phase!=='exploring'||!ready||!canEnterScene(s,artwork,false,reviewEnabled))return;prepareScene(s);setPanel(null);dispatch({type:'ENTER',session:{scene:s,initialActivity}});},[ready,reviewEnabled]);
  useEffect(()=>{let active=true;
    if(scene.phase==='focusing')void viewer.current?.focus(scene.session.scene.boundsPx!).then(()=>{if(active){const c=viewer.current?.snapshot();if(c)setRole(r=>({...r,currentScrollCamera:c}));dispatch({type:'FOCUSED'});}}).catch(()=>{if(active)exit();});
    return()=>{active=false;};
  },[scene,exit]);
  useEffect(()=>{if(scene.phase!=='activity')return;let active=true,dispose:(()=>void)|undefined;setActivity(null);setModuleError('');
    void Promise.resolve().then(()=>loadSceneModule(scene.session.scene.moduleId)).then(m=>{if(active){dispose=m.dispose;setActivity(()=>m.Component);setActivitySession(scene.session);}else m.dispose?.();}).catch(()=>{if(active)setModuleError('这一处暂未准备好。可以随时返回原画。');});
    return()=>{active=false;dispose?.();};
  },[scene]);
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(intro||(e.target as HTMLElement).closest('input,textarea,select,[contenteditable="true"]'))return;
    if(e.key==='Escape'){if(panel)setPanel(null);else if(locked)exit();return;}
    if(locked||panel||!ready||magnifying)return;
    if(['ArrowLeft','ArrowRight','+','=','-','Home','End'].includes(e.key))e.preventDefault();
    if(e.key==='ArrowLeft')viewer.current?.pan(-1);if(e.key==='ArrowRight')viewer.current?.pan(1);if(e.key==='Home')viewer.current?.reset();
  };window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[locked,panel,ready,intro,exit,magnifying]);
  const onCamera=useCallback((c:Camera,settled:boolean)=>{
    // Panning updates only the compositor and progress DOM; React saves a camera at rest.
    const main=appElement.current,bar=progressElement.current,p=readingProgress(c.center.x,artwork.width);
    if(main){main.dataset.cameraX=String(c.center.x);main.dataset.cameraY=String(c.center.y);main.dataset.cameraZoom=String(c.zoom);}
    if(bar){bar.setAttribute('aria-valuenow',String(Math.round(p*100)));const fill=bar.firstElementChild as HTMLElement|null;if(fill)fill.style.transform=`scaleX(${p})`;}
    if(settled)setCamera(c);if(settled&&sceneRef.current.phase==='exploring')setRole(r=>{const old=r.currentScrollCamera;const knowledge=discoverKnowledge(r.knowledge,c.center.x,!!old&&Math.abs(old.center.x-c.center.x)>150);return old&&Math.abs(old.center.x-c.center.x)<.01&&Math.abs(old.center.y-c.center.y)<.01&&Math.abs(old.zoom-c.zoom)<.000001&&knowledge===r.knowledge?r:{...r,currentScrollCamera:c,knowledge};});},[]);
  const prepareScroll=useCallback(()=>{viewer.current?.preparePresentation();},[]);
  const presentScroll=useCallback((centerX:number)=>{viewer.current?.present(centerX);},[]);
  const enterScroll=useCallback(()=>{const c=viewer.current?.finishPresentation();if(c)setCamera(c);setRole(r=>({...r,introVersionSeen:INTRO_VERSION,openingDismissed:true,currentScrollCamera:c??r.currentScrollCamera}));setIntro(false);requestAnimationFrame(()=>document.getElementById('scroll-viewer')?.focus({preventScroll:true}));},[]);
  const setMode=(mode:Mode)=>setRole(r=>({...r,currentMode:mode}));
  const retry=()=>{setError('');setReady(false);setReload(x=>x+1);};
  const complete:ActivityProps['onComplete']=result=>{if(scene.phase!=='activity')return;const s=scene.session.scene;setRole(r=>recordEntry(r,{id:result.gameId?'v4:'+result.gameId:result.knowledgeCardId?'knowledge:'+result.knowledgeCardId:s.sceneId,sceneId:s.sceneId,knowledgeCardId:result.knowledgeCardId,title:result.gameTitle??(result.knowledgeCardId?(knowledgeActivityTitles[result.knowledgeCardId]??knowledgeCard(result.knowledgeCardId).title):s.title),summary:result.summary,evidenceIds:result.evidenceIds,testFixture:s.testFixture,reviewOnly:!s.testFixture&&s.reviewStatus!=='approved',theme:s.culture?.theme,reflection:result.reflection,experience:result.experience,createdAt:new Date().toISOString()}));dispatch({type:'COMPLETE',result});};
  return <main ref={appElement} className={`app mode-${role.currentMode} ${reduced?'reduce-motion':''}`} data-engine-state={scene.phase} data-camera-x={camera?.center.x??''} data-camera-y={camera?.center.y??''} data-camera-zoom={camera?.zoom??''} data-intro={intro}>
    <div className="world" inert={intro}>
      <header className="minimal-hud"><span className="brand-mark">白下行卷</span><nav aria-label="画卷工具">
        <button data-testid="tasks-toggle" disabled={locked||!ready} onClick={()=>{setReviewEnabled(true);setPanel('tasks');}}>卷中寻访</button>
        <button data-testid="notebook-toggle" onClick={()=>setPanel('notebook')} disabled={locked}>札记 <small>{culturalEntries.length||''}</small></button>
        <button aria-pressed={role.currentMode==='seek'} onClick={()=>setMode(role.currentMode==='seek'?'observe':'seek')} disabled={locked}>{role.currentMode==='seek'?'寻事':'观画'}</button>
        <button aria-label="摄像头手势行卷" aria-pressed={handControl} disabled={locked||!ready} onClick={()=>setHandControl(value=>!value)}>手势</button>
        <MusicToggle music={music}/>
        <button aria-label="作品设置" onClick={()=>setPanel('settings')} disabled={locked}>···</button>
      </nav></header>
      <section className="canvas-area" aria-label="长卷世界"><Suspense fallback={null}><ScrollViewer key={reload} ref={viewer} initialCamera={role.currentScrollCamera} mode={role.currentMode} scenes={scenes} locked={locked||!!panel||intro||magnifying} reducedMotion={reduced} onReady={()=>setReady(true)} onCamera={onCamera} onSceneClick={enter} onCharacterClick={c=>{setCharacter(c);setPanel('talk');}} onError={setError}/></Suspense>
        {!intro&&ready&&<Suspense fallback={null}><Magnifier viewer={viewer} disabled={locked||!!panel} onActiveChange={setMagnifying}/></Suspense>}
        {!intro&&error&&<div className="error-card" role="alert"><p>{error}</p><button onClick={retry}>重新展開</button></div>}
        {!intro&&!ready&&!error&&<div className="subtle-loading" role="status">正在展开画卷…</div>}
        {locked&&scene.phase!=='activity'&&scene.phase!=='result'&&<div className="transition-note" role="status">细处见微<button onClick={exit}>取消</button></div>}
      </section>
      <div ref={progressElement} className="scroll-progress" data-testid="scroll-progress" role="progressbar" aria-label="行卷进度" aria-valuenow={Math.round(progress*100)} aria-valuemin={0} aria-valuemax={100}><span style={{transform:`scaleX(${progress})`}}/></div>
    </div>
    {handControl&&<Suspense fallback={null}><HandScroll paused={intro||locked||!!panel||magnifying||!ready} onMove={fraction=>viewer.current?.panByFraction(fraction)} onSettle={()=>viewer.current?.finishGesture()} onClose={()=>setHandControl(false)}/></Suspense>}
    {intro&&<CinematicIntro key={introReplay} onPrepare={prepareScroll} onFrame={presentScroll} ready={ready} error={error} reducedMotion={reduced&&introReplay===0} onEnter={enterScroll} onRetry={retry}/>}
    {storageError&&!intro&&<div className="save-warning" role="status">本次可以继续，浏览器暂不能保存札记。</div>}
    {panel==='tasks'&&<Dialog label="卷中寻访" onClose={()=>setPanel(null)}><TravelTasks scenes={scenes.filter(s=>!s.testFixture)} onEnter={enter} completedIds={role.completedActivityIds??[]}/></Dialog>}
    {panel==='talk'&&character&&<Dialog label="沿途闲谈" onClose={()=>setPanel(null)}><TravelTalk key={character.id} character={character} scenes={scenes.filter(s=>!s.testFixture)} onEnter={enter}/></Dialog>}
    {panel==='notebook'&&<Dialog label="白下行旅簿" onClose={()=>setPanel(null)} wide>
      <span className="eyebrow">{role.displayName} · 随身札记</span>
      <h2 className="book-title">白下行旅簿</h2>
      <p className="book-subtitle">记人，记业，记路，记声。</p>
      <div className="notebook-tabs" aria-label="札记主题筛选">{([null,'人','业','路','声','画'] as const).map(t=><button key={t??'全部'} aria-pressed={theme===t} onClick={()=>setTheme(t)}>{t??'全部'}</button>)}</div>
      {culturalEntries.length===0&&<div className="blank-page"><span>尚未落笔</span><p>完成游戏后，可以写下自己的见闻。</p></div>}
      <section className="review-records">{culturalEntries.filter(e=>!theme||e.theme===theme).map(e=>{
        const item=reviewScenes.find(s=>s.sceneId===e.sceneId);
        return <article key={e.id}>
          <h3>{item&&e.id===item.sceneId?item.title:(e.knowledgeCardId?knowledgeActivityTitles[e.knowledgeCardId]:undefined)??e.title}</h3>
          <blockquote>{e.reflection}</blockquote>
        </article>;
      })}</section>
    </Dialog>}
    {panel==='settings'&&<Dialog label="作品设置" onClose={()=>setPanel(null)}>
      <span className="eyebrow">白下行卷 · 作品设置</span><h2>循卷而行</h2>
      <p>随见微沿卷走入金陵，探访乡野、街市与水岸。点选「游」，亲手过桥、提水、运货、称量；点选「问」，在画面与诗词间认识古人的生活。拿起放大镜细看一城烟火，将沿途发现收入《白下行旅簿》。</p>
      <label className="name-field">札记署名<input aria-label="角色名字" maxLength={12} value={role.displayName} onChange={e=>setRole(r=>({...r,displayName:e.target.value}))} onBlur={()=>setRole(r=>({...r,displayName:r.displayName.trim()||'见微'}))}/></label>
      <button className="text-button" onClick={()=>{music.setEnabled(true);setPanel(null);setIntroReplay(n=>n+1);setIntro(true);}}>重看序幕</button>
    </Dialog>}
    {(scene.phase==='activity'||scene.phase==='result')&&<Dialog label={scene.session.scene.title} onClose={exit} game={!!scene.session.scene.culture}>{scene.phase==='activity'?(moduleError?<><h2>暂未展开</h2><p>{moduleError}</p><button className="primary" onClick={exit}>返回原画</button></>:Activity&&activitySession===scene.session?<ActivityBoundary onExit={exit}><Activity scene={scene.session.scene} initialActivity={scene.session.initialActivity} onComplete={complete} onExit={exit} reducedMotion={reduced}/></ActivityBoundary>:<p role="status">正在准备…</p>):<><span className="eyebrow">{scene.session.scene.testFixture?'TEST · 工程验证':scene.result.reflection?.trim()?'札记已保存':'这一程已完成'}</span><h2>回到画中，再看一眼。</h2><p>{scene.result.reflection?.trim()}</p><button className="primary" onClick={exit}>继续行卷</button></>}</Dialog>}
    {!locked&&!panel&&<ProjectLinks/>}
  </main>;
}
