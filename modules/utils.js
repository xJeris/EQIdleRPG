/**********************************************************************************
 * utils.js
 * Contains helper functions.
 ***********************************************************************************/

import { dmgModifiers } from "./constants.js"; 
import { appendLog } from "./ui.js";
import { player } from "./character.js";

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

export function getEffectiveMR(target) {
  if (target === player) {
    const bonuses = getEquipmentBonuses(player.equipment);
    return player.MR + bonuses.bonusMR;
  }
  return target.MR || 0;
}

export function checkMilestones(eventType, value) {
  window.gameData.milestones.forEach(m => {
    if (
      m.type === eventType &&
      !player.milestones.includes(m.id) &&  // <-- Only if not already achieved
      value >= m.value
    ) {
      player.milestones.push(m.id);
      appendLog(`<span style="color: gold;">Milestone achieved: ${m.name}!</span>`);
    }
  });
}
