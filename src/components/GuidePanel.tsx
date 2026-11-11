import type { MatchState } from '../game/types'
import { isDebugMode } from '../debug/debugMode'
import { DebugHud } from '../debug/DebugHud'
import { BadgesPanel } from './BadgesPanel'
import { LoadedDicePanel } from './LoadedDicePanel'
import { RulesPanel } from './RulesPanel'

interface GuidePanelProps {
  state: MatchState
}

export function GuidePanel({ state }: GuidePanelProps) {
  return (
    <section className="hub-section guide-panel">
      <h2 className="panel-title">Guide</h2>
      <p className="setup-hint">
        Rules, dice types, and badges — open a section when you need a refresher.
      </p>
      <div className="guide-stack">
        <RulesPanel />
        <LoadedDicePanel />
        <BadgesPanel />
        {isDebugMode ? <DebugHud state={state} /> : null}
      </div>
    </section>
  )
}
