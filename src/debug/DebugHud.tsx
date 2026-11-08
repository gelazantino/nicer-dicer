import { useState } from 'react'
import { isDebugMode } from './debugMode'
import type { MatchState } from '../game/types'
import { getDieLegend } from '../game/weightedRoll'

interface DebugHudProps {
  state: MatchState
}

/** Lightweight debug overlay — expand with tools as needed. */
export function DebugHud({ state }: DebugHudProps) {
  const [open, setOpen] = useState(true)

  if (!isDebugMode) return null

  const loadoutSummary = state.humanLoadout
    .map((id) => getDieLegend(id)?.name ?? id)
    .join(', ')

  return (
    <aside
      className={`debug-hud ${open ? 'is-open' : 'is-collapsed'}`}
      aria-label="Debug panel"
    >
      <button
        type="button"
        className="debug-hud-toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="debug-hud-title">Debug</span>
        <span className="debug-hud-chevron" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
      </button>

      {open && (
        <dl className="debug-hud-grid">
          <dt>phase</dt>
          <dd>{state.phase}</dd>
          <dt>turn</dt>
          <dd>{state.turnPhase}</dd>
          <dt>player</dt>
          <dd>{state.currentPlayer}</dd>
          <dt>turnScore</dt>
          <dd>{state.turnScore}</dd>
          <dt>dice</dt>
          <dd>{state.roll.length}</dd>
          <dt>throwId</dt>
          <dd>{state.throwId}</dd>
          <dt>event</dt>
          <dd>{state.lastEvent ?? '—'}</dd>
          <dt>loadout</dt>
          <dd title={loadoutSummary}>{state.humanLoadout.length} slots</dd>
        </dl>
      )}
    </aside>
  )
}
