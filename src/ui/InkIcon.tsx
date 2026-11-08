type InkIconName = 'scroll' | 'book' | 'eye' | 'hand' | 'settings';
const strokes: Record<InkIconName, string> = {
  scroll: 'M6 4h12v14H7M6 4a2 2 0 0 0-2 2v11a3 3 0 0 0 3 3h12a2 2 0 0 0 0-4H7a2 2 0 0 0 0 4M9 8h6M9 11h6',
  book: 'M12 5c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v14M6 8h3M15 8h3M6 11h3M15 11h3',
  eye: 'M2 12c5-8 15-8 20 0-5 8-15 8-20 0Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  hand: 'M8 12V6a1.5 1.5 0 0 1 3 0v5-7a1.5 1.5 0 0 1 3 0v7-5a1.5 1.5 0 0 1 3 0v6-3a1.5 1.5 0 0 1 3 0v7c0 4-3 6-6 6h-1c-3 0-4-2-6-4l-3-4c-1-2 1-3 2-2l3 2',
  settings: 'M5 6h14M5 12h14M5 18h14M9 4v4M15 10v4M10 16v4',
};
export function InkIcon({name}:{name:InkIconName}) {
  return <svg className="ink-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"><path d={strokes[name]}/></svg>;
}
