// アイコン生成スクリプト。
// public/icon.svg と、PWA / iOS ホーム画面用のPNGを同じ図案から書き出す。
//
//   npm run icons

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BACKGROUND = "#15182b";

// 盤面と4色のタイル。512x512座標系で記述する。
// 4色は src/game/rules.ts の COLORS と同じ値。片方だけ変えないこと。
const board = (inset) => {
  const scale = (1024 - inset * 2) / 1024;
  const shift = inset;
  // 末尾の余分な0を落とし、inset=0のときは元の整数表記のまま出す。
  const round = (v) => Number(v.toFixed(2)).toString();
  const at = (v) => round(v * scale + shift);
  const size = (v) => round(v * scale);
  return [
    `<rect x="${at(76)}" y="${at(76)}" width="${size(360)}" height="${size(360)}" rx="${size(22)}" fill="#20243c" stroke="#555b7c" stroke-width="${size(20)}"/>`,
    `<rect x="${at(116)}" y="${at(116)}" width="${size(128)}" height="${size(128)}" fill="#ef5f6d"/>`,
    `<rect x="${at(268)}" y="${at(116)}" width="${size(128)}" height="${size(128)}" fill="#4d88ff"/>`,
    `<rect x="${at(116)}" y="${at(268)}" width="${size(128)}" height="${size(128)}" fill="#57e0a2"/>`,
    `<rect x="${at(268)}" y="${at(268)}" width="${size(128)}" height="${size(128)}" fill="#e9b53a"/>`
  ].join("\n  ");
};

const svg = ({ radius, inset }) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${radius}" fill="${BACKGROUND}"/>
  ${board(inset)}
</svg>
`;

// 通常アイコン。角丸ありで単体表示にも耐える。
const standard = svg({ radius: 80, inset: 0 });

// maskable。端末側が円や角丸で切り抜くので、図案を中央80%に収める。
const maskable = svg({ radius: 0, inset: 51.2 });

// iOSホーム画面用。iOS側が角丸を付けるため、こちらは角丸なしの正方形。
const appleTouch = svg({ radius: 0, inset: 0 });

const render = (source, size) =>
  new Resvg(source, { fitTo: { mode: "width", value: size } }).render().asPng();

const outputs = [
  ["public/icon.svg", Buffer.from(standard)],
  ["public/icons/icon-192.png", render(standard, 192)],
  ["public/icons/icon-512.png", render(standard, 512)],
  ["public/icons/maskable-192.png", render(maskable, 192)],
  ["public/icons/maskable-512.png", render(maskable, 512)],
  ["public/apple-touch-icon.png", render(appleTouch, 180)]
];

for (const [path, data] of outputs) {
  const target = resolve(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, data);
  console.log(`${path} (${data.length} bytes)`);
}
