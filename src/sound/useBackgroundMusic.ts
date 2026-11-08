import {useCallback,useEffect,useRef,useState} from 'react';
import {MUSIC_ELEMENT_ID,MUSIC_STORAGE_KEY,loadMusicPreferences} from './musicPreferences';

export const BACKGROUND_MUSIC_URL = `${import.meta.env.BASE_URL}audio/jinling-yimeng.mp3`;
type Playback = 'waiting'|'playing'|'off'|'error';

export function useBackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [preferences,setPreferences] = useState(loadMusicPreferences);
  const preferencesRef = useRef(preferences);
  const [playback,setPlayback] = useState<Playback>(preferences.enabled?'waiting':'off');
  const startRef = useRef<()=>void>(()=>{});
  const stopRef = useRef<()=>void>(()=>{});

  useEffect(()=>{
    try { localStorage.setItem(MUSIC_STORAGE_KEY,JSON.stringify(preferences)); }
    catch { /* Music still works when browser storage is unavailable. */ }
  },[preferences]);

  useEffect(()=>{
    const audio = document.getElementById(MUSIC_ELEMENT_ID) as HTMLAudioElement|null;
    if(!audio)return;
    audioRef.current=audio;
    window.dispatchEvent(new Event('baixia:music-managed'));
    let disposed = false, pending = false, request = 0;
    audio.volume = preferencesRef.current.volume;

    const stop = ()=>{
      request++;
      pending = false;
      audio.pause();
      setPlayback(preferencesRef.current.enabled?'waiting':'off');
    };
    const play = ()=>{
      if(disposed||!preferencesRef.current.enabled||document.hidden||pending||!audio.paused)return;
      const current = ++request;
      pending = true;
      void audio.play().catch((error:unknown)=>{
        if(disposed||current!==request)return;
        const name = error instanceof DOMException ? error.name : '';
        setPlayback(name==='NotAllowedError'||name==='AbortError'?'waiting':'error');
      }).finally(()=>{if(current===request)pending=false;});
    };
    const onGesture = (event:Event)=>{
      if(!event.isTrusted)return;
      // Music controls own both stop and play; don't start sound on pointerdown before a pause.
      if((event.target as HTMLElement).closest('[data-music-control]'))return;
      if(!audio.error)play();
    };
    const onPlaying = ()=>{
      if(!preferencesRef.current.enabled||document.hidden){stop();return;}
      setPlayback('playing');
    };
    const onError = ()=>setPlayback(preferencesRef.current.enabled?'error':'off');
    const onVisibility = ()=>{if(document.hidden)stop();else play();};
    startRef.current = ()=>{
      if(audio.error)audio.load();
      play();
    };
    stopRef.current = stop;
    audio.addEventListener('playing',onPlaying);
    audio.addEventListener('error',onError);
    window.addEventListener('pointerdown',onGesture,{passive:true});
    window.addEventListener('keydown',onGesture);
    document.addEventListener('visibilitychange',onVisibility);
    window.addEventListener('pagehide',stop);
    window.addEventListener('pageshow',play);
    // Start with the opening poem. If autoplay is blocked, the first gesture retries.
    play();
    if(!audio.paused&&audio.readyState>=3)onPlaying();
    return ()=>{
      disposed = true;
      request++;
      audio.removeEventListener('playing',onPlaying);
      audio.removeEventListener('error',onError);
      window.removeEventListener('pointerdown',onGesture);
      window.removeEventListener('keydown',onGesture);
      document.removeEventListener('visibilitychange',onVisibility);
      window.removeEventListener('pagehide',stop);
      window.removeEventListener('pageshow',play);
      audio.pause();
      startRef.current = ()=>{};
      stopRef.current = ()=>{};
    };
  },[]);

  useEffect(()=>{if(audioRef.current)audioRef.current.dataset.playback=playback;},[playback]);

  const setEnabled = useCallback((enabled:boolean)=>{
    const next = {...preferencesRef.current,enabled};
    preferencesRef.current = next;
    setPreferences(next);
    if(enabled)startRef.current();else stopRef.current();
  },[]);

  return {audioRef,...preferences,playback,setEnabled};
}
