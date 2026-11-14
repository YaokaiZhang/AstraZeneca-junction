// usage: node fetch.js <name> <theme> <tabu> <value_type> <sites,comma> [sex,comma]
const { chromium } = require('playwright');
const [name, theme, tabu, vtype, sites, sex] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ deviceScaleFactor: 1, viewport: { width: 1400, height: 1100 }, acceptDownloads: true });
  const p = await ctx.newPage();
  await p.goto('https://tilastot.syoparekisteri.fi/syovat/', { waitUntil: 'load', timeout: 60000 });
  await p.waitForFunction(() => window.Shiny && Shiny.shinyapp && Shiny.shinyapp.isConnected() && document.getElementById('tabu') && document.getElementById('tabu').selectize, null, { timeout: 60000 });
  await p.waitForTimeout(4000);
  const setSel = async (id, v) => {
    await p.evaluate(([id, v]) => { const s = document.getElementById(id).selectize; s.setValue(v); }, [id, v]);
    await p.waitForTimeout(2500);
    return p.evaluate((id) => document.getElementById(id).selectize.getValue(), id);
  };
  // English
  await p.evaluate(() => { const r = document.querySelector('#language input[value="en"]'); if (r) r.click(); });
  await p.waitForTimeout(4000);
  const log = {};
  log.theme = await setSel('value_theme', theme);
  log.area = await setSel('in.subset.area', ['-1L']);
  log.sex = await setSel('in.subset.sex', (sex || '0L,1L').split(','));
  log.sites = await setSel('in.subset.sites', sites.split(','));
  log.tabu = await setSel('tabu', tabu);
  log.vtype = await setSel('value_type', vtype);
  log.labels = await p.evaluate(() => ['value_theme','tabu','value_type','in.subset.sites','in.subset.sex'].map(id => { const s = document.getElementById(id).selectize; return [id, [].concat(s.getValue()).map(v => s.options[v] && s.options[v].text)]; }));
  await p.click('#submit');
  await p.waitForTimeout(8000);
  await p.click('a[data-value="2"], #tab-2581-2', { timeout: 5000 }).catch(()=>{});
  await p.evaluate(() => { const a=[...document.querySelectorAll('#tabset_panel a')].find(a=>/table/i.test(a.textContent)); if(a) a.click(); });
  await p.waitForTimeout(5000);
  await p.screenshot({ path: `raw/${name}.png` });
  log.btns = await p.evaluate(() => [...document.querySelectorAll('#download_table_buttons a, #download_table_buttons button, #download_csv')].map(e => [e.id, e.tagName, e.getAttribute('href'), getComputedStyle(e).display, e.offsetParent!==null]));
  console.error(JSON.stringify(log.btns));
  // switch to table tab and back is not needed for download
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.click('#download_csv').catch(async () => { await p.click('#download_table_buttons'); await p.waitForTimeout(500); await p.click('#download_csv'); })]);
  await dl.saveAs(`raw/${name}.csv`);
  log.file = `raw/${name}.csv`; log.suggested = dl.suggestedFilename();
  console.log(JSON.stringify(log));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
