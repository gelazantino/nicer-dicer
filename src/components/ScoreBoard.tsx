import type { MatchState, PlayerId } from '../game/types'

interface ScoreBoardProps {
  state: MatchState
  localSeat?: PlayerId
  connectionHint?: string | null
  onRestart: () => void
}

function seatLabel(
  seat: PlayerId,
  mode: MatchState['mode'],
  localSeat?: PlayerId,
): string {
  if (mode === 'solo') return seat === 'p1' ? 'You' : 'AI'
  if (!localSeat) return seat === 'p1' ? 'P1' : 'P2'
  if (seat === localSeat) return 'You'
  return 'Opponent'
}

export function ScoreBoard({
  state,
  localSeat,
  connectionHint,
  onRestart,
}: ScoreBoardProps) {
  const { scores, targetScore, turnScore, currentPlayer, phase, mode } = state
  const playing = phase === 'playing'
  const left: PlayerId = 'p1'
  const right: PlayerId = 'p2'

  return (
    <header className="scoreboard">
      <div
        className={`player-score ${
          playing && currentPlayer === left ? 'active' : ''
        }`}
      >
        <span className="label">{seatLabel(left, mode, localSeat)}</span>
        <span className="value">{scores.p1}</span>
      </div>

      <div className="match-meta">
        <span className="target">Target {targetScore}</span>
        {playing && (
          <span className="turn-total">
            Turn {turnScore}
            <span className="whose">
              {' '}
              · {seatLabel(currentPlayer, mode, localSeat).toLowerCase()}
            </span>
          </span>
        )}
        {connectionHint && <span className="online-conn-hint">{connectionHint}</span>}
        {(phase === 'playing' || phase === 'game_over') && (
          <button type="button" className="btn restart" onClick={onRestart}>
            Restart
          </button>
        )}
      </div>

      <div
        className={`player-score ${
          playing && currentPlayer === right ? 'active' : ''
        }`}
      >
        <span className="label">{seatLabel(right, mode, localSeat)}</span>
        <span className="value">{scores.p2}</span>
      </div>
    </header>
  )
}
