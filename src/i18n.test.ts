import { describe, expect, it } from "vitest";
import {
  bombCountLabel,
  colorCountLabel,
  flagLabel,
  flagsRemainingLabel,
  getCopy,
  resolveInitialLanguage
} from "./i18n";

describe("language selection", () => {
  it("uses a saved valid language before the browser language", () => {
    expect(resolveInitialLanguage("en", ["ja-JP"])).toBe("en");
    expect(resolveInitialLanguage("ja", ["en-US"])).toBe("ja");
  });

  it("uses Japanese when any preferred browser language is Japanese", () => {
    expect(resolveInitialLanguage(null, ["en-US", "ja-JP"])).toBe("ja");
  });

  it("defaults to English for unsupported languages or an invalid saved value", () => {
    expect(resolveInitialLanguage(null, ["fr-FR"])).toBe("en");
    expect(resolveInitialLanguage("invalid", [])).toBe("en");
  });
});

describe("localized UI copy", () => {
  it("uses the natural Japanese gameplay instruction", () => {
    expect(getCopy("ja").status.playing).toBe("タップで開く・スワイプで旗を立てる");
  });

  it("localizes counts and flag labels", () => {
    expect(bombCountLabel("ja", 20)).toBe("20 BOMBS");
    expect(bombCountLabel("en", 20)).toBe("20 BOMBS");
    expect(colorCountLabel("ja", 3)).toBe("3色");
    expect(colorCountLabel("en", 4)).toBe("4 COLORS");
    expect(flagLabel("ja", 2)).toBe("緑旗");
    expect(flagLabel("en", "neutral")).toBe("neutral flag");
  });

  it("keeps established game terms in English in Japanese mode", () => {
    const copy = getCopy("ja");
    expect(copy.flags).toBe("FLAGS");
    expect(copy.clearTime).toBe("CLEAR TIME");
    expect(copy.retry).toBe("RETRY");
    expect(copy.bestTime).toBe("BEST TIME");
    expect(copy.rankingCategory).toBe("ランキング部門");
    expect(copy.submitTime).toBe("タイムを登録");
  });

  it("provides complete settings and irreversible deletion copy in both languages", () => {
    const ja = getCopy("ja");
    const en = getCopy("en");
    expect(ja.settings).toBe("設定");
    expect(en.settings).toBe("SETTINGS");
    expect(ja.deleteOnlineDataWarning).toContain("取り消せません");
    expect(en.deleteOnlineDataWarning).toContain("cannot be undone");
    expect(ja.deleteOnlineDataWarning).toContain("名前とランキング記録");
    expect(en.deleteOnlineDataWarning).toContain("name and ranking records");
  });

  it("localizes normal and over-limit remaining flag announcements", () => {
    expect(flagsRemainingLabel("ja", -2)).toContain("2本多い");
    expect(flagsRemainingLabel("en", -2)).toContain("2 too many flags");
  });
});
