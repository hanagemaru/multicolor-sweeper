// アイコン生成スクリプト。
// public/icon.svg と、PWA / iOS ホーム画面用のPNGを同じ図案から書き出す。
//
//   npm run icons
//
// 図案は 64x64 のドットで持つ。192 も 512 も 64 で割り切れるので、
// 最近傍で拡大してもドットの大きさが不揃いにならない。
// 1マス32ドットあれば、3x5のドット数字を2倍にして4つ置いてもまだ余白が残る。

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const GRID = 64;
const CELL = GRID / 2;
/** ドットの一辺。数字も旗も枠も、すべてこの粒で描く */
const DOT = 2;

// 盤面の色は src/styles.css、数字の色は src/game/rules.ts の COLORS と同じ値。
// 片方だけ変えないこと。
const COLOR = {
  board: "#0f1120",
  covered: "#353a59",
  coveredHi: "#5b6288",
  coveredLo: "#1b1f36",
  opened: "#20243c",
  openedLine: "#343957",
  pole: "#c3c3c3",
  red: "#ef5f6d",
  blue: "#4d88ff",
  green: "#57e0a2",
  yellow: "#e9b53a"
};

// 3x5 のドット数字。アイコンに使う数だけ持つ
const DIGITS = {
  1: [".#.", "##.", ".#.", ".#.", "###"],
  2: ["###", "..#", "###", "#..", "###"],
  3: ["###", "..#", "###", "..#", "###"]
};

// 旗。竿は2ドット、旗は6x6
const FLAG = [
  "ppcccc..",
  "ppccccc.",
  "ppcccccc",
  "ppccccc.",
  "ppcccc..",
  "ppccc...",
  "pp......",
  "pp......",
  "pp......",
  "pp......",
  "pp......"
];

// 数字を置く場所は色ごとに固定する。ゲーム本体の並びと同じ 2x2
const SLOT = { red: [0, 0], blue: [1, 0], green: [0, 1], yellow: [1, 1] };

// 盤面。左上だけ4色すべてを出し、このゲームが何なのかを一目で見せる
const BOARD = [
  { kind: "clue", clue: [["red", 2], ["blue", 1], ["green", 1], ["yellow", 3]] },
  { kind: "covered" },
  { kind: "flag", color: "red" },
  { kind: "clue", clue: [["blue", 1], ["green", 2]] }
];

// ---------------------------------------------------------------- 描画

const rects = [];
const rect = (x, y, w, h, fill) => {
  if (w <= 0 || h <= 0) return;
  rects.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`);
};

/** 文字列で持った図をドットとして置く。'.' は透明 */
const sprite = (rows, x0, y0, map) => {
  rows.forEach((row, j) => {
    [...row].forEach((ch, i) => {
      if (ch === ".") return;
      rect(x0 + i * DOT, y0 + j * DOT, DOT, DOT, map[ch]);
    });
  });
};

function cell(x, y, spec) {
  if (spec.kind === "clue") {
    rect(x, y, CELL, CELL, COLOR.opened);
    // 開いたマスは上と左に細い線が入る。本体と同じ
    rect(x, y, CELL, DOT, COLOR.openedLine);
    rect(x, y, DOT, CELL, COLOR.openedLine);
    const dw = 3 * DOT;
    const dh = 5 * DOT;
    const gapX = (CELL - dw * 2) / 3;
    const gapY = (CELL - dh * 2) / 3;
    for (const [color, digit] of spec.clue) {
      const [cx, cy] = SLOT[color];
      sprite(DIGITS[digit], x + gapX + cx * (dw + gapX), y + gapY + cy * (dh + gapY), {
        "#": COLOR[color]
      });
    }
    return;
  }

  rect(x, y, CELL, CELL, COLOR.covered);
  // 本体のセルと同じく、上と左を明るく、下と右を暗くする
  rect(x, y, CELL, DOT, COLOR.coveredHi);
  rect(x, y, DOT, CELL, COLOR.coveredHi);
  rect(x, y + CELL - DOT, CELL, DOT, COLOR.coveredLo);
  rect(x + CELL - DOT, y, DOT, CELL, COLOR.coveredLo);
  if (spec.kind === "flag") {
    sprite(FLAG, x + (CELL - 8 * DOT) / 2, y + (CELL - 11 * DOT) / 2, {
      p: COLOR.pole,
      c: COLOR[spec.color]
    });
  }
}

/**
 * inset は 64 グリッド上のドット数。マスカブル用に図案を内側へ寄せる。
 * 角丸は付けない。端末側が切り抜くので、こちらは全面を塗る。
 */
const svg = ({ inset }) => {
  rects.length = 0;
  BOARD.forEach((spec, i) => cell((i % 2) * CELL, Math.floor(i / 2) * CELL, spec));
  const scale = (GRID - inset * 2) / GRID;
  const body = rects.join("\n    ");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GRID} ${GRID}" shape-rendering="crispEdges">
  <rect width="${GRID}" height="${GRID}" fill="${COLOR.board}"/>
  <g transform="translate(${inset} ${inset}) scale(${scale})">
    ${body}
  </g>
</svg>
`;
};

// 通常アイコン。全面を塗り、角丸は端末に任せる
const standard = svg({ inset: 0 });
// maskable。端末側が円や角丸で切り抜くので、図案を中央80%に収める
const maskable = svg({ inset: 6.4 });

const render = (source, size) =>
  new Resvg(source, { fitTo: { mode: "width", value: size } }).render().asPng();

const outputs = [
  ["public/icon.svg", Buffer.from(standard)],
  ["public/icons/icon-192.png", render(standard, 192)],
  ["public/icons/icon-512.png", render(standard, 512)],
  ["public/icons/maskable-192.png", render(maskable, 192)],
  ["public/icons/maskable-512.png", render(maskable, 512)],
  ["public/apple-touch-icon.png", render(standard, 180)]
];

for (const [path, data] of outputs) {
  const target = resolve(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, data);
  console.log(`${path} (${data.length} bytes)`);
}
