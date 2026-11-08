import type { KcdBadgeLegend } from '../game/kcdBadgesLegend'

interface LegendBadgeProps {
  badge: KcdBadgeLegend
}

export function LegendBadge({ badge }: LegendBadgeProps) {
  return (
    <span
      className={`legend-badge legend-badge--${badge.tier}`}
      title={`${badge.name} (${badge.tier})`}
    >
      <img
        className="legend-badge-img"
        src={badge.imageUrl}
        alt=""
        width={48}
        height={48}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
      />
    </span>
  )
}
