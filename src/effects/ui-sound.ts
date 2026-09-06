// 盤面の演出音と同じ8bit系の世界観で、UIボタンの押下音を出し分けるための分類。
// 盤面セル（role="gridcell"）は開封・フラグ音を持つため対象外。
export type UiSoundKind = "start" | "confirm" | "back" | "danger" | "select" | "tap";

// 選択肢を並べた行。押すたびに選択が移るので、決定音ではなく軽い選択音にする。
const OPTION_GROUP_SELECTOR = ".language-toggle, .choice-row, .ranking-tabs";

export type UiSoundTarget = {
  classNames: readonly string[];
  role?: string | null;
  disabled?: boolean;
  inOptionGroup?: boolean;
};

export function uiSoundForButton(button: UiSoundTarget): UiSoundKind | null {
  if (button.disabled) return null;
  if (button.role === "gridcell") return null;

  const has = (name: string): boolean => button.classNames.includes(name);
  if (has("start-button")) return "start";
  if (has("danger-button") || has("settings-delete-button")) return "danger";
  if (has("primary-button")) return "confirm";
  if (has("secondary-button")) return "back";
  if (button.inOptionGroup) return "select";
  return "tap";
}

export function uiSoundForClickTarget(target: EventTarget | null): UiSoundKind | null {
  if (typeof Element === "undefined" || !(target instanceof Element)) return null;
  const button = target.closest("button");
  if (!button) return null;
  return uiSoundForButton({
    classNames: Array.from(button.classList),
    role: button.getAttribute("role"),
    disabled: button.disabled,
    inOptionGroup: button.closest(OPTION_GROUP_SELECTOR) !== null
  });
}
