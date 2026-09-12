import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function readArg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const output = path.resolve(readArg("output", "social-output/post.txt"));
const variant = Number(readArg("variant", "0")) || 0;

const posts = [
  "赤・青・緑の爆弾があるマインスイーパーです\n数字と色を手がかりに解きます\n\nhttps://mcsweeper.hanage.app/",
  "Multicolor Sweeper\n\n色ごとの爆弾数を手がかりに解く9×9のマインスイーパーです\n\nhttps://mcsweeper.hanage.app/",
  "色付きの爆弾を推理して解くマインスイーパーです\nブラウザですぐ遊べます\n\nhttps://mcsweeper.hanage.app/"
];

const text = posts[((variant % posts.length) + posts.length) % posts.length];
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${text}\n`, "utf8");
console.log(text);
