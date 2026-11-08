import type {CargoSlots} from '../core/rules';
type CargoObject={position:{x:number;z:number};rotation?:{y:number}};
type Boat=CargoObject&{rotation:{y:number}};

function moveCargoBoat(boat:Boat,crates:CargoObject[],slots:CargoSlots,x:number,z:number,yaw:number){
 const turn=yaw-boat.rotation.y,c=Math.cos(turn),s=Math.sin(turn);
 for(const id of slots)if(id!==null){
  const crate=crates[id],localX=crate.position.x-boat.position.x,localZ=crate.position.z-boat.position.z;
  crate.position.x=x+c*localX+s*localZ;crate.position.z=z-s*localX+c*localZ;
  if(crate.rotation)crate.rotation.y+=turn;
 }
 boat.position.x=x;boat.position.z=z;boat.rotation.y=yaw;
}
// The asset manifest and both fallback/GLB hulls use local -X for the bow.
export function advanceCargoBoat(boat:Boat,crates:CargoObject[],slots:CargoSlots,seconds:number){
 const distance=seconds*1.3;
 moveCargoBoat(boat,crates,slots,boat.position.x-Math.cos(boat.rotation.y)*distance,boat.position.z+Math.sin(boat.rotation.y)*distance,boat.rotation.y);
}
export const CARGO_CAST_OFF_SECONDS=1.6;
export const CARGO_DEPARTURE_SECONDS=5.6;
export function cargoDeparturePose(elapsed:number){
 const t=Math.max(0,Math.min(1,elapsed/CARGO_CAST_OFF_SECONDS)),ease=t*t*(3-2*t);
 // First clear the quay and turn the bow toward the water gate at negative Z.
 return {x:0,z:-2.5-1.6*ease-Math.max(0,elapsed-CARGO_CAST_OFF_SECONDS)*1.5,yaw:-Math.PI/2*ease};
}
export function departCargoBoat(boat:Boat,crates:CargoObject[],slots:CargoSlots,elapsed:number){
 const pose=cargoDeparturePose(elapsed);moveCargoBoat(boat,crates,slots,pose.x,pose.z,pose.yaw);
}
