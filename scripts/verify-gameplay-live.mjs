// Verify only our synthetic production rows; always remove them on completion.
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
const origin = 'https://mcsweeper.hanage.app';
const session = randomUUID();
const query = command => {
  const result = JSON.parse(execFileSync('npx', ['wrangler','d1','execute','multicolor-sweeper-ranking','--remote','--json','--command',command], { encoding: 'utf8' }));
  if (!result.every(item => item.success)) throw Error('Production D1 query failed');
  return result[0].results;
};
try {
  let verified = false;
  for (let attempt = 0; attempt < 6; attempt++) {
    for (const event of ['visit','first_cell_open','first_cell_open']) {
      const response = await fetch(`${origin}/api/gameplay-events`, {
        method:'POST', headers:{Origin:origin,'Content-Type':'application/json'},
        body:JSON.stringify({session,event,source:'direct',mineCount:event==='visit'?0:20,colorCount:event==='visit'?0:4}),
        signal:AbortSignal.timeout(20000),
      });
      if (response.status !== 204 && response.status !== 404) throw Error(`Event API: ${response.status}`);
    }
    const rows = query(`SELECT event,mine_count,color_count FROM gameplay_events WHERE session_id='${session}' ORDER BY event`);
    if (rows.length===2 && rows[0].event==='first_cell_open' && rows[0].mine_count===20 && rows[0].color_count===4 && rows[1].event==='visit') {verified=true;break;}
    if (attempt < 5) await delay(3000);
  }
  if (!verified) throw Error('Production gameplay persistence or deduplication failed');
  console.log('Production gameplay: visit + first_cell_open persisted once; 4-color dimensions verified.');
} finally {
  query(`DELETE FROM gameplay_events WHERE session_id='${session}'`);
}
