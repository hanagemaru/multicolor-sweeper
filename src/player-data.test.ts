import { describe, expect, it, vi } from "vitest";
import { LANGUAGE_STORAGE_KEY } from "./i18n";
import { deletePlayerData } from "./player-data";
import { PLAYER_IDENTITY_STORAGE_KEY } from "./ranking-client";
import { bestRecordStorageKey, PLAYER_NAME_STORAGE_KEY } from "./ranking";

function memoryStorage(initial: Record<string, string>) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    storage: {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => { values.delete(key); },
      setItem: (key: string, value: string) => { values.set(key, value); }
    }
  };
}

describe("online player data deletion", () => {
  const oldIdentity = { playerId: "old-player", credential: "old-credential" };
  const newIdentity = { playerId: "new-player", credential: "new-credential" };

  it("clears the old identity and name, then creates a fresh anonymous identity", async () => {
    const { values, storage } = memoryStorage({
      [PLAYER_IDENTITY_STORAGE_KEY]: JSON.stringify(oldIdentity),
      [PLAYER_NAME_STORAGE_KEY]: "PLAYER"
    });
    const deletePlayer = vi.fn().mockResolvedValue(undefined);
    const createIdentity = vi.fn((target: Storage) => {
      target.setItem(PLAYER_IDENTITY_STORAGE_KEY, JSON.stringify(newIdentity));
      return newIdentity;
    });

    await expect(deletePlayerData({ identity: oldIdentity, storage, deletePlayer, createIdentity })).resolves.toEqual(newIdentity);
    expect(deletePlayer).toHaveBeenCalledWith(oldIdentity);
    expect(values.has(PLAYER_NAME_STORAGE_KEY)).toBe(false);
    expect(JSON.parse(values.get(PLAYER_IDENTITY_STORAGE_KEY) ?? "null")).toEqual(newIdentity);
  });

  it("keeps local identity and name when the server deletion fails", async () => {
    const serializedIdentity = JSON.stringify(oldIdentity);
    const { values, storage } = memoryStorage({
      [PLAYER_IDENTITY_STORAGE_KEY]: serializedIdentity,
      [PLAYER_NAME_STORAGE_KEY]: "PLAYER"
    });

    await expect(deletePlayerData({
      identity: oldIdentity,
      storage,
      deletePlayer: vi.fn().mockRejectedValue(new Error("offline"))
    })).rejects.toThrow("offline");
    expect(values.get(PLAYER_IDENTITY_STORAGE_KEY)).toBe(serializedIdentity);
    expect(values.get(PLAYER_NAME_STORAGE_KEY)).toBe("PLAYER");
  });

  it("preserves language, local bests, and non-personal game settings", async () => {
    const retained = {
      [LANGUAGE_STORAGE_KEY]: "ja",
      [bestRecordStorageKey(20)]: '{"timeMs":12345,"colorCount":3}',
      "multicolor-sweeper-difficulty": "hard",
      "multicolor-sweeper-color-count": "4"
    };
    const { values, storage } = memoryStorage({
      ...retained,
      [PLAYER_IDENTITY_STORAGE_KEY]: JSON.stringify(oldIdentity),
      [PLAYER_NAME_STORAGE_KEY]: "PLAYER"
    });

    await deletePlayerData({
      identity: oldIdentity,
      storage,
      deletePlayer: vi.fn().mockResolvedValue(undefined),
      createIdentity: vi.fn(() => newIdentity)
    });

    for (const [key, value] of Object.entries(retained)) expect(values.get(key)).toBe(value);
  });
});
