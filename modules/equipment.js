/**********************************************************************************
 * equipment.js
 * Contains functions related to equipment processing (scoring, bonuses, equipping,
 * and pet assignment).
 **********************************************************************************/

import { rarityData } from "./constants.js";
import { appendLog } from "./ui.js";
import { player } from "./character.js";
import { checkMilestones } from "./utils.js";

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
  if (["Magician", "Necromancer", "Beastlord"].includes(player.class)) {
    console.log("Assigning pet to player:", player.name, "Class:", player.class, "Level:", player.level);
    if (window.gameData && window.gameData.pets) {

      // Show all pets for this class. for DEBUGGING
      //const allClassPets = window.gameData.pets.filter(pet => pet.class === player.class);

      // Now filter pets by level
      let possiblePets = window.gameData.pets.filter(pet =>
        // Ensure pet.class exists before comparing
        pet.class && pet.class === player.class &&
        player.level >= pet.level
      );

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

        appendLog("Your pet " + player.pet.name + " (Level " + player.pet.level + ") joins you!");
        checkMilestones("pet", 1);
      } else {
        player.pet = null;
        console.warn("No eligible pet found for class", player.class, "and level", player.level);
      }
    } else {
      console.warn("window.gameData.pets is not loaded or missing.");
      player.pet = null;
    }
  } else {
    player.pet = null;
  }
}
