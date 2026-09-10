import {useEffect, useRef, useState} from 'react';
import {ArrowUpRight, Check, Coins, Flame, Lock, Play, Plus, Timer, X, Zap} from 'lucide-react';
import {ResultFx} from '../shared/ResultFx.jsx';
import {Topbar} from '../shared/Topbar.jsx';
import {playCelebrationAudio} from '../shared/audio.js';
import {money} from '../shared/format.js';
import {useGameFx} from '../shared/hooks.js';
import {api} from '../shared/api.js';
import {SEATS_CONFIG} from './poker-engine.js';
import './poker.css';

export function Poker({goHome, balance, setBalance, sound, setSound, token}) {
  const [fx, triggerFx, dismissFx] = useGameFx();
  const [stage, setStage] = useState('idle'); // idle, flop, turn, river, showdown, folded
  const [handId, setHandId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pot, setPot] = useState(0);
  const [currentBet, setCurrentBet] = useState(10000);
  const [raiseAmount, setRaiseAmount] = useState(20000);
  const [timer, setTimer] = useState(12);
  const [autoCheck, setAutoCheck] = useState(false);
  const [handNo, setHandNo] = useState(1);
  const [statusMsg, setStatusMsg] = useState('Sẵn sàng vào bàn');

  // Cards State
  const [heroHand, setHeroHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [communityCards, setCommunityCards] = useState([]);
  const [handRank, setHandRank] = useState('');
  const [handEnded, setHandEnded] = useState(true);

  // Sound ref
  const soundRef = useRef(sound);
  useEffect(() => { soundRef.current = sound; }, [sound]);

  // Start a fresh hand via Backend API
  const startNewHand = async (customAnte = 10000) => {
    if (loading) return;
    const ante = customAnte;
    if (balance < ante) {
      triggerFx('diceLose', 'KHÔNG ĐỦ VÀNG ĐỂ ĐẶT ANTE', 2200);
      setStatusMsg('Số dư không đủ để vào bàn. Vui lòng nạp thêm vàng.');
      return;
    }
    setLoading(true);
    setStatusMsg('Đang chia bài từ máy chủ...');
    try {
      const res = await api('/games/poker/deal', {
        token,
        method: 'POST',
        body: JSON.stringify({ante})
      });
      setHandId(res.handId);
      setHeroHand(res.heroHand || []);
      setDealerHand([]);
      setCommunityCards(res.communityCards || []);
      setStage(res.stage || 'flop');
      setPot(res.pot || ante * 2);
      setCurrentBet(res.currentBet || ante);
      setRaiseAmount((res.currentBet || ante) * 2);
      setTimer(12);
      setHandEnded(false);
      setHandNo(h => h + 1);
      setHandRank(res.handRank || '');
      setStatusMsg(`Flop đã mở · ${res.handRank || ''}`);
      if (res.balance !== undefined) setBalance(res.balance);
    } catch (err) {
      triggerFx('diceLose', err.message || 'Không thể chia bài', 2200);
      setStatusMsg(err.message || 'Lỗi bắt đầu ván');
    } finally {
      setLoading(false);
    }
  };

  // Send player action to Backend API
  const sendAction = async (action, amount) => {
    if (!handId || loading || handEnded) return;
    setLoading(true);
    try {
      const res = await api('/games/poker/action', {
        token,
        method: 'POST',
        body: JSON.stringify({handId, action, amount})
      });

      if (res.balance !== undefined) {
        setBalance(res.balance);
      }

      if (res.stage === 'folded') {
        setStage('folded');
        setHandEnded(true);
        setStatusMsg('Bạn đã Fold (Bỏ bài)');
        triggerFx('diceLose', 'BỎ BÀI', 2000);
        setTimeout(() => {
          setStage('idle');
          setStatusMsg('Ván đã kết thúc. Bấm "Vào bàn mới" để tiếp tục.');
        }, 2200);
        return;
      }

      if (res.stage === 'showdown') {
        setStage('showdown');
        setHandEnded(true);
        if (res.communityCards) setCommunityCards(res.communityCards);
        if (res.dealerHand) setDealerHand(res.dealerHand);
        if (res.heroRank) setHandRank(res.heroRank);

        if (res.winner === 'hero') {
          playCelebrationAudio('bigWin', soundRef.current);
          triggerFx('bigWin', `+${money(res.payout)}`, 4500);
          setStatusMsg(`🎉 BẠN THẮNG POT: +${money(res.payout)} với ${res.heroRank}! (Nhà cái: ${res.dealerRank})`);
        } else if (res.winner === 'tie') {
          triggerFx('diceWin', `HOÀ CƯỢC: +${money(res.payout)}`, 3000);
          setStatusMsg(`🤝 Ván hoà (${res.heroRank}) · Hoàn ${money(res.payout)} cược`);
        } else {
          triggerFx('diceLose', 'NHÀ CÁI ĂN TRỌN', 2800);
          setStatusMsg(`💔 Nhà cái thắng với ${res.dealerRank} (Bạn: ${res.heroRank})`);
        }

        setTimeout(() => {
          setStage('idle');
          setStatusMsg('Ván đã kết thúc. Bấm "Vào bàn mới" để tiếp tục.');
        }, 6000);
        return;
      }

      // Still in hand (turn or river)
      setStage(res.stage);
      if (res.communityCards) setCommunityCards(res.communityCards);
      if (res.handRank) setHandRank(res.handRank);
      if (res.pot) setPot(res.pot);
      if (res.currentBet) setCurrentBet(res.currentBet);
      const streetLabel = res.stage === 'turn' ? 'Turn (4 lá)' : 'River (5 lá)';
      setStatusMsg(`${streetLabel} đã mở · ${res.handRank || ''}`);
      setTimer(12);
    } catch (err) {
      triggerFx('diceLose', err.message || 'Lỗi hành động', 2200);
      setStatusMsg(err.message || 'Không thể thực hiện hành động');
    } finally {
      setLoading(false);
    }
  };

  // Check active hand or start hand on mount
  useEffect(() => {
    let unmounted = false;
    api('/games/poker/active', {token})
      .then(res => {
        if (unmounted) return;
        if (res?.active) {
          setHandId(res.active.handId);
          setHeroHand(res.active.heroHand || []);
          setCommunityCards(res.active.communityCards || []);
          setStage(res.active.stage || 'flop');
          setPot(res.active.pot || 20000);
          setCurrentBet(res.active.currentBet || 10000);
          setRaiseAmount((res.active.currentBet || 10000) * 2);
          setHandRank(res.active.handRank || '');
          setHandEnded(false);
          setStatusMsg(`Đang tiếp tục ván · ${res.active.handRank || ''}`);
        } else {
          // Khởi động ván đầu tiên nếu đủ vàng
          if (balance >= 10000) {
            startNewHand(10000);
          } else {
            setStage('idle');
            setStatusMsg('Sẵn sàng vào bàn (Ante: 10.000 vàng)');
          }
        }
      })
      .catch(() => {
        if (unmounted) return;
        setStage('idle');
        setStatusMsg('Sẵn sàng vào bàn');
      });
    return () => { unmounted = true; };
  }, []);

  // Timer countdown
  useEffect(() => {
    if (handEnded || stage === 'idle') return;
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
  }, [handEnded, autoCheck, stage, handId]);

  // Player Actions
  const handleFold = () => sendAction('fold');
  const handleCheck = () => sendAction('check');
  const handleCall = () => sendAction('call');
  const handleRaise = () => sendAction('raise', raiseAmount);
  const handleAllIn = () => sendAction('allin');

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

              {/* Dealer Hole Cards (Revealed at Showdown on Seat 3) */}
              {seat.id === 3 && dealerHand.length === 2 && (
                <div className="heroHandBox" style={{position: 'absolute', top: '70px', left: '-15px', zIndex: 15}}>
                  {dealerHand.map((c, idx) => (
                    <div key={idx} className="pokerCard" style={{boxShadow: '0 0 10px rgba(255, 215, 0, 0.6)'}}>
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

          {/* Action Buttons: Show Start Hand when ended, otherwise Show Poker Actions */}
          {handEnded ? (
            <div className="startHandWrap" style={{display: 'flex', gap: '12px', width: '100%', justifyContent: 'center', padding: '8px 0'}}>
              <button
                className="pokerActBtn call"
                style={{minWidth: '260px', height: '50px', fontSize: '15px', fontWeight: 'bold'}}
                onClick={() => startNewHand(10000)}
                disabled={loading || balance < 10000}
              >
                <Play size={18} />
                <span>{loading ? 'ĐANG CHIA BÀI...' : 'VÀO BÀN MỚI (10.000 VÀNG)'}</span>
              </button>
            </div>
          ) : (
            <div className="actionButtonsGrid">
              <button
                className="pokerActBtn fold"
                onClick={handleFold}
                disabled={loading}
              >
                <X />
                <span>Fold</span>
              </button>

              <button
                className="pokerActBtn"
                onClick={handleCheck}
                disabled={loading}
              >
                <Check />
                <span>Check</span>
              </button>

              <button
                className="pokerActBtn call"
                onClick={handleCall}
                disabled={loading || balance < currentBet}
              >
                <Plus />
                <span>Call {money(currentBet)}</span>
              </button>

              <button
                className="pokerActBtn raise"
                onClick={handleRaise}
                disabled={loading || balance < raiseAmount}
              >
                <ArrowUpRight />
                <span>Raise {money(raiseAmount)}</span>
              </button>

              <button
                className="pokerActBtn allin"
                onClick={handleAllIn}
                disabled={loading || balance <= 0}
              >
                <Flame />
                <span>All-In</span>
              </button>
            </div>
          )}

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
