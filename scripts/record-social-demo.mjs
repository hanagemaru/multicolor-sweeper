import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createServer } from "vite";

function readArg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const seed = readArg("seed", `hanage-social-${new Date().toISOString().slice(0, 10)}`);
const targetGameplayMs = Math.max(16000, Number(readArg("target", "22000")) || 22000);
const durationMs = Math.max(targetGameplayMs + 7000, Number(readArg("duration", "32000")) || 32000);
const output = path.resolve(readArg("output", `social-output/multicolor-sweeper-${Date.now()}.webm`));
const port = Number(readArg("port", "4173")) || 4173;
const baseUrl = `http://127.0.0.1:${port}`;
const captureSize = { width: 390, height: 640 };

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error("Playwright is required for recording.");
  console.error("Run: npm install --no-save playwright && npx playwright install chromium");
  process.exit(1);
}

const vite = await createServer({
  server: {
    host: "127.0.0.1",
    port,
    strictPort: true
  }
});

let browser;
try {
  await vite.listen();
  browser = await chromium.launch({ headless: true });

  const demoUrl = `${baseUrl}/?social-demo=1&seed=${encodeURIComponent(seed)}&target=${targetGameplayMs}`;

  // Warm the Vite modules and deterministic board generation before recording.
  const warmContext = await browser.newContext({ viewport: captureSize });
  const warmPage = await warmContext.newPage();
  await warmPage.goto(demoUrl, { waitUntil: "networkidle" });
  await warmPage.locator('[data-social-demo="ready"]').waitFor();
  await warmContext.close();

  await mkdir(path.dirname(output), { recursive: true });
  const context = await browser.newContext({
    viewport: captureSize,
    recordVideo: {
      dir: path.dirname(output),
      size: captureSize
    }
  });
  const page = await context.newPage();
  await page.goto(demoUrl, { waitUntil: "networkidle" });
  await page.locator('[data-social-demo="ready"]').waitFor();
  const video = page.video();

  const started = Date.now();
  while (Date.now() - started < durationMs) {
    const complete = await page.locator('[data-social-demo="ready"]').getAttribute("data-social-demo-complete");
    if (complete === "true" && Date.now() - started > 5000) break;
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(500);
  await context.close();

  if (!video) throw new Error("Playwright did not create a video");
  await video.saveAs(output);
  console.log(`Saved social video: ${output}`);
} finally {
  if (browser) await browser.close();
  await vite.close();
}
