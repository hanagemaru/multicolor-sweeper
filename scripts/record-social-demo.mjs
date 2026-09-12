import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function readArg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const seed = readArg("seed", `hanage-social-${new Date().toISOString().slice(0, 10)}`);
const durationMs = Math.max(4000, Number(readArg("duration", "14000")) || 14000);
const speedMs = Math.max(70, Number(readArg("speed", "150")) || 150);
const output = path.resolve(readArg("output", `social-output/multicolor-sweeper-${Date.now()}.webm`));
const port = Number(readArg("port", "4173")) || 4173;
const baseUrl = `http://127.0.0.1:${port}`;

async function waitForServer(url, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error("Playwright is required for recording.");
  console.error("Run: npm install --no-save playwright && npx playwright install chromium");
  process.exit(1);
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const server = spawn(
  npmCommand,
  ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { stdio: ["ignore", "pipe", "pipe"] }
);

server.stdout.on("data", (chunk) => process.stdout.write(`[vite] ${chunk}`));
server.stderr.on("data", (chunk) => process.stderr.write(`[vite] ${chunk}`));

let browser;
try {
  await waitForServer(baseUrl);
  browser = await chromium.launch({ headless: true });

  const demoUrl = `${baseUrl}/?social-demo=1&seed=${encodeURIComponent(seed)}&speed=${speedMs}`;

  // Warm the Vite modules and deterministic board generation before recording.
  const warmContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const warmPage = await warmContext.newPage();
  await warmPage.goto(demoUrl, { waitUntil: "networkidle" });
  await warmPage.locator('[data-social-demo="ready"]').waitFor();
  await warmContext.close();

  await mkdir(path.dirname(output), { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    recordVideo: {
      dir: path.dirname(output),
      size: { width: 390, height: 844 }
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
  server.kill();
}
