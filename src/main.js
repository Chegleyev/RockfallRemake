/**
 * Rockfall Main Application Entry Point
 */

import { SoundSystem } from './audio/sound.js?v=9';
import { ClassicSpriteAtlas } from './renderer/classic_sprites.js?v=9';
import { ModernSpriteAtlas } from './renderer/modern_sprites.js?v=9';
import { WebGLRenderer } from './renderer/webgl.js?v=9';
import { Canvas2DRenderer } from './renderer/canvas2d.js?v=9';
import { RockfallGame } from './engine/game.js?v=9';
import { UIController } from './ui/hud.js?v=9';
import { StorageManager } from './engine/storage.js?v=9';

async function bootstrap() {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) throw new Error('Canvas element not found!');

  // 1. Fetch extracted game data (with cache busting)
  const [levelsRes, spritesRes] = await Promise.all([
    fetch(`./assets/levels.json?v=${Date.now()}`),
    fetch(`./assets/sprites.json?v=${Date.now()}`),
  ]);
  const levelsData = await levelsRes.json();
  const spritesData = await spritesRes.json();

  console.log(`[Rockfall] Loaded ${levelsData.length} levels and ${spritesData.length} sprites.`);

  // 2. Storage & Settings Initialization
  const storage = new StorageManager();
  const settings = storage.loadSettings();

  // 3. Initialize Subsystems
  const sound = new SoundSystem();
  sound.setEnabled(settings.audioEnabled);

  const classicAtlas = new ClassicSpriteAtlas(spritesData);
  const modernAtlas = new ModernSpriteAtlas();

  // Check URL params for manual testing: ?renderer=2d or ?fallback=1
  const urlParams = new URLSearchParams(window.location.search);
  const force2D = urlParams.get('renderer') === '2d' || urlParams.has('fallback');

  let renderer;
  if (force2D) {
    console.info('[Rockfall] Forcing Canvas 2D fallback mode via URL param (?renderer=2d).');
    renderer = new Canvas2DRenderer(canvas);
  } else {
    try {
      renderer = new WebGLRenderer(canvas);
      console.info('[Rockfall] WebGL 2.0 Renderer initialized successfully.');
    } catch (err) {
      console.warn('[Rockfall] WebGL 2.0 unavailable, seamlessly falling back to HTML5 Canvas 2D:', err);
      renderer = new Canvas2DRenderer(canvas);
    }
  }

  renderer.setAtlases(classicAtlas, modernAtlas);
  renderer.setMode(settings.gfxMode);
  renderer.setCRT(settings.crtEnabled);

  const game = new RockfallGame(levelsData, sound);
  game.setSpeed(settings.speedMultiplier);

  const ui = new UIController(game, renderer, sound, storage);

  game.onLevelStart = () => {
    renderer.resetCamera?.();
  };

  // 4. Responsive Resize handling
  const handleResize = () => {
    const wrapper = document.getElementById('canvas-wrapper');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = wrapper ? wrapper.getBoundingClientRect() : { width: 800, height: 600 };
    const w = Math.max(320, Math.floor(rect.width * dpr));
    const h = Math.max(240, Math.floor(rect.height * dpr));
    renderer.resize(w, h);
  };
  window.addEventListener('resize', handleResize);
  handleResize();

  // 5. Restore saved game state or start at saved level
  const savedState = storage.loadGameState();
  let restored = false;
  if (savedState && typeof savedState.currentLevelIndex === 'number' && savedState.physics) {
    restored = game.restoreGameState(savedState);
    if (restored) {
      console.info(`[Rockfall] Restored saved game state for level ${savedState.currentLevelIndex + 1}.`);
      ui.syncUIWithSettings();
    }
  }
  if (!restored) {
    const startLvl = (typeof settings.currentLevelIndex === 'number' && settings.currentLevelIndex >= 0)
      ? settings.currentLevelIndex
      : 0;
    game.startLevel(startLvl);
    storage.saveGameStateImmediate(game.getGameState());
  }

  // 6. Start Asynchronous Auto-save and background listeners
  storage.startAutoSave(game, 2);

  window.addEventListener('beforeunload', () => {
    storage.flushAutoSave(game);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      storage.flushAutoSave(game);
    }
  });

  // 7. High-performance Animation Loop (60/120 FPS)
  let lastFrameTime = performance.now();
  let frameCount = 0;
  let fpsTimer = 0;

  function loop(now) {
    requestAnimationFrame(loop);

    // Continuous dynamic resize check
    const wrapper = document.getElementById('canvas-wrapper');
    if (wrapper) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = wrapper.getBoundingClientRect();
      const w = Math.floor(rect.width * dpr);
      const h = Math.floor(rect.height * dpr);
      if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
        renderer.resize(w, h);
      }
    }

    const delta = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    // FPS calculation
    frameCount++;
    fpsTimer += delta;
    if (fpsTimer >= 0.5) {
      ui.updateFPS(frameCount / fpsTimer);
      frameCount = 0;
      fpsTimer = 0;
    }

    // Update game simulation & lerp progress
    game.update(now);

    // Tile size in virtual pixels
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const baseTileSize = Math.floor(36 * dpr);

    // Render WebGL frame
    renderer.render(game, now / 1000, baseTileSize);
  }

  requestAnimationFrame(loop);
}

window.addEventListener('DOMContentLoaded', () => {
  bootstrap().catch((err) => {
    console.error('[Rockfall] Error starting game:', err);
  });
});
