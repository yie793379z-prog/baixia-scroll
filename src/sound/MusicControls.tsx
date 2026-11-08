import type {useBackgroundMusic} from './useBackgroundMusic';

type Music = ReturnType<typeof useBackgroundMusic>;

export function MusicToggle({music}:{music:Music}) {
  const retry = music.enabled && music.playback==='error';
  const waiting = music.enabled && music.playback==='waiting';
  return <button data-music-control aria-label={retry?'听曲：重试背景音乐':waiting||!music.enabled?'听曲：播放背景音乐':'歇曲：暂停背景音乐'}
    aria-pressed={music.playback==='playing'} title="金陵遗梦 · 背景音乐"
    onClick={()=>music.setEnabled(retry||waiting||!music.enabled)}>
    {retry||waiting||!music.enabled?'听曲':'歇曲'}
  </button>;
}
