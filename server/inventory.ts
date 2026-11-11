import { randomUUID } from 'node:crypto'
import {
  getDb,
  MATERIAL_TIERS,
  withTransaction,
  type MaterialTier,
} from './db.ts'
import { normalizeLoadout } from '../src/game/engine.ts'
import { getRecipe, type CraftRecipe } from './recipes.ts'

export type InventorySnapshot = {
  materials: Record<MaterialTier, number>
  dice: Array<{ dieTypeId: string; qty: number }>
  badges: Array<{ badgeId: string; qty: number }>
}

const STARTER_MATERIALS: Record<MaterialTier, number> = {
  wood: 8,
  tin: 3,
  silver: 0,
  gold: 0,
}

const STARTER_DICE: Array<{ dieTypeId: string; qty: number }> = [
  { dieTypeId: 'commonest', qty: 6 },
]

export function seedStarterInventory(userId: string): void {
  const db = getDb()
  for (const tier of MATERIAL_TIERS) {
    db.prepare(
      `INSERT INTO inventory_materials (user_id, tier, qty)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id, tier) DO UPDATE SET qty = excluded.qty`,
    ).run(userId, tier, STARTER_MATERIALS[tier])
  }
  for (const die of STARTER_DICE) {
    addDice(userId, die.dieTypeId, die.qty)
  }
}

export function getInventory(userId: string): InventorySnapshot {
  const db = getDb()
  const materials = emptyMaterials()
  const materialRows = db
    .prepare(
      'SELECT tier, qty FROM inventory_materials WHERE user_id = ?',
    )
    .all(userId) as Array<{ tier: MaterialTier; qty: number }>
  for (const row of materialRows) {
    materials[row.tier] = row.qty
  }

  const dice = (
    db
      .prepare(
        `SELECT die_type_id AS dieTypeId, qty
         FROM inventory_dice
         WHERE user_id = ? AND qty > 0
         ORDER BY die_type_id`,
      )
      .all(userId) as Array<{ dieTypeId: string; qty: number }>
  )

  const badges = (
    db
      .prepare(
        `SELECT badge_id AS badgeId, qty
         FROM inventory_badges
         WHERE user_id = ? AND qty > 0
         ORDER BY badge_id`,
      )
      .all(userId) as Array<{ badgeId: string; qty: number }>
  )

  return { materials, dice, badges }
}

export function craftRecipe(
  userId: string,
  recipeId: string,
): InventorySnapshot {
  const recipe = getRecipe(recipeId)
  if (!recipe) throw new InventoryError(404, 'Unknown recipe.')

  withTransaction(() => {
    assertCanAfford(userId, recipe)
    for (const [tier, qty] of Object.entries(recipe.cost) as Array<
      [MaterialTier, number]
    >) {
      if (!qty) continue
      deductMaterial(userId, tier, qty)
    }
    grantOutput(userId, recipe)
  })
  return getInventory(userId)
}

function assertCanAfford(userId: string, recipe: CraftRecipe): void {
  const materials = getInventory(userId).materials
  for (const [tier, qty] of Object.entries(recipe.cost) as Array<
    [MaterialTier, number]
  >) {
    if (!qty) continue
    if ((materials[tier] ?? 0) < qty) {
      throw new InventoryError(
        400,
        `Need ${qty} ${tier}, you have ${materials[tier] ?? 0}.`,
      )
    }
  }
}

function grantOutput(userId: string, recipe: CraftRecipe): void {
  const { output } = recipe
  if (output.kind === 'die') {
    addDice(userId, output.dieTypeId, output.qty)
    return
  }
  if (output.kind === 'badge') {
    addBadge(userId, output.badgeId, output.qty)
    return
  }
  addMaterial(userId, output.tier, output.qty)
}

export function addMaterial(
  userId: string,
  tier: MaterialTier,
  qty: number,
): void {
  if (qty <= 0) return
  getDb()
    .prepare(
      `INSERT INTO inventory_materials (user_id, tier, qty)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id, tier) DO UPDATE
       SET qty = inventory_materials.qty + excluded.qty`,
    )
    .run(userId, tier, qty)
}

function deductMaterial(
  userId: string,
  tier: MaterialTier,
  qty: number,
): void {
  const result = getDb()
    .prepare(
      `UPDATE inventory_materials
       SET qty = qty - ?
       WHERE user_id = ? AND tier = ? AND qty >= ?`,
    )
    .run(qty, userId, tier, qty)
  if (result.changes !== 1) {
    throw new InventoryError(400, `Not enough ${tier}.`)
  }
}

export function addDice(
  userId: string,
  dieTypeId: string,
  qty: number,
): void {
  if (qty <= 0) return
  getDb()
    .prepare(
      `INSERT INTO inventory_dice (id, user_id, die_type_id, qty)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, die_type_id) DO UPDATE
       SET qty = inventory_dice.qty + excluded.qty`,
    )
    .run(randomUUID(), userId, dieTypeId, qty)
}

export function addBadge(
  userId: string,
  badgeId: string,
  qty: number,
): void {
  if (qty <= 0) return
  getDb()
    .prepare(
      `INSERT INTO inventory_badges (id, user_id, badge_id, qty)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, badge_id) DO UPDATE
       SET qty = inventory_badges.qty + excluded.qty`,
    )
    .run(randomUUID(), userId, badgeId, qty)
}

function emptyMaterials(): Record<MaterialTier, number> {
  return { wood: 0, tin: 0, silver: 0, gold: 0 }
}

/** Ensure the user owns enough of each die type for the 6-slot loadout. */
export function assertUserOwnsLoadout(
  userId: string,
  loadout: string[],
): void {
  const normalized = normalizeLoadout(loadout)
  const needed = new Map<string, number>()
  for (const dieTypeId of normalized) {
    needed.set(dieTypeId, (needed.get(dieTypeId) ?? 0) + 1)
  }

  const owned = new Map(
    getInventory(userId).dice.map((row) => [row.dieTypeId, row.qty]),
  )

  for (const [dieTypeId, qty] of needed) {
    const have = owned.get(dieTypeId) ?? 0
    if (have < qty) {
      throw new InventoryError(
        400,
        `Need ${qty}× ${dieTypeId}, you have ${have}.`,
      )
    }
  }
}

export class InventoryError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'InventoryError'
  }
}
