/**********************************************************************************
 * utils.js
 * Contains helper functions.
 ***********************************************************************************/

import { dmgModifiers } from "./constants.js"; 

export function parseModifiers(str) {
  if (!str) return {};
  let mods = {};
  let parts = str.split(',');
  parts.forEach(pair => {
    let [stat, value] = pair.split(':');
    mods[stat.trim()] = parseInt(value.trim());
  });
  return mods;
}

export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function randomizeDamage(baseDamage, range = dmgModifiers.dmgRange) {
  const min = Math.max(1, baseDamage - range);
  const max = baseDamage + range;
  return Math.max(1, Math.floor(Math.random() * (max - min + 1)) + min);
}
