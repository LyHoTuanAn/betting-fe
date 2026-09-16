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
  { value: 1000, label: '1K', color: '#2563eb', border: '#60a5fa' },
  { value: 5000, label: '5K', color: '#059669', border: '#34d399' },
  { value: 10000, label: '10K', color: '#0891b2', border: '#22d3ee' },
  { value: 25000, label: '25K', color: '#d97706', border: '#fbbf24' },
  { value: 100000, label: '100K', color: '#dc2626', border: '#f87171' },
  { value: 500000, label: '500K', color: '#7c3aed', border: '#a78bfa' },
  { value: 1000000, label: '1M', color: '#ca8a04', border: '#fde047' }
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

// Multiplayer Rooms Definition (Max 10 per room, playable from 6+)
export const ROULETTE_ROOMS = [
  {
    id: 'room-101',
    name: 'Phòng Hoàng Gia #101',
    minBet: 1000,
    maxBet: 5000000,
    playerCount: 8,
    maxPlayers: 10,
    status: 'playing', // 'playing' | 'waiting'
    tag: 'Sôi Động',
    badge: 'HOT',
    accentColor: '#f59e0b'
  },
  {
    id: 'room-102',
    name: 'Phòng VIP Đại Gia #102',
    minBet: 5000,
    maxBet: 10000000,
    playerCount: 6,
    maxPlayers: 10,
    status: 'playing',
    tag: 'Đại Gia',
    badge: 'VIP',
    accentColor: '#10b981'
  },
  {
    id: 'room-103',
    name: 'Phòng Monaco Châu Âu #103',
    minBet: 10000,
    maxBet: 25000000,
    playerCount: 9,
    maxPlayers: 10,
    status: 'playing',
    tag: 'Thượng Lưu',
    badge: 'PRO',
    accentColor: '#8b5cf6'
  },
  {
    id: 'room-104',
    name: 'Phòng Macau Luxury #104',
    minBet: 25000,
    maxBet: 50000000,
    playerCount: 4, // < 6 -> Chờ ghép người
    maxPlayers: 10,
    status: 'waiting',
    tag: 'Đang Ghép',
    badge: 'CHỜ',
    accentColor: '#ef4444'
  }
];

export const MOCK_NAMES = [
  'MinhVũ ⚜️', 'HoàngGia 💎', 'KimYến ✨', 'TuấnAnh 👑',
  'BảoTrâm ⭐', 'HảiĐăng 🌟', 'ĐứcThịnh 🔱', 'ThanhHằng 🌸',
  'QuốcBảo 🎖️', 'MaiPhương 💎', 'KhánhToàn 🦁', 'NgọcAnh 🍀'
];

export const AVATAR_LIST = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCXHazhsFoYtskfBBFCmR3HI6l5xu8K_3LOMZpY_ErMDhf-Pm0tFjf2ao5bFkoKwxdsydK7wiZ-Chj6srlhBavpRpxf3zHRBpvwcVkWRbf_uUOGpqy5mRQO_cVY9ybNauenQCY4j67LVWimJzp4TFtZ6lV434D4NsDG2wwEzrSH7DvcL9O5o1gsIuJN7FtcIe1-L14xW6XafnbyCgE10SdehgxavvfBDCNG3XPYaiGCPhpxxwuMB7cx',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBRAsQ50KA8XZRhom16rs-UfNZHonSFzCKpeqFpVWfM8GlR4k03dBupZGTVCuSU_VZzT8JO4bcnbk-yOvr6BoLXDW07zwUHwZZnG3dJlXILwNsuCs-7Pf2plL9og3tqsOd-WwNYHMuwOnwYLk7S0iUd106SeeVaVH8FT37fZyHBHNv3w7NN7-43qiooyl9ashly1Wu0_ANp_0mKkseqdtudjD4ZtoytuIQ-AwS7sduFoRCh7xWS-87R',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCZRv9nVhiiAb3cIqAMx3A_Px2PYBdlUHraojN2mKKQVjec7rAhpRy2UT034laTex38rshN9BaXcbw9LFNoXbjlticuZhbcbzItWsW0ZDQh0UoSV-ASis8Tp4JGF9enRbojvZZrhTVeuIbVLWN-Ue_OU31_YsmLrdOYkg4sEgRRr_lsGjXWrlUyLpS_9KBbZ0FtSBj_Da1mpHgkc5DDDMdNK8EaUL3JYFxez8m48dbYZvSDTGeOGxpT',
  '/assets/home-avatar.webp',
  '/assets/dice-avatar.webp'
];

/**
 * Generate room players list (includes hero player)
 */
export function generateRoomPlayers(room, heroUser, initialCount = null) {
  const targetCount = initialCount !== null ? initialCount : room.playerCount;
  const count = Math.min(10, Math.max(1, targetCount));
  
  const heroPlayer = {
    id: heroUser?.id || 'hero',
    name: heroUser?.name || 'Bạn (Hero)',
    avatar: heroUser?.avatar || AVATAR_LIST[0],
    isHero: true,
    isReady: true,
    vip: heroUser?.vip || 'VIP 3',
    balance: heroUser?.balance || 5000000
  };

  const otherCount = count - 1;
  const others = [];

  for (let i = 0; i < otherCount; i++) {
    const name = MOCK_NAMES[i % MOCK_NAMES.length];
    const avatar = AVATAR_LIST[(i + 1) % AVATAR_LIST.length];
    others.push({
      id: `bot-${i + 1}`,
      name,
      avatar,
      isHero: false,
      isReady: true,
      vip: `VIP ${Math.floor(Math.random() * 5) + 1}`,
      balance: (Math.floor(Math.random() * 50) + 5) * 100000
    });
  }

  return [heroPlayer, ...others];
}

/**
 * Generate simulated bets placed by other players in the room
 */
export function generateOtherRoomBets(players, minBet = 1000) {
  const otherBets = [];
  const betKeys = ['RED', 'BLACK', 'EVEN', 'ODD', '1st 12', '2nd 12', '3rd 12', '1-18', '19-36', '0', '7', '17', '24', '32', '8', '29', '11'];
  const chipLevels = [minBet, minBet * 2, minBet * 5, minBet * 10];

  players.filter(p => !p.isHero).forEach(player => {
    // Each bot places 1-3 random bets
    const betCount = Math.floor(Math.random() * 3) + 1;
    for (let b = 0; b < betCount; b++) {
      const target = betKeys[Math.floor(Math.random() * betKeys.length)];
      const amount = chipLevels[Math.floor(Math.random() * chipLevels.length)];
      otherBets.push({
        playerId: player.id,
        playerName: player.name,
        playerAvatar: player.avatar,
        target,
        amount
      });
    }
  });

  return otherBets;
}

/**
 * Calculate winners among all players in the room
 */
export function calculateRoomWinners(otherBets, winningNumber, heroPlayer, heroPayout) {
  const winnersMap = new Map();

  // Add Hero if won
  if (heroPayout > 0 && heroPlayer) {
    winnersMap.set(heroPlayer.id, {
      id: heroPlayer.id,
      name: heroPlayer.name,
      avatar: heroPlayer.avatar,
      isHero: true,
      payout: heroPayout
    });
  }

  // Calculate each other player's payout
  otherBets.forEach(b => {
    const singleBet = { [b.target]: b.amount };
    const winAmt = calculatePayout(singleBet, winningNumber);
    if (winAmt > 0) {
      const existing = winnersMap.get(b.playerId);
      if (existing) {
        existing.payout += winAmt;
      } else {
        winnersMap.set(b.playerId, {
          id: b.playerId,
          name: b.playerName,
          avatar: b.playerAvatar,
          isHero: false,
          payout: winAmt
        });
      }
    }
  });

  return Array.from(winnersMap.values()).sort((a, b) => b.payout - a.payout);
}
