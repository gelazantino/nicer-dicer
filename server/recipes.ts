import type { MaterialTier } from './db.ts'

export type CraftOutput =
  | { kind: 'die'; dieTypeId: string; qty: number }
  | { kind: 'badge'; badgeId: string; qty: number }
  | { kind: 'material'; tier: MaterialTier; qty: number }

export type CraftRecipe = {
  id: string
  name: string
  description: string
  cost: Partial<Record<MaterialTier, number>>
  output: CraftOutput
}

/** Static craft recipes — materials in, die/badge/material out. */
export const CRAFT_RECIPES: CraftRecipe[] = [
  {
    id: 'wood-common-die',
    name: 'Whittle a common die',
    description: 'Carve an ordinary playing die from scrap wood.',
    cost: { wood: 2 },
    output: { kind: 'die', dieTypeId: 'commonest', qty: 1 },
  },
  {
    id: 'wood-odd-die',
    name: 'Whittle an odd die',
    description: 'A wooden oddity that rolls like the Odd die.',
    cost: { wood: 4 },
    output: { kind: 'die', dieTypeId: 'odd', qty: 1 },
  },
  {
    id: 'tin-fortune',
    name: 'Cast Tin Fortune',
    description: 'Pour tin into a Fortune badge mould.',
    cost: { tin: 3 },
    output: { kind: 'badge', badgeId: 'tin-fortune', qty: 1 },
  },
  {
    id: 'tin-might',
    name: 'Cast Tin Might',
    description: 'A tin Might badge for one extra die.',
    cost: { tin: 3, wood: 1 },
    output: { kind: 'badge', badgeId: 'tin-might', qty: 1 },
  },
  {
    id: 'silver-fortune',
    name: 'Forge Silver Fortune',
    description: 'Silver Fortune — reroll up to two dice.',
    cost: { silver: 3 },
    output: { kind: 'badge', badgeId: 'silver-fortune', qty: 1 },
  },
  {
    id: 'silver-might',
    name: 'Forge Silver Might',
    description: 'Silver Might badge from refined silver.',
    cost: { silver: 3, tin: 1 },
    output: { kind: 'badge', badgeId: 'silver-might', qty: 1 },
  },
  {
    id: 'gold-fortune',
    name: 'Forge Gold Fortune',
    description: 'Gold Fortune — reroll up to three dice.',
    cost: { gold: 3 },
    output: { kind: 'badge', badgeId: 'gold-fortune', qty: 1 },
  },
  {
    id: 'refine-tin',
    name: 'Refine tin from wood',
    description: 'Burn and purify wooden scrap into a scrap of tin.',
    cost: { wood: 5 },
    output: { kind: 'material', tier: 'tin', qty: 1 },
  },
  {
    id: 'refine-silver',
    name: 'Refine silver from tin',
    description: 'Smelt tin scraps into a flake of silver.',
    cost: { tin: 4 },
    output: { kind: 'material', tier: 'silver', qty: 1 },
  },
  {
    id: 'refine-gold',
    name: 'Refine gold from silver',
    description: 'Rare alchemy: silver into a speck of gold.',
    cost: { silver: 4 },
    output: { kind: 'material', tier: 'gold', qty: 1 },
  },
]

export function getRecipe(recipeId: string): CraftRecipe | undefined {
  return CRAFT_RECIPES.find((recipe) => recipe.id === recipeId)
}
