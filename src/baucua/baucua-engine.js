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

/**
 * Hệ số là TỔNG tiền nhận lại (đã gồm vốn), khớp từng đồng với configSchemas.BAUCUA
 * bên server. Đây chỉ là bộ mặc định để vẽ bảng tỉ lệ trước khi sảnh trả về
 * paytable thật — tiền thắng thua luôn do server chốt, không lấy từ đây.
 */
export const DEFAULT_PAYTABLE = { oneX: 2, twoX: 3, threeX: 4, tripleX: 31 };

/** "1 ăn N": phần lãi ròng, tức tổng nhận lại trừ đi vốn. */
export const netOdds = multiplier => Math.max(0, Math.round((multiplier - 1) * 100) / 100);

/**
 * Dựng lại chi tiết thắng thua để hiển thị, từ ba mặt xúc xắc server đã chốt.
 * Không có hàm lắc nào ở client: phòng lắc một lần cho cả bàn, client chỉ vẽ lại.
 * @param {Record<string, number>} bets - e.g. { BAU: 100, CUA: 200, TRIPLE_ANY: 50 }
 * @param {number[]} dice - Array of 3 mascot IDs [0..5]
 * @param {{oneX:number,twoX:number,threeX:number,tripleX:number}} [paytable]
 */
export function evaluateBauCuaWinnings(bets, dice, paytable = DEFAULT_PAYTABLE) {
  const mascotCounts = { NAI: 0, BAU: 0, GA: 0, CA: 0, CUA: 0, TOM: 0 };
  const stepX = [0, paytable.oneX, paytable.twoX, paytable.threeX];

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
        const payout = Math.floor(amount * paytable.tripleX);
        totalPayout += payout;
        details[key] = { bet: amount, count: 3, payout, win: payout - amount };
      } else {
        details[key] = { bet: amount, count: 0, payout: 0, win: -amount };
      }
    } else if (mascotCounts[key] !== undefined) {
      const matchCount = mascotCounts[key];
      if (matchCount > 0) {
        // Ăn theo SỐ MẶT trùng: ra hai con cua thì cửa cua nhận bậc twoX.
        const payout = Math.floor(amount * stepX[matchCount]);
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

