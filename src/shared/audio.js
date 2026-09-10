let globalVolume = (() => {
  try {
    const v = parseFloat(localStorage.getItem('goldzone_volume') ?? '0.8');
    return isNaN(v) ? 0.8 : Math.max(0, Math.min(1, v));
  } catch {
    return 0.8;
  }
})();

let sharedAudioCtx = null;

function getOrCreateAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

/**
 * Mở khóa âm thanh sau cử chỉ đầu tiên của người dùng. Dùng lại đúng một
 * AudioContext dùng chung — trình duyệt chỉ cho mỗi trang khoảng 6 context,
 * nên tạo mới theo từng cú click sẽ làm cạn hạn mức và giết luôn tiếng game.
 */
export const unlockAudioContext = () => {
  const ctx = getOrCreateAudioContext();
  return ctx ? ctx.state : null;
};

export const getSoundVolume = () => globalVolume;

export const setSoundVolume = (vol) => {
  globalVolume = Math.max(0, Math.min(1, typeof vol === 'number' ? vol : parseFloat(vol) || 0));
  try {
    localStorage.setItem('goldzone_volume', String(globalVolume));
  } catch {}
  window.dispatchEvent(new CustomEvent('goldzone:volume', {detail: globalVolume}));
};

export const playTestSound = (volume = globalVolume) => {
  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const vol = typeof volume === 'number' ? Math.max(0, Math.min(1, volume)) : globalVolume;
    if (vol <= 0.001) return;

    const master = ctx.createGain();
    master.gain.setValueAtTime(vol, now);
    master.connect(ctx.destination);

    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      gain.gain.setValueAtTime(0.18, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.22);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.22);
    });
  } catch (e) {}
};

export const playCelebrationAudio = (type, soundEnabled) => {
  if (!soundEnabled || globalVolume <= 0.001) return;
  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(globalVolume, now);
    master.connect(ctx.destination);

    if (type === 'jackpot') {
      const sub = ctx.createOscillator(), subGain = ctx.createGain();
      sub.type = 'triangle'; sub.frequency.setValueAtTime(65.4, now); sub.frequency.exponentialRampToValueAtTime(32.7, now + 0.7);
      subGain.gain.setValueAtTime(0.35, now); subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      sub.connect(subGain); subGain.connect(master);
      sub.start(now); sub.stop(now + 0.7);

      const chords = [
        [261.63, 329.63, 392.00, 523.25],
        [293.66, 369.99, 440.00, 587.33],
        [329.63, 415.30, 493.88, 659.25],
        [392.00, 493.88, 587.33, 783.99],
        [523.25, 659.25, 783.99, 1046.50, 1318.51]
      ];
      chords.forEach((chord, step) => {
        const time = now + step * 0.15;
        chord.forEach(freq => {
          const osc = ctx.createOscillator(), gain = ctx.createGain();
          osc.type = step === 4 ? 'sawtooth' : 'triangle';
          osc.frequency.setValueAtTime(freq, time);
          gain.gain.setValueAtTime(step === 4 ? 0.14 : 0.08, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);
          osc.connect(gain); gain.connect(master);
          osc.start(time); osc.stop(time + 0.45);
        });
      });
      for (let i = 0; i < 14; i++) {
        const chimeTime = now + 0.75 + i * 0.065;
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(1100 + (i % 5) * 260, chimeTime);
        gain.gain.setValueAtTime(0.08, chimeTime); gain.gain.exponentialRampToValueAtTime(0.001, chimeTime + 0.16);
        osc.connect(gain); gain.connect(master);
        osc.start(chimeTime); osc.stop(chimeTime + 0.16);
      }
    } else if (type === 'bigWin' || type === 'bossWin') {
      [220, 277.18, 329.63, 440, 554.37, 659.25, 880, 1108.73].forEach((freq, idx) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.14, now + idx * 0.07); gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.34);
        osc.connect(gain); gain.connect(master);
        osc.start(now + idx * 0.07); osc.stop(now + idx * 0.07 + 0.34);
      });
    } else if (type === 'diceWin') {
      [349.23, 440, 523.25, 698.46, 880, 1046.50].forEach((freq, idx) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(freq, now + idx * 0.055);
        gain.gain.setValueAtTime(0.15, now + idx * 0.055); gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.3);
        osc.connect(gain); gain.connect(master);
        osc.start(now + idx * 0.055); osc.stop(now + idx * 0.055 + 0.3);
      });
    } else if (type === 'combo' || type === 'fishWin') {
      [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, idx) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(freq, now + idx * 0.045);
        gain.gain.setValueAtTime(0.12, now + idx * 0.045); gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.22);
        osc.connect(gain); gain.connect(master);
        osc.start(now + idx * 0.045); osc.stop(now + idx * 0.045 + 0.22);
      });
    } else if (type === 'win' || type === 'smallWin') {
      [261.63, 329.63, 392.00, 523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.12, now + idx * 0.06); gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25);
        osc.connect(gain); gain.connect(master);
        osc.start(now + idx * 0.06); osc.stop(now + idx * 0.06 + 0.25);
      });
    }
  } catch (e) {}
};
