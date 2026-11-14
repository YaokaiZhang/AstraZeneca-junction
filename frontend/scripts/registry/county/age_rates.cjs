// National age-specific incidence, 2020-2024, both sexes separately, for all six app cancers.
// usage: node age_rates.cjs raw   -> raw/inc_ag5_rate_{m,f}.csv
const L = require('./lib.cjs');
const out = process.argv[2] || 'raw';
const JOBS = [
  ['inc_ag5_rate_m', ['0L'], ['21L', '58L', '121L', '16L', '14L', '24L']],
  ['inc_ag5_rate_f', ['1L'], ['21L', '58L', '121L', '16L', '14L', '24L', '26L']],
];
(async () => {
  const { b, p } = await L.open();
  for (const [name, sex, sites] of JOBS) {
    await L.setSel(p, 'value_theme', 'theme_inc');
    await L.setSel(p, 'tabu', 'inc_ag5');
    await L.setSel(p, 'value_type', 'inc.rate');
    await L.setSel(p, 'in.subset.sex', sex);
    await L.setSel(p, 'in.subset.area', ['-1L']);
    await L.setSel(p, 'in.subset.sites', sites);
    const iv = await p.evaluate(() => Shiny.shinyapp.$inputValues['in.subset.sites']);
    console.log(name, JSON.stringify(iv));
    await L.submit(p);
    await p.click('a[data-value="2"]').catch(() => {});
    await L.idle(p, 2000);
    await L.download(p, 'download_csv', `${out}/${name}.csv`);
    await p.click('a[data-value="1"]').catch(() => {});
  }
  await b.close();
})();
