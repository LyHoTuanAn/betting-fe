import {useEffect, useRef, useState} from 'react';
import {Coins} from 'lucide-react';
import {ResultFx} from '../shared/ResultFx.jsx';
import {Topbar} from '../shared/Topbar.jsx';
import {api} from '../shared/api.js';
import {playCelebrationAudio} from '../shared/audio.js';
import {BET_LIMITS} from '../shared/constants.js';
import {money} from '../shared/format.js';
import {useGameFx} from '../shared/hooks.js';

const pipLayouts={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
function DiceFace({value,rolling,delay=0}){
 return <div className={'diceCube '+(rolling?'rolling':'')} style={{animationDelay:`${delay}ms`}}>
  <div className="diceInner">
   {Array.from({length:9},(_,index)=><span key={index} className={'pip '+(pipLayouts[value].includes(index+1)?'show':'')}/>)}
  </div>
 </div>
}
export function Dice({goHome,balance,setBalance,sound,setSound,token}){
 const [fx,triggerFx,dismissFx]=useGameFx();
 const [time,setTime]=useState(15);
 const [side,setSide]=useState(null);
 const [chip,setChip]=useState(100000);
 const [history,setHistory]=useState(['T','X','X','T','T','X','T','X']);
 const [dice,setDice]=useState([2,5,4]);
 const [placed,setPlaced]=useState(0);
 const [placedSide,setPlacedSide]=useState(null);
 const [pendingResult,setPendingResult]=useState(null);
 const [note,setNote]=useState('Chọn cửa TÀI hoặc XỈU và đặt cược');
 const [rolling,setRolling]=useState(false);
 const [reveal,setReveal]=useState(false);
 const [bettingOpen,setBettingOpen]=useState(true);
 const [roundNo,setRoundNo]=useState(()=>Math.floor(Date.now()/15000)%900000+100000);

 const placedRef = useRef(0);
 const placedSideRef = useRef(null);
 const pendingResultRef = useRef(null);
 const soundRef = useRef(sound);
 const setBalanceRef = useRef(setBalance);
 const triggerFxRef = useRef(triggerFx);

 useEffect(()=>{placedRef.current = placed;},[placed]);
 useEffect(()=>{placedSideRef.current = placedSide;},[placedSide]);
 useEffect(()=>{pendingResultRef.current = pendingResult;},[pendingResult]);
 useEffect(()=>{soundRef.current = sound;},[sound]);
 useEffect(()=>{setBalanceRef.current = setBalance;},[setBalance]);
 useEffect(()=>{triggerFxRef.current = triggerFx;},[triggerFx]);

 useEffect(()=>{
  let active = true;
  let timerId = null;

  const runRound = async () => {
   if(!active) return;
   setRoundNo(r => r + 1);
   setBettingOpen(true);
   setReveal(false);
   setRolling(false);
   setPlaced(0);
   setPlacedSide(null);
   setPendingResult(null);
   setSide(null);
   setNote('Chọn cửa TÀI hoặc XỈU và đặt cược');

   // 1. Countdown from 15 to 0
   for(let t = 15; t >= 0; t--){
    if(!active) return;
    setTime(t);
    await new Promise(r => { timerId = setTimeout(r, 1000); });
   }

   if(!active) return;
   // 2. Lock betting & Start rolling
   setBettingOpen(false);
   setRolling(true);
   setNote('Đang lắc xúc xắc...');

   await new Promise(r => { timerId = setTimeout(r, 1400); });
   if(!active) return;

   // 3. Reveal dice result on the table first
   const pRes = pendingResultRef.current;
   const betAmt = placedRef.current;
   const bSide = placedSideRef.current;
   
   const d = pRes?.dice || [Math.ceil(Math.random()*6), Math.ceil(Math.random()*6), Math.ceil(Math.random()*6)];
   const total = d.reduce((a,b)=>a+b, 0);
   const result = pRes?.result || (total >= 11 ? 'T' : 'X');

   setDice(d);
   setRolling(false);
   setReveal(true);
   setHistory(h => [result, ...h].slice(0, 10));
   setNote(`🎲 ${d.join(' - ')} = ${total} điểm · ${result==='T'?'TÀI (11-17)':'XỈU (3-10)'}`);

   // Allow user to clearly see the 3 dice and sum on table before victory/defeat popup
   await new Promise(r => { timerId = setTimeout(r, 2200); });
   if(!active) return;

   if(betAmt > 0){
    if(bSide === result){
     const profit = pRes ? (pRes.payout - betAmt) : Math.floor(betAmt * 0.98);
     if(pRes) setBalanceRef.current?.(pRes.balance);
     else setBalanceRef.current?.(v => v + betAmt + profit);
     setNote(`🎉 Thắng +${money(profit)} (${result==='T'?'TÀI':'XỈU'} ${total} điểm)`);
     playCelebrationAudio('diceWin', soundRef.current);
     triggerFxRef.current?.('diceWin', `+${money(profit)}`, 3800);
    } else {
     if(pRes) setBalanceRef.current?.(pRes.balance);
     setNote(`💔 Thua -${money(betAmt)} (${result==='T'?'TÀI':'XỈU'} ${total} điểm)`);
     triggerFxRef.current?.('diceLose', `-${money(betAmt)}`, 2500);
    }
   }

   // 4. Wait for player to enjoy the round result, then restart next round
   await new Promise(r => { timerId = setTimeout(r, 3600); });
   if(!active) return;
   runRound();
  };

  runRound();

  return () => {
   active = false;
   clearTimeout(timerId);
  };
 }, []);

 const place = async()=>{
  if(!side || chip < BET_LIMITS.dice.min || chip > balance || chip > BET_LIMITS.dice.max || time <= 2 || placed > 0 || !bettingOpen) return;
  const currentChip = chip;
  const currentSide = side;
  setBalance(v => v - currentChip);
  setPlaced(currentChip);
  setPlacedSide(currentSide);
  setNote(`Đã cược ${money(currentChip)} vào ${currentSide === 'T' ? 'TÀI' : 'XỈU'}`);
  try{
   const result = await api('/games/dice/play', {token, method: 'POST', body: JSON.stringify({bet: currentChip, side: currentSide})});
   setPendingResult(result);
  }catch(error){
   setBalance(v => v + currentChip);
   setPlaced(0);
   setPlacedSide(null);
   setNote(error.message);
  }
 };

 return (
  <div className={'screen diceScreen '+(fx.type?`fx-${fx.type}`:'')}>
   <ResultFx fx={fx} onDismiss={dismissFx}/>
   <Topbar balance={balance} onBack={goHome} sound={sound} setSound={setSound}/>
   <main className="diceBody">
    <div className="diceHeader">
     <div className="roundNo">PHIÊN #{roundNo}</div>
     <div className={'timer '+(time<6?'danger':'')}>00:{String(time).padStart(2,'0')}</div>
    </div>
    <div className={'bowl diceTable '+(rolling?'rolling ':'')+(reveal?'reveal':'')}>
     <div className="diceScene">
      <div className="dicePlate"><i/><span/></div>
      <div className="diceTray">{dice.map((d,i)=><DiceFace key={i} value={d} rolling={rolling} delay={i*120}/>)}</div>
      <div className="diceSmoke"/>
      <div className="diceCup" aria-hidden="true"><i className="cupTop"/><i className="cupBody"/><i className="cupLip"/><i className="cupShine"/></div>
     </div>
    </div>
    <div className="diceControlSections">
     <section className="diceSidesCard">
      <div className="sides">
       <button className={side==='T'?'selected':''} onClick={()=>bettingOpen&&setSide('T')}>
        <strong>TÀI</strong>
        <small>11 - 17</small>
        <span>Tổng: 1.2B</span>
       </button>
       <button className={side==='X'?'selected':''} onClick={()=>bettingOpen&&setSide('X')}>
        <strong>XỈU</strong>
        <small>3 - 10</small>
        <span>Tổng: 850M</span>
       </button>
      </div>
      <div className="betStatusRow">
       <p className="betNote">{note}</p>
       <div className="history">
        <b>Lịch sử</b>
        <div className="historyDots">{history.map((h,i)=><i className={h==='T'?'tai':'xiu'} key={i}>{h}</i>)}</div>
       </div>
      </div>
     </section>

     <section className="diceActionCard">
      <div className="chips">
       {[1000,10000,100000,1000000].map(x=><button className={chip===x?'active':''} onClick={()=>setChip(x)} key={x}>{x>=1000000?'1M':x/1000+'K'}</button>)}
       <button className={chip===Math.min(balance,BET_LIMITS.dice.max)?'active':''} onClick={()=>setChip(Math.min(balance,BET_LIMITS.dice.max))}>ALL</button>
      </div>
      <button className="placeBtn" onClick={place} disabled={!side||chip<BET_LIMITS.dice.min||chip>balance||chip>BET_LIMITS.dice.max||time<=2||placed>0||!bettingOpen}>
       <Coins/> ĐẶT CƯỢC {placed>0&&`(${money(placed)})`}
      </button>
     </section>
    </div>
   </main>
  </div>
 );
}
