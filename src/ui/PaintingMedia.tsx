import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {paintingClip,type PaintingClip} from '../media/paintingClips';
import {mediaUrl} from '../media/mediaUrl';
interface Props {src?:string;alt?:string;className?:string;style?:CSSProperties;loading?:'eager'|'lazy';draggable?:boolean;playSceneId?:string}
export function PaintingMedia(props:Props){
 const clip=paintingClip(props.src,props.playSceneId);
 return <Illustration key={clip?.src??props.src??'image'} {...props} clip={clip}/>;
}
function Illustration({src,alt='',className,style,loading,draggable,clip}:Props&{clip?:PaintingClip}){
 const element=useRef<HTMLVideoElement>(null);
 const [failed,setFailed]=useState(false);
 const url=clip?mediaUrl(clip.src):undefined;
 useEffect(()=>{
  const video=element.current;if(!video||!url||failed)return;
  // One mounted native player owns its source, buffer and seamless loop.
  // Never move an already buffering element between detached and visible trees.
  video.muted=video.defaultMuted=true;video.volume=0;
  if(video.getAttribute('src')!==url)video.src=url;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData=(navigator as Navigator&{connection?:{saveData?:boolean}}).connection?.saveData;
  let wantsPlay=!reduced.matches&&!saveData,disposed=false,pending=false,managedPauses=0,started=false,stalls=0,loads=0;
  const resume=()=>{
   if(!disposed&&wantsPlay&&!document.hidden&&video.paused&&!pending){
    pending=true;
    void video.play().catch(()=>{/* Native controls can retry blocked playback. */}).finally(()=>{pending=false;});
   }
  };
  const visibility=()=>{
   if(document.hidden){if(!video.paused){managedPauses++;video.pause();}}
   else resume();
  };
  const preference=()=>{wantsPlay=!reduced.matches&&!saveData;if(wantsPlay)resume();else if(!video.paused){managedPauses++;video.pause();}};
  const play=()=>{wantsPlay=true;};
  const pause=()=>{if(managedPauses)managedPauses--;else wantsPlay=false;};
  const progress=()=>{
   const quality=video.getVideoPlaybackQuality?.();
   if(quality){video.dataset.decodedFrames=String(quality.totalVideoFrames);video.dataset.droppedFrames=String(quality.droppedVideoFrames);}
  };
  const playing=()=>{started=true;video.dataset.playback='playing';progress();};
  const waiting=()=>{if(started)video.dataset.stalls=String(++stalls);video.dataset.playback='buffering';};
  const load=()=>{video.dataset.sourceLoads=String(++loads);};
  video.dataset.stalls='0';video.dataset.sourceLoads='0';
  video.addEventListener('play',play);video.addEventListener('pause',pause);
  video.addEventListener('playing',playing);video.addEventListener('waiting',waiting);
  video.addEventListener('loadstart',load);video.addEventListener('timeupdate',progress);
  document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',preference);
  resume();
  return()=>{
   disposed=true;
   document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',preference);
   video.removeEventListener('play',play);video.removeEventListener('pause',pause);
   video.removeEventListener('playing',playing);video.removeEventListener('waiting',waiting);
   video.removeEventListener('loadstart',load);video.removeEventListener('timeupdate',progress);
   video.pause();video.removeAttribute('src');video.load();
  };
 },[url,failed]);
 if(!clip||failed)return <img src={clip?.poster??src?mediaUrl((clip?.poster??src)!):undefined} alt={alt} className={className} style={style} loading={loading} decoding="async" crossOrigin="anonymous" draggable={draggable}/>;
 return <video ref={element} src={url} poster={mediaUrl(clip.poster??src??'')} width={clip.width} height={clip.height}
  aria-label={alt} title={alt} className={className} style={style} data-painting-video={clip.src}
  muted loop playsInline preload="auto" controls disablePictureInPicture controlsList="nodownload noplaybackrate noremoteplayback"
  crossOrigin="anonymous" draggable={draggable??false} onError={()=>setFailed(true)}/>;
}
