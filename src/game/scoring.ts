import type { Face } from './types'

export function countFaces(dice: Face[]): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0]
  for (const face of dice) counts[face] += 1
  return counts
}

function cloneCounts(counts: number[]): number[] {
  return counts.slice()
}

function isEmpty(counts: number[]): boolean {
  return counts.every((n) => n === 0)
}

function ofAKindScore(face: number, count: number): number {
  const triple = face === 1 ? 1000 : face * 100
  if (count === 3) return triple
  if (count === 4) return triple * 2
  if (count === 5) return triple * 4
  if (count === 6) return triple * 8
  return 0
}

/**
 * Best score that uses every die in `counts`. Returns null if impossible.
 */
function bestScoreFromCounts(counts: number[]): number | null {
  if (isEmpty(counts)) return 0

  let best: number | null = null

  const consider = (remaining: number[], gained: number) => {
    const rest = bestScoreFromCounts(remaining)
    if (rest === null) return
    const total = gained + rest
    if (best === null || total > best) best = total
  }

  // Full straight 1-6
  if (counts.slice(1).every((n) => n >= 1)) {
    const next = cloneCounts(counts)
    for (let f = 1; f <= 6; f++) next[f] -= 1
    consider(next, 1500)
  }

  // Straight 1-5
  if ([1, 2, 3, 4, 5].every((f) => counts[f] >= 1)) {
    const next = cloneCounts(counts)
    for (const f of [1, 2, 3, 4, 5]) next[f] -= 1
    consider(next, 500)
  }

  // Straight 2-6
  if ([2, 3, 4, 5, 6].every((f) => counts[f] >= 1)) {
    const next = cloneCounts(counts)
    for (const f of [2, 3, 4, 5, 6]) next[f] -= 1
    consider(next, 750)
  }

  // N-of-a-kind (3+)
  for (let face = 1; face <= 6; face++) {
    if (counts[face] >= 3) {
      for (let take = 3; take <= counts[face]; take++) {
        const next = cloneCounts(counts)
        next[face] -= take
        consider(next, ofAKindScore(face, take))
      }
    }
  }

  // Single 1
  if (counts[1] >= 1) {
    const next = cloneCounts(counts)
    next[1] -= 1
    consider(next, 100)
  }

  // Single 5
  if (counts[5] >= 1) {
    const next = cloneCounts(counts)
    next[5] -= 1
    consider(next, 50)
  }

  return best
}

/** Score a selection if every die contributes; otherwise null. */
export function scoreSelection(dice: Face[]): number | null {
  if (dice.length === 0) return null
  return bestScoreFromCounts(countFaces(dice))
}

/** True if the roll has at least one scoring die/combination. */
export function hasScoringOption(dice: Face[]): boolean {
  if (dice.length === 0) return false
  // Any single 1 or 5, any triple+, or a straight subset.
  const counts = countFaces(dice)
  if (counts[1] > 0 || counts[5] > 0) return true
  for (let face = 1; face <= 6; face++) {
    if (counts[face] >= 3) return true
  }
  if ([1, 2, 3, 4, 5].every((f) => counts[f] >= 1)) return true
  if ([2, 3, 4, 5, 6].every((f) => counts[f] >= 1)) return true
  return false
}

/** All non-empty index subsets that form a legal scoring hold. */
export function legalHoldSubsets(dice: Face[]): number[][] {
  const n = dice.length
  const results: number[][] = []
  const totalMasks = 1 << n
  for (let mask = 1; mask < totalMasks; mask++) {
    const indices: number[] = []
    const faces: Face[] = []
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        indices.push(i)
        faces.push(dice[i]!)
      }
    }
    if (scoreSelection(faces) !== null) results.push(indices)
  }
  return results
}

/** Highest-scoring legal hold; prefers using all dice when scores tie (hot dice). */
export function bestHold(dice: Face[]): { indices: number[]; score: number } | null {
  const subsets = legalHoldSubsets(dice)
  if (subsets.length === 0) return null

  let bestIndices = subsets[0]!
  let bestScore = scoreSelection(bestIndices.map((i) => dice[i]!)) ?? 0

  for (const indices of subsets) {
    const score = scoreSelection(indices.map((i) => dice[i]!)) ?? 0
    if (
      score > bestScore ||
      (score === bestScore && indices.length > bestIndices.length)
    ) {
      bestScore = score
      bestIndices = indices
    }
  }

  return { indices: bestIndices, score: bestScore }
}
