import type { ActivityResult, SceneDefinition } from '../scenes/types';
export interface MiniGameContext { container:HTMLElement; scene:SceneDefinition; signal:AbortSignal; reducedMotion:boolean; onComplete(result:ActivityResult):void; onExit():void }
export interface MiniGameAdapter { start(context:MiniGameContext):Promise<void>; pause():void; dispose():void }
