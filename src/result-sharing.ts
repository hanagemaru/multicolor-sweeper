import type { Board, ColorCount, MineCount } from './game/types';
import { COLORS, DIFFICULTIES, GRID_SIZE, NEUTRAL_FLAG_HEX } from './game/rules';
import type { Language } from './i18n';

export interface SweeperResult { mineCount: MineCount; colorCount: ColorCount; timeMs: number; board: Board }

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
  text('Multicolor Sweeper', 112, 64);
  const difficulty = DIFFICULTIES.find(item => item.mineCount === result.mineCount)!.label;
  text(`${difficulty} / ${result.colorCount} COLORS`, 205, 40, '#b8c1f5');
  text(`${result.mineCount} BOMBS`, 255, 36, '#b8c1f5');
  text(shareTime(result.timeMs), 410, 128);
  text('CLEAR TIME', 470, 40, '#b8c1f5');
  for (let i = 0; i < result.colorCount; i++) {
    ctx.fillStyle = COLORS[i].hex;
    ctx.fillRect(64 + i * 76, 548, 48, 48);
  }
  drawClearBoard(ctx, result.board);
  text('mcsweeper.hanage.app', 710, 36, '#b8c1f5');
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('PNG failed')), 'image/png'));
  return new File([blob], 'multicolor-sweeper-result.png', { type: 'image/png' });
}

/** Draw the completed board without touching gameplay state or capturing surrounding UI. */
export function drawClearBoard(ctx: CanvasRenderingContext2D, board: Board): void {
  const left = 552;
  const top = 156;
  const step = 64;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '30px VT323, sans-serif';
  for (const row of board.cells) for (const cell of row) {
    const x = left + cell.col * step;
    const y = top + cell.row * step;
    const mine = cell.mineColor !== null;
    ctx.fillStyle = mine ? '#303650' : '#20243c';
    ctx.fillRect(x, y, step - 2, step - 2);
    if (!mine) {
      cell.adjacentCounts.slice(0, board.colorCount).forEach((count, color) => {
        if (!count) return;
        ctx.fillStyle = COLORS[color].hex;
        ctx.fillText(String(count), x + (color % 2 ? 46 : 17), y + (color < 2 ? 17 : 46));
      });
      continue;
    }
    if (cell.flag !== null) {
      ctx.fillStyle = '#c3c3c3';
      ctx.fillRect(x + 21, y + 13, 4, 40);
      ctx.fillStyle = cell.flag === 'neutral' ? NEUTRAL_FLAG_HEX : COLORS[cell.flag].hex;
      ctx.fillRect(x + 25, y + 13, 24, 12);
      ctx.fillRect(x + 25, y + 25, 16, 5);
      ctx.fillRect(x + 25, y + 30, 8, 5);
    }
    // As in board review, show unflagged bombs and the answer beside wrong-colour flags.
    if (cell.flag === null || cell.flag !== cell.mineColor) {
      ctx.fillStyle = COLORS[cell.mineColor!].hex;
      const size = cell.flag === null ? 24 : 12;
      const bombX = x + (cell.flag === null ? 20 : 44);
      const bombY = y + (cell.flag === null ? 20 : 43);
      ctx.fillRect(bombX, bombY, size, size);
      ctx.fillRect(bombX - 4, bombY + size / 2 - 2, size + 8, 4);
      ctx.fillRect(bombX + size / 2 - 2, bombY - 4, 4, size + 8);
    }
  }
  ctx.strokeStyle = '#b8c1f5';
  ctx.lineWidth = 2;
  ctx.strokeRect(left - 5, top - 5, GRID_SIZE * step + 8, GRID_SIZE * step + 8);
  ctx.restore();
}
