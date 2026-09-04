/**
 * Modern HD Stylized Sprite Atlas Generator
 * Directly remastered from the authentic ZX Spectrum pixel art & color palettes:
 * - High-contrast iconic white Rockford
 * - Organic earthy moss dirt (restored seamless loam)
 * - Grounded crimson granite boulders (toned-down natural red stone)
 * - Industrial steel wall (deep blue girder with golden rivet rows)
 * - Authentic Red Patrolling Soldier (Tile 22..25)
 * - Authentic Magenta Smiling Amoeba / Creature (Tile 26..29)
 * - Sparkling canary-yellow multifaceted diamonds
 * - Magenta spherical bombs with sparking fuse
 * - Electric cyan butterflies
 */

export class ModernSpriteAtlas {
  constructor() {
    this.tileSize = 64;
    this.atlasCols = 8;
    this.atlasRows = 4;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.atlasCols * this.tileSize; // 512
    this.canvas.height = this.atlasRows * this.tileSize; // 256
    this.ctx = this.canvas.getContext('2d');
    this.generate();
  }

  getUV(tileId) {
    const col = tileId % this.atlasCols;
    const row = Math.floor(tileId / this.atlasCols);
    const epsX = 0.5 / this.canvas.width;
    const epsY = 0.5 / this.canvas.height;
    const u0 = (col / this.atlasCols) + epsX;
    const v0 = (row / this.atlasRows) + epsY;
    const u1 = ((col + 1) / this.atlasCols) - epsX;
    const v1 = ((row + 1) / this.atlasRows) - epsY;
    return { u0, v0, u1, v1 };
  }

  generate() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let t = 0; t < 32; t++) {
      const col = t % this.atlasCols;
      const row = Math.floor(t / this.atlasCols);
      const x = col * this.tileSize;
      const y = row * this.tileSize;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, this.tileSize, this.tileSize);
      ctx.clip();
      ctx.translate(x, y);
      this.drawTile(ctx, t, this.tileSize);
      ctx.restore();
    }
  }

  drawTile(ctx, tileId, size) {
    const s = size;
    switch (tileId) {
      case 0: // Empty Cavern Space
        ctx.fillStyle = '#06070a';
        ctx.fillRect(0, 0, s, s);
        break;

      case 1: // Dirt (Organic mossy cavern loam)
        this.drawDirt(ctx, s);
        break;

      case 2: // Brick Wall (Red bricks with yellow mortar)
        this.drawWall(ctx, s);
        break;

      case 3: // Steel Wall (Industrial blue girder with golden rivets)
        this.drawSteelWall(ctx, s);
        break;

      case 4: // Boulder (Natural crimson granite rock)
        this.drawBoulder(ctx, s);
        break;

      case 5: // Exit Portal (Golden frame with blue energy)
        this.drawExit(ctx, s);
        break;

      case 6:  // Rockford (Iconic white protagonist frames 6..9)
      case 7:
      case 8:
      case 9:
        this.drawRockford(ctx, s, tileId - 6);
        break;

      case 10: // Diamond (Sparkling canary gem frames 10..13)
      case 11:
      case 12:
      case 13:
        this.drawDiamond(ctx, s, tileId - 10);
        break;

      case 14: // Bomb (Magenta bomb with fuse spark frames 14..17)
      case 15:
      case 16:
      case 17:
        this.drawBomb(ctx, s, tileId - 14);
        break;

      case 18: // Butterfly (Electric cyan winged frames 18..21)
      case 19:
      case 20:
      case 21:
        this.drawButterfly(ctx, s, tileId - 18);
        break;

      case 22: // Patrolling Soldier (Red running soldier frames 22..25)
      case 23:
      case 24:
      case 25:
        this.drawSoldier(ctx, s, tileId - 22);
        break;

      case 26: // Amoeba / Magenta Walker (Smiling purple creature frames 26..29)
      case 27:
      case 28:
      case 29:
        this.drawAmoeba(ctx, s, tileId - 26);
        break;

      case 30: // Explosion
      case 31:
        this.drawExplosion(ctx, s, tileId - 30);
        break;

      default:
        ctx.fillStyle = '#06070a';
        ctx.fillRect(0, 0, s, s);
        break;
    }
  }

  /* ----------------------------------------------------
   * TILE 1: GRASS (Authentic HD organic pattern with black voids)
   * Exact 1:1 pixel-perfect raster matching scratch/test_hd_organic_pattern.png:
   * - Crisp solid organic rosette pixels without Canvas 2D anti-aliasing blur
   * - Natural black cavern voids (просветы)
   * - Clear horizontal and vertical cell rhythm / separation
   * - Sunny mint highlights on top edges
   * ---------------------------------------------------- */
  drawDirt(ctx, s) {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = s;
    offCanvas.height = s;
    const offCtx = offCanvas.getContext('2d');
    const imgData = offCtx.createImageData(s, s);
    const data = imgData.data;

    // 1. Fill background with cavern void #06070a
    for (let i = 0; i < s * s * 4; i += 4) {
      data[i] = 6;
      data[i + 1] = 7;
      data[i + 2] = 10;
      data[i + 3] = 255;
    }

    const setPixel = (x, y, r, g, b) => {
      // 1px margin on x prevents edge wrapping and guarantees a crisp 2px dark vertical seam between columns
      if (x >= 1 && x < s - 1 && y >= 0 && y < s) {
        const idx = (y * s + x) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    };

    const bm = [
      [0,1,1,1,0,0,1,0,0,0,1,1,0,1,0,1],
      [1,0,1,1,1,1,1,1,1,1,0,1,1,1,1,0],
      [1,1,0,1,0,1,1,0,1,1,1,1,1,1,0,1],
      [0,1,1,0,1,1,1,1,1,1,0,1,0,1,0,0],
      [1,1,0,1,1,0,1,1,0,1,0,1,1,0,1,1],
      [1,0,1,0,1,1,1,1,1,1,1,1,0,1,1,0],
      [0,1,1,1,0,1,1,0,1,1,0,1,0,0,1,1],
      [0,1,0,1,1,1,0,1,1,1,0,1,1,0,1,0],
      [0,1,1,1,1,1,1,0,1,1,0,1,0,1,1,1],
      [1,1,1,1,0,1,0,1,1,0,1,1,0,1,1,0],
      [0,0,1,0,1,0,1,1,0,1,0,1,1,0,1,1],
      [1,1,0,1,0,1,1,0,1,1,1,0,1,1,0,0],
      [0,1,1,1,1,1,0,0,0,1,0,1,1,1,1,1],
      [0,1,0,1,0,1,0,1,0,1,0,1,1,1,1,0],
      [1,0,1,1,1,0,1,1,1,0,1,0,1,0,0,0],
      [0,0,0,0,0,1,0,1,0,1,0,0,0,0,0,0]
    ];

    const scale = s / 16;
    const l1 = [1,-1,2,-1,3,-1,0,0,1,0,2,0,3,0,4,0,-1,1,0,1,1,1,2,1,3,1,4,1,5,1,-1,2,0,2,1,2,2,2,3,2,4,2,5,2,-1,3,0,3,1,3,2,3,3,3,4,3,5,3,0,4,1,4,2,4,3,4,4,4,1,5,2,5,3,5];
    const l2 = [1,0,2,0,3,0,0,1,1,1,2,1,3,1,4,1,0,2,1,2,2,2,3,2,4,2,0,3,1,3,2,3,3,3,4,3,1,4,2,4,3,4];
    const l3 = [2,0,1,1,2,1,3,1,2,2];

    // Layer 1: Base shadow rosettes
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (bm[y][x]) {
          const px = x * scale;
          const py = y * scale;
          for (let i = 0; i < l1.length; i += 2) {
            setPixel(px + l1[i], py + l1[i + 1], 5, 46, 22);
          }
        }
      }
    }

    // Layer 2: Vibrant emerald green bodies with vertical gradient
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (bm[y][x]) {
          const px = x * scale;
          const py = y * scale;
          const g = Math.floor(140 + 70 * (1.0 - y / 16.0));
          for (let i = 0; i < l2.length; i += 2) {
            setPixel(px + l2[i], py + l2[i + 1], 21, g, 55);
          }
        }
      }
    }

    // Layer 3: Sunny mint/lime top highlights
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (bm[y][x] && (y === 0 || !bm[y - 1][x])) {
          const px = x * scale;
          const py = y * scale;
          for (let i = 0; i < l3.length; i += 2) {
            setPixel(px + l3[i], py + l3[i + 1], 134, 239, 172);
          }
        }
      }
    }

    offCtx.putImageData(imgData, 0, 0);
    ctx.drawImage(offCanvas, 0, 0);
  }

  /* ----------------------------------------------------
   * TILE 2: WALL (Red bricks with yellow mortar)
   * ---------------------------------------------------- */
  drawWall(ctx, s) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, s, s);
    ctx.clip();

    // Warm golden-yellow mortar bed
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(0, 0, s, s);

    const rowH = 13.5;
    const mortar = 2.5;

    for (let r = 0; r < 4; r++) {
      const y = r * (rowH + mortar) + mortar;
      const isOffset = (r % 2 === 1);
      const brickW = s * 0.45;

      const numCols = isOffset ? 3 : 2;
      const startX = isOffset ? -brickW * 0.5 : 0;

      for (let c = 0; c < numCols + 1; c++) {
        const x = startX + c * (brickW + mortar) + mortar;
        if (x + brickW <= 0 || x >= s) continue;

        // Brick body gradient
        const bGrad = ctx.createLinearGradient(x, y, x, y + rowH);
        bGrad.addColorStop(0, '#dc2626');
        bGrad.addColorStop(0.5, '#b91c1c');
        bGrad.addColorStop(1, '#991b1b');
        ctx.fillStyle = bGrad;
        ctx.fillRect(x, y, brickW, rowH);

        // Subtle bevel
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(x, y, brickW, 1.2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(x, y + rowH - 1.2, brickW, 1.2);
      }
    }
    ctx.restore();
  }

  /* ----------------------------------------------------
   * TILE 3: STEEL WALL (Industrial blue girder with golden rivets)
   * ---------------------------------------------------- */
  drawSteelWall(ctx, s) {
    // Deep industrial steel-blue metallic base
    const grad = ctx.createLinearGradient(0, 0, 0, s);
    grad.addColorStop(0, '#1e3a5f');
    grad.addColorStop(0.5, '#152942');
    grad.addColorStop(1, '#0e1d30');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);

    // Bevel edges
    ctx.strokeStyle = '#2d5380';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, s - 2, s - 2);

    // Center dividing groove
    ctx.fillStyle = '#080f1a';
    ctx.fillRect(0, s / 2 - 1.5, s, 3);
    ctx.fillStyle = '#2d5380';
    ctx.fillRect(0, s / 2 + 1.5, s, 1);

    // Two neat rows of golden/bronze rivets matching Spectrum pattern
    const rivetY = [s * 0.25, s * 0.75];
    const rivetX = [s * 0.18, s * 0.40, s * 0.62, s * 0.84];

    for (const ry of rivetY) {
      for (const rx of rivetX) {
        // Rivet base shadow
        ctx.fillStyle = '#080f1a';
        ctx.fillRect(rx - 3.5, ry - 3.5, 7, 7);

        // Golden bronze rivet stud
        const rGrad = ctx.createLinearGradient(rx - 3, ry - 3, rx + 3, ry + 3);
        rGrad.addColorStop(0, '#fef08a');
        rGrad.addColorStop(0.5, '#eab308');
        rGrad.addColorStop(1, '#a16207');
        ctx.fillStyle = rGrad;
        ctx.fillRect(rx - 2.5, ry - 2.5, 5, 5);
      }
    }
  }

  /* ----------------------------------------------------
   * TILE 4: BOULDER (Realistic natural stone cobblestone)
   * ---------------------------------------------------- */
  drawBoulder(ctx, s) {
    const cx = s / 2;
    const cy = s / 2 + 1;
    const r = s * 0.42;

    // Contact drop shadow with soft ambient occlusion
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.85, r * 0.92, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();

    // Natural stone boulder silhouette (asymmetric, chiseled rock contour)
    const points = 16;
    ctx.beginPath();
    const radii = [
      0.97, 0.99, 1.03, 1.05, 1.02, 0.98, 0.96, 0.94,
      0.93, 0.95, 0.98, 1.02, 1.01, 0.97, 0.95, 0.94
    ];
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const curR = r * radii[i];
      const px = cx + Math.cos(angle) * curR;
      const py = cy + Math.sin(angle) * curR;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    // Deep realistic stone volumetric gradient (slate gray / granite)
    const rockGrad = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.08, cx, cy, r);
    rockGrad.addColorStop(0, '#94a3b8');   // Sunlit slate highlight
    rockGrad.addColorStop(0.35, '#64748b'); // Natural granite midtone
    rockGrad.addColorStop(0.7, '#475569');  // Deep stone shadow
    rockGrad.addColorStop(1, '#1e293b');    // Crevice shadow
    ctx.fillStyle = rockGrad;
    ctx.fill();

    // Heavy dark stone contour border
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // --- Chiseled rock facets & geological cleavage planes ---
    // Top-left sunlit facet
    ctx.fillStyle = 'rgba(241, 245, 249, 0.22)';
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.7, cy - r * 0.3);
    ctx.lineTo(cx - r * 0.2, cy - r * 0.85);
    ctx.lineTo(cx + r * 0.3, cy - r * 0.5);
    ctx.lineTo(cx - r * 0.1, cy - r * 0.1);
    ctx.closePath();
    ctx.fill();

    // Right side shadow facet
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.3, cy - r * 0.5);
    ctx.lineTo(cx + r * 0.9, cy + r * 0.1);
    ctx.lineTo(cx + r * 0.5, cy + r * 0.7);
    ctx.lineTo(cx + r * 0.1, cy + r * 0.2);
    ctx.closePath();
    ctx.fill();

    // Geological fracture fissure line 1
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.0;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.55, cy - r * 0.15);
    ctx.lineTo(cx - r * 0.1, cy);
    ctx.lineTo(cx + r * 0.2, cy - r * 0.1);
    ctx.lineTo(cx + r * 0.65, cy + r * 0.25);
    ctx.stroke();

    // Fissure highlight bevel (light hitting upper edge of crack)
    ctx.strokeStyle = 'rgba(241, 245, 249, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.55, cy - r * 0.15 - 1);
    ctx.lineTo(cx - r * 0.1, cy - 1);
    ctx.lineTo(cx + r * 0.2, cy - r * 0.1 - 1);
    ctx.lineTo(cx + r * 0.65, cy + r * 0.25 - 1);
    ctx.stroke();

    // Secondary geological fissure line 2
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.35, cy + r * 0.45);
    ctx.lineTo(cx + r * 0.05, cy + r * 0.35);
    ctx.lineTo(cx + r * 0.45, cy + r * 0.55);
    ctx.stroke();

    // Realistic stone craters and natural pits
    ctx.fillStyle = '#1e293b';
    const pits = [
      [cx - 9, cy - 10, 3.5, 2.5],
      [cx + 9, cy - 8, 3.0, 2.0],
      [cx - 6, cy + 10, 4.0, 2.5],
      [cx + 10, cy + 9, 3.5, 2.5],
      [cx - 14, cy + 3, 3.0, 2.0]
    ];
    for (const [px, py, pw, ph] of pits) {
      ctx.beginPath();
      ctx.ellipse(px, py, pw, ph, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Subtle edge rim light & stone roughness
    ctx.strokeStyle = 'rgba(241, 245, 249, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx - 2, cy - 2, r * 0.85, -Math.PI * 0.8, -Math.PI * 0.15);
    ctx.stroke();

    // Soft matte stone highlight on upper facet
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.32, cy - r * 0.35, 6, 3.5, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /* ----------------------------------------------------
   * TILE 5: EXIT PORTAL (Golden arch with blue vortex)
   * ---------------------------------------------------- */
  drawExit(ctx, s) {
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(2, 2, s - 4, s - 4);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(6, 6, s - 12, s - 12);

    const vGrad = ctx.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s * 0.35);
    vGrad.addColorStop(0, '#93c5fd');
    vGrad.addColorStop(0.4, '#2563eb');
    vGrad.addColorStop(1, '#020617');
    ctx.fillStyle = vGrad;
    ctx.fillRect(8, 8, s - 16, s - 16);

    ctx.fillStyle = '#fde047';
    const cx = s / 2;
    const cy = s / 2;
    ctx.fillRect(cx - 10, cy - 12, 20, 4);
    ctx.fillRect(cx - 10, cy - 12, 5, 24);
    ctx.fillRect(cx - 10, cy - 2, 16, 4);
    ctx.fillRect(cx - 10, cy + 8, 20, 4);
  }

  /* ----------------------------------------------------
   * TILES 6..9: ROCKFORD (High-contrast iconic white hero)
   * ---------------------------------------------------- */
  drawRockford(ctx, s, frame) {
    const cx = s / 2;

    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(cx, s - 6, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 1. HEAD (Large iconic round white face)
    const headY = 20;
    const headR = 15;

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.arc(cx, headY, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Ears
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - headR + 1, headY, 3.5, 0, Math.PI * 2);
    ctx.arc(cx + headR - 1, headY, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Expressive dark eyes
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.ellipse(cx - 5, headY - 1, 3, 4, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 5, headY - 1, 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 4.5, headY - 2.5, 1.2, 0, Math.PI * 2);
    ctx.arc(cx + 5.5, headY - 2.5, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Warm wide smile
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(cx, headY + 3.5, 6, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    // 2. TORSO
    const torsoTop = headY + headR - 3;
    const torsoW = 16;
    const torsoH = 14;

    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(cx - torsoW / 2, torsoTop, torsoW, torsoH, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#090d16';
    ctx.fillRect(cx - 1, torsoTop + 4, 2, 2);
    ctx.fillRect(cx - 1, torsoTop + 8, 2, 2);

    // 3. ARMS
    const armSwing = (frame === 1) ? 3 : (frame === 3) ? -3 : 0;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(cx - torsoW / 2 - 4.5, torsoTop + 2 - armSwing, 5, 11, 2.5);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(cx + torsoW / 2 - 0.5, torsoTop + 2 + armSwing, 5, 11, 2.5);
    ctx.fill();
    ctx.stroke();

    // 4. LEGS & BOOTS
    const legTop = torsoTop + torsoH - 2;
    const legW = 5.5;
    const legH = 13;

    let lOffset = 0;
    let rOffset = 0;

    if (frame === 1) {
      lOffset = -2;
      rOffset = 2;
    } else if (frame === 3) {
      lOffset = 2;
      rOffset = -2;
    }

    ctx.fillStyle = '#f1f5f9';
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - torsoW / 2 + 1, legTop, legW, legH + lOffset, 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.roundRect(cx - torsoW / 2 - 1.5, legTop + legH + lOffset - 3, legW + 3, 4.5, 2);
    ctx.fill();

    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.roundRect(cx + torsoW / 2 - legW - 1, legTop, legW, legH + rOffset, 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.roundRect(cx + torsoW / 2 - legW - 1.5, legTop + legH + rOffset - 3, legW + 3, 4.5, 2);
    ctx.fill();
  }

  /* ----------------------------------------------------
   * TILES 10..13: DIAMOND (Multi-faceted brilliant canary jewel)
   * Detailed facets: Table, star facets, upper & lower girdle, pavilion facets
   * Smooth, calm traveling glint across 4 frames
   * ---------------------------------------------------- */
  drawDiamond(ctx, s, frame) {
    const cx = s / 2;
    const cy = s / 2;
    const w = s * 0.44;
    const h = s * 0.46;

    // Contact drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + h * 0.88, w * 0.7, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Soft warm golden aura
    const aura = ctx.createRadialGradient(cx, cy, w * 0.2, cx, cy, w * 1.15);
    aura.addColorStop(0, 'rgba(250, 204, 21, 0.25)');
    aura.addColorStop(1, 'rgba(250, 204, 21, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 1.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(cx, cy);

    // Multi-faceted Gemstone Geometry
    const topY = -h * 0.82;
    const tableY = -h * 0.38;
    const girdleY = -h * 0.05;
    const culetY = h * 0.88;

    const tableW = w * 0.48;
    const girdleW = w * 0.94;
    const midCrownW = w * 0.74;

    // --- 1. Base Jewel Silhouette ---
    ctx.beginPath();
    ctx.moveTo(-tableW, topY);
    ctx.lineTo(tableW, topY);
    ctx.lineTo(girdleW, girdleY);
    ctx.lineTo(0, culetY);
    ctx.lineTo(-girdleW, girdleY);
    ctx.closePath();

    const baseGrad = ctx.createLinearGradient(0, topY, 0, culetY);
    baseGrad.addColorStop(0, '#fef9c3');
    baseGrad.addColorStop(0.3, '#facc15');
    baseGrad.addColorStop(0.7, '#eab308');
    baseGrad.addColorStop(1, '#92400e');
    ctx.fillStyle = baseGrad;
    ctx.fill();

    // --- 2. Lower Pavilion Facets (Converging to culet at bottom) ---
    // Lower left facet
    ctx.fillStyle = 'rgba(180, 83, 9, 0.55)';
    ctx.beginPath();
    ctx.moveTo(-girdleW, girdleY);
    ctx.lineTo(0, culetY);
    ctx.lineTo(-girdleW * 0.45, girdleY);
    ctx.closePath();
    ctx.fill();

    // Lower central facet
    ctx.fillStyle = 'rgba(234, 179, 8, 0.3)';
    ctx.beginPath();
    ctx.moveTo(-girdleW * 0.45, girdleY);
    ctx.lineTo(0, culetY);
    ctx.lineTo(girdleW * 0.45, girdleY);
    ctx.closePath();
    ctx.fill();

    // Lower right facet (shadowed)
    ctx.fillStyle = 'rgba(120, 53, 15, 0.7)';
    ctx.beginPath();
    ctx.moveTo(girdleW * 0.45, girdleY);
    ctx.lineTo(0, culetY);
    ctx.lineTo(girdleW, girdleY);
    ctx.closePath();
    ctx.fill();

    // --- 3. Upper Crown & Star Facets ---
    // Central Table Facet
    const tableActive = (frame === 1);
    ctx.fillStyle = tableActive ? '#ffffff' : '#fef08a';
    ctx.beginPath();
    ctx.moveTo(-tableW * 0.65, topY + 2);
    ctx.lineTo(tableW * 0.65, topY + 2);
    ctx.lineTo(tableW * 0.5, tableY);
    ctx.lineTo(-tableW * 0.5, tableY);
    ctx.closePath();
    ctx.fill();

    // Upper Left Bezel Facet
    const leftActive = (frame === 0);
    ctx.fillStyle = leftActive ? '#ffffff' : 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.moveTo(-tableW, topY);
    ctx.lineTo(-tableW * 0.65, topY + 2);
    ctx.lineTo(-tableW * 0.5, tableY);
    ctx.lineTo(-midCrownW, tableY);
    ctx.closePath();
    ctx.fill();

    // Upper Right Bezel Facet
    const rightActive = (frame === 2);
    ctx.fillStyle = rightActive ? '#ffffff' : 'rgba(234, 179, 8, 0.4)';
    ctx.beginPath();
    ctx.moveTo(tableW * 0.65, topY + 2);
    ctx.lineTo(tableW, topY);
    ctx.lineTo(midCrownW, tableY);
    ctx.lineTo(tableW * 0.5, tableY);
    ctx.closePath();
    ctx.fill();

    // Side Corner Triangular Facets (Left & Right)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.moveTo(-midCrownW, tableY);
    ctx.lineTo(-girdleW, girdleY);
    ctx.lineTo(-girdleW * 0.45, girdleY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(146, 64, 14, 0.35)';
    ctx.beginPath();
    ctx.moveTo(midCrownW, tableY);
    ctx.lineTo(girdleW * 0.45, girdleY);
    ctx.lineTo(girdleW, girdleY);
    ctx.closePath();
    ctx.fill();

    // Central Kite Facet below Table
    ctx.fillStyle = (frame === 1) ? 'rgba(255, 255, 255, 0.75)' : 'rgba(250, 204, 21, 0.5)';
    ctx.beginPath();
    ctx.moveTo(-tableW * 0.5, tableY);
    ctx.lineTo(tableW * 0.5, tableY);
    ctx.lineTo(girdleW * 0.45, girdleY);
    ctx.lineTo(-girdleW * 0.45, girdleY);
    ctx.closePath();
    ctx.fill();

    // --- 4. Crisp Facet Seams ---
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';

    // Outer contour
    ctx.beginPath();
    ctx.moveTo(-tableW, topY);
    ctx.lineTo(tableW, topY);
    ctx.lineTo(girdleW, girdleY);
    ctx.lineTo(0, culetY);
    ctx.lineTo(-girdleW, girdleY);
    ctx.closePath();
    ctx.stroke();

    // Internal facet lines
    ctx.strokeStyle = 'rgba(69, 26, 3, 0.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    // Girdle line
    ctx.moveTo(-girdleW, girdleY);
    ctx.lineTo(girdleW, girdleY);
    // Table line
    ctx.moveTo(-tableW * 0.5, tableY);
    ctx.lineTo(tableW * 0.5, tableY);
    // Ribs to culet
    ctx.moveTo(0, culetY);
    ctx.lineTo(-girdleW * 0.45, girdleY);
    ctx.moveTo(0, culetY);
    ctx.lineTo(girdleW * 0.45, girdleY);
    ctx.stroke();

    // --- 5. Elegant Smooth Traveling Star Glint ---
    // Glint positions smoothly across 4 frames:
    // frame 0: left facet
    // frame 1: center table
    // frame 2: right facet
    // frame 3: bottom sparkle
    const glintPositions = [
      [-tableW * 0.6, tableY - 2, 5],
      [0, topY + 4, 6],
      [tableW * 0.6, tableY - 2, 5.5],
      [0, girdleY + 3, 4]
    ];
    const [gx, gy, gSize] = glintPositions[frame % 4];

    // Four-point delicate diamond flare
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(gx, gy - gSize);
    ctx.quadraticCurveTo(gx, gy, gx + gSize, gy);
    ctx.quadraticCurveTo(gx, gy, gx, gy + gSize);
    ctx.quadraticCurveTo(gx, gy, gx - gSize, gy);
    ctx.quadraticCurveTo(gx, gy, gx, gy - gSize);
    ctx.fill();

    // Central bright core dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(gx, gy, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /* ----------------------------------------------------
   * TILES 14..17: BOMB (Magenta sphere with sparking fuse)
   * ---------------------------------------------------- */
  drawBomb(ctx, s, frame = 0) {
    const cx = s / 2;
    const cy = s / 2 + 3;
    const r = s * 0.35;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.85, r * 0.85, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    const grad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
    grad.addColorStop(0, '#f472b6');
    grad.addColorStop(0.3, '#ec4899');
    grad.addColorStop(0.7, '#be185d');
    grad.addColorStop(1, '#500724');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#300415';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(cx - 4, cy - r - 4, 8, 4);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 4, cy - r - 4, 8, 4);

    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r - 4);
    ctx.quadraticCurveTo(cx - 6, cy - r - 9, cx + 3, cy - r - 11);
    ctx.stroke();

    const sparkRadius = 5 + (frame % 2) * 2.5;
    const spark = ctx.createRadialGradient(cx + 3, cy - r - 11, 1, cx + 3, cy - r - 11, sparkRadius);
    spark.addColorStop(0, '#ffffff');
    spark.addColorStop(0.3, '#fef08a');
    spark.addColorStop(0.7, '#f43f5e');
    spark.addColorStop(1, 'rgba(244, 63, 94, 0)');
    ctx.fillStyle = spark;
    ctx.beginPath();
    ctx.arc(cx + 3, cy - r - 11, sparkRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ----------------------------------------------------
   * TILES 18..21: BUTTERFLY (Electric cyan winged insect)
   * ---------------------------------------------------- */
  drawButterfly(ctx, s, frame) {
    const cx = s / 2;
    const cy = s / 2;
    const wingSpread = 0.8 + Math.sin(frame * Math.PI / 2) * 0.35;

    const wGrad = ctx.createLinearGradient(0, cy - 12, 0, cy + 12);
    wGrad.addColorStop(0, '#67e8f9');
    wGrad.addColorStop(0.5, '#06b6d4');
    wGrad.addColorStop(1, '#0e7490');
    ctx.fillStyle = wGrad;

    ctx.beginPath();
    ctx.ellipse(cx - s * 0.22 * wingSpread, cy, s * 0.24 * wingSpread, s * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#164e63';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(cx + s * 0.22 * wingSpread, cy, s * 0.24 * wingSpread, s * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 3, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#083344';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  /* ----------------------------------------------------
   * TILES 22..25: PATROLLING SOLDIER (Authentic Red Running Soldier)
   * Directly reconstructed from ZX Spectrum bitmap:
   * - Red silhouette running with raised staff/arm and marching legs
   * ---------------------------------------------------- */
  drawSoldier(ctx, s, frame) {
    const cx = s / 2;
    const facingLeft = (frame >= 2);
    const stepPhase = (frame % 2 === 1);

    ctx.save();
    if (facingLeft) {
      ctx.translate(s, 0);
      ctx.scale(-1, 1);
    }

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(cx, s - 6, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ef4444'; // Authentic Spectrum Red
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 2;

    // Head
    const headX = cx + 2;
    const headY = 14;
    ctx.beginPath();
    ctx.arc(headX, headY, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Eye dot
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(headX + 2, headY - 1, 2, 2);

    // Raised Arm / Staff angled forward matching original sprite
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, 24);
    ctx.lineTo(cx - 10, 10);
    ctx.stroke();

    // Torso
    ctx.fillStyle = '#dc2626';
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - 5, 21, 10, 16, 3);
    ctx.fill();
    ctx.stroke();

    // Marching / Running legs across frames
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3.5;
    ctx.beginPath();

    if (stepPhase) {
      // Stride pose
      // Front leg
      ctx.moveTo(cx + 2, 36);
      ctx.lineTo(cx + 11, 46);
      ctx.lineTo(cx + 15, 54);

      // Back leg
      ctx.moveTo(cx - 2, 36);
      ctx.lineTo(cx - 10, 46);
      ctx.lineTo(cx - 14, 52);
    } else {
      // Passing / upright pose
      // Left leg
      ctx.moveTo(cx - 3, 36);
      ctx.lineTo(cx - 4, 54);

      // Right leg
      ctx.moveTo(cx + 3, 36);
      ctx.lineTo(cx + 4, 54);
    }
    ctx.stroke();

    ctx.restore();
  }

  /* ----------------------------------------------------
   * TILES 26..29: AMOEBA / MAGENTA WALKER (Smiling purple creature)
   * Directly reconstructed from ZX Spectrum bitmap:
   * - Rounded magenta body, two big eyes, wide smile, walking boots!
   * ---------------------------------------------------- */
  drawAmoeba(ctx, s, frame) {
    const cx = s / 2;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(cx, s - 6, 13, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head / Body
    const bodyW = 24;
    const bodyH = 26;
    const bodyY = 12;

    // Magenta body gradient
    const bGrad = ctx.createLinearGradient(cx, bodyY, cx, bodyY + bodyH);
    bGrad.addColorStop(0, '#f472b6'); // Bright magenta
    bGrad.addColorStop(0.5, '#d946ef'); // Classic Spectrum magenta
    bGrad.addColorStop(1, '#a21caf'); // Deep purple
    ctx.fillStyle = bGrad;
    ctx.strokeStyle = '#4a044e';
    ctx.lineWidth = 2.2;

    ctx.beginPath();
    ctx.roundRect(cx - bodyW / 2, bodyY, bodyW, bodyH, 7);
    ctx.fill();
    ctx.stroke();

    // Two big dark expressive eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 6, bodyY + 8, 3.5, 0, Math.PI * 2);
    ctx.arc(cx + 6, bodyY + 8, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(cx - 6, bodyY + 8, 2, 0, Math.PI * 2);
    ctx.arc(cx + 6, bodyY + 8, 2, 0, Math.PI * 2);
    ctx.fill();

    // Wide happy smiling mouth matching the original sprite
    ctx.strokeStyle = '#4a044e';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(cx, bodyY + 16, 6, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    // Walking legs (animated march across frames 0..3)
    const legTop = bodyY + bodyH - 1;
    ctx.strokeStyle = '#d946ef';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';

    ctx.beginPath();
    if (frame === 1) {
      // Left leg kick forward
      ctx.moveTo(cx - 5, legTop);
      ctx.lineTo(cx - 12, legTop + 14);
      ctx.lineTo(cx - 6, legTop + 14);

      // Right leg back
      ctx.moveTo(cx + 5, legTop);
      ctx.lineTo(cx + 6, legTop + 14);
    } else if (frame === 3) {
      // Left leg back
      ctx.moveTo(cx - 5, legTop);
      ctx.lineTo(cx - 6, legTop + 14);

      // Right leg kick forward
      ctx.moveTo(cx + 5, legTop);
      ctx.lineTo(cx + 12, legTop + 14);
      ctx.lineTo(cx + 16, legTop + 14);
    } else {
      // Standing / neutral
      ctx.moveTo(cx - 6, legTop);
      ctx.lineTo(cx - 6, legTop + 14);
      ctx.lineTo(cx - 1, legTop + 14);

      ctx.moveTo(cx + 6, legTop);
      ctx.lineTo(cx + 6, legTop + 14);
      ctx.lineTo(cx + 11, legTop + 14);
    }
    ctx.stroke();
  }

  /* ----------------------------------------------------
   * TILES 30..31: EXPLOSION
   * ---------------------------------------------------- */
  drawExplosion(ctx, s, stage) {
    const cx = s / 2;
    const cy = s / 2;
    const curR = s * (0.35 + stage * 0.12);

    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, curR);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.25, '#fef08a');
    grad.addColorStop(0.65, '#f97316');
    grad.addColorStop(0.9, '#dc2626');
    grad.addColorStop(1, 'rgba(220, 38, 38, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, curR, 0, Math.PI * 2);
    ctx.fill();
  }
}
