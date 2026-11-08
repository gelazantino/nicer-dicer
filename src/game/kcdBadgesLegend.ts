/** Appearance/legend data for KCD2 dice badges — not used for gameplay yet. */
export type BadgeTier = 'tin' | 'silver' | 'gold'

export interface KcdBadgeLegend {
  id: string
  name: string
  tier: BadgeTier
  description: string
  /** Local copy of the KCD2 wiki inventory icon. */
  imageUrl: string
}

export const KCD_BADGES_LEGEND: KcdBadgeLegend[] = [
  {
    id: 'tin-doppelganger',
    name: 'Tin Doppelganger badge',
    tier: 'tin',
    description:
      'Using it will double the score of your last roll. Can be used once per game.',
    imageUrl: '/badges/tin-doppelganger.webp',
  },
  {
    id: 'tin-headstart',
    name: 'Tin Headstart badge',
    tier: 'tin',
    description: 'You gain a small point lead at the start of the game.',
    imageUrl: '/badges/tin-headstart.webp',
  },
  {
    id: 'tin-defence',
    name: 'Tin Defence badge',
    tier: 'tin',
    description: "Use to cancel the effect of your opponent's tin badge.",
    imageUrl: '/badges/tin-defence.webp',
  },
  {
    id: 'tin-fortune',
    name: 'Tin Fortune badge',
    tier: 'tin',
    description:
      'After your throw, you can reroll a die of your choosing. Can be used once per game.',
    imageUrl: '/badges/tin-fortune.webp',
  },
  {
    id: 'tin-might',
    name: 'Tin Might badge',
    tier: 'tin',
    description:
      'Use it to add one extra die to your throw. Can be used once per game.',
    imageUrl: '/badges/tin-might.webp',
  },
  {
    id: 'tin-transmutation',
    name: 'Tin badge of transmutation',
    tier: 'tin',
    description:
      'After your throw, you can change a die of your choosing to a 3. Can be used once per game.',
    imageUrl: '/badges/tin-transmutation.webp',
  },
  {
    id: 'carpenter-advantage',
    name: "Carpenter's Advantage badge",
    tier: 'tin',
    description: 'You gain a new dice formation called the Cut, consisting of 3+5.',
    imageUrl: '/badges/carpenter-advantage.webp',
  },
  {
    id: 'tin-warlord',
    name: 'Tin Warlord badge',
    tier: 'tin',
    description:
      'Used to gain a quarter more points from your turn. Can be used once per game.',
    imageUrl: '/badges/tin-warlord.webp',
  },
  {
    id: 'tin-resurrection',
    name: 'Tin Resurrection badge',
    tier: 'tin',
    description:
      'After an unlucky throw, use this badge to throw again. Can be used once per game.',
    imageUrl: '/badges/tin-resurrection.webp',
  },
  {
    id: 'silver-doppelganger',
    name: 'Silver Doppelganger badge',
    tier: 'silver',
    description:
      'You double the score of your last throw. Can be used twice per game.',
    imageUrl: '/badges/silver-doppelganger.webp',
  },
  {
    id: 'silver-headstart',
    name: 'Silver Headstart badge',
    tier: 'silver',
    description: 'Use it to get a moderate point lead at the start of the game.',
    imageUrl: '/badges/silver-headstart.webp',
  },
  {
    id: 'silver-defence',
    name: 'Silver Defence badge',
    tier: 'silver',
    description:
      "Use to cancel the effect of your opponent's Silver badge in the game.",
    imageUrl: '/badges/silver-defence.webp',
  },
  {
    id: 'silver-swap-out',
    name: 'Silver Swap-out badge',
    tier: 'silver',
    description:
      'After your throw, you can reroll a die of your choosing. Can be used once per game.',
    imageUrl: '/badges/silver-swap-out.webp',
  },
  {
    id: 'silver-fortune',
    name: 'Silver Fortune badge',
    tier: 'silver',
    description:
      'After your throw, you can reroll up to 2 dice. Can be used once per game.',
    imageUrl: '/badges/silver-fortune.webp',
  },
  {
    id: 'silver-might',
    name: 'Silver Might badge',
    tier: 'silver',
    description:
      'Using it will allow you to roll one extra die. Can be used twice per game.',
    imageUrl: '/badges/silver-might.webp',
  },
  {
    id: 'silver-transmutation',
    name: 'Silver Transmutation badge',
    tier: 'silver',
    description:
      'After your throw, you can change a die of your choosing to a five. Can be used once per game.',
    imageUrl: '/badges/silver-transmutation.webp',
  },
  {
    id: 'executioner-advantage',
    name: "Executioner's Advantage badge",
    tier: 'silver',
    description:
      'You gain a new dice combination called The Gallows, which consists of 4, 5 and 6.',
    imageUrl: '/badges/executioner-advantage.webp',
  },
  {
    id: 'silver-warlord',
    name: 'Silver Warlord badge',
    tier: 'silver',
    description:
      'Using this badge will grant you 50% more points this round. Can be used once per game.',
    imageUrl: '/badges/silver-warlord.webp',
  },
  {
    id: 'silver-resurrection',
    name: 'Silver Resurrection badge',
    tier: 'silver',
    description:
      "When a throw doesn't go your way, use this badge to throw again. Can be used twice per game.",
    imageUrl: '/badges/silver-resurrection.webp',
  },
  {
    id: 'bird-king',
    name: "Bird king's badge",
    tier: 'silver',
    description:
      'The badge of the rightful king of the birds will allow you to roll an additional die. Can be used twice per game.',
    imageUrl: '/badges/bird-king.webp',
  },
  {
    id: 'gold-doppelganger',
    name: 'Gold Doppelganger badge',
    tier: 'gold',
    description:
      'Using this badge will double the point value of your last throw. Can be used three times per game.',
    imageUrl: '/badges/gold-doppelganger.webp',
  },
  {
    id: 'gold-headstart',
    name: 'Gold Headstart badge',
    tier: 'gold',
    description:
      'Using this badge will give you a large point lead at the start of the game.',
    imageUrl: '/badges/gold-headstart.webp',
  },
  {
    id: 'gold-defence',
    name: 'Gold Defence badge',
    tier: 'gold',
    description: "Use to cancel the effect of your opponent's gold badge.",
    imageUrl: '/badges/gold-defence.webp',
  },
  {
    id: 'gold-swap-out',
    name: 'Gold Swap-out badge',
    tier: 'gold',
    description:
      'After your throw, you can reroll two dice with the same value. Can be used once per game.',
    imageUrl: '/badges/gold-swap-out.webp',
  },
  {
    id: 'gold-fortune',
    name: 'Gold Fortune badge',
    tier: 'gold',
    description:
      'After your throw, you can reroll up to three dice. Can be used once per game.',
    imageUrl: '/badges/gold-fortune.webp',
  },
  {
    id: 'gold-might',
    name: 'Gold Might badge',
    tier: 'gold',
    description:
      'Using it will allow you to roll one extra die. Can be used three times per game.',
    imageUrl: '/badges/gold-might.webp',
  },
  {
    id: 'gold-transmutation',
    name: 'Gold Transmutation badge',
    tier: 'gold',
    description:
      'After your throw, change a die of your choosing to a 1. Can be used once per game.',
    imageUrl: '/badges/gold-transmutation.webp',
  },
  {
    id: 'priest-advantage',
    name: "Priest's Advantage badge",
    tier: 'gold',
    description:
      'You gain a new dice formation called The Eye, consisting of the values 1, 3 and 5.',
    imageUrl: '/badges/priest-advantage.webp',
  },
  {
    id: 'gold-warlord',
    name: 'Gold Warlord badge',
    tier: 'gold',
    description: 'You double the score of your turn. Can be used once per game.',
    imageUrl: '/badges/gold-warlord.webp',
  },
  {
    id: 'gold-resurrection',
    name: 'Gold Resurrection badge',
    tier: 'gold',
    description:
      'After an unlucky throw, you can throw again. Can be used three times per game.',
    imageUrl: '/badges/gold-resurrection.webp',
  },
  {
    id: 'gold-emperor',
    name: "Gold Emperor's badge",
    tier: 'gold',
    description:
      "Using this badge, you will gain triple points for every 1+1+1 dice combination. Emperors don't lose.",
    imageUrl: '/badges/gold-emperor.webp',
  },
  {
    id: 'gold-wedding',
    name: 'Gold Wedding badge',
    tier: 'gold',
    description:
      "A memento of Agnes and Olda's big day. Using it allows you to reroll up to three dice. Can be used once per game.",
    imageUrl: '/badges/gold-wedding.webp',
  },
  {
    id: 'gold-tyche',
    name: 'Gold Tyche badge',
    tier: 'gold',
    description:
      "If you roll three sixes in a game, you'll always earn double points for them.",
    imageUrl: '/badges/gold-tyche.webp',
  },
]
