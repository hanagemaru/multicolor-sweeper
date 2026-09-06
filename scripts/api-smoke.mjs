import { mkdirSync, rmSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const persistDir = ".wrangler/api-test";
const port = 8789;
const baseUrl = `http://127.0.0.1:${port}`;

function run(args) {
  const result = spawnSync(npx, args, { stdio: "inherit", env: { ...process.env, NO_COLOR: "1" } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Wrangler dev server did not start");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function authForRank(rank) {
  return { Authorization: `Bearer p-self-${rank}.${"a".repeat(64)}` };
}

async function stopWorker(worker) {
  if (worker.exitCode !== null || !worker.pid) return;

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(worker.pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }

  const exited = once(worker, "exit").catch(() => undefined);
  try {
    process.kill(-worker.pid, "SIGTERM");
  } catch {
    worker.kill("SIGTERM");
  }

  await Promise.race([
    exited,
    new Promise((resolve) => setTimeout(resolve, 2000))
  ]);

  if (worker.exitCode === null) {
    try {
      process.kill(-worker.pid, "SIGKILL");
    } catch {}
  }
}

rmSync(persistDir, { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
run(["wrangler", "d1", "migrations", "apply", "multicolor-sweeper-ranking", "--local", `--persist-to=${persistDir}`]);
run(["wrangler", "d1", "execute", "multicolor-sweeper-ranking", "--local", `--persist-to=${persistDir}`, "--file", "scripts/api-seed.sql"]);

const worker = spawn(process.execPath, ["node_modules/wrangler/bin/wrangler.js", "dev", "--local", "--port", String(port), `--persist-to=${persistDir}`], {
  stdio: ["ignore", "pipe", "pipe"],
  detached: process.platform !== "win32",
  env: { ...process.env, NO_COLOR: "1" }
});
let logs = "";
worker.stdout.on("data", (chunk) => { logs += chunk.toString(); });
worker.stderr.on("data", (chunk) => { logs += chunk.toString(); });

try {
  await waitForServer();

  const health = await fetch(`${baseUrl}/api/health`);
  assert(health.status === 200, "health endpoint failed");

  const ranking20 = await fetch(`${baseUrl}/api/rankings?mineCount=20&limit=50`);
  assert(ranking20.status === 200, "20-bomb ranking failed");
  const ranking20Body = await ranking20.json();
  assert(ranking20Body.entries.length === 50, "20-bomb top-50 length is wrong");
  assert(ranking20Body.entries[0]?.rank === 1 && ranking20Body.entries[49]?.rank === 50, "20-bomb ranks are wrong");
  assert(ranking20Body.entries[0]?.timeMs === 10000 && ranking20Body.entries[49]?.timeMs === 59000, "20-bomb ranking order is wrong");
  assert(ranking20Body.entries[0]?.colorCount === 3 && ranking20Body.entries[1]?.colorCount === 4, "3/4-color mixing is wrong");

  for (const mineCount of [15, 25]) {
    const response = await fetch(`${baseUrl}/api/rankings?mineCount=${mineCount}&limit=50`);
    const body = await response.json();
    assert(response.status === 200 && body.entries.length === 1, `${mineCount}-bomb ranking failed`);
  }

  const nearbyCases = [
    { rank: 1, expected: range(1, 10) },
    { rank: 11, expected: range(1, 14) },
    { rank: 12, expected: range(1, 15) },
    { rank: 127, expected: [...range(1, 10), ...range(124, 130)] }
  ];

  for (const testCase of nearbyCases) {
    const response = await fetch(`${baseUrl}/api/rankings?mineCount=20&limit=10`, { headers: authForRank(testCase.rank) });
    const body = await response.json();
    const ranks = body.entries.map((entry) => entry.rank);
    assert(response.status === 200, `rank ${testCase.rank} authenticated ranking failed`);
    assert(body.yourRank === testCase.rank, `rank ${testCase.rank} own rank is wrong`);
    assert(JSON.stringify(ranks) === JSON.stringify(testCase.expected), `rank ${testCase.rank} displayed range is wrong: ${JSON.stringify(ranks)}`);
    const playerRows = body.entries.filter((entry) => entry.isPlayer);
    assert(playerRows.length === 1 && playerRows[0].rank === testCase.rank, `rank ${testCase.rank} player row was not marked exactly once`);
  }

  const auth = authForRank(11);
  const rename = await fetch(`${baseUrl}/api/player`, {
    method: "PUT",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ displayName: "SELF11X" })
  });
  assert(rename.status === 200, "name update failed");
  const renamedRanking = await fetch(`${baseUrl}/api/rankings?mineCount=20&limit=50`);
  const renamedBody = await renamedRanking.json();
  assert(renamedBody.entries.some((entry) => entry.playerId === "p-self-11" && entry.name === "SELF11X"), "renamed player not reflected");

  const badCategory = await fetch(`${baseUrl}/api/rankings?mineCount=30`);
  assert(badCategory.status === 400, "invalid ranking category was not rejected");

  const unauthenticatedSubmit = await fetch(`${baseUrl}/api/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });
  assert(unauthenticatedSubmit.status === 401, "unauthenticated submit was not rejected");

  const invalidSubmit = await fetch(`${baseUrl}/api/records`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ mineCount: 30 })
  });
  assert(invalidSubmit.status === 400, "invalid submit values were not rejected");

  console.log("Ranking API smoke test passed");
} catch (error) {
  console.error(error);
  console.error(logs);
  process.exitCode = 1;
} finally {
  await stopWorker(worker);
}
