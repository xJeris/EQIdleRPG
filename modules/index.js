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

            // Retrieve the input value
            const nameInput = document.getElementById("playerName");
            const classInput = document.getElementById("playerClass");
            const levelInput = document.getElementById("levelInput");

            // Save these values
            const playerName = nameInput.value.trim() || "Developer";
            const classValue = classInput.value.trim();
            const selectedLevel = parseInt(levelInput.value, 10);

            player.name = playerName;
            player.class = classValue;
            //let selectedLevel = levelInputElem.value;
            //selectedLevel = parseInt(selectedLevel, 10);

            // Retrieve and assign the class value from the form
            //const classValue = document.getElementById("playerClass").value.trim();
            //player.class = classValue;

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

// Player and Enemy Images / HP Bars
function safeSetImgSrc(imgEl, url, fallbackUrl) {
  fetch(url)                       // <-- GET, not HEAD
    .then(res => {
      if (!res.ok) throw new Error();
      return res.blob();
    })
    .then(blob => {
      // createObjectURL is a browser‐only URL pointing to the downloaded bytes
      imgEl.src = URL.createObjectURL(blob);
    })
    .catch(_ => {
      // either fetch failed or 404’d—use the good fallback
      imgEl.src = fallbackUrl;
    });
}

export function updateImageBar(player, enemy) {
  const bar = document.getElementById('imageBar');
  bar.innerHTML = '';
  bar.style.display = 'flex';

  // build one portrait (unitType = 'player' or 'enemy')
  function makePortrait({ imgSrc, onErrorSrc, label, currentHP, maxHP, unitType }) {
    const wrap = document.createElement('div');
    wrap.classList.add('portrait-wrapper', unitType);

    // 1) portrait image
    const icon = document.createElement('img');
    safeSetImgSrc(icon, imgSrc, onErrorSrc);
    wrap.appendChild(icon);

    // 2) stats column
    const stats = document.createElement('div');
    stats.className = 'stats';

    // 2a) name
    const nameEl = document.createElement('div');
    nameEl.className = 'name';
    nameEl.textContent = label;
    stats.appendChild(nameEl);

    // 2b) HP bar container
    const barOuter = document.createElement('div');
    barOuter.className = 'hp-bar';

    // 2c) HP fill
    const fill = document.createElement('div');
    fill.className = 'fill';
    // give it an id so we can update it later:
    fill.id = unitType === 'player' ? 'playerHPFill' : 'enemyHPFill';

    // initial width
    const pct = maxHP > 0
      ? Math.max(0, Math.min(1, currentHP / maxHP)) * 100
      : 0;
    fill.style.width = `${pct}%`;

    barOuter.appendChild(fill);
    stats.appendChild(barOuter);
    wrap.appendChild(stats);

    return wrap;
  }

  // 1) PLAYER
  const raceKey  = player.race.toLowerCase();
  const classKey = player.class.toLowerCase();
  bar.appendChild(makePortrait({
    imgSrc:     `img/${raceKey}_${classKey}.png`,
    onErrorSrc: 'img/player_default.png',
    label:  player?.name || 'Player',
    currentHP:  player.currentHP,
    maxHP:      player.maxHP,
    unitType:   'player'
  }));

  // 2) ENEMY (if known)
  if (enemy && enemy.name) {
    bar.appendChild(makePortrait({
      imgSrc:     `img/${enemy.key}.png`,
      onErrorSrc: 'img/mob_default.png',
      label:      enemy.name,
      currentHP:  enemy.currentHP,
      maxHP:      enemy.maxHP,
      unitType:   'enemy'
    }));
  }
}

/**
 * Call this whenever currentHP changes.
 * unitType: 'player' or 'enemy'
 */
export function refreshHPBar(unitType, currentHP, maxHP) {
  const id    = unitType === 'player' ? 'playerHPFill' : 'enemyHPFill';
  const fill  = document.getElementById(id);
  if (!fill) return;
  const pct = maxHP > 0
    ? Math.max(0, Math.min(1, currentHP / maxHP)) * 100
    : 0;
  fill.style.width = `${pct}%`;
}
