import { describe, expect, it } from "vitest";
import { handleRequest } from "./worker";
const config = { GAMEPLAY_ANALYTICS_MODE: "off" } as Parameters<typeof handleRequest>[1];

describe("new and old Sweeper paths", () => {
  for (const pathname of [
    "/api/health",
    "/games/multicolor-sweeper/play/api/health"
  ]) {
    it(`routes ${pathname} to the same Worker`, async () => {
      const res = await handleRequest(new Request("https://hanage.app" + pathname), config);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ok:true});
    });
  }
  it("does not expose unrelated paths", async () => {
    const res = await handleRequest(new Request("https://hanage.app/games/multicolor-sweeper/play/unrelated"), config);
    expect(res.status).toBe(404);
  });
  it("rejects analytics writes when isolated previews disable tracking", async () => {
    const res = await handleRequest(new Request(
      "https://hanage.app/games/multicolor-sweeper/play/api/gameplay-events",
      {method:"POST"}
    ), config);
    expect(res.status).toBe(204);
  });
});
