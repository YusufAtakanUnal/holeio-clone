/**
 * Level 2 - Gece Şehri
 * Daha büyük binalar, gece teması
 */

import { BUILDING_TYPES, OBJECT_TYPES, ROAD_COLORS } from "../config/gameConfig";

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

  // Binaları oluştur
  generateBuildings: () => {
    const buildings = [];
    let idx = 0;

    const { tileCount, tileSize, safeRadius } = LEVEL_2.grid;
    const offset = ((tileCount - 1) * tileSize) / 2;

    // Level 2 uses generic density logic like Level 1 but for its specific grid
    // 2x2 Dense Grid

    for (let gx = 0; gx < tileCount; gx++) {
      for (let gz = 0; gz < tileCount; gz++) {
        // Tile position (center)
        const tx = gx * tileSize - offset;
        const tz = gz * tileSize - offset;

        // Skip center safe zone check here, check individual items
        // if (Math.hypot(tx, tz) < safeRadius) continue;

        // 2x2 Sub-grid
        const subGrid = [
          { dx: -6, dz: -6 }, { dx: -1, dz: -6 },
          { dx: -6, dz: -1 }, { dx: -1, dz: -1 }
        ];

        subGrid.forEach((sub, subIdx) => {
          // 60% fill rate for optimal performance and no collisions
          if (hash(gx * 10 + subIdx, gz * 10 + subIdx, 200) > 0.60) return;

          const actualX = tx + sub.dx;
          const actualZ = tz + sub.dz;

          // CRITICAL FIX: Check actual distance!
          const distFromCenter = Math.hypot(actualX, actualZ);
          if (distFromCenter < safeRadius) return;

          const typeH = hash(gx, gz, subIdx * 5 + 200);
          let buildingType = LEVEL_2.getBuildingType(tx, tz, distFromCenter, typeH);

          const typeConfig = BUILDING_TYPES[buildingType];
          const modelName = pick(typeConfig.models, gx * subIdx, gz * subIdx, 142);

          // Slightly larger buildings in Level 2 but reduced for physics stable
          const sizeMultiplier = buildingType === "tall" ? 1.15 : 1.05;
          const size = typeConfig.size.map(s => s * sizeMultiplier * 0.9);

          buildings.push({
            id: `building-${idx++}`,
            type: buildingType,
            name: modelName,
            pos: [actualX, size[1] / 2 + 0.1, actualZ],
            size: size,
            points: Math.round(typeConfig.points * 1.5),
            rotation: Math.floor(hash(gx, gz, subIdx * 9 + 200) * 4) * (Math.PI / 2)
          });
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

    const tiles = LEVEL_2.generateRoadTiles();
    const { tileSize, safeRadius } = LEVEL_2.grid;
    const roadLane = tileSize / 2 - 2;

    tiles.forEach(tile => {
      const { gridX, gridZ, pos } = tile;
      const [tx, tz] = pos;

      // FIX: Check safe radius for props too!
      if (Math.hypot(tx, tz) < safeRadius) return;

      // --- Cars ---
      // X-Axis
      if (hash(gridX, gridZ, 500) > 0.5) {
        const typeConfig = OBJECT_TYPES.cars;
        const modelName = pick(typeConfig.models, gridX, gridZ, 501);
        const isEast = hash(gridX, gridZ, 502) > 0.5;
        const driveOffset = (hash(gridX, gridZ, 503) - 0.5) * tileSize;

        props.push({
          id: `car-h-${idx++}`,
          type: "car",
          name: modelName,
          pos: [tx + driveOffset, 0.5, tz + roadLane],
          size: typeConfig.size,
          dir: typeConfig.dir,
          rotation: isEast ? -Math.PI / 2 : Math.PI / 2,
          points: typeConfig.points
        });
      }
      // Z-Axis
      if (hash(gridX, gridZ, 600) > 0.5) {
        const typeConfig = OBJECT_TYPES.cars;
        const modelName = pick(typeConfig.models, gridX, gridZ, 601);
        const isSouth = hash(gridX, gridZ, 602) > 0.5;
        const driveOffset = (hash(gridX, gridZ, 603) - 0.5) * tileSize;

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

    // --- Pedestrians ---
    tiles.forEach(tile => {
      const { gridX, gridZ, pos } = tile;
      const [tx, tz] = pos;
      const sidewalkCenter = 8.0;
      const count = Math.floor(hash(gridX, gridZ, 700) * 4) + 2; // More people in nightlife city

      for (let i = 0; i < count; i++) {
        const isHuman = hash(gridX, gridZ * i, 701) > 0.2; // Mostly humans
        const typeConfig = isHuman ? OBJECT_TYPES.humans : OBJECT_TYPES.nature;
        const modelName = pick(typeConfig.models, gridX * i, gridZ, 702);
        const isVerticalStrip = hash(gridX, gridZ * i, 703) > 0.5;

        let px, pz, rot;
        if (isVerticalStrip) {
          px = tx + sidewalkCenter;
          pz = tz + (hash(gridX * i, gridZ, 704) - 0.5) * tileSize;
          rot = (hash(gridX, gridZ, 705) > 0.5 ? 0 : Math.PI);
        } else {
          px = tx + (hash(gridX * i, gridZ, 704) - 0.5) * tileSize;
          pz = tz + sidewalkCenter;
          rot = (hash(gridX, gridZ, 705) > 0.5 ? Math.PI / 2 : -Math.PI / 2);
        }

        props.push({
          id: `prop-${idx++}`,
          type: isHuman ? "human" : "nature",
          name: modelName,
          pos: [px, typeConfig.size[1] / 2, pz],
          size: typeConfig.size,
          dir: typeConfig.dir,
          rotation: rot + (Math.random() - 0.5),
          points: typeConfig.points
        });
      }
    });

    return props;
  },
};

export default LEVEL_2;
