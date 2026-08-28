import type { GenerateOptions, GenerateResult } from "../game/types";

export interface GenerateWorkerRequest {
  type: "generate";
  requestId: string;
  options: GenerateOptions;
}

export type GenerateWorkerResponse =
  | { type: "generated"; requestId: string; result: GenerateResult }
  | { type: "error"; requestId: string; message: string; stack?: string };
