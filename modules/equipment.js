/**********************************************************************************
 * equipment.js
 * Contains functions related to equipment processing (scoring, bonuses, equipping,
 * and pet assignment).
 **********************************************************************************/

import { rarityData } from "./constants.js";
import { appendLog } from "./ui.js";
import { player } from "./character.js";

export function calculateEquipmentScore(item) {
  let baseline = item.level * 10;
  const weights = { ATK: 1.0, DEF: 0.8, MAG: 0.9 };
  let modifierSum = 0;
  for (let stat in item.modifiers) {
    if (weights[stat] !== undefined) {
      modifierSum += item.modifiers[stat] * weights[stat];
    }
  }
  let rarityMultiplier = rarityData[item.rarity] ? rarityData[item.rarity].multiplier : 1.0;
  return (baseline + modifierSum) * rarityMultiplier;
}

export function getEquipmentBonuses(equipment) {
  let bonusATK = 0;
  let bonusDEF = 0;
  let bonusMAG = 0;
  let bonusMR = 0;
  for (let slot in equipment) {
    const item = equipment[slot];
    if (item && item.modifiers) {
      bonusATK += item.modifiers.ATK || 0;
      bonusDEF += item.modifiers.DEF || 0;
      bonusMAG += item.modifiers.MAG || 0;
      bonusMR += item.modifiers.MR || 0;
    }
  }
  return { bonusATK, bonusDEF, bonusMAG, bonusMR };
}

export function equipIfBetter(newItem, slot, equipment) {
  console.log("Trying to equip:", newItem.name, "in slot:", slot);
  console.log("Available equipment slots:", Object.keys(player.equipment));

  const currentItem = equipment[slot];
  const newScore = calculateEquipmentScore(newItem);
  const currentScore = currentItem ? calculateEquipmentScore(currentItem) : 0;
  if (!currentItem || newScore > currentScore) {
    equipment[slot] = newItem;
    return true;
  }
  return false;
}

export function assignPetToPlayer() {
  console.log("starting assignPetToPlayer function");
  console.log("player.class:", player.class, "player.level:", player.level);

  if (["Magician", "Necromancer", "Beastlord"].includes(player.class)) {
    console.log("player class is eligible for a pet.");

    if (window.gameData && window.gameData.pets) {
      console.log("window.gameData.pets loaded:", window.gameData.pets.length);

      // Show all pets for this class. for DEBUGGING
      const allClassPets = window.gameData.pets.filter(pet => pet.class === player.class);
      console.log("All pets for this class:", allClassPets);

      // Now filter pets by level
      let possiblePets = window.gameData.pets.filter(pet =>
        // Ensure pet.class exists before comparing
        pet.class && pet.class === player.class &&
        player.level >= pet.level
      );
      console.log("Possible pets for player:", possiblePets);

      if (possiblePets.length > 0) {
        // Assign the highest-level available pet
        //let newPet = possiblePets[possiblePets.length - 1];
        let newPet = possiblePets.reduce((a, b) => (a.level > b.level ? a : b));
        player.pet = {
          id: newPet.id,
          name: newPet.name,
          class: newPet.class,
          level: newPet.level,
          currentHP: newPet.hp,
          HP: newPet.hp,
          ATK: newPet.atk,
          DEF: newPet.def,
          MAG: newPet.mag,
          MR: newPet.mr
        };
        console.log("Assigned pet:", player.pet);
        appendLog("Your pet " + player.pet.name + " (Level " + player.pet.level + ") joins you!");
      } else {
        player.pet = null;
        console.warn("No eligible pet found for class", player.class, "and level", player.level);
      }
    } else {
      console.warn("window.gameData.pets is not loaded or missing.");
      player.pet = null;
    }
  } else {
    console.log("player class is not eligible for a pet.");
    player.pet = null;
  }
}
