import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import {
  ApiError,
  craftItem,
  fetchInventory,
  fetchRecipes,
  type CraftRecipe,
  type InventorySnapshot,
  type MaterialTier,
} from '../auth/api'
import { KCD_BADGES_LEGEND } from '../game/kcdBadgesLegend'
import { KCD_DICE_LEGEND } from '../game/kcdDiceLegend'

const MATERIAL_LABELS: Record<MaterialTier, string> = {
  wood: 'Wooden',
  tin: 'Tin',
  silver: 'Silver',
  gold: 'Gold',
}

const MATERIAL_ORDER: MaterialTier[] = ['wood', 'tin', 'silver', 'gold']

function dieName(id: string): string {
  return KCD_DICE_LEGEND.find((d) => d.id === id)?.name ?? id
}

function badgeName(id: string): string {
  return KCD_BADGES_LEGEND.find((b) => b.id === id)?.name ?? id
}

function describeOutput(recipe: CraftRecipe): string {
  const { output } = recipe
  if (output.kind === 'die') {
    return `${output.qty}× ${dieName(output.dieTypeId)}`
  }
  if (output.kind === 'badge') {
    return `${output.qty}× ${badgeName(output.badgeId)}`
  }
  return `${output.qty}× ${MATERIAL_LABELS[output.tier]}`
}

function describeCost(recipe: CraftRecipe): string {
  return MATERIAL_ORDER.filter((tier) => recipe.cost[tier])
    .map((tier) => `${recipe.cost[tier]} ${MATERIAL_LABELS[tier]}`)
    .join(', ')
}

function canAfford(
  inventory: InventorySnapshot,
  recipe: CraftRecipe,
): boolean {
  return MATERIAL_ORDER.every((tier) => {
    const need = recipe.cost[tier] ?? 0
    return (inventory.materials[tier] ?? 0) >= need
  })
}

export function InventoryPanel() {
  const { user, token } = useAuth()
  const [inventory, setInventory] = useState<InventorySnapshot | null>(null)
  const [recipes, setRecipes] = useState<CraftRecipe[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!token) return
    setBusy(true)
    setError(null)
    try {
      const [inv, recipePayload] = await Promise.all([
        fetchInventory(token),
        fetchRecipes(token),
      ])
      setInventory(inv)
      setRecipes(recipePayload.recipes)
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not load inventory.',
      )
    } finally {
      setBusy(false)
    }
  }, [token])

  useEffect(() => {
    if (!user || !token) {
      setInventory(null)
      setRecipes([])
      return
    }
    void refresh()
  }, [user, token, refresh])

  if (!user || !token) return null

  const onCraft = async (recipeId: string) => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const next = await craftItem(token, recipeId)
      setInventory(next)
      const recipe = recipes.find((r) => r.id === recipeId)
      setMessage(
        recipe
          ? `Crafted ${describeOutput(recipe)}.`
          : 'Crafted successfully.',
      )
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Craft failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel inventory-panel">
      <div className="inventory-header">
        <h2 className="panel-title">Inventory</h2>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={busy}
          onClick={() => void refresh()}
        >
          Refresh
        </button>
      </div>

      {error ? <p className="online-error">{error}</p> : null}
      {message ? <p className="inventory-ok">{message}</p> : null}

      {!inventory ? (
        <p className="setup-hint">{busy ? 'Loading…' : 'No inventory yet.'}</p>
      ) : (
        <>
          <div className="inventory-block">
            <h3 className="inventory-subtitle">Materials</h3>
            <ul className="inventory-list material-list">
              {MATERIAL_ORDER.map((tier) => (
                <li key={tier}>
                  <span>{MATERIAL_LABELS[tier]}</span>
                  <strong>{inventory.materials[tier] ?? 0}</strong>
                </li>
              ))}
            </ul>
          </div>

          <div className="inventory-block">
            <h3 className="inventory-subtitle">Dice</h3>
            {inventory.dice.length === 0 ? (
              <p className="setup-hint">No dice yet.</p>
            ) : (
              <ul className="inventory-list">
                {inventory.dice.map((die) => (
                  <li key={die.dieTypeId}>
                    <span>{dieName(die.dieTypeId)}</span>
                    <strong>×{die.qty}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="inventory-block">
            <h3 className="inventory-subtitle">Badges</h3>
            {inventory.badges.length === 0 ? (
              <p className="setup-hint">No badges yet — try crafting.</p>
            ) : (
              <ul className="inventory-list">
                {inventory.badges.map((badge) => (
                  <li key={badge.badgeId}>
                    <span>{badgeName(badge.badgeId)}</span>
                    <strong>×{badge.qty}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="inventory-block">
            <h3 className="inventory-subtitle">Craft</h3>
            <ul className="craft-list">
              {recipes.map((recipe) => {
                const affordable = canAfford(inventory, recipe)
                return (
                  <li key={recipe.id} className="craft-card">
                    <div>
                      <strong>{recipe.name}</strong>
                      <p>{recipe.description}</p>
                      <p className="craft-meta">
                        Cost: {describeCost(recipe) || '—'} →{' '}
                        {describeOutput(recipe)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn"
                      disabled={busy || !affordable}
                      onClick={() => void onCraft(recipe.id)}
                    >
                      Craft
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      )}
    </section>
  )
}
