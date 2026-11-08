import { DebugLoadoutPicker } from '../debug/DebugLoadoutPicker'
import type { TargetScore } from '../game/types'

export type PlayModeChoice = 'solo' | 'online'

interface MatchSetupProps {
  targetScore: TargetScore
  humanLoadout: string[]
  playMode: PlayModeChoice
  onlineAvailable: boolean
  joinCode: string
  onlineBusy: boolean
  onlineError: string | null
  onPlayModeChange: (mode: PlayModeChoice) => void
  onTargetChange: (target: TargetScore) => void
  onLoadoutSlotChange: (slot: number, dieTypeId: string) => void
  onFillLoadout: (dieTypeId: string) => void
  onFillRandomLoadout: () => void
  onJoinCodeChange: (code: string) => void
  onStartSolo: () => void
  onCreateOnline: () => void
  onJoinOnline: () => void
}

export function MatchSetup({
  targetScore,
  humanLoadout,
  playMode,
  onlineAvailable,
  joinCode,
  onlineBusy,
  onlineError,
  onPlayModeChange,
  onTargetChange,
  onLoadoutSlotChange,
  onFillLoadout,
  onFillRandomLoadout,
  onJoinCodeChange,
  onStartSolo,
  onCreateOnline,
  onJoinOnline,
}: MatchSetupProps) {
  return (
    <section className="panel setup">
      <h1 className="brand">Nicer Dicer</h1>
      <p className="lede">
        Kingdom Come–style Farkle. Solo vs AI, or online 1v1 with a room code.
      </p>

      <fieldset className="target-picker">
        <legend>Mode</legend>
        <label className={playMode === 'solo' ? 'active' : undefined}>
          <input
            type="radio"
            name="play-mode"
            checked={playMode === 'solo'}
            onChange={() => onPlayModeChange('solo')}
          />
          Solo vs AI
        </label>
        <label
          className={`${playMode === 'online' ? 'active' : ''} ${
            !onlineAvailable ? 'disabled' : ''
          }`}
        >
          <input
            type="radio"
            name="play-mode"
            checked={playMode === 'online'}
            disabled={!onlineAvailable}
            onChange={() => onPlayModeChange('online')}
          />
          Online PvP
        </label>
      </fieldset>

      {!onlineAvailable && (
        <p className="setup-hint">
          Online needs the match server. Run <code>npm run dev:server</code> and
          keep <code>VITE_WS_URL</code> set (e.g. <code>ws://127.0.0.1:8787</code>).
        </p>
      )}

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

      {playMode === 'solo' ? (
        <>
          <DebugLoadoutPicker
            loadout={humanLoadout}
            onSlotChange={onLoadoutSlotChange}
            onFillAll={onFillLoadout}
            onFillRandom={onFillRandomLoadout}
          />
          <button type="button" className="btn primary" onClick={onStartSolo}>
            Start match
          </button>
        </>
      ) : (
        <div className="online-setup">
          <p className="setup-hint">
            Fair dice only for v1. Create a room and share the code, or join a
            friend.
          </p>
          <button
            type="button"
            className="btn primary"
            disabled={!onlineAvailable || onlineBusy}
            onClick={onCreateOnline}
          >
            Create room
          </button>
          <div className="online-join-row">
            <input
              className="online-code-input"
              value={joinCode}
              maxLength={6}
              placeholder="ROOM CODE"
              spellCheck={false}
              autoCapitalize="characters"
              onChange={(event) => onJoinCodeChange(event.target.value)}
            />
            <button
              type="button"
              className="btn"
              disabled={!onlineAvailable || onlineBusy || joinCode.trim().length < 4}
              onClick={onJoinOnline}
            >
              Join
            </button>
          </div>
          {onlineError && <p className="online-error">{onlineError}</p>}
        </div>
      )}
    </section>
  )
}
