import {afterEach,describe,expect,it,vi} from 'vitest';
import {createElement} from 'react';
import {renderToString} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {TravelTasks} from '../src/ui/TravelTasks';
import {activeReviewScenes} from '../src/content/culture';
import {isTaskAvailable} from '../src/content/tasks';
import {PaintingMedia} from '../src/ui/PaintingMedia';
import {GameWorkshop} from '../src/games/GameWorkshop';
import {paintingClip} from '../src/media/paintingClips';
import {loadMusicPreferences,MUSIC_STORAGE_KEY} from '../src/sound/musicPreferences';
import {mediaUrl} from '../src/media/mediaUrl';

afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
describe('static visit list',()=>{
 it('renders original painting crops for all eight entries and no players',()=>{
  const html=renderToString(createElement(TravelTasks,{scenes:activeReviewScenes,onEnter:()=>{},completedIds:[]}));
  expect(html.match(/<img /g)).toHaveLength(8);
  expect(html).not.toContain('<video');expect(html).not.toContain('user-20261108');
  for(const s of activeReviewScenes.filter(s=>isTaskAvailable(s,'play')))expect(html).toContain('src="'+s.culture!.previewPath+'"');
 });
});
describe('supplied play videos',()=>{
 it('renders a single stable native player for each play entry and no detail switch',()=>{
  for(const scene of activeReviewScenes.filter(s=>isTaskAvailable(s,'play'))){
   const clip=paintingClip(scene.culture!.previewPath,scene.sceneId);
   expect(clip?.src).toContain('/user-20261108/');
   const html=renderToString(createElement(PaintingMedia,{src:scene.culture!.previewPath,playSceneId:scene.sceneId}));
   expect(html.match(/<video /g)).toHaveLength(1);expect(html).toContain('preload="auto"');
   expect(html).toContain('muted=""');expect(html).toContain('loop=""');expect(html).not.toContain('painting-media');
   const intro=renderToString(createElement(GameWorkshop,{scene,onComplete:()=>{},onExit:()=>{}}));
   expect(intro).not.toContain('看细节');expect(intro).not.toContain('看周围');expect(intro).toContain(clip!.src);
  }
 });
 it('cannot resolve retired play detail animations, retaining original puzzle coordinates',()=>{
  for(const scene of activeReviewScenes.filter(s=>isTaskAvailable(s,'play')&&s.sceneId!=='q_shop')){
   expect(paintingClip(scene.culture!.detailPath)).toBeUndefined();
  }
 });
});
describe('music startup and public media routing',()=>{
 it('starts fetching one audio element from HTML before either app module',()=>{
  const html=readFileSync('index.html','utf8');
  expect(html.match(/<audio /g)).toHaveLength(1);expect(html).toContain('preload="auto"');
  expect(html.indexOf('<audio')).toBeLessThan(html.indexOf('baixia:music-managed'));
  expect(html.indexOf('baixia:music-managed')).toBeLessThan(html.indexOf('/src/main.tsx'));
 });
 it('preserves the saved volume, including silence, while starting each visit enabled',()=>{
  vi.stubGlobal('localStorage',{getItem:(key:string)=>key===MUSIC_STORAGE_KEY?JSON.stringify({enabled:false,volume:0,volumeVersion:2}):null});
  expect(loadMusicPreferences()).toMatchObject({enabled:true,volume:0});
 });
 it('uses only the existing public origin and only for media',()=>{
  vi.stubGlobal('document',{querySelector:()=>({content:'https://harmonious-dango-b44962.netlify.app'})});
  expect(mediaUrl('/audio/jinling-yimeng.mp3')).toBe('https://harmonious-dango-b44962.netlify.app/audio/jinling-yimeng.mp3');
  expect(mediaUrl('/models/a.glb')).toBe('/models/a.glb');
  vi.stubGlobal('document',{querySelector:()=>({content:'https://other.example'})});
  expect(mediaUrl('/audio/jinling-yimeng.mp3')).toBe('/audio/jinling-yimeng.mp3');
 });
});
