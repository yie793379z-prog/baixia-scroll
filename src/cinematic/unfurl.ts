import {artwork} from '../content/artwork';
import {fixedBounds} from '../viewer/fixedCamera';

// Nine seconds to unfold; the quick return stays at two seconds.
export const UNFURL_TRAVEL_START=700;
export const UNFURL_TRAVEL_MS=9000;
export const UNFURL_RETURN_START=UNFURL_TRAVEL_START+UNFURL_TRAVEL_MS+300;
export const UNFURL_RETURN_MS=2000;
export const UNFURL_DURATION=UNFURL_RETURN_START+UNFURL_RETURN_MS+300;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));

// Brief cosine acceleration/deceleration keeps the journey smooth.
// The camera never changes magnification.
function travel(ms:number){
  const t=Math.max(0,Math.min(UNFURL_TRAVEL_MS,ms)),ramp=600,total=UNFURL_TRAVEL_MS-ramp;
  const rampDistance=(v:number)=>v/2-ramp*Math.sin(Math.PI*v/ramp)/(2*Math.PI);
  if(t<ramp)return rampDistance(t)/total;
  if(t>UNFURL_TRAVEL_MS-ramp)return 1-rampDistance(UNFURL_TRAVEL_MS-t)/total;
  return (t-ramp/2)/total;
}

export function unfurlFrame(ms:number,width:number,height:number){
  const right=fixedBounds(width/Math.max(1,height),artwork.width);
  const left=fixedBounds(width/Math.max(1,height),0);
  const opening=fixedBounds(width/Math.max(1,height));
  const progress=travel(ms-UNFURL_TRAVEL_START);
  const returnTime=clamp((ms-UNFURL_RETURN_START)/UNFURL_RETURN_MS);
  const returnProgress=(1-Math.cos(Math.PI*returnTime))/2;
  const x=ms<UNFURL_RETURN_START?right.x+(left.x-right.x)*progress:left.x+(opening.x-left.x)*returnProgress;
  return {
    progress,returnProgress,centerX:x+right.width/2,
    scale:height/artwork.height,
    left:-x*height/artwork.height,top:0,
    paperWidth:artwork.width*height/artwork.height,paperHeight:height,
    rollerOpacity:1-clamp((ms-UNFURL_TRAVEL_START-UNFURL_TRAVEL_MS)/300),
    controlsOpacity:1-clamp((ms-UNFURL_DURATION+300)/300),
    phase:ms<UNFURL_TRAVEL_START?'arriving':ms<UNFURL_TRAVEL_START+UNFURL_TRAVEL_MS?'unrolling':ms<UNFURL_RETURN_START?'turnaround':ms<UNFURL_RETURN_START+UNFURL_RETURN_MS?'returning':'handoff',
  };
}
