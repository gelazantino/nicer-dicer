import { formatWeight, KCD_DICE_LEGEND } from '../game/kcdDiceLegend'
import { LegendDie } from './LegendDie'

export function LoadedDicePanel() {
  return (
    <details className="rules loaded-dice">
      <summary>Loaded dice</summary>
      <p className="dice-legend-note">
        Full list from the{' '}
        <a
          href="https://kingdom-come-deliverance.fandom.com/wiki/Dice"
          target="_blank"
          rel="noreferrer"
        >
          KCD wiki Dice page
        </a>
        . Appearance and face weights only — this solo table still rolls ordinary fair dice.
        Devil’s head dice use a dragon face in place of 1 (wildcard for combos in KCD).
      </p>

      <div className="dice-weight-scroll" role="region" aria-label="Loaded dice weight table">
        <table className="dice-weight-table">
          <thead>
            <tr>
              <th scope="col">Look</th>
              <th scope="col">Die</th>
              <th scope="col">1</th>
              <th scope="col">2</th>
              <th scope="col">3</th>
              <th scope="col">4</th>
              <th scope="col">5</th>
              <th scope="col">6</th>
            </tr>
          </thead>
          <tbody>
            {KCD_DICE_LEGEND.map((die) => {
              const max = Math.max(...die.weights)
              return (
                <tr key={die.id}>
                  <td className="die-look">
                    <LegendDie die={die} />
                  </td>
                  <th scope="row">
                    <span className="die-name">{die.name}</span>
                    <span className="die-desc">{die.description}</span>
                  </th>
                  {die.weights.map((weight, index) => (
                    <td
                      key={index}
                      className={weight === max && weight > 16.7 ? 'hot-weight' : undefined}
                      title={
                        index === 0 && die.devilHead
                          ? `Dragon head · ${formatWeight(weight)}`
                          : formatWeight(weight)
                      }
                    >
                      {index === 0 && die.devilHead ? (
                        <span className="devil-weight">
                          <span aria-hidden="true" title="Dragon head">
                            🐉
                          </span>{' '}
                          {formatWeight(weight)}
                        </span>
                      ) : (
                        formatWeight(weight)
                      )}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </details>
  )
}
