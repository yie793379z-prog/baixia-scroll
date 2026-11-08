import {afterEach,describe,expect,it,vi} from 'vitest';
import {createElement} from 'react';
import {renderToString} from 'react-dom/server';
import {App} from '../src/app/App';
import {initialRole,parseRole,STORAGE_KEY} from '../src/roles/state';
import {INTRO_VERSION} from '../src/cinematic/opening';

afterEach(()=>vi.unstubAllGlobals());

describe('opening a game URL',()=>{
  it.each([
    ['first visit',null,false],
    ['returning visitor',JSON.stringify({...initialRole(),introVersionSeen:INTRO_VERSION,openingDismissed:true,completedActivityIds:['well'],notebookEntries:[{id:'well',sceneId:'well',title:'井边',summary:'',reflection:'留下的札记',evidenceIds:[],testFixture:false,createdAt:'2026-11-01'}]}),false],
    ['older save',JSON.stringify({...initialRole(),introVersionSeen:3,openingDismissed:true}),false],
    ['reduced motion',JSON.stringify({...initialRole(),introVersionSeen:INTRO_VERSION,reducedMotion:true}),true],
  ] as const)('shows the intro for %s without clearing progress',(_label,saved,reduced)=>{
    const getItem=vi.fn((key:string)=>key===STORAGE_KEY?saved:null);
    const setItem=vi.fn();
    vi.stubGlobal('window',{matchMedia:()=>({matches:reduced})});
    vi.stubGlobal('location',{search:''});
    vi.stubGlobal('localStorage',{getItem,setItem});
    const html=renderToString(createElement(App));
    expect(html).toContain('data-intro="true"');
    expect(html).toContain('data-testid="cinematic-intro"');
    expect(html).toContain('class="world" inert=""');
    expect(setItem).not.toHaveBeenCalled();
    if(saved&&JSON.parse(saved).completedActivityIds.length){
      expect(parseRole(saved).completedActivityIds).toContain('well');
      expect(parseRole(saved).notebookEntries[0].reflection).toBe('留下的札记');
    }
  });
});
