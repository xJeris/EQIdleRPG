/**********************************************************************************
 * Javascript Written By:  Microsoft Copilot. 2025                                *
 * Ideas, Functionality, and Edits By:  xJeris                                    *
 *                                                                                *
 * Free For Distribution or Alteration                                            *
 ***********************************************************************************/

// Global flag to control the game loop.
let gameRunning = false;

// Global variables to store data from XML files.
let areas = [];
let enemies = [];
let items = [];
let bosses = [];
let spells = [];
let pets = [];

// Utility for loading external XML files.
function fetchXML(url) {
  return fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status} - ${url}`);
      }
      return response.text();
    })
    .then(str => new DOMParser().parseFromString(str, "application/xml"))
    .catch(error => {
      console.error("Error loading " + url + ":", error);
      throw error;
    });
}

// Load areas.xml, enemies.xml, and items.xml from the data folder.
function loadXMLData() {
  return Promise.all([
    fetchXML('data/areas.xml'),
    fetchXML('data/enemies.xml'),
    fetchXML('data/items.xml'),
    fetchXML('data/boss.xml'),
    fetchXML('data/spells.xml'),
    fetchXML('data/pets.xml')
  ])
    .then(([areasDoc, enemiesDoc, itemsDoc, bossesDoc, spellsDoc, petsDoc]) => {
      // Process areas.xml
      areas = Array.from(areasDoc.getElementsByTagName("area")).map(area => ({
        id: area.getAttribute("id"),
        name: area.getAttribute("name"),
        recommendedLevel: parseInt(area.getAttribute("recommendedLevel")),
        maxLevel: parseInt(area.getAttribute("maxLevel")),
        maxItemLevel: parseInt(area.getAttribute("maxItemLevel"))  // New attribute for item drops
      }));
      
      // Process enemies.xml
      enemies = Array.from(enemiesDoc.getElementsByTagName("enemy")).map(enemy => ({
        id: enemy.getAttribute("id"),
        name: enemy.getAttribute("name"),
        minLevel: parseInt(enemy.getAttribute("minLevel")),
        maxLevel: parseInt(enemy.getAttribute("maxLevel")),
        HP: parseInt(enemy.getAttribute("HP")),
        ATK: parseInt(enemy.getAttribute("ATK")),
        DEF: parseInt(enemy.getAttribute("DEF")),
        MR: parseInt(enemy.getAttribute("MR")),
        xp: parseInt(enemy.getAttribute("xp")),
        // Extract allowed area IDs from the <areas> section.
        allowedAreas: Array.from(enemy.getElementsByTagName("area")).map(area => area.getAttribute("id"))
      }));
      
      // Process items.xml including slot, ATK, DEF, MAG, and level.
      items = Array.from(itemsDoc.getElementsByTagName("item")).map(item => ({
        id: item.getAttribute("id"),
        name: item.getAttribute("name"),
        slot: item.getAttribute("slot"),    // e.g., "Main Hand", "Offhand", etc.
        ATK: parseInt(item.getAttribute("ATK")),
        DEF: parseInt(item.getAttribute("DEF")),
        MAG: parseInt(item.getAttribute("MAG")),
        MR: parseInt(item.getAttribute("MR")),
        level: parseInt(item.getAttribute("level"))
      }));

      // Process boss.xml
      bosses = Array.from(bossesDoc.getElementsByTagName("boss")).map(boss => ({
        id: boss.getAttribute("id"),
        name: boss.getAttribute("name"),
        area: boss.getAttribute("area"),               // The area in which the boss appears.
        level: parseInt(boss.getAttribute("level")),     // The boss's fixed level.
        ATK: parseInt(boss.getAttribute("ATK")),
        DEF: parseInt(boss.getAttribute("DEF")),
        MR: parseInt(boss.getAttribute("MR")),
        HP: parseInt(boss.getAttribute("HP")),
        xp: parseInt(boss.getAttribute("xp")),
        drop1: boss.getAttribute("drop1"),
        drop2: boss.getAttribute("drop2"),
        drop3: boss.getAttribute("drop3")
      }));

      // Process spells.xml
      spells = Array.from(spellsDoc.getElementsByTagName("spell")).map(spell => ({
        id: spell.getAttribute("id"),
        name: spell.getAttribute("name"),
        class: spell.getAttribute("class"),
        minLevel: parseInt(spell.getAttribute("minLevel")),
        maxLevel: parseInt(spell.getAttribute("maxLevel")),
        baseDamage: parseInt(spell.getAttribute("baseDamage"))
      }));

      // Load pets.xml
      pets = Array.from(petsDoc.getElementsByTagName("pet")).map(pet => ({
        id: pet.getAttribute("id"),
        name: pet.getAttribute("name"),
        class: pet.getAttribute("class"),
        level: parseInt(pet.getAttribute("level")),
        hp: parseInt(pet.getAttribute("hp")),
        atk: parseInt(pet.getAttribute("atk")),
        def: parseInt(pet.getAttribute("def")),
        mag: parseInt(pet.getAttribute("mag")),
        mr: parseInt(pet.getAttribute("mr"))
  }));

    })
    .catch(error => {
      console.error("Error loading XML data:", error);
      throw error;
    });
}

/************************************
 ********** CHARACTER INFO **********
 ************************************/

// Global Player Object & Base Stats
let player = {
  name: '',
  race: '',
  class: '',
  gender: '',
  level: 1,       // starting level
  xp: 0,          // base experience points
  xpNeeded: 1000, // xp needed to reach level 2
  HP: 0,          // hit points, set by character selection
  ATK: 0,         // attack, set by character selection
  DEF: 0,         // defense, set by character selection
  MAG: 0,         // magic, set by character selection
  MR: 0,          // magic resistance, set by character selection
  currentHP: 0,
  // Each slot starts out empty (set to null)
  equipment: {
    "Head": null,
    "Torso": null,
    "Legs": null,
    "Back": null,
    "Main Hand": null,
    "Offhand": null,
    "Ring 1": null,
    "Ring 2": null
  },
  currentArea: null,
  pet: null,
  petDied: false
};

// Classes
const classBaseStats = {
  Bard:         { HP: 100, ATK: 13, DEF: 10, MAG: 5,  MR: 0 },
  Beastlord:    { HP: 100, ATK: 12, DEF: 12, MAG: 0,  MR: 0 },
  Berserker:    { HP: 110, ATK: 20, DEF: 12, MAG: 0,  MR: 0 },
  Cleric:       { HP: 105, ATK: 7,  DEF: 10, MAG: 10, MR: 0 },
  Druid:        { HP: 90,  ATK: 7,  DEF: 7,  MAG: 15, MR: 0 },
  Enchanter:    { HP: 80,  ATK: 13, DEF: 5,  MAG: 10, MR: 0 },
  Magician:     { HP: 80,  ATK: 5,  DEF: 5,  MAG: 20, MR: 0 },
  Monk:         { HP: 120, ATK: 15, DEF: 12, MAG: 0,  MR: 0 },
  Necromancer:  { HP: 90,  ATK: 7,  DEF: 10, MAG: 15, MR: 0 },
  Paladin:      { HP: 140, ATK: 15, DEF: 15, MAG: 5,  MR: 0 },
  Ranger:       { HP: 130, ATK: 15, DEF: 12, MAG: 0,  MR: 0 },
  Rogue:        { HP: 130, ATK: 15, DEF: 12, MAG: 0,  MR: 0 },
  Shadowknight: { HP: 140, ATK: 20, DEF: 15, MAG: 5,  MR: 0 },
  Shaman:       { HP: 130, ATK: 13, DEF: 15, MAG: 15, MR: 0 },
  Warrior:      { HP: 150, ATK: 15, DEF: 20, MAG: 0,  MR: 0 },
  Wizard:       { HP: 80,  ATK: 5,  DEF: 15, MAG: 20, MR: 0 }
};

const raceClassRestrictions = {
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

// Returns an array of classes for the given race.
function getAvailableClasses(selectedRace) {
  return raceClassRestrictions[selectedRace] || [];
}

// Returns an array of races that support a given class.
function getAvailableRaces(selectedClass) {
  return Object.keys(raceClassRestrictions).filter(race => 
    raceClassRestrictions[race].includes(selectedClass)
  );
}

// Update the race dropdown with the given raceList.
function updateRaceSelection(raceList) {
  const raceDropdown = document.getElementById("playerRace");
  // Clear existing options.
  raceDropdown.innerHTML = "";
  // Add a default "Select Race" option (optional).
  let defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "-- Select Race --";
  raceDropdown.appendChild(defaultOption);
  // Add each race.
  raceList.forEach(race => {
    let option = document.createElement("option");
    option.value = race;
    option.textContent = race;
    raceDropdown.appendChild(option);
  });
}

// Update the class dropdown with the given classList.
function updateClassSelection(classList) {
  const classDropdown = document.getElementById("playerClass");
  // Clear existing options.
  classDropdown.innerHTML = "";
  // Add a default "Select Class" option (optional).
  let defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "-- Select Class --";
  classDropdown.appendChild(defaultOption);
  // Add each class.
  classList.forEach(cls => {
    let option = document.createElement("option");
    option.value = cls;
    option.textContent = cls;
    classDropdown.appendChild(option);
  });
}

// When a race is selected, update the class dropdown accordingly.
document.getElementById("playerRace").addEventListener("change", function() {
  const selectedRace = this.value;
  if (selectedRace) {
    const classes = getAvailableClasses(selectedRace);
    updateClassSelection(classes);
  } else {
    // If blank, repopulate all classes.
    const allClasses = [...new Set(Object.values(raceClassRestrictions).flat())];
    updateClassSelection(allClasses);
  }
});

// When a class is selected, update the race dropdown accordingly.
document.getElementById("playerClass").addEventListener("change", function() {
  const selectedClass = this.value;
  if (selectedClass) {
    const races = getAvailableRaces(selectedClass);
    updateRaceSelection(races);
  } else {
    // If blank, repopulate full list of races.
    updateRaceSelection(Object.keys(raceClassRestrictions));
  }
});

// Reset character choices.
function resetCharacterCreation() {
  // Reset player object (assuming "player" is a global object).
  player.name = "";
  player.race = "";
  player.class = "";
  player.gender = "";
  
  // Clear form fields.
  document.getElementById("playerName").value = "";
  document.getElementById("playerRace").selectedIndex = 0;
  document.getElementById("playerClass").selectedIndex = 0;
  document.getElementById("playerGender").selectedIndex = 0;
  
  // Restore full lists.
  updateRaceSelection(Object.keys(raceClassRestrictions));  // All races.
  const allClasses = [...new Set(Object.values(raceClassRestrictions).flat())]; // Unique list.
  updateClassSelection(allClasses);  // All classes.
}

document.getElementById("resetCharacter").addEventListener("click", resetCharacterCreation);

// function to add equipment stats to the player stats.
function getEquipmentBonuses() {
  let bonusATK = 0;
  let bonusDEF = 0;
  let bonusMAG = 0;
  let bonusMR = 0;
  for (let slot in player.equipment) {
    if (player.equipment[slot]) {
      bonusATK += player.equipment[slot].ATK || 0;
      bonusDEF += player.equipment[slot].DEF || 0;
      bonusMAG += player.equipment[slot].MAG || 0;
      bonusMR += player.equipment[slot].MR || 0;
    }
  }
  return { bonusATK, bonusDEF, bonusMAG, bonusMR };
}

// Classes allowed to have pets.
const classesWithPets = ["Magician", "Necromancer", "Beastlord"];

// Check if class has a pet
function getAvailablePets(playerClass, playerLevel) {
  return pets.filter(pet =>
    pet.class === playerClass &&
    playerLevel >= pet.level
  );
}

// Assign pet when creating a Magician, Necromancer, or Beastlord
function assignPetToPlayer() {
  if (["Magician", "Necromancer", "Beastlord"].includes(player.class)) {
    let possiblePets = getAvailablePets(player.class, player.level);
    if (possiblePets.length > 0) {
      let newPet = possiblePets[possiblePets.length - 1]; // Assign strongest available pet

      // Use uppercase property names for consistency.
      player.pet = {
        id: newPet.id,
        name: newPet.name,
        class: newPet.class,
        level: newPet.level,
        currentHP: newPet.hp,   // define pets current hp as a subset of max hp.
        HP: newPet.hp,          // HP is used as the max health value
        ATK: newPet.atk,
        DEF: newPet.def,
        MAG: newPet.mag,
        MR: newPet.mr
      };

      appendLog("Your pet " + player.pet.name + " (Level " + player.pet.level + ") joins you!");
    }
  }
}

// delay function to slow down text results.
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Configure the percent chance for the player to cast a spell (if they are allowed to cast).
const spellCastChance = {
  Cleric: 30,   // percent chance to cast a spell
  Druid: 60,
  Enchanter: 30,
  Magician: 60,
  Necromancer: 60,
  Paladin: 10,   
  Shaman: 70,
  Shadowknight: 30,
  Wizard: 90     
};

// Helper function to retrieve available spells for a given class.
function getAvailableSpellsForClass(cls, level) {
  return spells.filter(spell => 
    spell.class === cls &&
    level >= spell.minLevel &&
    level <= spell.maxLevel
  );
}

// Calculate spell damage based on MAG stat for each class
function calculateSpellDamage(spell, player, target) {
  const scalingFactor = 0.4;
  const mrFactor = target.MR || 0;
  // Each point of MR reduces spell damage by 1%, capped at 75%
  const maxReduction = Math.min(mrFactor, 75);
  // Combine spell base damage and MAG scaling
  const baseDamage = spell.baseDamage + Math.floor(getPlayerMAG(player) * scalingFactor);
  // Apply MR reduction to the total baseDamage
  const finalDamage = Math.floor(baseDamage * (1 - maxReduction / 100));
  return Math.max(finalDamage, 1);
}

// Check if class can use spells.
function getPlayerMAG(player) {
  // Assuming you store the class name in player.class and the base stats in classBaseStats
  if (classBaseStats[player.class]) {
    return classBaseStats[player.class].MAG;
  }
  return 0;
}

// UI Updates & Log Functions
  // Update class selections
  function updateClassSelection(classList) {
    let classDropdown = document.getElementById("playerClass");
    let currentSelection = classDropdown.value; // Store current selection
  
    classDropdown.innerHTML = ""; // Clear existing options
    classList.forEach(cls => {
      let option = document.createElement("option");
      option.value = cls;
      option.textContent = cls;
      classDropdown.appendChild(option);
    });
  
    // Preserve the selection if still valid; otherwise default to the first option.
    if (classList.includes(currentSelection)) {
      classDropdown.value = currentSelection;
    } else {
      classDropdown.selectedIndex = 0;
    }
  }
  
  // Update race selections
  function updateRaceSelection(raceList) {
    let raceDropdown = document.getElementById("playerRace");
    let currentSelection = raceDropdown.value; // Store current selection
  
    raceDropdown.innerHTML = ""; // Clear existing options
    raceList.forEach(race => {
      let option = document.createElement("option");
      option.value = race;
      option.textContent = race;
      raceDropdown.appendChild(option);
    });
  
    // Preserve the selection if still valid; otherwise default to the first option.
    if (raceList.includes(currentSelection)) {
      raceDropdown.value = currentSelection;
    } else {
      raceDropdown.selectedIndex = 0;
    }
  }

  // Wrapper function to refresh character options
  function updateCharOptions() {
    const availableClasses = getAvailableClasses(player.race);
    const availableRaces = getAvailableRaces(player.class);

    // Only update the dropdown if the current selection isn’t valid.
    if (!availableClasses.includes(player.class)) {
      updateClassSelection(availableClasses);
    }
    if (!availableRaces.includes(player.race)) {
      updateRaceSelection(availableRaces);
    }
  }

function updateEquipmentUI() {
  const equipmentList = document.getElementById("equipmentList");
  equipmentList.innerHTML = ""; // clear old content

  Object.entries(player.equipment).forEach(([slot, item]) => {
    const li = document.createElement("li");
    li.textContent = item 
      ? `${slot}: ${item.name} (L${item.level}, A +${item.ATK}, D +${item.DEF}, MG +${item.MAG}, MR +${item.MR})`
      : `${slot}: None`;
    equipmentList.appendChild(li);
  });
}

function updateStatsUI() {
  const statsList = document.getElementById("statsList");
  statsList.innerHTML = ""; // Clear old stats

  // Get equipment bonuses once (so you don't call it repeatedly)
  const bonuses = getEquipmentBonuses();
  const effectiveATK = player.ATK + bonuses.bonusATK;
  const effectiveDEF = player.DEF + bonuses.bonusDEF;
  const effectiveMAG = player.MAG + bonuses.bonusMAG;
  const effectiveMR = player.MR + bonuses.bonusMR;

  // Define the stats to display.
  // Feel free to add, remove or reformat any stats as needed.
  const stats = {
    "Level": player.level,
    "XP": player.xp + " / " + player.xpNeeded,
    "HP": player.currentHP + " / " + player.HP,
    "ATK": player.ATK + " (+" + bonuses.bonusATK + ") = " + effectiveATK,
    "DEF": player.DEF + " (+" + bonuses.bonusDEF + ") = " + effectiveDEF,
    "MAG": player.MAG + " (+" + bonuses.bonusMAG + ") = " + effectiveMAG,
    "MR": player.MR + " (+" + bonuses.bonusMR + ") = " + effectiveMR
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

function updateUI() {
  // Update static info (like name, race, class).
  document.getElementById("playerInfo").textContent =
    "Name: " + player.name + " | Race: " + player.race + " | Class: " + player.class;

  // Update area.
  document.getElementById("currentArea").textContent =
    "Area: " + (player.currentArea ? player.currentArea.name : "Unknown");

  // Update stats and equipment using our new UI functions.
  updateStatsUI();
  updateEquipmentUI();
}

function appendLog(message) {
  const logDiv = document.getElementById("combatLog");
  const p = document.createElement("p");
  p.innerHTML = message;
  logDiv.appendChild(p);
  logDiv.scrollTop = logDiv.scrollHeight;
}

// Saving & Loading player progress using localStorage
function saveProgress() {
  //console.log("DEV: I am saving progress");
  localStorage.setItem("idleRPGPlayer", JSON.stringify(player));
}

function loadProgress() {
  //console.log("DEV: I am loading existing progress");
  let savedPlayer = localStorage.getItem("idleRPGPlayer");
  
  // If saved is falsy, equals "null", or is an empty string, treat it as no saved progress.
  if (!savedPlayer || savedPlayer === "null" || savedPlayer.trim() === "") {
    //console.log("DEV: I didn't find any saved progress");
    return false;
  }
  
  try {
    player = JSON.parse(savedPlayer);
  } catch (err) {
    console.error("Error parsing saved player data:", err);
    return false;
  }

  //console.log("DEV: I found saved progress");
  
  // Ensure equipment is defined as an object with the expected keys.
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
  
  // Restore currentArea by matching id from our areas array.
  if (player.currentArea && player.currentArea.id) {
    player.currentArea = areas.find(a => a.id === player.currentArea.id) || player.currentArea;
  }
  
  // Restore pet based on the player's class and level.
  assignPetToPlayer();  // Ensures the player has the correct pet upon loading
  
  updateUI();
  return true;
}

// Determine which area is appropriate based on the player's level
function findAreaForLevel(level) {
  for (let area of areas) {
    if (level >= area.recommendedLevel && level <= area.maxLevel) {
      return area;
    }
  }
  return areas[areas.length - 1]; // fallback
}

// XP & Level-Up Mechanics
function addXP(amount) {
  player.xp += amount;
  appendLog("<span style='color: yellow;'>You gained " + amount + " XP.</span>");

  while (player.xp >= player.xpNeeded && player.level < 100) {
    player.xp -= player.xpNeeded;
    player.level++;
    appendLog("<span style='color: blue;'>Level Up! You are now level " + player.level + ".</span>");
    // Increase XP threshold: 1000 * currentLevel^2.482
    player.xpNeeded = Math.floor(1000 * Math.pow(player.level, 2.482));
    // Increase base stats on level up
    const hpIncreaseFactor = 0.06;  // 0.06 gives about 32k HP at level 100 for a char starting with 100 HP.
    const AtkIncreaseFactor = 0.045;  // 0.045 gives about 1500 ATK at level 100 for a char starting with 20 ATK.
    const DefIncreaseFactor = 0.045;  // 0.045 gives about 1500 DEF at level 100 for a char starting with 20 DEF.
    const MagIncreaseFactor = 0.045;  // 0.045 gives about 1500 MAG at level 100 for a char starting with 20 MAG.
    const MrIncreaseFactor = 0.00;  // MR scaling
    player.HP = Math.floor(player.HP * (1 + hpIncreaseFactor));
    player.ATK = Math.ceil(player.ATK * (1 + AtkIncreaseFactor));
    player.DEF = Math.ceil(player.DEF * (1 + DefIncreaseFactor));
    player.MAG = Math.ceil(player.MAG * (1 + MagIncreaseFactor));
    player.MR = Math.ceil(player.MR * (1 + MrIncreaseFactor));
    player.currentHP = player.HP;

    // If the class normally has a pet and there is currently no pet, summon one.
    if (["Magician", "Necromancer", "Beastlord"].includes(player.class) && !player.pet) {
      assignPetToPlayer();
    }

    // Check if the player should move to a new area:
    let newArea = findAreaForLevel(player.level);
    if (!player.currentArea) {
      // No current area—assign newArea.
      appendLog("You enter a new area: " + newArea.name + ".");
      player.currentArea = newArea;
    } else if (newArea.id !== player.currentArea.id) {
      // The new area is different (player outgrew the current area).
      appendLog("You have outgrown your current area and now move to " + newArea.name + ".");
      player.currentArea = newArea;
    } else {
      // Even though newArea matches the current area, there's a 50% chance to move anyway.
      if (Math.random() < 0.5) {
        // Identify other areas that are level-appropriate.
        let possibleAreas = areas.filter(area =>
          area.id !== player.currentArea.id &&
          player.level >= area.recommendedLevel &&
          // If maxLevel is provided, the player's level must be below or equal to it.
          (area.maxLevel === undefined || player.level <= area.maxLevel)
        );
        if (possibleAreas.length > 0) {
          let randomArea = possibleAreas[Math.floor(Math.random() * possibleAreas.length)];
          appendLog("Feeling adventurous, you decide to move to " + randomArea.name + " even though you're still level appropriate for your current area.");
          player.currentArea = randomArea;
        }
      }
    } 

    updateUI();
    saveProgress();
  } 
} 

/****************************
 ********** BOSSES **********
 ****************************/

// Simulate a boss battle
async function simulateBossBattle() {
  // Filter bosses available in the player's current area.
  let validBosses = bosses.filter(boss => boss.area === player.currentArea.id);
  
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
  
  const playerDRFactor = 50;  // Used to reduce damage taken by boss from player/pet gradually. 50 is about half.
  const bossDRFactor = 50;  // Used to reduce damage taken by player/pet from boss gradually. 50 is about half.
  const playerPhysicalCritChance = 0.3; // 3% chance for player to deal crit damage on physical attacks.
  const playerPhysicalCritMultiplier = 1.5; // Multiplier for player physical critical hits.
  const playerSpellCritChance = 0.03; // 5% chance for player to deal crit damage on spells.
  const playerSpellCritMultiplier = 1.5; // Multiplier for spell critical hits.
  const bossPhysicalCritChance = 0.05; // 3% chance for enemy to deal crit damage on physical attacks.
  const bossPhysicalCritMultiplier = 2.0; // Multiplier for enemy physical critical hits.

  // **Phase 1: Pet Combat (if a pet is available)**
  if (petAllowed) {
    while (currentBoss.HP > 0 && player.pet && player.pet.currentHP > 0) {;
      let damageDealt = Math.max(Math.floor(player.pet.ATK * (playerDRFactor / (playerDRFactor + currentBoss.DEF))), 1);

      // Check for a crit on player's pet physical attack.
      if (Math.random() < playerPhysicalCritChance) {
        damageDealt = Math.floor(damageDealt * playerPhysicalCritMultiplier);
        appendLog("<span style='color: orange;'>Your pet land a <strong>Critical Hit</strong>!</span>");
      }

      currentBoss.HP -= damageDealt;
      appendLog("Round: " + player.pet.name + " attacks, dealing " + damageDealt + " damage! Boss HP: " + currentBoss.HP);
      await delay(1000);

      if (currentBoss.HP <= 0) break;

      let damageReceived = Math.max(Math.floor(currentBoss.ATK * (bossDRFactor / (bossDRFactor + player.pet.DEF))), 1);
      
      // Check for a crit on bosses physical attack.
      if (Math.random() < bossPhysicalCritChance) {
        damageReceived = Math.floor(damageReceived * bossPhysicalCritMultiplier);
        appendLog("<span style='color: orange;'>The boss landed a <strong>Critical Spell Hit</strong>!</span>");
      }
      
      player.pet.currentHP -= damageReceived;
      appendLog("Round: " + currentBoss.name + " attacks for " + damageReceived + " damage. Pet HP: " + player.pet.currentHP);
      await delay(1000);

      updateStatsUI();

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
        if (Math.random() < playerSpellCritChance) {
          damageDealt = Math.floor(damageDealt * playerSpellCritMultiplier);
          appendLog("<span style='color: orange;'>You land a <strong>Critical Spell Hit</strong>!</span>");
        }

        currentBoss.HP -= damageDealt;
        appendLog("You cast " + chosenSpell.name + ", dealing " + damageDealt + " magical damage! Boss HP: " + currentBoss.HP);
        await delay(1000);
      
        if (currentBoss.HP <= 0) break;
      
        // Enemy counterattack remains physical.
        let damageReceived = Math.max(Math.floor(currentBoss.ATK * (bossDRFactor / (bossDRFactor + player.DEF))), 1);
    
        // Check for a crit on bosses physical attack.
        if (Math.random() < bossPhysicalCritChance) {
          damageReceived = Math.floor(damageReceived * bossPhysicalCritMultiplier);
          appendLog("<span style='color: orange;'>The boss landed a <strong>Critical Hit</strong>!</span>");
        }

        player.currentHP -= damageReceived;
        appendLog(currentBoss.name + " counterattacks for " + damageReceived + " damage. Your HP: " + player.currentHP);
        await delay(1000);
      
        updateStatsUI();
      
        // Continue to the next iteration of the loop.
        continue;
      }
      // ---- End Spell Casting Branch ----
    
      // Otherwise, use physical attack.
      let playerDamage = Math.max(Math.floor(player.ATK * (playerDRFactor / (playerDRFactor + currentBoss.DEF))), 1);

      // Check for a crit on player's physical attack.
      if (Math.random() < playerPhysicalCritChance) {
        playerDamage = Math.floor(playerDamage * playerPhysicalCritMultiplier);
        appendLog("<span style='color: orange;'>You land a <strong>Critical Hit</strong>!</span>");
      }

      currentBoss.HP -= playerDamage;
      appendLog("Round: You attack " + currentBoss.name + " dealing " + playerDamage + " damage! Boss HP: " + currentBoss.HP);
      await delay(1000);

      if (currentBoss.HP <= 0) break;

      let bossDamage = Math.max(Math.floor(currentBoss.ATK * (bossDRFactor / (bossDRFactor + player.DEF))), 1);
      
      // Check for a crit on bosses physical attack.
      if (Math.random() < bossPhysicalCritChance) {
        bossDamage = Math.floor(bossDamage * bossPhysicalCritMultiplier);
        appendLog("<span style='color: orange;'>The boss landed a <strong>Critical Hit</strong>!</span>");
      }
      
      player.currentHP -= bossDamage;
      appendLog("Round: " + currentBoss.name + " attacks for " + bossDamage + " damage. Your HP: " + player.currentHP);
      await delay(1000);

      updateStatsUI();
    }
  }

  // Final Outcome
  if (currentBoss.HP <= 0) {
    appendLog("<span class='winOutcome'>You have defeated " + currentBoss.name + "!</span>");
    addXP(currentBoss.xp);

    if (player.petDied) {
      appendLog("<span style='color: green;'>You recover and summon a new pet!</span>");
      assignPetToPlayer();
    }
  } else {
    appendLog("<span class='loseOutcome'>You were defeated by " + currentBoss.name + ".</span>");
    player.currentHP = 0;
  }

  updateUI();
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

    player.currentHP = Math.floor(player.HP * 0.9);
    updateStatsUI();

    appendLog("<span style='color: blue;'>You prepare for the next battle.</span>");
    updateUI();
    saveProgress();
  }
}

/*****************************
 ********** ENEMIES **********
 *****************************/

// Automated Combat Simulation (async version) with pet mechanics
async function simulateCombat() {
  // Filter enemies based on the desired range: [player.level - 1, player.level + 2]
  let validEnemies = enemies.filter(enemy => {
    const desiredMin = player.level - 1;
    const desiredMax = player.level + 2;
    const effectiveMin = Math.max(enemy.minLevel, desiredMin);
    const effectiveMax = Math.min(enemy.maxLevel, desiredMax, player.currentArea.maxLevel);
    return (effectiveMin <= effectiveMax) && enemy.allowedAreas.includes(player.currentArea.id);
  });

  // Fallback: If no enemy passes the area+level filter, fallback to level-only check.
  if (validEnemies.length === 0) {
    validEnemies = enemies.filter(enemy => {
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

  const playerDRFactor = 50;  // Used to reduce damage taken by enemy from player/pet gradually. 50 is about half.
  const enemyDRFactor = 50;  // Used to reduce damage taken by player/pet from enemy gradually. 50 is about half.
  const playerPhysicalCritChance = 0.05; // 5% chance for player to deal crit damage on physical attacks.
  const playerPhysicalCritMultiplier = 1.5; // Multiplier for player physical critical hits.
  const playerSpellCritChance = 0.05; // 5% chance for player to deal crit damage on spells.
  const playerSpellCritMultiplier = 1.5; // Multiplier for spell critical hits.
  const enemyPhysicalCritChance = 0.03; // 3% chance for enemy to deal crit damage on physical attacks.
  const enemyPhysicalCritMultiplier = 1.5; // Multiplier for enemy physical critical hits.

  // Main combat loop:
  while (
    currentEnemy.HP > 0 &&
    ((activeCombatant === player && player.currentHP > 0) ||
     (activeCombatant !== player && activeCombatant.HP > 0))
  ) {
    let attackerName, attackerATK, currentHealth;
  
    if (activeCombatant === player) {
      attackerName = "You";
      // Check if the player is allowed to cast spells.
      let availableSpells = getAvailableSpellsForClass(player.class, player.level);
      let chance = spellCastChance[player.class] || 0;
      if (availableSpells.length > 0 && Math.random() < chance / 100) {
        // Cast a spell instead of a physical attack.
        let chosenSpell = availableSpells[Math.floor(Math.random() * availableSpells.length)];
        let damageDealt = calculateSpellDamage(chosenSpell, player, currentEnemy);

        // Check for a crit on player's spell attack.
        if (Math.random() < playerSpellCritChance) {
          damageDealt = Math.floor(damageDealt * playerSpellCritMultiplier);
          appendLog("<span style='color: orange;'>You land a <strong>Critical Spell Hit</strong>!</span>");
        }

        currentEnemy.HP -= damageDealt;
        appendLog("You cast " + chosenSpell.name + ", dealing " + damageDealt + " magical damage! Enemy HP: " + currentEnemy.HP);
        await delay(1000);
        if (currentEnemy.HP <= 0) break;
        
        // Enemy counterattack remains physical.
        let damageReceived = Math.max(Math.floor(currentEnemy.ATK * (enemyDRFactor / (enemyDRFactor + player.DEF))), 1);

        // Check for a crit on enemy's physical attack.
        if (Math.random() < enemyPhysicalCritChance) {
          damageReceived = Math.floor(damageReceived * enemyPhysicalCritMultiplier);
          appendLog("<span style='color: orange;'>The Enemy lands a <strong>Critical Hit</strong>!</span>");
        }

        player.currentHP -= damageReceived;
        currentHealth = player.currentHP;
        appendLog(currentEnemy.name + " counterattacks for " + damageReceived + " damage. Your HP: " + currentHealth);
        await delay(1000);
        
        updateStatsUI();
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
    let damageDealt = Math.max(Math.floor(attackerATK * (playerDRFactor / (playerDRFactor + currentEnemy.DEF))), 1);
    
    // Check for a crit in player's physical attack.
    if (Math.random() < playerPhysicalCritChance) {
      damageDealt = Math.floor(damageDealt * playerPhysicalCritMultiplier);
      appendLog("<span style='color: orange;'>You land a <strong>Critical Hit</strong>!</span>");
    }
    
    currentEnemy.HP -= damageDealt;
    appendLog(attackerName + " attacks, dealing " + damageDealt + " damage! Enemy HP: " + currentEnemy.HP);
    await delay(1000);
    
    if (currentEnemy.HP <= 0) break;
    
    // Enemy counterattack.
    let defenderDEF = (activeCombatant === player) ? player.DEF : player.pet.DEF;
    let damageReceived = Math.max(Math.floor(currentEnemy.ATK * (enemyDRFactor / (enemyDRFactor + defenderDEF))), 1);

    // Check for a crit on enemy's physical attack.
    if (Math.random() < enemyPhysicalCritChance) {
      damageReceived = Math.floor(damageReceived * enemyPhysicalCritMultiplier);
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
    
    updateStatsUI();
    
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
    player.xp = Math.floor(player.xp * 0.9);
    assignPetToPlayer();
  } else {
    appendLog("<span class='loseOutcome'>You were defeated by " + currentEnemy.name + ".</span>");
    player.currentHP = player.HP;
    player.xp = Math.floor(player.xp * 0.9);
  }

  // Equipment drop chance.
  if (Math.random() < 0.1) { // 10% chance for an item drop
    let validItems = items.filter(item =>
      item.level <= player.currentArea.maxItemLevel &&
      parseInt(item.id) <= 4999   // Items above 5000 are reserved for boss loot
    );

    if (validItems.length > 0) {
      let randomItem = validItems[Math.floor(Math.random() * validItems.length)];
      let currentItem = player.equipment[randomItem.slot];

      if (!currentItem || randomItem.level > currentItem.level) {
        player.equipment[randomItem.slot] = randomItem;
        appendLog("You found a " + randomItem.name + " (Level " + randomItem.level +
                  ") for your " + randomItem.slot + " and equipped it!");
      } else {
        appendLog("You found a " + randomItem.name + ", but your current item is equal or better. Item discarded.");
      }
      
      updateUI();
      saveProgress();
    }
  } else {
    updateUI();
    saveProgress();
  }
}

// Game Loop
async function startGameLoop() {
  gameRunning = true;
  while (gameRunning) {
    // 2% chance to encounter a boss (0.02 probability)
    if (Math.random() < 0.02) {
      await simulateBossBattle();
    } else {
      await simulateCombat();
    }
    await delay(500);  // Pause before starting the next combat
  }
}

// function to stop the game.
function stopGameLoop() {
  gameRunning = false;
}

// Handle character creation.
function handleCharacterCreation(e) {
  //console.log("DEV:  I have entered character creation.");
  e.preventDefault();
  player.name = document.getElementById("playerName").value;
  player.race = document.getElementById("playerRace").value;
  player.class = document.getElementById("playerClass").value;
  player.gender = document.getElementById("playerGender").value;
  updateCharOptions();
  // Set base stats based on class.
  const base = classBaseStats[player.class];
  if (!base) {
    appendLog("Error: Selected class '" + player.class + "' is invalid.");
    return; // Stop execution if class is missing
  }
  player.HP = base.HP;
  player.ATK = base.ATK;
  player.DEF = base.DEF;
  player.MAG = base.MAG;
  player.MR = base.MR;
  player.currentHP = player.HP;

  // Assign pet if applicable
  assignPetToPlayer();

  // Set initial area.
  player.currentArea = findAreaForLevel(player.level);
  updateUI();
  saveProgress();
  document.getElementById("characterCreation").style.display = "none";
  document.getElementById("gameUI").style.display = "flex";
  appendLog("Welcome, " + player.name + "! Your adventure begins in " + player.currentArea.name + ".");
  startGameLoop();
}

// Initialize game after DOM and XML data are loaded.
window.addEventListener("DOMContentLoaded", () => {
  loadXMLData().then(() => {
    document.getElementById("characterForm").addEventListener("submit", handleCharacterCreation);
    // Resume saved game if available.
    if (loadProgress()) {
      document.getElementById("characterCreation").style.display = "none";
      document.getElementById("gameUI").style.display = "flex";
      appendLog("Welcome back, " + player.name + "!");
      startGameLoop();
    }
  }).catch(error => console.error("Error loading XML:", error));

  // Attach the reset event listener, ensuring the element exists:
  const resetButton = document.getElementById("resetButton");
  if (resetButton) {
    resetButton.addEventListener("click", function () {
      if (confirm("Are you sure you want to clear your save and start over?")) {
        localStorage.removeItem("idleRPGPlayer");
        window.location.reload(true);
        stopGameLoop();
        //console.log("DEV:  I have reset the game");
      }
    });
  }
});
