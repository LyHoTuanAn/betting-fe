export const playCelebrationAudio=(type,soundEnabled)=>{
 if(!soundEnabled)return;
 try{
  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtx)return;
  const ctx=new AudioCtx();
  if(ctx.state==='suspended')ctx.resume();
  const now=ctx.currentTime;
  if(type==='jackpot'){
   const sub=ctx.createOscillator(),subGain=ctx.createGain();
   sub.type='triangle';sub.frequency.setValueAtTime(65.4,now);sub.frequency.exponentialRampToValueAtTime(32.7,now+0.7);
   subGain.gain.setValueAtTime(0.35,now);subGain.gain.exponentialRampToValueAtTime(0.001,now+0.7);
   sub.connect(subGain);subGain.connect(ctx.destination);
   sub.start(now);sub.stop(now+0.7);

   const chords=[
    [261.63,329.63,392.00,523.25],
    [293.66,369.99,440.00,587.33],
    [329.63,415.30,493.88,659.25],
    [392.00,493.88,587.33,783.99],
    [523.25,659.25,783.99,1046.50,1318.51]
   ];
   chords.forEach((chord,step)=>{
    const time=now+step*0.15;
    chord.forEach(freq=>{
     const osc=ctx.createOscillator(),gain=ctx.createGain();
     osc.type=step===4?'sawtooth':'triangle';
     osc.frequency.setValueAtTime(freq,time);
     gain.gain.setValueAtTime(step===4?0.14:0.08,time);
     gain.gain.exponentialRampToValueAtTime(0.001,time+0.45);
     osc.connect(gain);gain.connect(ctx.destination);
     osc.start(time);osc.stop(time+0.45);
    });
   });
   for(let i=0;i<14;i++){
    const chimeTime=now+0.75+i*0.065;
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type='sine';osc.frequency.setValueAtTime(1100+(i%5)*260,chimeTime);
    gain.gain.setValueAtTime(0.08,chimeTime);gain.gain.exponentialRampToValueAtTime(0.001,chimeTime+0.16);
    osc.connect(gain);gain.connect(ctx.destination);
    osc.start(chimeTime);osc.stop(chimeTime+0.16);
   }
  }else if(type==='bigWin'||type==='bossWin'){
   [220,277.18,329.63,440,554.37,659.25,880,1108.73].forEach((freq,idx)=>{
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type='triangle';osc.frequency.setValueAtTime(freq,now+idx*0.07);
    gain.gain.setValueAtTime(0.14,now+idx*0.07);gain.gain.exponentialRampToValueAtTime(0.001,now+idx*0.07+0.34);
    osc.connect(gain);gain.connect(ctx.destination);
    osc.start(now+idx*0.07);osc.stop(now+idx*0.07+0.34);
   });
  }else if(type==='diceWin'){
   [349.23,440,523.25,698.46,880,1046.50].forEach((freq,idx)=>{
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type='sine';osc.frequency.setValueAtTime(freq,now+idx*0.055);
    gain.gain.setValueAtTime(0.15,now+idx*0.055);gain.gain.exponentialRampToValueAtTime(0.001,now+idx*0.055+0.3);
    osc.connect(gain);gain.connect(ctx.destination);
    osc.start(now+idx*0.055);osc.stop(now+idx*0.055+0.3);
   });
  }else if(type==='combo'||type==='fishWin'){
   [523.25,659.25,783.99,1046.50,1318.51].forEach((freq,idx)=>{
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type='sine';osc.frequency.setValueAtTime(freq,now+idx*0.045);
    gain.gain.setValueAtTime(0.12,now+idx*0.045);gain.gain.exponentialRampToValueAtTime(0.001,now+idx*0.045+0.22);
    osc.connect(gain);gain.connect(ctx.destination);
    osc.start(now+idx*0.045);osc.stop(now+idx*0.045+0.22);
   });
  }else if(type==='win'||type==='smallWin'){
   [261.63,329.63,392.00,523.25,659.25,783.99].forEach((freq,idx)=>{
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type='triangle';osc.frequency.setValueAtTime(freq,now+idx*0.06);
    gain.gain.setValueAtTime(0.12,now+idx*0.06);gain.gain.exponentialRampToValueAtTime(0.001,now+idx*0.06+0.25);
    osc.connect(gain);gain.connect(ctx.destination);
    osc.start(now+idx*0.06);osc.stop(now+idx*0.06+0.25);
   });
  }
 }catch(e){}
};
