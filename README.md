# EverQuest Idle RPG

An idle RPG based on the EverQuest universe. Written in Javascript, CSS and HTML. This code was developed using Microsoft Copilot (AI).

<img src="img/game_sample.png" alt="game sample img" width="80%"/>

## Table of Contents

- [Features](#Features)
- [Improvements](#Improvements)
- [Installation](#Installation)
- [Changelog](#Changelog)
- [License](#License)

## Features

- **16 Races and Classes:** All of the EverQuest race and class combinations are available.
- **Pets:** Beastlords, Magicians, and Necromancers can have pets fight for them.
- **Spells:** Bards, Clerics, Druids, Enchanters, Magicians, Necromancers, Paladins, Shadowknights, Shamans, and Wizards can all cast direct damage spells during combat.
- **Boss Encounters:** Bosses will appear occassionally in some zones. Can you handle the challenge?
- **Saved Progress:** Progress is saved to LocalStorage. Be careful when clearing cache or cookies, as it may be removed.
- **Easily Adjustable Content:** Almost everything can be adjusted. HP, ATK, DEF, MAG are all scaled, so that scaling value can be changed to make the game easier or more difficult. Boss encounter rate can be adjusted to fight them more often. Equipment, pets, enemies, spells, etc. can all be updated as well.

## Improvements

Possible future enhancements that could be made.

- **Offline Progress:** Allow for progress to be made offline.
- **Pets Casting:** Allow pets to cast spells. They already have the MAG stat in their XML to support this.
- **Songs:** Allow bards to play songs.
- **Updated Combat:** Allow pet classes to attack while their pet is alive instead of only if it dies.
- **Images:** Add Character and Enemy Images to the interface.
- **Improved UI:** Update the UI to look better.
- **Flavor Text:** Add to or update the games flavor text.

## Installation

Place the folders and files in your desired web-server directory. Navigate to the index.html to begin playing.

## Changelog

Major Updates:
- 06/16/25 <br/>
&emsp; - Modularized the Javascript code. Moving code blocks into separate files based on function. <br/>
&emsp; - Added damage range. So player, pet and enemy damage is not static. <br/>

<br/>
- 06/15/25 <br/>
&emsp; - Added Magic Resistance stat and capped resist at 75%. <br/>
&emsp; - Added Crit chance for players, pets, bosses, and regular enemies. This includes spell crits! <br/>
&emsp; - Changed equipment to use rarity and item modifiers along with item level <br/> 
&emsp; &nbsp;&nbsp;&nbsp;to create item score to help determine if an item should be replaced.<br/>

## License

- Public Domain. There is no copyright for this work.
- EverQuest is a trademark or registered trademark of ©2025 Daybreak Game Company LLC.
