export const artwork = {
  imageId: 'fengning_1794', title: '仿宋院本金陵图', artist: '冯宁', year: 1794,
  width: 132458, height: 4146,
  dziUrl: '/tiles/fengning/scroll.dzi',
  // Framing parameter only. P0 slice 01 offset is 114197; visual right-edge detection is near 16626 locally.
  // Keep all original pixels in DZI; this does not crop the artwork or identify a cultural scene.
  initialRightPx: 130800,
  versionNote: '清 · 冯宁 · 1794年',
  fiction: '见微、客店委托与行旅叙事均为创作演绎，并非已考证的画中人物。',
} as const;