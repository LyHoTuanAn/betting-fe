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

/** Ô xuất quân của từng nhà; phải khớp START_TILE bên server. */
export const START_TILE = { red: 1, green: 13, gold: 25, blue: 37 };
/** Hết vòng là 47 bước, cộng 6 bậc về đích. */
export const LAST_TRACK_PROGRESS = TRACK_TOTAL_TILES - 1;
export const MAX_PROGRESS = LAST_TRACK_PROGRESS + HOMERUN_STEPS;

/**
 * Quy đổi tiến độ sang vị trí hiển thị, mirror `tileOf`/`homerunStepOf` của
 * server. Dùng để vẽ từng bước chân khi ngựa chạy, vì server chỉ gửi điểm đầu
 * và điểm cuối chứ không gửi từng ô.
 */
export function horseViewAt(color, progress) {
  if (progress > LAST_TRACK_PROGRESS) {
    const step = progress - LAST_TRACK_PROGRESS;
    return {
      status: progress >= MAX_PROGRESS ? 'finished' : 'homerun',
      pos: null,
      step
    };
  }
  return {
    status: 'track',
    pos: ((START_TILE[color] - 1 + progress) % TRACK_TOTAL_TILES) + 1,
    step: progress
  };
}

/** Bàn cờ server gửi xuống, đổi sang đúng hình dạng mà phần vẽ đang dùng. */
export function boardToHorses(board) {
  const out = {};
  for (const color of ['red', 'green', 'gold', 'blue']) {
    out[color] = (board?.[color] || []).map(h => ({
      id: h.id,
      player: h.color,
      horseNum: h.index + 1,
      status: h.state,
      slot: h.index,
      pos: h.tile,
      step: h.state === 'track' ? h.progress : h.homerunStep,
      progress: h.progress
    }));
  }
  return out;
}

/** Bàn rỗng để vẽ lúc chưa vào phòng. */
export const emptyHorses = () => boardToHorses(
  Object.fromEntries(['red', 'green', 'gold', 'blue'].map(color => [
    color,
    Array.from({ length: 4 }, (_, index) => ({
      id: `${color}_${index}`, color, index, state: 'stable', progress: 0, tile: null, homerunStep: null
    }))
  ]))
);
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
