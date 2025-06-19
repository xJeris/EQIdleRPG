/**********************************************************************************
 * constants.js
 * Contains global constant data used throughout the application.
 ***********************************************************************************/

export const rarityData = {
  "Common":    { multiplier: 1.0, color: "white" },
  "Uncommon":  { multiplier: 1.1, color: "green" },
  "Rare":      { multiplier: 1.25, color: "blue" },
  "Epic":      { multiplier: 1.5, color: "purple" },
  "Legendary": { multiplier: 2.0, color: "orange" }
};

export const spellCastChance = {
  Cleric: 60,   // percent chance to cast a spell
  Druid: 75,
  Enchanter: 80,
  Magician: 75,
  Necromancer: 60,
  Paladin: 20,   
  Shaman: 80,
  Shadowknight: 40,
  Wizard: 90     
};

export const classBaseStats = {
  Bard:         { HP: 100, ATK: 13, DEF: 10, MAG: 0,  MR: 0 },
  Beastlord:    { HP: 110, ATK: 12, DEF: 12, MAG: 0,  MR: 0 },
  Berserker:    { HP: 120, ATK: 20, DEF: 12, MAG: 0,  MR: 0 },
  Cleric:       { HP: 105, ATK: 10,  DEF: 10, MAG: 12, MR: 0 },
  Druid:        { HP: 110,  ATK: 7,  DEF: 7,  MAG: 15, MR: 0 },
  Enchanter:    { HP: 95,  ATK: 7, DEF: 7,  MAG: 15, MR: 0 },
  Magician:     { HP: 95,  ATK: 7,  DEF: 7,  MAG: 20, MR: 0 },
  Monk:         { HP: 120, ATK: 15, DEF: 12, MAG: 0,  MR: 0 },
  Necromancer:  { HP: 90,  ATK: 10,  DEF: 10, MAG: 12, MR: 0 },
  Paladin:      { HP: 130, ATK: 15, DEF: 15, MAG: 5,  MR: 0 },
  Ranger:       { HP: 120, ATK: 18, DEF: 12, MAG: 0,  MR: 0 },
  Rogue:        { HP: 120, ATK: 19, DEF: 12, MAG: 0,  MR: 0 },
  Shadowknight: { HP: 130, ATK: 18, DEF: 15, MAG: 8,  MR: 0 },
  Shaman:       { HP: 110, ATK: 13, DEF: 15, MAG: 18, MR: 0 },
  Warrior:      { HP: 140, ATK: 15, DEF: 20, MAG: 0,  MR: 0 },
  Wizard:       { HP: 100,  ATK: 7,  DEF: 15, MAG: 20, MR: 0 }
};

export const raceClassRestrictions = {
  Human:      ["Bard", "Cleric", "Druid", "Enchanter", "Magician", "Monk", "Necromancer", "Paladin", "Ranger", "Rogue", "Shadowknight", "Warrior", "Wizard"],
  "Half Elf":   ["Bard", "Druid", "Paladin", "Ranger", "Rogue", "Warrior"],
  "High Elf":   ["Cleric", "Enchanter", "Magician", "Paladin", "Wizard"],
  "Dark Elf":   ["Cleric", "Enchanter", "Magician", "Necromancer", "Rogue", "Shadowknight", "Warrior", "Wizard"],
  "Wood Elf":   ["Bard", "Beastlord", "Druid", "Ranger", "Rogue", "Warrior"],
  Dwarf:      ["Berserker", "Cleric", "Paladin", "Rogue", "Warrior"],
  Iksar:      ["Beastlord", "Monk", "Necromancer", "Shadowknight", "Shaman", "Warrior"],
  Ogre:       ["Beastlord", "Berserker", "Shadowknight", "Shaman", "Warrior"],
  Troll:      ["Beastlord", "Berserker", "Shadowknight", "Shaman", "Warrior"],
  Froglok:    ["Cleric", "Monk", "Necromancer", "Paladin", "Rogue", "Shadowknight", "Shaman", "Warrior", "Wizard"],
  Drakkin:    ["Bard", "Cleric", "Druid", "Enchanter", "Magician", "Monk", "Necromancer", "Paladin", "Ranger", "Rogue", "Shadowknight", "Warrior", "Wizard"],
  Barbarian:  ["Beastlord", "Berserker", "Rogue", "Shaman", "Warrior"],
  Erudite:    ["Cleric", "Enchanter", "Magician", "Necromancer", "Paladin", "Shadowknight", "Wizard"],
  Gnome:      ["Cleric", "Enchanter", "Magician", "Necromancer", "Paladin", "Rogue", "Shadowknight", "Warrior", "Wizard"],
  Halfling:   ["Cleric", "Druid", "Paladin", "Ranger", "Rogue", "Warrior"],
  "Vah Shir":   ["Bard", "Beastlord", "Berserker", "Rogue", "Shaman", "Warrior"]
};

export const classesWithPets = ["Magician", "Necromancer", "Beastlord"];

// Player scaling constants for leveling up 2-50
export const playerScalingSet1 = {
  hpIncreaseFactor: 1.055,
  AtkIncreaseFactor: 1.045,
  DefIncreaseFactor: 1.045,
  MagIncreaseFactor: 1.045,
  MrIncreaseFactor: 0.00
};

// Player scaling constants for leveling up 51-100
export const playerScalingSet2 = {
  hpIncreaseFactor: 1.065, 
  AtkIncreaseFactor: 1.055,
  DefIncreaseFactor: 1.055,
  MagIncreaseFactor: 1.055,
  MrIncreaseFactor: 0.00
};

export const playerXpScaling = 1.0; // XP scaling factor (2.482) for leveling up, used to calculate xpNeeded for each level.

export const enemyCombatConstants = {
  playerXPLoss: 0.9, // Player loses 10% of their XP after dying in combat - player.xp = Math.floor(player.xp * 0.9).
  equipDropChance: 0.1, // 10% chance for an enemy to drop equipment.
  playerPhysicalCritChance: 0.05, // 5% chance for player to deal crit damage on physical attacks.
  playerPhysicalCritMultiplier: 1.5, // Multiplier for player physical critical hits.
  playerSpellCritChance: 0.05, // 5% chance for player to deal crit damage on spells.
  playerSpellCritMultiplier: 1.5, // Multiplier for spell critical hits.
  enemyPhysicalCritChance: 0.03, // 3% chance for enemy to deal crit damage on physical attacks.
  enemyPhysicalCritMultiplier: 1.5 // Multiplier for enemy physical critical hits.
};

export const bossCombatConstants = {
  playerXPLoss: 0.9, // Player loses 10% of their XP after dying to a boss - player.xp = Math.floor(player.xp * 0.9).
  playerHPRecovery: 0.9, // Player recovers 90% of their health after dying to boss.
  bossEncChance: 0.02 , // 2% chance for a boss encounter to occur.
  bossDRChance: 0.1, // 10% chance for a boss to reduce damage taken.
  playerPhysicalCritChance: 0.3, // 3% chance for player to deal crit damage on physical attacks.
  playerPhysicalCritMultiplier: 1.5, // Multiplier for player physical critical hits.
  playerSpellCritChance: 0.03, // 5% chance for player to deal crit damage on spells.
  playerSpellCritMultiplier: 1.5, // Multiplier for spell critical hits.
  bossPhysicalCritChance: 0.05, // 3% chance for enemy to deal crit damage on physical attacks.
  bossPhysicalCritMultiplier: 2.0 // Multiplier for enemy physical critical hits.
};

export const dmgModifiers = {
  dmgRange: 5, // Range for randomizing damage output
  spellCD: 2, // Cooldown for spells in turns
  spellCDThreshold: 1301, // Spell base damage threshold for spell cooldowns
  spellScaling: 0.0017 // Scaling factor for spell damage based on player level
}
