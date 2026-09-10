export const GAME_SCREEN = {
  SLOT: 'slot',
  DICE: 'dice',
  FISH: 'fish',
  POKER: 'poker',
  ROULETTE: 'roulette',
  BLACKJACK: 'blackjack',
  TIENLEN: 'tienlen'
};

export const FALLBACK_GAMES = [
  {
    key: 'SLOT',
    name: 'NỔ HŨ HOÀNG KIM',
    subtitle: 'Kho báu đang chờ bạn',
    enabled: true,
    sortOrder: 1,
    minBet: 1000,
    maxBet: 1000000,
    theoreticalRtp: 0.95,
    config: { jackpotBp: 2, bigWinBp: 50, smallWinBp: 1500, jackpotX: 500, bigWinX: 20, smallWinX: 2 },
    stats: { rounds: 53, bet: 53000000, payout: 42224000, houseNet: 10776000, actualRtp: 0.0622 }
  },
  {
    key: 'DICE',
    name: 'ĐẠI CHIẾN TÀI XỈU',
    subtitle: 'Thử vận may ngay',
    enabled: true,
    sortOrder: 2,
    minBet: 1000,
    maxBet: 10000000,
    theoreticalRtp: 0.99,
    config: { payoutX: 1.98 },
    stats: { rounds: 11, bet: 11000000, payout: 12497400, houseNet: -1497400, actualRtp: 1.8655 }
  },
  {
    key: 'FISH',
    name: 'BẮN CÁ ĐẠI DƯƠNG',
    subtitle: 'Chinh phục thủy cung',
    enabled: true,
    sortOrder: 3,
    minBet: 100,
    maxBet: 10000,
    theoreticalRtp: 0.98,
    config: { powerBonus: 1, rtp: 0.98 },
    stats: { rounds: 987, bet: 9870000, payout: 8968100, houseNet: 901900, actualRtp: 0.5903 }
  },
  {
    key: 'POKER',
    name: 'POKER TEXAS HOLD\'EM',
    subtitle: 'Đấu trí đỉnh cao',
    enabled: true,
    sortOrder: 4,
    minBet: 5000,
    maxBet: 50000000,
    theoreticalRtp: 0.975,
    config: { smallBlind: 5000, bigBlind: 10000, rakeBp: 250 },
    stats: { rounds: 42, bet: 42000000, payout: 40950000, houseNet: 1050000, actualRtp: 0.975 }
  },
  {
    key: 'ROULETTE',
    name: 'ROULETTE CHÂU ÂU',
    subtitle: 'Vòng quay hoàng gia',
    enabled: true,
    sortOrder: 5,
    minBet: 1000,
    maxBet: 10000000,
    theoreticalRtp: 0.973,
    config: { straightPayout: 36, dozenPayout: 3, outsidePayout: 2 },
    stats: { rounds: 88, bet: 26400000, payout: 25687200, houseNet: 712800, actualRtp: 0.973 }
  },
  {
    key: 'BLACKJACK',
    name: 'VIP BLACKJACK',
    subtitle: 'Xì Dách hoàng gia 3:2',
    enabled: true,
    sortOrder: 6,
    minBet: 50,
    maxBet: 2500000,
    theoreticalRtp: 0.995,
    config: { bjPayout: 1.5, dealerStand: 17, doubleAllowed: 1, surrenderAllowed: 1 },
    stats: { rounds: 64, bet: 16000000, payout: 15920000, houseNet: 80000, actualRtp: 0.995 }
  },
  {
    key: 'TIENLEN',
    name: 'TIẾN LÊN MIỀN NAM',
    subtitle: 'Phòng Đại Gia 4 người',
    enabled: true,
    sortOrder: 7,
    minBet: 10000,
    maxBet: 10000000,
    theoreticalRtp: 0.98,
    config: { betPerCard: 10000, chatHeoMulti: 2, tuQuyMulti: 4 },
    stats: { rounds: 72, bet: 28800000, payout: 28224000, houseNet: 576000, actualRtp: 0.98 }
  }
];

export function getMergedGames(remoteGames = []) {
  let localOverrides = {};
  try {
    localOverrides = JSON.parse(localStorage.getItem('goldzone_admin_games_override') || '{}');
  } catch (_) {}

  const list = [];
  const remoteMap = new Map((remoteGames || []).map(g => [g.key, g]));

  for (const fallback of FALLBACK_GAMES) {
    const remote = remoteMap.get(fallback.key);
    const override = localOverrides[fallback.key] || {};
    const base = remote ? { ...fallback, ...remote } : { ...fallback };
    list.push({ ...base, ...override });
    remoteMap.delete(fallback.key);
  }

  // Any other remote game not in fallback list
  for (const [, remote] of remoteMap) {
    const override = localOverrides[remote.key] || {};
    list.push({ ...remote, ...override });
  }

  return list.sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));
}

