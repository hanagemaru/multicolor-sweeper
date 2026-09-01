import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buttonUiText } from "./button-typography";

function renderButtonText(text: string | number): string {
  return renderToStaticMarkup(createElement("button", null, buttonUiText(text)));
}

describe("buttonUiText", () => {
  it("英数をVT323用のrunに分ける", () => {
    const markup = renderButtonText("VIEW BOARD 20");

    expect(markup).toContain('class="button-script-run button-latin-run"');
    expect(markup).not.toContain("button-ja-run");
    expect(markup.replace(/<[^>]+>/gu, "")).toBe("VIEW BOARD 20");
  });

  it("日本語をMaruMonica用のrunに分ける", () => {
    const markup = renderButtonText("盤面を見る");

    expect(markup).toContain('class="button-script-run button-ja-run"');
    expect(markup).not.toContain("button-latin-run");
    expect(markup.replace(/<[^>]+>/gu, "")).toBe("盤面を見る");
  });

  it.each(["3色", "爆弾 15個", "RESULTへ戻る"])("混在ラベル %s の文字種を分ける", (label) => {
    const markup = renderButtonText(label);

    expect(markup).toContain("button-latin-run");
    expect(markup).toContain("button-ja-run");
    expect(markup.replace(/<[^>]+>/gu, "")).toBe(label);
  });
});
