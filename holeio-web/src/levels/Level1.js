/**
 * Level 1 - Başlangıç Şehri
 * Küçük ve orta binalar, kolay başlangıç
 */

import { BUILDING_TYPES, ROAD_COLORS } from "../config/gameConfig";

// Deterministik random fonksiyonları
const hash = (x, z, seed = 0) => {
  const n = Math.sin((x + seed) * 127.1 + (z + seed) * 311.7) * 43758.5453123;
  return n - Math.floor(n);
};

const pick = (arr, x, z, seed = 0) => {
  return arr[Math.floor(hash(x, z, seed) * arr.length)];
};

export const LEVEL_1 = {
  // Level bilgileri
  id: "level-1",
  name: "Başlangıç Şehri",
  description: "Küçük bir mahalle - Öğrenmeye başla!",
  
  // Tema
  theme: {
    background: "#0f172a",
    fog: { color: "#0f172a", near: 50, far: 120 },
    roadColors: ROAD_COLORS.default,
    ambientLight: 0.5,
    directionalLight: 1.3,
  },

  // Delik başlangıç ayarları
  hole: {
    radius: 2.5,
  },

  // Grid ayarları
  grid: {
    size: 9,           // 9x9 grid
    cellSize: 12,      // Her hücre 12 birim
    safeRadius: 8,     // Delik etrafı güvenli alan
    tileSize: 25,      // Yol tile boyutu
    tileCount: 9,      // 9x9 tile
  },

  // Bina dağılımı fonksiyonu
  getBuildingType: (x, z, distFromCenter, h) => {
    // Merkeze yakın: daha yüksek binalar
    if (distFromCenter < 30 && h > 0.8) {
      return "tall";
    } else if (distFromCenter < 45 && h > 0.5) {
      return "medium";
    }
    return "small";
  },

  // Binaları oluştur
  generateBuildings: () => {
    const buildings = [];
    let idx = 0;

    const { size: GRID, cellSize: CELL, safeRadius: SAFE_RADIUS } = LEVEL_1.grid;
    const start = -((GRID - 1) * CELL) / 2;

    for (let gx = 0; gx < GRID; gx++) {
      for (let gz = 0; gz < GRID; gz++) {
        const x = start + gx * CELL + (hash(gx, gz) - 0.5) * 2;
        const z = start + gz * CELL + (hash(gx + 50, gz + 50) - 0.5) * 2;

        // Güvenli alan kontrolü
        const distFromCenter = Math.hypot(x, z);
        if (distFromCenter < SAFE_RADIUS) continue;

        const h = hash(gx, gz);
        const buildingType = LEVEL_1.getBuildingType(x, z, distFromCenter, h);
        const typeConfig = BUILDING_TYPES[buildingType];

        const modelName = pick(typeConfig.models, gx, gz, 42);
        const size = [...typeConfig.size];

        buildings.push({
          id: `building-${idx++}`,
          type: buildingType,
          name: modelName,
          pos: [x, size[1] / 2 + 0.1, z],
          size,
          points: typeConfig.points,
        });
      }
    }

    return buildings;
  },

  // Yol tile'larını oluştur
  generateRoadTiles: () => {
    const tiles = [];
    const { tileSize, tileCount } = LEVEL_1.grid;
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

export default LEVEL_1;
