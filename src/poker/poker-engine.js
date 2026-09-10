// Poker Engine for Texas Hold'em (52 cards, Hand Evaluation & AI)

export const SUITS = [
  { key: 's', symbol: '♠', name: 'Bích', color: '#1a1f2c' },
  { key: 'h', symbol: '♥', name: 'Cơ', color: '#ef4444' },
  { key: 'd', symbol: '♦', name: 'Rô', color: '#f59e0b' },
  { key: 'c', symbol: '♣', name: 'Chuồn', color: '#10b981' }
];

export const RANKS = [
  { rank: 2, label: '2' },
  { rank: 3, label: '3' },
  { rank: 4, label: '4' },
  { rank: 5, label: '5' },
  { rank: 6, label: '6' },
  { rank: 7, label: '7' },
  { rank: 8, label: '8' },
  { rank: 9, label: '9' },
  { rank: 10, label: '10' },
  { rank: 11, label: 'J' },
  { rank: 12, label: 'Q' },
  { rank: 13, label: 'K' },
  { rank: 14, label: 'A' }
];

export const HAND_NAMES = {
  10: 'Thùng Phá Sảnh (Royal Flush)',
  9: 'Sảnh Rồng (Straight Flush)',
  8: 'Tứ Quý (Four of a Kind)',
  7: 'Cù Lũ (Full House)',
  6: 'Đồng Chất (Flush)',
  5: 'Sảnh (Straight)',
  4: 'Sám Cô (Three of a Kind)',
  3: 'Thú (Two Pair)',
  2: 'Một Đôi (One Pair)',
  1: 'Mậu Thầu (High Card)'
};

export function createDeck() {
  const deck = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      deck.push({
        suit: s.key,
        symbol: s.symbol,
        color: s.color,
        rank: r.rank,
        label: r.label,
        id: `${r.label}${s.key}`
      });
    }
  }
  return shuffle(deck);
}

export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Evaluate 5 to 7 cards, returning highest score & hand name
export function evaluate7Cards(cards) {
  if (!cards || cards.length < 5) return { score: 0, name: 'Chưa đủ bài', rankTier: 0 };
  
  // Generate all 5-card combinations
  const combos = getCombinations(cards, 5);
  let best = { score: -1, rankTier: 0, name: '', tieBreakers: [] };

  for (const combo of combos) {
    const evalResult = evaluate5Cards(combo);
    if (evalResult.score > best.score) {
      best = evalResult;
    }
  }
  return best;
}

function getCombinations(arr, k) {
  if (k === arr.length) return [arr];
  if (k === 1) return arr.map(e => [e]);
  const result = [];
  for (let i = 0; i <= arr.length - k; i++) {
    const head = arr.slice(i, i + 1);
    const tailCombos = getCombinations(arr.slice(i + 1), k - 1);
    for (const tail of tailCombos) {
      result.push(head.concat(tail));
    }
  }
  return result;
}

function evaluate5Cards(hand) {
  const sorted = [...hand].sort((a, b) => b.rank - a.rank);
  const ranks = sorted.map(c => c.rank);
  const suits = sorted.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);
  
  // Check Straight
  let isStraight = false;
  let straightHigh = 0;
  if (
    ranks[0] - ranks[1] === 1 &&
    ranks[1] - ranks[2] === 1 &&
    ranks[2] - ranks[3] === 1 &&
    ranks[3] - ranks[4] === 1
  ) {
    isStraight = true;
    straightHigh = ranks[0];
  } else if (ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2) {
    // Wheel straight A-2-3-4-5
    isStraight = true;
    straightHigh = 5;
  }

  // Count frequencies
  const counts = {};
  ranks.forEach(r => { counts[r] = (counts[r] || 0) + 1; });
  const countPairs = Object.entries(counts).map(([r, count]) => ({ rank: Number(r), count })).sort((a, b) => b.count - a.count || b.rank - a.rank);

  // 10: Royal Flush
  if (isFlush && isStraight && straightHigh === 14) {
    return { score: 1000000, rankTier: 10, name: HAND_NAMES[10], cards: sorted };
  }
  // 9: Straight Flush
  if (isFlush && isStraight) {
    return { score: 900000 + straightHigh, rankTier: 9, name: HAND_NAMES[9], cards: sorted };
  }
  // 8: Four of a Kind
  if (countPairs[0].count === 4) {
    return { score: 800000 + countPairs[0].rank * 100 + countPairs[1].rank, rankTier: 8, name: HAND_NAMES[8], cards: sorted };
  }
  // 7: Full House
  if (countPairs[0].count === 3 && countPairs[1].count === 2) {
    return { score: 700000 + countPairs[0].rank * 100 + countPairs[1].rank, rankTier: 7, name: HAND_NAMES[7], cards: sorted };
  }
  // 6: Flush
  if (isFlush) {
    const score = 600000 + ranks[0] * 10000 + ranks[1] * 1000 + ranks[2] * 100 + ranks[3] * 10 + ranks[4];
    return { score, rankTier: 6, name: HAND_NAMES[6], cards: sorted };
  }
  // 5: Straight
  if (isStraight) {
    return { score: 500000 + straightHigh, rankTier: 5, name: HAND_NAMES[5], cards: sorted };
  }
  // 4: Three of a Kind
  if (countPairs[0].count === 3) {
    return { score: 400000 + countPairs[0].rank * 100 + countPairs[1].rank + countPairs[2].rank, rankTier: 4, name: HAND_NAMES[4], cards: sorted };
  }
  // 3: Two Pair
  if (countPairs[0].count === 2 && countPairs[1].count === 2) {
    return { score: 300000 + countPairs[0].rank * 100 + countPairs[1].rank * 10 + countPairs[2].rank, rankTier: 3, name: HAND_NAMES[3], cards: sorted };
  }
  // 2: One Pair
  if (countPairs[0].count === 2) {
    return { score: 200000 + countPairs[0].rank * 100 + ranks.reduce((a, b) => a + b, 0), rankTier: 2, name: HAND_NAMES[2], cards: sorted };
  }
  // 1: High Card
  const score = 100000 + ranks[0] * 1000 + ranks[1] * 100 + ranks[2] * 10 + ranks[3];
  return { score, rankTier: 1, name: `${HAND_NAMES[1]} (${sorted[0].label})`, cards: sorted };
}

export const SEATS_CONFIG = [
  { id: 0, name: 'Viper99', role: 'BTN', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80', chips: 2840000, isHero: false, active: true },
  { id: 1, name: 'BluffMaster', role: '', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80', chips: 1420000, isHero: false, active: true },
  { id: 2, name: 'OldTimer', role: 'SB', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80', chips: 920000, isHero: false, active: true },
  { id: 3, name: 'CryptoKing', role: 'BB', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80', chips: 3100000, isHero: false, active: true },
  { id: 4, name: 'RiverRat', role: '', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop&q=80', chips: 0, isHero: false, active: false, sittingOut: true },
  { id: 5, name: 'Bạn (Hero)', role: '', avatar: '/assets/home-avatar.webp', chips: 4150000, isHero: true, active: true }
];
