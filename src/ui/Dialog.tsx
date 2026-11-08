import { useEffect, useRef, type ReactNode } from 'react';
export function Dialog({label,onClose,children,wide=false,game=false}:{label:string;onClose:()=>void;children:ReactNode;wide?:boolean;game?:boolean}) {
  const ref=useRef<HTMLDivElement>(null); const closeRef=useRef(onClose);closeRef.current=onClose;
  useEffect(()=>{ const previous=document.activeElement as HTMLElement|null;const node=ref.current;node?.focus();
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeRef.current();}if(e.key==='Tab'&&node){const els=Array.from(node.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]')).filter(el=>el.getClientRects().length>0&&!el.closest('[inert],[aria-hidden="true"]'));const first=els[0],last=els.at(-1);if(!first){e.preventDefault();return;}if(e.shiftKey&&(document.activeElement===first||document.activeElement===node)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===node)){e.preventDefault();first.focus();}}};
    document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);if(previous?.isConnected)previous.focus({preventScroll:true});};
  },[]);
  return <div className={`dialog-scrim ${game?'game-scrim':''}`} onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div className={`paper-dialog ${wide?'wide':''} ${game?'game-dialog':''}`} ref={ref} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}><div className="dialog-close-rail"><button className="close" aria-label={`关闭${label}`} onClick={onClose}>×</button></div>{children}</div></div>;
}
