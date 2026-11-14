// Verify one synthetic new-URL gameplay session in production analytics.
// Always delete ONLY the generated UUID rows; never inspect/log real session IDs.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const session=randomUUID();
const origin='https://hanage.app';
const endpoint=origin+'/games/multicolor-sweeper/play/api/gameplay-events';
const config='wrangler.hub-production.jsonc';
function query(command) {
  const out=execFileSync('npx',['--yes','wrangler@4.148.0','d1','execute','multicolor-sweeper-ranking','--remote','--json','--config',config,'--command',command],{encoding:'utf8',timeout:60000});
  const parsed=JSON.parse(out);
  if(!Array.isArray(parsed)||!parsed[0]?.success)throw new Error('D1 verification query failed');
  return parsed[0].results;
}
try{
  const event=(event,mineCount,colorCount)=>({
    session,event,source:'direct',mineCount,colorCount,
  });
  for(const data of [event('visit',0,0),event('first_cell_open',20,4)]){
    const response=await fetch(endpoint,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(20000)});
    assert.equal(response.status,204,`New URL analytics ${data.event}`);
  }
  let rows=[];
  for(let i=0;i<10;i++){
    rows=query(`SELECT event,site_variant FROM gameplay_events WHERE session_id='${session}' ORDER BY event`);
    if(rows.length===2)break;
    await new Promise(r=>setTimeout(r,1800));
  }
  assert.deepEqual(rows,[
    {event:'first_cell_open',site_variant:'hub'},
    {event:'visit',site_variant:'hub'},
  ]);
  console.log('PASS: new Sweeper gameplay events persisted as hub variant; separate old/new counts are supported');
}finally{
  query(`DELETE FROM gameplay_events WHERE session_id='${session}'`);
  console.log('PASS: synthetic visit removed without touching player records');
}
