/**********************************************************************************
 * combat.js
 * Contains combat simulation functions, XP/level mechanics, and save/load progress.
 **********************************************************************************/

import { delay, randomizeDamage, getEffectiveMR, checkMilestones, scaleGenericEnemy, calculatePhysicalDamage, calculateSpellDamage } from "./utils.js";
import { appendLog, updateUI, updateStatsUI, updateAreaInfo, getItemDisplayName } from "./ui.js";
import { equipIfBetter, getEquipmentBonuses, assignPetToPlayer } from "./equipment.js";
import { player } from "./character.js";
import { spellCastChance, classesWithPets, enemyCombatConstants, bossCombatConstants, dmgModifiers, playerXpScaling, playerScalingSet1, playerScalingSet2 } from "./constants.js";

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

    // Ensure milestones is always an array
    player.milestones = player.milestones || [];
    player.enemyKills = player.enemyKills || 0;
    player.bossKills = player.bossKills || 0;

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

// XP & Level-Up Mechanics.
export function addXP(amount) {
  player.xp += amount;
  appendLog("<span style='color: yellow;'>You gained " + amount + " XP.</span>");
  
  while (player.xp >= player.xpNeeded && player.level < 100) {
    player.xp -= player.xpNeeded;
    player.level++;
    appendLog("<span style='color: blue;'>Level Up! You are now level " + player.level + ".</span>");
    checkMilestones("level", player.level);
    player.xpNeeded = Math.floor(1000 * Math.pow(player.level, playerXpScaling));

    // Choose scaling set based on level
    const scaling = player.level <= 50 ? playerScalingSet1 : playerScalingSet2;

    player.HP = Math.floor(player.HP * (scaling.hpIncreaseFactor));
    player.ATK = Math.ceil(player.ATK * (scaling.AtkIncreaseFactor));
    player.DEF = Math.ceil(player.DEF * (scaling.DefIncreaseFactor));
    player.MAG = Math.ceil(player.MAG * (scaling.MagIncreaseFactor));
    player.MR = Math.ceil(player.MR * (scaling.MrIncreaseFactor));
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
    maxHP: randomBoss.HP,
    ATK: randomBoss.ATK,
    DEF: randomBoss.DEF,
    MR: randomBoss.MR,
    xp: randomBoss.xp,
    isBoss: true
  };

  appendLog("<span style='color: #da0000;'><strong>A Boss Encounter!</strong> A fearsome " + currentBoss.name + " (Level " + currentBoss.level + ") appears!</span>");

  // Get equipment bonuses for the player.
  const equipmentBonuses = getEquipmentBonuses(player.equipment);
  const effectiveATK = player.ATK + equipmentBonuses.bonusATK;
  const effectiveDEF = player.DEF + equipmentBonuses.bonusDEF;
  const effectiveMAG = player.MAG + equipmentBonuses.bonusMAG;
  const effectiveMR = player.MR + equipmentBonuses.bonusMR;

  player.petDied = false;
  const petAllowed = classesWithPets.includes(player.class);
  if (petAllowed && !player.pet) {
    // Attempt to assign a pet before combat begins.
    assignPetToPlayer();
  }

  let activeCombatant;
  if (petAllowed && player.pet && player.pet.currentHP > 0) {
    activeCombatant = player.pet;
    player.pet.maxHP = player.pet.currentHP;
  } else {
    activeCombatant = player;
    player.maxHP = player.currentHP;

    // For classes that are allowed to have pets but the pet is missing (or dead),
    // you might want to set petDied to true so you know it lost an active pet.
    if (petAllowed && (!player.pet || player.pet.currentHP <= 0)) {
      player.petDied = true;
    }
  }

  // **Phase 1: Pet Combat (if a pet is available)**
  if (petAllowed) {
    let petIterations = 0;
    const maxPetIterations = 150;

    while (currentBoss.HP > 0 && player.pet && player.pet.currentHP > 0) {

      // FAILSAFE for long running combat loops.
      petIterations++;
      if (petIterations > maxPetIterations) {
        appendLog("<span style='color: red;'>Combat aborted: too many rounds (possible bug or infinite loop).</span>");
        console.error("Combat loop exceeded max iterations. Aborting to prevent infinite loop.");
      break;
      }

      let damageDealt = calculatePhysicalDamage(activeCombatant, currentBoss);

      // Check for a crit on player's pet physical attack.
      if (Math.random() < bossCombatConstants.playerPhysicalCritChance) {
        damageDealt = Math.floor(damageDealt * bossCombatConstants.playerPhysicalCritMultiplier);
        appendLog("<span style='color: orange;'>Your pet land a <strong>Critical Hit</strong>!</span>");
      }

      damageDealt = randomizeDamage(damageDealt);
      currentBoss.HP -= damageDealt;
      appendLog(player.pet.name + " attacks, dealing " + damageDealt + " damage! Boss HP: " + currentBoss.HP);
      await delay(1000);

      if (currentBoss.HP <= 0) break;

        console.log("Boss ATK" + currentBoss.ATK + " | DEF: " + effectiveDEF + " isBoss: " + currentBoss.isBoss);
      let damageReceived = calculatePhysicalDamage(currentBoss, activeCombatant);

      // Check for a crit on bosses physical attack.
      if (Math.random() < bossCombatConstants.bossPhysicalCritChance) {
        damageReceived = Math.floor(damageReceived * bossCombatConstants.bossPhysicalCritMultiplier);
        appendLog("<span style='color: orange;'>The boss landed a <strong>Critical Spell Hit</strong>!</span>");
      }
      
      damageReceived = randomizeDamage(damageReceived);
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

    // FAILSAFE for long running combat loops.
    let playerIterations = 0;
    const maxPlayerIterations = 150;

    while (currentBoss.HP > 0 && player.currentHP > 0) {

      // FAILSAFE for long running combat loops.
      playerIterations++;
      if (playerIterations > maxPlayerIterations) {
        appendLog("<span style='color: red;'>Boss combat aborted: too many rounds (possible bug or infinite loop).</span>");
        console.error("Boss combat loop exceeded max iterations. Aborting.");
      break;
      }

      // ---- Begin Spell Casting Branch ----
      if (!player.spellCooldown || player.spellCooldown <= 0) {
        let availableSpells = getAvailableSpellsForClass(player.class, player.level);
        let chance = spellCastChance[player.class] || 0;
        if (availableSpells.length > 0 && Math.random() < chance / 100) {
          // Cast a spell instead of a physical attack.
          let chosenSpell = availableSpells[Math.floor(Math.random() * availableSpells.length)];
          // Set cooldown if spells baseDamage >= 1001
          if (chosenSpell.baseDamage >= dmgModifiers.spellCDThreshold) {
            player.spellCooldown = Math.max(1, Math.ceil(chosenSpell.baseDamage / dmgModifiers.spellCD));
          }

          let damageDealt = calculateSpellDamage(player, currentBoss, chosenSpell);

        // Check for a crit on player's spell attack.
        if (Math.random() < bossCombatConstants.playerSpellCritChance) {
          damageDealt = Math.floor(damageDealt * bossCombatConstants.playerSpellCritMultiplier);
          appendLog("<span style='color: orange;'>You land a <strong>Critical Spell Hit</strong>!</span>");
        }

        damageDealt = randomizeDamage(damageDealt);
        currentBoss.HP -= damageDealt;
        appendLog("You cast " + chosenSpell.name + ", dealing " + damageDealt + " magical damage! Boss HP: " + currentBoss.HP);
        await delay(1000);
      
        if (currentBoss.HP <= 0) break;
      
        // Enemy counterattack remains physical.
          console.log("Boss ATK" + currentBoss.ATK + " | DEF: " + effectiveDEF + " isBoss: " + currentBoss.isBoss);
        let damageReceived = calculatePhysicalDamage(currentBoss, activeCombatant);
 
        // Check for a crit on bosses physical attack.
        if (Math.random() < bossCombatConstants.bossPhysicalCritChance) {
          damageReceived = Math.floor(damageReceived * bossCombatConstants.bossPhysicalCritMultiplier);
          appendLog("<span style='color: orange;'>The boss landed a <strong>Critical Hit</strong>!</span>");
        }

        damageReceived = randomizeDamage(damageReceived);
        player.currentHP -= damageReceived;
          console.log("Boss ATK: " + currentBoss.ATK + " | Player DEF: " + effectiveDEF + " | Damage Received: " + damageReceived + " isBoss: " + currentBoss.isBoss);
        appendLog(currentBoss.name + " counterattacks for " + damageReceived + " damage. Your HP: " + player.currentHP);
        await delay(1000);
      
        updateStatsUI(player, getEquipmentBonuses(player.equipment));
      
        // Continue to the next iteration of the loop.
        continue;
      }
      // ---- End Spell Casting Branch ----
    
      // Otherwise, use physical attack.
      let playerDamage = calculatePhysicalDamage(activeCombatant, currentBoss);

      // Check for a crit on player's physical attack.
      if (Math.random() < bossCombatConstants.playerPhysicalCritChance) {
        playerDamage = Math.floor(playerDamage * bossCombatConstants.playerPhysicalCritMultiplier);
        appendLog("<span style='color: orange;'>You land a <strong>Critical Hit</strong>!</span>");
      }

      playerDamage = randomizeDamage(playerDamage);
      currentBoss.HP -= playerDamage;
      appendLog("You attack " + currentBoss.name + " dealing " + playerDamage + " damage! Boss HP: " + currentBoss.HP);
      await delay(1000);

      if (currentBoss.HP <= 0) break;

        console.log("Boss ATK" + currentBoss.ATK + " | DEF: " + effectiveDEF + " isBoss: " + currentBoss.isBoss);
      let bossDamage = calculatePhysicalDamage(currentBoss, activeCombatant);

      // Check for a crit on bosses physical attack.
      if (Math.random() < bossCombatConstants.bossPhysicalCritChance) {
        bossDamage = Math.floor(bossDamage * bossCombatConstants.bossPhysicalCritMultiplier);
        appendLog("<span style='color: orange;'>The boss landed a <strong>Critical Hit</strong>!</span>");
      }
      
      bossDamage = randomizeDamage(bossDamage);
      player.currentHP -= bossDamage;
      appendLog(currentBoss.name + " attacks for " + bossDamage + " damage. Your HP: " + player.currentHP);
      await delay(1000);

      updateStatsUI(player, getEquipmentBonuses(player.equipment));

      // At the end of the player's turn, decrement cooldown if active
      if (player.spellCooldown && player.spellCooldown > 0) {
      player.spellCooldown--;
      }
    }
  }
}

  // Final Outcome
  if (currentBoss.HP <= 0) {
    appendLog("<span class='winOutcome'>You have defeated " + currentBoss.name + "!</span>");
    addXP(currentBoss.xp);
    player.bossKills++;
    checkMilestones("bossKill", player.bossKills);

    // At the end of fight, reset spell cooldown if it was active.
    if (player.spellCooldown && player.spellCooldown > 0) {
      player.spellCooldown = 0;
    }

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
      assignPetToPlayer();
      if (player.pet) {
        appendLog("<span style='color: green;'>You recover and summon a new pet!</span>");
        updateStatsUI(player, getEquipmentBonuses(player.equipment)); // Update pet stat display
      } else {
        // Do nothing
      }
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

    // At the end of fight, reset spell cooldown if it was active.
    if (player.spellCooldown && player.spellCooldown > 0) {
      player.spellCooldown = 0;
    }

    if (petAllowed && player.petDied) {
      assignPetToPlayer();
      await delay(1000);
      if (player.pet) {
        appendLog("<span style='color: green;'>You recover and summon a new pet!</span>");
      } else {
        // Do nothing
      }
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
  // Filter enemies based on the desired range: [player.level - 1, player.level + 2]
  let validEnemies = window.gameData.enemies.filter(enemy => {
    const desiredMin = player.level - 1;
    const desiredMax = player.level + 2;
    const effectiveMin = Math.max(enemy.minLevel, desiredMin);
    const effectiveMax = Math.min(enemy.maxLevel, desiredMax, player.currentArea.maxLevel);
    return (effectiveMin <= effectiveMax) && enemy.allowedAreas.some(areaId => areaId == player.currentArea.id); 
  });

  let currentEnemy;

  // Fallback: If no enemy passes the area+level filter, fallback to area-only check (not level-only)
  if (validEnemies.length === 0) {
    // Level 1 base stats for the generic enemy
    const baseEnemy = {
      id: "99999",
      name: "a wandering raider",
      minLevel: 1,
      maxLevel: 1,
      HP: 100,      // Level 1 HP
      ATK: 6,     // Level 1 ATK
      DEF: 5,     // Level 1 DEF
      MR: 0,       // Level 1 MR
      xp: 100,      // Level 1 XP
      allowedAreas: [player.currentArea.id]
    };

    // we determine the enemy level based on player's current level.
    const minLevel = Math.max(1, player.level - 1);
    const maxLevel = player.level + 2;
    // Randomly choose an enemy level between minEnemyLevel and maxEnemyLevel.
    const enemyLevel = Math.floor(Math.random() * (maxLevel - minLevel + 1)) + minLevel;
  
    // Scale the fallback enemy's base stats according to the chosen level
    let hpScale, atkScale, defScale;
      if (enemyLevel <= 50) {
      hpScale = 1.055;
      atkScale = 1.04;
      defScale = 1.04;
    } else {
      hpScale = 1.065;
      atkScale = 1.06;
      defScale = 1.06;
    }

    // Now scale the enemy from level 1 up to enemyLevel.
    const scaledEnemy = scaleGenericEnemy(baseEnemy, enemyLevel, hpScale, atkScale, defScale);
    scaledEnemy.maxHP = scaledEnemy.HP; // Store maxHP for damage calculations

    currentEnemy = scaledEnemy;
  } else {

    // Make sure to declare a variable for the selected enemy.
    let selectedEnemy = validEnemies[Math.floor(Math.random() * validEnemies.length)];

    // Determine effective min and max enemy levels.
    const desiredMin = Number(player.level - 1);
    const desiredMax = Number(player.level + 2);
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

    // Choose scaling factors based on enemy level
    let hpScale, atkScale, defScale;
      if (enemyLevel <= 50) {
      hpScale = 1.055;
      atkScale = 1.04;
      defScale = 1.04;
    } else {
      hpScale = 1.065;
      atkScale = 1.06;
      defScale = 1.06;
    }

    // Create a scaled copy of the normal enemy.
    currentEnemy = {
      name: selectedEnemy.name,
      level: enemyLevel,
      HP: Math.ceil(selectedEnemy.HP * hpScale),
      ATK: Math.ceil(selectedEnemy.ATK * atkScale),
      DEF: Math.ceil(selectedEnemy.DEF * defScale),
      MR: selectedEnemy.MR + (enemyLevel - selectedEnemy.minLevel) * 0, // Adds 0 MR per level over mob's base
      xp: selectedEnemy.xp + (enemyLevel - selectedEnemy.minLevel) * 50  // Adds 50 xp per level over mob's base
      };

    // Set the enemy's maxHP based on its scaled HP.
    currentEnemy.maxHP = currentEnemy.HP;
    console.log("Selected enemy:", currentEnemy.name, "Level:", currentEnemy.level, "maxHP:", currentEnemy.maxHP, "HP:", currentEnemy.HP, "ATK:", currentEnemy.ATK, "DEF:", currentEnemy.DEF, "MR:", currentEnemy.MR, "XP:", currentEnemy.xp);
  }

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
  }

  // Get equipment bonuses for the player.
  const equipmentBonuses = getEquipmentBonuses(player.equipment);
  const effectiveATK = player.ATK + equipmentBonuses.bonusATK;
  const effectiveDEF = player.DEF + equipmentBonuses.bonusDEF;
  const effectiveMAG = player.MAG + equipmentBonuses.bonusMAG;
  const effectiveMR = player.MR + equipmentBonuses.bonusMR;

  let activeCombatant;
  if (petAllowed && player.pet && player.pet.currentHP > 0) {
    activeCombatant = player.pet;
    player.pet.maxHP = player.pet.currentHP;
  } else {
    activeCombatant = player;
    player.maxHP = player.currentHP;
    // If the class can have a pet but there's none, you might set petDied to true if you want to trigger pet summon messages.
    if (petAllowed && (!player.pet || player.pet.currentHP <= 0)) {
      player.petDied = true;
    }
  }

  // FAILSAFE for long running combat loops.
  let iterations = 0;
  const maxIterations = 150; // Adjust as needed

  // Main combat loop:
  while (
    currentEnemy.HP > 0 &&
    ((activeCombatant === player && player.currentHP > 0) ||
     (activeCombatant !== player && activeCombatant.HP > 0))
  ) {

    // FAILSAFE for long running combat loops.
    iterations++;
    if (iterations > maxIterations) {
      appendLog("<span style='color: red;'>Combat aborted: too many rounds (possible bug or infinite loop).</span>");
      console.error("Combat loop exceeded max iterations. Aborting to prevent infinite loop.");
    break;
    }

    let attackerName, attackerATK, currentHealth;

    if (activeCombatant === player) {
      attackerName = player.name;
      // Check if the player is allowed to cast spells.
      if (!player.spellCooldown || player.spellCooldown <= 0) {
        let availableSpells = getAvailableSpellsForClass(player.class, player.level);
        let chance = spellCastChance[player.class] || 0; 
        if (availableSpells.length > 0 && Math.random() < chance / 100) {
          // Cast a spell instead of a physical attack.
          let chosenSpell = availableSpells[Math.floor(Math.random() * availableSpells.length)];

          // Set cooldown if spell's baseDamage >= threshold
          if (chosenSpell.baseDamage >= dmgModifiers.spellCDThreshold) {
            player.spellCooldown = Math.max(1, Math.ceil(chosenSpell.baseDamage / dmgModifiers.spellCD));
          }

          let damageDealt = calculateSpellDamage(player, currentEnemy, chosenSpell);

          // Check for a crit on player's spell attack.
          if (Math.random() < enemyCombatConstants.playerSpellCritChance) {
            damageDealt = Math.floor(damageDealt * enemyCombatConstants.playerSpellCritMultiplier);
            appendLog("<span style='color: orange;'>You land a <strong>Critical Spell Hit</strong>!</span>");
          }

          damageDealt = randomizeDamage(damageDealt);
          currentEnemy.HP -= damageDealt;
          appendLog("You cast " + chosenSpell.name + ", dealing " + damageDealt + " magical damage! Enemy HP: " + currentEnemy.HP);
          await delay(1000);
          if (currentEnemy.HP <= 0) break;
        
          // Enemy counterattack remains physical.
          let damageReceived = calculatePhysicalDamage(currentEnemy, activeCombatant);
            console.log(activeCombatant.name, "counterattack damage:", damageReceived); // DEV DEBUG

          // Check for a crit on enemy's physical attack.
          if (Math.random() < enemyCombatConstants.enemyPhysicalCritChance) {
            damageReceived = Math.floor(damageReceived * enemyCombatConstants.enemyPhysicalCritMultiplier);
            appendLog("<span style='color: orange;'>The Enemy lands a <strong>Critical Hit</strong>!</span>");
          }

          damageReceived = randomizeDamage(damageReceived);
          player.currentHP -= damageReceived;
          currentHealth = player.currentHP;
            console.log("Player HP after counterattack:", currentHealth); // DEV DEBUG
          appendLog(currentEnemy.name + " counterattacks for " + damageReceived + " damage. Your HP: " + currentHealth);
          await delay(1000);
        
          updateStatsUI(player, getEquipmentBonuses(player.equipment));
          continue; // Proceed to the next loop iteration.

        } else {
          // Otherwise, use physical attack.
          attackerATK = effectiveATK;
        }
      } else {
        // On cooldown, must set attackerATK for physical attack!
        attackerATK = effectiveATK;
      }
    } else {
      // Pet's turn (we already assume pet uses physical attacks).
      attackerName = player.pet.name;

      // Defensive check for pet stats.
      if (player.pet && (isNaN(player.pet.currentHP) || isNaN(player.pet.ATK))) {
      console.error("Pet stats are invalid!", player.pet);
      }

      attackerATK = player.pet.ATK;
    }
    
    // If no spell was cast, do the physical attack:
    let damageDealt = calculatePhysicalDamage(activeCombatant, currentEnemy);

    // Check for a crit in player's physical attack.
    if (Math.random() < enemyCombatConstants.playerPhysicalCritChance) {
      damageDealt = Math.floor(damageDealt * enemyCombatConstants.playerPhysicalCritMultiplier);
      appendLog("<span style='color: orange;'>You land a <strong>Critical Hit</strong>!</span>");
    }
    
    damageDealt = randomizeDamage(damageDealt);
    currentEnemy.HP -= damageDealt;
    appendLog(attackerName + " attacks, dealing " + damageDealt + " damage! Enemy HP: " + currentEnemy.HP);
    await delay(1000);
    
    if (currentEnemy.HP <= 0) break;
    
    // Enemy counterattack.
    let damageReceived = calculatePhysicalDamage(currentEnemy, activeCombatant);

    // Check for a crit on enemy's physical attack.
    if (Math.random() < enemyCombatConstants.enemyPhysicalCritChance) {
      damageReceived = Math.floor(damageReceived * enemyCombatConstants.enemyPhysicalCritMultiplier);
      appendLog("<span style='color: orange;'>The Enemy lands a <strong>Critical Hit</strong>!</span>");
    }

    if (activeCombatant === player) {
      damageReceived = randomizeDamage(damageReceived);
      player.currentHP -= damageReceived;
      currentHealth = player.currentHP;
    } else {
      damageReceived = randomizeDamage(damageReceived);
      player.pet.currentHP -= damageReceived;
      currentHealth = player.pet.currentHP;
    }
    
    appendLog(currentEnemy.name + " attacks for " + damageReceived + " damage. " + attackerName + " HP: " + currentHealth);
    await delay(1000);

    // At the end of the player's turn, decrement cooldown if active
    if (player.spellCooldown && player.spellCooldown > 0) {
      player.spellCooldown--;
    }
    
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
    player.enemyKills++;
    checkMilestones("kill", player.enemyKills);

    // At the end of fight, reset spell cooldown if it was active.
    if (player.spellCooldown && player.spellCooldown > 0) {
      player.spellCooldown = 0;
    }

    // Heal the player fully between fights.
    player.currentHP = player.HP;
    appendLog("<span style='color: green;'>You feel rejuvenated and fully healed!</span>");
    updateStatsUI(player, getEquipmentBonuses(player.equipment));
  
    // If a pet died during combat, grant a new pet before next battle.
    if (petAllowed && player.petDied) {
      assignPetToPlayer();
      if (player.pet) {
        appendLog("<span style='color: green;'>You recover and summon a new pet!</span>");
        updateStatsUI(player, getEquipmentBonuses(player.equipment)); // Update pet stat display
      } else {
        // Do nothing
      }
    }

  } else if (petAllowed && player.petDied && player.currentHP <= 0) {
    appendLog("<span class='loseOutcome'>You were defeated by " + currentEnemy.name + ".</span>");
    player.currentHP = player.HP;
    player.xp = Math.floor(player.xp * enemyCombatConstants.playerXPLoss);

    // At the end of fight, reset spell cooldown if it was active.
    if (player.spellCooldown && player.spellCooldown > 0) {
      player.spellCooldown = 0;
    }

    assignPetToPlayer();
  } else {
    appendLog("<span class='loseOutcome'>You were defeated by " + currentEnemy.name + ".</span>");
    player.currentHP = player.HP;
    player.xp = Math.floor(player.xp * enemyCombatConstants.playerXPLoss);

    // At the end of fight, reset spell cooldown if it was active.
    if (player.spellCooldown && player.spellCooldown > 0) {
      player.spellCooldown = 0;
    }
  }

  // Equipment drop chance.
  if (Math.random() < enemyCombatConstants.equipDropChance) { // 10% chance for an item drop
    // 1. Randomly select an equipment slot
    const allSlots = ["Head", "Torso", "Legs", "Back", "Main Hand", "Offhand", "Ring 1", "Ring 2"];
    const randomSlot = allSlots[Math.floor(Math.random() * allSlots.length)];

    // 2. Get allowed item levels for the current area. Default to [1] if not defined.
    let allowedLevels = player.currentArea.allowedItemLevels;
    if (!allowedLevels || allowedLevels.length === 0) allowedLevels = [1];

    // 3. Filter items by slot and allowed levels
    let validItems = window.gameData.items.filter(item =>
      item.slot === randomSlot &&
      allowedLevels.includes(item.level) &&
      parseInt(item.id) <= 4999 // Items above 5000 are reserved for boss loot
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
