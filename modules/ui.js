/**********************************************************************************
 * ui.js
 * Contains all UI update functions.
 **********************************************************************************/

import { rarityData } from "./constants.js";
import { player } from './character.js';
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

export function updateStatsUI(player, equipmentBonuses = { bonusATK: 0, bonusDEF: 0, bonusMAG: 0, bonusMR: 0 }) {
  
  if (!player) {
    console.error("updateStatsUI: player is undefined");
    return;
  }

  const statsList = document.getElementById("statsList");
  statsList.innerHTML = "";
  const effectiveATK = player.ATK + equipmentBonuses.bonusATK;
  const effectiveDEF = player.DEF + equipmentBonuses.bonusDEF;
  const effectiveMAG = player.MAG + equipmentBonuses.bonusMAG;
  const effectiveMR = player.MR + equipmentBonuses.bonusMR;

  const stats = {
    "Level": player.level,
    "XP": player.xp + " / " + player.xpNeeded,
    "HP": (player.currentHP || 0) + " / " + (player.HP || 0),
    "ATK": (player.ATK || 0) + " (+" + (equipmentBonuses.bonusATK || 0) + ") = " + (effectiveATK || 0),
    "DEF": (player.DEF || 0) + " (+" + (equipmentBonuses.bonusDEF || 0) + ") = " + (effectiveDEF || 0),
    "MAG": (player.MAG || 0) + " (+" + (equipmentBonuses.bonusMAG || 0) + ") = " + (effectiveMAG || 0),
    "MR": (player.MR || 0) + " (+" + (equipmentBonuses.bonusMR || 0) + ") = " + (effectiveMR || 0)
  };

  // Iterate over the stats object, creating an <li> for each stat.
  for (const key in stats) {
    const li = document.createElement("li");
    li.textContent = key + ": " + stats[key];
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
  document.getElementById("playerInfo").textContent =
    "Name: " + player.name + " | Race: " + player.race + " | Class: " + player.class;
  updateEquipmentUI(equipment);
  updateAreaInfo(player.currentArea);
}
