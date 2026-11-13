// Renders SVG frames into PNG sprite sheets with headless Chromium.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs'), path = require('path');
let browser;
async function getBrowser() { if (!browser) browser = await chromium.launch(); return browser; }
async function close() { if (browser) await browser.close(); browser = null; }
/** frames: array of svg strings drawn around origin; cell {w,h,ax,ay}; returns sheet info */
async function sheet(file, defs, frames, cell, cols, scale = 2, bg = null) {
  const rows = Math.ceil(frames.length / cols), W = cols * cell.w, H = rows * cell.h;
  let body = '';
  frames.forEach((fr, i) => {
    const cx = (i % cols) * cell.w, cy = Math.floor(i / cols) * cell.h;
    body += `<svg x="${cx}" y="${cy}" width="${cell.w}" height="${cell.h}" viewBox="0 0 ${cell.w} ${cell.h}" overflow="hidden"><g transform="translate(${cell.ax},${cell.ay})">${fr}</g></svg>`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs>${body}</svg>`;
  await shot(file, svg, W, H, scale, bg);
  return { w: cell.w, h: cell.h, ax: cell.ax, ay: cell.ay, cols, n: frames.length, scale };
}
async function shot(file, svg, W, H, scale = 1, bg = null, jpegQ = 0) {
  const b = await getBrowser();
  const page = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: scale });
  const fontUrl = 'file://' + path.resolve(__dirname, '../assets/fonts/Jua-Regular.woff2');
  await page.setContent(`<html><head><style>@font-face{font-family:Jua;src:url('${fontUrl}')}html,body{margin:0;background:${bg || 'transparent'};}svg{display:block}text{font-family:Jua,sans-serif}</style></head><body>${svg}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (jpegQ) await page.screenshot({ path: file, type: 'jpeg', quality: jpegQ });
  else await page.screenshot({ path: file, omitBackground: !bg });
  await page.close();
}
module.exports = { sheet, shot, close };
