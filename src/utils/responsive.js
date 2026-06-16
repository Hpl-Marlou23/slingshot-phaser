let s = 1;
let offX = 0;
let offY = 0;

export function updateResponsiveLayout(viewW, viewH) {
  // Use devicePixelRatio so the canvas scales crisply
  const dpr = window.devicePixelRatio || 1;
  const vw = viewW * dpr;
  const vh = viewH * dpr;
  
  s = Math.min(vw / 1080, vh / 1920);
  offX = (vw - 1080 * s) / 2;
  offY = (vh - 1920 * s) / 2;
}

export function sx(x) {
  return x * s + offX;
}

export function sy(y) {
  return y * s + offY;
}

export function sd(val) {
  return val * s;
}
