export function RulesPanel() {
  return (
    <details className="rules">
      <summary>How to play</summary>
      <ul>
        <li>Roll six dice. Set aside at least one scoring result, then bank or reroll the rest.</li>
        <li>Single 1 = 100, single 5 = 50. Three of a kind = face × 100 (three 1s = 1000).</li>
        <li>Four / five / six of a kind double the triple each step (×2 / ×4 / ×8).</li>
        <li>Straights: 1–5 = 500, 2–6 = 750, 1–6 = 1500.</li>
        <li>No scoring dice on a roll → bust; you lose that turn’s points.</li>
        <li>Use every die in a roll → hot dice; roll all six again with the turn total still at risk.</li>
        <li>First to the target score wins.</li>
      </ul>
    </details>
  )
}
