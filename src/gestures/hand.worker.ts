import {FilesetResolver,HandLandmarker} from '@mediapipe/tasks-vision';
import type {HandPoint} from './handMotion';
export type HandWorkerInput={type:'init';base:string}|{type:'frame';image:ImageBitmap;time:number;generation:number};
export type HandWorkerOutput={type:'ready'}|{type:'error';message:string}|{type:'result';points:HandPoint[];world:HandPoint[];time:number;generation:number};
const worker=self as unknown as {onmessage:((event:MessageEvent<HandWorkerInput>)=>void)|null;postMessage(data:HandWorkerOutput):void};
let detector:HandLandmarker|null=null;
worker.onmessage=async({data})=>{
  try{
    if(data.type==='init'){
      const files=await FilesetResolver.forVisionTasks(`${data.base}/wasm`,true);
      detector=await HandLandmarker.createFromOptions(files,{
        baseOptions:{modelAssetPath:`${data.base}/hand_landmarker.task`,delegate:'CPU'},
        runningMode:'VIDEO',numHands:1,minHandDetectionConfidence:.65,minHandPresenceConfidence:.65,minTrackingConfidence:.6,
      });
      worker.postMessage({type:'ready'});
    }else{
      try{
        if(!detector)throw new Error('Hand detector is not ready');
        const result=detector.detectForVideo(data.image,data.time);
        worker.postMessage({type:'result',points:result.landmarks[0]??[],world:result.worldLandmarks[0]??[],time:data.time,generation:data.generation});
      }finally{data.image.close();}
    }
  }catch(error){worker.postMessage({type:'error',message:error instanceof Error?error.message:'Hand tracking failed'});}
};
