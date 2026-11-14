import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = 'https://sweeper-hub-preview.jibunnha.workers.dev/games/multicolor-sweeper/play/';
const browser = await chromium.launch({ headless:true, args:['--no-sandbox'] });
try {
  const context = await browser.newContext({
    locale:'ja-JP',
    viewport:{width:390,height:844},
    isMobile:true,
    hasTouch:true,
    serviceWorkers:'block',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let res = await page.goto(base,{waitUntil:'domcontentloaded'});
  assert.equal(res.status(),200);
  await page.locator('.settings-actions').waitFor({timeout:20000});
  const details = page.getByTestId('sweeper-hub-details');
  const howto = page.getByTestId('sweeper-hub-how-to');
  await details.waitFor();
  assert.equal(await details.getAttribute('href'),'https://hanage.app/games/multicolor-sweeper/');
  assert.equal(await howto.getAttribute('href'),'https://hanage.app/games/multicolor-sweeper/how-to-play/');
  assert.equal(await details.getAttribute('target'),'_blank', 'independent preview uses separate tab for cross-site link');
  assert.equal(await howto.getAttribute('target'),'_blank');
  assert.equal(await page.getByTestId('sweeper-new-site-link').count(),0);
  await page.locator('.ranking-button').click();
  await page.locator('.ranking-screen').waitFor({timeout:15000});
  await page.locator('.ranking-table').waitFor();
  assert.ok(errors.length === 0, `Browser JS errors: ${errors.slice(0,3).join('; ')}`);
  console.log('PASS: real mobile browser Sweeper menu, hub links and preview D1 leaderboard');
  await context.close();
} finally { await browser.close(); }
