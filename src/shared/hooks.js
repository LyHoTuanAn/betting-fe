import {useEffect, useRef, useState} from 'react';

export function useGameFx(){
 const [fx,setFx]=useState({type:null,key:0,text:'',dur:3500});
 const timerRef=useRef(null);
 useEffect(()=>()=>clearTimeout(timerRef.current),[]);
 const dismiss=()=>{
  clearTimeout(timerRef.current);
  setFx({type:null,key:0,text:'',dur:3500});
 };
 const trigger=(type,text='',duration)=>{
  clearTimeout(timerRef.current);
  const dur = duration || (type==='jackpot'?5200:['bigWin','bossWin'].includes(type)?4200:['diceWin','fishWin','combo','win','smallWin'].includes(type)?3500:2500);
  const next={type,key:Date.now(),text,dur};
  setFx(next);
  timerRef.current=setTimeout(()=>setFx(current=>current.key===next.key?{type:null,key:0,text:'',dur:3500}:current),dur);
 };
 return [fx,trigger,dismiss];
}
export function useAnimatedNumber(value){
 const [display,setDisplay]=useState(value);
 const previous=useRef(value);
 useEffect(()=>{
  const start=previous.current,delta=value-start,startTime=performance.now(),duration=Math.min(1200,Math.max(360,Math.abs(delta)/90));
  previous.current=value;
  if(!delta){setDisplay(value);return}
  let frame;
  const tick=now=>{
   const t=Math.min(1,(now-startTime)/duration);
   const eased=1-Math.pow(1-t,4);
   setDisplay(start+delta*eased);
   if(t<1)frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
  return()=>cancelAnimationFrame(frame);
 },[value]);
 return display;
}
