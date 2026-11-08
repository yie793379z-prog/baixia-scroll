export const FIELD_CYCLE_MS=1050;
export const FIELD_WINDOW={start:.44,end:.56} as const;
export interface FieldRhythmState{hits:number;lastCycle:number}
export type FieldAction='j'|'k';
export function fieldBeat(elapsed:number){const cycle=Math.floor(Math.max(0,elapsed)/FIELD_CYCLE_MS),phase=(Math.max(0,elapsed)%FIELD_CYCLE_MS)/FIELD_CYCLE_MS;return {cycle,phase,ready:phase>=FIELD_WINDOW.start&&phase<=FIELD_WINDOW.end};}
export function strikeField(state:FieldRhythmState,action:FieldAction,elapsed:number){
 const beat=fieldBeat(elapsed),expected:FieldAction=state.hits%2===0?'j':'k';
 if(state.hits>=8)return {...state,result:'done' as const};
 if(beat.cycle===state.lastCycle)return {...state,result:'used' as const};
 if(action!==expected||!beat.ready)return {hits:Math.max(0,state.hits-1),lastCycle:beat.cycle,result:action!==expected?'order' as const:'timing' as const};
 return {hits:state.hits+1,lastCycle:beat.cycle,result:'hit' as const};
}
