import { useMemo } from 'react'
import { LegendDie } from './LegendDie'
import { KCD_DICE_LEGEND } from '../game/kcdDiceLegend'
import { ORDINARY_DIE_ID } from '../game/weightedRoll'

export type OwnedDie = { dieTypeId: string; qty: number }

interface OnlineLoadoutPickerProps {
  title: string
  loadout: string[]
  ownedDice: OwnedDie[]
  editable: boolean
  disabled?: boolean
  onSlotChange?: (slot: number, dieTypeId: string) => void
  onFillOrdinary?: () => void
}

function legendFor(dieTypeId: string) {
  return (
    KCD_DICE_LEGEND.find((die) => die.id === dieTypeId) ??
    KCD_DICE_LEGEND.find((die) => die.id === ORDINARY_DIE_ID)!
  )
}

function remainingOwned(
  ownedDice: OwnedDie[],
  loadout: string[],
  slot: number,
): Map<string, number> {
  const left = new Map(ownedDice.map((d) => [d.dieTypeId, d.qty]))
  loadout.forEach((dieTypeId, index) => {
    if (index === slot) return
    left.set(dieTypeId, (left.get(dieTypeId) ?? 0) - 1)
  })
  return left
}

export function OnlineLoadoutPicker({
  title,
  loadout,
  ownedDice,
  editable,
  disabled = false,
  onSlotChange,
  onFillOrdinary,
}: OnlineLoadoutPickerProps) {
  const ownedIds = useMemo(
    () => ownedDice.filter((d) => d.qty > 0).map((d) => d.dieTypeId),
    [ownedDice],
  )

  return (
    <section className="online-loadout" aria-label={title}>
      <div className="online-loadout-header">
        <h3 className="inventory-subtitle">{title}</h3>
        {editable && onFillOrdinary ? (
          <button
            type="button"
            className="btn btn-ghost"
            disabled={disabled || !ownedIds.includes(ORDINARY_DIE_ID)}
            onClick={onFillOrdinary}
          >
            Fill ordinary
          </button>
        ) : null}
      </div>

      <div className="online-loadout-slots">
        {loadout.map((dieTypeId, slot) => {
          const legend = legendFor(dieTypeId)
          const remaining = remainingOwned(ownedDice, loadout, slot)
          const options = ownedDice.filter((die) => {
            if (die.dieTypeId === dieTypeId) return true
            return (remaining.get(die.dieTypeId) ?? 0) > 0
          })

          return (
            <label key={slot} className="online-loadout-slot">
              <span className="slot-index">Slot {slot + 1}</span>
              <LegendDie die={legend} />
              {editable ? (
                <select
                  value={dieTypeId}
                  disabled={disabled || options.length === 0}
                  onChange={(event) =>
                    onSlotChange?.(slot, event.target.value)
                  }
                  aria-label={`Die type for slot ${slot + 1}`}
                >
                  {options.map((die) => {
                    const name =
                      KCD_DICE_LEGEND.find((d) => d.id === die.dieTypeId)
                        ?.name ?? die.dieTypeId
                    const left = remaining.get(die.dieTypeId) ?? 0
                    return (
                      <option key={die.dieTypeId} value={die.dieTypeId}>
                        {name} ({die.dieTypeId === dieTypeId ? left + 1 : left}{' '}
                        left)
                      </option>
                    )
                  })}
                </select>
              ) : (
                <span className="online-loadout-name">{legend.name}</span>
              )}
            </label>
          )
        })}
      </div>
    </section>
  )
}
