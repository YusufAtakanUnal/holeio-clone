/**
 * Game Configuration
 * Oyunun genel ayarları burada tanımlanır
 */

export const GAME_CONFIG = {
  // Delik ayarları
  hole: {
    initialRadius: 2.5,
    growthRate: 0.1,      // Her yutmada büyüme oranı
    maxRadius: 15,
  },

  // Hareket ayarları
  movement: {
    speed: 12,
    damping: 0.6,
  },

  // Fizik ayarları
  physics: {
    gravity: -20,
    friction: 1,
    restitution: 0,
  },

  // Kamera ayarları
  camera: {
    height: 28,
    distance: 22,
    fov: 50,
    lerpSpeed: 0.05,
  },

  // Arena ayarları
  arena: {
    wrapSize: 80,        // Wrap-around sınırı
    floorSize: 200,      // Zemin boyutu
  },
};

// Bina tipleri ve özellikleri
export const BUILDING_TYPES = {
  small: {
    models: [
      "low-detail-building-a",
      "low-detail-building-b",
      "low-detail-building-c",
      "low-detail-building-d",
      "low-detail-building-e",
      "low-detail-building-f",
      "low-detail-building-g",
      "low-detail-building-h",
    ],
    size: [3.5, 5, 3.5],
    points: 10,
  },
  medium: {
    models: [
      "building-a",
      "building-b",
      "building-c",
      "building-d",
      "building-e",
      "building-f",
      "building-g",
      "building-h",
    ],
    size: [4, 8, 4],
    points: 25,
  },
  tall: {
    models: [
      "building-skyscraper-a",
      "building-skyscraper-b",
      "building-skyscraper-c",
      "building-skyscraper-d",
      "building-skyscraper-e",
    ],
    size: [5, 16, 5],
    points: 50,
  },
};

// Yol texture renkleri
export const ROAD_COLORS = {
  default: {
    block: "#64748b",      // Bina alanı
    road: "#334155",       // Asfalt
    sidewalk: "#94a3b8",   // Kaldırım
    centerLine: "#fbbf24", // Sarı orta çizgi
    edgeLine: "#ffffff",   // Beyaz kenar çizgi
    intersection: "#1e293b", // Kavşak
    zebra: "#ffffff",      // Yaya geçidi
  },
  night: {
    block: "#1e293b",
    road: "#0f172a",
    sidewalk: "#334155",
    centerLine: "#f59e0b",
    edgeLine: "#94a3b8",
    intersection: "#020617",
    zebra: "#e2e8f0",
  },
  desert: {
    block: "#d4a574",
    road: "#78716c",
    sidewalk: "#a8a29e",
    centerLine: "#fbbf24",
    edgeLine: "#ffffff",
    intersection: "#57534e",
    zebra: "#ffffff",
  },
};

export default GAME_CONFIG;
