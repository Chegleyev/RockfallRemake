/**
 * Unit test for Bomb mechanics and detonation
 */

import { RockfallPhysics } from '../src/engine/physics.js';
import { TILES, DIR } from '../src/engine/types.js';

console.log('Testing Bomb interaction and detonation mechanics...');

function createTestLevel() {
  const width = 10;
  const height = 10;
  const grid = [];
  for (let r = 0; r < height; r++) {
    const row = [];
    for (let c = 0; c < width; c++) {
      if (r === 0 || r === height - 1 || c === 0 || c === width - 1) {
        row.push(TILES.STEEL_WALL);
      } else {
        row.push(TILES.EMPTY);
      }
    }
    grid.push(row);
  }
  return { width, height, jewels_required: 1, grid };
}

// Test 1: Moving into a stationary bomb when behind is blocked -> DOES NOT EXPLODE
{
  const physics = new RockfallPhysics();
  const lvl = createTestLevel();
  physics.loadLevel(lvl);

  physics.playerX = 3;
  physics.playerY = 5;
  physics.setTile(3, 5, TILES.PLAYER);

  // Place bomb at (4, 5) and wall behind it at (5, 5)
  physics.setTile(4, 5, TILES.BOMB);
  physics.setTile(5, 5, TILES.WALL);

  let explosionTriggered = false;
  physics.onEvent = (evt) => {
    if (evt === 'explosion') explosionTriggered = true;
  };

  const moved = physics.handlePlayerInput(DIR.RIGHT);

  if (moved) throw new Error('Player should not be able to move into a blocked bomb');
  if (explosionTriggered) throw new Error('Stationary bomb should NOT explode when player walks into it!');
  if (!physics.playerAlive) throw new Error('Player should still be alive!');
  if (physics.playerX !== 3 || physics.playerY !== 5) throw new Error('Player position should remain unchanged');
  console.log('✔ Test 1 passed: Moving into a blocked bomb does NOT trigger explosion');
}

// Test 2: Moving vertically (UP and DOWN) into a stationary bomb -> DOES NOT EXPLODE
{
  const physics = new RockfallPhysics();
  const lvl = createTestLevel();
  physics.loadLevel(lvl);

  physics.playerX = 4;
  physics.playerY = 6;
  physics.setTile(4, 6, TILES.PLAYER);
  physics.setTile(4, 5, TILES.BOMB); // Bomb is directly above player

  let explosionTriggered = false;
  physics.onEvent = (evt) => {
    if (evt === 'explosion') explosionTriggered = true;
  };

  const movedUp = physics.handlePlayerInput(DIR.UP);

  if (movedUp) throw new Error('Player should not move up into a stationary bomb');
  if (explosionTriggered) throw new Error('Stationary bomb should NOT explode on vertical movement!');
  if (!physics.playerAlive) throw new Error('Player should still be alive!');

  // Now test moving DOWN into a bomb
  physics.setTile(4, 7, TILES.BOMB); // Bomb directly below player
  const movedDown = physics.handlePlayerInput(DIR.DOWN);
  if (movedDown) throw new Error('Player should not move down into a stationary bomb');
  if (explosionTriggered) throw new Error('Stationary bomb should NOT explode on vertical movement down!');
  if (!physics.playerAlive) throw new Error('Player should still be alive!');
  console.log('✔ Test 2 passed: Moving vertically into a stationary bomb does NOT trigger explosion');
}

// Test 3: Pushing a stationary bomb horizontally into empty space
{
  const physics = new RockfallPhysics();
  const lvl = createTestLevel();
  physics.loadLevel(lvl);

  physics.playerX = 3;
  physics.playerY = 5;
  physics.setTile(3, 5, TILES.PLAYER);
  physics.setTile(4, 5, TILES.BOMB);
  physics.setTile(5, 5, TILES.EMPTY); // Empty behind

  let explosionTriggered = false;
  physics.onEvent = (evt) => {
    if (evt === 'explosion') explosionTriggered = true;
  };

  const moved = physics.handlePlayerInput(DIR.RIGHT);

  if (!moved) throw new Error('Player should be able to push bomb horizontally into empty space');
  if (explosionTriggered) throw new Error('Bomb should not explode while being pushed horizontally');
  if (physics.getTile(5, 5) !== TILES.BOMB) throw new Error('Bomb should have moved to (5, 5)');
  if (physics.playerX !== 4 || physics.playerY !== 5) throw new Error('Player should follow into (4, 5)');
  console.log('✔ Test 3 passed: Horizontal pushing of bomb works cleanly');
}

// Test 4: Falling bomb explodes upon impact
{
  const physics = new RockfallPhysics();
  const lvl = createTestLevel();
  physics.loadLevel(lvl);

  physics.setTile(5, 2, TILES.BOMB);
  physics.setTile(5, 3, TILES.EMPTY);
  physics.setTile(5, 4, TILES.WALL); // Solid ground 2 tiles down

  let explosionTriggered = false;
  let explosionCoords = null;
  physics.onEvent = (evt, data) => {
    if (evt === 'explosion') {
      explosionTriggered = true;
      explosionCoords = data;
    }
  };

  // Tick 1: Bomb falls from (5, 2) to (5, 3)
  physics.tick();
  if (explosionTriggered) throw new Error('Bomb should not explode while in free fall');
  if (physics.getTile(5, 3) !== TILES.BOMB) throw new Error('Bomb should be at (5, 3)');

  // Tick 2: Bomb impacts wall at (5, 4) -> DETONATE!
  physics.tick();
  if (!explosionTriggered) throw new Error('Falling bomb MUST detonate upon impact!');
  if (explosionCoords.x !== 5 || explosionCoords.y !== 3) {
    throw new Error(`Explosion should be centered at impact location (5, 3), got: ${JSON.stringify(explosionCoords)}`);
  }
  console.log('✔ Test 4 passed: Falling bomb detonates upon impact as in original game');
}

console.log('🎉 All bomb physics tests PASSED successfully!');
