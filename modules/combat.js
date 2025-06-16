/**********************************************************************************
 * combat.js
 * Contains combat simulation functions, XP/level mechanics, and save/load progress.
 **********************************************************************************/

import { delay } from "./utils.js";
import { appendLog, updateUI, updateStatsUI } from "./ui.js";
import { equipIfBetter, getEquipmentBonuses, assignPetToPlayer } from "./equipment.js";
import { player } from "./character.js";
import { spellCastChance, classesWithPets, enemyCombatConstants, bossCombatConstants } from "./constants.js";

// Global flag to control the game loop.
export let gameRunning = false;

// Save progress using localStorage.
export function saveProgress() {
  localStorage.setItem("idleRPGPlayer", JSON.stringify(player));
}

// Load progress from localStorage.
export function loadProgress() {
  let savedPlayer = localStorage.getItem("idleRPGPlayer");

  // If saved progress is missing or empty, return immediately.
  if (!savedPlayer || savedPlayer === "null" || savedPlayer.trim() === "") {
    return false;
  }

  try {
    const parsedPlayer = JSON.parse(savedPlayer);

    // Defensive check: Ensure the essential property "class" exists.
    if (!parsedPlayer.class) {
      console.error("Player class is undefined in saved progress.");
      return false;
    }

    // Assign parsed data into the global player object.
    Object.assign(player, parsedPlayer);
  } catch (err) {
    console.error("Error parsing saved player data:", err);
    return false;
  }

  // Ensure equipment is defined.
  if (!player.equipment) {
    player.equipment = {
      "Head": null,
      "Torso": null,
      "Legs": null,
      "Back": null,
      "Main Hand": null,
      "Offhand": null,
      "Ring 1": null,
      "Ring 2": null
    };
  }

  // If currentArea exists and gameData is loaded, restore currentArea.
  if (player.currentArea && player.currentArea.id && window.gameData && window.gameData.areas) {
    player.currentArea =
      window.gameData.areas.find(a => a.id === player.currentArea.id) || player.currentArea;
  }

  // Defensive: Double-check player's class (though we already checked above).
  if (!player.class) {
    console.error("Player class is still undefined after parsing.");
    return false;
  }

  // Ensure that pets data is available before calling assignPetToPlayer.
  if (window.gameData && window.gameData.pets) {
    assignPetToPlayer();
  } else {
    console.warn("Pets data is not available; skipping pet assignment.");
  }

  // Finally update the UI with the loaded player data.
  updateUI(player, player.equipment, getEquipmentBonuses(player.equipment));
  return true;
}

// Determine which area is appropriate based on the player's level.
export function findAreaForLevel(level) {
  console.log("Finding area for level:", level);
  if (window.gameData && window.gameData.areas) {
    for (let area of window.gameData.areas) {
      if (level >= area.recommendedLevel && level <= area.maxLevel) {
        return area;
      }
    }
    return window.gameData.areas[window.gameData.areas.length - 1];
  }
  return null;
}

// Helper function to retrieve available spells for a given class.
export function getAvailableSpellsForClass(cls, level) {
  return window.gameData.spells.filter(spell => 
    spell.class === cls &&
    level >= spell.minLevel &&
    level <= spell.maxLevel
  );
}

// Calculate spell damage based on player.MAG and target's MR.
export function calculateSpellDamage(spell, player, target) {
  const scalingFactor = 0.4;
  const mrFactor = target.MR || 0;
  // Each point of MR reduces spell damage by 1%, capped at 75%
  const maxReduction = Math.min(mrFactor, 75);
  const baseDamage = spell.baseDamage + Math.floor(player.MAG * scalingFactor);
  const finalDamage = Math.floor(baseDamage * (1 - maxReduction / 100));
  return Math.max(finalDamage, 1);
}

// XP & Level-Up Mechanics.
export function addXP(amount) {
  player.xp += amount;
  appendLog("<span style='color: yellow;'>You gained " + amount + " XP.</span>");
  
  while (player.xp >= player.xpNeeded && player.level < 100) {
    player.xp -= player.xpNeeded;
    player.level++;
    appendLog("<span style='color: blue;'>Level Up! You are now level " + player.level + ".</span>");
    player.xpNeeded = Math.floor(1000 * Math.pow(player.level, 2.482));
    const hpIncreaseFactor = 0.06;
    const AtkIncreaseFactor = 0.045;
    const DefIncreaseFactor = 0.045;
    const MagIncreaseFactor = 0.045;
    const MrIncreaseFactor = 0.00;
    player.HP = Math.floor(player.HP * (1 + hpIncreaseFactor));
    player.ATK = Math.ceil(player.ATK * (1 + AtkIncreaseFactor));
    player.DEF = Math.ceil(player.DEF * (1 + DefIncreaseFactor));
    player.MAG = Math.ceil(player.MAG * (1 + MagIncreaseFactor));
    player.MR = Math.ceil(player.MR * (1 + MrIncreaseFactor));
    player.currentHP = player.HP;
    
    if (["Magician", "Necromancer", "Beastlord"].includes(player.class) && !player.pet) {
      assignPetToPlayer();
    }
    
    let newArea = findAreaForLevel(player.level);
    if (!player.currentArea) {
      appendLog("You enter a new area: " + newArea.name + ".");
      player.currentArea = newArea;
    } else if (newArea.id !== player.currentArea.id) {
      appendLog("You have outgrown your current area and now move to " + newArea.name + ".");
      player.currentArea = newArea;
    } else {
      if (Math.random() < 0.5 && window.gameData && window.gameData.areas) {
        let possibleAreas = window.gameData.areas.filter(area =>
          area.id !== player.currentArea.id &&
          player.level >= area.recommendedLevel &&
          (area.maxLevel === undefined || player.level <= area.maxLevel)
        );
        if (possibleAreas.length > 0) {
          let randomArea = possibleAreas[Math.floor(Math.random() * possibleAreas.length)];
          appendLog("Feeling adventurous, you decide to move to " + randomArea.name + " even though you're still level appropriate for your current area.");
          player.currentArea = randomArea;
        }
      }
    }
    
    updateUI(player, player.equipment, getEquipmentBonuses(player.equipment));
    saveProgress();
  }
}

/****************************
 ********** BOSSES **********
 ****************************/

// Simulate a boss battle
async function simulateBossBattle() {
  console.log("Starting boss battle simulation...");
  // Filter bosses available in the player's current area.
  let validBosses = window.gameData.bosses.filter(boss => boss.area === player.currentArea.id);
  
  // If no boss is defined for the current area, fallback to normal combat.
  if (validBosses.length === 0) {
    //appendLog("No boss is available in this area. Switching to normal combat.");
    await simulateCombat();
    return;
  }
  
  let randomBoss = validBosses[Math.floor(Math.random() * validBosses.length)];

  let currentBoss = {
    name: randomBoss.name,
    level: randomBoss.level,
    HP: randomBoss.HP,
    ATK: randomBoss.ATK,
    DEF: randomBoss.DEF,
    MR: randomBoss.MR,
    xp: randomBoss.xp
  };

  appendLog("<span style='color: #da0000;'><strong>A Boss Encounter!</strong> A fearsome " + currentBoss.name + " (Level " + currentBoss.level + ") appears!</span>");

  player.petDied = false;
  const petAllowed = classesWithPets.includes(player.class);
  if (petAllowed && !player.pet) {
    // Attempt to assign a pet before combat begins.
    assignPetToPlayer();
    console.log("Pet at start of boss combat:", player.pet);
  }

  let activeCombatant;
  if (petAllowed && player.pet && player.pet.currentHP > 0) {
    activeCombatant = player.pet;
  } else {
    activeCombatant = player;
    // For classes that are allowed to have pets but the pet is missing (or dead),
    // you might want to set petDied to true so you know it lost an active pet.
    if (petAllowed && (!player.pet || player.pet.currentHP <= 0)) {
      player.petDied = true;
    }
  }

  // **Phase 1: Pet Combat (if a pet is available)**
  if (petAllowed) {
    while (currentBoss.HP > 0 && player.pet && player.pet.currentHP > 0) {
      let damageDealt = Math.max(Math.floor(player.pet.ATK * (bossCombatConstants.playerDRFactor / (bossCombatConstants.playerDRFactor + currentBoss.DEF))), 1);

      // Check for a crit on player's pet physical attack.
      if (Math.random() < bossCombatConstants.playerPhysicalCritChance) {
        damageDealt = Math.floor(damageDealt * bossCombatConstants.playerPhysicalCritMultiplier);
        appendLog("<span style='color: orange;'>Your pet land a <strong>Critical Hit</strong>!</span>");
      }

      currentBoss.HP -= damageDealt;
      appendLog(player.pet.name + " attacks, dealing " + damageDealt + " damage! Boss HP: " + currentBoss.HP);
      await delay(1000);

      if (currentBoss.HP <= 0) break;

      let damageReceived = Math.max(Math.floor(currentBoss.ATK * (bossCombatConstants.bossDRFactor / (bossCombatConstants.bossDRFactor + player.pet.DEF))), 1);
      
      // Check for a crit on bosses physical attack.
      if (Math.random() < bossCombatConstants.bossPhysicalCritChance) {
        damageReceived = Math.floor(damageReceived * bossCombatConstants.bossPhysicalCritMultiplier);
        appendLog("<span style='color: orange;'>The boss landed a <strong>Critical Spell Hit</strong>!</span>");
      }
      
      player.pet.currentHP -= damageReceived;
      appendLog(currentBoss.name + " attacks for " + damageReceived + " damage. Pet HP: " + player.pet.currentHP);
      await delay(1000);

      updateStatsUI(player, getEquipmentBonuses(player.equipment));

      if (player.pet.currentHP <= 0) {
        appendLog("<span style='color: red;'>Your pet " + player.pet.name + " has fallen!</span>");
        player.petDied = true;
      }
    }
  }

  // **Phase 2: Player Combat (if pet died or there was no pet)**
  if (((petAllowed && player.petDied) || !petAllowed) && player.currentHP > 0) {
    if (petAllowed) {
      appendLog("<span style='color: blue;'>You step forward to fight in place of your pet!</span>");
    } else {
      appendLog("<span style='color: blue;'>You step forward to fight!</span>");
    }
    await delay(1000);

    while (currentBoss.HP > 0 && player.currentHP > 0) {
      // ---- Begin Spell Casting Branch ----
      let availableSpells = getAvailableSpellsForClass(player.class, player.level);
      let chance = spellCastChance[player.class] || 0;
      if (availableSpells.length > 0 && Math.random() < chance / 100) {
        // Cast a spell instead of a physical attack.
        let chosenSpell = availableSpells[Math.floor(Math.random() * availableSpells.length)];
        let damageDealt = calculateSpellDamage(chosenSpell, player, currentBoss);

        // Check for a crit on player's spell attack.
        if (Math.random() < bossCombatConstants.playerSpellCritChance) {
          damageDealt = Math.floor(damageDealt * bossCombatConstants.playerSpellCritMultiplier);
          appendLog("<span style='color: orange;'>You land a <strong>Critical Spell Hit</strong>!</span>");
        }

        currentBoss.HP -= damageDealt;
        appendLog("You cast " + chosenSpell.name + ", dealing " + damageDealt + " magical damage! Boss HP: " + currentBoss.HP);
        await delay(1000);
      
        if (currentBoss.HP <= 0) break;
      
        // Enemy counterattack remains physical.
        let damageReceived = Math.max(Math.floor(currentBoss.ATK * (bossCombatConstants.bossDRFactor / (bossCombatConstants.bossDRFactor + player.DEF))), 1);
    
        // Check for a crit on bosses physical attack.
        if (Math.random() < bossCombatConstants.bossPhysicalCritChance) {
          damageReceived = Math.floor(damageReceived * bossCombatConstants.bossPhysicalCritMultiplier);
          appendLog("<span style='color: orange;'>The boss landed a <strong>Critical Hit</strong>!</span>");
        }

        player.currentHP -= damageReceived;
        appendLog(currentBoss.name + " counterattacks for " + damageReceived + " damage. Your HP: " + player.currentHP);
        await delay(1000);
      
        updateStatsUI(player, getEquipmentBonuses(player.equipment));
      
        // Continue to the next iteration of the loop.
        continue;
      }
      // ---- End Spell Casting Branch ----
    
      // Otherwise, use physical attack.
      let playerDamage = Math.max(Math.floor(player.ATK * (bossCombatConstants.playerDRFactor / (bossCombatConstants.playerDRFactor + currentBoss.DEF))), 1);

      // Check for a crit on player's physical attack.
      if (Math.random() < bossCombatConstants.playerPhysicalCritChance) {
        playerDamage = Math.floor(playerDamage * bossCombatConstants.playerPhysicalCritMultiplier);
        appendLog("<span style='color: orange;'>You land a <strong>Critical Hit</strong>!</span>");
      }

      currentBoss.HP -= playerDamage;
      appendLog("You attack " + currentBoss.name + " dealing " + playerDamage + " damage! Boss HP: " + currentBoss.HP);
      await delay(1000);

      if (currentBoss.HP <= 0) break;

      let bossDamage = Math.max(Math.floor(currentBoss.ATK * (bossCombatConstants.bossDRFactor / (bossCombatConstants.bossDRFactor + player.DEF))), 1);
      
      // Check for a crit on bosses physical attack.
      if (Math.random() < bossCombatConstants.bossPhysicalCritChance) {
        bossDamage = Math.floor(bossDamage * bossCombatConstants.bossPhysicalCritMultiplier);
        appendLog("<span style='color: orange;'>The boss landed a <strong>Critical Hit</strong>!</span>");
      }
      
      player.currentHP -= bossDamage;
      appendLog(currentBoss.name + " attacks for " + bossDamage + " damage. Your HP: " + player.currentHP);
      await delay(1000);

      updateStatsUI(player, getEquipmentBonuses(player.equipment));
    }
  }

  // Final Outcome
  if (currentBoss.HP <= 0) {
    appendLog("<span class='winOutcome'>You have defeated " + currentBoss.name + "!</span>");
    addXP(currentBoss.xp);

    // Process boss drop:
    // Retrieve drop IDs from the original boss object (randomBoss)
    const dropIds = [randomBoss.drop1, randomBoss.drop2, randomBoss.drop3];
    const selectedDropId = dropIds[Math.floor(Math.random() * dropIds.length)];

    let bossDropItems = window.gameData.items.filter(item => parseInt(item.id) === parseInt(selectedDropId));
    if (bossDropItems.length > 0) {
      let bossDrop = bossDropItems[0];
      // Option 1: Equip the drop if it's better.
      equipIfBetter(bossDrop, bossDrop.slot, player.equipment);
      // Option 2: Alternatively, you might notify the player that they've received this item.
      appendLog("The boss dropped " + getItemDisplayName(bossDrop) + "!");
    } else {
      appendLog("The boss did not drop any recognizable items.");
    }

    // Heal the player fully between fights.
    player.currentHP = player.HP;
    appendLog("<span style='color: green;'>You feel rejuvenated and fully healed!</span>");
  
    if (petAllowed && player.petDied) {
      appendLog("<span style='color: green;'>You recover and summon a new pet!</span>");
      assignPetToPlayer();
    }
  } else {
    appendLog("<span class='loseOutcome'>You were defeated by " + currentBoss.name + ".</span>");
    player.currentHP = 0;
    player.xp = Math.floor(player.xp * bossCombatConstants.playerXPLoss);
  }

  updateUI(player, player.equipment, getEquipmentBonuses());
  saveProgress();

  // Post-Battle Recovery
  if (player.currentHP <= 0) {
    appendLog("<span style='color: red;'>You were defeated!</span>");
    await delay(1000);

    if (petAllowed && player.petDied) {
    appendLog("<span style='color: green;'>You recover and summon a new pet!</span>");
    assignPetToPlayer();
    await delay(1000);
    }

    player.currentHP = Math.floor(player.HP * bossCombatConstants.playerHPRecovery);
    updateStatsUI(player, getEquipmentBonuses(player.equipment));

    appendLog("<span style='color: blue;'>You prepare for the next battle.</span>");
    updateUI(player, player.equipment, getEquipmentBonuses());
    saveProgress();
  }
} // END BOSS BATTLE SIMULATION

/*****************************
 ********** ENEMIES **********
 *****************************/

// Automated Combat Simulation (async version) with pet mechanics
async function simulateCombat() {
  console.log("Starting combat simulation...");
  // Filter enemies based on the desired range: [player.level - 1, player.level + 2]
  let validEnemies = window.gameData.enemies.filter(enemy => {
    const desiredMin = player.level - 1;
    const desiredMax = player.level + 2;
    const effectiveMin = Math.max(enemy.minLevel, desiredMin);
    const effectiveMax = Math.min(enemy.maxLevel, desiredMax, player.currentArea.maxLevel);
    return (effectiveMin <= effectiveMax) && enemy.allowedAreas.includes(player.currentArea.id);
  });

  // Fallback: If no enemy passes the area+level filter, fallback to level-only check.
  if (validEnemies.length === 0) {
    validEnemies = window.gameData.enemies.filter(enemy => {
      const desiredMin = player.level - 1;
      const desiredMax = player.level + 2;
      const effectiveMin = Math.max(enemy.minLevel, desiredMin);
      const effectiveMax = Math.min(enemy.maxLevel, desiredMax);
      return effectiveMin <= effectiveMax;
    });
  }

  // Make sure to declare a variable for the selected enemy.
  let selectedEnemy = validEnemies[Math.floor(Math.random() * validEnemies.length)];

  // Determine effective min and max enemy levels.
  const desiredMin = player.level - 1;
  const desiredMax = player.level + 2;
  let effectiveMin = Math.max(selectedEnemy.minLevel, desiredMin);
  let effectiveMax = Math.min(selectedEnemy.maxLevel, desiredMax, player.currentArea.maxLevel);

  // Build an array of candidate levels based on the effective range.
  let candidateLevels = [];
  for (let L = effectiveMin; L <= effectiveMax; L++) {
    candidateLevels.push(L);
  }

  // Define weights for each candidate level.
  let weights = [];
  let totalWeight = 0;
  candidateLevels.forEach(L => {
    let d = L - player.level;
    let weight;
    if (d <= 0) {
      weight = 1.0;  // Full weight for same level or lower.
    } else if (d === 1) {
      weight = 0.5; // Slightly lower chance for 1 level above.
    } else if (d === 2) {
      weight = 0.15;  // Even lower chance for 2 levels above.
    } else {
      weight = 0.25 / d; // Fallback.
    }
    totalWeight += weight;
    weights.push(weight);
  });

  // Pick a random level based on the weights.
  let rand = Math.random() * totalWeight;
  let enemyLevel;
  let cumulative = 0;
  for (let i = 0; i < candidateLevels.length; i++) {
    cumulative += weights[i];
    if (rand < cumulative) {
      enemyLevel = candidateLevels[i];
      break;
    }
  }

  // Create a scaled copy of the enemy.
  let currentEnemy = {
    name: selectedEnemy.name,
    level: enemyLevel,
    HP: selectedEnemy.HP + (enemyLevel - selectedEnemy.minLevel) * 25,  // Adds 25 HP per level over mob's base
    ATK: selectedEnemy.ATK + (enemyLevel - selectedEnemy.minLevel) * 5, // Adds 4 ATK per level over mob's base
    DEF: selectedEnemy.DEF + (enemyLevel - selectedEnemy.minLevel) * 2, // Adds 2 DEF per level over mob's base
    MR: selectedEnemy.MR + (enemyLevel - selectedEnemy.minLevel) * 0, // Adds 0 MR per level over mob's base
    xp: selectedEnemy.xp + (enemyLevel - selectedEnemy.minLevel) * 50  // Adds 50 xp per level over mob's base
  };

  // Customize enemy appearance message based on level difference with player.
  let enemyMessage = "";
  if (currentEnemy.level < player.level) {
    enemyMessage = "<span style='color: #b5b5b5;'>A wild " + currentEnemy.name + " (Level " + currentEnemy.level + ") appears!</span>";
  } else if (currentEnemy.level === player.level) {
    enemyMessage = "A threatening " + currentEnemy.name + " (Level " + currentEnemy.level + ") appears!";
  } else if (currentEnemy.level === player.level + 1) {
    enemyMessage = "<span style='color: #ffcd33;'>A formidable " + currentEnemy.name + " (Level " + currentEnemy.level + ") appears!</span>";
  } else if (currentEnemy.level > player.level + 1) {
    enemyMessage = "<span style='color: #da0000;'>A fearsome " + currentEnemy.name + " (Level " + currentEnemy.level + ") looms ahead!</span>";
  }

  appendLog(enemyMessage);

  // Determine active combatant.
  // If a pet exists and is alive, let it fight; otherwise, use the player.
  player.petDied = false;
  const petAllowed = classesWithPets.includes(player.class);
  if (petAllowed && !player.pet) {
    // Attempt to assign a pet before combat begins.
    assignPetToPlayer();
    console.log("Pet at start of combat:", player.pet);
  }

  let activeCombatant;
  if (petAllowed && player.pet && player.pet.currentHP > 0) {
    activeCombatant = player.pet;
  } else {
    activeCombatant = player;
    // If the class can have a pet but there's none, you might set petDied to true if you want to trigger pet summon messages.
    if (petAllowed && (!player.pet || player.pet.currentHP <= 0)) {
      player.petDied = true;
    }
  }

  // Main combat loop:
  while (
    currentEnemy.HP > 0 &&
    ((activeCombatant === player && player.currentHP > 0) ||
     (activeCombatant !== player && activeCombatant.HP > 0))
  ) {
    let attackerName, attackerATK, currentHealth;
  
    if (activeCombatant === player) {
      attackerName = player.name;
      // Check if the player is allowed to cast spells.
      let availableSpells = getAvailableSpellsForClass(player.class, player.level);
      let chance = spellCastChance[player.class] || 0;
      if (availableSpells.length > 0 && Math.random() < chance / 100) {
        // Cast a spell instead of a physical attack.
        let chosenSpell = availableSpells[Math.floor(Math.random() * availableSpells.length)];
        let damageDealt = calculateSpellDamage(chosenSpell, player, currentEnemy);

        // Check for a crit on player's spell attack.
        if (Math.random() < enemyCombatConstants.playerSpellCritChance) {
          damageDealt = Math.floor(damageDealt * enemyCombatConstants.playerSpellCritMultiplier);
          appendLog("<span style='color: orange;'>You land a <strong>Critical Spell Hit</strong>!</span>");
        }

        currentEnemy.HP -= damageDealt;
        appendLog("You cast " + chosenSpell.name + ", dealing " + damageDealt + " magical damage! Enemy HP: " + currentEnemy.HP);
        await delay(1000);
        if (currentEnemy.HP <= 0) break;
        
        // Enemy counterattack remains physical.
        let damageReceived = Math.max(Math.floor(currentEnemy.ATK * (enemyCombatConstants.enemyDRFactor / (enemyCombatConstants.enemyDRFactor + player.DEF))), 1);

        // Check for a crit on enemy's physical attack.
        if (Math.random() < enemyCombatConstants.enemyPhysicalCritChance) {
          damageReceived = Math.floor(damageReceived * enemyCombatConstants.enemyPhysicalCritMultiplier);
          appendLog("<span style='color: orange;'>The Enemy lands a <strong>Critical Hit</strong>!</span>");
        }

        player.currentHP -= damageReceived;
        currentHealth = player.currentHP;
        appendLog(currentEnemy.name + " counterattacks for " + damageReceived + " damage. Your HP: " + currentHealth);
        await delay(1000);
        
        updateStatsUI(player, getEquipmentBonuses(player.equipment));
        continue; // Proceed to the next loop iteration.
      } else {
        // Otherwise, use physical attack.
        attackerATK = player.ATK;
      }
    } else {
      // Pet's turn (we already assume pet uses physical attacks).
      attackerName = player.pet.name;
      attackerATK = player.pet.ATK;
    }
    
    // If no spell was cast, do the physical attack:
    let damageDealt = Math.max(Math.floor(attackerATK * (enemyCombatConstants.playerDRFactor / (enemyCombatConstants.playerDRFactor + currentEnemy.DEF))), 1);
    
    // Check for a crit in player's physical attack.
    if (Math.random() < enemyCombatConstants.playerPhysicalCritChance) {
      damageDealt = Math.floor(damageDealt * enemyCombatConstants.playerPhysicalCritMultiplier);
      appendLog("<span style='color: orange;'>You land a <strong>Critical Hit</strong>!</span>");
    }
    
    currentEnemy.HP -= damageDealt;
    appendLog(attackerName + " attacks, dealing " + damageDealt + " damage! Enemy HP: " + currentEnemy.HP);
    await delay(1000);
    
    if (currentEnemy.HP <= 0) break;
    
    // Enemy counterattack.
    let defenderDEF = (activeCombatant === player) ? player.DEF : player.pet.DEF;
    let damageReceived = Math.max(Math.floor(currentEnemy.ATK * (enemyCombatConstants.enemyDRFactor / (enemyCombatConstants.enemyDRFactor + defenderDEF))), 1);

    // Check for a crit on enemy's physical attack.
    if (Math.random() < enemyCombatConstants.enemyPhysicalCritChance) {
      damageReceived = Math.floor(damageReceived * enemyCombatConstants.enemyPhysicalCritMultiplier);
      appendLog("<span style='color: orange;'>The Enemy lands a <strong>Critical Hit</strong>!</span>");
    }

    if (activeCombatant === player) {
      player.currentHP -= damageReceived;
      currentHealth = player.currentHP;
    } else {
      player.pet.currentHP -= damageReceived;
      currentHealth = player.pet.currentHP;
    }
    
    appendLog(currentEnemy.name + " attacks for " + damageReceived + " damage. " + attackerName + " HP: " + currentHealth);
    await delay(1000);
    
    updateStatsUI(player, getEquipmentBonuses(player.equipment));
    
    // Switch from pet to player if needed.
    if (activeCombatant !== player && player.pet.currentHP <= 0 && !player.petDied) {
      appendLog("<span style='color: red;'>Your pet " + player.pet.name + " has fallen!</span>");
      player.petDied = true;
      activeCombatant = player;
      if (player.currentHP > 0) {
        appendLog("<span style='color: blue;'>You step forward to fight in place of your pet!</span>");
      }
    }
  }

  // Determine battle outcome.
  if (currentEnemy.HP <= 0) {
    appendLog("<span class='winOutcome'>You defeated " + currentEnemy.name + "!</span>");
    addXP(currentEnemy.xp);
    console.log("Player stats after combat:", player);

    // Heal the player fully between fights.
    player.currentHP = player.HP;
    appendLog("<span style='color: green;'>You feel rejuvenated and fully healed!</span>");
  
    // If a pet died during combat, grant a new pet before next battle.
    if (petAllowed && player.petDied) {
      appendLog("<span style='color: green;'>You recover and summon a new pet!</span>");
      assignPetToPlayer();
    }
  } else if (petAllowed && player.petDied && player.currentHP <= 0) {
    appendLog("<span class='loseOutcome'>You were defeated by " + currentEnemy.name + ".</span>");
    player.currentHP = player.HP;
    player.xp = Math.floor(player.xp * enemyCombatConstants.playerXPLoss);
    assignPetToPlayer();
  } else {
    appendLog("<span class='loseOutcome'>You were defeated by " + currentEnemy.name + ".</span>");
    player.currentHP = player.HP;
    player.xp = Math.floor(player.xp * enemyCombatConstants.playerXPLoss);
  }

  // Equipment drop chance.
  if (Math.random() < enemyCombatConstants.equipDropChance) { // 10% chance for an item drop
    let validItems = window.gameData.items.filter(item =>
      item.level <= player.currentArea.maxItemLevel &&
      parseInt(item.id) <= 4999   // Items above 5000 are reserved for boss loot
    );

  if (validItems.length > 0) {
    let randomItem = validItems[Math.floor(Math.random() * validItems.length)];
    equipIfBetter(randomItem, randomItem.slot, player.equipment);
    }
      
    updateUI(player, player.equipment, getEquipmentBonuses());
    saveProgress();
    } else {
    updateUI(player, player.equipment, getEquipmentBonuses());
    saveProgress();
  }
}

// Game Loop
export async function startGameLoop() {
  gameRunning = true;
  console.log("Game loop started!");
  while (gameRunning) {
    // 2% chance to encounter a boss (0.02 probability)
    if (Math.random() < bossCombatConstants.bossEncChance) {
      await simulateBossBattle();
    } else {
      await simulateCombat();
    }
    await delay(500);  // Pause before starting the next combat
  }
}

// function to stop the game.
export function stopGameLoop() {
  gameRunning = false;
}
