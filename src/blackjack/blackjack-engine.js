const SUITS = [
  { name: 'spades', symbol: '♠', color: '#dfe2f1', isRed: false },
  { name: 'clubs', symbol: '♣', color: '#dfe2f1', isRed: false },
  { name: 'diamonds', symbol: '♦', color: '#ffb4ab', isRed: true },
  { name: 'hearts', symbol: '♥', color: '#ffb4ab', isRed: true }
];

const RANKS = [
  { rank: '2', value: 2 },
  { rank: '3', value: 3 },
  { rank: '4', value: 4 },
  { rank: '5', value: 5 },
  { rank: '6', value: 6 },
  { rank: '7', value: 7 },
  { rank: '8', value: 8 },
  { rank: '9', value: 9 },
  { rank: '10', value: 10 },
  { rank: 'J', value: 10 },
  { rank: 'Q', value: 10 },
  { rank: 'K', value: 10 },
  { rank: 'A', value: 11 }
];

export function createShoe(numDecks = 6) {
  const shoe = [];
  for (let d = 0; d < numDecks; d++) {
    for (const suit of SUITS) {
      for (const r of RANKS) {
        shoe.push({
          id: `${d}-${suit.name}-${r.rank}-${Math.random()}`,
          rank: r.rank,
          value: r.value,
          suit: suit.name,
          symbol: suit.symbol,
          color: suit.color,
          isRed: suit.isRed
        });
      }
    }
  }
  // Fisher-Yates shuffle
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  return shoe;
}

export function calculateHandScore(cards) {
  if (!cards || cards.length === 0) return { total: 0, isSoft: false, isBust: false, isBlackjack: false };

  let total = 0;
  let aces = 0;

  for (const card of cards) {
    if (card.rank === 'A') {
      aces += 1;
      total += 11;
    } else {
      total += card.value;
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  const isBust = total > 21;
  const isSoft = aces > 0 && total <= 21;
  const isBlackjack = cards.length === 2 && total === 21;

  return { total, isSoft, isBust, isBlackjack };
}

export function checkPerfectPairs(card1, card2) {
  if (!card1 || !card2) return { won: false, multiplier: 0, label: '' };
  if (card1.rank !== card2.rank) return { won: false, multiplier: 0, label: '' };

  if (card1.suit === card2.suit) {
    return { won: true, multiplier: 25, label: 'Perfect Pair (25:1)' };
  }
  if (card1.isRed === card2.isRed) {
    return { won: true, multiplier: 12, label: 'Colored Pair (12:1)' };
  }
  return { won: true, multiplier: 6, label: 'Mixed Pair (6:1)' };
}

const RANK_ORDER = {'2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14};

export function check21Plus3(card1, card2, dealerCard) {
  if (!card1 || !card2 || !dealerCard) return { won: false, multiplier: 0, label: '' };

  const cards = [card1, card2, dealerCard];
  const suits = cards.map(c => c.suit);
  const ranks = cards.map(c => RANK_ORDER[c.rank]).sort((a, b) => a - b);

  const isFlush = suits[0] === suits[1] && suits[1] === suits[2];
  const isStraight = (ranks[0] + 1 === ranks[1] && ranks[1] + 1 === ranks[2]) ||
    (ranks[0] === 2 && ranks[1] === 3 && ranks[2] === 14); // A-2-3
  const isThreeOfKind = ranks[0] === ranks[1] && ranks[1] === ranks[2];

  if (isThreeOfKind && isFlush) {
    return { won: true, multiplier: 100, label: 'Suited Trips (100:1)' };
  }
  if (isStraight && isFlush) {
    return { won: true, multiplier: 40, label: 'Straight Flush (40:1)' };
  }
  if (isThreeOfKind) {
    return { won: true, multiplier: 30, label: 'Three of a Kind (30:1)' };
  }
  if (isStraight) {
    return { won: true, multiplier: 10, label: 'Straight (10:1)' };
  }
  if (isFlush) {
    return { won: true, multiplier: 9, label: 'Flush (9:1)' };
  }

  return { won: false, multiplier: 0, label: '' };
}
