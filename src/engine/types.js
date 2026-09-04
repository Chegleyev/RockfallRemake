/**
 * Rockfall Game Types & Tile Constants
 * Matches exact 1-to-1 ZX Spectrum sprite and map buffer IDs
 */

export const TILES = {
  EMPTY: 0,
  DIRT: 1,
  WALL: 2,
  STEEL_WALL: 3,
  BOULDER: 4,
  EXIT: 5,
  PLAYER: 6,
  PLAYER_FRAME_1: 7,
  PLAYER_FRAME_2: 8,
  PLAYER_FRAME_3: 9,
  DIAMOND: 10,
  DIAMOND_FRAME_1: 11,
  DIAMOND_FRAME_2: 12,
  DIAMOND_FRAME_3: 13,
  BOMB: 14,
  BOMB_FRAME_1: 15,
  BOMB_FRAME_2: 16,
  BOMB_FRAME_3: 17,
  BUTTERFLY: 18,
  BUTTERFLY_FRAME_1: 19,
  BUTTERFLY_FRAME_2: 20,
  BUTTERFLY_FRAME_3: 21,
  SOLDIER: 22,
  SOLDIER_FRAME_1: 23,
  SOLDIER_FRAME_2: 24,
  SOLDIER_FRAME_3: 25,
  AMOEBA: 26,
  AMOEBA_FRAME_1: 27,
  AMOEBA_FRAME_2: 28,
  AMOEBA_FRAME_3: 29,
};

export const isDiamond = (t) => t >= 10 && t <= 13;
export const isPlayer = (t) => t >= 6 && t <= 9;
export const isBomb = (t) => t >= 14 && t <= 17;
export const isButterfly = (t) => t >= 18 && t <= 21;
export const isSoldier = (t) => t >= 22 && t <= 25;
export const isAmoeba = (t) => t >= 26 && t <= 29;
export const isCreature = (t) => t >= 18 && t <= 29;

export const DIR = {
  NONE: { dx: 0, dy: 0 },
  UP: { dx: 0, dy: -1 },
  RIGHT: { dx: 1, dy: 0 },
  DOWN: { dx: 0, dy: 1 },
  LEFT: { dx: -1, dy: 0 },
};

export const GAME_STATE = {
  START: 'START',
  PLAYING: 'PLAYING',
  LEVEL_WON: 'LEVEL_WON',
  PLAYER_DEAD: 'PLAYER_DEAD',
  GAME_OVER: 'GAME_OVER',
};
