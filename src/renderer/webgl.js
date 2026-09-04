/**
 * WebGL 2.0 Batch Renderer for Rockfall
 */

import { VS_SOURCE, FS_SOURCE } from './shaders.js';
import { TILES } from '../engine/types.js';

export class WebGLRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2', { alpha: false, antialias: false });
    if (!this.gl) {
      throw new Error('WebGL 2.0 is not supported in this browser!');
    }

    this.mode = 'modern'; // 'classic' or 'modern'
    this.crtEnabled = false;
    this.tileSize = 36;
    this.zoom = 1.0;
    this.cameraX = 0;
    this.cameraY = 0;
    this.cameraInitialized = false;
    this.lastCamTime = 0;

    this.classicAtlas = null;
    this.modernAtlas = null;
    this.activeAtlas = null;

    this.classicTexture = null;
    this.modernTexture = null;
    this.activeTexture = null;

    this.initGL();
  }

  initGL() {
    const gl = this.gl;
    const vs = this.compileShader(gl.VERTEX_SHADER, VS_SOURCE);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, FS_SOURCE);
    this.program = this.createProgram(vs, fs);

    this.uResolution = gl.getUniformLocation(this.program, 'u_resolution');
    this.uCamera = gl.getUniformLocation(this.program, 'u_camera');
    this.uZoom = gl.getUniformLocation(this.program, 'u_zoom');
    this.uTexture = gl.getUniformLocation(this.program, 'u_texture');
    this.uCrtEnabled = gl.getUniformLocation(this.program, 'u_crt_enabled');
    this.uCanvasSize = gl.getUniformLocation(this.program, 'u_canvas_size');
    this.uTime = gl.getUniformLocation(this.program, 'u_time');
    this.uDeathProgress = gl.getUniformLocation(this.program, 'u_death_progress');
    this.uLevelStartProgress = gl.getUniformLocation(this.program, 'u_level_start_progress');

    this.aPosition = gl.getAttribLocation(this.program, 'a_position');
    this.aTexcoord = gl.getAttribLocation(this.program, 'a_texcoord');
    this.aRotation = gl.getAttribLocation(this.program, 'a_rotation');
    this.aColor = gl.getAttribLocation(this.program, 'a_color');

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    this.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

    this.maxQuads = 4096;
    this.vertexStride = 9;
    this.vertexData = new Float32Array(this.maxQuads * 4 * this.vertexStride);

    gl.bufferData(gl.ARRAY_BUFFER, this.vertexData.byteLength, gl.DYNAMIC_DRAW);

    const FSIZE = Float32Array.BYTES_PER_ELEMENT;
    gl.enableVertexAttribArray(this.aPosition);
    gl.vertexAttribPointer(this.aPosition, 2, gl.FLOAT, false, this.vertexStride * FSIZE, 0);

    gl.enableVertexAttribArray(this.aTexcoord);
    gl.vertexAttribPointer(this.aTexcoord, 2, gl.FLOAT, false, this.vertexStride * FSIZE, 2 * FSIZE);

    gl.enableVertexAttribArray(this.aRotation);
    gl.vertexAttribPointer(this.aRotation, 1, gl.FLOAT, false, this.vertexStride * FSIZE, 4 * FSIZE);

    gl.enableVertexAttribArray(this.aColor);
    gl.vertexAttribPointer(this.aColor, 4, gl.FLOAT, false, this.vertexStride * FSIZE, 5 * FSIZE);

    const indices = new Uint16Array(this.maxQuads * 6);
    for (let i = 0; i < this.maxQuads; i++) {
      const v = i * 4;
      indices[i * 6 + 0] = v + 0;
      indices[i * 6 + 1] = v + 1;
      indices[i * 6 + 2] = v + 2;
      indices[i * 6 + 3] = v + 2;
      indices[i * 6 + 4] = v + 3;
      indices[i * 6 + 5] = v + 0;
    }
    this.ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  compileShader(type, src) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const err = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile error: ${err}`);
    }
    return shader;
  }

  createProgram(vs, fs) {
    const gl = this.gl;
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      const err = gl.getProgramInfoLog(p);
      gl.deleteProgram(p);
      throw new Error(`Program link error: ${err}`);
    }
    return p;
  }

  setAtlases(classicAtlas, modernAtlas) {
    this.classicAtlas = classicAtlas;
    this.modernAtlas = modernAtlas;
    this.classicTexture = this.createGLTexture(classicAtlas.canvas, false);
    this.modernTexture = this.createGLTexture(modernAtlas.canvas, true);
    this.updateActiveMode();
  }

  createGLTexture(imageCanvas, filterLinear = false) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const filter = filterLinear ? gl.LINEAR : gl.NEAREST;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    return tex;
  }

  setMode(mode) {
    this.mode = mode;
    this.updateActiveMode();
  }

  updateActiveMode() {
    if (this.mode === 'classic') {
      this.activeAtlas = this.classicAtlas;
      this.activeTexture = this.classicTexture;
    } else {
      this.activeAtlas = this.modernAtlas;
      this.activeTexture = this.modernTexture;
    }
  }

  setCRT(enabled) {
    this.crtEnabled = enabled;
  }

  resize(width, height) {
    if (width > 0 && height > 0) {
      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.gl.viewport(0, 0, width, height);
      }
    }
  }

  resetCamera() {
    this.cameraInitialized = false;
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

  render(game, animTime, targetTileSize = 36) {
    const physics = game.physics;
    const gl = this.gl;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    if (cw <= 0 || ch <= 0 || !this.activeTexture || !this.activeAtlas) return;

    this.tileSize = targetTileSize;

    // 120Hz OLED Ultra-smooth critically damped camera tracking
    const pX = game.visualPlayerX * this.tileSize;
    const pY = game.visualPlayerY * this.tileSize;
    const targetCamX = pX - cw / 2 + this.tileSize / 2;
    const targetCamY = pY - ch / 2 + this.tileSize / 2;

    const totalW = physics.width * this.tileSize;
    const totalH = physics.height * this.tileSize;
    const desiredCamX = (totalW <= cw) ? (totalW - cw) / 2 : Math.max(0, Math.min(totalW - cw, targetCamX));
    const desiredCamY = (totalH <= ch) ? (totalH - ch) / 2 : Math.max(0, Math.min(totalH - ch, targetCamY));

    this.cameraX = desiredCamX;
    this.cameraY = desiredCamY;

    let renderCamX = this.cameraX;
    let renderCamY = this.cameraY;

    const nowMs = performance.now();
    const deathProgress = (game.getDeathProgress) ? game.getDeathProgress(nowMs) : 0.0;
    const levelStartProgress = (game.getLevelStartProgress) ? game.getLevelStartProgress(nowMs) : 1.0;

    // Screen rumble on death (applied to temporary renderCam so cameraX remains untainted)
    if (deathProgress > 0.0 && deathProgress < 0.45) {
      const shake = (1.0 - deathProgress / 0.45) * (this.tileSize * 0.35);
      renderCamX += (Math.random() - 0.5) * shake;
      renderCamY += (Math.random() - 0.5) * shake;
    }

    gl.clearColor(0.04, 0.05, 0.07, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.uniform2f(this.uResolution, cw, ch);
    gl.uniform2f(this.uCamera, renderCamX, renderCamY);
    gl.uniform1f(this.uZoom, this.zoom);
    gl.uniform1i(this.uCrtEnabled, this.crtEnabled ? 1 : 0);
    gl.uniform2f(this.uCanvasSize, cw, ch);
    gl.uniform1f(this.uTime, animTime);
    gl.uniform1f(this.uDeathProgress, deathProgress);
    gl.uniform1f(this.uLevelStartProgress, levelStartProgress);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.activeTexture);
    gl.uniform1i(this.uTexture, 0);

    const startCol = Math.max(0, Math.floor(renderCamX / this.tileSize) - 1);
    const endCol = Math.min(physics.width - 1, Math.ceil((renderCamX + cw) / this.tileSize) + 1);
    const startRow = Math.max(0, Math.floor(renderCamY / this.tileSize) - 1);
    const endRow = Math.min(physics.height - 1, Math.ceil((renderCamY + ch) / this.tileSize) + 1);

    let quadCount = 0;
    const stride = this.vertexStride;
    const data = this.vertexData;

    const pushQuad = (x, y, w, h, u0, v0, u1, v1, rot = 0, r = 1, g = 1, b = 1, a = 1) => {
      if (quadCount >= this.maxQuads) return;
      let offset = quadCount * 4 * stride;

      let x0 = x, y0 = y;
      let x1 = x + w, y1 = y;
      let x2 = x + w, y2 = y + h;
      let x3 = x, y3 = y + h;

      if (rot !== 0) {
        const cx = x + w / 2;
        const cy = y + h / 2;
        const cos = Math.cos(rot);
        const sin = Math.sin(rot);
        const rotate = (px, py) => ({
          x: cx + (px - cx) * cos - (py - cy) * sin,
          y: cy + (px - cx) * sin + (py - cy) * cos
        });
        const p0 = rotate(x0, y0);
        const p1 = rotate(x1, y1);
        const p2 = rotate(x2, y2);
        const p3 = rotate(x3, y3);
        x0 = p0.x; y0 = p0.y;
        x1 = p1.x; y1 = p1.y;
        x2 = p2.x; y2 = p2.y;
        x3 = p3.x; y3 = p3.y;
      }

      data[offset++] = x0; data[offset++] = y0; data[offset++] = u0; data[offset++] = v0;
      data[offset++] = rot; data[offset++] = r; data[offset++] = g; data[offset++] = b; data[offset++] = a;

      data[offset++] = x1; data[offset++] = y1; data[offset++] = u1; data[offset++] = v0;
      data[offset++] = rot; data[offset++] = r; data[offset++] = g; data[offset++] = b; data[offset++] = a;

      data[offset++] = x2; data[offset++] = y2; data[offset++] = u1; data[offset++] = v1;
      data[offset++] = rot; data[offset++] = r; data[offset++] = g; data[offset++] = b; data[offset++] = a;

      data[offset++] = x3; data[offset++] = y3; data[offset++] = u0; data[offset++] = v1;
      data[offset++] = rot; data[offset++] = r; data[offset++] = g; data[offset++] = b; data[offset++] = a;

      quadCount++;
    };

    // 1. Pass 1: Draw static grid background and tiles
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const destX = c * this.tileSize;
        const destY = r * this.tileSize;

        // Underneath the player's destination cell, draw empty cavern space so player quad renders cleanly on top
        if (c === physics.playerX && r === physics.playerY) {
          const emptyUv = this.activeAtlas.getUV(TILES.EMPTY);
          pushQuad(destX, destY, this.tileSize, this.tileSize, emptyUv.u0, emptyUv.v0, emptyUv.u1, emptyUv.v1);
          continue;
        }

        const tile = physics.getTile(c, r);
        const key = `${c},${r}`;
        const anim = game.activeAnimations.get(key);

        if (anim && anim.progress < 1.0) {
          // Cell being moved into: draw empty background underneath
          const emptyUv = this.activeAtlas.getUV(TILES.EMPTY);
          pushQuad(destX, destY, this.tileSize, this.tileSize, emptyUv.u0, emptyUv.v0, emptyUv.u1, emptyUv.v1);
        } else {
          let renderTile = tile;
          // Hide exit: show as dirt until jewels are collected
          if (renderTile === TILES.EXIT && !physics.exitOpen) {
            renderTile = TILES.DIRT;
          }
          const renderSpriteId = this.getSpriteId(renderTile, animTime);
          const uv = this.activeAtlas.getUV(renderSpriteId);
          pushQuad(destX, destY, this.tileSize, this.tileSize, uv.u0, uv.v0, uv.u1, uv.v1);
        }
      }
    }

    // 2. Pass 2: Draw all smoothly gliding entities ON TOP of background grid
    for (const [key, anim] of game.activeAnimations.entries()) {
      if (anim.progress < 1.0) {
        const renderSpriteId = this.getSpriteId(anim.tile, animTime);
        const uv = this.activeAtlas.getUV(renderSpriteId);
        const curX = anim.curX * this.tileSize;
        const curY = anim.curY * this.tileSize;
        pushQuad(curX, curY, this.tileSize, this.tileSize, uv.u0, uv.v0, uv.u1, uv.v1, anim.rot);
      }
    }

    // 3. Pass 3: Draw Rockford (Player) on top or death particles
    if (deathProgress > 0.0) {
      if (game.deathParticles) {
        const emptyUv = this.activeAtlas.getUV(TILES.EMPTY);
        for (const p of game.deathParticles) {
          const px = p.x * this.tileSize;
          const py = p.y * this.tileSize;
          const pw = p.size * this.tileSize;
          const ph = p.size * this.tileSize;
          const alpha = Math.max(0.0, 1.0 - deathProgress * 1.3);
          pushQuad(px - pw / 2, py - ph / 2, pw, ph, emptyUv.u0, emptyUv.v0, emptyUv.u1, emptyUv.v1, p.rot, p.r, p.g, p.b, alpha);
        }
      }
    } else {
      const playerFrame = game.getPlayerFrame ? game.getPlayerFrame() : 0;
      const playerSpriteId = 6 + playerFrame;
      const playerUv = this.activeAtlas.getUV(playerSpriteId);
      pushQuad(pX, pY, this.tileSize, this.tileSize, playerUv.u0, playerUv.v0, playerUv.u1, playerUv.v1);
    }

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data.subarray(0, quadCount * 4 * stride));

    gl.drawElements(gl.TRIANGLES, quadCount * 6, gl.UNSIGNED_SHORT, 0);
  }
}
