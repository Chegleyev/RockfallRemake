/**
 * Classic ZX Spectrum Sprite Atlas Generator
 * Renders the authentic 16x16 bitmaps and exact Sinclair color attributes
 */

export class ClassicSpriteAtlas {
  constructor(spritesData) {
    this.spritesData = spritesData; // from assets/sprites.json
    this.tileSize = 16;
    this.atlasCols = 8;
    this.atlasRows = 4;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.atlasCols * this.tileSize; // 128
    this.canvas.height = this.atlasRows * this.tileSize; // 64
    this.ctx = this.canvas.getContext('2d');
    this.generate();
  }

  generate() {
    const palette = {
      'Black':   [0, 0, 0],
      'Blue':    [0, 34, 215],
      'Red':     [215, 34, 0],
      'Magenta': [215, 34, 215],
      'Green':   [0, 215, 34],
      'Cyan':    [0, 215, 215],
      'Yellow':  [215, 215, 34],
      'White':   [215, 215, 215],
    };
    const brightPalette = {
      'Black':   [0, 0, 0],
      'Blue':    [0, 43, 255],
      'Red':     [255, 43, 0],
      'Magenta': [255, 43, 255],
      'Green':   [0, 255, 43],
      'Cyan':    [0, 255, 255],
      'Yellow':  [255, 255, 43],
      'White':   [255, 255, 255],
    };

    const imgData = this.ctx.createImageData(this.canvas.width, this.canvas.height);
    const pixels = imgData.data;

    // Fill background with black
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 0;
      pixels[i + 1] = 0;
      pixels[i + 2] = 0;
      pixels[i + 3] = 255;
    }

    this.spritesData.forEach((s) => {
      const tileId = s.tile_id;
      const col = tileId % this.atlasCols;
      const row = Math.floor(tileId / this.atlasCols);
      const startX = col * this.tileSize;
      const startY = row * this.tileSize;

      const pal = s.bright ? brightPalette : palette;
      const ink = pal[s.ink] || [255, 255, 255];
      const paper = pal[s.paper] || [0, 0, 0];

      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const bit = s.bitmap[y][x];
          const color = bit ? ink : paper;
          const pxIdx = ((startY + y) * this.canvas.width + (startX + x)) * 4;
          pixels[pxIdx] = color[0];
          pixels[pxIdx + 1] = color[1];
          pixels[pxIdx + 2] = color[2];
          pixels[pxIdx + 3] = (bit === 0 && s.paper === 'Black' && tileId === 0) ? 0 : 255;
        }
      }
    });

    this.ctx.putImageData(imgData, 0, 0);
  }

  getUV(tileId) {
    const col = tileId % this.atlasCols;
    const row = Math.floor(tileId / this.atlasCols);
    const u0 = col / this.atlasCols;
    const v0 = row / this.atlasRows;
    const u1 = (col + 1) / this.atlasCols;
    const v1 = (row + 1) / this.atlasRows;
    return { u0, v0, u1, v1 };
  }
}
