import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const [,, html, outDir, mode] = process.argv;
const FPS = Number(process.env.FPS || 30);
const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: Number(process.env.W || 1920), height: Number(process.env.H || 1080) }, deviceScaleFactor: Number(process.env.DSF || 1) });  // DSF=2: superamostragem, reduzir no encode
const errs = []; p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push(String(e)));
await p.goto('file://' + html + '?capture=1', { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
mkdirSync(outDir, { recursive: true });
const dur = await p.evaluate(() => window.DURATION || 15);
const times = mode === 'stills' ? process.env.STILLS.split(',').map(Number)
  : Array.from({ length: Math.round(dur * FPS) }, (_, i) => i / FPS);
const FROM = Number(process.env.FROM || 0), TO = Number(process.env.TO || times.length);
for (const [i, t] of times.entries()) {
  if (i < FROM || i >= TO) continue;
  await p.evaluate(t => window.renderAt(t), t);
  await p.screenshot({ path: `${outDir}/${mode === 'stills' ? 't' + t : String(i).padStart(5, '0')}.png` });
}
if (process.env.VO_OUT) { const fs = await import('node:fs'); fs.writeFileSync(process.env.VO_OUT, JSON.stringify(await p.evaluate(() => window.VO || []))); }
if (process.env.CUES_OUT) { const fs = await import('node:fs'); fs.writeFileSync(process.env.CUES_OUT, JSON.stringify(await p.evaluate(() => window.CUES || []))); }
console.log('frames', times.length, 'errors', JSON.stringify(errs));
await b.close();
