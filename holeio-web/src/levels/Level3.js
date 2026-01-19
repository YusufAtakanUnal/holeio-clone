/**
 * Level 3 - Yeşil Ova
 * Ağaçlar, çalılar ve çitlerle dolu bir ova
 */

// Level 3 için ROAD_COLORS gerekmez - çimen kullanıyor

const hash = (x, z, seed = 0) => {
  const n = Math.sin((x + seed) * 127.1 + (z + seed) * 311.7) * 43758.5453123;
  return n - Math.floor(n);
};

const pick = (arr, x, z, seed = 0) => {
  return arr[Math.floor(hash(x, z, seed) * arr.length)];
};

// Ova teması için çimen renkleri (yol yok)
const MEADOW_GROUND = {
  primary: "#4ade80",    // Ana çimen
  secondary: "#22c55e",  // Koyu çimen
  accent: "#86efac",     // Açık çimen
  dirt: "#a3754a",       // Toprak lekeleri
};

// Obje tipleri
export const OBJECT_TYPES = {
  treeSmall: {
    models: ["tree-small"],
    dir: "objects",
    size: [2, 4, 2],
    points: 5,
  },
  treeLarge: {
    models: ["tree-large"],
    dir: "objects",
    size: [3, 6, 3],
    points: 15,
  },
  bush: {
    models: ["planter"],
    dir: "objects",
    size: [1.5, 1.2, 1.5],
    points: 3,
  },
  fence: {
    models: ["fence", "fence-low", "fence-1x2", "fence-2x2"],
    dir: "objects",
    size: [2, 1.2, 0.5],
    points: 2,
  },
};

export const LEVEL_3 = {
  id: "level-3",
  name: "Yeşil Ova",
  description: "Ağaçlar ve çalılarla dolu huzurlu bir ova",

  theme: {
    background: "#7dd3fc",  // Açık mavi gökyüzü
    fog: { color: "#7dd3fc", near: 60, far: 150 },
    groundType: "grass",    // Yol yerine çimen
    groundColors: MEADOW_GROUND,
    ambientLight: 0.8,
    directionalLight: 1.5,
  },

  hole: {
    radius: 2.0,
  },

  grid: {
    size: 10,
    cellSize: 10,
    safeRadius: 6,
    tileSize: 20,
    tileCount: 12,
  },

  // Bu level'da objeler var, binalar değil
  objectTypes: OBJECT_TYPES,

  generateBuildings: () => {
    const objects = [];
    let idx = 0;

    const { size: GRID, cellSize: CELL, safeRadius: SAFE_RADIUS } = LEVEL_3.grid;
    const start = -((GRID - 1) * CELL) / 2;

    for (let gx = 0; gx < GRID; gx++) {
      for (let gz = 0; gz < GRID; gz++) {
        const x = start + gx * CELL + (hash(gx, gz, 200) - 0.5) * 4;
        const z = start + gz * CELL + (hash(gx + 50, gz + 50, 200) - 0.5) * 4;

        const distFromCenter = Math.hypot(x, z);
        if (distFromCenter < SAFE_RADIUS) continue;

        const h = hash(gx, gz, 200);

        let objectType;
        let typeConfig;

        // Rastgele obje tipi seç
        if (h > 0.85) {
          objectType = "treeLarge";
        } else if (h > 0.6) {
          objectType = "treeSmall";
        } else if (h > 0.35) {
          objectType = "bush";
        } else if (h > 0.2) {
          objectType = "fence";
        } else {
          continue; // Boş alan
        }

        typeConfig = OBJECT_TYPES[objectType];
        const modelName = pick(typeConfig.models, gx, gz, 242);
        const size = [...typeConfig.size];

        objects.push({
          id: `object-${idx++}`,
          type: objectType,
          name: modelName,
          dir: typeConfig.dir,
          pos: [x, size[1] / 2 + 0.1, z],
          size,
          points: typeConfig.points,
          rotation: (hash(gx + 10, gz + 10, 200) - 0.5) * Math.PI * 2,
        });
      }
    }

    return objects;
  },

  generateRoadTiles: () => {
    const tiles = [];
    const { tileSize, tileCount } = LEVEL_3.grid;
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

export default LEVEL_3;
