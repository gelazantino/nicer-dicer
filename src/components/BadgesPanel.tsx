import { KCD_BADGES_LEGEND } from '../game/kcdBadgesLegend'
import { LegendBadge } from './LegendBadge'

export function BadgesPanel() {
  return (
    <details className="rules badges-panel">
      <summary>Badges</summary>
      <p className="dice-legend-note">
        Full list from the{' '}
        <a
          href="https://kingdom-come-deliverance.fandom.com/wiki/Category:KCD2:_Badges"
          target="_blank"
          rel="noreferrer"
        >
          KCD2 wiki Badges category
        </a>
        . Appearance and descriptions only — badges are not used in this solo table yet.
        Matching tiers are required for badge play in KCD2 (tin, silver, or gold).
      </p>

      <div className="badge-legend-scroll" role="region" aria-label="Dice badges legend">
        <ul className="badge-legend-list">
          {KCD_BADGES_LEGEND.map((badge) => (
            <li key={badge.id} className="badge-legend-item">
              <LegendBadge badge={badge} />
              <div className="badge-legend-copy">
                <strong>{badge.name}</strong>
                <span className={`badge-tier badge-tier--${badge.tier}`}>
                  {badge.tier}
                </span>
                <p>{badge.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </details>
  )
}
