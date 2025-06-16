/**********************************************************************************
 * utils.js
 * Contains helper functions.
 ***********************************************************************************/

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
