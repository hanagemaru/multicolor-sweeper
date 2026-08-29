// ドット絵は文字列の配列で持つ。1文字が1ドットで、"."は透明。
// 同じ色が横に続くぶんは1つの矩形にまとめてから描く。
export function spriteRects(
  sprite: readonly string[],
  palette: Record<string, string>
): React.JSX.Element[] {
  const out: React.JSX.Element[] = [];
  sprite.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const slot = row[x];
      let width = 1;
      while (x + width < row.length && row[x + width] === slot) width += 1;
      if (slot !== ".") {
        out.push(
          <rect key={`${x}-${y}`} x={x} y={y} width={width} height={1} fill={palette[slot]} />
        );
      }
      x += width;
    }
  });
  return out;
}
