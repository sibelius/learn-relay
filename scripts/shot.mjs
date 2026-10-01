import { chromium } from 'playwright';
const [url, out, w = 1440, h = 900] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
await page.goto(url);
await page.waitForTimeout(+(process.env.WAIT ?? 2500));
await page.screenshot({ path: out });
await browser.close();
