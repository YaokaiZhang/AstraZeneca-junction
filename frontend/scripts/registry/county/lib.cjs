const { chromium } = require('playwright');
const URL = 'https://tilastot.syoparekisteri.fi/syovat/?_inputs_&language=%22en%22';
async function open() {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1, acceptDownloads: true });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'load', timeout: 90000 });
  await p.waitForFunction(() => window.Shiny && Shiny.shinyapp && Shiny.shinyapp.$inputValues && document.querySelector('#tabu') && document.querySelector('#tabu').selectize && Object.keys(document.querySelector('#tabu').selectize.options).length > 0, null, { timeout: 90000 });
  await p.waitForTimeout(3000);
  return { b, p };
}
async function idle(p, extra = 1500) {
  await p.waitForTimeout(500);
  await p.waitForFunction(() => !document.documentElement.classList.contains('shiny-busy'), null, { timeout: 120000 });
  await p.waitForTimeout(extra);
}
async function setSel(p, id, val) {
  await p.evaluate(([id, val]) => { const s = document.getElementById(id).selectize; s.setValue(val); }, [id, val]);
  await idle(p);
}
async function getOpts(p, id) {
  return p.evaluate((id) => { const s = document.getElementById(id).selectize; return { opts: Object.values(s.options).map(o => [o.value, o.label]), val: s.getValue() }; }, id);
}
async function submit(p) {
  await p.click('#submit');
  await idle(p, 3000);
}
async function download(p, which, path) {
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 120000 }), p.evaluate((w) => document.getElementById(w).click(), which)]);
  await dl.saveAs(path);
  return path;
}
module.exports = { open, idle, setSel, getOpts, submit, download };
