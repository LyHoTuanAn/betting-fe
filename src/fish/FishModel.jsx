import {bubbles} from './fish-data.js';

export function OceanAmbient(){return <div className="oceanAmbient" aria-hidden="true">
 <span className="waterRay r1"/><span className="waterRay r2"/><span className="coralLayer"/><span className="rockLayer"/>
 {bubbles.map(b=><i key={b.id} className="bubble" style={{left:`${b.left}%`,width:`${b.size}px`,height:`${b.size}px`,animationDelay:`${b.delay}s`,animationDuration:`${b.dur}s`}}/>)}
 </div>}

export function FishModel({fish}){
 const hp=Math.max(0,fish.hp/fish.maxHp*100);
 return <div className="fishModel">
  <span className="fishShadow"/>
  <img className="realFish" src={`/assets/fish-real-${fish.kind}.webp`} alt="Sinh vật biển 3D" loading="eager" decoding="async"/>
  {fish.hitKey>0&&<div className="fishNetImpact"><i/><i/><i/><b/></div>}
  <small>{fish.name?`${fish.name} · `:''}{fish.value>=1000?`${Number((fish.value/1000).toFixed(1))}K`:fish.value}</small><div className="fishHp"><i style={{width:hp+'%'}}/></div>
 </div>
}
