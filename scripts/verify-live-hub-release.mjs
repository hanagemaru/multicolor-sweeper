// Read-only production smoke: no score submissions, deletes, or ranking data mutation.
import assert from 'node:assert/strict';
const oldBase='https://mcsweeper.hanage.app/';
const hubBase='https://hanage.app/games/multicolor-sweeper/play/';
async function get(url) {
  const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});
  return response;
}
async function retry200(url) {
  let last='';
  for(let i=0;i<16;i++){
    try {
      const response=await get(url);
      if(response.status===200)return response;
      last=`HTTP ${response.status}`;
    }catch(e){last=String(e);}
    await new Promise(r=>setTimeout(r,2500));
  }
  throw new Error(`GET ${url}: ${last}`);
}
for(const url of ['https://hanage.app/','https://hanage.app/games/multicolor-sweeper/',oldBase]){
  assert.equal((await retry200(url)).status,200);
}
const game=await retry200(hubBase);
assert.equal(new URL(game.url).origin,'https://hanage.app');
const html=await game.text();
assert.ok(html.includes('https://hanage.app/games/multicolor-sweeper/play/'));
const js=html.match(/src="(\/games\/multicolor-sweeper\/play\/assets\/[^"]+\.js)"/);
assert.ok(js,'Game entry JS must be scoped to the new path');
assert.equal((await retry200('https://hanage.app'+js[1])).status,200);
const manifest=await (await retry200(hubBase+'manifest.webmanifest')).json();
assert.equal(manifest.start_url,'/games/multicolor-sweeper/play/');
assert.equal(manifest.scope,'/games/multicolor-sweeper/play/');
assert.equal((await retry200(hubBase+'sw.js')).status,200);
const health=await (await retry200(hubBase+'api/health')).json();
assert.equal(health.ok,true);
for(const mineCount of [15,20,25]){
  const path=`api/rankings?mineCount=${mineCount}&limit=50`;
  const [old,newer]=await Promise.all([retry200(oldBase+path),retry200(hubBase+path)]);
  const before=await old.json(), now=await newer.json();
  assert.deepEqual(now.entries,before.entries,`Same ${mineCount}-mine board from old and new URLs`);
  // Avoid assuming same anonymous player identity across distinct origins.
  console.log(`PASS: old/new Sweeper ${mineCount}-mine rankings identical (${now.entries.length} displayed entries)`);
}
console.log('PASS: Sweeper hub game, assets, PWA, existing URL, shared D1 leaderboard (GET only)');
