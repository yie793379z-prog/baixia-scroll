import * as T from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
export type VisualQuality = 'fine' | 'light';
/** Shared linear-light pipeline; all targets are released when leaving a game. */
export function createRendering(renderer: T.WebGLRenderer, scene: T.Scene, camera: T.PerspectiveCamera) {
  renderer.outputColorSpace = T.SRGBColorSpace;
  const landscape=String(scene.userData.artDirection).startsWith('landscapes-v');
  renderer.toneMapping = landscape?T.AgXToneMapping:T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = landscape?1.12:1.02;
  // The same sky lights rough surfaces, glazed pottery and the reflected river.
  // Isolate it from the game geometry so the fallback world cannot enter the IBL.
  const skyScene=new T.Scene(),sky=scene.getObjectByName('morning-sky');
  if(sky)skyScene.add(sky.clone());
  const skyCopy=skyScene.getObjectByName('morning-sky') as T.Mesh<T.BufferGeometry,T.ShaderMaterial>|undefined;
  if(skyCopy?.material.uniforms.showSunDisc)skyCopy.material=skyCopy.material.clone();
  if(skyCopy?.material.uniforms.showSunDisc)skyCopy.material.uniforms.showSunDisc.value=false;
  const pmrem=new T.PMREMGenerator(renderer);
  const environment=pmrem.fromScene(skyScene,.055,.1,200);
  if(landscape){scene.environment=environment.texture;scene.environmentIntensity=.52;}
  pmrem.dispose();if(skyCopy&&skyCopy.material!==(sky as T.Mesh)?.material)skyCopy.material.dispose();
  const lightingAbort=new AbortController();let hdr:T.DataTexture|null=null;
  if(landscape)void fetch('/models/landscapes-v03/daylight.hdr',{signal:lightingAbort.signal})
    .then(r=>{if(!r.ok)throw new Error('daylight unavailable');return r.arrayBuffer();})
    .then(buffer=>{if(lightingAbort.signal.aborted)return;const data=new HDRLoader().parse(buffer);
      hdr=new T.DataTexture(data.data,data.width,data.height,T.RGBAFormat,data.type);
      hdr.mapping=T.EquirectangularReflectionMapping;hdr.colorSpace=T.LinearSRGBColorSpace;hdr.flipY=true;
      hdr.minFilter=hdr.magFilter=T.LinearFilter;hdr.needsUpdate=true;
      scene.environment=hdr;scene.environmentIntensity=.42;scene.environmentRotation.y=1.3;
      // Keep the analytic sky visible; HDR contributes illumination and material reflections.
      scene.background=null;if(sky)sky.visible=true;
    }).catch(()=>{/* Authored local sky remains available when the HDR is unavailable. */});
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  const composer = new EffectComposer(renderer);
  const render = new RenderPass(scene, camera);
  const ao = new GTAOPass(scene, camera, 1, 1);
  ao.blendIntensity = .35;
  ao.updateGtaoMaterial({ radius: .42, thickness: .65, distanceFallOff: 1, samples: 12, scale: 1 });
  ao.updatePdMaterial({ radius: 5, samples: 8, depthPhi: 2, normalPhi: 3 });
  // Alpha-cut foliage already receives matched sun shadows and thin-leaf lighting.
  // Exclude its transparent card rectangles from the solid normal/depth AO pass.
  const aoRender=ao.render.bind(ao);let foliageRevision:unknown=null;const alphaFoliage:T.Mesh[]=[];
  ao.render=(...args:Parameters<typeof ao.render>)=>{
    if(foliageRevision!==scene.userData.heroAsset){foliageRevision=scene.userData.heroAsset;alphaFoliage.length=0;
      scene.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material)&&o.material.alphaTest>0&&/foliage/.test(o.material.name))alphaFoliage.push(o);});}
    const visible=alphaFoliage.filter(o=>o.visible);for(const o of visible)o.visible=false;
    try{aoRender(...args);}finally{for(const o of visible)o.visible=true;}
  };

  // Landscape highlights come from sunlight, water and HDR reflections. The
  // extra HDR bloom blur produced black frames in the cart's real browser check.
  const bloom = new UnrealBloomPass(new T.Vector2(1, 1), .065, .35, 1.8);
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
      void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;float l=dot(c,vec3(.2126,.7152,.0722));
        c=mix(vec3(l),c,1.025);
        vec2 q=(vUv-.5)*vec2(1.0,.75);c*=1.0-.09*dot(q,q);gl_FragColor=vec4(c,1.0);}`,
  });
  const output = new OutputPass(), aa = new SMAAPass();
  [render, ao, bloom, grade, output, aa].forEach(pass => composer.addPass(pass));
  let quality: VisualQuality = 'fine', width = 1, height = 1;
  const resize = (w: number, h: number) => {
    width = Math.max(1, w); height = Math.max(1, h);
    const ratio = Math.min(window.devicePixelRatio || 1, quality === 'fine' ? 1.65 : 1, Math.sqrt(2400000/(width*height)));
    renderer.setPixelRatio(ratio);renderer.setSize(width, height);
    composer.setPixelRatio(ratio);composer.setSize(width, height);
    ao.setSize(Math.ceil(width * ratio * .5), Math.ceil(height * ratio * .5));
    camera.aspect = width / height;camera.updateProjectionMatrix();
  };
  let lastShadow=0;
  return { render: () => {const now=performance.now();if(now-lastShadow>33){renderer.shadowMap.needsUpdate=true;lastShadow=now;}composer.render();}, resize,
    setQuality(next: VisualQuality) {quality=next;ao.enabled=next==='fine';bloom.enabled=!landscape&&next==='fine';resize(width,height);},
    dispose() {lightingAbort.abort();scene.environment=null;scene.background=null;hdr?.dispose();environment.dispose();for (const pass of composer.passes) pass.dispose();composer.dispose();},
  };
}
