/** Fixed categories only: no raw URLs, referrers, UTM values or ranking identities. */
export const SOURCES = ['x_ads', 'x_share', 'x_other', 'share', 'hub', 'search', 'other', 'direct'] as const;
export type Source = typeof SOURCES[number];
export interface GameplayPayload {
  session: string;
  source: Source;
  event: 'visit' | 'first_cell_open';
  mineCount: 0 | 15 | 20 | 25;
  colorCount: 0 | 3 | 4;
}
export const SESSION_IDLE_MS = 30 * 60 * 1000;
export const RETENTION_MS = 30 * 86400000;
export const MAX_BODY_BYTES = 1024;
export function acquisitionSource(search: string, referrer: string): Source {
  const params = new URLSearchParams(search);
  const source = params.get('utm_source')?.toLowerCase();
  const medium = params.get('utm_medium')?.toLowerCase();
  if (source === 'share' && medium === 'share') return 'share';
  if (source === 'x' || source === 'twitter') {
    if (medium === 'cpc' || medium === 'paid_social') return 'x_ads';
    return medium === 'share' ? 'x_share' : 'x_other';
  }
  let host = '';
  try { host = new URL(referrer).hostname; } catch { /* No usable referrer. */ }
  if (['t.co', 'x.com', 'twitter.com'].includes(host)) return 'x_other';
  if (['hanage.app', 'www.hanage.app'].includes(host)) return 'hub';
  if (/^(www\.)?(google\.(com|co\.jp)|bing\.com|search\.yahoo\.co\.jp)$/.test(host)) return 'search';
  return host && host !== 'mcsweeper.hanage.app' ? 'other' : 'direct';
}
export function analyticsHostAllowed(host: string, mode: string | undefined): boolean {
  if (mode === 'production') return host === 'mcsweeper.hanage.app';
  return mode === 'preview' && /^[a-z0-9-]+-multicolor-sweeper\.jibunnha\.workers\.dev$/.test(host);
}
