/**
 * Level 2 - Gece Şehri
 * Daha büyük binalar, gece teması
 */

import { BUILDING_TYPES, ROAD_COLORS } from "../config/gameConfig";

const hash = (x, z, seed = 0) => {
  const n = Math.sin((x + seed) * 127.1 + (z + seed) * 311.7) * 43758.5453123;
  return n - Math.floor(n);
};

const pick = (arr, x, z, seed = 0) => {
  return arr[Math.floor(hash(x, z, seed) * arr.length)];
};

export const LEVEL_2 = {
  id: "level-2",
  name: "Gece Şehri",
  description: "Büyük gökdelenler - Daha zorlu!",

  theme: {
    background: "#020617",
    fog: { color: "#020617", near: 40, far: 100 },
    roadColors: ROAD_COLORS.night,
    ambientLight: 0.3,
    directionalLight: 0.8,
  },

  hole: {
    radius: 3.0,
  },

  grid: {
    size: 11,
    cellSize: 14,
    safeRadius: 10,
    tileSize: 28,
    tileCount: 11,
  },

  getBuildingType: (x, z, distFromCenter, h) => {
    // Daha fazla gökdelen
    if (distFromCenter < 40 && h > 0.6) {
      return "tall";
    } else if (distFromCenter < 60 && h > 0.3) {
      return "medium";
    }
    return "small";
  },

  generateBuildings: () => {
    const buildings = [];
    let idx = 0;

    const { size: GRID, cellSize: CELL, safeRadius: SAFE_RADIUS } = LEVEL_2.grid;
    const start = -((GRID - 1) * CELL) / 2;

    for (let gx = 0; gx < GRID; gx++) {
      for (let gz = 0; gz < GRID; gz++) {
        const x = start + gx * CELL + (hash(gx, gz, 100) - 0.5) * 3;
        const z = start + gz * CELL + (hash(gx + 50, gz + 50, 100) - 0.5) * 3;

        const distFromCenter = Math.hypot(x, z);
        if (distFromCenter < SAFE_RADIUS) continue;

        const h = hash(gx, gz, 100);
        const buildingType = LEVEL_2.getBuildingType(x, z, distFromCenter, h);
        const typeConfig = BUILDING_TYPES[buildingType];

        // Level 2'de binalar biraz daha büyük
        const sizeMultiplier = buildingType === "tall" ? 1.2 : 1.1;
        const modelName = pick(typeConfig.models, gx, gz, 142);
        const size = typeConfig.size.map((s) => s * sizeMultiplier);

        buildings.push({
          id: `building-${idx++}`,
          type: buildingType,
          name: modelName,
          pos: [x, size[1] / 2 + 0.1, z],
          size,
          points: Math.round(typeConfig.points * 1.5),
        });
      }
    }

    return buildings;
  },

  generateRoadTiles: () => {
    const tiles = [];
    const { tileSize, tileCount } = LEVEL_2.grid;
    const offset = ((tileCount - 1) * tileSize) / 2;

    for (let x = 0; x < tileCount; x++) {
      for (let z = 0; z < tileCount; z++) {
        tiles.push({
          id: `tile-${x}-${z}`,
          pos: [x * tileSize - offset, z * tileSize - offset],
        });
      }
    }

    return tiles;
  },
};

export default LEVEL_2;
