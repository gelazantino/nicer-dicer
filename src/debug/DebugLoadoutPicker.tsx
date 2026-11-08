import { KCD_DICE_LEGEND } from '../game/kcdDiceLegend'
import { ORDINARY_DIE_ID } from '../game/weightedRoll'
import { LegendDie } from '../components/LegendDie'
import { isDebugMode } from './debugMode'

interface DebugLoadoutPickerProps {
  loadout: string[]
  onSlotChange: (slot: number, dieTypeId: string) => void
  onFillAll: (dieTypeId: string) => void
  onFillRandom: () => void
}

export function DebugLoadoutPicker({
  loadout,
  onSlotChange,
  onFillAll,
  onFillRandom,
}: DebugLoadoutPickerProps) {
  if (!isDebugMode) return null

  return (
    <section className="debug-loadout" aria-label="Debug dice loadout">
      <div className="debug-loadout-header">
        <h2>Your dice (debug)</h2>
        <p>Pick up to six loaded dice for your rolls. AI still uses ordinary dice.</p>
      </div>

      <div className="debug-loadout-slots">
        {loadout.map((dieTypeId, slot) => {
          const legend =
            KCD_DICE_LEGEND.find((die) => die.id === dieTypeId) ??
            KCD_DICE_LEGEND.find((die) => die.id === ORDINARY_DIE_ID)!

          return (
            <label key={slot} className="debug-loadout-slot">
              <span className="slot-index">Slot {slot + 1}</span>
              <LegendDie die={legend} />
              <select
                value={dieTypeId}
                onChange={(event) => onSlotChange(slot, event.target.value)}
                aria-label={`Die type for slot ${slot + 1}`}
              >
                {KCD_DICE_LEGEND.map((die) => (
                  <option key={die.id} value={die.id}>
                    {die.name}
                  </option>
                ))}
              </select>
            </label>
          )
        })}
      </div>

      <div className="debug-loadout-actions">
        <button
          type="button"
          className="btn"
          onClick={() => onFillAll(ORDINARY_DIE_ID)}
        >
          Fill ordinary
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => onFillAll('lucky-playing')}
        >
          Fill lucky playing
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => onFillAll('least-common')}
        >
          Fill least common
        </button>
        <button type="button" className="btn" onClick={onFillRandom}>
          Fill random
        </button>
      </div>
    </section>
  )
}
