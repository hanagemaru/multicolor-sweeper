import { useEffect, useRef } from 'react';
import { bindResultShare } from '../share-action';
import { sweeperResultImage, sweeperShareData, type SweeperResult } from '../result-sharing';
import type { Language } from '../i18n';
import { buttonUiText } from '../button-typography';

export function ResultShareButton({ mineCount, colorCount, timeMs, board, language }: SweeperResult & { language: Language }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const result = { mineCount, colorCount, timeMs, board };
    return bindResultShare(ref.current!, sweeperShareData(result, language), sweeperResultImage(result), language);
  }, [mineCount, colorCount, timeMs, board, language]);
  return <button ref={ref} className="secondary-button" type="button" disabled>{buttonUiText(language === 'ja' ? '結果をシェア' : 'SHARE RESULT')}</button>;
}
