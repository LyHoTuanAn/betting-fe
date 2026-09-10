import {useEffect, useRef, useState} from 'react';
import {Topbar} from '../shared/Topbar.jsx';
import {ResultFx} from '../shared/ResultFx.jsx';
import {useGameFx} from '../shared/hooks.js';
import {playCelebrationAudio} from '../shared/audio.js';
import {money} from '../shared/format.js';
import {
  calculateHandScore,
  check21Plus3,
  checkPerfectPairs,
  createShoe
} from './blackjack-engine.js';
import './blackjack.css';

const CHIP_VALUES = [1000, 5000, 25000, 100000, 500000, 1000000];

export function Blackjack({goHome, balance, setBalance, sound, setSound, token, user}) {
  const [fx, triggerFx, dismissFx] = useGameFx();
  const [shoe, setShoe] = useState(() => createShoe(6));
  const [selectedChip, setSelectedChip] = useState(25000);
  const [mainBet, setMainBet] = useState(25000);
  const [lastMainBet, setLastMainBet] = useState(25000);
  const [sideBetPair, setSideBetPair] = useState(0);
  const [sideBetPoker, setSideBetPoker] = useState(0);

  // Game state: 'betting', 'playerTurn', 'dealerTurn', 'settled'
  const [gameState, setGameState] = useState('betting');
  const [dealerCards, setDealerCards] = useState([]);
  const [playerCards, setPlayerCards] = useState([]);
  const [turnTimer, setTurnTimer] = useState(15);
  const [winStreak, setWinStreak] = useState(0);
  const [pastResults, setPastResults] = useState(['W', 'W', 'L']);
  const [toastMsg, setToastMsg] = useState('');
  const [guideMsg, setGuideMsg] = useState('👉 Chọn mức phỉnh và bấm CHIA BÀI để bắt đầu');

  const soundRef = useRef(sound);
  useEffect(() => { soundRef.current = sound; }, [sound]);

  const showToast = (msg, duration = 2000) => {
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

  // Turn timer countdown
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
  const handleDeal = () => {
    const totalWager = mainBet + sideBetPair + sideBetPoker;
    if (totalWager <= 0) {
      showToast('Vui lòng đặt cược trước khi chia bài!');
      return;
    }
    if (balance < totalWager) {
      showToast('Số dư của bạn không đủ để đặt cược!');
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
        showToast(`🎉 Thắng ${pairRes.label}: +${money(winAmount)}`);
      }
    }
    if (sideBetPoker > 0) {
      const pokerRes = check21Plus3(p1.card, p2.card, d1.card);
      if (pokerRes.won) {
        const winAmount = sideBetPoker * (pokerRes.multiplier + 1);
        sidePayout += winAmount;
        showToast(`🎉 Thắng ${pokerRes.label}: +${money(winAmount)}`);
      }
    }

    if (sidePayout > 0) {
      setBalance(b => b + sidePayout);
    }

    const pScore = calculateHandScore(initialPlayerCards);
    const dScore = calculateHandScore(initialDealerCards);

    // Check instant Blackjack (21 with 2 cards)
    if (pScore.isBlackjack) {
      setGameState('settled');
      if (dScore.isBlackjack) {
        // Push
        setBalance(b => b + mainBet);
        setGuideMsg('🤝 Cả hai đều được BLACKJACK! Hòa tiền cược.');
        setPastResults(r => ['P', ...r.slice(0, 4)]);
        triggerFx('diceWin', 'HÒA CƯỢC (PUSH)', 2500);
      } else {
        // Natural 3:2 payout
        const bjWin = mainBet + Math.floor(mainBet * 1.5);
        setBalance(b => b + bjWin);
        setGuideMsg(`🔥 BLACKJACK! Bạn thắng +${money(bjWin)} (Tỷ lệ 3:2)!`);
        setWinStreak(s => s + 1);
        setPastResults(r => ['W', ...r.slice(0, 4)]);
        playCelebrationAudio('bigWin', soundRef.current);
        triggerFx('bigWin', `+${money(bjWin)}`, 4500);
      }
      return;
    }

    setGameState('playerTurn');
    setGuideMsg('👉 Lượt của bạn: Bấm RÚT để thêm bài hoặc DẰNG nếu đã đủ điểm');
  };

  // Player HIT (Rút thêm bài)
  const handleHit = () => {
    if (gameState !== 'playerTurn') return;
    const { card } = drawCard(shoe);
    const nextCards = [...playerCards, card];
    setPlayerCards(nextCards);

    const score = calculateHandScore(nextCards);
    if (score.isBust) {
      setGameState('settled');
      setGuideMsg(`💥 QUẮC (${score.total} điểm)! Quá 21 điểm - Bạn đã thua.`);
      setWinStreak(0);
      setPastResults(r => ['L', ...r.slice(0, 4)]);
      triggerFx('diceLose', `QUÁ ĐIỂM (${score.total})`, 2500);
    } else if (score.total === 21) {
      showToast('Đạt 21 điểm hoàn hảo! Chuyển lượt nhà cái...');
      setTimeout(() => finishDealerTurn(nextCards), 700);
    } else {
      setGuideMsg(`Điểm hiện tại: ${score.total} điểm. RÚT tiếp hay DẰNG bài?`);
    }
  };

  // Player STAND (Dằn bài / Dừng)
  const handleStand = () => {
    if (gameState !== 'playerTurn') return;
    const pTotal = calculateHandScore(playerCards).total;
    showToast(`Bạn dừng ở ${pTotal} điểm`);
    finishDealerTurn(playerCards);
  };

  // Player DOUBLE (Gấp đôi cược & rút đúng 1 lá)
  const handleDouble = () => {
    if (gameState !== 'playerTurn' || playerCards.length !== 2) return;
    if (balance < mainBet) {
      showToast('Số dư không đủ để cược gấp đôi!');
      return;
    }

    setBalance(b => b - mainBet);
    const newMainBet = mainBet * 2;
    setMainBet(newMainBet);

    const { card } = drawCard(shoe);
    const nextCards = [...playerCards, card];
    setPlayerCards(nextCards);
    showToast(`Gấp đôi (${money(newMainBet)})! Rút 1 lá: ${card.rank}${card.symbol}`);

    const score = calculateHandScore(nextCards);
    if (score.isBust) {
      setGameState('settled');
      setGuideMsg(`💥 QUẮC (${score.total} điểm)! Thua cược gấp đôi ${money(newMainBet)}.`);
      setWinStreak(0);
      setPastResults(r => ['L', ...r.slice(0, 4)]);
      triggerFx('diceLose', `QUÁ ĐIỂM (${score.total})`, 2500);
    } else {
      setTimeout(() => finishDealerTurn(nextCards, newMainBet), 900);
    }
  };

  // Player FOLD / SURRENDER (Đầu hàng lấy lại 50%)
  const handleSurrender = () => {
    if (gameState !== 'playerTurn' || playerCards.length !== 2) return;
    const refund = Math.floor(mainBet / 2);
    setBalance(b => b + refund);
    setGameState('settled');
    setGuideMsg(`Bỏ bài: Nhận lại 50% cược (${money(refund)}).`);
    setWinStreak(0);
    setPastResults(r => ['L', ...r.slice(0, 4)]);
    triggerFx('diceLose', 'BỎ BÀI (FOLD)', 2000);
  };

  // Dealer Turn & Winner Settlement
  const finishDealerTurn = (finalPlayerCards, activeBet = mainBet) => {
    setGameState('dealerTurn');
    setGuideMsg('⏳ Nhà cái đang mở bài và rút...');

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
        setTimeout(stepDealer, 650);
      } else {
        const pScore = calculateHandScore(finalPlayerCards);
        setGameState('settled');

        if (dScore.isBust) {
          const winAmount = activeBet * 2;
          setBalance(b => b + winAmount);
          setGuideMsg(`🎉 Nhà cái QUẮC (${dScore.total} điểm)! Bạn thắng +${money(winAmount)}!`);
          setWinStreak(s => s + 1);
          setPastResults(r => ['W', ...r.slice(0, 4)]);
          playCelebrationAudio('jackpot', soundRef.current);
          triggerFx('jackpot', `+${money(winAmount)}`, 4000);
        } else if (pScore.total > dScore.total) {
          const winAmount = activeBet * 2;
          setBalance(b => b + winAmount);
          setGuideMsg(`🎉 Bạn (${pScore.total} điểm) THẮNG Nhà cái (${dScore.total} điểm)! +${money(winAmount)}`);
          setWinStreak(s => s + 1);
          setPastResults(r => ['W', ...r.slice(0, 4)]);
          playCelebrationAudio('bigWin', soundRef.current);
          triggerFx('bigWin', `+${money(winAmount)}`, 4000);
        } else if (pScore.total === dScore.total) {
          setBalance(b => b + activeBet);
          setGuideMsg(`🤝 HÒA (${pScore.total} điểm)! Hoàn lại ${money(activeBet)}.`);
          setPastResults(r => ['P', ...r.slice(0, 4)]);
          triggerFx('diceWin', 'HÒA CƯỢC (PUSH)', 2500);
        } else {
          setGuideMsg(`💔 Nhà cái (${dScore.total} điểm) thắng Bạn (${pScore.total} điểm).`);
          setWinStreak(0);
          setPastResults(r => ['L', ...r.slice(0, 4)]);
          triggerFx('diceLose', `THUA (${pScore.total} vs ${dScore.total})`, 2500);
        }
      }
    };

    setTimeout(stepDealer, 500);
  };

  const playerScoreObj = calculateHandScore(playerCards);
  const dealerScoreObj = calculateHandScore(dealerCards);
  const dealerVisibleScore = gameState === 'playerTurn' && dealerCards.length >= 1
    ? (dealerCards[0].rank === 'A' ? 11 : dealerCards[0].value)
    : dealerScoreObj.total;

  const canDouble = gameState === 'playerTurn' && playerCards.length === 2 && balance >= mainBet;
  const canSurrender = gameState === 'playerTurn' && playerCards.length === 2;

  const formatScoreBadge = (scoreObj, isDealer = false) => {
    if (scoreObj.total === 0) return '0';
    if (isDealer && gameState === 'playerTurn') return `${dealerVisibleScore} + ?`;
    if (scoreObj.isBlackjack) return '🔥 XÌ DÁCH';
    if (scoreObj.isBust) return `💥 QUẮC (${scoreObj.total})`;
    if (scoreObj.total === 21) return '⭐ 21 ĐIỂM';
    return `${scoreObj.total} Điểm`;
  };

  return (
    <div className={'screen bjScreen ' + (fx.type ? `fx-${fx.type}` : '')}>
      <ResultFx fx={fx} onDismiss={dismissFx} />
      <Topbar balance={balance} onBack={goHome} sound={sound} setSound={setSound} user={user} />

      <main className="bjMain">
        {/* Table Felt Board (Single Non-scrolling Canvas) */}
        <div className="bjFeltCanvas">
          {/* Subtle Decorative Arch */}
          <div className="bjFeltDecorArch" />

          {/* 1. DEALER AREA (NHÀ CÁI) */}
          <div className="bjSection bjDealerSection">
            <div className="bjRoleHeader">
              <span className="bjRoleLabel">NHÀ CÁI (DEALER)</span>
              <span className="bjRuleNote">Dừng ở 17 điểm</span>
              <div className={`bjScoreBadge ${dealerScoreObj.isBust ? 'bust' : ''}`}>
                {formatScoreBadge(dealerScoreObj, true)}
              </div>
            </div>

            <div className="bjCardHand">
              {dealerCards.length === 0 ? (
                <div className="bjCardPlaceholder">
                  <div className="bjEmptyCardSlot" />
                  <div className="bjEmptyCardSlot" />
                </div>
              ) : (
                dealerCards.map((card, idx) => {
                  const isHidden = idx === 1 && gameState === 'playerTurn';
                  if (isHidden) {
                    return (
                      <div key={idx} className="bjCard bjCardFacedown">
                        <div className="bjCardBackPattern">
                          <span>⚜️</span>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={card.id || idx} className={`bjCard ${card.isRed ? 'isRed' : 'isBlack'}`}>
                      <div className="bjCardTop">
                        <span className="bjCardRank">{card.rank}</span>
                        <span className="bjCardSuit">{card.symbol}</span>
                      </div>
                      <div className="bjCardCenter">{card.symbol}</div>
                      <div className="bjCardBottom">
                        <span className="bjCardRank">{card.rank}</span>
                        <span className="bjCardSuit">{card.symbol}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 2. TABLE CENTER (BETTING SPOTS & LIVE GUIDE BANNER) */}
          <div className="bjCenterSection">
            {/* Live Guidance Banner */}
            <div className={`bjGuideBanner ${gameState === 'playerTurn' ? 'turnActive' : ''}`}>
              <span>{guideMsg}</span>
            </div>

            {/* Betting Spots Row */}
            <div className="bjBetSpotsRow">
              {/* Perfect Pairs Side Bet */}
              <div
                className={`bjSideSpot ${sideBetPair > 0 ? 'hasBet' : ''}`}
                onClick={() => {
                  if (gameState === 'playerTurn' || gameState === 'dealerTurn') return;
                  setSideBetPair(p => p === 0 ? selectedChip : p + selectedChip > 500000 ? 0 : p + selectedChip);
                }}
              >
                <span className="bjSpotTitle">ĐÔI HOÀN HẢO</span>
                <span className="bjSpotOdds">25 : 1</span>
                {sideBetPair > 0 ? (
                  <div className="bjSpotChip">{money(sideBetPair)}</div>
                ) : (
                  <span className="bjSpotAdd">+ CƯỢC</span>
                )}
              </div>

              {/* Main Bet Circle */}
              <div
                className={`bjMainSpot ${mainBet > 0 ? 'hasBet' : ''}`}
                onClick={() => {
                  if (gameState === 'playerTurn' || gameState === 'dealerTurn') return;
                  setMainBet(m => m + selectedChip);
                }}
              >
                <div className="bjMainSpotRing">
                  <span className="bjMainSpotTitle">CƯỢC CHÍNH</span>
                  <strong className="bjMainSpotValue">{money(mainBet)}</strong>
                </div>
              </div>

              {/* 21+3 Poker Side Bet */}
              <div
                className={`bjSideSpot ${sideBetPoker > 0 ? 'hasBet' : ''}`}
                onClick={() => {
                  if (gameState === 'playerTurn' || gameState === 'dealerTurn') return;
                  setSideBetPoker(p => p === 0 ? selectedChip : p + selectedChip > 500000 ? 0 : p + selectedChip);
                }}
              >
                <span className="bjSpotTitle">21+3 POKER</span>
                <span className="bjSpotOdds">9 : 1</span>
                {sideBetPoker > 0 ? (
                  <div className="bjSpotChip">{money(sideBetPoker)}</div>
                ) : (
                  <span className="bjSpotAdd">+ CƯỢC</span>
                )}
              </div>
            </div>
          </div>

          {/* 3. PLAYER AREA (BÀI CỦA BẠN) */}
          <div className="bjSection bjPlayerSection">
            <div className="bjRoleHeader">
              <span className="bjRoleLabel player">⭐ BẠN (PLAYER)</span>
              {gameState === 'playerTurn' && (
                <div className="bjTurnTimerPill">
                  <span>⏱️ {turnTimer}s</span>
                </div>
              )}
              <div className={`bjScoreBadge ${playerScoreObj.isBust ? 'bust' : playerScoreObj.isBlackjack ? 'blackjack' : 'player'}`}>
                {formatScoreBadge(playerScoreObj, false)}
              </div>
            </div>

            <div className="bjCardHand">
              {playerCards.length === 0 ? (
                <div className="bjCardPlaceholder">
                  <div className="bjEmptyCardSlot" />
                  <div className="bjEmptyCardSlot" />
                </div>
              ) : (
                playerCards.map((card, idx) => (
                  <div key={card.id || idx} className={`bjCard ${card.isRed ? 'isRed' : 'isBlack'}`}>
                    <div className="bjCardTop">
                      <span className="bjCardRank">{card.rank}</span>
                      <span className="bjCardSuit">{card.symbol}</span>
                    </div>
                    <div className="bjCardCenter">{card.symbol}</div>
                    <div className="bjCardBottom">
                      <span className="bjCardRank">{card.rank}</span>
                      <span className="bjCardSuit">{card.symbol}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 4. INTERACTIVE BOTTOM CONSOLE (NEATLY FITS 100DVH) */}
        <div className="bjBottomConsole">
          {/* Phase A: Player Turn Action Buttons */}
          {gameState === 'playerTurn' ? (
            <div className="bjTurnActionsGrid">
              <button className="bjTurnBtn hit" onClick={handleHit}>
                <span className="btnMain">RÚT THÊM</span>
                <span className="btnSub">(HIT)</span>
              </button>

              <button className="bjTurnBtn stand" onClick={handleStand}>
                <span className="btnMain">DẰNG BÀI</span>
                <span className="btnSub">(STAND)</span>
              </button>

              {canDouble && (
                <button className="bjTurnBtn double" onClick={handleDouble}>
                  <span className="btnMain">GẤP ĐÔI</span>
                  <span className="btnSub">(x2 CƯỢC)</span>
                </button>
              )}

              {canSurrender && (
                <button className="bjTurnBtn fold" onClick={handleSurrender}>
                  <span className="btnMain">BỎ BÀI</span>
                  <span className="btnSub">(LẤY 50%)</span>
                </button>
              )}
            </div>
          ) : (
            /* Phase B: Betting & Chip Console */
            <div className="bjBettingConsole">
              {/* Chip Tray */}
              <div className="bjChipTrayRow">
                {CHIP_VALUES.map(val => (
                  <button
                    key={val}
                    className={`bjChipItem ${selectedChip === val ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedChip(val);
                      setMainBet(prev => Math.max(val, prev));
                    }}
                  >
                    <div className={`bjChipCore c${val >= 1000000 ? '1m' : val >= 500000 ? '500k' : val >= 100000 ? '100k' : val >= 25000 ? '25k' : val >= 5000 ? '5k' : '1k'}`}>
                      <span>{val >= 1000000 ? val / 1000000 + 'M' : val >= 1000 ? val / 1000 + 'K' : val}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Utility & Deal Action Bar */}
              <div className="bjDealControlsBar">
                <button
                  className="bjUtilActionBtn"
                  onClick={() => {
                    setMainBet(lastMainBet);
                    showToast(`Cược lại: ${money(lastMainBet)}`);
                  }}
                >
                  ↩ CƯỢC LẠI
                </button>

                <button
                  className="bjUtilActionBtn"
                  onClick={() => {
                    setMainBet(selectedChip);
                    setSideBetPair(0);
                    setSideBetPoker(0);
                    showToast('Đã đặt lại cược');
                  }}
                >
                  ✕ XÓA CƯỢC
                </button>

                <button className="bjDealPrimaryBtn" onClick={handleDeal}>
                  <span>CHIA BÀI</span>
                  <small>({money(mainBet + sideBetPair + sideBetPoker)})</small>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Toast Feedback */}
        {toastMsg && (
          <div className="bjToastNotification">
            <span>{toastMsg}</span>
          </div>
        )}
      </main>
    </div>
  );
}
