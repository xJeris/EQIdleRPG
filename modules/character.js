/**********************************************************************************
 * character.js
 * Contains the global player object and character creation functions.
 **********************************************************************************/

import { assignPetToPlayer } from "./equipment.js";
import { findAreaForLevel, startGameLoop, saveProgress } from "./combat.js";
import { updateUI, appendLog } from "./ui.js";
import { classBaseStats, raceClassRestrictions } from "./constants.js";

export let player = {
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

// Returns an array of classes for the given race.
export function getAvailableClasses(selectedRace) {
  return raceClassRestrictions[selectedRace] || [];
}

// Returns an array of races that support a given class.
export function getAvailableRaces(selectedClass) {
  return Object.keys(raceClassRestrictions).filter(race => 
    raceClassRestrictions[race].includes(selectedClass)
  );
}

export function updateRaceSelection(raceList) {
  const raceDropdown = document.getElementById("playerRace");
  const currentValue = raceDropdown.value; // Save current selection
  raceDropdown.innerHTML = "";
  let defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "-- Select Race --";
  raceDropdown.appendChild(defaultOption);
  raceList.forEach(race => {
    let option = document.createElement("option");
    option.value = race;
    option.textContent = race;
    raceDropdown.appendChild(option);
  });
  // Restore selection if still valid
  if (raceList.includes(currentValue)) {
    raceDropdown.value = currentValue;
  } else {
    raceDropdown.value = "";
    player.race = ""; // Clear player.race if not valid
  }
}

export function updateClassSelection(classList) {
  const classDropdown = document.getElementById("playerClass");
  const currentValue = classDropdown.value; // Save current selection
  classDropdown.innerHTML = "";
  let defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "-- Select Class --";
  classDropdown.appendChild(defaultOption);
  classList.forEach(cls => {
    let option = document.createElement("option");
    option.value = cls;
    option.textContent = cls;
    classDropdown.appendChild(option);
  });
  // Restore selection if still valid
  if (classList.includes(currentValue)) {
    classDropdown.value = currentValue;
  } else {
    classDropdown.value = "";
    player.class = ""; // Clear player.class if not valid
  }
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
export function resetCharacterCreation() {
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

// Wrapper function to refresh character options
export function updateCharOptions() {
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

export function handleCharacterCreation(e) {
  e.preventDefault();
  player.name = document.getElementById("playerName").value;
  player.race = document.getElementById("playerRace").value;
  player.class = document.getElementById("playerClass").value;
  player.gender = document.getElementById("playerGender").value;
  updateCharOptions();
  const base = classBaseStats[player.class];
  if (!base) {
    appendLog("Error: Selected class '" + player.class + "' is invalid.");
    return;
  }
  player.HP = base.HP;
  player.ATK = base.ATK;
  player.DEF = base.DEF;
  player.MAG = base.MAG;
  player.MR = base.MR;
  player.currentHP = player.HP;
  
  // Assign pet if applicable.
  assignPetToPlayer();
  
  // Set initial area.
  player.currentArea = findAreaForLevel(player.level);
  updateUI(player, player.equipment, {});
  saveProgress();
  document.getElementById("characterCreation").style.display = "none";
  document.getElementById("gameUI").style.display = "flex";
  appendLog("Welcome, " + player.name + "! Your adventure begins in " + player.currentArea.name + ".");
  startGameLoop();
}
