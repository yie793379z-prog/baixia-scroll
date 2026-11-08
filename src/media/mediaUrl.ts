const PUBLIC_MEDIA_ORIGIN='https://harmonious-dango-b44962.netlify.app';
/** Sites can serve the same public media bytes directly from their CDN. */
export function mediaUrl(path:string):string {
 if(typeof document==='undefined')return path;
 const origin=document.querySelector<HTMLMetaElement>('meta[name="baixia-media-origin"]')?.content;
 return origin===PUBLIC_MEDIA_ORIGIN&&/^\/(audio|painting-videos-v2|review|culture|cinematic)\//.test(path)?origin+path:path;
}
