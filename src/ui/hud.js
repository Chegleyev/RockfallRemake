/**
 * HUD & Input Controller for Rockfall
 */

import { DIR, GAME_STATE } from '../engine/types.js';

export class UIController {
  constructor(game, renderer, sound, storage = null) {
    this.game = game;
    this.renderer = renderer;
    this.sound = sound;
    this.storage = storage;

    // DOM Elements
    this.elScore = document.getElementById('hud-score');
    this.elLevel = document.getElementById('hud-level');
    this.elLives = document.getElementById('hud-lives');
    this.elJewels = document.getElementById('hud-jewels');

    this.elLevelSelect = document.getElementById('level-select');
    this.elSpeedSlider = document.getElementById('speed-slider');
    this.elSpeedLabel = document.getElementById('speed-label');
    this.elGfxBtn = document.getElementById('btn-toggle-graphics');
    this.elGfxLabel = document.getElementById('gfx-mode-label');
    this.elCrtBtn = document.getElementById('btn-toggle-crt');
    this.elCrtLabel = document.getElementById('crt-mode-label');
    this.elAudioBtn = document.getElementById('btn-toggle-audio');
    this.elAudioLabel = document.getElementById('audio-mode-label');
    this.elFpsVal = document.getElementById('fps-val');
    this.elRestartBtn = document.getElementById('btn-restart-level');

    this.elOverlay = document.getElementById('game-overlay');
    this.elOverlayTitle = document.getElementById('overlay-title');
    this.elOverlaySubtitle = document.getElementById('overlay-subtitle');
    this.elOverlayBtn = document.getElementById('overlay-btn');

    this.init();
  }

  init() {
    this.setupLevelSelect();
    this.setupSpeedSlider();
    this.setupToggles();
    this.setupKeyboard();
    this.setupTouchControls();
    this.setupOverlay();
    this.bindGameEvents();
    this.syncUIWithSettings();
  }

  syncUIWithSettings() {
    if (this.elLevelSelect) {
      this.elLevelSelect.value = this.game.currentLevelIndex;
    }
    if (this.elSpeedSlider) {
      this.elSpeedSlider.value = this.game.speedMultiplier;
      const pct = Math.round((this.game.speedMultiplier - 1.0) * 100);
      if (this.elSpeedLabel) this.elSpeedLabel.textContent = (pct >= 0 ? `+${pct}%` : `${pct}%`);
    }
    if (this.elGfxLabel) {
      this.elGfxLabel.textContent = this.renderer.mode === 'modern' ? 'MODERN HD' : 'CLASSIC ZX';
    }
    if (this.elCrtLabel) {
      this.elCrtLabel.textContent = this.renderer.crtEnabled ? 'ON' : 'OFF';
      this.elCrtLabel.classList.toggle('highlight', this.renderer.crtEnabled);
    }
    if (this.elAudioLabel) {
      this.elAudioLabel.textContent = this.sound.enabled ? 'ON' : 'MUTED';
      this.elAudioLabel.classList.toggle('highlight', this.sound.enabled);
    }
  }

  setupLevelSelect() {
    this.elLevelSelect.innerHTML = '';
    this.game.levelsData.forEach((lvl, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `${i + 1}: ${lvl.name || 'Level ' + (i + 1)}`;
      this.elLevelSelect.appendChild(opt);
    });

    this.elLevelSelect.addEventListener('change', (e) => {
      const lvl = parseInt(e.target.value, 10);
      this.sound.init();
      this.game.startLevel(lvl);
      if (this.storage) {
        this.storage.saveSettings({ currentLevelIndex: lvl });
        this.storage.clearGameState(); // Selecting new level manually starts fresh
      }
    });
  }

  setupSpeedSlider() {
    this.elSpeedSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.game.setSpeed(val);
      const pct = Math.round((val - 1.0) * 100);
      this.elSpeedLabel.textContent = (pct >= 0 ? `+${pct}%` : `${pct}%`);
      if (this.storage) {
        this.storage.saveSettings({ speedMultiplier: val });
      }
    });
  }

  setupToggles() {
    // Graphics Mode (Classic / Modern)
    this.elGfxBtn.addEventListener('click', () => {
      this.sound.init();
      const nextMode = this.renderer.mode === 'modern' ? 'classic' : 'modern';
      this.renderer.setMode(nextMode);
      this.elGfxLabel.textContent = nextMode === 'modern' ? 'MODERN HD' : 'CLASSIC ZX';
      if (this.storage) {
        this.storage.saveSettings({ gfxMode: nextMode });
      }
    });

    // CRT Scanline Shader
    this.elCrtBtn.addEventListener('click', () => {
      this.sound.init();
      const nextCrt = !this.renderer.crtEnabled;
      this.renderer.setCRT(nextCrt);
      this.elCrtLabel.textContent = nextCrt ? 'ON' : 'OFF';
      this.elCrtLabel.classList.toggle('highlight', nextCrt);
      if (this.storage) {
        this.storage.saveSettings({ crtEnabled: nextCrt });
      }
    });

    // Audio Mute Toggle
    this.elAudioBtn.addEventListener('click', () => {
      this.sound.init();
      const enabled = this.sound.toggle();
      this.elAudioLabel.textContent = enabled ? 'ON' : 'MUTED';
      this.elAudioLabel.classList.toggle('highlight', enabled);
      if (this.storage) {
        this.storage.saveSettings({ audioEnabled: enabled });
      }
    });

    // Reset Level Button
    if (this.elRestartBtn) {
      this.elRestartBtn.addEventListener('click', () => {
        this.sound.init();
        this.game.restartLevel();
        if (this.storage) {
          this.storage.saveGameStateImmediate(this.game.getGameState());
        }
      });
    }
  }

  setupKeyboard() {
    const activeKeys = new Set();

    const updateDir = () => {
      if (activeKeys.has('ArrowUp') || activeKeys.has('KeyW') || activeKeys.has('KeyQ')) {
        this.game.setDirection(DIR.UP);
      } else if (activeKeys.has('ArrowDown') || activeKeys.has('KeyS') || activeKeys.has('KeyA') || activeKeys.has('KeyZ')) {
        this.game.setDirection(DIR.DOWN);
      } else if (activeKeys.has('ArrowLeft') || activeKeys.has('KeyO')) {
        this.game.setDirection(DIR.LEFT);
      } else if (activeKeys.has('ArrowRight') || activeKeys.has('KeyD') || activeKeys.has('KeyP')) {
        this.game.setDirection(DIR.RIGHT);
      } else {
        this.game.setDirection(DIR.NONE);
      }
    };

    window.addEventListener('keydown', (e) => {
      // Allow browser shortcuts (Cmd+R, Cmd+Shift+R, Ctrl+R, etc.) to function normally
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      this.sound.init();
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === 'KeyR' || e.code === 'Escape') {
        e.preventDefault();
        this.game.restartLevel();
        if (this.storage) {
          this.storage.saveGameStateImmediate(this.game.getGameState());
        }
        return;
      }
      activeKeys.add(e.code);
      updateDir();
    });

    window.addEventListener('keyup', (e) => {
      activeKeys.delete(e.code);
      updateDir();
    });

    window.addEventListener('blur', () => {
      activeKeys.clear();
      updateDir();
    });
  }

  setupTouchControls() {
    const bindBtn = (id, dir) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const start = (e) => {
        e.preventDefault();
        this.sound.init();
        this.game.setDirection(dir);
      };
      const end = (e) => {
        e.preventDefault();
        this.game.setDirection(DIR.NONE);
      };
      btn.addEventListener('touchstart', start, { passive: false });
      btn.addEventListener('touchend', end, { passive: false });
      btn.addEventListener('mousedown', start);
      btn.addEventListener('mouseup', end);
    };

    bindBtn('btn-up', DIR.UP);
    bindBtn('btn-down', DIR.DOWN);
    bindBtn('btn-left', DIR.LEFT);
    bindBtn('btn-right', DIR.RIGHT);
  }

  setupOverlay() {
    this.elOverlayBtn.addEventListener('click', () => {
      this.sound.init();
      this.elOverlay.classList.add('hidden');
      if (this.game.state === GAME_STATE.LEVEL_WON) {
        this.game.nextLevel();
        if (this.storage) {
          this.storage.saveSettings({ currentLevelIndex: this.game.currentLevelIndex });
          this.storage.saveGameStateImmediate(this.game.getGameState());
        }
      } else if (this.game.state === GAME_STATE.GAME_OVER) {
        this.game.restartGame();
        if (this.storage) {
          this.storage.saveSettings({ currentLevelIndex: 0 });
          this.storage.clearGameState();
        }
      }
    });
  }

  bindGameEvents() {
    this.game.onHUDUpdate = (data) => {
      this.elScore.textContent = String(data.score).padStart(5, '0');
      this.elLevel.textContent = String(data.level).padStart(2, '0');
      this.elLives.textContent = String(data.lives).padStart(2, '0');
      this.elJewels.textContent = String(data.jewelsLeft).padStart(2, '0');
      this.elLevelSelect.value = data.level - 1;

      if (data.exitOpen) {
        this.elJewels.textContent = 'GO!';
        this.elJewels.style.color = '#00ff66';
      } else {
        this.elJewels.style.color = '';
      }
    };

    this.game.onStateChange = (state) => {
      if (state === GAME_STATE.LEVEL_WON) {
        if (this.storage) {
          this.storage.saveGameStateImmediate(this.game.getGameState());
        }
        this.elOverlayTitle.textContent = 'LEVEL COMPLETED!';
        this.elOverlaySubtitle.textContent = '+500 BONUS POINTS';
        this.elOverlayBtn.textContent = 'NEXT LEVEL';
        this.elOverlay.classList.remove('hidden');
      } else if (state === GAME_STATE.GAME_OVER) {
        if (this.storage) {
          this.storage.clearGameState();
        }
        this.elOverlayTitle.textContent = 'GAME OVER';
        this.elOverlaySubtitle.textContent = `FINAL SCORE: ${this.game.score}`;
        this.elOverlayBtn.textContent = 'PLAY AGAIN';
        this.elOverlay.classList.remove('hidden');
      }
    };
  }

  updateFPS(fps) {
    this.elFpsVal.textContent = Math.round(fps);
  }
}
