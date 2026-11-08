/** Metres/seconds. Low-steepness Gerstner waves for sheltered inland water. */
export const RIVER_WAVES = [
  {x:.94,z:.34,amplitude:.036,wavelength:4.6,steepness:.32,phase:0},
  {x:.60,z:.80,amplitude:.022,wavelength:2.7,steepness:.28,phase:1.7},
  {x:-.32,z:.9474,amplitude:.011,wavelength:1.45,steepness:.22,phase:3.1},
  {x:.83,z:-.5578,amplitude:.006,wavelength:.82,steepness:.18,phase:4.3},
] as const;
export function sampleRiver(x:number,z:number,time:number){
  let height=0,dx=0,dz=0,offsetX=0,offsetZ=0;
  for(const w of RIVER_WAVES){
    const length=Math.hypot(w.x,w.z),u=w.x/length,v=w.z/length,k=2*Math.PI/w.wavelength;
    const phase=k*(u*x+v*z)-Math.sqrt(9.81*k)*time+w.phase;
    height+=w.amplitude*Math.sin(phase);dx+=w.amplitude*k*u*Math.cos(phase);dz+=w.amplitude*k*v*Math.cos(phase);
    offsetX+=w.steepness*w.amplitude*u*Math.cos(phase);offsetZ+=w.steepness*w.amplitude*v*Math.cos(phase);
  }
  return {height,dx,dz,offsetX,offsetZ};
}
export function createNatureClock(){
  const time={value:0};let last:number|undefined;
  return {time,update(now:number,reduced=false){
    if(last!==undefined&&!reduced)time.value+=Math.max(0,Math.min(.05,now-last));
    last=now;return time.value;
  }};
}
export const waveGLSL=`
  void riverWave(vec2 p,float time,vec2 direction,float amplitude,float wavelength,float steepness,float phase,
    inout vec3 offset,inout vec3 tx,inout vec3 tz){
    vec2 d=normalize(direction);float k=6.28318530718/wavelength;
    float f=k*dot(d,p)-sqrt(9.81*k)*time+phase,s=sin(f),c=cos(f),qa=steepness*amplitude;
    offset+=vec3(qa*d.x*c,amplitude*s,qa*d.y*c);
    tx+=vec3(-qa*k*d.x*d.x*s,amplitude*k*d.x*c,-qa*k*d.x*d.y*s);
    tz+=vec3(-qa*k*d.x*d.y*s,amplitude*k*d.y*c,-qa*k*d.y*d.y*s);
  }
  void riverSurface(vec2 p,float time,out vec3 offset,out vec3 normal){
    offset=vec3(0.);vec3 tx=vec3(1.,0.,0.),tz=vec3(0.,0.,1.);
    ${RIVER_WAVES.map(w=>`riverWave(p,time,vec2(${w.x.toFixed(5)},${w.z.toFixed(5)}),${w.amplitude},${w.wavelength},${w.steepness},${w.phase.toFixed(1)},offset,tx,tz);`).join('\n')}
    normal=normalize(cross(tz,tx));
  }
`;
