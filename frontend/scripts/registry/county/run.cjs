const L = require('./lib.cjs');
const out = process.argv[2];
const AREAS = ["-1L","10101L","10102L","10103L","10104L","10109L","10110L","10111L","10190L","10212L","10213L","10214L","10215L","10307L","10308L","10316L","10405L","10406L","10417L","10518L","10519L","10520L","10521L"];
const JOBS = [
  ['inc_both', 'theme_inc', 'inc_latest5', 'inc.obs', ['-1L'], ['21L','58L','121L','16L','14L']],
  ['inc_female', 'theme_inc', 'inc_latest5', 'inc.obs', ['1L'], ['24L','26L']],
  ['mort_both', 'theme_mort', 'mort_latest5', 'mort.obs', ['-1L'], ['21L','58L','121L','16L','14L']],
  ['mort_female', 'theme_mort', 'mort_latest5', 'mort.obs', ['1L'], ['24L','26L']],
  ['stage_both', 'theme_inc', 'inc_stage', 'inc.obs', ['-1L'], ['21L','58L','121L','16L','14L']],
  ['stage_female', 'theme_inc', 'inc_stage', 'inc.obs', ['1L'], ['24L','26L']],
  ['pstage_both', 'theme_preliminary_inc', 'inc_stage_preliminary_2025', 'preliminary_inc.obs', ['-1L'], ['21L','58L','121L','16L','14L']],
  ['pstage_female', 'theme_preliminary_inc', 'inc_stage_preliminary_2025', 'preliminary_inc.obs', ['1L'], ['24L','26L']],
  ['pinc_both', 'theme_preliminary_inc', 'inc_latest5_preliminary_2025', 'preliminary_inc.obs', ['-1L'], ['21L','58L','121L','16L','14L']],
  ['pinc_female', 'theme_preliminary_inc', 'inc_latest5_preliminary_2025', 'preliminary_inc.obs', ['1L'], ['24L','26L']],
];
const only = process.argv[3] ? process.argv[3].split(',') : null;
(async () => {
  const { b, p } = await L.open();
  for (const [name, theme, tabu, vt, sex, sites] of JOBS) {
    if (only && !only.includes(name)) continue;
    await L.setSel(p, 'value_theme', theme);
    await L.setSel(p, 'tabu', tabu);
    await L.setSel(p, 'value_type', vt);
    await L.setSel(p, 'in.subset.sex', sex);
    await L.setSel(p, 'in.subset.area', AREAS);
    await L.setSel(p, 'in.subset.sites', sites);
    const iv = await p.evaluate(() => { const v = Shiny.shinyapp.$inputValues; return Object.fromEntries(['value_theme','tabu','value_type','in.subset.sex','in.subset.area','in.subset.sites'].map(k => [k, v[k]])); });
    const ok = JSON.stringify(iv['in.subset.sites']) === JSON.stringify(sites) && iv['in.subset.area'].length === AREAS.length && iv.tabu === tabu && iv.value_type === vt;
    console.log(name, ok ? 'inputs OK' : 'INPUT MISMATCH ' + JSON.stringify(iv));
    await L.submit(p);
    await p.click('a[data-value="2"], #tabset_panel a:nth-of-type(2)').catch(e => console.log('tab', e.message));
    await L.idle(p, 2000);
    await p.screenshot({ path: `${out}/${name}.png` });
    await L.download(p, 'download_csv', `${out}/${name}.csv`);
    await L.download(p, 'download_xlsx', `${out}/${name}.xlsx`);
    await p.click('a[data-value="1"]').catch(() => {});
  }
  await b.close();
})();
