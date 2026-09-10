import {useEffect, useRef, useState} from 'react';
import {ArrowUpRight, Check, Coins, Flame, Lock, Plus, Timer, X, Zap} from 'lucide-react';
import {ResultFx} from '../shared/ResultFx.jsx';
import {Topbar} from '../shared/Topbar.jsx';
import {playCelebrationAudio} from '../shared/audio.js';
import {money} from '../shared/format.js';
import {useGameFx} from '../shared/hooks.js';
import {SEATS_CONFIG, createDeck, evaluate7Cards} from './poker-engine.js';
import './poker.css';

export function Poker({goHome, balance, setBalance, sound, setSound, token}) {
  const [fx, triggerFx, dismissFx] = useGameFx();
  const [stage, setStage] = useState('preflop'); // preflop, flop, turn, river, showdown
  const [pot, setPot] = useState(125000);
  const [currentBet, setCurrentBet] = useState(10000);
  const [userBet, setUserBet] = useState(10000);
  const [raiseAmount, setRaiseAmount] = useState(20000);
  const [timer, setTimer] = useState(12);
  const [autoCheck, setAutoCheck] = useState(false);
  const [handNo, setHandNo] = useState(4921);
  const [statusMsg, setStatusMsg] = useState('Lượt hành động của bạn');

  // Cards State
  const [deck, setDeck] = useState(() => createDeck());
  const [heroHand, setHeroHand] = useState([
    { rank: 14, label: 'A', suit: 's', symbol: '♠', color: '#1a1f2c' },
    { rank: 13, label: 'K', suit: 'h', symbol: '♥', color: '#ef4444' }
  ]);
  const [communityCards, setCommunityCards] = useState([
    { rank: 14, label: 'A', suit: 's', symbol: '♠', color: '#1a1f2c' },
    { rank: 13, label: 'K', suit: 'd', symbol: '♦', color: '#f59e0b' },
    { rank: 7, label: '7', suit: 's', symbol: '♠', color: '#1a1f2c' }
  ]);
  const [handRank, setHandRank] = useState('Đôi A (One Pair)');
  const [handEnded, setHandEnded] = useState(false);

  // Sound ref
  const soundRef = useRef(sound);
  useEffect(() => { soundRef.current = sound; }, [sound]);

  // Start a fresh hand
  const startNewHand = () => {
    const newDeck = createDeck();
    const hero = [newDeck[0], newDeck[1]];
    const community = [newDeck[2], newDeck[3], newDeck[4]];
    
    setDeck(newDeck.slice(10));
    setHeroHand(hero);
    setCommunityCards(community);
    setStage('flop');
    setPot(125000);
    setCurrentBet(10000);
    setUserBet(10000);
    setRaiseAmount(20000);
    setTimer(12);
    setHandEnded(false);
    setHandNo(h => h + 1);

    const evaluated = evaluate7Cards([...hero, ...community]);
    setHandRank(evaluated.name);
    setStatusMsg(`Flop đã mở · ${evaluated.name}`);
  };

  // Timer countdown
  useEffect(() => {
    if (handEnded) return;
    const interval = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          if (autoCheck) handleCheck();
          return 12;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [handEnded, autoCheck, stage]);

  // Advance stage
  const advanceStage = () => {
    if (stage === 'flop') {
      // Reveal Turn (4th card)
      const turnCard = deck[0];
      const newComm = [...communityCards, turnCard];
      setCommunityCards(newComm);
      setDeck(d => d.slice(1));
      setStage('turn');
      const evalTurn = evaluate7Cards([...heroHand, ...newComm]);
      setHandRank(evalTurn.name);
      setStatusMsg(`Turn đã mở (${turnCard.label}${turnCard.symbol}) · ${evalTurn.name}`);
    } else if (stage === 'turn') {
      // Reveal River (5th card)
      const riverCard = deck[0];
      const newComm = [...communityCards, riverCard];
      setCommunityCards(newComm);
      setDeck(d => d.slice(1));
      setStage('river');
      const evalRiver = evaluate7Cards([...heroHand, ...newComm]);
      setHandRank(evalRiver.name);
      setStatusMsg(`River đã mở (${riverCard.label}${riverCard.symbol}) · ${evalRiver.name}`);
    } else if (stage === 'river') {
      // Showdown
      setStage('showdown');
      setHandEnded(true);
      const evalFinal = evaluate7Cards([...heroHand, ...communityCards]);
      setHandRank(evalFinal.name);
      
      const wonAmount = pot + 185000;
      setBalance(b => b + wonAmount);
      playCelebrationAudio('bigWin', soundRef.current);
      triggerFx('bigWin', `+${money(wonAmount)}`, 4000);
      setStatusMsg(`🎉 BẠN THẮNG POT: +${money(wonAmount)} với ${evalFinal.name}!`);
      
      setTimeout(startNewHand, 5500);
    }
  };

  // Player Actions
  const handleFold = () => {
    setStatusMsg('Bạn đã Fold (Bỏ bài)');
    setHandEnded(true);
    triggerFx('diceLose', 'BỎ BÀI', 1800);
    setTimeout(startNewHand, 2500);
  };

  const handleCheck = () => {
    setStatusMsg('Bạn đã Check (Xem bài)');
    advanceStage();
  };

  const handleCall = () => {
    const callCost = Math.max(10000, currentBet);
    if (balance < callCost) return;
    setBalance(b => b - callCost);
    setPot(p => p + callCost * 2);
    setStatusMsg(`Bạn đã Call ${money(callCost)}`);
    advanceStage();
  };

  const handleRaise = () => {
    const raiseCost = raiseAmount;
    if (balance < raiseCost) return;
    setBalance(b => b - raiseCost);
    setPot(p => p + raiseCost * 2);
    setCurrentBet(raiseCost);
    setStatusMsg(`Bạn đã Tố (Raise) ${money(raiseCost)}!`);
    advanceStage();
  };

  const handleAllIn = () => {
    const allInAmt = Math.min(balance, 1000000);
    setBalance(b => b - allInAmt);
    setPot(p => p + allInAmt * 2);
    setStatusMsg(`🔥 BẠN ĐÃ ALL-IN ${money(allInAmt)}!`);
    
    // Fast forward directly to Showdown
    if (communityCards.length < 5) {
      const needed = 5 - communityCards.length;
      const extraCards = deck.slice(0, needed);
      const finalComm = [...communityCards, ...extraCards];
      setCommunityCards(finalComm);
      setDeck(d => d.slice(needed));
    }
    setStage('river');
    setTimeout(() => {
      advanceStage();
    }, 1200);
  };

  return (
    <div className={'screen pokerScreen ' + (fx.type ? `fx-${fx.type}` : '')}>
      <ResultFx fx={fx} onDismiss={dismissFx} />
      <Topbar balance={balance} onBack={goHome} sound={sound} setSound={setSound} />

      <main className="pokerBody">
        {/* Top Header Telemetry */}
        <div className="pokerHeaderBar">
          <div className="tableInfoTag">
            <Coins />
            <span>BÀN #704 · VIP NL HOLD'EM</span>
          </div>
          <div className="liveHandBadge">
            <span className="livePulseDot" />
            <span>VÁN #{handNo}</span>
          </div>
        </div>

        {/* 6-Max Oval Poker Table Canvas */}
        <div className="pokerTableCanvas">
          <div className="tableFeltInner">
            {/* Center Area: Total Pot & Community Cards */}
            <div className="tableCenterArea">
              <div className="tablePotBox">
                <span className="potIcon">🏆</span>
                <span className="potText">TỔNG POT: {money(pot)}</span>
              </div>

              {/* 5 Community Cards Display */}
              <div className="communityCardsRow">
                {communityCards.map((c, i) => (
                  <div
                    key={i}
                    className="pokerCard"
                    style={{
                      transform: `rotate(${(i - 2) * 3}deg) translateY(${Math.abs(i - 2) * 1.5}px)`
                    }}
                  >
                    <span className="cardCornerTop" style={{color: c.color}}>{c.label}</span>
                    <span className="cardSuitCenter" style={{color: c.color}}>{c.symbol}</span>
                    <span className="cardCornerBottom" style={{color: c.color}}>{c.label}</span>
                  </div>
                ))}

                {/* Locked Turn Card slot */}
                {communityCards.length < 4 && (
                  <div className="pokerCard lockedSlot" style={{transform: 'rotate(3deg)'}}>
                    <Lock />
                  </div>
                )}

                {/* Locked River Card slot */}
                {communityCards.length < 5 && (
                  <div className="pokerCard lockedSlot" style={{transform: 'rotate(6deg)'}}>
                    <Lock />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Seats around the oval table */}
          {SEATS_CONFIG.map(seat => (
            <div
              key={seat.id}
              className={`pokerSeat seat-${seat.id} ${seat.isHero ? 'isHero' : ''}`}
            >
              <div className="seatAvatarWrap">
                {seat.isHero && timer > 0 && !handEnded && (
                  <svg className="seatTimerSvg" viewBox="0 0 40 40">
                    <circle
                      cx="20"
                      cy="20"
                      r="18"
                      fill="none"
                      stroke="#ffd700"
                      strokeWidth="2.5"
                      strokeDasharray="113"
                      strokeDashoffset={113 - (timer / 12) * 113}
                    />
                  </svg>
                )}
                <img
                  className="seatAvatarImg"
                  src={seat.avatar}
                  alt={seat.name}
                  loading="lazy"
                />
                {seat.role && (
                  <span className={`roleBadge ${seat.role}`}>{seat.role}</span>
                )}
              </div>

              <span className="seatName">{seat.name}</span>
              <span className="seatChips">
                {seat.sittingOut ? 'Sitting Out' : money(seat.chips)}
              </span>

              {/* Hero Hole Cards (2 Cards in Hand) */}
              {seat.isHero && (
                <div className="heroHandBox">
                  {heroHand.map((c, idx) => (
                    <div key={idx} className="pokerCard">
                      <span className="cardCornerTop" style={{color: c.color}}>{c.label}</span>
                      <span className="cardSuitCenter" style={{color: c.color}}>{c.symbol}</span>
                      <span className="cardCornerBottom" style={{color: c.color}}>{c.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Action Status Bar & Countdown */}
        <div className="pokerControlsSection">
          <div className="actionStatusRow">
            <div className="turnAlert">
              <Timer />
              <span>{statusMsg} {timer > 0 && !handEnded && <strong>({timer}s)</strong>}</span>
            </div>
            <button
              className={`autoCheckBtn ${autoCheck ? 'on' : ''}`}
              onClick={() => setAutoCheck(!autoCheck)}
            >
              <Zap size={13} /> Auto-Check
            </button>
          </div>

          {/* 5 Primary Action Buttons */}
          <div className="actionButtonsGrid">
            <button
              className="pokerActBtn fold"
              onClick={handleFold}
              disabled={handEnded}
            >
              <X />
              <span>Fold</span>
            </button>

            <button
              className="pokerActBtn"
              onClick={handleCheck}
              disabled={handEnded}
            >
              <Check />
              <span>Check</span>
            </button>

            <button
              className="pokerActBtn call"
              onClick={handleCall}
              disabled={handEnded || balance < currentBet}
            >
              <Plus />
              <span>Call {money(currentBet)}</span>
            </button>

            <button
              className="pokerActBtn raise"
              onClick={handleRaise}
              disabled={handEnded || balance < raiseAmount}
            >
              <ArrowUpRight />
              <span>Raise {money(raiseAmount)}</span>
            </button>

            <button
              className="pokerActBtn allin"
              onClick={handleAllIn}
              disabled={handEnded || balance <= 0}
            >
              <Flame />
              <span>All-In</span>
            </button>
          </div>

          {/* Quick Denominations & Multipliers Bar */}
          <div className="pokerBetToolBar">
            <div className="chipPillsRow">
              <button className="pokerChipBtn c500" onClick={() => setRaiseAmount(500000)}>500K</button>
              <button className="pokerChipBtn c100" onClick={() => setRaiseAmount(100000)}>100K</button>
              <button className="pokerChipBtn c25" onClick={() => setRaiseAmount(25000)}>25K</button>
              <button className="pokerChipBtn c5" onClick={() => setRaiseAmount(5000)}>5K</button>
            </div>

            <div className="quickMultipliersRow">
              <button className="quickMulBtn" onClick={() => setRaiseAmount(r => r * 2)}>2x</button>
              <button className="quickMulBtn" onClick={() => setRaiseAmount(r => r * 3)}>3x</button>
              <button className="quickMulBtn" onClick={() => setRaiseAmount(pot)}>Pot</button>
              <button className="quickMulBtn max" onClick={() => setRaiseAmount(Math.min(balance, 1000000))}>Max</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
