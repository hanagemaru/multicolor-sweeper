import type React from "react";

const JAPANESE_PATTERN = /[\u3040-\u30ff\u3400-\u9fff]/u;

export function buttonUiText(text: string | number): React.ReactNode {
  return String(text)
    .split(/([\u3040-\u30ff\u3400-\u9fff]+|[A-Za-z0-9#./:+!-]+)/gu)
    .filter(Boolean)
    .map((part, index) => {
      if (JAPANESE_PATTERN.test(part)) {
        return <span className="button-script-run button-ja-run" key={`${part}-${index}`}>{part}</span>;
      }
      if (/[A-Za-z0-9]/u.test(part)) {
        return <span className="button-script-run button-latin-run" key={`${part}-${index}`}>{part}</span>;
      }
      return part;
    });
}
