/**
 * Rockfall Physics & Simulation Engine
 * Faithful Z80 simulation loop:
 * - Top-to-bottom scan order (exact Z80 0xE69E..0xE70B).
 * - Rolling off brick walls, steel walls, boulders, diamonds, bombs (exact Z80 0xE7B0..0xE7E0).
 * - 1-tick hesitation delay before stationary boulders/diamonds roll off support.
 * - Falling bomb explodes (3x3) upon impact with ANY surface (exact Z80 0xE722..0xE72F).
 * - Falling boulders/diamonds squash Rockford in single cell (exact Z80 0xE850 LD (HL), 0x3E).
 * - Falling boulders crush creatures in single cell without 3x3 blast (butterflies yield diamonds).
 * - Soldier (22..25): Strictly horizontal patrol left/right, reversing at walls (exact Z80 0xE6E5..0xE708).
 * - Amoeba (26..29) & Butterfly (18..21): Deterministic wall-follower patrol (exact Z80 0xE73E..0xE78C).
 */

import { TILES, DIR, isDiamond, isPlayer, isBomb, isButterfly, isSoldier, isAmoeba, isCreature } from './types.js';

export class RockfallPhysics {
  constructor(width = 64, height = 32) {
    this.width = width;
    this.height = height;
    this.grid = new Uint8Array(width * height);
    this.falling = new Uint8Array(width * height);
    this.fallDelay = new Uint8Array(width * height);
    this.updated = new Uint8Array(width * height);

    this.playerX = 0;
    this.playerY = 0;
    this.playerAlive = true;
    this.pushTimer = 0;

    this.jewelsLeft = 0;
    this.exitOpen = false;
    this.exitX = 0;
    this.exitY = 0;
    this.creatureTick = 0;

    this.onEvent = null;
  }

  loadLevel(levelData) {
    this.width = levelData.width;
    this.height = levelData.height;
    this.grid = new Uint8Array(this.width * this.height);
    this.falling = new Uint8Array(this.width * this.height);
    this.fallDelay = new Uint8Array(this.width * this.height);
    this.updated = new Uint8Array(this.width * this.height);
    this.creatureTick = 0;
    this.jewelsLeft = levelData.jewels_required || 0;
    this.exitOpen = this.jewelsLeft <= 0;
    this.playerAlive = true;
    this.pushTimer = 0;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = levelData.grid[y][x];
        const idx = y * this.width + x;
        this.grid[idx] = tile;
        if (isPlayer(tile)) {
          this.playerX = x;
          this.playerY = y;
        } else if (tile === TILES.EXIT) {
          this.exitX = x;
          this.exitY = y;
          // Authentic ZX Spectrum Z80 logic (0xEC53): EXIT is initially set to DIRT (0x01) in grid
          if (!this.exitOpen) {
            this.grid[idx] = TILES.DIRT;
          }
        }
      }
    }
  }

  serializeState() {
    return {
      width: this.width,
      height: this.height,
      playerX: this.playerX,
      playerY: this.playerY,
      playerAlive: this.playerAlive,
      jewelsLeft: this.jewelsLeft,
      exitOpen: this.exitOpen,
      exitX: this.exitX,
      exitY: this.exitY,
      creatureTick: this.creatureTick,
      pushTimer: this.pushTimer,
      grid: Array.from(this.grid),
      falling: Array.from(this.falling),
      fallDelay: Array.from(this.fallDelay)
    };
  }

  restoreState(state) {
    if (!state) return;
    this.width = state.width;
    this.height = state.height;
    this.playerX = state.playerX;
    this.playerY = state.playerY;
    this.playerAlive = state.playerAlive;
    this.jewelsLeft = state.jewelsLeft;
    this.exitOpen = state.exitOpen;
    this.exitX = state.exitX;
    this.exitY = state.exitY;
    this.creatureTick = state.creatureTick || 0;
    this.pushTimer = state.pushTimer || 0;
    this.grid = new Uint8Array(state.grid);
    this.falling = new Uint8Array(state.falling);
    this.fallDelay = new Uint8Array(state.fallDelay);
    this.updated = new Uint8Array(this.width * this.height);
  }

  getTile(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return TILES.STEEL_WALL;
    return this.grid[y * this.width + x];
  }

  setTile(x, y, val) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.grid[y * this.width + x] = val;
    }
  }

  emit(event, data) {
    if (this.onEvent) this.onEvent(event, data);
  }

  handlePlayerInput(dir) {
    if (!this.playerAlive || (dir.dx === 0 && dir.dy === 0)) return false;

    const targetX = this.playerX + dir.dx;
    const targetY = this.playerY + dir.dy;
    const targetTile = this.getTile(targetX, targetY);

    if (targetTile === TILES.EMPTY) {
      this.movePlayerTo(targetX, targetY);
      this.emit('walk', { x: targetX, y: targetY });
      return true;
    } else if (targetTile === TILES.DIRT) {
      this.movePlayerTo(targetX, targetY);
      this.emit('dig', { x: targetX, y: targetY });
      return true;
    } else if (isDiamond(targetTile)) {
      const targetIdx = targetY * this.width + targetX;
      // Moving UP directly into a falling diamond crushes Rockford!
      if (dir.dy === -1 && this.falling[targetIdx] === 1) {
        this.squashPlayer(this.playerX, this.playerY);
        return true;
      }

      // Collect diamond (including grabbing a falling diamond sideways!)
      this.falling[targetIdx] = 0;
      this.fallDelay[targetIdx] = 0;
      this.jewelsLeft = Math.max(0, this.jewelsLeft - 1);
      this.movePlayerTo(targetX, targetY);
      this.emit('diamond', { x: targetX, y: targetY, jewelsLeft: this.jewelsLeft });
      if (this.jewelsLeft === 0 && !this.exitOpen) {
        this.exitOpen = true;
        // Authentic ZX Spectrum Z80 logic (0xEA58): write tile 0x05 (EXIT) to the map
        this.setTile(this.exitX, this.exitY, TILES.EXIT);
        this.emit('exit_open', { x: this.exitX, y: this.exitY });
      }
      return true;
    } else if (targetTile === TILES.EXIT && this.exitOpen) {
      this.movePlayerTo(targetX, targetY);
      this.emit('level_won', { x: targetX, y: targetY });
      return true;
    } else if (targetTile === TILES.BOULDER && dir.dy === 0) {
      // Horizontal push boulder
      const behindX = targetX + dir.dx;
      const behindY = targetY;
      if (this.getTile(behindX, behindY) === TILES.EMPTY) {
        this.setTile(behindX, behindY, TILES.BOULDER);
        this.falling[behindY * this.width + behindX] = 0;
        this.fallDelay[behindY * this.width + behindX] = 0;
        this.emit('entity_moved', { fromX: targetX, fromY: targetY, toX: behindX, toY: behindY, tile: TILES.BOULDER, rotationDelta: dir.dx * Math.PI / 2 });
        this.movePlayerTo(targetX, targetY);
        this.emit('push', { x: targetX, y: targetY });
        return true;
      }
    } else if (isBomb(targetTile) && dir.dy === 0) {
      // Horizontal push bomb across flat surface!
      const targetIdx = targetY * this.width + targetX;
      if (this.falling[targetIdx] === 1) {
        return false;
      }
      const behindX = targetX + dir.dx;
      const behindY = targetY;
      if (this.getTile(behindX, behindY) === TILES.EMPTY) {
        this.setTile(behindX, behindY, targetTile);
        this.falling[behindY * this.width + behindX] = 0;
        this.fallDelay[behindY * this.width + behindX] = 0;
        this.emit('entity_moved', { fromX: targetX, fromY: targetY, toX: behindX, toY: behindY, tile: targetTile, rotationDelta: 0 });
        this.movePlayerTo(targetX, targetY);
        this.emit('push', { x: targetX, y: targetY });
        return true;
      }
    } else if (isBomb(targetTile) && dir.dy === -1 && this.falling[targetY * this.width + targetX] === 1) {
      // Moving UP directly into a falling bomb causes impact detonation!
      this.explode(targetX, targetY, false);
      return true;
    } else if (isCreature(targetTile)) {
      // Touching an enemy squashes Rockford!
      this.squashPlayer(this.playerX, this.playerY);
      return true;
    }
    return false;
  }

  movePlayerTo(nx, ny) {
    const fx = this.playerX;
    const fy = this.playerY;
    this.setTile(fx, fy, TILES.EMPTY);
    this.setTile(nx, ny, TILES.PLAYER);
    this.playerX = nx;
    this.playerY = ny;
    this.emit('player_step', { fromX: fx, fromY: fy, toX: nx, toY: ny });
  }

  // Exact Z80: scans from TOP to BOTTOM (0x6E40 -> 0x75C0, row 1 to height-2)
  tick() {
    this.updated.fill(0);
    this.creatureTick = (this.creatureTick + 1) % 2;

    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const idx = y * this.width + x;
        if (this.updated[idx]) continue;

        const tile = this.grid[idx];

        // Boulder, Diamond, and Bomb falling physics (Exact Z80 0xE722, 0xE731, 0xE790)
        if (tile === TILES.BOULDER || isDiamond(tile) || isBomb(tile)) {
          const belowTile = this.getTile(x, y + 1);
          const isFalling = this.falling[idx] === 1;

          if (belowTile === TILES.EMPTY) {
            // Free fall directly downwards
            this.setTile(x, y, TILES.EMPTY);
            this.setTile(x, y + 1, tile);
            this.falling[idx] = 0;
            this.fallDelay[idx] = 0;
            this.falling[(y + 1) * this.width + x] = 1;
            this.fallDelay[(y + 1) * this.width + x] = 0;
            this.updated[(y + 1) * this.width + x] = 1;
            this.emit('entity_moved', { fromX: x, fromY: y, toX: x, toY: y + 1, tile: tile, rotationDelta: 0 });
            continue;
          } else {
            // Below space is NOT empty
            if (isFalling) {
              this.falling[idx] = 0;
              this.fallDelay[idx] = 0;

              // Exact Z80 0xE729..0xE72D:
              // Only a falling BOMB creates a 3x3 explosion on impact!
              if (isBomb(tile)) {
                this.explode(x, y, false);
                continue;
              }

              // Exact Z80 0xE850 LD (HL), 0x3E:
              // Falling boulder or diamond squashes Rockford in his single cell!
              if (isPlayer(belowTile)) {
                this.squashPlayer(x, y + 1);
                continue;
              }

              // Falling boulder crushes creature:
              // Butterfly detonates into a 3x3 blast of DIAMONDS!
              // Other creatures (Amoeba / Soldier) are squashed in their single cell (NO 3x3 blast)!
              if (isCreature(belowTile)) {
                if (isButterfly(belowTile)) {
                  this.explode(x, y + 1, true);
                } else {
                  this.squashCreature(x, y + 1, false);
                }
                continue;
              }

              // Falling boulder hits stationary bomb -> Bomb detonates!
              if (isBomb(belowTile)) {
                this.explode(x, y + 1, false);
                continue;
              }

              // Boulder or Diamond lands safely on ground/wall
              this.emit('drop_sound', { x, y, tile });
            }

            // Rolling: Exact Z80 0xE7B0..0xE7E0:
            // Boulders and Bombs roll off brick walls, steel walls, boulders, diamonds, bombs!
            if (this.canRollOff(belowTile)) {
              const canRollLeft = (
                this.getTile(x - 1, y) === TILES.EMPTY &&
                this.getTile(x - 1, y + 1) === TILES.EMPTY &&
                this.getTile(x - 1, y - 1) !== TILES.BOULDER &&
                !isDiamond(this.getTile(x - 1, y - 1)) &&
                !isBomb(this.getTile(x - 1, y - 1))
              );

              const canRollRight = (
                this.getTile(x + 1, y) === TILES.EMPTY &&
                this.getTile(x + 1, y + 1) === TILES.EMPTY &&
                this.getTile(x + 1, y - 1) !== TILES.BOULDER &&
                !isDiamond(this.getTile(x + 1, y - 1)) &&
                !isBomb(this.getTile(x + 1, y - 1))
              );

              if (canRollLeft || canRollRight) {
                // 1-tick hesitation delay before boulder rolls off
                if (this.fallDelay[idx] < 1) {
                  this.fallDelay[idx]++;
                  continue;
                }

                this.fallDelay[idx] = 0;
                if (canRollLeft) {
                  this.setTile(x, y, TILES.EMPTY);
                  this.setTile(x - 1, y, tile);
                  this.falling[y * this.width + (x - 1)] = 1;
                  this.fallDelay[y * this.width + (x - 1)] = 0;
                  this.updated[y * this.width + (x - 1)] = 1;
                  this.emit('entity_moved', { fromX: x, fromY: y, toX: x - 1, toY: y, tile: tile, rotationDelta: -Math.PI / 2 });
                  continue;
                } else if (canRollRight) {
                  this.setTile(x, y, TILES.EMPTY);
                  this.setTile(x + 1, y, tile);
                  this.falling[y * this.width + (x + 1)] = 1;
                  this.fallDelay[y * this.width + (x + 1)] = 0;
                  this.updated[y * this.width + (x + 1)] = 1;
                  this.emit('entity_moved', { fromX: x, fromY: y, toX: x + 1, toY: y, tile: tile, rotationDelta: Math.PI / 2 });
                  continue;
                }
              } else {
                this.fallDelay[idx] = 0;
              }
            } else {
              this.fallDelay[idx] = 0;
            }
          }
        }

        // Enemies patrol logic: 1 tile per tick, matching Rockford exactly as in original!
        if (isSoldier(tile)) {
          this.updateSoldier(x, y, tile);
        } else if (isAmoeba(tile) || isButterfly(tile)) {
          this.updateWallFollower(x, y, tile);
        }
      }
    }
  }

  // Exact Z80: 0xE7B0 CP 6 (Wall, Steel Wall, Boulder) & 0xE7B9 CP 18 (Diamonds, Bombs)
  canRollOff(tile) {
    return tile === TILES.WALL || tile === TILES.STEEL_WALL || tile === TILES.BOULDER || isDiamond(tile) || isBomb(tile);
  }

  // Exact Z80 0xE6E5..0xE708: Patrolling soldier walks strictly left-to-right and right-to-left
  updateSoldier(x, y, tile) {
    const isFacingLeft = (tile >= 24);
    const dx = isFacingLeft ? -1 : 1;
    const nx = x + dx;
    const ny = y;
    const frontTile = this.getTile(nx, ny);

    if (frontTile === TILES.EMPTY) {
      // Step forward, toggle stride frame
      const nextTile = isFacingLeft
        ? (tile === 24 ? 25 : 24)
        : (tile === 22 ? 23 : 22);

      this.setTile(x, y, TILES.EMPTY);
      this.setTile(nx, ny, nextTile);
      this.updated[ny * this.width + nx] = 1;
      this.emit('entity_moved', { fromX: x, fromY: y, toX: nx, toY: ny, tile: nextTile, rotationDelta: 0 });
    } else if (isPlayer(frontTile)) {
      // Walks into Rockford -> squash player!
      this.squashPlayer(nx, ny);
    } else {
      // Hit wall or obstacle: reverse direction in place!
      const reversedTile = isFacingLeft ? 22 : 24;
      this.setTile(x, y, reversedTile);
      this.updated[y * this.width + x] = 1;
    }
  }

  // Exact Z80 0xE73E..0xE78C: Wall-following algorithm for Amoeba & Butterfly
  updateWallFollower(x, y, tile) {
    const isButt = isButterfly(tile);
    const baseTile = isButt ? 18 : 26;
    const heading = (tile - baseTile) % 4; // 0: UP, 1: RIGHT, 2: DOWN, 3: LEFT

    // DIRS: [UP, RIGHT, DOWN, LEFT]
    const DIRS = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }
    ];

    // Try current direction, then turn right, then left, then back
    const turnOrder = isButt ? [0, 3, 1, 2] : [0, 1, 3, 2];

    for (const rot of turnOrder) {
      const d = (heading + rot) % 4;
      const nx = x + DIRS[d].dx;
      const ny = y + DIRS[d].dy;
      const front = this.getTile(nx, ny);

      if (front === TILES.EMPTY) {
        const nextTile = baseTile + d;
        if (rot === 0) {
          // Straight path is clear: step forward into new tile
          this.setTile(x, y, TILES.EMPTY);
          this.setTile(nx, ny, nextTile);
          this.updated[ny * this.width + nx] = 1;
          this.emit('entity_moved', { fromX: x, fromY: y, toX: nx, toY: ny, tile: nextTile, rotationDelta: 0 });
        } else {
          // Obstacle hit in front: turn in place to face new direction, pausing for 1 tick! (Exact Z80 0xE779..0xE77A)
          this.setTile(x, y, nextTile);
          this.updated[y * this.width + x] = 1;
        }
        return;
      } else if (isPlayer(front)) {
        this.squashPlayer(nx, ny);
        return;
      }
    }
  }

  // Exact Z80 0xE850: Single-cell death for Rockford (NO 3x3 blast!)
  squashPlayer(px, py) {
    this.playerAlive = false;
    this.setTile(px, py, TILES.EMPTY);
    this.emit('player_dead', { x: px, y: py });
  }

  // Exact Z80 0xE850: Single-cell squash for creatures (butterflies drop diamonds)
  squashCreature(cx, cy, turnToDiamond = false) {
    this.setTile(cx, cy, turnToDiamond ? TILES.DIAMOND : TILES.EMPTY);
    this.emit('drop_sound', { x: cx, y: cy, tile: turnToDiamond ? TILES.DIAMOND : TILES.EMPTY });
  }

  // 3x3 explosion: Bombs/Creatures explode into EMPTY; Butterflies explode into DIAMONDS!
  explode(cx, cy, turnToDiamonds = false) {
    this.emit('explosion', { x: cx, y: cy, diamonds: turnToDiamonds });
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tx = cx + dx;
        const ty = cy + dy;
        if (tx >= 0 && tx < this.width && ty >= 0 && ty < this.height) {
          const t = this.getTile(tx, ty);
          if (t !== TILES.STEEL_WALL && t !== TILES.EXIT) {
            if (isPlayer(t)) {
              this.playerAlive = false;
              this.emit('player_dead', { x: tx, y: ty });
            }
            this.setTile(tx, ty, turnToDiamonds ? TILES.DIAMOND : TILES.EMPTY);
            const idx = ty * this.width + tx;
            this.falling[idx] = 0;
            this.fallDelay[idx] = 0;
            this.updated[idx] = 1;
          }
        }
      }
    }
  }
}
