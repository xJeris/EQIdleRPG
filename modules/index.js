/**********************************************************************************
 * index.js
 * Entry point for the Idle RPG application.
 **********************************************************************************/

import { loadXMLData } from "./dataLoader.js";
import { appendLog, showMilestonesOverlay } from "./ui.js";
import { player, handleCharacterCreation } from "./character.js";
import { loadProgress, startGameLoop } from "./combat.js";
import { scalePlayerStats } from "./utils.js";
import { classBaseStats, devMode } from "./constants.js";

// When the DOM is loaded, initialize the game.
window.addEventListener("DOMContentLoaded", () => {
  // Load XML data (areas, enemies, items, bosses, spells, pets)
  loadXMLData()
    .then((data) => {
      // Store the loaded data globally so that other modules can access it.
      window.gameData = data;
      
      // Attach the character creation form event listener.
      const characterForm = document.getElementById("characterForm");
      if (characterForm) {
        characterForm.addEventListener("submit", function(event) {
          event.preventDefault(); // Prevents normal submission

          if (typeof devMode !== "undefined" && devMode === 1) {
            // Special behavior when in dev mode
            console.log("Dev mode active: executing alternative handler.");
            // Retrieve the level input value
            const levelInputElem = document.getElementById("levelInput");
            let selectedLevel = levelInputElem.value;
            selectedLevel = parseInt(selectedLevel, 10);

            // Retrieve and assign the class value from the form
            const classValue = document.getElementById("playerClass").value.trim();
            player.class = classValue;

            scalePlayerStats(selectedLevel);
          } else {
            // Standard character creation behavior
            handleCharacterCreation(event);
          }
        });
      }
      
      // Attach the reset button event listener.
      const resetButton = document.getElementById("resetButton");
      if (resetButton) {
        resetButton.addEventListener("click", function () {
          if (confirm("Are you sure you want to clear your save and start over?")) {
            localStorage.removeItem("idleRPGPlayer");
            window.location.reload(true);
            stopGameLoop();
          }
        });
      }

      // Check if devMode is defined and equals 1
      if (typeof devMode !== "undefined" && devMode === 1) {
        document.getElementById("devLevelContainer").style.display = "block";
        //console.log("devMode: " + devMode);
      }
      
      // Resume a saved game if it exists.
      if (loadProgress()) {
        document.getElementById("characterCreation").style.display = "none";
        document.getElementById("gameUI").style.display = "flex";
        appendLog("Welcome back, " + player.name + "!");
        startGameLoop();
      }
    })
    .catch((error) => console.error("Error loading XML:", error));

  // Attach the milestones button event listener.
  document.getElementById("milestonesButton").addEventListener("click", showMilestonesOverlay);
});
