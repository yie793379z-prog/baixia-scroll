import {useEffect,useRef,useState} from 'react';
import {HandMotion,type HandStatus} from './handMotion';
import type {HandWorkerInput,HandWorkerOutput} from './hand.worker';
import './hand-scroll.css';

interface Props {paused:boolean;onMove(fraction:number):void;onSettle():void;onClose():void}
type Status=HandStatus|'preparing'|'camera'|'paused'|'manual'|'error';
const labels:Record<Status,string>={preparing:'正在准备手势…',camera:'请允许使用摄像头',waiting:'请将张开的手掌放到镜头前',closed:'手掌收拢，已暂停',acquiring:'正在识别手掌…',tracking:'正在跟随手掌',coasting:'正在缓缓停下',paused:'画面互动中，手势暂停',manual:'鼠标操作中，手势暂歇',error:'手势暂未开启'};
export function cameraError(error:unknown):string{
  const name=error instanceof Error?error.name:'';
  if(name==='NotAllowedError'||name==='SecurityError')return '摄像头未获允许。请在浏览器地址栏允许此网站使用摄像头，再重试。';
  if(name==='NotFoundError')return '没有找到摄像头。连接摄像头后可以重试。';
  if(name==='NotReadableError'||name==='AbortError')return '摄像头暂时无法打开，可能正被其他应用占用。关闭占用它的应用后重试。';
  return '手势识别未能启动，请重试。你仍可用鼠标或触控板行卷。';
}
export function HandScroll(props:Props){
  const current=useRef(props);current.current=props;
  const video=useRef<HTMLVideoElement>(null);
  const [status,setStatus]=useState<Status>('preparing'),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let alive=true,stream:MediaStream|null=null,worker:Worker|null=null,frame=0,busy=false,ready=false,playing=false;
    let lastCapture=0,lastVideoTime=-1,lastMovement=0,moved=false,generation=0,wasPaused=false,manualUntil=0,inflightAt=0;
    let initTimer:ReturnType<typeof setTimeout>|undefined;
    const motion=new HandMotion();
    const show=(next:Status)=>{if(alive)setStatus(old=>old===next?old:next);};
    const settle=()=>{if(moved){moved=false;current.current.onSettle();}};
    const stop=()=>{cancelAnimationFrame(frame);clearTimeout(initTimer);worker?.terminate();worker=null;stream?.getTracks().forEach(t=>t.stop());if(video.current)video.current.srcObject=null;motion.reset();settle();};
    const fail=(message:string)=>{if(!alive)return;stop();setError(message);show('error');};
    const pause=()=>{generation++;motion.reset();settle();};
    const manual=(event:Event)=>{
      if(event instanceof PointerEvent&&event.type==='pointermove'&&!event.buttons)return;
      if(event instanceof KeyboardEvent&&!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      if(event.target instanceof Element&&event.target.closest('.hand-scroll'))return;
      manualUntil=performance.now()+1500;pause();
    };
    const visibility=()=>{pause();};
    const loop=(now:number)=>{
      if(!alive)return;
      const paused=current.current.paused||document.hidden||now<manualUntil;
      if(paused!==wasPaused){pause();wasPaused=paused;}
      if(ready&&playing){
        if(paused)show(now<manualUntil&&!current.current.paused?'manual':'paused');
        else{
          const delta=motion.step(now);show(motion.status);
          if(delta!==0){current.current.onMove(delta);moved=true;lastMovement=now;}
          else if(moved&&now-lastMovement>140)settle();
          const el=video.current;
          if(!busy&&el&&el.readyState>=2&&now-lastCapture>=50&&el.currentTime!==lastVideoTime){
            busy=true;inflightAt=now;lastCapture=now;lastVideoTime=el.currentTime;const capturedGeneration=generation;
            const width=Math.min(480,el.videoWidth);
            void createImageBitmap(el,{resizeWidth:width,resizeHeight:Math.round(width*el.videoHeight/el.videoWidth)}).then(bitmap=>{
              if(!alive||!worker||capturedGeneration!==generation){bitmap.close();busy=false;return;}
              const message:HandWorkerInput={type:'frame',image:bitmap,time:now,generation:capturedGeneration};
              worker.postMessage(message,[bitmap]);
            }).catch(()=>{busy=false;fail('无法读取摄像头画面，请关闭手势后重试。');});
          }
          if(busy&&now-inflightAt>4000){fail('识别暂时没有响应，请重试。');return;}
        }
      }
      frame=requestAnimationFrame(loop);
    };
    const start=async()=>{
      setError('');show('preparing');
      if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){fail('请用本机 localhost 或 HTTPS 地址打开，才能使用摄像头手势。');return;}
      if(!window.Worker||!window.createImageBitmap||!window.OffscreenCanvas){fail('当前浏览器不支持本机手势识别，请使用新版 Chrome 或 Edge。');return;}
      try{
        worker=new Worker(new URL('./hand.worker.ts',import.meta.url),{type:'module'});
        worker.onerror=()=>fail('手势模型未能加载，请重试。');
        worker.onmessage=({data}:MessageEvent<HandWorkerOutput>)=>{
          if(!alive)return;
          if(data.type==='ready'){ready=true;clearTimeout(initTimer);if(playing)show('waiting');}
          else if(data.type==='error')fail('手势模型未能运行，请重试。');
          else{
            busy=false;
            if(data.generation===generation&&!current.current.paused&&!document.hidden&&performance.now()>=manualUntil&&performance.now()-data.time<220){
              motion.observe(data.points,data.world,data.time);

            }
          }
        };
        const init:HandWorkerInput={type:'init',base:new URL(`${import.meta.env.BASE_URL}hand-tracking`,location.href).href};worker.postMessage(init);
        initTimer=setTimeout(()=>fail('手势模型加载超时，请重试。'),30000);
        show('camera');
        const media=await navigator.mediaDevices.getUserMedia({audio:false,video:{width:{ideal:640},height:{ideal:480},frameRate:{ideal:30,max:30},facingMode:'user'}});
        if(!alive||!worker){media.getTracks().forEach(t=>t.stop());return;}
        stream=media;
        media.getVideoTracks().forEach(track=>track.addEventListener('ended',()=>fail('摄像头已断开，请连接后重试。'),{once:true}));
        const el=video.current;if(!el){stop();return;}
        el.srcObject=media;await el.play();if(!alive||!worker)return;
        playing=true;show(ready?'waiting':'preparing');frame=requestAnimationFrame(loop);
      }catch(e){fail(cameraError(e));}
    };
    window.addEventListener('pointerdown',manual,true);window.addEventListener('pointermove',manual,true);window.addEventListener('pointerup',manual,true);window.addEventListener('wheel',manual,{passive:true,capture:true});window.addEventListener('keydown',manual,true);document.addEventListener('visibilitychange',visibility);
    void start();
    return()=>{alive=false;stop();window.removeEventListener('pointerdown',manual,true);window.removeEventListener('pointermove',manual,true);window.removeEventListener('pointerup',manual,true);window.removeEventListener('wheel',manual,true);window.removeEventListener('keydown',manual,true);document.removeEventListener('visibilitychange',visibility);};
  },[attempt]);
  return <aside className="hand-scroll" aria-label="手势行卷" data-status={status}>
    <div className="hand-scroll-heading"><span>以手行卷</span><button aria-label="关闭摄像头手势" onClick={props.onClose}>×</button></div>
    <div className="hand-scroll-body"><video ref={video} autoPlay playsInline muted aria-label="本机摄像头镜像预览"/><div><p className="hand-scroll-status" role="status">{labels[status]}</p><p>张开手掌左右移动<br/>移出镜头后缓缓停下</p></div></div>
    {error&&<p className="hand-scroll-error" role="alert">{error}<button onClick={()=>setAttempt(n=>n+1)}>重试</button></p>}
    <small>只在本机识别，不录制、不上传。</small>
  </aside>;
}
