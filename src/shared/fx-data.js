// Victory FX Particle System
export const fxFountainCoins = Array.from({length: 28}, (_, i) => {
 const spread = (-75 + (i % 14) * 11) * (Math.PI / 180);
 const power = 280 + (i % 6) * 55;
 const vx = Math.sin(spread) * power;
 const vy = -Math.cos(spread) * power - 180;
 return {
  id: i,
  delay: i * 0.022,
  dur: 1.35 + (i % 4) * 0.15,
  size: 28 + (i % 5) * 6,
  vx,
  vy,
  spinX: 720 + (i % 5) * 360,
  spinY: (i % 2 === 0 ? 1 : -1) * (1080 + (i % 7) * 240)
 };
});

export const fxCoinRainDoF = Array.from({length: 80}, (_, i) => {
 const dof = i % 8 === 0 ? 'dofClose' : i % 3 === 0 ? 'dofFar' : 'dofMid';
 const size = dof === 'dofClose' ? 64 + (i % 4) * 10 : dof === 'dofFar' ? 22 + (i % 3) * 4 : 38 + (i % 5) * 6;
 return {
  id: i,
  left: ((i * 37 + (i % 7) * 13) % 96) + 2,
  delay: 0.02 + (i % 25) * 0.045 + Math.floor(i / 25) * 0.35,
  dur: dof === 'dofClose' ? 1.0 + (i % 4) * 0.12 : dof === 'dofFar' ? 2.0 + (i % 5) * 0.2 : 1.45 + (i % 6) * 0.18,
  size,
  dof,
  spin: (i % 2 === 0 ? 1 : -1) * (540 + (i % 6) * 180),
  rotZ: (i % 12) * 30
 };
});

export const fxFireworks = Array.from({length: 8}, (_, i) => ({
 id: i,
 left: 14 + ((i * 29) % 72),
 top: 12 + ((i * 23) % 45),
 delay: 0.08 + (i % 4) * 0.26,
 scale: 0.75 + (i % 3) * 0.3,
 colorScheme: ['#ffd700', '#ff3366', '#00e5ff', '#76ff03', '#d500f9', '#ff9100', '#ffff00', '#00e676'][i % 8]
}));

export const fxConfettiAll = Array.from({length: 48}, (_, i) => ({
 id: i,
 left: (i * 23) % 98,
 delay: (i % 12) * 0.07,
 dur: 2.2 + (i % 5) * 0.35,
 rot: (i % 2 ? 1 : -1) * (360 + (i % 6) * 90),
 color: ['#ffd700', '#ff4081', '#00e5ff', '#76ff03', '#ff9100', '#ffffff', '#e040fb', '#ffeb3b'][i % 8],
 width: 6 + (i % 4) * 3,
 height: 12 + (i % 5) * 4
}));

export const fxSparkles = Array.from({length: 36}, (_, i) => ({
 id: i,
 rot: (i * 10) % 360,
 dist: 80 + (i % 6) * 35,
 delay: (i % 12) * 0.04,
 size: 14 + (i % 4) * 6,
 char: ['✨', '✦', '★', '✧', '⭐'][i % 5],
 color: ['#fff', '#ffd700', '#ffab00', '#80d8ff', '#ea80fc'][i % 5]
}));

// Defeat FX Particle System
export const fxAshEmbers = Array.from({length: 32}, (_, i) => ({
 id: i,
 left: ((i * 31 + (i % 5) * 17) % 94) + 3,
 delay: (i % 16) * 0.12,
 dur: 2.4 + (i % 6) * 0.4,
 size: 4 + (i % 5) * 5,
 dx: (i % 2 === 0 ? 1 : -1) * (15 + (i % 4) * 12),
 color: ['#ff1744', '#7c4dff', '#ff5252', '#37474f', '#212121', '#b71c1c'][i % 6]
}));

export const fxVoidShards = Array.from({length: 20}, (_, i) => {
 const angle = (i * 18) * (Math.PI / 180);
 const distance = 120 + (i % 5) * 30;
 return {
  id: i,
  sx: Math.cos(angle) * distance,
  sy: Math.sin(angle) * distance,
  delay: (i % 8) * 0.06,
  dur: 0.85 + (i % 4) * 0.1,
  size: 12 + (i % 4) * 6,
  rot: i * 36
 };
});
export const fxCoins=Array.from({length:24},(_,i)=>{
 const angle=(-80+i*10)*(Math.PI/180);
 const distance=90+(i%6)*22;
 return {id:i,delay:i*.025,duration:1.15+(i%4)*.09,size:14+(i%4)*6,dx:Math.cos(angle)*distance,dy:Math.sin(angle)*distance,arc:(i%2===0?1:-1)*(18+(i%5)*8),spin:260+(i%4)*90};
});
export const fxBits=Array.from({length:36},(_,i)=>({id:i,x:(i*37)%100,y:(i*53)%100,delay:(i%12)*.16,size:3+i%5}));
