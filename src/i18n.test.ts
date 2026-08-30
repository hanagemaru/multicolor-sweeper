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

  it("keeps familiar game terms in English while localizing ambiguous labels", () => {
    const ja = getCopy("ja");
    expect(ja.start).toBe("START");
    expect(ja.retry).toBe("RETRY");
    expect(ja.ranking).toBe("RANKING");
    expect(ja.flags).toBe("残り旗");
    expect(ja.viewBoard).toBe("盤面を見る");
    expect(ja.submitTime).toBe("タイムを登録");
    expect(getCopy("en").submitTime).toBe("SUBMIT TIME");
  });

  it("localizes counts and flag labels", () => {
    expect(bombCountLabel("ja", 20)).toBe("爆弾 20個");
    expect(bombCountLabel("en", 20)).toBe("20 BOMBS");
    expect(colorCountLabel("ja", 3)).toBe("3色");
    expect(colorCountLabel("en", 4)).toBe("4 COLORS");
    expect(flagLabel("ja", 2)).toBe("緑旗");
    expect(flagLabel("en", "neutral")).toBe("neutral flag");
  });

  it("localizes normal and over-limit remaining flag announcements", () => {
    expect(flagsRemainingLabel("ja", -2)).toContain("2本多い");
    expect(flagsRemainingLabel("en", -2)).toContain("2 too many flags");
  });
});
