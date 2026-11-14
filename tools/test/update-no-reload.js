// Regression test: a returning player opens the game right after a new release and presses start.
// The page must not reload itself (that used to throw the player back to the title screen).
// usage: node tools/test/update-no-reload.js   (copies the game to a temp folder and serves it on :8771)
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs'), os = require('os'), path = require('path'), { spawn, execSync } = require('child_process');
const site = fs.mkdtempSync(path.join(os.tmpdir(), 'magpop-'));
execSync(`cp -a ${path.resolve(__dirname, '../..')}/. ${site}/ && rm -rf ${site}/.git`);
const srv = spawn('python3', ['-m', 'http.server', '8771'], { cwd: site, stdio: 'ignore' });
(async () => {
  await new Promise(r => setTimeout(r, 800));
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  await p.goto('http://localhost:8771/index.html'); await p.waitForFunction(() => window.MP && MP.ready, null, { timeout: 20000 });
  await p.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 20000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => { MP.Save.data.settings.diffDone = true; MP.Save.data.lookDone = true; MP.Save.data.settings.autoFs = false; MP.Save.save(); });
  const sw = path.join(site, 'sw.js'); fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace(/magnetpop-v(\d+)/, (m, n) => 'magnetpop-v' + (+n + 1)));   // new release
  let loads = 0; p.on('load', () => loads++);
  await p.goto('http://localhost:8771/index.html'); await p.waitForFunction(() => window.MP && MP.ready, null, { timeout: 20000 });
  await p.evaluate(() => MP.App.startStage(1)); await p.waitForTimeout(6000);
  const st = await p.evaluate(() => ({ scene: MP.App.scene, screen: MP.UI.cur }));
  const pass = loads === 1 && st.scene === 'game';
  console.log((pass ? 'PASS' : 'FAIL') + ' no self-reload after a release: still in the game after pressing start', JSON.stringify({ pageLoads: loads, ...st }));
  await b.close(); srv.kill(); fs.rmSync(site, { recursive: true, force: true }); process.exit(pass ? 0 : 1);
})();
