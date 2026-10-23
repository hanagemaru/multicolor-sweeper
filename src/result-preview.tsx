import { generateBoard } from './game/game-core';
import { ResultShareButton } from './components/ResultShareButton';
import { getCopy, type Language } from './i18n';
import { buttonUiText } from './button-typography';
import { shareTime } from './result-sharing';

const previewColorCount = new URLSearchParams(location.search).get('colors') === '4' ? 4 : 3;
const previewBoard = generateBoard({ seed: 'share-preview', mineCount: 20, colorCount: previewColorCount, firstRow: 4, firstCol: 4 });
for (const cell of previewBoard.cells.flat()) {
  if (cell.mineColor === null) cell.state = 'revealed';
  else cell.flag = cell.mineColor;
}

export default function ResultPreview() {
  const language: Language = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'ja';
  const copy = getCopy(language);
  return <main className="app-shell" lang={language}>
    <div className="modal-layer result-layer">
      <div className="result-dialog result-dialog-won" role="dialog" aria-modal="true" aria-labelledby="result-title">
        <h2 id="result-title">{copy.clear}</h2>
        <p>NORMAL · {language === 'ja' ? `${previewColorCount}色` : `${previewColorCount} COLORS`}</p>
        <p className="result-time"><small>{copy.clearTime}</small><strong>{shareTime(83450)}</strong></p>
        <p>PREVIEW</p>
        <div className="result-actions">
          <ResultShareButton mineCount={20} colorCount={previewColorCount} timeMs={83450} board={previewBoard} language={language} />
          <button className="secondary-button" type="button" onClick={() => { location.search = ''; }}>{buttonUiText(copy.menu)}</button>
        </div>
      </div>
    </div>
  </main>;
}
