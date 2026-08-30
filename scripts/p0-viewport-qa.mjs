import { chromium } from "playwright";

const viewports = [
  { width: 320, height: 480, name: "320x480" },
  { width: 320, height: 568, name: "320x568" },
  { width: 390, height: 844, name: "390x844" }
];

const browser = await chromium.launch({ headless: true });

async function assertGameplayLayout(page, viewportName) {
  const layout = await page.evaluate(() => {
    const board = document.querySelector(".board")?.getBoundingClientRect();
    const panel = document.querySelector(".game-panel")?.getBoundingClientRect();
    const header = document.querySelector(".game-header")?.getBoundingClientRect();
    const guide = document.querySelector(".gesture-guide")?.getBoundingClientRect();
    const bodyStyle = getComputedStyle(document.body);
    return {
      innerHeight: window.innerHeight,
      bodyScrollHeight: document.body.scrollHeight,
      htmlScrollHeight: document.documentElement.scrollHeight,
      bodyOverflow: bodyStyle.overflow,
      board: board && { top: board.top, left: board.left, right: board.right, bottom: board.bottom, width: board.width, height: board.height },
      panel: panel && { top: panel.top, bottom: panel.bottom },
      header: header && { top: header.top, bottom: header.bottom },
      guide: guide && { top: guide.top, bottom: guide.bottom }
    };
  });

  if (!layout.board || !layout.panel || !layout.header || !layout.guide) {
    throw new Error(`${viewportName}: required gameplay elements are missing`);
  }
  if (layout.bodyScrollHeight > layout.innerHeight + 1 || layout.htmlScrollHeight > layout.innerHeight + 1) {
    throw new Error(`${viewportName}: vertical scroll remains (${layout.bodyScrollHeight}/${layout.htmlScrollHeight} > ${layout.innerHeight})`);
  }
  if (layout.bodyOverflow !== "hidden") {
    throw new Error(`${viewportName}: body overflow is not locked`);
  }
  if (Math.abs(layout.board.width - layout.board.height) > 1) {
    throw new Error(`${viewportName}: board is not square (${layout.board.width}x${layout.board.height})`);
  }
  for (const [name, rect] of [["panel", layout.panel], ["header", layout.header], ["board", layout.board], ["guide", layout.guide]]) {
    if (rect.top < -1 || rect.bottom > layout.innerHeight + 1) {
      throw new Error(`${viewportName}: ${name} is clipped (${rect.top}..${rect.bottom}, viewport ${layout.innerHeight})`);
    }
  }
  if (layout.board.width < 200) {
    throw new Error(`${viewportName}: board became unexpectedly small (${layout.board.width}px)`);
  }
  return layout;
}

async function swipeDownForGreen(page, viewportName) {
  const cell = page.locator(".cell-hidden:not(:disabled)").first();
  await cell.waitFor({ state: "visible" });
  const box = await cell.boundingBox();
  if (!box) throw new Error(`${viewportName}: no hidden cell for swipe test`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 8, y + 24, { steps: 4 });
  await page.mouse.up();
  const label = await cell.getAttribute("aria-label");
  if (!label?.includes("緑旗")) {
    throw new Error(`${viewportName}: downward swipe did not place green flag (${label})`);
  }
}

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });

    const settingsOverflow = await page.evaluate(() => getComputedStyle(document.body).overflow);
    if (settingsOverflow === "hidden") throw new Error(`${viewport.name}: settings screen is incorrectly scroll-locked`);

    await page.getByRole("button", { name: "START" }).click();
    await page.getByText("好きなマスをタップしてください").waitFor();
    await assertGameplayLayout(page, viewport.name);

    const firstCell = page.locator(".cell").nth(40);
    await firstCell.click();
    await page.getByText("タップで開く・スワイプで旗").waitFor({ timeout: 30000 });
    const layout = await assertGameplayLayout(page, viewport.name);
    await swipeDownForGreen(page, viewport.name);

    console.log(`${viewport.name}: board=${layout.board.width.toFixed(1)}px, scroll=none, swipe=green`);
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "START" }).click();
  await page.locator(".cell").nth(40).click();
  await page.getByText("タップで開く・スワイプで旗").waitFor({ timeout: 30000 });

  for (let index = 0; index < 81; index += 1) {
    if (await page.locator(".status-lost, .status-won").count()) break;
    const hidden = page.locator(".cell-hidden:not(:disabled)").first();
    if (!(await hidden.count())) break;
    await hidden.click();
  }
  await page.locator(".status-lost, .status-won").waitFor({ timeout: 10000 });
  const resultLocked = await page.evaluate(() => document.body.classList.contains("gameplay-locked") || getComputedStyle(document.body).overflow === "hidden");
  if (resultLocked) throw new Error("result screen remained scroll-locked");
  console.log("result screen: scroll lock released");
  await context.close();
} finally {
  await browser.close();
}
