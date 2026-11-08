import {
  canBank,
  canConfirmHold,
  canReroll,
  canRoll,
  selectionScore,
} from '../game/engine'
import type { MatchState } from '../game/types'

interface TurnControlsProps {
  state: MatchState
  humanTurn: boolean
  onRoll: () => void
  onConfirm: () => void
  onBank: () => void
  onReroll: () => void
  onNewMatch: () => void
  onRestart: () => void
}

export function TurnControls({
  state,
  humanTurn,
  onRoll,
  onConfirm,
  onBank,
  onReroll,
  onNewMatch,
  onRestart,
}: TurnControlsProps) {
  if (state.phase === 'game_over') {
    return (
      <div className="controls">
        <p className="banner win">{state.message}</p>
        <div className="actions">
          <button type="button" className="btn primary" onClick={onRestart}>
            Restart match
          </button>
          <button type="button" className="btn" onClick={onNewMatch}>
            Change target
          </button>
        </div>
      </div>
    )
  }

  const score = selectionScore(state)
  const disabled = !humanTurn
  const revealingBust = state.turnPhase === 'showing_bust'

  return (
    <div className="controls">
      {state.message && !revealingBust && (
        <p
          className={`banner ${state.lastEvent === 'bust' ? 'bust' : ''} ${
            state.lastEvent === 'hot_dice' ? 'hot' : ''
          }`}
        >
          {state.message}
        </p>
      )}

      <div className="actions">
        {!revealingBust && canRoll(state) && (
          <button
            type="button"
            className="btn primary"
            disabled={disabled}
            onClick={onRoll}
          >
            Roll {state.diceToRoll}
          </button>
        )}

        {state.turnPhase === 'need_select' && (
          <button
            type="button"
            className="btn primary"
            disabled={disabled || !canConfirmHold(state)}
            onClick={onConfirm}
          >
            Confirm hold{score !== null ? ` (+${score})` : ''}
          </button>
        )}

        {state.turnPhase === 'need_decision' && (
          <>
            <button
              type="button"
              className="btn primary"
              disabled={disabled || !canBank(state)}
              onClick={onBank}
            >
              Bank {state.turnScore}
            </button>
            <button
              type="button"
              className="btn"
              disabled={disabled || !canReroll(state)}
              onClick={onReroll}
            >
              Roll {state.diceToRoll} more
            </button>
          </>
        )}
      </div>
    </div>
  )
}
