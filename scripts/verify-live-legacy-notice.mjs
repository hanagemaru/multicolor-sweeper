// Verify actual old Sweeper remains playable with optional link to new Sweeper.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const oldUrl='https://mcsweeper.hanage.app/';
const newUrl='https://hanage.app/games/multicolor-sweeper/play/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
  const context=await browser.newContext({locale:'ja-JP',serviceWorkers:'block'});
  const old=await context.newPage();
  const res=await old.goto(oldUrl,{waitUntil:'domcontentloaded'});
  assert.equal(res.status(),200);
  await old.locator('.settings-actions').waitFor({timeout:20000});
  assert.ok(await old.locator('.start-button').isVisible());
  const notice=old.locator('.legacy-new-site-notice');
  await notice.waitFor({timeout:16000});
  assert.match(await notice.innerText(),/ランキングは新旧共通/);
  assert.match(await notice.innerText(),/プレイヤーID/);
  const link=old.getByTestId('sweeper-new-site-link');
  assert.equal(await link.getAttribute('href'),newUrl);
  assert.equal(await link.getAttribute('target'),'_blank');
  const popupPromise=old.waitForEvent('popup',{timeout:16000});
  await link.click({noWaitAfter:true});
  const hub=await popupPromise;
  await hub.waitForLoadState('domcontentloaded');
  assert.equal(hub.url(),newUrl);
  await hub.locator('.settings-actions').waitFor({timeout:16000});
  assert.ok(await hub.locator('.start-button').isVisible());
  assert.equal(await hub.getByTestId('sweeper-hub-details').getAttribute('target'),null);
  assert.equal(await hub.getByTestId('sweeper-hub-how-to').getAttribute('target'),'_blank');
  console.log('PASS: Sweeper old URL stays playable, notice opens new game in another tab, new game links return correctly');
}finally{await browser.close();}
