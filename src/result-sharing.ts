import type { ColorCount, MineCount } from './game/types';
import { COLORS, DIFFICULTIES } from './game/rules';
import type { Language } from './i18n';

export interface SweeperResult { mineCount: MineCount; colorCount: ColorCount; timeMs: number }

export function shareTime(timeMs: number): string {
  const [seconds, fraction] = (timeMs / 1000).toFixed(2).split('.');
  const hundredths = Number(seconds) * 100 + Number(fraction);
  return `${Math.floor(hundredths / 6000)}:${String(Math.floor(hundredths / 100) % 60).padStart(2, '0')}.${String(hundredths % 100).padStart(2, '0')}`;
}

export function sweeperShareData(result: SweeperResult, language: Language): { text: string; url: string } {
  const difficulty = DIFFICULTIES.find(item => item.mineCount === result.mineCount)!.label;
  const text = language === 'ja'
    ? `Multicolor Sweeper｜${difficulty}・${result.colorCount}色\nクリアタイム ${shareTime(result.timeMs)}`
    : `Multicolor Sweeper | ${difficulty} · ${result.colorCount} colors\nClear time ${shareTime(result.timeMs)}`;
  const url = new URL('https://mcsweeper.hanage.app/');
  url.search = new URLSearchParams({ lang: language, utm_source: 'share', utm_medium: 'share' }).toString();
  return { text, url: url.toString() };
}

export async function sweeperResultImage(result: SweeperResult): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 800;
  try { await document.fonts.load('64px VT323'); } catch { /* System font fallback. */ }
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.fillStyle = '#15182b';
  ctx.fillRect(0, 0, 1200, 800);
  ctx.strokeStyle = '#b8c1f5';
  ctx.lineWidth = 4;
  ctx.strokeRect(32, 32, 1136, 736);
  const text = (value: string, y: number, size: number, color = '#eef1ff') => {
    ctx.fillStyle = color;
    ctx.font = `${size}px VT323, sans-serif`;
    ctx.fillText(value, 64, y);
  };
  text('Multicolor Sweeper', 120, 72);
  const difficulty = DIFFICULTIES.find(item => item.mineCount === result.mineCount)!.label;
  text(`${difficulty}  /  ${result.colorCount} COLORS  /  ${result.mineCount} BOMBS`, 205, 40, '#b8c1f5');
  text(shareTime(result.timeMs), 410, 176);
  text('CLEAR TIME', 470, 40, '#b8c1f5');
  for (let i = 0; i < result.colorCount; i++) {
    ctx.fillStyle = COLORS[i].hex;
    ctx.fillRect(64 + i * 76, 548, 48, 48);
  }
  text('mcsweeper.hanage.app', 710, 40, '#b8c1f5');
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('PNG failed')), 'image/png'));
  return new File([blob], 'multicolor-sweeper-result.png', { type: 'image/png' });
}
