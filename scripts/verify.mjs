// e2e: loads each exercise (starter and solution) in a real browser and runs the checks
// usage: node scripts/verify.mjs [baseUrl] [slugFilter]
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:3100';
const filter = process.argv[3];
const mode = process.argv[4] ?? 'solution'; // solution | starter | both

const res = await fetch(`${base}/api/exercises`);
const exercises = (await res.json()).filter(e => !filter || e.slug.includes(filter));

const browser = await chromium.launch();
let failures = 0;

const runOne = async (exercise, kind) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/`);
  await page.evaluate(([slug, files]) => {
    localStorage.clear();
    if (files) localStorage.setItem(`learn-relay:files:${slug}`, JSON.stringify(files));
  }, [exercise.slug, kind === 'solution' ? exercise.solution : null]);
  await page.goto(`${base}/exercises/${exercise.slug}`);
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: '✓ Check', exact: true }).click();
  let state;
  const start = Date.now();
  while (Date.now() - start < 60000) {
    await page.waitForTimeout(500);
    state = JSON.parse((await page.evaluate(() => document.body.dataset.checks)) ?? '{}');
    if (state.done || state.compileErrors?.length || (state.runtimeError && Date.now() - start > 8000)) break;
  }
  const ok = state.done && state.results.every(r => r.status === 'passed');
  const label = `${exercise.slug} [${kind}]`;
  if (kind === 'solution' ? !ok : ok) failures++;
  console.log(`${ok ? '✅' : '❌'} ${label}`);
  for (const r of state.results ?? []) console.log(`   ${r.status === 'passed' ? '✓' : r.status === 'failed' ? '✕' : '○'} ${r.title}${r.message ? `\n       ${r.message.replace(/\n/g, '\n       ')}` : ''}`);
  if (state.compileErrors?.length) console.log('   compile errors:', JSON.stringify(state.compileErrors));
  if (state.runtimeError) console.log('   runtime error:', state.runtimeError);
  if (state.tests?.length) for (const t of state.tests) console.log(`   test ${t.status}: ${t.name}${t.error ? ' -> ' + t.error : ''}`);
  if (errors.length) console.log('   page errors:', errors.slice(0, 3));
  await context.close();
};

for (const exercise of exercises) {
  if (mode === 'solution' || mode === 'both') await runOne(exercise, 'solution');
  if (mode === 'starter' || mode === 'both') await runOne(exercise, 'starter');
}
await browser.close();
console.log(failures ? `\n${failures} unexpected results` : '\nall good');
process.exit(failures ? 1 : 0);
