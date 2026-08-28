/// <reference lib="webworker" />

import { generateNoGuess } from "../game/no-guess-generator";
import type { GenerateWorkerRequest, GenerateWorkerResponse } from "./generator-messages";

const workerScope = self as unknown as DedicatedWorkerGlobalScope;

workerScope.addEventListener("message", (event: MessageEvent<GenerateWorkerRequest>) => {
  const { type, requestId, options } = event.data;
  try {
    if (type !== "generate") throw new Error(`Unknown worker request: ${String(type)}`);
    const result = generateNoGuess(options);
    const response: GenerateWorkerResponse = { type: "generated", requestId, result };
    workerScope.postMessage(response);
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error(String(error));
    const response: GenerateWorkerResponse = {
      type: "error",
      requestId,
      message: normalized.message,
      stack: normalized.stack
    };
    workerScope.postMessage(response);
  }
});

export {};
