import * as T from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {waveGLSL,sampleRiver} from './waves';

const common=`
 uniform float time;uniform vec4 wake;uniform vec2 halfExtent;uniform vec2 riverCenter;
 ${waveGLSL}
 float edgeDistance(vec2 p){vec2 e=halfExtent-abs(p-riverCenter);return min(e.x,e.y);}
 float bankFade(vec2 p){return smoothstep(.08,1.15,edgeDistance(p));}
 float wakeHeight(vec2 p){
   vec2 heading=vec2(-cos(wake.z),sin(wake.z)),side=vec2(-heading.y,heading.x),delta=p-wake.xy;
   float behind=-dot(delta,heading),across=abs(dot(delta,side));
   float trail=exp(-pow((across-.34*behind)/.24,2.))*smoothstep(.35,1.3,behind)*(1.-smoothstep(5.,9.,behind));
   float bow=exp(-pow((length(vec2(dot(delta,heading)*.35,dot(delta,side)))-.85)/.22,2.))*.18;
   return wake.w*.021*(trail*sin(behind*8.5-time*6.0)+bow*sin(length(delta)*12.-time*4.));
 }
`;

/** Displaced water, analytic normals, planar reflections, sun glints and moving wakes. */
export function createRiver(width:number,depth:number,z:number){
 const geometry=new T.PlaneGeometry(width,depth,Math.min(440,Math.max(24,Math.ceil(width/.5))),Math.min(192,Math.max(24,Math.ceil(depth/.35))));
 const uniforms=T.UniformsUtils.merge([T.UniformsLib.lights,T.UniformsLib.fog,{
   tDiffuse:{value:null},color:{value:new T.Color()},textureMatrix:{value:new T.Matrix4()},time:{value:0},
   halfExtent:{value:new T.Vector2(width/2,depth/2)},riverCenter:{value:new T.Vector2(0,z)},wake:{value:new T.Vector4(0,0,0,0)},
   sunDirection:{value:new T.Vector3(-10.65,18,21.5).normalize()},
 }]);
 const water=new Reflector(geometry,{textureWidth:1024,textureHeight:512,multisample:0,clipBias:.008,shader:{name:'LivingRiver',uniforms,
  vertexShader:`
   #include <common>
   #include <shadowmap_pars_vertex>
   #include <fog_pars_vertex>
   uniform mat4 textureMatrix;varying vec4 vMirror;varying vec3 vWorld;varying vec2 vSurface;
   ${common}
   void main(){
     vec3 base=(modelMatrix*vec4(position,1.)).xyz;vSurface=base.xz;
     vec3 offset,n;riverSurface(base.xz,time,offset,n);offset*=bankFade(base.xz);offset.y+=wakeHeight(base.xz);
     vec3 displaced=position+vec3(offset.x,-offset.z,offset.y);
     vec4 worldPosition=modelMatrix*vec4(displaced,1.);vWorld=worldPosition.xyz;
     vec4 mvPosition=viewMatrix*worldPosition;gl_Position=projectionMatrix*mvPosition;
     vMirror=textureMatrix*vec4(displaced,1.);
     vec3 transformedNormal=mat3(viewMatrix)*n;
     #include <shadowmap_vertex>
     #include <fog_vertex>
   }`,
  fragmentShader:`
   #include <common>
   #include <packing>
   #include <shadowmap_pars_fragment>
   uniform bool receiveShadow;
   #include <shadowmask_pars_fragment>
   #include <fog_pars_fragment>
   uniform sampler2D tDiffuse;uniform vec3 sunDirection;
   varying vec4 vMirror;varying vec3 vWorld;varying vec2 vSurface;
   ${common}
   void main(){
     vec3 offset,n;riverSurface(vSurface,time,offset,n);float fade=bankFade(vSurface);
     n=normalize(mix(vec3(0.,1.,0.),n,fade));
     // Capillary ripples add detail below the tessellated waves' wavelength.
     float r1=dot(vSurface,vec2(15.2,8.4))-time*3.8,r2=dot(vSurface,vec2(-11.1,19.3))-time*4.7;
     vec2 slope=vec2(15.2,8.4)*cos(r1)*.0032+vec2(-11.1,19.3)*cos(r2)*.0021;
     slope+=vec2(wakeHeight(vSurface+vec2(.025,0.))-wakeHeight(vSurface-vec2(.025,0.)),wakeHeight(vSurface+vec2(0.,.025))-wakeHeight(vSurface-vec2(0.,.025)))/.05;
     n=normalize(n-vec3(slope.x,0.,slope.y)*mix(.45,1.,fade));
     vec3 view=normalize(cameraPosition-vWorld);float nv=max(dot(n,view),.001);
     float fresnel=.02037+.97963*pow(1.-nv,5.);
     vec2 uv=vMirror.xy/vMirror.w+n.xz*.065*clamp(4./max(vMirror.w,1.),.35,1.5);
     vec3 reflection=texture2D(tDiffuse,clamp(uv,vec2(.002),vec2(.998))).rgb;
     float opticalDepth=mix(.35,2.3,fade);vec3 absorption=exp(-vec3(.70,.26,.18)*opticalDepth);
     vec3 body=vec3(.035,.115,.075)*absorption+vec3(.014,.035,.022)*(1.-absorption);
     float shadow=getShadowMask();vec3 c=mix(body*mix(.48,1.,shadow),reflection,fresnel);
     // Rough microfacet sunlight: the moving highlight follows the surface normal.
     vec3 h=normalize(view+sunDirection);float nh=max(dot(n,h),0.),nl=max(dot(n,sunDirection),0.),vh=max(dot(view,h),0.);
     float rough=.15+min(.10,length(fwidth(n))*.7),a2=pow(rough,4.);
     float d=a2/(3.14159265*pow(nh*nh*(a2-1.)+1.,2.));
     float vis=.5/max(nl*sqrt(nv*nv*(1.-a2)+a2)+nv*sqrt(nl*nl*(1.-a2)+a2),.001);
     float f=.02037+.97963*pow(1.-vh,5.);c+=vec3(5.2,4.7,3.7)*min(8.,d*vis*f*nl)*shadow;
     float edge=edgeDistance(vSurface);float foam=(1.-smoothstep(.025,.13,edge))*(.4+.6*sin(vSurface.x*6.+vSurface.y*4.+time)*sin(vSurface.x*6.+vSurface.y*4.+time));
     c=mix(c,vec3(.35,.40,.32),foam*.11);
     gl_FragColor=vec4(c,1.);
     #include <fog_fragment>
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
   }`,
 }});
 const material=water.material as T.ShaderMaterial;material.lights=true;material.fog=true;
 water.rotation.x=-Math.PI/2;water.position.set(0,-.045,z);water.name='reflective-river';water.receiveShadow=true;
 const reflect=water.onBeforeRender;let reflecting=false;
 water.onBeforeRender=function(renderer,scene,camera,geo,mat,group){
   if(scene.overrideMaterial||reflecting)return;
   material.uniforms.riverCenter.value.set(water.position.x,water.position.z);
   reflecting=true;try{reflect.call(this,renderer,scene,camera,geo,mat,group);}finally{reflecting=false;}
 };
 return {water,update(time:number){material.uniforms.time.value=time;},
   setWake(x:number,z:number,yaw:number,strength:number){material.uniforms.wake.value.set(x,z,yaw,T.MathUtils.clamp(strength,0,1));},
   sample:(x:number,z:number,time:number)=>sampleRiver(x,z,time),
 };
}
