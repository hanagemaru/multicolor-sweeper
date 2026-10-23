// Only the isolated preview database is used. Remove synthetic rows even on failure.
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
const origin = new URL(process.env.PREVIEW_URL).origin;
if (!/^https:\/\/[a-z0-9-]+-multicolor-sweeper\.jibunnha\.workers\.dev$/.test(origin)) throw Error('Not a preview URL');
const session = randomUUID();
const staleSession = randomUUID();
const query = command => {
  const output = execFileSync('npx', ['wrangler','d1','execute','multicolor-sweeper-ranking-preview','--remote','--config','wrangler.preview.jsonc','--json','--command',command], { encoding: 'utf8' });
  const result = JSON.parse(output);
  if (!result.every(item => item.success)) throw Error('Preview D1 query failed');
  return result[0].results;
};
const post = payload => fetch(`${origin}/api/gameplay-events`, {
  method:'POST', headers:{Origin:origin,'Content-Type':'application/json'},
  body:JSON.stringify(payload), signal:AbortSignal.timeout(20000),
});
try {
  query(`INSERT INTO gameplay_events VALUES ('${staleSession}','visit','direct',0,0,${Date.now()-31*86400000})`);
  const base = {session,source:'share'};
  // First opening can arrive before visit: both must exist once, even after duplicates/retries.
  for (const payload of [
    {...base,event:'first_cell_open',mineCount:20,colorCount:4},
    {...base,event:'first_cell_open',mineCount:20,colorCount:4},
    {...base,event:'visit',mineCount:0,colorCount:0},
  ]) {
    const response = await post(payload);
    if (response.status !== 204) throw Error(`Event API: ${response.status}`);
  }
  const rows = query(`SELECT event,source,mine_count,color_count FROM gameplay_events WHERE session_id='${session}' ORDER BY event`);
  if (rows.length!==2 || rows[0].event!=='first_cell_open' || rows[0].mine_count!==20 || rows[0].color_count!==4 || rows[1].event!=='visit' || rows.some(row=>row.source!=='share')) throw Error('Persistence/deduplication failed');
  if (query(`SELECT event FROM gameplay_events WHERE session_id='${staleSession}'`).length) throw Error('Retention cleanup failed');
  if ((await post({...base,event:'first_cell_open',mineCount:20,colorCount:4,playerId:'must-not-be-stored'})).status!==400) throw Error('Unexpected fields accepted');
  console.log('Preview gameplay: visit + first_cell_open persisted once; 4-color dimensions verified; 30-day cleanup verified; unexpected fields rejected.');
} finally {
  query(`DELETE FROM gameplay_events WHERE session_id IN ('${session}','${staleSession}')`);
}
