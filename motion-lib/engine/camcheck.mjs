// mede a velocidade de tela da câmera (px por quadro a 60 qps) e acha picos e paradas
import { chromium } from 'playwright-core';
const [,, html] = process.argv;
const VW = Number(process.env.W || 1920), VH = Number(process.env.H || 1080), PERSP = Number(process.env.PERSP || 2200);  // vertical: W=1080 H=1920 PERSP=2400
const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: VW, height: VH } });
await p.goto('file://' + html + '?capture=1', { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
const res = await p.evaluate(([VW, VH, PERSP]) => {
  const cx = VW / 2, cy = VH / 2, ox = VW * 0.22, oy = VH * 0.24;
  window.renderAt(0);
  const D = window.DURATION, out = [];
  const M = (C) => new DOMMatrix().translate(cx, cy).rotate(C.rx, 0, 0).rotate(0, C.ry, 0).rotate(0, 0, C.rz).scale(C.s, C.s, 1).translate(-C.fx, -C.fy);
  const proj = (m, x, y) => { const q = m.transformPoint(new DOMPoint(x, y, 0, 1)); const z = q.z, k = PERSP / (PERSP - z); return [cx + (q.x / q.w - cx) * k, cy + (q.y / q.w - cy) * k]; };
  for (let f = 0; f < Math.round(D * 60) - 1; f++) {
    const t = f / 60, t2 = (f + 1) / 60;
    const C = camAt(t), C2 = camAt(t2), s1 = L.scroll(t), s2 = L.scroll(t2);
    const m1 = M(C), m2 = M(C2);
    let mx = 0;
    for (const [dx, dy] of [[0, 0], [-ox, -oy], [ox, -oy], [-ox, oy], [ox, oy]]) {
      const wx = C.fx + dx / C.s, wy = C.fy + dy / C.s, cy = wy + s1;
      const a = proj(m1, wx, wy), bb = proj(m2, wx, cy - s2);
      mx = Math.max(mx, Math.hypot(bb[0] - a[0], bb[1] - a[1]));
    }
    out.push(+mx.toFixed(2));
  }
  return { D, out, T };
}, [VW, VH, PERSP]);
await b.close();
const v = res.out;
const top = v.map((x, i) => [x, i / 60]).sort((a, b) => b[0] - a[0]).slice(0, 12);
console.log('duração', res.D, 'quadros', v.length);
console.log('picos (px/quadro @ s):', top.map(([x, t]) => `${x}@${t.toFixed(2)}`).join('  '));
const still = []; let run = 0;
v.forEach((x, i) => { if (x < 0.35) { run++; if (run === 18) still.push((i - 17) / 60); } else run = 0; });
console.log('paradas >0,3s (início):', still.map((t) => t.toFixed(2)).join(' ') || 'nenhuma');
const sec = []; for (let s0 = 0; s0 < res.D; s0 += 1) { const seg = v.slice(s0 * 60, s0 * 60 + 60); sec.push(Math.max(...seg).toFixed(1)); }
console.log('máx por segundo:', sec.join(' '));
