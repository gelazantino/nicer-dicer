import type { MatchState } from '../game/types'

interface ScoreBoardProps {
  state: MatchState
  onRestart: () => void
}

export function ScoreBoard({ state, onRestart }: ScoreBoardProps) {
  const { scores, targetScore, turnScore, currentPlayer, phase } = state
  const playing = phase === 'playing'

  return (
    <header className="scoreboard">
      <div className={`player-score ${playing && currentPlayer === 'human' ? 'active' : ''}`}>
        <span className="label">You</span>
        <span className="value">{scores.human}</span>
      </div>

      <div className="match-meta">
        <span className="target">Target {targetScore}</span>
        {playing && (
          <span className="turn-total">
            Turn {turnScore}
            <span className="whose">{currentPlayer === 'human' ? ' · you' : ' · AI'}</span>
          </span>
        )}
        {(phase === 'playing' || phase === 'game_over') && (
          <button type="button" className="btn restart" onClick={onRestart}>
            Restart
          </button>
        )}
      </div>

      <div className={`player-score ${playing && currentPlayer === 'ai' ? 'active' : ''}`}>
        <span className="label">AI</span>
        <span className="value">{scores.ai}</span>
      </div>
    </header>
  )
}
