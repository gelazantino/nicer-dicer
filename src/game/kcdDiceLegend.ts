/** Appearance/legend data from the KCD wiki Dice list — not used for gameplay rolls. */
export interface KcdDieLegend {
  id: string
  name: string
  description: string
  /** Face weights as percentages for sides 1–6. */
  weights: [number, number, number, number, number, number]
  /** Side 1 is a devil head instead of a pip 1. */
  devilHead?: boolean
}

export const KCD_DICE_LEGEND: KcdDieLegend[] = [
  {
    id: 'alfonse-devil',
    name: "Alfonse's devil die",
    description:
      "One of Alfonse's custom-made dice, this one having a devil's head instead of a one.",
    weights: [16.7, 16.7, 16.7, 16.7, 16.7, 16.7],
    devilHead: true,
  },
  {
    id: 'alfonse',
    name: "Alfonse's die",
    description: 'A playing die made specially for Alfonse.',
    weights: [38.5, 7.7, 7.7, 7.7, 15.4, 23],
  },
  {
    id: 'ambrose',
    name: "Ambrose's dice",
    description:
      'Dice that belonged to Ambrose, the Sasau tailor, and now maybe to me?',
    weights: [28.6, 21.4, 7.1, 7.1, 14.3, 21.4],
  },
  {
    id: 'another',
    name: 'Another die',
    description:
      'Who knows where it came from. It looks like a normal die, but blue.',
    weights: [15.4, 7.7, 7.7, 7.7, 46.2, 15.4],
  },
  {
    id: 'biased',
    name: 'Biased die',
    description:
      "A playing die someone tried to load to their advantage, but they didn't do a very good job.",
    weights: [25, 33.3, 8.3, 8.3, 16.7, 8.3],
  },
  {
    id: 'ci',
    name: 'Ci die',
    description: 'The second in the line of demonic playing dice.',
    weights: [13, 13, 13, 13, 13, 34.8],
  },
  {
    id: 'devils-head',
    name: "Devil's head",
    description:
      "A die that feels hot to the touch. In place of a one it has a devil's head, which is not something folk like to gaze upon…",
    weights: [16.7, 16.7, 16.7, 16.7, 16.7, 16.7],
    devilHead: true,
  },
  {
    id: 'misfortune',
    name: 'Die of misfortune',
    description:
      "A playing die that you'd be better off throwing as far away as possible.",
    weights: [4.5, 22.7, 22.7, 22.7, 22.7, 4.5],
  },
  {
    id: 'even',
    name: 'Even number die',
    description: 'Playing die loaded in favour of even numbers.',
    weights: [6.7, 26.7, 6.7, 26.7, 6.7, 26.7],
  },
  {
    id: 'fer',
    name: 'Fer die',
    description: 'The third and last in line of demonic dice.',
    weights: [13, 13, 13, 13, 13, 34.8],
  },
  {
    id: 'heavenly',
    name: 'Heavenly Kingdom die',
    description:
      'A miraculous playing die, sent from the Heavenly Kingdom to the kingdom of men.',
    weights: [36.8, 10.5, 10.5, 10.5, 10.5, 21],
  },
  {
    id: 'henry-beta',
    name: "Henry's beta die",
    description:
      "A playing die that Henry secretly made to bring him luck in love, which is why he'd rather not use it to gamble with.",
    weights: [11.1, 44.4, 11.1, 11.1, 11.1, 11.1],
  },
  {
    id: 'trinity',
    name: 'Holy Trinity die',
    description:
      'A blessed playing dice consecrated to the Holy Trinity in the hope of falling on three.',
    weights: [18.2, 22.7, 45.5, 4.5, 4.5, 4.5],
  },
  {
    id: 'lu',
    name: 'Lu die',
    description: 'The first of the line of demonic dice.',
    weights: [13, 13, 13, 13, 13, 34.8],
  },
  {
    id: 'lucky',
    name: 'Lucky die',
    description:
      "When fortune smiles on you, smile back. Otherwise you'll look suspicious.",
    weights: [27.3, 4.5, 9.1, 13.6, 18.2, 27.3],
  },
  {
    id: 'lucky-playing',
    name: 'Lucky playing die',
    description: "A playing die that brings luck more often than you'd expect.",
    weights: [33.3, 0, 5.6, 5.6, 33.3, 22.2],
  },
  {
    id: 'matthias',
    name: "Matthias' lucky dice",
    description:
      'Playing dice that brings Matthias luck. I heard he carved it himself. From bigger dice.',
    weights: [27.3, 4.6, 9.1, 13.6, 18.2, 27.3],
  },
  {
    id: 'odd',
    name: 'Odd die',
    description: 'Playing die loaded in favor of odd numbers.',
    weights: [26.7, 6.7, 26.7, 6.7, 26.7, 6.7],
  },
  {
    id: 'shrinking',
    name: 'Shrinking playing die',
    description:
      'One of the few properly loaded dice, loaded in favour of its holder.',
    weights: [22.2, 11.1, 11.1, 11.1, 11.1, 33.3],
  },
  {
    id: 'strip',
    name: 'Strip die',
    description: 'Legend has it that dice can strip more than one maiden.',
    weights: [25, 12.5, 12.5, 12.5, 18.8, 18.8],
  },
  {
    id: 'commonest',
    name: 'The commonest die',
    description: 'An exceptionally well-loaded die.',
    weights: [16.7, 16.7, 16.7, 16.7, 16.7, 16.7],
  },
  {
    id: 'least-common',
    name: 'The least common die',
    description: 'None.',
    weights: [66.6, 6.6, 6.6, 6.6, 6.6, 6.6],
  },
  {
    id: 'uncommon',
    name: 'Uncommon die',
    description: 'None.',
    weights: [16.7, 16.7, 16.7, 16.7, 16.7, 16.7],
  },
  {
    id: 'unpopular',
    name: 'Unpopular die',
    description:
      'Sometimes the dice fall well, sometimes not. This one probably not.',
    weights: [9.1, 27.3, 18.2, 18.2, 18.2, 9.1],
  },
]

export function formatWeight(value: number): string {
  return `${value}%`
}

/** Face shown on the legend die: heaviest side, or devil for devil-head dice. */
export function legendPreviewFace(die: KcdDieLegend): 1 | 2 | 3 | 4 | 5 | 6 | 'devil' {
  if (die.devilHead) return 'devil'
  let bestIndex = 0
  for (let i = 1; i < die.weights.length; i++) {
    if (die.weights[i]! > die.weights[bestIndex]!) bestIndex = i
  }
  return (bestIndex + 1) as 1 | 2 | 3 | 4 | 5 | 6
}
