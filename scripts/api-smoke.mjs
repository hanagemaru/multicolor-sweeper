import { mkdirSync, rmSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";

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

rmSync(persistDir, { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
run(["wrangler", "d1", "migrations", "apply", "multicolor-sweeper-ranking", "--local", `--persist-to=${persistDir}`]);
run(["wrangler", "d1", "execute", "multicolor-sweeper-ranking", "--local", `--persist-to=${persistDir}`, "--file", "scripts/api-seed.sql"]);

const worker = spawn(npx, ["wrangler", "dev", "--local", "--port", String(port), `--persist-to=${persistDir}`], {
  stdio: ["ignore", "pipe", "pipe"],
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
  assert(JSON.stringify(ranking20Body.entries.map((entry) => entry.timeMs)) === JSON.stringify([10000, 11000, 12000]), "ranking order is wrong");
  assert(JSON.stringify(ranking20Body.entries.map((entry) => entry.colorCount)) === JSON.stringify([4, 3, 3]), "3/4-color mixing is wrong");

  for (const mineCount of [15, 25]) {
    const response = await fetch(`${baseUrl}/api/rankings?mineCount=${mineCount}&limit=50`);
    const body = await response.json();
    assert(response.status === 200 && body.entries.length === 1, `${mineCount}-bomb ranking failed`);
  }

  const auth = { Authorization: `Bearer p-self.${"a".repeat(64)}` };
  const ownRanking = await fetch(`${baseUrl}/api/rankings?mineCount=20&limit=50`, { headers: auth });
  const ownBody = await ownRanking.json();
  assert(ownRanking.status === 200, "authenticated ranking failed");
  assert(ownBody.yourRank === 2, "own rank is wrong");
  assert(ownBody.entries.some((entry) => entry.playerId === "p-self" && entry.isPlayer), "player row was not marked");

  const rename = await fetch(`${baseUrl}/api/player`, {
    method: "PUT",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ displayName: "SELF2" })
  });
  assert(rename.status === 200, "name update failed");
  const renamedRanking = await fetch(`${baseUrl}/api/rankings?mineCount=20&limit=50`);
  const renamedBody = await renamedRanking.json();
  assert(renamedBody.entries.some((entry) => entry.playerId === "p-self" && entry.name === "SELF2"), "renamed player not reflected");

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
  worker.kill("SIGTERM");
}
