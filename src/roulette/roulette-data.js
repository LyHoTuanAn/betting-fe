// European Roulette 0-36 Data & Rules

export const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

// Physical European Wheel Sequence
export const WHEEL_SEQUENCE = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
  24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

export const ROW_3 = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];
export const ROW_2 = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
export const ROW_1 = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];

export function getNumberColor(num) {
  if (num === 0 || num === '0') return 'green';
  return RED_NUMBERS.includes(Number(num)) ? 'red' : 'black';
}

export const CHIP_PRESETS = [
  { value: 1000, label: '1K', color: '#3b82f6', border: '#60a5fa' },
  { value: 5000, label: '5K', color: '#10b981', border: '#34d399' },
  { value: 10000, label: '10K', color: '#f59e0b', border: '#fbbf24' },
  { value: 25000, label: '25K', color: '#ef4444', border: '#f87171' },
  { value: 100000, label: '100K', color: '#8b5cf6', border: '#a78bfa' },
  { value: 500000, label: '500K', color: '#ec4899', border: '#f472b6' }
];

export function calculatePayout(bets, winningNumber) {
  let totalWin = 0;
  const num = Number(winningNumber);
  const color = getNumberColor(num);

  for (const [key, amount] of Object.entries(bets)) {
    if (amount <= 0) continue;

    // Single number bet (0 to 36) -> 36:1 payout
    if (!isNaN(key) && Number(key) === num) {
      totalWin += amount * 36;
    }
    // Dozens (1st 12, 2nd 12, 3rd 12) -> 3:1 payout
    else if (key === '1st 12' && num >= 1 && num <= 12) {
      totalWin += amount * 3;
    } else if (key === '2nd 12' && num >= 13 && num <= 24) {
      totalWin += amount * 3;
    } else if (key === '3rd 12' && num >= 25 && num <= 36) {
      totalWin += amount * 3;
    }
    // 1-18 (Low) -> 2:1
    else if (key === '1-18' && num >= 1 && num <= 18) {
      totalWin += amount * 2;
    }
    // 19-36 (High) -> 2:1
    else if (key === '19-36' && num >= 19 && num <= 36) {
      totalWin += amount * 2;
    }
    // EVEN -> 2:1
    else if (key === 'EVEN' && num > 0 && num % 2 === 0) {
      totalWin += amount * 2;
    }
    // ODD -> 2:1
    else if (key === 'ODD' && num > 0 && num % 2 !== 0) {
      totalWin += amount * 2;
    }
    // RED -> 2:1
    else if (key === 'RED' && color === 'red') {
      totalWin += amount * 2;
    }
    // BLACK -> 2:1
    else if (key === 'BLACK' && color === 'black') {
      totalWin += amount * 2;
    }
  }

  return totalWin;
}
