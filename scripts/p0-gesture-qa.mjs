import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();

async function swipe(cell, dx, dy) {
  const box = await cell.boundingBox();
  if (!box) throw new Error("cell is not visible");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 4 });
  await page.mouse.up();
}

try {
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "START" }).click();
  await page.locator(".cell").nth(40).click();
  await page.getByText("タップで開く・スワイプで旗").waitFor({ timeout: 30000 });

  const hidden = page.locator(".cell-hidden:not(:disabled)");
  const greenCell = hidden.first();
  await swipe(greenCell, -18, 18);
  const greenLabel = await greenCell.getAttribute("aria-label");
  if (!greenLabel?.includes("緑旗")) {
    throw new Error(`bottom-left swipe did not place green flag: ${greenLabel}`);
  }

  const unusedCell = hidden.filter({ hasNotText: "" }).nth(1);
  const target = (await unusedCell.count()) ? unusedCell : hidden.nth(1);
  const before = await target.getAttribute("aria-label");
  await swipe(target, 18, 18);
  const after = await target.getAttribute("aria-label");
  if (before !== after || after?.includes("旗") || after?.includes("空き") || after?.includes("周囲")) {
    throw new Error(`bottom-right swipe was not a no-op: ${before} -> ${after}`);
  }

  console.log("3-color gesture QA: bottom-left=green, bottom-right=no-op");
} finally {
  await context.close();
  await browser.close();
}
