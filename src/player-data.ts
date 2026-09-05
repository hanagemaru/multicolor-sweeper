import {
  deleteOnlinePlayer,
  PLAYER_IDENTITY_STORAGE_KEY,
  readOrCreatePlayerIdentity
} from "./ranking-client";
import type { PlayerIdentity } from "./ranking-shared";
import { PLAYER_NAME_STORAGE_KEY } from "./ranking";

type PlayerDataStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

interface DeletePlayerDataOptions {
  identity: PlayerIdentity;
  storage: PlayerDataStorage;
  deletePlayer?: (identity: PlayerIdentity) => Promise<void>;
  createIdentity?: (storage: Storage) => PlayerIdentity;
}

/**
 * Deletes server-side personal data first. Local credentials are only cleared
 * after the server confirms success, then a fresh anonymous identity is made.
 */
export async function deletePlayerData({
  identity,
  storage,
  deletePlayer = deleteOnlinePlayer,
  createIdentity = readOrCreatePlayerIdentity
}: DeletePlayerDataOptions): Promise<PlayerIdentity> {
  await deletePlayer(identity);
  storage.removeItem(PLAYER_IDENTITY_STORAGE_KEY);
  storage.removeItem(PLAYER_NAME_STORAGE_KEY);
  return createIdentity(storage as Storage);
}
