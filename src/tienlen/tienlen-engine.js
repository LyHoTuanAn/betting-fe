export const SUITS = [
  { name: 'spades', symbol: '♠', label: 'Bích', color: '#dfe2f1', isRed: false, order: 0 },
  { name: 'clubs', symbol: '♣', label: 'Chuồn', color: '#dfe2f1', isRed: false, order: 1 },
  { name: 'diamonds', symbol: '♦', label: 'Rô', color: '#ffb4ab', isRed: true, order: 2 },
  { name: 'hearts', symbol: '♥', label: 'Cơ', color: '#ffb4ab', isRed: true, order: 3 }
];

export const RANKS = [
  { rank: '3', order: 0 },
  { rank: '4', order: 1 },
  { rank: '5', order: 2 },
  { rank: '6', order: 3 },
  { rank: '7', order: 4 },
  { rank: '8', order: 5 },
  { rank: '9', order: 6 },
  { rank: '10', order: 7 },
  { rank: 'J', order: 8 },
  { rank: 'Q', order: 9 },
  { rank: 'K', order: 10 },
  { rank: 'A', order: 11 },
  { rank: '2', order: 12 }
];

export function createDeck() {
  const deck = [];
  for (const r of RANKS) {
    for (const s of SUITS) {
      deck.push({
        id: `${r.rank}-${s.name}`,
        rank: r.rank,
        rankOrder: r.order,
        suit: s.name,
        symbol: s.symbol,
        color: s.color,
        isRed: s.isRed,
        suitOrder: s.order,
        score: r.order * 4 + s.order
      });
    }
  }
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function deal4Players() {
  const deck = createDeck();
  return {
    hero: sortByRank(deck.slice(0, 13)),
    bot1: sortByRank(deck.slice(13, 26)),
    bot2: sortByRank(deck.slice(26, 39)),
    bot3: sortByRank(deck.slice(39, 52))
  };
}

export function sortByRank(cards) {
  return [...cards].sort((a, b) => a.score - b.score);
}

export function sortBySuit(cards) {
  return [...cards].sort((a, b) => {
    if (a.suitOrder !== b.suitOrder) return a.suitOrder - b.suitOrder;
    return a.rankOrder - b.rankOrder;
  });
}

export function analyzeCombination(cards) {
  if (!cards || cards.length === 0) return null;
  const sorted = [...cards].sort((a, b) => a.score - b.score);
  const len = sorted.length;
  const highestCard = sorted[len - 1];

  // 1 lá (Single)
  if (len === 1) {
    return {
      type: 'SINGLE',
      cards: sorted,
      highestCard,
      label: `Lá ${sorted[0].rank}${sorted[0].symbol}`,
      length: 1
    };
  }

  // Đôi (Pair)
  if (len === 2 && sorted[0].rankOrder === sorted[1].rankOrder) {
    return {
      type: 'PAIR',
      cards: sorted,
      highestCard,
      label: sorted[0].rank === '2' ? 'Đôi Heo' : `Đôi ${sorted[0].rank}`,
      length: 2
    };
  }

  // Sám cô (Triple)
  if (len === 3 && sorted[0].rankOrder === sorted[1].rankOrder && sorted[1].rankOrder === sorted[2].rankOrder) {
    return {
      type: 'TRIPLE',
      cards: sorted,
      highestCard,
      label: `Sám cô ${sorted[0].rank}`,
      length: 3
    };
  }

  // Tứ quý (Four of a kind)
  if (len === 4 && sorted.every(c => c.rankOrder === sorted[0].rankOrder)) {
    return {
      type: 'FOUR_OF_A_KIND',
      cards: sorted,
      highestCard,
      label: `Tứ Quý ${sorted[0].rank}`,
      length: 4
    };
  }

  // 3 Đôi Thông (3 consecutive pairs)
  if (len === 6) {
    const is3Pine =
      sorted[0].rankOrder === sorted[1].rankOrder &&
      sorted[2].rankOrder === sorted[3].rankOrder &&
      sorted[4].rankOrder === sorted[5].rankOrder &&
      sorted[0].rankOrder + 1 === sorted[2].rankOrder &&
      sorted[2].rankOrder + 1 === sorted[4].rankOrder &&
      sorted[4].rank !== '2'; // 2 cannot be in pine

    if (is3Pine) {
      return {
        type: 'THREE_PAIRS_PINE',
        cards: sorted,
        highestCard,
        label: `3 Đôi Thông (${sorted[0].rank}-${sorted[4].rank})`,
        length: 6
      };
    }
  }

  // 4 Đôi Thông (4 consecutive pairs)
  if (len === 8) {
    const is4Pine =
      sorted[0].rankOrder === sorted[1].rankOrder &&
      sorted[2].rankOrder === sorted[3].rankOrder &&
      sorted[4].rankOrder === sorted[5].rankOrder &&
      sorted[6].rankOrder === sorted[7].rankOrder &&
      sorted[0].rankOrder + 1 === sorted[2].rankOrder &&
      sorted[2].rankOrder + 1 === sorted[4].rankOrder &&
      sorted[4].rankOrder + 1 === sorted[6].rankOrder &&
      sorted[6].rank !== '2';

    if (is4Pine) {
      return {
        type: 'FOUR_PAIRS_PINE',
        cards: sorted,
        highestCard,
        label: `4 Đôi Thông (${sorted[0].rank}-${sorted[6].rank})`,
        length: 8
      };
    }
  }

  // Sảnh (Straight >= 3 cards, without 2)
  if (len >= 3) {
    let isStraight = true;
    for (let i = 0; i < len - 1; i++) {
      if (sorted[i].rank === '2' || sorted[i + 1].rank === '2') {
        isStraight = false;
        break;
      }
      if (sorted[i].rankOrder + 1 !== sorted[i + 1].rankOrder) {
        isStraight = false;
        break;
      }
    }
    if (isStraight) {
      return {
        type: 'STRAIGHT',
        cards: sorted,
        highestCard,
        label: `Sảnh ${len} lá (${sorted[0].rank} tới ${highestCard.rank})`,
        length: len
      };
    }
  }

  return null;
}

export function canBeat(candidateCombo, currentTableCombo) {
  if (!currentTableCombo) return !!candidateCombo;
  if (!candidateCombo) return false;

  const cur = currentTableCombo;
  const can = candidateCombo;

  // Cùng loại & cùng độ dài thông thường
  if (can.type === cur.type && can.length === cur.length) {
    return can.highestCard.score > cur.highestCard.score;
  }

  // LUẬT CHẶT ĐẶC BIỆT (Chặt Heo & Hàng):
  // 1. Chặt 1 Heo (Single 2):
  if (cur.type === 'SINGLE' && cur.highestCard.rank === '2') {
    if (can.type === 'THREE_PAIRS_PINE' || can.type === 'FOUR_OF_A_KIND' || can.type === 'FOUR_PAIRS_PINE') {
      return true;
    }
  }

  // 2. Chặt Đôi Heo (Pair 2):
  if (cur.type === 'PAIR' && cur.highestCard.rank === '2') {
    if (can.type === 'FOUR_OF_A_KIND' || can.type === 'FOUR_PAIRS_PINE') {
      return true;
    }
  }

  // 3. Chặt 3 Đôi Thông:
  if (cur.type === 'THREE_PAIRS_PINE') {
    if (can.type === 'THREE_PAIRS_PINE' && can.highestCard.score > cur.highestCard.score) return true;
    if (can.type === 'FOUR_OF_A_KIND' || can.type === 'FOUR_PAIRS_PINE') return true;
  }

  // 4. Chặt Tứ Quý:
  if (cur.type === 'FOUR_OF_A_KIND') {
    if (can.type === 'FOUR_OF_A_KIND' && can.highestCard.score > cur.highestCard.score) return true;
    if (can.type === 'FOUR_PAIRS_PINE') return true;
  }

  // 5. Chặt 4 Đôi Thông:
  if (cur.type === 'FOUR_PAIRS_PINE') {
    if (can.type === 'FOUR_PAIRS_PINE' && can.highestCard.score > cur.highestCard.score) return true;
  }

  return false;
}

// Bot AI helper: Find lowest valid play in hand
export function findBestMove(handCards, tableCombo) {
  const sorted = sortByRank(handCards);
  if (!tableCombo) {
    // Free play: try to play smallest combo or smallest single
    // Check pairs
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].rankOrder === sorted[i + 1].rankOrder && sorted[i].rank !== '2') {
        return [sorted[i], sorted[i + 1]];
      }
    }
    // Single smallest card
    return [sorted[0]];
  }

  // If table is Single
  if (tableCombo.type === 'SINGLE') {
    for (const card of sorted) {
      const single = analyzeCombination([card]);
      if (canBeat(single, tableCombo)) {
        return [card];
      }
    }
    return null;
  }

  // If table is Pair
  if (tableCombo.type === 'PAIR') {
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].rankOrder === sorted[i + 1].rankOrder) {
        const pair = analyzeCombination([sorted[i], sorted[i + 1]]);
        if (canBeat(pair, tableCombo)) {
          return [sorted[i], sorted[i + 1]];
        }
      }
    }
    // Try chop with four of a kind
    for (let i = 0; i <= sorted.length - 4; i++) {
      if (sorted.slice(i, i + 4).every(c => c.rankOrder === sorted[i].rankOrder)) {
        const four = analyzeCombination(sorted.slice(i, i + 4));
        if (canBeat(four, tableCombo)) return sorted.slice(i, i + 4);
      }
    }
    return null;
  }

  // If table is Straight
  if (tableCombo.type === 'STRAIGHT') {
    const len = tableCombo.length;
    // Find matching straight
    for (let i = 0; i <= sorted.length - len; i++) {
      const sub = sorted.slice(i, i + len);
      const str = analyzeCombination(sub);
      if (str && canBeat(str, tableCombo)) {
        return sub;
      }
    }
    return null;
  }

  return null;
}
