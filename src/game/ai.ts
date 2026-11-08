import { bestHold, scoreSelection } from './scoring'
import type { AiAction, Face, MatchState } from './types'

/**
 * Simple heuristic AI:
 * - Hold a strong legal subset (prefer hot dice / high score).
 * - Bank when turn total is healthy, few dice remain, or banking wins.
 * - Otherwise keep rolling.
 */
export function chooseAiAction(state: MatchState): AiAction | null {
  if (state.phase !== 'playing' || state.currentPlayer !== 'ai') return null

  if (state.turnPhase === 'need_roll') {
    return { type: 'roll' }
  }

  if (state.turnPhase === 'need_select') {
    const hold = chooseHold(
      state.roll.map((die) => die.face),
      state,
    )
    if (!hold) return null

    const holdIds = hold.indices.map((i) => state.roll[i]!.id)
    const nextId = holdIds.find((id) => !state.selected.includes(id))
    if (nextId !== undefined) {
      return { type: 'select', ids: [...state.selected, nextId] }
    }
    return { type: 'confirm' }
  }

  if (state.turnPhase === 'need_decision') {
    if (shouldBank(state)) return { type: 'bank' }
    return { type: 'reroll' }
  }

  return null
}

function chooseHold(
  roll: Face[],
  state: MatchState,
): { indices: number[]; score: number } | null {
  const best = bestHold(roll)
  if (!best) return null

  const allIndices = roll.map((_, i) => i)
  const allScore = scoreSelection(roll)
  if (allScore !== null && allScore >= 250) {
    return { indices: allIndices, score: allScore }
  }

  const projected = state.turnScore + best.score
  if (projected >= state.targetScore - state.scores.ai) {
    return best
  }

  return best
}

function shouldBank(state: MatchState): boolean {
  const { turnScore, diceToRoll, scores, targetScore } = state
  const aiScore = scores.ai

  if (aiScore + turnScore >= targetScore) return true
  if (turnScore >= 400) return true
  if (diceToRoll <= 2 && turnScore >= 250) return true
  if (diceToRoll <= 1 && turnScore >= 150) return true

  const lead = aiScore - scores.human
  if (lead >= 800 && turnScore >= 250) return true

  const behind = scores.human - aiScore
  if (behind >= 1000 && turnScore < 500 && diceToRoll >= 3) return false

  return turnScore >= 300 && diceToRoll <= 3
}
