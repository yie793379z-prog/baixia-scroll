export const MUSIC_STORAGE_KEY='baixia-background-music-v1';
export const MUSIC_ELEMENT_ID='background-music';
const VOLUME_VERSION=2;
export type MusicPreferences={enabled:boolean;volume:number;volumeVersion:typeof VOLUME_VERSION};
export function loadMusicPreferences():MusicPreferences {
 try{
  const saved=JSON.parse(localStorage.getItem(MUSIC_STORAGE_KEY)??'null');
  return {enabled:true,volume:saved?.volumeVersion===VOLUME_VERSION&&Number.isFinite(saved.volume)?Math.max(0,Math.min(1,saved.volume)):.6,volumeVersion:VOLUME_VERSION};
 }catch{return {enabled:true,volume:.6,volumeVersion:VOLUME_VERSION};}
}
