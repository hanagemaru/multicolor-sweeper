import { analyticsHostAllowed, SOURCES, MAX_BODY_BYTES, RETENTION_MS, type GameplayPayload } from '../gameplay-analytics-shared';
import { isMineCount, isColorCount } from '../game/rules';
interface Statement { bind(...values: unknown[]): Statement }
interface Database { prepare(sql: string): Statement; batch(statements: Statement[]): Promise<unknown> }
function valid(value: unknown): value is GameplayPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const p = value as GameplayPayload;
  if (Object.keys(p).sort().join(',') !== 'colorCount,event,mineCount,session,source') return false;
  if (typeof p.session !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(p.session) || !SOURCES.includes(p.source)) return false;
  if (p.event === 'visit') return p.mineCount === 0 && p.colorCount === 0;
  return p.event === 'first_cell_open' && isMineCount(p.mineCount) && isColorCount(p.colorCount);
}
export async function receiveGameplay(request: Request, db: Database | undefined, mode: string | undefined): Promise<Response> {
  if (mode !== 'production' && mode !== 'preview') return new Response(null, { status: 204 });
  const url = new URL(request.url);
  if (url.protocol !== 'https:' || !analyticsHostAllowed(url.hostname, mode) || request.headers.get('Origin') !== url.origin) return new Response(null, { status: 403 });
  if (request.headers.has('Authorization') || request.headers.has('Cookie')) return new Response(null, { status: 400 });
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return new Response(null, { status: 415 });
  if (!db) return new Response(null, { status: 503 });
  try {
    const reader = request.body?.getReader();
    if (!reader) return new Response(null, { status: 400 });
    let bytes = 0;
    let body = '';
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) { await reader.cancel(); return new Response(null, { status: 413 }); }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    let p: unknown;
    try { p = JSON.parse(body); } catch { return new Response(null, { status: 400 }); }
    if (!valid(p)) return new Response(null, { status: 400 });
    const now = Date.now();
    const insert = (event: GameplayPayload['event'], mines: number, colors: number) => db.prepare(
      'INSERT OR IGNORE INTO gameplay_events (session_id,event,source,mine_count,color_count,received_at) VALUES (?,?,?,?,?,?)',
    ).bind(p.session, event, p.source, mines, colors, now);
    const statements = [db.prepare('DELETE FROM gameplay_events WHERE received_at < ?').bind(now - RETENTION_MS), insert('visit', 0, 0)];
    if (p.event === 'first_cell_open') statements.push(insert(p.event, p.mineCount, p.colorCount));
    await db.batch(statements);
    return new Response(null, { status: 204 });
  } catch { return new Response(null, { status: 503 }); } // Never log raw requests or identities.
}
