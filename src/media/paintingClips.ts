import manifest from '../../data/painting-videos.v1.json';
export interface PaintingClip {src:string; width:number; height:number; duration:number; poster?:string}
const originals:Record<string,PaintingClip> = manifest.clips;
const supplied:Record<string,PaintingClip> = manifest.playClips;
export function paintingClip(src?:string,playSceneId?:string):PaintingClip|undefined {
 return playSceneId?supplied[playSceneId]:(src?originals[src]:undefined);
}
