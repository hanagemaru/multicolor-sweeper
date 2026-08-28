import { describe, expect, it } from "vitest";
import type { GenerateWorkerRequest, GenerateWorkerResponse } from "./generator-messages";
import { GeneratorClient, type WorkerLike } from "./generator-client";

class FakeWorker implements WorkerLike {
  private listener: ((event: MessageEvent<GenerateWorkerResponse>) => void) | null = null;

  addEventListener(_type: "message", listener: (event: MessageEvent<GenerateWorkerResponse>) => void): void {
    this.listener = listener;
  }

  removeEventListener(): void {
    this.listener = null;
  }

  postMessage(message: GenerateWorkerRequest): void {
    setTimeout(() => {
      this.listener?.({
        data: {
          type: "error",
          requestId: message.requestId,
          message: "fake-complete"
        }
      } as MessageEvent<GenerateWorkerResponse>);
    }, 5);
  }
}

describe("generator worker boundary", () => {
  it("生成要求を非同期メッセージとして送り、メインイベントループを塞がない", async () => {
    const client = new GeneratorClient(new FakeWorker());
    const order: string[] = [];
    const generation = client.generate({
      baseSeed: "worker-boundary",
      filter: "C",
      mineCount: 20,
      firstRow: 4,
      firstCol: 4
    }).catch((error: Error) => {
      order.push(error.message);
    });
    await new Promise<void>((resolve) => setTimeout(() => {
      order.push("main-loop-tick");
      resolve();
    }, 0));
    await generation;
    expect(order).toEqual(["main-loop-tick", "fake-complete"]);
    client.dispose();
  });
});
