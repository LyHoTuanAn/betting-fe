import {fxBits, fxCoins} from './fx-data.js';

export function GoldAmbient(){return <div className="goldAmbient" aria-hidden="true">
 <span className="lightSweep slow"/><span className="lightSweep slow alt"/>
 {fxCoins.slice(0,8).map(c=><i key={c.id} className="ambientCoin" style={{left:`${10+c.id*11}%`,top:`${12+(c.id%5)*12}%`,animationDelay:`-${c.id*.45}s`}}/>)}
 {fxBits.map(s=><i key={s.id} className="goldDust" style={{left:`${s.x}%`,top:`${s.y}%`,animationDelay:`${s.delay}s`,width:`${s.size}px`,height:`${s.size}px`}}/>)}
 </div>}
