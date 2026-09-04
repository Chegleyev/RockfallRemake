/**
 * HTML5 Canvas 2D Fallback Renderer for Rockfall
 * Used when WebGL 2.0 is unavailable or disabled in browser
 */

import { TILES } from '../engine/types.js';

export class Canvas2DRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    if (!this.ctx) {
      throw new Error('Canvas 2D context could not be created!');
    }

    this.mode = 'modern'; // 'classic' or 'modern'
    this.crtEnabled = false;
    this.tileSize = 36;
    this.cameraX = 0;
    this.cameraY = 0;
    this.cameraInitialized = false;
    this.lastCamTime = 0;

    this.classicAtlas = null;
    this.modernAtlas = null;
    this.activeAtlas = null;
  }

  resetCamera() {
    this.cameraInitialized = false;
  }

  setAtlases(classic, modern) {
    this.classicAtlas = classic;
    this.modernAtlas = modern;
    this.updateActiveMode();
  }

  setMode(mode) {
    this.mode = mode;
    this.updateActiveMode();
  }

  updateActiveMode() {
    this.activeAtlas = (this.mode === 'classic') ? this.classicAtlas : this.modernAtlas;
  }

  setCRT(enabled) {
    this.crtEnabled = enabled;
  }

  resize(width, height) {
    if (width > 0 && height > 0) {
      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
      }
    }
  }

  getSpriteId(tile, animTime) {
    const frame4 = Math.floor((animTime * 8) % 4);
    const frame2 = Math.floor((animTime * 6) % 2);
    const gemFrame = Math.floor((animTime * 3) % 4);

    if (tile >= 6 && tile <= 9) return 6 + frame4;
    if (tile >= 10 && tile <= 13) return 10 + gemFrame;
    if (tile >= 14 && tile <= 17) return 14 + frame4;
    if (tile >= 18 && tile <= 21) return 18 + frame4;

    // Soldier: 22..23 is moving RIGHT, 24..25 is moving LEFT
    if (tile >= 22 && tile <= 23) return 22 + frame2;
    if (tile >= 24 && tile <= 25) return 24 + frame2;

    // Amoeba / Creature: 26..29
    if (tile >= 26 && tile <= 29) return 26 + frame4;

    return tile;
  }

  drawSprite(ctx, tileId, destX, destY) {
    const atlas = this.activeAtlas;
    if (!atlas || !atlas.canvas) return;

    const col = tileId % atlas.atlasCols;
    const row = Math.floor(tileId / atlas.atlasCols);
    const sx = col * atlas.tileSize;
    const sy = row * atlas.tileSize;
    const s = atlas.tileSize;

    ctx.drawImage(atlas.canvas, sx, sy, s, s, destX, destY, this.tileSize, this.tileSize);
  }

  render(game, animTime, targetTileSize = 36) {
    const physics = game.physics;
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    if (cw <= 0 || ch <= 0 || !this.activeAtlas) return;

    this.tileSize = targetTileSize;

    // 120Hz OLED Ultra-smooth critically damped camera tracking
    const totalW = physics.width * this.tileSize;
    const totalH = physics.height * this.tileSize;
    const targetCamX = game.visualPlayerX * this.tileSize - (cw - this.tileSize) / 2;
    const targetCamY = game.visualPlayerY * this.tileSize - (ch - this.tileSize) / 2;

    const desiredCamX = (totalW <= cw) ? (totalW - cw) / 2 : Math.max(0, Math.min(totalW - cw, targetCamX));
    const desiredCamY = (totalH <= ch) ? (totalH - ch) / 2 : Math.max(0, Math.min(totalH - ch, targetCamY));

    this.cameraX = desiredCamX;
    this.cameraY = desiredCamY;

    let renderCamX = this.cameraX;
    let renderCamY = this.cameraY;

    const nowMs = performance.now();
    const deathProgress = (game.getDeathProgress) ? game.getDeathProgress(nowMs) : 0.0;
    const levelStartProgress = (game.getLevelStartProgress) ? game.getLevelStartProgress(nowMs) : 1.0;

    // Screen rumble on death
    if (deathProgress > 0.0 && deathProgress < 0.45) {
      const shake = (1.0 - deathProgress / 0.45) * (this.tileSize * 0.35);
      renderCamX += (Math.random() - 0.5) * shake;
      renderCamY += (Math.random() - 0.5) * shake;
    }

    // Disable image smoothing for retro crispness in classic mode
    ctx.imageSmoothingEnabled = (this.mode === 'modern');

    // Clear background
    ctx.fillStyle = '#06070a';
    ctx.fillRect(0, 0, cw, ch);

    const startCol = Math.max(0, Math.floor(renderCamX / this.tileSize) - 1);
    const endCol = Math.min(physics.width - 1, Math.ceil((renderCamX + cw) / this.tileSize) + 1);
    const startRow = Math.max(0, Math.floor(renderCamY / this.tileSize) - 1);
    const endRow = Math.min(physics.height - 1, Math.ceil((renderCamY + ch) / this.tileSize) + 1);

    // 1. Pass 1: Draw static grid background and tiles
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const destX = Math.floor(c * this.tileSize - renderCamX);
        const destY = Math.floor(r * this.tileSize - renderCamY);

        if (c === physics.playerX && r === physics.playerY) {
          this.drawSprite(ctx, TILES.EMPTY, destX, destY);
          continue;
        }

        const tile = physics.getTile(c, r);
        const key = `${c},${r}`;
        const anim = game.activeAnimations.get(key);

        if (anim && anim.progress < 1.0) {
          this.drawSprite(ctx, TILES.EMPTY, destX, destY);
        } else {
          let renderTile = tile;
          if (renderTile === TILES.EXIT && !physics.exitOpen) {
            renderTile = TILES.DIRT;
          }
          const spriteId = this.getSpriteId(renderTile, animTime);
          this.drawSprite(ctx, spriteId, destX, destY);
        }
      }
    }

    // 2. Pass 2: Draw smoothly gliding animated entities ON TOP
    for (const [key, anim] of game.activeAnimations.entries()) {
      if (anim.progress < 1.0) {
        const spriteId = this.getSpriteId(anim.tile, animTime);
        const curX = Math.floor(anim.curX * this.tileSize - renderCamX);
        const curY = Math.floor(anim.curY * this.tileSize - renderCamY);

        if (anim.rot) {
          ctx.save();
          ctx.translate(curX + this.tileSize / 2, curY + this.tileSize / 2);
          ctx.rotate(anim.rot);
          this.drawSprite(ctx, spriteId, -this.tileSize / 2, -this.tileSize / 2);
          ctx.restore();
        } else {
          this.drawSprite(ctx, spriteId, curX, curY);
        }
      }
    }

    // 3. Pass 3: Draw Rockford or Death particles
    if (deathProgress > 0.0) {
      if (game.deathParticles) {
        ctx.save();
        for (const p of game.deathParticles) {
          const px = Math.floor(p.x * this.tileSize - renderCamX);
          const py = Math.floor(p.y * this.tileSize - renderCamY);
          const pw = Math.max(2, Math.floor(p.size * this.tileSize));

          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(p.rot);
          ctx.fillStyle = `rgba(${Math.floor(p.r * 255)}, ${Math.floor(p.g * 255)}, ${Math.floor(p.b * 255)}, ${p.alpha})`;
          ctx.fillRect(-pw / 2, -pw / 2, pw, pw);
          ctx.restore();
        }
        ctx.restore();
      }
    } else {
      const playerSpriteId = this.getSpriteId(TILES.PLAYER, animTime);
      const px = Math.floor(game.visualPlayerX * this.tileSize - renderCamX);
      const py = Math.floor(game.visualPlayerY * this.tileSize - renderCamY);
      this.drawSprite(ctx, playerSpriteId, px, py);
    }

    // 4. Overlays: Modern Death Crimson Shutters (2D recreation)
    if (deathProgress > 0.0) {
      const slatCount = 14;
      const slatH = ch / slatCount;

      const closePhase = Math.min(1.0, Math.max(0.0, deathProgress / 0.62));
      const easeIn = closePhase * closePhase * (3.0 - 2.0 * closePhase);

      const openPhase = Math.min(1.0, Math.max(0.0, (deathProgress - 0.85) / 0.15));
      const easeOut = openPhase * openPhase;

      const progress = easeIn - easeOut;

      ctx.save();
      for (let i = 0; i < slatCount; i++) {
        const isOdd = (i % 2 === 1);
        const slatW = cw * progress * 1.15;
        const y = i * slatH;

        ctx.fillStyle = '#140306';
        ctx.strokeStyle = '#ff1440';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ff1440';
        ctx.shadowBlur = 8;

        if (isOdd) {
          const x = cw - slatW;
          ctx.fillRect(x, y, slatW + 2, slatH + 1);
          if (progress > 0.05 && progress < 0.95) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + slatH);
            ctx.stroke();
          }
        } else {
          ctx.fillRect(0, y, slatW, slatH + 1);
          if (progress > 0.05 && progress < 0.95) {
            ctx.beginPath();
            ctx.moveTo(slatW, y);
            ctx.lineTo(slatW, y + slatH);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }

    // 5. Overlays: Radial Level Start Iris Reveal (2D recreation)
    if (levelStartProgress > 0.0 && levelStartProgress < 1.0) {
      const t = levelStartProgress;
      const easedT = t * t * (3.0 - 2.0 * t);
      const maxRadius = Math.sqrt(cw * cw + ch * ch) * 0.55;
      const radius = easedT * maxRadius;

      ctx.save();
      // Draw dark frame around iris opening
      ctx.fillStyle = 'rgba(6, 10, 16, 0.98)';
      ctx.beginPath();
      ctx.rect(0, 0, cw, ch);
      ctx.arc(cw / 2, ch / 2, radius, 0, Math.PI * 2, true); // counterclockwise cutout
      ctx.fill();

      // Glowing cyan edge ring
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = Math.max(2, Math.floor(4 * (1.0 - easedT)));
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(cw / 2, ch / 2, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 6. Overlays: CRT Scanlines (2D recreation)
    if (this.crtEnabled) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      for (let y = 0; y < ch; y += 3) {
        ctx.fillRect(0, y, cw, 1.5);
      }
      ctx.restore();
    }
  }
}
