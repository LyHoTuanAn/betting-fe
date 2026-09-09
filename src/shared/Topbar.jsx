import {useEffect, useRef, useState} from 'react';
import {ArrowLeft, Coins, Plus, Volume2, VolumeX} from 'lucide-react';
import {money} from './format.js';
import {useAnimatedNumber} from './hooks.js';

export function Topbar({balance,onBack,sound,setSound,home=false,onProfile,onWallet}){
 const shown=useAnimatedNumber(balance);
 const [ping,setPing]=useState(false);
 const prev=useRef(balance);
 useEffect(()=>{
  if(balance!==prev.current){
   setPing(true);
   const t=setTimeout(()=>setPing(false),600);
   return()=>clearTimeout(t);
  }
 },[balance]);
 return <header className="topbar">
  {home?<button className="avatarButton" onClick={onProfile}><img className="avatar" src="/assets/home-avatar.webp" alt="Tài khoản" loading="eager" decoding="async"/></button>:<button className="iconBtn" aria-label="Quay lại trang chủ" onClick={onBack}><ArrowLeft/></button>}<div className={'brandcoin '+(ping?'walletPing':'')}><Coins/> {money(shown)}</div>
  <div className="topActions"><button className="roundPlus" onClick={onWallet}><Plus/></button><button className="iconBtn" onClick={()=>setSound(!sound)}>{sound?<Volume2/>:<VolumeX/>}</button></div>
</header>}
