import type { TargetScore } from '../game/types'

interface MatchSetupProps {
  targetScore: TargetScore
  onTargetChange: (target: TargetScore) => void
  onStart: () => void
}

export function MatchSetup({ targetScore, onTargetChange, onStart }: MatchSetupProps) {
  return (
    <section className="panel setup">
      <h1 className="brand">Nicer Dicer</h1>
      <p className="lede">Kingdom Come–style Farkle. Beat the AI to the target score.</p>

      <fieldset className="target-picker">
        <legend>Target score</legend>
        <label className={targetScore === 1500 ? 'active' : undefined}>
          <input
            type="radio"
            name="target"
            checked={targetScore === 1500}
            onChange={() => onTargetChange(1500)}
          />
          1500 — quick
        </label>
        <label className={targetScore === 4000 ? 'active' : undefined}>
          <input
            type="radio"
            name="target"
            checked={targetScore === 4000}
            onChange={() => onTargetChange(4000)}
          />
          4000 — classic
        </label>
      </fieldset>

      <button type="button" className="btn primary" onClick={onStart}>
        Start match
      </button>
    </section>
  )
}
