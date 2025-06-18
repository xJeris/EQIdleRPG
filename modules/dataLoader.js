/**********************************************************************************
 * dataLoader.js
 * Contains functions for loading and parsing XML data.
 ***********************************************************************************/

import { parseModifiers } from "./utils.js";

export function fetchXML(url) {
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

export function loadXMLData() {
  return Promise.all([
    fetchXML('data/areas.xml'),
    fetchXML('data/enemies.xml'),
    fetchXML('data/items.xml'),
    fetchXML('data/boss.xml'),
    fetchXML('data/spells.xml'),
    fetchXML('data/pets.xml'),
    fetchXML('data/milestones.xml')
  ])
    .then(([areasDoc, enemiesDoc, itemsDoc, bossesDoc, spellsDoc, petsDoc, milestonesDoc]) => {
      const areas = Array.from(areasDoc.getElementsByTagName("area")).map(area => ({
        id: area.getAttribute("id"),
        name: area.getAttribute("name"),
        recommendedLevel: parseInt(area.getAttribute("recommendedLevel")),
        maxLevel: parseInt(area.getAttribute("maxLevel")),
        maxItemLevel: parseInt(area.getAttribute("maxItemLevel")),
        description: area.getElementsByTagName("description")[0]?.textContent || "",
        allowedItemLevels: area.getElementsByTagName("allowedItemLevels")[0]?.textContent
          ?.split(",").map(lvl => parseInt(lvl.trim())).filter(lvl => !isNaN(lvl)) || []
      }));
      
      const enemies = Array.from(enemiesDoc.getElementsByTagName("enemy")).map(enemy => ({
        id: enemy.getAttribute("id"),
        name: enemy.getAttribute("name"),
        minLevel: parseInt(enemy.getAttribute("minLevel")),
        maxLevel: parseInt(enemy.getAttribute("maxLevel")),
        HP: parseInt(enemy.getAttribute("HP")),
        ATK: parseInt(enemy.getAttribute("ATK")),
        DEF: parseInt(enemy.getAttribute("DEF")),
        MR: parseInt(enemy.getAttribute("MR")),
        xp: parseInt(enemy.getAttribute("xp")),
        allowedAreas: Array.from(enemy.getElementsByTagName("area")).map(area => area.getAttribute("id"))
      }));
      
      const items = Array.from(itemsDoc.getElementsByTagName("item")).map(item => ({
        id: item.getAttribute("id"),
        name: item.getAttribute("name"),
        slot: item.getAttribute("slot"),
        level: parseInt(item.getAttribute("level")),
        rarity: item.getAttribute("rarity"),
        modifiers: parseModifiers(item.getAttribute("modifiers"))
      }));
      
      const bosses = Array.from(bossesDoc.getElementsByTagName("boss")).map(boss => ({
        id: boss.getAttribute("id"),
        name: boss.getAttribute("name"),
        area: boss.getAttribute("area"),
        level: parseInt(boss.getAttribute("level")),
        ATK: parseInt(boss.getAttribute("ATK")),
        DEF: parseInt(boss.getAttribute("DEF")),
        MR: parseInt(boss.getAttribute("MR")),
        HP: parseInt(boss.getAttribute("HP")),
        xp: parseInt(boss.getAttribute("xp")),
        drop1: boss.getAttribute("drop1"),
        drop2: boss.getAttribute("drop2"),
        drop3: boss.getAttribute("drop3")
      }));
      
      const spells = Array.from(spellsDoc.getElementsByTagName("spell")).map(spell => ({
        id: spell.getAttribute("id"),
        name: spell.getAttribute("name"),
        class: spell.getAttribute("class"),
        minLevel: parseInt(spell.getAttribute("minLevel")),
        maxLevel: parseInt(spell.getAttribute("maxLevel")),
        baseDamage: parseInt(spell.getAttribute("baseDamage"))
      }));
      
      const pets = Array.from(petsDoc.getElementsByTagName("pet")).map(pet => ({
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

      const milestones = Array.from(milestonesDoc.getElementsByTagName("milestone")).map(m => ({
        id: m.getAttribute("id"),
        name: m.getAttribute("name"),
        description: m.getAttribute("description"),
        type: m.getAttribute("type"),
        value: parseInt(m.getAttribute("value"))
      }));

      return { areas, enemies, items, bosses, spells, pets, milestones };
    })
    .catch(error => {
      console.error("Error loading XML data:", error);
      throw error;
    });
}
