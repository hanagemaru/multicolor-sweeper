import { describe, expect, it } from "vitest";
import { uiSoundForButton } from "./ui-sound";

describe("UIボタンの音の出し分け", () => {
  it("STARTは専用の上昇音にする", () => {
    expect(uiSoundForButton({ classNames: ["start-button"] })).toBe("start");
  });

  it("主要アクションは決定音、副アクションは戻り音にする", () => {
    expect(uiSoundForButton({ classNames: ["primary-button"] })).toBe("confirm");
    expect(uiSoundForButton({ classNames: ["secondary-button", "settings-back-button"] })).toBe("back");
  });

  it("削除系は警告音にする", () => {
    expect(uiSoundForButton({ classNames: ["danger-button"] })).toBe("danger");
    expect(uiSoundForButton({ classNames: ["settings-delete-button"] })).toBe("danger");
  });

  it("選択肢の行にあるボタンは選択音にする", () => {
    expect(uiSoundForButton({ classNames: ["selected"], inOptionGroup: true })).toBe("select");
    expect(uiSoundForButton({ classNames: [], inOptionGroup: true })).toBe("select");
  });

  it("分類のないボタンは汎用のタップ音にする", () => {
    expect(uiSoundForButton({ classNames: ["hud-action"] })).toBe("tap");
    expect(uiSoundForButton({ classNames: ["settings-icon-button"] })).toBe("tap");
    expect(uiSoundForButton({ classNames: ["ranking-button"] })).toBe("tap");
  });

  it("盤面セルと無効ボタンは鳴らさない", () => {
    expect(uiSoundForButton({ classNames: ["cell"], role: "gridcell" })).toBeNull();
    expect(uiSoundForButton({ classNames: ["primary-button"], disabled: true })).toBeNull();
  });

  it("種別クラスは選択肢の行より優先する", () => {
    expect(uiSoundForButton({ classNames: ["primary-button"], inOptionGroup: true })).toBe("confirm");
  });
});
