// Privacy filter: strip identifying info from players for anonymous visitors.
import type { Player } from "../types.js";

export type PublicPlayer = Pick<Player, "id" | "avatar" | "position" | "overall">;
export type AuthPlayer = Player;

export const filterPlayer = (player: Player, authenticated: boolean): PublicPlayer | AuthPlayer =>
  authenticated ? player : { id: player.id, avatar: player.avatar, position: player.position, overall: player.overall };

export const filterPlayers = (players: Player[], authenticated: boolean) =>
  players.map((p) => filterPlayer(p, authenticated));
