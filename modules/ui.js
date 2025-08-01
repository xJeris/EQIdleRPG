/**********************************************************************************
 * ui.js
 * Contains all UI update functions.
 **********************************************************************************/

import { rarityData } from "./constants.js";
import { player } from './character.js';
import { getEquipmentBonuses } from "./equipment.js";
window.player = player;

export function appendLog(message) {
  const logDiv = document.getElementById("combatLog");
  const p = document.createElement("p");
  p.innerHTML = message;
  logDiv.appendChild(p);
  logDiv.scrollTop = logDiv.scrollHeight;
}

export function updateAreaInfo(area) {
  const areaNameDiv = document.getElementById("areaName");
  const areaDescDiv = document.getElementById("areaDescription");
  if (areaNameDiv && areaDescDiv && area) {
    areaNameDiv.textContent = area.name || "";
    areaDescDiv.textContent = area.description || "";
  }
}

export function updateGameTotals() {
  const totalsList = document.getElementById("totalsList");
  if (!totalsList) {
    console.warn("Totals list element not found");
    return;
  }

  totalsList.innerHTML = '';

  const gameTotals = {
    "Bosses Slain": player.bossKills || 0,
    "Enemies Defeated": player.enemyKills || 0,
    "Gear Found": player.itemDrops || 0,
    "Defeats": player.deathCount || 0
  };

  // Iterate over the gameTotals, creating an <li> for each total.
  for (const key in gameTotals) {
    const li = document.createElement("li");
    li.textContent = `${key}: ${gameTotals[key]}`;
    totalsList.appendChild(li);
  }
}

export function showMilestonesOverlay() {
  const overlay = document.getElementById("milestonesOverlay");
  const list = document.getElementById("milestonesList");
  list.innerHTML = "";
  window.gameData.milestones.forEach(m => {
    const li = document.createElement("li");
    const achieved = player.milestones && player.milestones.includes(m.id);
    li.textContent = m.name + " - " + m.description;
    li.style.color = achieved ? "white" : "gray";
    list.appendChild(li);
  });
  overlay.style.display = "block";
}

export function getItemDisplayName(item) {
  const rarityInfo = rarityData[item.rarity] || { color: "white" };
  return `<span style="color: ${rarityInfo.color};">${item.name}</span>`;
}

export function updateEquipmentUI(equipment) {
  const equipmentList = document.getElementById("equipmentList");
  equipmentList.innerHTML = "";
  Object.entries(equipment).forEach(([slot, item]) => {
    const li = document.createElement("li");
    if (item) {
      const displayName = getItemDisplayName(item);
      const modifierText = Object.entries(item.modifiers)
        .map(([stat, value]) => `${stat} ${value >= 0 ? '+' : ''}${value}`)
        .join(", ");
      li.innerHTML = `${slot}: ${displayName} (L${item.level}${modifierText ? ", " + modifierText : ""})`;
    } else {
      li.textContent = `${slot}: None`;
    }
    equipmentList.appendChild(li);
  });
}

export function formatStat(effective, base, opts = {}) {
  const { up = 'green', down = 'red' } = opts;
  if      (effective > base) return `<span style="color:${up}">${effective}</span>`;
  else if (effective < base) return `<span style="color:${down}">${effective}</span>`;
  else    return `${effective}`;
}

export function updateStatsUI(player) {

  if (!player) {
    console.error("updateStatsUI: player is undefined");
    return;
  }

  // Collect any stat bonuses
  const {
    bonusATK = 0,
    bonusDEF = 0,
    bonusMAG = 0,
    bonusMR  = 0
  } = getEquipmentBonuses(player.equipment);

  // Add bonuses to base stats
  const statsList = document.getElementById("statsList");
  statsList.innerHTML = "";
  const effectiveATK = player.ATK + bonusATK;
  const effectiveDEF = player.DEF + bonusDEF;
  const effectiveMAG = player.MAG + bonusMAG;
  const effectiveMR = player.MR + bonusMR;

  let displayATK = formatStat(effectiveATK, player.ATK);
  let displayDEF = formatStat(effectiveDEF, player.DEF);
  let displayMAG = formatStat(effectiveMAG, player.MAG);
  let displayMR = formatStat(effectiveMR, player.MR);

  const stats = {
    "Level": player.level,
    "XP": player.xp + " / " + player.xpNeeded,
    "HP": (player.currentHP || 0) + " / " + (player.HP || 0),
    "ATK": displayATK,
    "DEF": displayDEF,
    "MAG": displayMAG,
    "MR": displayMR
  };

  // Iterate over the stats object, creating an <li> for each stat.
  for (const key in stats) {
    const li = document.createElement("li");
    li.innerHTML = key + ": " + stats[key];
    statsList.appendChild(li);
  }

  // If player has a pet, append pet stats dynamically
  const petsList = document.getElementById("petsList");
  petsList.innerHTML = ""; // Clear old pet stats

  if (player.pet) {
    const petStats = {
      "Pet": player.pet.name + " (L" + player.pet.level + ")",
      "Pet HP": player.pet.currentHP + " / " + player.pet.HP,  // Show HP dynamically
      "Pet ATK": player.pet.ATK,
      "Pet DEF": player.pet.DEF,
      "Pet MAG": player.pet.MAG,
      "Pet MR": player.pet.MR
    };

    for (const key in petStats) {
      const li = document.createElement("li");
      li.textContent = key + ": " + petStats[key];
      petsList.appendChild(li);
    }
  }
}

export function updateUI(player, equipment, equipmentBonuses) {
  document.getElementById("playerInfo").innerHTML =
    "Name: " + player.name + "<br>" +
    "Race: " + player.race + " | Class: " + player.class;
  updateEquipmentUI(equipment);
  updateAreaInfo(player.currentArea);
}
