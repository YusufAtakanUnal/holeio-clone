/**
 * Level 1 - Başlangıç Şehri
 * Küçük ve orta binalar, kolay başlangıç
 */

import { BUILDING_TYPES, OBJECT_TYPES, ROAD_COLORS } from "../config/gameConfig";

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

    const { tileCount, tileSize, safeRadius } = LEVEL_1.grid;
    const offset = ((tileCount - 1) * tileSize) / 2;

    // EXTREME DENSITY: 3x3 Grid
    // Available space roughly -11 to +5 (16 units wide)
    // 3x3 grid -> ~5.3 units per cell

    for (let gx = 0; gx < tileCount; gx++) {
      for (let gz = 0; gz < tileCount; gz++) {
        const tx = gx * tileSize - offset;
        const tz = gz * tileSize - offset;

        // Skip center safe zone check here! Only check sub-items.
        // if (Math.hypot(tx, tz) < safeRadius) continue;

        // Moderate Density: 2x2 Grid with Skips (Avrg ~2-3 buildings)
        const subGrid = [
          { dx: -7, dz: -7 }, { dx: -2, dz: -7 },
          { dx: -7, dz: -2 }, { dx: -2, dz: -2 }
        ];

        subGrid.forEach((sub, subIdx) => {
          // 40% chance to skip - Keeps it from being too crowded
          if (hash(gx * 10 + subIdx, gz * 10 + subIdx, 500) > 0.6) return;

          // Skip if too close to road (safety check)
          if (sub.dx > 6 || sub.dz > 6) return;

          const actualX = tx + sub.dx;
          const actualZ = tz + sub.dz;

          // CRITICAL FIX: Check individual building distance from hole!
          const distFromCenter = Math.hypot(actualX, actualZ);
          if (distFromCenter < safeRadius) return;

          const typeH = hash(gx, gz, subIdx * 5);
          let buildingType = LEVEL_1.getBuildingType(tx, tz, distFromCenter, typeH);

          // Force smaller buildings for 3x3 grid to prevent overlap
          if (buildingType === "tall") buildingType = "medium";

          const typeConfig = BUILDING_TYPES[buildingType];
          const modelName = pick(typeConfig.models, gx * subIdx, gz * subIdx, 42);

          // Standard size for 2x2 grid
          const size = typeConfig.size;

          buildings.push({
            id: `building-${idx++}`,
            type: buildingType,
            name: modelName,
            pos: [actualX, size[1] / 2 + 0.1, actualZ],
            size: size,
            points: typeConfig.points,
            rotation: Math.floor(hash(gx, gz, subIdx * 9) * 4) * (Math.PI / 2)
          });
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
          // Store grid indices for logic if needed
          gridX: x,
          gridZ: z
        });
      }
    }

    return tiles;
  },

  // Ekstra objeler (arabalar, insanlar vb.)
  generateProps: () => {
    const props = [];
    let idx = 0;

    const tiles = LEVEL_1.generateRoadTiles();
    const { tileSize, safeRadius } = LEVEL_1.grid;

    const roadLane = tileSize / 2 - 2; // Approx 10.5

    tiles.forEach(tile => {
      const { gridX, gridZ, pos } = tile;
      const [tx, tz] = pos;

      // FIX: Check safe radius for props too!
      if (Math.hypot(tx, tz) < safeRadius) return;

      // --- Horizontal Road (at +Z edge) ---
      // X-Axis Road
      if (hash(gridX, gridZ, 100) > 0.5) {
        const typeConfig = OBJECT_TYPES.cars;
        const modelName = pick(typeConfig.models, gridX, gridZ, 101);

        // Randomly pick direction: East (+X) or West (-X)
        // If Model faces -Z by default:
        // +X: Rotate -90 (-PI/2)
        // -X: Rotate +90 (PI/2)
        const isEast = hash(gridX, gridZ, 102) > 0.5;
        const driveOffset = (hash(gridX, gridZ, 103) - 0.5) * tileSize;

        props.push({
          id: `car-h-${idx++}`,
          type: "car",
          name: modelName,
          pos: [tx + driveOffset, 0.5, tz + roadLane], // Lower Y slightly
          size: typeConfig.size,
          dir: typeConfig.dir,
          rotation: isEast ? -Math.PI / 2 : Math.PI / 2,
          points: typeConfig.points
        });
      }

      // --- Vertical Road (at +X edge) ---
      // Z-Axis Road
      if (hash(gridX, gridZ, 200) > 0.5) {
        const typeConfig = OBJECT_TYPES.cars;
        const modelName = pick(typeConfig.models, gridX, gridZ, 201);

        // Direction: South (+Z) or North (-Z)
        // If Model faces -Z by default:
        // -Z: Rotate 0
        // +Z: Rotate PI
        const isSouth = hash(gridX, gridZ, 202) > 0.5;
        const driveOffset = (hash(gridX, gridZ, 203) - 0.5) * tileSize;

        props.push({
          id: `car-v-${idx++}`,
          type: "car",
          name: modelName,
          pos: [tx + roadLane, 0.5, tz + driveOffset],
          size: typeConfig.size,
          dir: typeConfig.dir,
          rotation: isSouth ? Math.PI : 0,
          points: typeConfig.points
        });
      }
    });

    // 2. Pedestrians & Nature - Strictly SIdewalks
    // Sidewalk is strip just inside road.
    // Horizontal Sidewalk: Z approx 6.5 to 8.5 (Road starts at 8.5)
    // Vertical Sidewalk: X approx 6.5 to 8.5
    // Actually, Road width 4 -> 12.5 to 8.5.
    // Sidewalk width 1 -> 8.5 to 7.5.
    // Center of sidewalk strip: +/- 8.0.

    tiles.forEach(tile => {
      const { gridX, gridZ, pos } = tile;
      const [tx, tz] = pos;

      const sidewalkCenter = 8.0;

      const count = Math.floor(hash(gridX, gridZ, 300) * 4) + 1;

      for (let i = 0; i < count; i++) {
        const isHuman = hash(gridX, gridZ * i, 301) > 0.3;
        const typeConfig = isHuman ? OBJECT_TYPES.humans : OBJECT_TYPES.nature;
        const modelName = pick(typeConfig.models, gridX * i, gridZ, 302);

        // Pick side: Vertical Strip or Horizontal Strip?
        const isVerticalStrip = hash(gridX, gridZ * i, 303) > 0.5;

        let px, pz, rot;

        if (isVerticalStrip) {
          // On the vertical sidewalk (at +X side)
          px = tx + sidewalkCenter;
          // Along the strip randomly
          pz = tz + (hash(gridX * i, gridZ, 304) - 0.5) * tileSize;
          // Human faces along strip roughly
          rot = (hash(gridX, gridZ, 305) > 0.5 ? 0 : Math.PI);
        } else {
          // On the horizontal sidewalk (at +Z side)
          px = tx + (hash(gridX * i, gridZ, 304) - 0.5) * tileSize;
          pz = tz + sidewalkCenter;
          rot = (hash(gridX, gridZ, 305) > 0.5 ? Math.PI / 2 : -Math.PI / 2);
        }

        props.push({
          id: `prop-${idx++}`,
          type: isHuman ? "human" : "nature",
          name: modelName,
          pos: [px, typeConfig.size[1] / 2, pz],
          size: typeConfig.size,
          dir: typeConfig.dir,
          rotation: rot + (Math.random() - 0.5), // Slight jitter
          points: typeConfig.points
        });
      }
    });

    return props;
  },
};

export default LEVEL_1;
