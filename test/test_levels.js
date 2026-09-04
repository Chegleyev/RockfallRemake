/**
 * Automated test suite for Rockfall levels and physics
 */

import fs from 'fs';
import { RockfallPhysics } from '../src/engine/physics.js';
import { TILES } from '../src/engine/types.js';

const levelsData = JSON.parse(fs.readFileSync('./assets/levels.json', 'utf8'));

console.log(`Starting automated validation for ${levelsData.length} levels...`);

let passed = 0;
const physics = new RockfallPhysics();

levelsData.forEach((lvl, idx) => {
  if (lvl.width !== 64 || lvl.height !== 32) {
    throw new Error(`Level ${idx} has invalid dimensions: ${lvl.width}x${lvl.height}`);
  }
  if (!lvl.grid || lvl.grid.length !== 32) {
    throw new Error(`Level ${idx} has invalid grid row count: ${lvl.grid?.length}`);
  }

  // Load level into physics engine
  physics.loadLevel(lvl);

  if (physics.exitX === 0 && physics.exitY === 0 && physics.getTile(0, 0) !== TILES.EXIT) {
    console.warn(`Level ${idx} exit location check warning (exit at ${physics.exitX}, ${physics.exitY})`);
  }

  // Simulate 20 ticks of physics (falling boulders, enemy moves)
  for (let t = 0; t < 20; t++) {
    physics.tick();
  }

  passed++;
});

console.log(`✅ All ${passed} levels successfully validated and passed 20-tick simulation without errors!`);
