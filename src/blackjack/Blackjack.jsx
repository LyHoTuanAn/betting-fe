import {useEffect, useRef, useState} from 'react';
import {Topbar} from '../shared/Topbar.jsx';
import {ResultFx} from '../shared/ResultFx.jsx';
import {useGameFx} from '../shared/hooks.js';
import {playCelebrationAudio} from '../shared/audio.js';
import {money} from '../shared/format.js';
import {api} from '../shared/api.js';
import './blackjack.css';

const CHIP_VALUES = [1000, 5000, 25000, 100000, 500000, 1000000];

/**
 * Blackjack server-authoritative: chia bài, rút, dằn và chốt đều do backend
 * quyết định (provably fair, ghi GameRound). Component chỉ vẽ lại state máy chủ
 * trả về — không còn bộ bài hay điểm số nào được tính trên client.
 */
export function Blackjack({goHome, balance, setBalance, sound, setSound, token, user}) {
  const [fx, triggerFx, dismissFx] = useGameFx();
  const [selectedChip, setSelectedChip] = useState(25000);
  const [mainBet, setMainBet] = useState(25000);
  const [lastMainBet, setLastMainBet] = useState(25000);
  const [sideBetPair, setSideBetPair] = useState(0);
  const [sideBetPoker, setSideBetPoker] = useState(0);

  const [gameState, setGameState] = useState('betting'); // betting | playerTurn | dealerTurn | settled
  const [handId, setHandId] = useState(null);
  const [playerCards, setPlayerCards] = useState([]);
  const [dealerCards, setDealerCards] = useState([]);
  const [playerScore, setPlayerScore] = useState({total: 0, isSoft: false, isBust: false, isBlackjack: false});
  const [dealerScore, setDealerScore] = useState(null);
  const [dealerVisibleScore, setDealerVisibleScore] = useState(0);
  const [turnTimer, setTurnTimer] = useState(15);
  const [winStreak, setWinStreak] = useState(0);
  const [pastResults, setPastResults] = useState([]);
  const [toastMsg, setToastMsg] = useState('');
  const [guideMsg, setGuideMsg] = useState('👉 Chọn mức phỉnh và bấm CHIA BÀI để bắt đầu');
  const [busy, setBusy] = useState(false);

  const soundRef = useRef(sound);
  useEffect(() => { soundRef.current = sound; }, [sound]);
  const busyRef = useRef(false);
  const standRef = useRef(() => {});

  const showToast = (msg, duration = 2200) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(curr => curr === msg ? '' : curr);
    }, duration);
  };

  // Khôi phục ván đang dở (reload/F5 giữa ván) từ máy chủ
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api('/games/blackjack/active', {token}).then(data => {
      if (cancelled || !data?.active) return;
      const a = data.active;
      setHandId(a.handId);
      setMainBet(a.mainBet || a.bet);
      setPlayerCards(a.playerCards || []);
      setPlayerScore(a.playerScore || {total: 0});
      setDealerCards(a.dealerCards || []);
      setDealerVisibleScore(a.dealerVisibleScore || 0);
      setGameState(a.stage === 'player' ? 'playerTurn' : 'settled');
      setGuideMsg('👉 Đã khôi phục ván đang chơi: RÚT hoặc DẰNG');
      if (typeof a.balance === 'number') setBalance(a.balance);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [token]);

  // Đếm ngược lượt: hết giờ tự động dằn bài (server cũng có TTL riêng)
  useEffect(() => {
    if (gameState !== 'playerTurn') return;
    const interval = setInterval(() => {
      setTurnTimer(t => {
        if (t <= 1) {
          standRef.current();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState]);

  const outcomeMessage = (data) => {
    const p = data.payout ?? 0;
    switch (data.outcome) {
      case 'blackjack': return `🔥 BLACKJACK! Bạn thắng +${money(p)} (3:2)!`;
      case 'win': return data.note ? `${data.note} +${money(p)}` : `🎉 Bạn THẮNG +${money(p)}!`;
      case 'push': return `🤝 HÒA CƯỢC — hoàn lại ${money(data.mainBet || 0)}.`;
      case 'surrender': return `Bỏ bài: nhận lại ${money(p)}.`;
      case 'bust': return `💥 QUẮC (${data.playerScore?.total})! Thua ${money(data.mainBet || 0)}.`;
      default: return `💔 Nhà cái thắng (${data.playerScore?.total} vs ${data.dealerScore?.total}).`;
    }
  };

  const applySettled = (data) => {
    setGameState('settled');
    setHandId(null);
    setPlayerCards(data.playerCards || []);
    setPlayerScore(data.playerScore || {total: 0});
    setDealerCards(data.dealerCards || []);
    setDealerScore(data.dealerScore || null);
    if (typeof data.balance === 'number') setBalance(data.balance);
    setGuideMsg(outcomeMessage(data));
    const won = ['blackjack', 'win'].includes(data.outcome);
    const push = data.outcome === 'push';
    setPastResults(r => [won ? 'W' : push ? 'P' : 'L', ...r.slice(0, 4)]);
    setWinStreak(s => won ? s + 1 : 0);
    if (data.outcome === 'blackjack') {
      playCelebrationAudio('bigWin', soundRef.current);
      triggerFx('bigWin', `+${money(data.payout || 0)}`, 4500);
    } else if (won) {
      playCelebrationAudio('jackpot', soundRef.current);
      triggerFx('jackpot', `+${money(data.payout || 0)}`, 4000);
    } else if (push) {
      triggerFx('diceWin', 'HÒA CƯỢC (PUSH)', 2500);
    } else {
      triggerFx('diceLose', data.outcome === 'bust' ? `QUÁ ĐIỂM (${data.playerScore?.total})` : 'THUA CƯỢC', 2500);
    }
  };

  const applyServer = (data) => {
    setPlayerCards(data.playerCards || []);
    setPlayerScore(data.playerScore || {total: 0});
    setDealerCards(data.dealerCards || []);
    if (data.dealerScore !== null && data.dealerScore !== undefined) setDealerScore(data.dealerScore);
    setDealerVisibleScore(data.dealerVisibleScore || 0);
    if (typeof data.balance === 'number') setBalance(data.balance);
    if (data.stage === 'settled') {
      applySettled(data);
      return;
    }
    setGameState('playerTurn');
    setTurnTimer(15);
    setHandId(data.handId);
    setGuideMsg(`Điểm hiện tại: ${data.playerScore?.total ?? 0}. RÚT tiếp hay DẰNG bài?`);
  };

  const handleDeal = async () => {
    if (busyRef.current) return;
    const totalWager = mainBet + sideBetPair + sideBetPoker;
    if (totalWager <= 0) {
      showToast('Vui lòng đặt cược trước khi chia bài!');
      return;
    }
    if (balance < totalWager) {
      showToast('Số dư của bạn không đủ để đặt cược!');
      return;
    }
    busyRef.current = true; setBusy(true);
    try {
      const data = await api('/games/blackjack/deal', {
        token, method: 'POST',
        body: JSON.stringify({bet: mainBet, sidePair: sideBetPair, side21: sideBetPoker})
      });
      setLastMainBet(mainBet);
      applyServer(data);
      const sides = data.sideResults || {};
      const sideWins = [sides.pair, sides.p21].filter(s => s?.won && s.payout > 0);
      if (sideWins.length > 0) {
        showToast(`🎉 Cược phụ thắng: ${sideWins.map(s => `${s.label} +${money(s.payout)}`).join(' · ')}`, 3200);
      }
    } catch (err) {
      showToast(err.display || 'Không chia được bài, thử lại nhé!');
    } finally {
      busyRef.current = false; setBusy(false);
    }
  };

  const doAction = async (action) => {
    if (busyRef.current || !handId) return;
    busyRef.current = true; setBusy(true);
    try {
      const data = await api('/games/blackjack/action', {
        token, method: 'POST',
        body: JSON.stringify({handId, action})
      });
      if (action === 'double') showToast(`Gấp đôi (${money(data.mainBet)})!`);
      applyServer(data);
    } catch (err) {
      showToast(err.display || 'Máy chủ từ chối nước đi này.');
    } finally {
      busyRef.current = false; setBusy(false);
    }
  };

  const handleHit = () => { if (gameState === 'playerTurn') doAction('hit'); };
  const handleStand = () => { if (gameState === 'playerTurn') doAction('stand'); };
  const handleDouble = () => {
    if (gameState !== 'playerTurn' || playerCards.length !== 2) return;
    if (balance < mainBet) {
      showToast('Số dư không đủ để cược gấp đôi!');
      return;
    }
    doAction('double');
  };
  const handleSurrender = () => {
    if (gameState !== 'playerTurn' || playerCards.length !== 2) return;
    doAction('surrender');
  };
  standRef.current = handleStand;

  const canDouble = gameState === 'playerTurn' && playerCards.length === 2 && balance >= mainBet && !busy;
  const canSurrender = gameState === 'playerTurn' && playerCards.length === 2 && !busy;

  const formatScoreBadge = (scoreObj, isDealer = false) => {
    if (!scoreObj || scoreObj.total === 0) return '0';
    if (isDealer && gameState === 'playerTurn') return `${dealerVisibleScore} + ?`;
    if (scoreObj.isBlackjack) return '🔥 XÌ DÁCH';
    if (scoreObj.isBust) return `💥 QUẮC (${scoreObj.total})`;
    if (scoreObj.total === 21) return '⭐ 21 ĐIỂM';
    return `${scoreObj.total} Điểm`;
  };

  // Máy chủ chỉ gửi lá úp khi ván chưa chốt — client tự vẽ lá úp ẩn
  const dealerRender = gameState === 'playerTurn' && dealerCards.length === 1
    ? [...dealerCards, {id: 'hole-card'}]
    : dealerCards;
  const dealerScoreObj = gameState === 'playerTurn'
    ? {total: dealerVisibleScore}
    : (dealerScore || {total: 0});

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
              {dealerRender.length === 0 ? (
                <div className="bjCardPlaceholder">
                  <div className="bjEmptyCardSlot" />
                  <div className="bjEmptyCardSlot" />
                </div>
              ) : (
                dealerRender.map((card, idx) => {
                  const isHidden = card.id === 'hole-card';
                  if (isHidden) {
                    return (
                      <div key={card.id} className="bjCard bjCardFacedown">
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
                  if (gameState === 'playerTurn' || gameState === 'dealerTurn' || busy) return;
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
                  if (gameState === 'playerTurn' || gameState === 'dealerTurn' || busy) return;
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
                  if (gameState === 'playerTurn' || gameState === 'dealerTurn' || busy) return;
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
              <div className={`bjScoreBadge ${playerScore.isBust ? 'bust' : playerScore.isBlackjack ? 'blackjack' : 'player'}`}>
                {formatScoreBadge(playerScore, false)}
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
              <button className="bjTurnBtn hit" disabled={busy} onClick={handleHit}>
                <span className="btnMain">RÚT THÊM</span>
                <span className="btnSub">(HIT)</span>
              </button>

              <button className="bjTurnBtn stand" disabled={busy} onClick={handleStand}>
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

                <button className="bjDealPrimaryBtn" disabled={busy} onClick={handleDeal}>
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
