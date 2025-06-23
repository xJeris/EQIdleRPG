/**********************************************************************************
 * utils.js
 * Contains helper functions.
 ***********************************************************************************/

import { dmgModifiers, classBaseStats, playerScalingSet1, playerScalingSet2, playerXpScaling } from "./constants.js"; 
import { appendLog, updateUI, updateAreaInfo } from "./ui.js";
import { player } from "./character.js";
import { assignPetToPlayer } from "./equipment.js";
import { findAreaForLevel, startGameLoop, saveProgress } from "./combat.js";

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

// Generic Enemy Scaling Function
export function scaleGenericEnemy(baseEnemy, targetLevel, hpScale, atkScale, defScale) {
  // Start with the base enemy's level-1 stats.
  let currentStats = {
    HP: baseEnemy.HP,
    ATK: baseEnemy.ATK,
    DEF: baseEnemy.DEF,
    xp: baseEnemy.xp
  };

  // Iteratively apply the scaling factors from level 2 up to targetLevel.
  for (let lvl = 2; lvl <= targetLevel; lvl++) {
    currentStats.HP = Math.floor(currentStats.HP * hpScale);
    // old formula:  currentStats.ATK = Math.ceil(currentStats.ATK * (0.09+atkScale));
    currentStats.ATK = Math.ceil(currentStats.ATK * atkScale);
    currentStats.DEF = Math.ceil(currentStats.DEF * defScale);
    // Increase XP requirement by a fixed amount per level; you can adjust the logic as needed.
    currentStats.xp += 50;
  }
  
  // Create a new enemy object with the iterative stats.
  return {
    ...baseEnemy,
    level: targetLevel,
    HP: currentStats.HP,
    ATK: currentStats.ATK,
    DEF: currentStats.DEF,
    xp: currentStats.xp
  };
}

// Function to calculate physical damage with exponential decay and HP capping.
export function calculatePhysicalDamage(attacker, target) {
  // Calculate raw damage using exponential decay:
  // rawDamage = player.ATK * exp(-enemy.DEF / 100)
  const rawDamage = attacker.ATK * Math.exp(-target.DEF / 100);
  
  let damageCap;
  let capMultiplier;

  if (attacker.isBoss) {
    capMultiplier = 0.25;
    damageCap = target.maxHP * capMultiplier;
      //console.log(`Boss damage cap: ${damageCap}` + ` boss cap multiplier: ${capMultiplier}`);
  } else {
    // Cap the damage to ensure it doesn't exceed xx% of the defenders max HP.
    if (attacker.isEnemy) {
      // For enemies level 1 to 3, use a lower cap multiplier.
      capMultiplier = (attacker.level >= 1 && attacker.level <= 3) ? 0.10 : 0.16;
      damageCap = target.maxHP * capMultiplier;
    } else {
      // For players level 1 to 3, use a lower cap multiplier.
      capMultiplier = (attacker.level >= 1 && attacker.level <= 3) ? 0.12 : 0.17;
      damageCap = target.maxHP * capMultiplier;
    }
  }
  
  // Calculate final damage as the lesser of rawDamage and the cap.
  const finalDamage = Math.min(rawDamage, damageCap);

  // Round the result to a whole number. You can choose Math.floor or Math.round.
  return Math.floor(finalDamage);
}

// Function to calculate spell damage with exponential decay and HP capping.
export function calculateSpellDamage(attacker, target, spell) {
  // Calculate raw spell damage:

  // rawDamage = (spell.baseDamage + player.MAG) * exp(-enemy.MR / 100) * 1.01
  // The multiplier of 1.01 gives spells a slight bonus.
  const rawDamage = (spell.baseDamage + attacker.MAG) * Math.exp(-target.MR / 100) * 1.01;
  
  // Cap the damage to ensure it doesn't exceed xx% of the enemy's HP.
  // For players level 1 to 3, use a lower cap multiplier.
  const capMultiplier = (attacker.level >= 1 && attacker.level <= 3) ? 0.12 : 0.17;
  const damageCap = target.maxHP * capMultiplier;
  
  // Calculate final damage as the lesser of rawDamage and the cap.
  const finalDamage = Math.min(rawDamage, damageCap);
  
  // Round the result to a whole number. You can choose Math.floor or Math.round.
  return Math.floor(finalDamage);
}


/**
 * FOR DEVELOPMENT TESTING
 * Scales up the player's stats based on the selected level (1-100)
 * and the player's class selection.
 *
 * The level to scale the player to (1-100)
 */
export function scalePlayerStats(selectedLevel) {
  if (selectedLevel < 1 || selectedLevel > 100) {
    console.error("Selected level must be between 1 and 100.");
    return;
  }

  // Get the base stats for the chosen class.
  const baseStats = classBaseStats[player.class];
  if (!baseStats) {
    console.error(`Base stats for class "${player.class}" not found.`);
    return;
  }

  // Use temporary (float) variables for iteration.
  let hp  = baseStats.HP;
  let atk = baseStats.ATK;
  let def = baseStats.DEF;
  let mag = baseStats.MAG;
  let mr  = baseStats.MR;

  // Loop from level 2 until the selected level.
  // Each iteration uses the new stat values to compute the next level.
  for (let lvl = 2; lvl <= selectedLevel; lvl++) {
    // Pick the scaling set based on current level.
    const scaling = (lvl <= 50) ? playerScalingSet1 : playerScalingSet2;
    hp  = hp  * scaling.hpIncreaseFactor;
    atk = atk * scaling.AtkIncreaseFactor;
    def = def * scaling.DefIncreaseFactor;
    mag = mag * scaling.MagIncreaseFactor;
    if (scaling.MrIncreaseFactor !== 0) {
      mr  = mr * scaling.MrIncreaseFactor;
    }
  }

  // Update the player object.
  player.level = selectedLevel;
  player.HP  = Math.round(hp);
  player.ATK = Math.round(atk);
  player.DEF = Math.round(def);
  player.MAG = Math.round(mag);
  player.MR  = Math.round(mr);
  player.maxHP = player.HP;
  player.currentHP = player.HP;
  
  // Set the experience needed for the next level.
  player.xpNeeded = Math.round(1000 * Math.pow(playerXpScaling, selectedLevel - 1));

  // Assign pet if applicable.
  assignPetToPlayer();
    
  // Set initial area.
  player.currentArea = findAreaForLevel(player.level);
  updateUI(player, player.equipment, {});
  updateAreaInfo(player.currentArea);
  saveProgress();
  document.getElementById("characterCreation").style.display = "none";
  document.getElementById("gameUI").style.display = "flex";
  appendLog("Welcome, " + player.name + "! Your adventure begins in " + player.currentArea.name + ".");
  startGameLoop();
}
