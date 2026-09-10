import {getSoundVolume, playCelebrationAudio} from '../shared/audio.js';

export const playSlotAudio = (type, soundEnabled, pitchIndex = 0) => {
  const vol = getSoundVolume();
  if (!soundEnabled || vol <= 0.001) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(vol, now);
    master.connect(ctx.destination);

    if (type === 'spin') {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'triangle'; osc.frequency.setValueAtTime(140, now); osc.frequency.exponentialRampToValueAtTime(320, now + 0.22);
      gain.gain.setValueAtTime(0.09, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain); gain.connect(master);
      osc.start(now); osc.stop(now + 0.25);
    } else if (type === 'stop') {
      const scale = [220, 277.18, 329.63, 415.30, 554.37];
      const baseFreq = scale[pitchIndex % scale.length] || 220;
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(baseFreq, now); osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.45, now + 0.12);
      gain.gain.setValueAtTime(0.22, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      osc.connect(gain); gain.connect(master);
      osc.start(now); osc.stop(now + 0.13);
    } else if (type === 'anticipation') {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(280, now); osc.frequency.linearRampToValueAtTime(620, now + 0.45);
      gain.gain.setValueAtTime(0.06, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
      osc.connect(gain); gain.connect(master);
      osc.start(now); osc.stop(now + 0.48);
    } else if (type === 'win') {
      playCelebrationAudio('win', soundEnabled);
    }
  } catch (e) {}
};
