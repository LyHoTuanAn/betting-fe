import {useEffect, useRef, useState} from 'react';
import {Topbar} from '../shared/Topbar.jsx';
import {ResultFx} from '../shared/ResultFx.jsx';
import {useGameFx} from '../shared/hooks.js';
import {playCelebrationAudio} from '../shared/audio.js';
import {money} from '../shared/format.js';
import {api} from '../shared/api.js';
import {
  calculateHandScore,
  check21Plus3,
  checkPerfectPairs,
  createShoe
} from './blackjack-engine.js';
import './blackjack.css';

const CHIP_VALUES = [10, 25, 50, 100, 500];

export function Blackjack({goHome, balance, setBalance, sound, setSound, token, user}) {
  const [fx, triggerFx, dismissFx] = useGameFx();
  const [shoe, setShoe] = useState(() => createShoe(6));
  const [selectedChip, setSelectedChip] = useState(100);
  const [mainBet, setMainBet] = useState(250);
  const [lastMainBet, setLastMainBet] = useState(250);
  const [sideBetPair, setSideBetPair] = useState(25);
  const [sideBetPoker, setSideBetPoker] = useState(25);

  // Game state: 'betting', 'playerTurn', 'dealerTurn', 'settled'
  const [gameState, setGameState] = useState('betting');
  const [dealerCards, setDealerCards] = useState([]);
  const [playerCards, setPlayerCards] = useState([]);
  const [turnTimer, setTurnTimer] = useState(15);
  const [winStreak, setWinStreak] = useState(3);
  const [pastResults, setPastResults] = useState(['W', 'W', 'W', 'L']);
  const [toastMsg, setToastMsg] = useState('');
  const [statusText, setStatusText] = useState('Đặt cược và bấm CHIA BÀI để bắt đầu');

  const soundRef = useRef(sound);
  useEffect(() => { soundRef.current = sound; }, [sound]);

  const showToast = (msg, duration = 2200) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(curr => curr === msg ? '' : curr);
    }, duration);
  };

  const drawCard = (currentShoe) => {
    let s = currentShoe;
    if (s.length < 15) {
      s = createShoe(6);
    }
    const card = s[0];
    const rem = s.slice(1);
    setShoe(rem);
    return { card, newShoe: rem };
  };

  // Turn timer
  useEffect(() => {
    if (gameState !== 'playerTurn') return;
    const interval = setInterval(() => {
      setTurnTimer(t => {
        if (t <= 1) {
          handleStand();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, playerCards, dealerCards]);

  // Initial deal
  const handleDeal = async () => {
    const totalWager = mainBet + sideBetPair + sideBetPoker;
    if (balance < totalWager) {
      showToast('Số dư không đủ để đặt cược!');
      return;
    }

    setBalance(b => b - totalWager);
    setLastMainBet(mainBet);

    let curShoe = shoe;
    const p1 = drawCard(curShoe); curShoe = p1.newShoe;
    const d1 = drawCard(curShoe); curShoe = d1.newShoe;
    const p2 = drawCard(curShoe); curShoe = p2.newShoe;
    const d2 = drawCard(curShoe); curShoe = d2.newShoe;

    const initialPlayerCards = [p1.card, p2.card];
    const initialDealerCards = [d1.card, d2.card];

    setPlayerCards(initialPlayerCards);
    setDealerCards(initialDealerCards);
    setTurnTimer(15);

    // Evaluate side bets
    let sidePayout = 0;
    if (sideBetPair > 0) {
      const pairRes = checkPerfectPairs(p1.card, p2.card);
      if (pairRes.won) {
        const winAmount = sideBetPair * (pairRes.multiplier + 1);
        sidePayout += winAmount;
        showToast(`🎉 Thắng ${pairRes.label}: +$${winAmount}`);
      }
    }
    if (sideBetPoker > 0) {
      const pokerRes = check21Plus3(p1.card, p2.card, d1.card);
      if (pokerRes.won) {
        const winAmount = sideBetPoker * (pokerRes.multiplier + 1);
        sidePayout += winAmount;
        showToast(`🎉 Thắng ${pokerRes.label}: +$${winAmount}`);
      }
    }

    if (sidePayout > 0) {
      setBalance(b => b + sidePayout);
    }

    const pScore = calculateHandScore(initialPlayerCards);
    const dScore = calculateHandScore(initialDealerCards);

    // Check instant Blackjack
    if (pScore.isBlackjack) {
      setGameState('settled');
      if (dScore.isBlackjack) {
        // Push
        setBalance(b => b + mainBet);
        setStatusText('Cả hai đều được BLACKJACK! Hòa tiền cược.');
        setPastResults(r => ['P', ...r.slice(0, 3)]);
        triggerFx('diceWin', 'HÒA CƯỢC (PUSH)', 2500);
      } else {
        // Natural 3:2 payout
        const bjWin = mainBet + Math.floor(mainBet * 1.5);
        setBalance(b => b + bjWin);
        setStatusText(`🔥 BLACKJACK! Bạn thắng +$${bjWin} (3:2)!`);
        setWinStreak(s => s + 1);
        setPastResults(r => ['W', ...r.slice(0, 3)]);
        playCelebrationAudio('bigWin', soundRef.current);
        triggerFx('bigWin', `+$${bjWin}`, 4500);
      }
      return;
    }

    setGameState('playerTurn');
    setStatusText('Lượt của bạn: Rút thêm (HIT) hoặc Dằn bài (STAND)');
  };

  // Player HIT
  const handleHit = () => {
    if (gameState !== 'playerTurn') return;
    const { card, newShoe } = drawCard(shoe);
    const nextCards = [...playerCards, card];
    setPlayerCards(nextCards);

    const score = calculateHandScore(nextCards);
    if (score.isBust) {
      setGameState('settled');
      setStatusText(`Quá 21 điểm (${score.total})! Bạn đã thua.`);
      setWinStreak(0);
      setPastResults(r => ['L', ...r.slice(0, 3)]);
      triggerFx('diceLose', `QUÁ ĐIỂM (${score.total})`, 2500);
      showToast('Quá 21 điểm (BUST)!');
    } else if (score.total === 21) {
      showToast('Đạt 21 điểm! Chuyển lượt nhà cái...');
      setTimeout(() => finishDealerTurn(nextCards), 800);
    } else {
      showToast(`Rút được ${card.rank}${card.symbol} · Tổng điểm: ${score.total}`);
    }
  };

  // Player STAND
  const handleStand = () => {
    if (gameState !== 'playerTurn') return;
    showToast(`Dằn bài với ${calculateHandScore(playerCards).total} điểm (STAND)`);
    finishDealerTurn(playerCards);
  };

  // Player DOUBLE
  const handleDouble = () => {
    if (gameState !== 'playerTurn' || playerCards.length !== 2) return;
    if (balance < mainBet) {
      showToast('Số dư không đủ để gấp đôi!');
      return;
    }

    setBalance(b => b - mainBet);
    const newMainBet = mainBet * 2;
    setMainBet(newMainBet);

    const { card } = drawCard(shoe);
    const nextCards = [...playerCards, card];
    setPlayerCards(nextCards);
    showToast(`Cược gấp đôi ($${newMainBet})! Rút 1 lá duy nhất: ${card.rank}${card.symbol}`);

    const score = calculateHandScore(nextCards);
    if (score.isBust) {
      setGameState('settled');
      setStatusText(`Quá 21 điểm (${score.total})! Bạn đã thua $${newMainBet}.`);
      setWinStreak(0);
      setPastResults(r => ['L', ...r.slice(0, 3)]);
      triggerFx('diceLose', `QUÁ ĐIỂM (${score.total})`, 2500);
    } else {
      setTimeout(() => finishDealerTurn(nextCards, newMainBet), 1000);
    }
  };

  // Player SURRENDER
  const handleSurrender = () => {
    if (gameState !== 'playerTurn' || playerCards.length !== 2) return;
    const refund = Math.floor(mainBet / 2);
    setBalance(b => b + refund);
    setGameState('settled');
    setStatusText(`Đầu hàng (FOLD): Nhận lại 50% ($${refund}).`);
    setWinStreak(0);
    setPastResults(r => ['L', ...r.slice(0, 3)]);
    showToast(`Đã bỏ bài. Nhận lại $${refund}`);
    triggerFx('diceLose', 'BỎ BÀI (FOLD)', 2000);
  };

  // Dealer Turn & Settlement
  const finishDealerTurn = (finalPlayerCards, activeBet = mainBet) => {
    setGameState('dealerTurn');
    setStatusText('Nhà cái đang rút bài...');

    let curDealer = [...dealerCards];
    let curShoe = shoe;
    let dScore = calculateHandScore(curDealer);

    const stepDealer = () => {
      if (dScore.total < 17) {
        const drawn = drawCard(curShoe);
        curShoe = drawn.newShoe;
        curDealer.push(drawn.card);
        setDealerCards([...curDealer]);
        dScore = calculateHandScore(curDealer);
        setTimeout(stepDealer, 700);
      } else {
        // Evaluate winner
        const pScore = calculateHandScore(finalPlayerCards);
        setGameState('settled');

        if (dScore.isBust) {
          const winAmount = activeBet * 2;
          setBalance(b => b + winAmount);
          setStatusText(`🎉 Nhà cái quá 21 điểm (${dScore.total})! Bạn thắng +$${winAmount}!`);
          setWinStreak(s => s + 1);
          setPastResults(r => ['W', ...r.slice(0, 3)]);
          playCelebrationAudio('jackpot', soundRef.current);
          triggerFx('jackpot', `+$${winAmount}`, 4000);
        } else if (pScore.total > dScore.total) {
          const winAmount = activeBet * 2;
          setBalance(b => b + winAmount);
          setStatusText(`🎉 Bạn (${pScore.total}) thắng Nhà cái (${dScore.total})! Nhận +$${winAmount}!`);
          setWinStreak(s => s + 1);
          setPastResults(r => ['W', ...r.slice(0, 3)]);
          playCelebrationAudio('bigWin', soundRef.current);
          triggerFx('bigWin', `+$${winAmount}`, 4000);
        } else if (pScore.total === dScore.total) {
          setBalance(b => b + activeBet);
          setStatusText(`🤝 Hòa điểm (${pScore.total})! Hoàn lại cược $${activeBet}.`);
          setPastResults(r => ['P', ...r.slice(0, 3)]);
          triggerFx('diceWin', 'HÒA CƯỢC (PUSH)', 2500);
        } else {
          setStatusText(`💔 Nhà cái (${dScore.total}) thắng Bạn (${pScore.total}).`);
          setWinStreak(0);
          setPastResults(r => ['L', ...r.slice(0, 3)]);
          triggerFx('diceLose', `THUA (${pScore.total} vs ${dScore.total})`, 2500);
        }
      }
    };

    setTimeout(stepDealer, 600);
  };

  const playerScoreObj = calculateHandScore(playerCards);
  const dealerScoreObj = calculateHandScore(dealerCards);
  const dealerVisibleScore = gameState === 'playerTurn' && dealerCards.length >= 1
    ? (dealerCards[0].rank === 'A' ? 11 : dealerCards[0].value)
    : dealerScoreObj.total;

  const canSplit = gameState === 'playerTurn' && playerCards.length === 2 && playerCards[0].rank === playerCards[1].rank;

  return (
    <div className={'screen bjScreen ' + (fx.type ? `fx-${fx.type}` : '')}>
      <ResultFx fx={fx} onDismiss={dismissFx} />
      <Topbar balance={balance} onBack={goHome} sound={sound} setSound={setSound} user={user} />

      <main className="bjMain">
        {/* Table Metadata & Live Rules Strip */}
        <div className="bjMetaStrip">
          <div className="bjMetaTop">
            <div className="bjTitleWrap">
              <span className="material-symbols-outlined text-[#ffc174] text-[20px]" style={{fontVariationSettings: "'FILL' 1"}}>stars</span>
              <span className="bjTitleText">VIP BLACKJACK</span>
            </div>
            <div className="bjShoePill">
              <span className="bjDotPulse"></span>
              <span>SHOE 4/6 • DECK 68%</span>
            </div>
          </div>

          <div className="bjMetaGrid">
            <div className="bjMetaBox">
              <small>LIMITS</small>
              <strong>$50 - $2,500</strong>
            </div>
            <div className="bjMetaBox">
              <small>PAYOUT</small>
              <strong className="green">BJ Pays 3:2</strong>
            </div>
            <div className="bjMetaBox">
              <small>RULE</small>
              <strong>Stand All 17s</strong>
            </div>
          </div>
        </div>

        {/* Main Luxury Felt Surface */}
        <div className="bjFeltCanvas">
          <svg className="bjSvgOverlay" fill="none" preserveAspectRatio="none" viewBox="0 0 360 440">
            <path d="M-20 80 C 100 20, 260 20, 380 80" stroke="#ffc174" strokeDasharray="4 6" strokeWidth="1.5"></path>
            <path d="M-10 100 C 110 40, 250 40, 370 100" opacity="0.6" stroke="#ffc174" strokeWidth="0.75"></path>
            <path d="M 30 240 C 100 200, 260 200, 330 240" opacity="0.3" stroke="#ffc174" strokeDasharray="2 4" strokeWidth="1"></path>
            <circle cx="180" cy="275" opacity="0.4" r="54" stroke="#ffc174" strokeWidth="1"></circle>
          </svg>

          {/* Dealer Area */}
          <div className="bjDealerArea">
            <div className="bjDealerHeaderPill">
              <span className="material-symbols-outlined text-[#ffc174] text-[15px]">token</span>
              <span className="bjDealerTitle">DEALER • NHÀ CÁI</span>
              <div className="bjScorePill">
                SCORE: {gameState === 'playerTurn' ? `${dealerVisibleScore} / ?` : dealerScoreObj.total}
              </div>
            </div>

            {/* Dealer Cards */}
            <div className="bjCardsRow">
              {dealerCards.length === 0 ? (
                <div className="bjCardBack">
                  <div className="bjCardBackInner">
                    <span className="material-symbols-outlined text-[#ffc174] text-[24px]">diamond</span>
                  </div>
                </div>
              ) : (
                dealerCards.map((card, idx) => {
                  const isHiddenHoleCard = idx === 1 && gameState === 'playerTurn';
                  if (isHiddenHoleCard) {
                    return (
                      <div key={idx} className="bjCardBack overlap" style={{transform: 'rotate(5deg)'}}>
                        <div className="bjCardBackInner">
                          <div className="bjCardBackEmblem">
                            <span className="material-symbols-outlined text-[26px]" style={{fontVariationSettings: "'FILL' 1"}}>diamond</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={card.id || idx}
                      className={'bjCard ' + (idx > 0 ? 'overlap' : '')}
                      style={{
                        transform: `rotate(${(idx - (dealerCards.length - 1) / 2) * 4}deg)`
                      }}
                    >
                      <div className="bjCardCornerTop" style={{color: card.color}}>
                        <span className="bjCardRank">{card.rank}</span>
                        <span className="bjCardSuit">{card.symbol}</span>
                      </div>
                      <div className="bjCardCenterBg" style={{color: card.color}}>{card.symbol}</div>
                      <div className="bjCardCornerBottom" style={{color: card.color}}>
                        <span className="bjCardRank">{card.rank}</span>
                        <span className="bjCardSuit">{card.symbol}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <p className="bjDealerSubtext">Dealer Stands on Soft 17</p>
          </div>

          {/* Side Bets Row */}
          <div className="bjSideBetsRow">
            <div
              className={`bjSideBetCard ${sideBetPair > 0 ? 'active' : ''}`}
              onClick={() => {
                if (gameState === 'playerTurn') return;
                setSideBetPair(p => (p === 0 ? 25 : p === 25 ? 50 : 0));
                showToast(`Cược Perfect Pair: $${sideBetPair === 0 ? 25 : sideBetPair === 25 ? 50 : 0}`);
              }}
            >
              <span className="bjSideBetTitle orange">PERFECT PAIR</span>
              <span className="bjSideBetOdds">25 to 1</span>
              <div className="bjSideChipSpot">
                {sideBetPair > 0 ? (
                  <div className="bjSideChipBadge orange">${sideBetPair}</div>
                ) : (
                  <span className="text-[10px] text-[#a08e7a]">+</span>
                )}
              </div>
            </div>

            <div
              className={`bjSideBetCard ${sideBetPoker > 0 ? 'active' : ''}`}
              onClick={() => {
                if (gameState === 'playerTurn') return;
                setSideBetPoker(p => (p === 0 ? 25 : p === 25 ? 50 : 0));
                showToast(`Cược 21+3 Poker: $${sideBetPoker === 0 ? 25 : sideBetPoker === 25 ? 50 : 0}`);
              }}
            >
              <span className="bjSideBetTitle green">21 + 3 POKER</span>
              <span className="bjSideBetOdds">9 to 1</span>
              <div className="bjSideChipSpot">
                {sideBetPoker > 0 ? (
                  <div className="bjSideChipBadge green">${sideBetPoker}</div>
                ) : (
                  <span className="text-[10px] text-[#a08e7a]">+</span>
                )}
              </div>
            </div>
          </div>

          {/* Player Active Table Spot */}
          <div className="bjPlayerSpot">
            <div className="bjChipStackArea">
              <div
                className="bjMainBetDisc"
                onClick={() => {
                  if (gameState === 'playerTurn') return;
                  setMainBet(m => m + selectedChip);
                  showToast(`Tăng cược chính lên $${mainBet + selectedChip}`);
                }}
              >
                <div className="bjMainChipDisplay">
                  <div className="bjMainChipPill">${mainBet}</div>
                  <div className="bjChipStackDecor" />
                </div>
                <span className="bjMainBetLabel">MAIN BET</span>
              </div>
            </div>

            {/* Score & Turn Pill */}
            <div className="bjScoreTimerRow">
              <div className="bjPlayerScoreTag">
                <span>TỔNG ĐIỂM:</span>
                <strong>{playerScoreObj.total}</strong>
              </div>
              <div className="bjTurnTag">
                <span className="bjDotPulse" />
                <span>{gameState === 'playerTurn' ? 'LƯỢT CỦA BẠN' : gameState === 'settled' ? 'ĐÃ KẾT THÚC' : 'CHỜ CƯỢC'}</span>
              </div>
            </div>

            {/* Countdown Bar */}
            {gameState === 'playerTurn' && (
              <div className="bjTurnTimerBar">
                <div className="bjTurnTimerProgress" style={{width: `${(turnTimer / 15) * 100}%`}} />
              </div>
            )}

            {/* Player's Cards */}
            <div className="bjCardsRow">
              {playerCards.map((card, idx) => (
                <div
                  key={card.id || idx}
                  className={'bjPlayerCard ' + (idx > 0 ? 'overlap' : '')}
                  style={{
                    transform: `rotate(${(idx - (playerCards.length - 1) / 2) * 5}deg)`
                  }}
                >
                  <div className="bjCardCornerTop" style={{color: card.color}}>
                    <span className="bjCardRank">{card.rank}</span>
                    <span className="bjCardSuit">{card.symbol}</span>
                  </div>
                  <div className="bjCardCenterBg" style={{color: card.color}}>{card.symbol}</div>
                  <div className="bjCardCornerBottom" style={{color: card.color}}>
                    <span className="bjCardRank">{card.rank}</span>
                    <span className="bjCardSuit">{card.symbol}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Win Streak & History */}
        <div className="bjStreakRow">
          <div className="bjStreakPill">
            <span className="material-symbols-outlined text-[16px] text-[#ffc174]">local_fire_department</span>
            <span>WIN STREAK: {winStreak}X</span>
          </div>
          <div className="bjPastPill">
            <span className="material-symbols-outlined text-[14px]">history</span>
            <span>Past: {pastResults.join(' • ')}</span>
          </div>
        </div>

        {/* Interactive Action Controls */}
        <div className="bjActionsGrid">
          <button
            className="bjActionBtn hit"
            disabled={gameState !== 'playerTurn'}
            onClick={handleHit}
          >
            <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings: "'FILL' 1"}}>add_circle</span>
            <span className="bjActionName">HIT</span>
            <span className="bjActionSub">Rút Thêm</span>
          </button>

          <button
            className="bjActionBtn stand"
            disabled={gameState !== 'playerTurn'}
            onClick={handleStand}
          >
            <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings: "'FILL' 1"}}>pan_tool</span>
            <span className="bjActionName">STAND</span>
            <span className="bjActionSub">Dằn Bài</span>
          </button>

          <button
            className="bjActionBtn double"
            disabled={gameState !== 'playerTurn' || playerCards.length !== 2}
            onClick={handleDouble}
          >
            <span className="material-symbols-outlined text-[20px]">exposure_plus_2</span>
            <span className="bjActionName">DOUBLE</span>
            <span className="bjActionSub">Gấp Đôi</span>
          </button>

          <button
            className="bjActionBtn split"
            disabled={!canSplit}
          >
            <span className="material-symbols-outlined text-[20px]">call_split</span>
            <span className="bjActionName">SPLIT</span>
            <span className="bjActionSub">Tách Bài</span>
          </button>

          <button
            className="bjActionBtn fold"
            disabled={gameState !== 'playerTurn' || playerCards.length !== 2}
            onClick={handleSurrender}
          >
            <span className="material-symbols-outlined text-[20px]">flag</span>
            <span className="bjActionName">FOLD</span>
            <span className="bjActionSub">Bỏ Bài</span>
          </button>
        </div>

        {/* Chip Tray & Quick Actions */}
        <div className="bjChipTrayBox">
          <div className="bjChipTrayTop">
            <span className="bjChipTrayLabel">Chọn Phỉnh Cược (Chips)</span>
            <span className="bjChipTrayBalance">Số dư: ${money(balance)}</span>
          </div>

          <div className="bjChipsScroll">
            {CHIP_VALUES.map(val => (
              <button
                key={val}
                className={`bjChipBtn ${selectedChip === val ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedChip(val);
                  showToast(`Đã chọn phỉnh $${val}`);
                }}
              >
                <div className={`bjChipOuter c${val}`}>
                  <div className="bjChipInner">${val}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="bjQuickUtilsRow">
            <button
              className="bjUtilBtn"
              disabled={gameState === 'playerTurn'}
              onClick={() => {
                setMainBet(lastMainBet);
                showToast(`Đã cược lại: $${lastMainBet}`);
              }}
            >
              <span className="material-symbols-outlined text-[14px]">replay</span>
              CƯỢC LẠI
            </button>

            <button
              className="bjUtilBtn"
              disabled={gameState === 'playerTurn'}
              onClick={() => {
                setMainBet(50);
                setSideBetPair(0);
                setSideBetPoker(0);
                showToast('Đã xóa các mức cược phụ');
              }}
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
              XÓA CƯỢC
            </button>
          </div>

          {gameState !== 'playerTurn' && (
            <button className="bjDealStartBtn" onClick={handleDeal}>
              <span className="material-symbols-outlined text-[20px]">play_circle</span>
              <span>{gameState === 'settled' ? 'CHIA VÁN MỚI' : 'CHIA BÀI NGAY'} (${mainBet + sideBetPair + sideBetPoker})</span>
            </button>
          )}
        </div>

        {/* Toast Feedback */}
        {toastMsg && (
          <div className="bjToast">
            <span className="material-symbols-outlined text-[#ffc174] text-[18px]">verified</span>
            <span>{toastMsg}</span>
          </div>
        )}
      </main>
    </div>
  );
}
