import type { BoundsPx } from '../viewer/camera';
// Future PixiJS adapter: dynamically import Pixi inside mount; preserve the source plate.
export interface ParallaxLayer { id:string; url:string; anchorPx:{x:number;y:number}; depth:number; provenance:string; reconstructed:boolean }
export interface ParallaxContext { container:HTMLElement; boundsPx:BoundsPx; layers:ParallaxLayer[]; signal:AbortSignal; reducedMotion:boolean }
export interface ParallaxAdapter { mount(context:ParallaxContext):Promise<void>; setOriginalVisible(visible:boolean):void; dispose():void }
