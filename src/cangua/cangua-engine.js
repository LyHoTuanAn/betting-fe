/**
 * Standard 15x15 Vietnamese Cờ Cá Ngựa (Ludo) Engine
 * 48 Outer Track Tiles + 24 Home Run Tiles (4x6) + 16 Stable Slots (4x4) + Center VIP Hub
 */

export const PLAYERS = {
  red: {
    id: 'red',
    name: 'Minh_TrùmVIP',
    title: 'Chuồng Đỏ',
    color: 'red',
    badge: '#ff5252',
    chips: 32100,
    startTrackIndex: 1,      // Ô xuất quân Đỏ (Ô 1)
    entryTrackIndex: 48,     // Ô vào đường về đích
    isHero: false
  },
  green: {
    id: 'green',
    name: 'Sơn_ĐạiGia',
    title: 'Chuồng Xanh Lá',
    color: 'green',
    badge: '#56e5a9',
    chips: 45000,
    startTrackIndex: 13,     // Ô xuất quân Xanh Lá (Ô 13)
    entryTrackIndex: 12,
    isHero: false
  },
  gold: {
    id: 'gold',
    name: 'BẠN (VIP)',
    title: 'Chuồng Vàng (Bạn)',
    color: 'gold',
    badge: '#ffc174',
    chips: 12450,
    startTrackIndex: 25,     // Ô xuất quân Vàng (Ô 25)
    entryTrackIndex: 24,
    isHero: true
  },
  blue: {
    id: 'blue',
    name: 'Kim_Kim99',
    title: 'Chuồng Lam',
    color: 'blue',
    badge: '#60a5fa',
    chips: 18400,
    startTrackIndex: 37,     // Ô xuất quân Lam (Ô 37)
    entryTrackIndex: 36,
    isHero: false
  }
};

export const TRACK_TOTAL_TILES = 48; // Chuẩn 48 ô chạy chung
export const HOMERUN_STEPS = 6;       // Chuẩn 6 bậc về đích (1..6)

export function createInitialHorses() {
  return {
    red: [
      { id: 'red_0', player: 'red', horseNum: 1, status: 'stable', slot: 0, pos: null, step: 0 },
      { id: 'red_1', player: 'red', horseNum: 2, status: 'stable', slot: 1, pos: null, step: 0 },
      { id: 'red_2', player: 'red', horseNum: 3, status: 'track', slot: null, pos: 9, step: 9 },
      { id: 'red_3', player: 'red', horseNum: 4, status: 'homerun', slot: null, pos: null, step: 4 }
    ],
    green: [
      { id: 'green_0', player: 'green', horseNum: 1, status: 'stable', slot: 0, pos: null, step: 0 },
      { id: 'green_1', player: 'green', horseNum: 2, status: 'stable', slot: 1, pos: null, step: 0 },
      { id: 'green_2', player: 'green', horseNum: 3, status: 'stable', slot: 2, pos: null, step: 0 },
      { id: 'green_3', player: 'green', horseNum: 4, status: 'track', slot: null, pos: 19, step: 7 }
    ],
    gold: [
      { id: 'gold_0', player: 'gold', horseNum: 1, status: 'stable', slot: 0, pos: null, step: 0, isReady: true },
      { id: 'gold_1', player: 'gold', horseNum: 2, status: 'stable', slot: 1, pos: null, step: 0 },
      { id: 'gold_2', player: 'gold', horseNum: 3, status: 'track', slot: null, pos: 32, step: 8 },
      { id: 'gold_3', player: 'gold', horseNum: 4, status: 'homerun', slot: null, pos: null, step: 5 }
    ],
    blue: [
      { id: 'blue_0', player: 'blue', horseNum: 1, status: 'stable', slot: 0, pos: null, step: 0 },
      { id: 'blue_1', player: 'blue', horseNum: 2, status: 'stable', slot: 1, pos: null, step: 0 },
      { id: 'blue_2', player: 'blue', horseNum: 3, status: 'finished', slot: 2, pos: null, step: 6 },
      { id: 'blue_3', player: 'blue', horseNum: 4, status: 'track', slot: null, pos: 43, step: 7 }
    ]
  };
}

/**
 * Web Audio FX for Cờ Cá Ngựa VIP
 */
export function playCanguaSound(type, soundEnabled = true) {
  if (!soundEnabled || typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.7, now);
    master.connect(ctx.destination);

    if (type === 'dice') {
      // Dice rattle and roll
      for (let i = 0; i < 5; i++) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(150 + Math.random() * 240, now + i * 0.05);
        g.gain.setValueAtTime(0.22, now + i * 0.05);
        g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.045);
        osc.connect(g);
        g.connect(master);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.045);
      }
    } else if (type === 'kick') {
      // Heavy slash + whoosh + coin explosion
      const noise = ctx.createOscillator();
      const ng = ctx.createGain();
      noise.type = 'sawtooth';
      noise.frequency.setValueAtTime(360, now);
      noise.frequency.exponentialRampToValueAtTime(70, now + 0.32);
      ng.gain.setValueAtTime(0.45, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      noise.connect(ng);
      ng.connect(master);
      noise.start(now);
      noise.stop(now + 0.32);

      [880, 1174, 1760, 2093].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + 0.14 + idx * 0.07);
        g.gain.setValueAtTime(0.22, now + 0.14 + idx * 0.07);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.14 + idx * 0.07 + 0.3);
        osc.connect(g);
        g.connect(master);
        osc.start(now + 0.14 + idx * 0.07);
        osc.stop(now + 0.14 + idx * 0.07 + 0.3);
      });
    } else if (type === 'move') {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.08);
      g.gain.setValueAtTime(0.22, now);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.connect(g);
      g.connect(master);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'win') {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        g.gain.setValueAtTime(0.3, now + idx * 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);
        osc.connect(g);
        g.connect(master);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.4);
      });
    }
  } catch (e) {}
}
