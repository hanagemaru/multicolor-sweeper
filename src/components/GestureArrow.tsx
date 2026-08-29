interface GestureArrowProps {
  // 上向きを0度とした時計回りの角度。
  angle: number;
  color: string;
}

// スワイプ方向の矢印。以前は ↖ などの文字を使っていたが、VT323が矢印を持たず
// OS任せのフォールバックになるため、Windowsでは45度に見えなかった。
// SVGを回して描けば環境によらず指定どおりの角度になる。
export function GestureArrow({ angle, color }: GestureArrowProps): React.JSX.Element {
  return (
    <svg
      className="gesture-arrow"
      viewBox="0 0 16 16"
      width="20"
      height="20"
      aria-hidden="true"
      style={{ transform: `rotate(${angle}deg)`, color }}
    >
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="square" fill="none">
        <line x1="8" y1="14" x2="8" y2="3" />
        <polyline points="3.5,7.5 8,3 12.5,7.5" />
      </g>
    </svg>
  );
}
