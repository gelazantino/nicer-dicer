import {
  legendPreviewFace,
  type KcdDieLegend,
} from '../game/kcdDiceLegend'

const PIP_MAP: Record<1 | 2 | 3 | 4 | 5 | 6, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

interface LegendDieProps {
  die: KcdDieLegend
}

export function LegendDie({ die }: LegendDieProps) {
  const face = legendPreviewFace(die)

  return (
    <span
      className={`legend-die legend-die--${die.id}`}
      title={`${die.name} appearance`}
      aria-hidden="true"
    >
      {face === 'devil' ? (
        <span className="legend-devil" title="Dragon head">
          🐉
        </span>
      ) : (
        <span className="legend-pips">
          {Array.from({ length: 9 }, (_, pip) => (
            <span
              key={pip}
              className={`legend-pip ${PIP_MAP[face].includes(pip) ? 'on' : ''}`}
            />
          ))}
        </span>
      )}
    </span>
  )
}
