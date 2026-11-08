import * as T from 'three';
import {Sky} from 'three/addons/objects/Sky.js';
export {createRiver} from './river';
/** Analytic daylight and slow clouds, sharing the sun direction with the world. */
export function createSky() {
  const sky=new Sky();sky.name='morning-sky';sky.scale.setScalar(1000);sky.frustumCulled=false;
  const u=sky.material.uniforms;
  u.turbidity.value=2.6;u.rayleigh.value=1.65;u.mieCoefficient.value=.004;
  u.mieDirectionalG.value=.78;u.sunPosition.value.set(-10.65,18,21.5).normalize().multiplyScalar(100000);
  u.cloudCoverage.value=.42;u.cloudDensity.value=.35;u.cloudScale.value=.00038;u.cloudSpeed.value=.0000018;
  sky.material.depthWrite=false;return sky;
}
export function createMotes(random:()=>number) {
  const positions=new Float32Array(120*3);for(let i=0;i<positions.length;i+=3){positions[i]=(random()-.5)*28;positions[i+1]=.3+random()*5;positions[i+2]=9-random()*40;}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0}},
    vertexShader:`uniform float time;varying float alpha;void main(){vec3 p=position;p.x+=sin(time*.18+p.z)*.18;p.y+=sin(time*.24+p.x)*.12;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(22./-mv.z,1.,3.);alpha=.22*(1.-smoothstep(3.,24.,-mv.z));}`,
    fragmentShader:`varying float alpha;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(1.,.88,.57,alpha*(1.-smoothstep(.12,.5,d)));}`});
  const points=new T.Points(geometry,material);return {points,update(time:number){material.uniforms.time.value=time;}};
}
