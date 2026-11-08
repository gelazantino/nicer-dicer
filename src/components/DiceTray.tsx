import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { Face, TableDie } from '../game/types'

const PIP_MAP: Record<Face, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

const THROW_DURATION_MS = 700

interface Placement {
  x: number
  y: number
  rot: number
  delayMs: number
}

interface DiceTrayProps {
  roll: TableDie[]
  selected: string[]
  throwId: number
  interactive: boolean
  onToggle: (dieId: string) => void
}

/** Percent distance with tray aspect so horizontal gaps match vertical ones. */
function distance(a: Placement, b: Placement): number {
  const dx = (a.x - b.x) * 1.75
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

function scatter(count: number): Placement[] {
  const cols = count <= 3 ? count : count <= 4 ? 2 : 3
  const rows = Math.ceil(count / cols)
  const placements: Placement[] = []
  const minDist = count >= 5 ? 30 : 34

  for (let i = 0; i < count; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const cellW = 70 / cols
    const cellH = 62 / rows
    const baseX = 15 + cellW * (col + 0.5)
    const baseY = 18 + cellH * (row + 0.5)

    let next: Placement = {
      x: baseX,
      y: baseY,
      rot: -28 + Math.random() * 56,
      delayMs: i * 70 + Math.random() * 80,
    }

    for (let attempt = 0; attempt < 60; attempt++) {
      const jitterX = (Math.random() - 0.5) * cellW * 0.55
      const jitterY = (Math.random() - 0.5) * cellH * 0.55
      next = {
        x: Math.min(86, Math.max(14, baseX + jitterX)),
        y: Math.min(84, Math.max(16, baseY + jitterY)),
        rot: -32 + Math.random() * 64,
        delayMs: i * 70 + Math.random() * 80,
      }
      if (placements.every((p) => distance(p, next) >= minDist)) break
    }

    placements.push(next)
  }

  return placements
}

export function DiceTray({
  roll,
  selected,
  throwId,
  interactive,
  onToggle,
}: DiceTrayProps) {
  const [placements, setPlacements] = useState<Record<string, Placement>>({})
  const [throwing, setThrowing] = useState(false)
  const prevThrowId = useRef(throwId)

  useLayoutEffect(() => {
    if (roll.length === 0) {
      setPlacements({})
      setThrowing(false)
      prevThrowId.current = throwId
      return
    }

    if (throwId === prevThrowId.current) return

    prevThrowId.current = throwId
    const spots = scatter(roll.length)
    const next: Record<string, Placement> = {}
    roll.forEach((die, index) => {
      next[die.id] = spots[index]!
    })
    setPlacements(next)
    setThrowing(true)

    const maxDelay = spots.reduce((max, spot) => Math.max(max, spot.delayMs), 0)
    const timer = window.setTimeout(
      () => setThrowing(false),
      maxDelay + THROW_DURATION_MS + 40,
    )
    return () => window.clearTimeout(timer)
  }, [throwId, roll])

  if (roll.length === 0) {
    return <div className="dice-tray empty">No dice on the table</div>
  }

  return (
    <div className="dice-tray" role="group" aria-label="Dice">
      {roll.map((die) => {
        const spot = placements[die.id]
        if (!spot) return null

        const isSelected = selected.includes(die.id)
        const faceLabel = die.devilHead ? 'dragon head' : String(die.face)

        return (
          <button
            key={die.id}
            type="button"
            className={`die die-type--${die.dieTypeId} ${isSelected ? 'selected' : ''} ${
              throwing ? 'throwing' : ''
            }`}
            disabled={!interactive}
            onClick={() => onToggle(die.id)}
            aria-pressed={isSelected}
            aria-label={`Die showing ${faceLabel}${isSelected ? ', selected' : ''}`}
            title={die.dieTypeId}
            style={
              {
                '--x': `${spot.x}%`,
                '--y': `${spot.y}%`,
                '--rot': `${spot.rot}deg`,
                '--delay': `${spot.delayMs}ms`,
              } as CSSProperties
            }
          >
            {die.devilHead ? (
              <span className="die-dragon" aria-hidden="true">
                🐉
              </span>
            ) : (
              <span className="pips" data-face={die.face}>
                {Array.from({ length: 9 }, (_, pip) => (
                  <span
                    key={pip}
                    className={`pip ${PIP_MAP[die.face].includes(pip) ? 'on' : ''}`}
                  />
                ))}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
