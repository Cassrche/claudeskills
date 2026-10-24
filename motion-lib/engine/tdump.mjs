// imprime a linha do tempo T e a DURATION de uma página (para montar cama e conferir tempos)
import { chromium } from 'playwright-core';
const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: Number(process.env.W || 1920), height: Number(process.env.H || 1080) } });
await p.goto('file://' + process.argv[2] + '?capture=1', { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
console.log(JSON.stringify(await p.evaluate(() => ({ T, DURATION }))));
await b.close();
