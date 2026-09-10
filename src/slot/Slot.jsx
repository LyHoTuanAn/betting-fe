import {useEffect, useRef, useState} from 'react';
import {Minus, Plus, RotateCcw, Zap} from 'lucide-react';
import {GoldAmbient} from '../shared/GoldAmbient.jsx';
import {ResultFx} from '../shared/ResultFx.jsx';
import {Topbar} from '../shared/Topbar.jsx';
import {api} from '../shared/api.js';
import {playCelebrationAudio} from '../shared/audio.js';
import {BET_LIMITS} from '../shared/constants.js';
import {money} from '../shared/format.js';
import {useGameFx} from '../shared/hooks.js';
import {playSlotAudio} from './audio.js';
import {createGrid, ensure25Grid, getColumn, renderSlotSymbol, setColumn, slotScrollSymbols, symbols} from './symbols.jsx';

const betPresets=[1000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000];
export function Slot({goHome,balance,setBalance,sound,setSound,token}){
 const spinTimers=useRef([]);
 const pendingBalance=useRef(null);
 const [fx,triggerFx,dismissFx]=useGameFx();
 const [bet,setBet]=useState(10000),[spinning,setSpinning]=useState(false),[slotStage,setSlotStage]=useState('idle'),[spinningCols,setSpinningCols]=useState(()=>Array(5).fill(false)),[grid,setGrid]=useState(createGrid),[jackpot,setJackpot]=useState(99999991035),[win,setWin]=useState(0),[turbo,setTurbo]=useState(false),[auto,setAuto]=useState(false);
 
 useEffect(()=>{const t=setInterval(()=>setJackpot(v=>v+Math.floor(Math.random()*90+10)),1000);return()=>clearInterval(t)},[]);
 useEffect(()=>()=>spinTimers.current.forEach(clearTimeout),[]);

 const stepBet = (direction) => {
  const currentIndex = betPresets.indexOf(bet);
  if (direction === 'up') {
   if (currentIndex !== -1 && currentIndex < betPresets.length - 1) {
    setBet(betPresets[currentIndex + 1]);
   } else {
    const next = betPresets.find(p => p > bet);
    setBet(next || Math.min(BET_LIMITS.slot.max, bet + 50000));
   }
  } else {
   if (currentIndex > 0) {
    setBet(betPresets[currentIndex - 1]);
   } else {
    const prev = [...betPresets].reverse().find(p => p < bet);
    setBet(prev || Math.max(BET_LIMITS.slot.min, bet - 50000));
   }
  }
 };

 const spin=async()=>{
  if(spinning||balance<bet)return;
  spinTimers.current.forEach(clearTimeout);
  spinTimers.current=[];
  setSpinning(true);
  setSlotStage('pressed');
  setSpinningCols(Array(5).fill(true));
  setWin(0);
  setBalance(v=>v-bet);
  playSlotAudio('spin',sound);

  let response;
  try{
   response=await api('/games/slot/spin',{token,method:'POST',body:JSON.stringify({bet})});
   pendingBalance.current=response.balance;
  }catch(error){
   setBalance(v=>v+bet);
   setSpinning(false);
   setSpinningCols(Array(5).fill(false));
   setSlotStage('idle');
   triggerFx('lose',error.message,2000);
   return;
  }
  const result=ensure25Grid(response.grid);
  const outcome=response.outcome;
  spinTimers.current.push(setTimeout(()=>setSlotStage('scrolling'),50));
  spinTimers.current.push(setTimeout(()=>setSlotStage('sweep'),turbo?220:800));
  spinTimers.current.push(setTimeout(()=>setSlotStage('stopping'),turbo?400:1600));

  const startStopDelay=turbo?380:1200;
  const colStep=turbo?200:560;
  const isSuspenseMatch=!turbo && result[10]===result[11] && result[11]===result[12];

  for(let col=0;col<5;col++){
   const extraSuspenseDelay=(isSuspenseMatch && col>=3)?(col-2)*350:0;
   const delay=startStopDelay+col*colStep+extraSuspenseDelay;

   if(isSuspenseMatch && col===3){
    spinTimers.current.push(setTimeout(()=>{
     playSlotAudio('anticipation',sound);
    },startStopDelay+2*colStep));
   }

   const timer=setTimeout(()=>{
    setGrid(current=>setColumn(current,col,getColumn(result,col)));
    setSpinningCols(current=>current.map((active,index)=>index===col?false:active));
    playSlotAudio('stop',sound,col);

    if(col===4){
     const won=response.payout;
     setWin(won);
     pendingBalance.current=null;
     setBalance(response.balance);
      if(won){
       playCelebrationAudio(outcome,sound);
       triggerFx(outcome,`+${money(won)}`,outcome==='jackpot'?5200:outcome==='bigWin'?4200:3500);
      }else{
       triggerFx('lose','TRƯỢT',2000);
      }
     setSlotStage('idle');
     setSpinning(false);
    }
   },delay);
   spinTimers.current.push(timer);
  }
 };

 useEffect(()=>{if(auto&&!spinning){const t=setTimeout(spin,550);return()=>clearTimeout(t)}},[auto,spinning,balance]);
 const columns=Array.from({length:5},(_,col)=>getColumn(grid,col));

 const middleMatch = !spinningCols[0] && !spinningCols[1] && grid[10] === grid[11];
 const isWinningResult = win > 0 && !spinning;

 const formatChip = val => val >= 1000000 ? `${val / 1000000}M` : `${val / 1000}K`;

 return (
  <div className={'screen slotScreen '+(fx.type?`fx-${fx.type}`:'')+' slot-'+slotStage}>
   <GoldAmbient/>
   <ResultFx fx={fx} onDismiss={dismissFx}/>
   <Topbar balance={balance} onBack={goHome} sound={sound} setSound={setSound}/>
   <main className="slotBody">
    <div className="jackpot">
     <div className="jackpotCrown">👑</div>
     <small>GRAND JACKPOT</small>
     <strong>{money(jackpot)}</strong>
     <div className="jackpotGleam"></div>
    </div>

    <div className={`reelsContainer ${spinning?'isSpinning':''} ${isWinningResult?'hasWon':''}`}>
     <div className="paylineIndicator left"><span>►</span></div>
     <div className="paylineIndicator right"><span>◄</span></div>
     <div className="reels">
      <div className="reelsGlassGlare"></div>
      {columns.map((column,col)=>{
       const isColSpinning=spinningCols[col];
       const isSuspenseCol=col>=3 && isColSpinning && middleMatch;
       const strip=isColSpinning?slotScrollSymbols.map((_,i)=>symbols[(i+col*3)%symbols.length]):column;
       return (
        <div
         key={col}
         className={'reelCol '+(isColSpinning?'spinning':'stopped')+(isSuspenseCol?' suspense':'')}
         style={{'--reel-speed':`${turbo?0.16:0.32}s`,'--reel-stop-delay':`${col*0.04}s`}}
        >
         <div className="reelTrack">
          {strip.map((x,row)=>{
           const isMidRow = !isColSpinning && row === 2;
           const isWinningSym = isWinningResult && (row === 2 || (row === 1 || row === 3));
           return (
            <div key={row} className={'symbol s'+symbols.indexOf(x)+(isWinningSym?' isWinning':'')+(isMidRow?' middleRow':'')}>
             {renderSlotSymbol(x,isWinningSym)}
            </div>
           );
          })}
         </div>
         <div className="reelColumnFlash"></div>
        </div>
       );
      })}
     </div>
    </div>

    <div className={`winLine ${win>0?'winning':''}`}>
     {win>0?(
      <span className="winLineBadge">🎉 THẮNG +{money(win)} 🎉</span>
     ):(
      <span>✦ 5 HÀNG THƯỞNG · 25 BIỂU TƯỢNG HOÀNG KIM ✦</span>
     )}
    </div>

    <div className="slotControlSections">
     <section className="betSectionCard">
      <div className="controlTop">
       <div className="betPickerLabel">
        <p className="betLabelTitle">MỨC CƯỢC</p>
        <span className="betLabelSub">5 HÀNG THƯỞNG</span>
       </div>
       <div className="betPicker">
        <button onClick={()=>stepBet('down')} disabled={spinning || bet <= BET_LIMITS.slot.min} aria-label="Giảm cược"><Minus/></button>
        <strong className="betDisplay">{money(bet)}</strong>
        <button onClick={()=>stepBet('up')} disabled={spinning || bet >= BET_LIMITS.slot.max} aria-label="Tăng cược"><Plus/></button>
       </div>
      </div>

      <div className="betPresetsRow">
       {betPresets.map(preset => (
        <button
         key={preset}
         type="button"
         className={`betPresetChip ${bet === preset ? 'active' : ''}`}
         disabled={spinning}
         onClick={()=>setBet(preset)}
        >
         {formatChip(preset)}
        </button>
       ))}
      </div>

      <div className="betQuickActions">
       <button type="button" className="quickBetBtn" disabled={spinning} onClick={()=>setBet(BET_LIMITS.slot.min)}>MIN</button>
       <button type="button" className="quickBetBtn" disabled={spinning} onClick={()=>setBet(Math.max(BET_LIMITS.slot.min, Math.floor(bet / 2)))}>÷2</button>
       <button type="button" className="quickBetBtn" disabled={spinning} onClick={()=>setBet(Math.min(BET_LIMITS.slot.max, bet * 2))}>×2</button>
       <button type="button" className="quickBetBtn" disabled={spinning} onClick={()=>setBet(Math.min(BET_LIMITS.slot.max, Math.max(BET_LIMITS.slot.min, Math.floor(balance))))}>MAX</button>
      </div>
     </section>

     <section className="spinSectionCard">
      <div className="toggles">
       <button className={auto?'on':''} onClick={()=>setAuto(!auto)}>
        <RotateCcw className={auto?'rotating':''}/>Auto
       </button>
       <button className={turbo?'on':''} onClick={()=>setTurbo(!turbo)}>
        <Zap className={turbo?'flashing':''}/>Turbo
       </button>
      </div>

      <button className={`spinBtn ${spinning?'spinningBtn':''}`} onClick={spin} disabled={spinning}>
       <span className="spinBtnText">{spinning?'ĐANG QUAY...':'QUAY'}</span>
       <div className="spinBtnGlow"></div>
      </button>
     </section>
    </div>
   </main>
  </div>
 );
}
