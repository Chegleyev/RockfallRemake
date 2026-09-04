/**
 * Rockfall Storage Manager
 * Handles immediate persistence of user settings and asynchronous background auto-save of game state.
 */

import { GAME_STATE } from './types.js?v=9';

const SETTINGS_KEY = 'rockfall_settings';
const GAME_STATE_KEY = 'rockfall_gamestate';

export const DEFAULT_SETTINGS = {
  gfxMode: 'modern',        // 'modern' or 'classic'
  crtEnabled: false,        // boolean
  audioEnabled: true,       // boolean
  speedMultiplier: 1.10,    // +10% default
  currentLevelIndex: 0      // level 1 default
};

export class StorageManager {
  constructor() {
    this.autoSaveInterval = null;
    this.pendingSaveTask = null;
    this.lastSavedHash = '';
  }

  /**
   * Safely retrieve item from localStorage with exception guard
   */
  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`[Storage] Failed to read '${key}' from localStorage:`, e);
      return null;
    }
  }

  /**
   * Safely write item to localStorage with exception guard
   */
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn(`[Storage] Failed to write '${key}' to localStorage:`, e);
      return false;
    }
  }

  /**
   * Safely remove item from localStorage
   */
  removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn(`[Storage] Failed to remove '${key}' from localStorage:`, e);
      return false;
    }
  }

  // =========================================================================
  // SETTINGS PERSISTENCE (Immediate on Change)
  // =========================================================================

  /**
   * Load user settings, falling back to defaults for any missing keys
   */
  loadSettings() {
    const raw = this.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };

    try {
      const parsed = JSON.parse(raw);
      return {
        gfxMode: (parsed.gfxMode === 'classic' || parsed.gfxMode === 'modern') ? parsed.gfxMode : DEFAULT_SETTINGS.gfxMode,
        crtEnabled: typeof parsed.crtEnabled === 'boolean' ? parsed.crtEnabled : DEFAULT_SETTINGS.crtEnabled,
        audioEnabled: typeof parsed.audioEnabled === 'boolean' ? parsed.audioEnabled : DEFAULT_SETTINGS.audioEnabled,
        speedMultiplier: typeof parsed.speedMultiplier === 'number' && parsed.speedMultiplier >= 0.5 && parsed.speedMultiplier <= 3.0
          ? parsed.speedMultiplier
          : DEFAULT_SETTINGS.speedMultiplier,
        currentLevelIndex: typeof parsed.currentLevelIndex === 'number' && parsed.currentLevelIndex >= 0
          ? parsed.currentLevelIndex
          : DEFAULT_SETTINGS.currentLevelIndex
      };
    } catch (e) {
      console.warn('[Storage] Corrupt settings in localStorage, resetting to defaults:', e);
      return { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * Save partial or complete settings immediately
   */
  saveSettings(newSettings) {
    const current = this.loadSettings();
    const updated = { ...current, ...newSettings };
    this.setItem(SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  }

  // =========================================================================
  // GAME STATE PERSISTENCE (Asynchronous / Periodic)
  // =========================================================================

  /**
   * Load saved game state if present
   */
  loadGameState() {
    const raw = this.getItem(GAME_STATE_KEY);
    if (!raw) return null;

    try {
      const state = JSON.parse(raw);
      if (!state || typeof state.currentLevelIndex !== 'number' || !state.physics) {
        return null;
      }
      return state;
    } catch (e) {
      console.warn('[Storage] Corrupt game state in localStorage:', e);
      return null;
    }
  }

  /**
   * Clear saved game state (e.g. on game over or manual new game)
   */
  clearGameState() {
    this.removeItem(GAME_STATE_KEY);
    this.lastSavedHash = '';
  }

  /**
   * Synchronously or immediately save game state
   */
  saveGameStateImmediate(state) {
    if (!state) return;
    try {
      const serialized = JSON.stringify(state);
      this.setItem(GAME_STATE_KEY, serialized);
    } catch (e) {
      console.warn('[Storage] Failed to serialize game state:', e);
    }
  }

  /**
   * Start asynchronous periodic auto-saving
   * Uses requestIdleCallback (fallback to setTimeout) so it NEVER interrupts 120 FPS animation
   */
  startAutoSave(game, intervalSeconds = 2) {
    this.stopAutoSave();

    this.autoSaveInterval = setInterval(() => {
      // Only auto-save if game is currently active and player is alive
      const isPlaying = game && (game.state === GAME_STATE.PLAYING || game.state === 'PLAYING');
      if (!isPlaying || !game.physics || !game.physics.playerAlive) {
        return;
      }

      // Schedule serialization in browser idle time
      const scheduleIdle = (typeof window !== 'undefined' && window.requestIdleCallback) || ((cb) => setTimeout(cb, 10));
      
      scheduleIdle(() => {
        try {
          const snapshot = game.getGameState();
          if (!snapshot) return;

          // Quick change check using score, lives, player position, jewels left, exit status
          const hash = `${snapshot.currentLevelIndex}_${snapshot.score}_${snapshot.lives}_${snapshot.physics.playerX},${snapshot.physics.playerY}_${snapshot.physics.jewelsLeft}_${snapshot.physics.exitOpen}`;
          if (hash === this.lastSavedHash) {
            return; // No state change, skip localStorage write to protect disk/I/O
          }
          this.lastSavedHash = hash;

          this.saveGameStateImmediate(snapshot);
        } catch (err) {
          console.warn('[Storage] Error during async auto-save:', err);
        }
      });
    }, intervalSeconds * 1000);
  }

  /**
   * Stop auto-save timer
   */
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * Flush any pending state immediately (e.g., on beforeunload or tab hide)
   */
  flushAutoSave(game) {
    if (!game || !game.physics) return;
    const isPlaying = game.state === GAME_STATE.PLAYING || game.state === 'PLAYING';
    if (isPlaying && game.physics.playerAlive) {
      const snapshot = game.getGameState();
      if (snapshot) {
        this.saveGameStateImmediate(snapshot);
      }
    }
  }
}
