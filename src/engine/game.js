/**
 * Rockfall Main Game Controller
 * Synchronized tick-based player pacing:
 * - Tap: moves exactly 1 cell without accidental double-steps
 * - Hold: moves every tick, allowing player to outrun falling boulders downward!
 */

import { RockfallPhysics } from './physics.js?v=9';
import { GAME_STATE, DIR } from './types.js?v=9';

export class RockfallGame {
  constructor(levelsData, soundSystem) {
    this.levelsData = levelsData;
    this.sound = soundSystem;
    this.physics = new RockfallPhysics();

    this.state = GAME_STATE.PLAYING;
    this.score = 0;
    this.lives = 5;
    this.currentLevelIndex = 0;

    // Simulation timing
    this.baseTickDuration = 0.17; // seconds per simulation tick (~5.8 ticks/sec in original)
    this.speedMultiplier = 1.10;  // Default +10% faster
    this.accumulator = 0.0;
    this.lastTime = performance.now();

    // Input buffer & state
    this.queuedDir = DIR.NONE;
    this.isHoldingInput = false;

    // Smooth visual player state
    this.visualPlayerX = 0;
    this.visualPlayerY = 0;
    this.playerFromX = 0;
    this.playerFromY = 0;
    this.playerToX = 0;
    this.playerToY = 0;
    this.playerStepStartTime = 0;
    this.playerStepDuration = 170;
    this.isMoving = false;
    this.walkAnimTimer = 0.0;
    this.activeAnimations = new Map();

    // Death animation state
    this.deathStartTime = 0;
    this.deathDuration = 1500;
    this.deathParticles = [];
    this.deathTimeout = null;

    // Level start animation state
    this.levelStartTime = 0;
    this.levelStartDuration = 600; // 600ms iris-open

    this.onHUDUpdate = null;
    this.onStateChange = null;

    this.setupPhysicsEvents();
  }

  setupPhysicsEvents() {
    this.physics.onEvent = (event, data) => {
      switch (event) {
        case 'walk':
          this.sound.playWalk();
          break;
        case 'dig':
          this.sound.playDig();
          break;
        case 'diamond':
          this.score += 15;
          this.sound.playDiamond();
          this.updateHUD();
          break;
        case 'drop_sound':
          this.sound.playBoulderDrop();
          break;
        case 'push':
          this.sound.playPush();
          break;
        case 'explosion':
          this.sound.playExplosion();
          break;
        case 'exit_open':
          this.sound.playExitOpen();
          this.updateHUD();
          break;
        case 'level_won':
          this.handleLevelWon();
          break;
        case 'player_dead':
          this.handlePlayerDead();
          break;
        case 'entity_moved':
          this.registerAnimation(data);
          break;
        case 'player_step':
          this.onPlayerStep(data);
          break;
      }
    };
  }

  onPlayerStep(data) {
    this.playerFromX = data.fromX;
    this.playerFromY = data.fromY;
    this.playerToX = data.toX;
    this.playerToY = data.toY;
    this.playerStepStartTime = performance.now();
    this.playerStepDuration = (this.baseTickDuration / this.speedMultiplier) * 1000;
  }

  registerAnimation(data) {
    const key = `${data.toX},${data.toY}`;
    const baseDuration = (this.baseTickDuration / this.speedMultiplier) * 1000;
    const duration = data.durationMs || baseDuration;
    this.activeAnimations.set(key, {
      fromX: data.fromX,
      fromY: data.fromY,
      toX: data.toX,
      toY: data.toY,
      tile: data.tile,
      rotationDelta: data.rotationDelta || 0,
      startTime: performance.now(),
      duration: Math.max(50, duration)
    });
  }

  startLevel(index) {
    if (index < 0 || index >= this.levelsData.length) index = 0;
    this.currentLevelIndex = index;
    const levelData = this.levelsData[index];
    this.physics.loadLevel(levelData);
    this.state = GAME_STATE.PLAYING;
    this.accumulator = 0.0;
    this.queuedDir = DIR.NONE;
    this.isHoldingInput = false;
    this.isMoving = false;
    this.walkAnimTimer = 0.0;

    // Reset death state
    if (this.deathTimeout) {
      clearTimeout(this.deathTimeout);
      this.deathTimeout = null;
    }
    this.deathStartTime = 0;
    this.deathParticles = [];

    // Reset visual player position directly to grid
    this.visualPlayerX = this.physics.playerX;
    this.visualPlayerY = this.physics.playerY;
    this.playerFromX = this.physics.playerX;
    this.playerFromY = this.physics.playerY;
    this.playerToX = this.physics.playerX;
    this.playerToY = this.physics.playerY;
    this.playerStepStartTime = performance.now();
    this.playerStepDuration = (this.baseTickDuration / this.speedMultiplier) * 1000;
    this.activeAnimations.clear();

    // Start level intro animation
    this.levelStartTime = performance.now();
    this.sound.playLevelStart();

    this.updateHUD();
    if (this.onStateChange) this.onStateChange(this.state);
    if (this.onLevelStart) this.onLevelStart(index);
  }

  getLevelStartProgress(now) {
    if (!this.levelStartTime) return 1.0;
    const elapsed = now - this.levelStartTime;
    if (elapsed >= this.levelStartDuration) return 1.0;
    return Math.min(1.0, elapsed / this.levelStartDuration);
  }

  getGameState() {
    return {
      currentLevelIndex: this.currentLevelIndex,
      score: this.score,
      lives: this.lives,
      physics: this.physics.serializeState(),
      timestamp: Date.now()
    };
  }

  restoreGameState(savedState) {
    if (!savedState || typeof savedState.currentLevelIndex !== 'number' || !savedState.physics) {
      return false;
    }

    const index = savedState.currentLevelIndex;
    if (index < 0 || index >= this.levelsData.length) return false;

    this.currentLevelIndex = index;
    const levelData = this.levelsData[index];
    this.physics.loadLevel(levelData);
    this.physics.restoreState(savedState.physics);

    this.score = typeof savedState.score === 'number' ? savedState.score : 0;
    this.lives = typeof savedState.lives === 'number' ? savedState.lives : 5;

    this.state = GAME_STATE.PLAYING;
    this.accumulator = 0.0;
    this.queuedDir = DIR.NONE;
    this.isHoldingInput = false;
    this.isMoving = false;
    this.walkAnimTimer = 0.0;

    // Reset visual player position directly to restored grid coordinates
    this.visualPlayerX = this.physics.playerX;
    this.visualPlayerY = this.physics.playerY;
    this.playerFromX = this.physics.playerX;
    this.playerFromY = this.physics.playerY;
    this.playerToX = this.physics.playerX;
    this.playerToY = this.physics.playerY;
    this.playerStepStartTime = performance.now();
    this.playerStepDuration = (this.baseTickDuration / this.speedMultiplier) * 1000;
    this.activeAnimations.clear();

    this.levelStartTime = performance.now();
    this.updateHUD();
    if (this.onStateChange) this.onStateChange(this.state);
    if (this.onLevelStart) this.onLevelStart(index);
    return true;
  }

  restartLevel() {
    if (this.deathTimeout) {
      clearTimeout(this.deathTimeout);
      this.deathTimeout = null;
    }
    this.startLevel(this.currentLevelIndex);
  }

  setSpeed(multiplier) {
    this.speedMultiplier = Math.max(0.5, Math.min(3.0, multiplier));
  }

  setDirection(dir) {
    const isNone = (dir.dx === 0 && dir.dy === 0);
    if (isNone) {
      this.queuedDir = DIR.NONE;
      this.isHoldingInput = false;
    } else {
      const isNew = (dir.dx !== this.queuedDir.dx || dir.dy !== this.queuedDir.dy);
      this.queuedDir = dir;
      this.isHoldingInput = true;

      // Immediate first step on fresh key press or direction change
      if (isNew) {
        if (this.state === GAME_STATE.PLAYING) {
          const moved = this.physics.handlePlayerInput(this.queuedDir);
          if (moved) {
            this.stepProgress = 0.0;
            this.accumulator = 0.0; // Synchronize simulation clock with player step
          }
        }
      }
    }
  }

  handleLevelWon() {
    this.state = GAME_STATE.LEVEL_WON;
    this.score += 500;
    this.sound.playLevelWon();
    this.updateHUD();
    if (this.onStateChange) this.onStateChange(this.state);
  }

  nextLevel() {
    this.startLevel((this.currentLevelIndex + 1) % this.levelsData.length);
  }

  handlePlayerDead() {
    this.state = GAME_STATE.PLAYER_DEAD;
    this.deathStartTime = performance.now();
    this.deathDuration = 1500;
    this.lives--;
    this.sound.playDeath();
    this.updateHUD();
    if (this.onStateChange) this.onStateChange(this.state);

    // Spawn explosion ember fragments
    this.deathParticles = [];
    for (let i = 0; i < 36; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.8 + Math.random() * 4.8;
      this.deathParticles.push({
        x: this.visualPlayerX + 0.5,
        y: this.visualPlayerY + 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: 0.16 + Math.random() * 0.32,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 8.0,
        r: 1.0,
        g: Math.random() * 0.4,
        b: Math.random() * 0.2
      });
    }

    if (this.deathTimeout) clearTimeout(this.deathTimeout);
    this.deathTimeout = setTimeout(() => {
      this.deathTimeout = null;
      if (this.lives > 0) {
        this.startLevel(this.currentLevelIndex);
      } else {
        this.state = GAME_STATE.GAME_OVER;
        if (this.onStateChange) this.onStateChange(this.state);
      }
    }, this.deathDuration);
  }

  getDeathProgress(now) {
    if (this.state !== GAME_STATE.PLAYER_DEAD || !this.deathStartTime) return 0.0;
    const elapsed = now - this.deathStartTime;
    return Math.min(1.0, elapsed / this.deathDuration);
  }

  restartGame() {
    this.score = 0;
    this.lives = 5;
    this.startLevel(0);
  }

  updateHUD() {
    if (this.onHUDUpdate) {
      this.onHUDUpdate({
        score: this.score,
        level: this.currentLevelIndex + 1,
        lives: this.lives,
        jewelsLeft: this.physics.jewelsLeft,
        exitOpen: this.physics.exitOpen
      });
    }
  }

  getPlayerFrame() {
    if (!this.isMoving) return 0;
    return Math.floor(this.walkAnimTimer) % 4;
  }

  update(now) {
    const dt = Math.min(0.1, (now - this.lastTime) / 1000.0);
    this.lastTime = now;

    if (this.state === GAME_STATE.PLAYING) {
      const currentTickDuration = this.baseTickDuration / this.speedMultiplier;
      this.accumulator += dt;

      // Simulation ticks (Exact Z80 0xEC1C..0xEC25: Physics runs FIRST, Player input runs SECOND!)
      while (this.accumulator >= currentTickDuration) {
        // 1. World physics ticks FIRST (exact Z80 0xEC1C CALL 0xE69E)
        this.physics.tick();

        // 2. Player moves SECOND (exact Z80 0xEC1F CALL 0xEAF3)
        if (this.isHoldingInput && (this.queuedDir.dx !== 0 || this.queuedDir.dy !== 0)) {
          this.physics.handlePlayerInput(this.queuedDir);
        }

        this.accumulator -= currentTickDuration;
      }

      // High-precision continuous monotonic player interpolation (120Hz/ProMotion optimized)
      if (this.playerFromX !== this.playerToX || this.playerFromY !== this.playerToY) {
        const elapsed = now - this.playerStepStartTime;
        const t = Math.min(1.0, Math.max(0.0, elapsed / this.playerStepDuration));

        this.visualPlayerX = this.playerFromX + (this.playerToX - this.playerFromX) * t;
        this.visualPlayerY = this.playerFromY + (this.playerToY - this.playerFromY) * t;

        if (t >= 1.0) {
          this.visualPlayerX = this.playerToX;
          this.visualPlayerY = this.playerToY;
          this.playerFromX = this.playerToX;
          this.playerFromY = this.playerToY;
        }
      } else {
        this.visualPlayerX = this.physics.playerX;
        this.visualPlayerY = this.physics.playerY;
      }

      // Rockford is moving if currently interpolating between cells or holding movement
      this.isMoving = (this.playerFromX !== this.playerToX || this.playerFromY !== this.playerToY) ||
                      (this.isHoldingInput && (this.queuedDir.dx !== 0 || this.queuedDir.dy !== 0));

      if (this.isMoving) {
        this.walkAnimTimer += dt * 8.0 * this.speedMultiplier;
      } else {
        this.walkAnimTimer = 0.0;
      }

      // Update independent monotonic animations for falling objects
      for (const [key, anim] of this.activeAnimations.entries()) {
        const elapsed = now - anim.startTime;
        const t = Math.min(1.0, elapsed / anim.duration);
        anim.curX = anim.fromX + (anim.toX - anim.fromX) * t;
        anim.curY = anim.fromY + (anim.toY - anim.fromY) * t;
        anim.rot = (anim.rotationDelta || 0) * t;
        anim.progress = t;
        if (t >= 1.0) {
          this.activeAnimations.delete(key);
        }
      }
    } else if (this.state === GAME_STATE.PLAYER_DEAD) {
      for (const p of this.deathParticles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 8.0 * dt;
        p.rot += p.vRot * dt;
      }
    }
  }
}
