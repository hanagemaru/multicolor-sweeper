import { acquisitionSource, analyticsHostAllowed, SESSION_IDLE_MS, SOURCES, type GameplayPayload, type Source } from './gameplay-analytics-shared';
import type { ColorCount, MineCount } from './game/types';
const KEY = 'sweeper-gameplay-session-v1';
interface Session { id: string; source: Source; touched: number }
let memory: Session | null = null;
const sent = new Set<string>();
function enabled(): boolean {
  if (!import.meta.env.PROD || !analyticsHostAllowed(location.hostname, import.meta.env.VITE_GAMEPLAY_ANALYTICS_MODE)) return false;
  if (!['/', '/index.html'].includes(location.pathname)) return false;
  const params = new URLSearchParams(location.search);
  return !['resultPreview', 'effects-lab', 'social-demo', 'ranking-test', 'seed', 'debug'].some(key => params.has(key));
}
function session(): Session {
  const now = Date.now();
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as Session | null;
    if (saved && /^[0-9a-f-]{36}$/.test(saved.id) && SOURCES.includes(saved.source) && now >= saved.touched && now - saved.touched < SESSION_IDLE_MS) memory = saved;
  } catch { /* Use memory if storage is blocked. */ }
  if (!memory || now - memory.touched >= SESSION_IDLE_MS) memory = { id: crypto.randomUUID(), source: acquisitionSource(location.search, document.referrer), touched: now };
  memory.touched = now;
  try { sessionStorage.setItem(KEY, JSON.stringify(memory)); } catch { /* Gameplay remains available. */ }
  return memory;
}
function send(payload: GameplayPayload): void {
  const key = `${payload.session}:${payload.event}`;
  if (sent.has(key)) return;
  sent.add(key);
  void fetch('/api/gameplay-events', {
    method: 'POST', credentials: 'omit', keepalive: true,
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  }).then(response => { if (!response.ok) sent.delete(key); }).catch(() => { sent.delete(key); });
}
/** One visit and first successful cell opening per temporary tab visit, not a player count. */
export function trackGameplay(event: 'visit' | 'first_cell_open', mineCount: MineCount = 20, colorCount: ColorCount = 3): void {
  try {
    if (!enabled()) return;
    const current = session();
    const base = { session: current.id, source: current.source };
    send({ ...base, event: 'visit', mineCount: 0, colorCount: 0 });
    if (event === 'first_cell_open') send({ ...base, event, mineCount, colorCount });
  } catch { /* Analytics must never affect generation, timers or input. */ }
}
