import { MASCOT_LIST } from './BauCuaIcons.jsx';

/**
 * Mascot IDs:
 * 0: NAI (Deer)
 * 1: BAU (Gourd)
 * 2: GA (Rooster)
 * 3: CA (Fish)
 * 4: CUA (Crab)
 * 5: TOM (Shrimp)
 */

export const BAUCUA_KEYS = ['NAI', 'BAU', 'GA', 'CA', 'CUA', 'TOM', 'TRIPLE_ANY'];

export const TRIPLE_MULTIPLIER = 30; // 1 ăn 30

/**
 * Generate a fair 3-dice roll result
 */
export function rollBauCuaDice() {
  const d1 = Math.floor(Math.random() * 6);
  const d2 = Math.floor(Math.random() * 6);
  const d3 = Math.floor(Math.random() * 6);
  return [d1, d2, d3];
}

/**
 * Evaluate winnings based on bets and rolled dice
 * @param {Record<string, number>} bets - e.g. { BAU: 100, CUA: 200, TRIPLE_ANY: 50 }
 * @param {number[]} dice - Array of 3 mascot IDs [0..5]
 * @returns {{
 *   totalBet: number,
 *   totalPayout: number,
 *   netWin: number,
 *   isWin: number,
 *   isJackpot: boolean,
 *   isTriple: boolean,
 *   mascotCounts: Record<string, number>,
 *   winningKeys: string[],
 *   details: Record<string, { bet: number, count: number, payout: number, win: number }>
 * }}
 */
export function evaluateBauCuaWinnings(bets, dice) {
  const mascotCounts = { NAI: 0, BAU: 0, GA: 0, CA: 0, CUA: 0, TOM: 0 };
  
  dice.forEach(id => {
    const mascot = MASCOT_LIST[id];
    if (mascot && mascotCounts[mascot.key] !== undefined) {
      mascotCounts[mascot.key]++;
    }
  });

  const isTriple = dice[0] === dice[1] && dice[1] === dice[2];
  const winningKeys = [];
  
  Object.keys(mascotCounts).forEach(key => {
    if (mascotCounts[key] > 0) {
      winningKeys.push(key);
    }
  });

  if (isTriple) {
    winningKeys.push('TRIPLE_ANY');
  }

  let totalBet = 0;
  let totalPayout = 0;
  const details = {};

  Object.entries(bets).forEach(([key, amount]) => {
    if (!amount || amount <= 0) return;
    totalBet += amount;

    if (key === 'TRIPLE_ANY') {
      if (isTriple) {
        // 1 ăn 30: Trả vốn + 30 lần tiền cược = 31 * amount
        const payout = amount * (TRIPLE_MULTIPLIER + 1);
        totalPayout += payout;
        details[key] = { bet: amount, count: 3, payout, win: payout - amount };
      } else {
        details[key] = { bet: amount, count: 0, payout: 0, win: -amount };
      }
    } else if (mascotCounts[key] !== undefined) {
      const matchCount = mascotCounts[key];
      if (matchCount > 0) {
        // 1 con trúng: ăn 1:1 (trả vốn + 1x = 2x)
        // 2 con trúng: ăn 1:2 (trả vốn + 2x = 3x)
        // 3 con trúng: ăn 1:3 (trả vốn + 3x = 4x)
        const payout = amount * (matchCount + 1);
        totalPayout += payout;
        details[key] = { bet: amount, count: matchCount, payout, win: payout - amount };
      } else {
        details[key] = { bet: amount, count: 0, payout: 0, win: -amount };
      }
    }
  });

  const netWin = totalPayout - totalBet;

  return {
    totalBet,
    totalPayout,
    netWin,
    isWin: totalPayout > 0,
    isJackpot: isTriple && (bets.TRIPLE_ANY > 0 || (details[MASCOT_LIST[dice[0]]?.key]?.bet > 0)),
    isTriple,
    mascotCounts,
    winningKeys,
    details
  };
}

/**
 * Generate simulated table bets to make the room feel alive
 */
export function generateRandomTableBets() {
  const baseTable = {
    NAI: 1200 + Math.floor(Math.random() * 3500),
    BAU: 3500 + Math.floor(Math.random() * 8000),
    GA: 800 + Math.floor(Math.random() * 2500),
    CA: 2100 + Math.floor(Math.random() * 4500),
    CUA: 4500 + Math.floor(Math.random() * 9000),
    TOM: 1800 + Math.floor(Math.random() * 4000),
    TRIPLE_ANY: 500 + Math.floor(Math.random() * 1500),
  };
  return baseTable;
}
