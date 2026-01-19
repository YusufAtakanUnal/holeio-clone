/**
 * Level Index
 * Tüm seviyelerin listesi
 */

import LEVEL_1 from "./Level1";
import LEVEL_2 from "./Level2";
import LEVEL_3 from "./Level3";

export const LEVELS = {
  1: LEVEL_1,
  2: LEVEL_2,
  3: LEVEL_3,
};

export const getLevelById = (id) => {
  return Object.values(LEVELS).find((level) => level.id === id);
};

export const getLevelByNumber = (num) => {
  return LEVELS[num];
};

export const getAllLevels = () => {
  return Object.values(LEVELS);
};

export { LEVEL_1, LEVEL_2, LEVEL_3 };
