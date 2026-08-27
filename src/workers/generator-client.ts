import type { GenerateOptions, GenerateResult } from "../game/types";
import type { GenerateWorkerRequest, GenerateWorkerResponse } from "./generator-messages";

export interface WorkerLike {
  postMessage(message: GenerateWorkerRequest): void;
  addEventListener(type: "message", listener: (event: MessageEvent<GenerateWorkerResponse>) => void): void;
  removeEventListener(type: "message", listener: (event: MessageEvent<GenerateWorkerResponse>) => void): void;
  terminate?(): void;
}

interface PendingRequest {
  resolve: (result: GenerateResult) => void;
  reject: (error: Error) => void;
}

export class GeneratorClient {
  private readonly pending = new Map<string, PendingRequest>();

  private nextRequestId = 0;

  constructor(private readonly worker: WorkerLike) {
    worker.addEventListener("message", this.handleMessage);
  }

  generate(options: GenerateOptions): Promise<GenerateResult> {
    const requestId = `generate-${this.nextRequestId++}`;
    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      this.worker.postMessage({ type: "generate", requestId, options });
    });
  }

  dispose(): void {
    this.worker.removeEventListener("message", this.handleMessage);
    this.worker.terminate?.();
    for (const request of this.pending.values()) {
      request.reject(new Error("Generator worker was disposed"));
    }
    this.pending.clear();
  }

  private readonly handleMessage = (event: MessageEvent<GenerateWorkerResponse>): void => {
    const response = event.data;
    const request = this.pending.get(response.requestId);
    if (!request) return;
    this.pending.delete(response.requestId);
    if (response.type === "error") {
      request.reject(new Error(response.message));
      return;
    }
    request.resolve(response.result);
  };
}

export function createGeneratorClient(): GeneratorClient {
  const worker = new Worker(new URL("./generator-worker.ts", import.meta.url), { type: "module" });
  return new GeneratorClient(worker);
}
