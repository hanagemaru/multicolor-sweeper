import { describe, expect, it, vi } from 'vitest';
import { receiveGameplay } from './gameplay-analytics';
const origin = 'https://pr-54-multicolor-sweeper.jibunnha.workers.dev';
const payload = {session:'12345678-1234-4234-8234-123456789abc',event:'first_cell_open',source:'share',mineCount:20,colorCount:4};
function request(body: unknown = payload, extra: Record<string,string> = {}) {
  return new Request(`${origin}/api/gameplay-events`, {method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...extra},body:JSON.stringify(body)});
}
function database() {
  const statements: {sql:string;values:unknown[]}[]=[];
  const batch=vi.fn(async()=>[]);
  const prepare=(sql:string)=>{ const statement={bind:(...values:unknown[])=>{statements.push({sql,values});return statement;}};return statement; };
  return {prepare,batch,statements};
}
describe('gameplay event receiver',()=>{
  it('is disabled by default, without touching storage',async()=>{
    const db=database();expect((await receiveGameplay(request(),db,undefined)).status).toBe(204);expect(db.batch).not.toHaveBeenCalled();
  });
  it('stores denominator and first opening atomically with fixed dimensions',async()=>{
    const db=database();expect((await receiveGameplay(request(),db,'preview')).status).toBe(204);
    expect(db.batch).toHaveBeenCalledTimes(1);expect(db.statements).toHaveLength(3);
    expect(db.statements[1].values.slice(0,5)).toEqual([payload.session,'visit','share',0,0]);
    expect(db.statements[2].values.slice(0,5)).toEqual([payload.session,'first_cell_open','share',20,4]);
  });
  it.each([
    {...payload,playerId:'private'}, {...payload,source:'raw-url'}, {...payload,mineCount:19},
    {...payload,colorCount:5}, {...payload,event:'visit'}, {...payload,session:'player-name'},
  ])('rejects invalid or extra data',async(body)=>{
    const db=database();expect((await receiveGameplay(request(body),db,'preview')).status).toBe(400);expect(db.batch).not.toHaveBeenCalled();
  });
  it('rejects cross-origin and production requests in preview mode',async()=>{
    const db=database();expect((await receiveGameplay(request(payload,{Origin:'https://evil.example'}),db,'preview')).status).toBe(403);
    expect((await receiveGameplay(request(),db,'production')).status).toBe(403);
  });
  it.each(['Authorization','Cookie'])('does not accept ranking credentials: %s',async(header)=>{
    expect((await receiveGameplay(request(payload,{[header]:'secret'}),database(),'preview')).status).toBe(400);
  });
  it('bounds the actual body stream',async()=>{
    expect((await receiveGameplay(request('x'.repeat(1100)),database(),'preview')).status).toBe(413);
  });
  it('fails quietly when storage is unavailable',async()=>{
    const db=database();db.batch.mockRejectedValueOnce(new Error('unavailable'));
    expect((await receiveGameplay(request(),db,'preview')).status).toBe(503);
  });
});
