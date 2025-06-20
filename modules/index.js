/**********************************************************************************
 * index.js
 * Entry point for the Idle RPG application.
 **********************************************************************************/

import { loadXMLData } from "./dataLoader.js";
import { appendLog } from "./ui.js";
import { handleCharacterCreation } from "./character.js";
import { loadProgress, startGameLoop } from "./combat.js";
import { player } from "./character.js";
import { showMilestonesOverlay } from "./ui.js";

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
        characterForm.addEventListener("submit", handleCharacterCreation);
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
