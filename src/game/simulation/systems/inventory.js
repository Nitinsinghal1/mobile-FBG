import { INVENTORY_CONFIG, ARMOR_TIERS, RARITY_ORDER } from "../../content/items.js";

/**
 * Add item to inventory or equip if equipment type
 */
export function addToInventory(state, item, quantity = 1) {
  const next = structuredClone(state);
  
  if (!next.inventory) next.inventory = [];
  if (!next.equipped) next.equipped = {};
  
  // Equipment: auto-equip if slot empty or better rarity
  if (item.type === "weapon" || item.type === "outfit" || item.type === "armor") {
    const slot = item.type === "armor" ? "armor" : item.type;
    const current = next.equipped[slot];
    
    if (!current || isItemBetter(item, current)) {
      if (current) next.inventory.push(current); // Move old item to inventory
      next.equipped[slot] = structuredClone(item);
      next.toast = `Equipped: ${item.name}`;
      next.toastTimer = 2000;
      return next;
    }
  }
  
  // Consumables/stackable items
  if (item.stackable) {
    const existing = next.inventory.find(slot => slot.id === item.id && slot.type === item.type);
    if (existing) {
      existing.quantity = Math.min(
        (existing.quantity || 1) + quantity,
        INVENTORY_CONFIG.stackLimit[item.type] || 99
      );
    } else {
      next.inventory.push({
        ...structuredClone(item),
        quantity: quantity
      });
    }
  } else {
    // Non-stackable items
    for (let i = 0; i < quantity; i++) {
      if (next.inventory.length >= INVENTORY_CONFIG.maxSlots) {
        next.toast = `Inventory full! Dropped ${item.name}`;
        next.toastTimer = 2000;
        break;
      }
      next.inventory.push(structuredClone(item));
    }
  }
  
  return next;
}

/**
 * Compare item quality (rarity-based)
 */
function isItemBetter(newItem, currentItem) {
  const newRarity = RARITY_ORDER.indexOf(newItem.rarity || "common");
  const currentRarity = RARITY_ORDER.indexOf(currentItem.rarity || "common");
  
  if (newRarity !== currentRarity) return newRarity > currentRarity;
  
  // Same rarity: compare armor value
  if (newItem.armorValue && currentItem.armorValue) {
    return newItem.armorValue > currentItem.armorValue;
  }
  
  return false;
}

/**
 * Equip item from inventory
 */
export function equipItem(state, inventoryIndex) {
  const next = structuredClone(state);
  
  if (!next.equipped) next.equipped = {};
  if (!next.inventory || !next.inventory[inventoryIndex]) return next;
  
  const item = next.inventory[inventoryIndex];
  const slot = item.type === "armor" ? "armor" : item.type;
  
  // Swap: put current equipped into inventory if it exists
  const current = next.equipped[slot];
  if (current) {
    next.inventory[inventoryIndex] = structuredClone(current);
  } else {
    next.inventory.splice(inventoryIndex, 1);
  }
  
  next.equipped[slot] = structuredClone(item);
  next.toast = `Equipped: ${item.name}`;
  next.toastTimer = 2000;
  return next;
}

/**
 * Unequip item to inventory
 */
export function unequipItem(state, slot) {
  const next = structuredClone(state);
  
  if (!next.equipped?.[slot]) return next;
  if (!next.inventory) next.inventory = [];
  
  if (next.inventory.length >= INVENTORY_CONFIG.maxSlots) {
    next.toast = `Inventory full! Cannot unequip.`;
    next.toastTimer = 2000;
    return next;
  }
  
  const item = next.equipped[slot];
  next.inventory.push(structuredClone(item));
  delete next.equipped[slot];
  
  next.toast = `Unequipped: ${item.name}`;
  next.toastTimer = 2000;
  return next;
}

/**
 * Use consumable item (potion, crystal)
 */
export function useConsumable(state, inventoryIndex) {
  const next = structuredClone(state);
  
  if (!next.inventory || !next.inventory[inventoryIndex]) return next;
  
  const item = next.inventory[inventoryIndex];
  
  if (item.type === "consumable" || item.id === "aether-potion") {
    // Restore health
    const healed = Math.round(next.player.maxHp * (item.healing || 0.4));
    next.player.hp = Math.min(next.player.hp + healed, next.player.maxHp);
    next.toast = `Used ${item.name}. Restored ${healed} HP.`;
  } else if (item.type === "crafting" || item.id === "mana-crystal") {
    // Restore mana
    const restored = Math.round(next.player.maxMana * (item.manaRestore || 0.3));
    next.player.mana = Math.min(next.player.mana + restored, next.player.maxMana);
    next.toast = `Used ${item.name}. Restored ${restored} Mana.`;
  }
  
  next.toastTimer = 2000;
  
  // Remove consumed item
  if (item.quantity && item.quantity > 1) {
    next.inventory[inventoryIndex].quantity -= 1;
  } else {
    next.inventory.splice(inventoryIndex, 1);
  }
  
  next.stats.artifactsUsed = (next.stats.artifactsUsed || 0) + 1;
  return next;
}

/**
 * Drop item from inventory
 */
export function dropItem(state, inventoryIndex) {
  const next = structuredClone(state);
  
  if (!next.inventory || !next.inventory[inventoryIndex]) return next;
  
  const item = next.inventory[inventoryIndex];
  next.inventory.splice(inventoryIndex, 1);
  next.toast = `Dropped: ${item.name}`;
  next.toastTimer = 2000;
  return next;
}

/**
 * Sort inventory by rarity, type, then name
 */
export function sortInventory(state, sortBy = "rarity") {
  const next = structuredClone(state);
  
  if (!next.inventory) return next;
  
  next.inventory.sort((a, b) => {
    if (sortBy === "rarity") {
      const aRarity = RARITY_ORDER.indexOf(a.rarity || "common");
      const bRarity = RARITY_ORDER.indexOf(b.rarity || "common");
      return bRarity - aRarity; // Highest rarity first
    } else if (sortBy === "type") {
      return (a.type || "").localeCompare(b.type || "");
    } else if (sortBy === "name") {
      return (a.name || "").localeCompare(b.name || "");
    }
    return 0;
  });
  
  return next;
}

/**
 * Get filtered inventory by type
 */
export function getInventoryByType(inventory, type) {
  return (inventory || []).filter(item => item.type === type || item.id?.includes(type));
}

/**
 * Get inventory capacity display
 */
export function getInventoryStats(inventory) {
  const total = (inventory || []).length;
  const maxSlots = INVENTORY_CONFIG.maxSlots;
  const consumables = (inventory || []).filter(i => i.stackable).length;
  const equipment = (inventory || []).filter(i => !i.stackable).length;
  
  return {
    total,
    maxSlots,
    used: total,
    available: maxSlots - total,
    consumables,
    equipment,
    isFull: total >= maxSlots
  };
}

/**
 * Initialize equipped items for new character
 */
export function createInitialEquipment() {
  const armor = ARMOR_TIERS[0]; // Start with tattered robes
  return {
    armor: structuredClone(armor),
    weapon: null,
    outfit: null
  };
}

/**
 * Get total armor value from equipped items
 */
export function getTotalArmorValue(equipped = {}) {
  let total = 0;
  
  if (equipped.armor?.armorValue) total += equipped.armor.armorValue;
  if (equipped.outfit?.stats?.armor) total += equipped.outfit.stats.armor;
  if (equipped.weapon?.stats?.armor) total += equipped.weapon.stats.armor;
  
  return total;
}

/**
 * Apply item stat bonuses to player
 */
export function applyEquipmentBonuses(player, equipped = {}) {
  const next = structuredClone(player);
  let damageBonus = 1;
  let hpBonus = 0;
  let manaBonus = 0;
  
  Object.values(equipped).forEach(item => {
    if (!item?.stats) return;
    
    if (item.stats.damageMult) damageBonus *= item.stats.damageMult;
    if (item.stats.maxHp) hpBonus += item.stats.maxHp;
    if (item.stats.maxMana) manaBonus += item.stats.maxMana;
    if (item.stats.hpRegen) next.hpRegenRate = (next.hpRegenRate || 0) + item.stats.hpRegen;
  });
  
  // Apply bonuses (would be used in combat calculations)
  next.damageMultiplier = (next.damageMultiplier || 1) * damageBonus;
  next.maxHp = Math.round(next.maxHp + hpBonus);
  next.maxMana = Math.round(next.maxMana + manaBonus);
  
  return next;
}
