import { KCD_DICE_LEGEND, type KcdDieLegend } from './kcdDiceLegend'
import type { Face } from './types'

export const ORDINARY_DIE_ID = 'commonest'

const FAIR_WEIGHTS: [number, number, number, number, number, number] = [
  16.7, 16.7, 16.7, 16.7, 16.7, 16.7,
]

export function getDieLegend(dieTypeId: string): KcdDieLegend | undefined {
  return KCD_DICE_LEGEND.find((die) => die.id === dieTypeId)
}

export function defaultHumanLoadout(): string[] {
  return Array.from({ length: 6 }, () => ORDINARY_DIE_ID)
}

/** Weighted face roll from legend percentages (fallback: fair). */
export function rollWeightedFace(dieTypeId: string): Face {
  const legend = getDieLegend(dieTypeId)
  const weights = legend?.weights ?? FAIR_WEIGHTS
  const total = weights.reduce((sum, w) => sum + w, 0)
  let cursor = Math.random() * total
  for (let i = 0; i < 6; i++) {
    cursor -= weights[i]!
    if (cursor <= 0) return (i + 1) as Face
  }
  return 6
}

export function isDevilHeadFace(dieTypeId: string, face: Face): boolean {
  return face === 1 && Boolean(getDieLegend(dieTypeId)?.devilHead)
}
