import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Trophy, Flame, RefreshCw, XCircle, CheckCircle2, Clock } from 'lucide-react';
import { Topbar } from '../shared/Topbar.jsx';
import { ResultFx } from '../shared/ResultFx.jsx';
import { playCelebrationAudio } from '../shared/audio.js';
import { money } from '../shared/format.js';
import { useGameFx } from '../shared/hooks.js';
import { MASCOT_LIST, MascotIcon } from './BauCuaIcons.jsx';
import { BauCuaDice3D } from './BauCuaDice3D.jsx';
import { evaluateBauCuaWinnings, rollBauCuaDice, generateRandomTableBets } from './baucua-engine.js';
import './baucua.css';

const CHIP_VALUES = [
  { label: '10', value: 10, className: 'chip-10' },
  { label: '25', value: 25, className: 'chip-25' },
  { label: '50', value: 50, className: 'chip-50' },
  { label: '100', value: 100, className: 'chip-100' },
  { label: '500', value: 500, className: 'chip-500' },
  { label: 'ALL', value: 'all', className: 'chip-all' }
];

export function BauCua({
  goHome,
  balance,
  setBalance,
  sound,
  setSound,
  user,
  openPanel,
  token
}) {
  const [fx, triggerFx, dismissFx] = useGameFx();

  // Round Phases: 'betting' | 'shaking' | 'revealing' | 'settled'
  const [phase, setPhase] = useState('betting');
  const [timeLeft, setTimeLeft] = useState(15);
  const [roundNo, setRoundNo] = useState(() => Math.floor(Date.now() / 15000) % 900000 + 100000);

  // History list
  const [history, setHistory] = useState([
    [1, 4, 5], // Bầu, Cua, Tôm
    [2, 1, 3], // Gà, Bầu, Cá
    [0, 0, 4], // Nai, Nai, Cua
    [3, 5, 4], // Cá, Tôm, Cua
  ]);

  // Dice state
  const [dice, setDice] = useState([1, 4, 5]);

  // Bets: { NAI: 0, BAU: 0, GA: 0, CA: 0, CUA: 0, TOM: 0, TRIPLE_ANY: 0 }
  const [bets, setBets] = useState({});
  const [prevBets, setPrevBets] = useState({});
  const [tableBets, setTableBets] = useState(() => generateRandomTableBets());

  // Selected Chip Value
  const [selectedChip, setSelectedChip] = useState(50);

  // Result state
  const [lastResult, setLastResult] = useState(null);

  // Refs for timer loop
  const balanceRef = useRef(balance);
  const betsRef = useRef(bets);
  const soundRef = useRef(sound);
  const triggerFxRef = useRef(triggerFx);

  useEffect(() => { balanceRef.current = balance; }, [balance]);
  useEffect(() => { betsRef.current = bets; }, [bets]);
  useEffect(() => { soundRef.current = sound; }, [sound]);
  useEffect(() => { triggerFxRef.current = triggerFx; }, [triggerFx]);

  // Play audio helper
  const playSoundEffect = useCallback((type) => {
    if (!soundRef.current) return;
    try {
      playCelebrationAudio(type, true);
    } catch (_) {}
  }, []);

  // Total user bet calculation
  const totalUserBet = Object.values(bets).reduce((sum, v) => sum + (Number(v) || 0), 0);

  // Round loop controller
  useEffect(() => {
    let active = true;
    let timerId = null;

    const runRound = async () => {
      if (!active) return;

      // 1. START BETTING PHASE (15s)
      setPhase('betting');
      setLastResult(null);
      setTableBets(generateRandomTableBets());

      for (let t = 15; t >= 0; t--) {
        if (!active) return;
        setTimeLeft(t);
        await new Promise(r => { timerId = setTimeout(r, 1000); });
      }

      if (!active) return;

      // 2. 3D SPINNING PHASE (4.5s of smooth continuous 3D multi-axis spinning)
      setPhase('shaking');
      playSoundEffect('diceWin');
      
      const newDice = rollBauCuaDice();

      for (let s = 0; s < 4; s++) {
        if (!active) return;
        await new Promise(r => { timerId = setTimeout(r, 1100); });
        if (s < 3) playSoundEffect('combo');
      }
      if (!active) return;

      // 3. LANDING TRANSITION PHASE (1.0s) - Dice smoothly decelerate & land onto target faces
      setDice(newDice);
      setPhase('landing');
      
      // Wait for 3D landing animation to complete visually before revealing result
      await new Promise(r => { timerId = setTimeout(r, 1000); });
      if (!active) return;

      // 4. REVEALING & WINNING PHASE - Dice have fully landed, NOW highlight winning boxes & celebrate!
      setPhase('revealing');
      const curBets = { ...betsRef.current };
      const outcome = evaluateBauCuaWinnings(curBets, newDice);
      setLastResult(outcome);

      // Add to history
      setHistory(prev => [newDice, ...prev.slice(0, 5)]);

      if (outcome.isWin) {
        if (outcome.isJackpot) {
          playSoundEffect('jackpot');
          triggerFxRef.current?.('jackpot', `THẮNG BÃO CỰC LỚN +${money(outcome.totalPayout)}`);
        } else if (outcome.isTriple) {
          playSoundEffect('bigWin');
          triggerFxRef.current?.('bigWin', `BÃO 3 CON! +${money(outcome.totalPayout)}`);
        } else if (outcome.totalPayout > 500) {
          playSoundEffect('bigWin');
          triggerFxRef.current?.('bigWin', `THẮNG LỚN +${money(outcome.totalPayout)}`);
        } else {
          playSoundEffect('smallWin');
          triggerFxRef.current?.('win', `THẮNG +${money(outcome.totalPayout)}`);
        }

        // Credit payout to balance
        setBalance(prev => prev + outcome.totalPayout);
      }

      await new Promise(r => { timerId = setTimeout(r, 2800); });
      if (!active) return;

      // 5. SETTLED PHASE
      setPhase('settled');
      setPrevBets(curBets);
      setBets({});

      await new Promise(r => { timerId = setTimeout(r, 1500); });
      if (!active) return;

      setRoundNo(r => r + 1);
      runRound();
    };

    runRound();

    return () => {
      active = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [setBalance, playSoundEffect]);

  // Place chip on box handler
  const handlePlaceBet = (key) => {
    if (phase !== 'betting') return;

    let chipAmt = selectedChip;
    if (selectedChip === 'all') {
      chipAmt = Math.max(0, balance);
    }

    if (chipAmt <= 0) return;
    if (balance < chipAmt) {
      triggerFx?.('toast', 'Số dư không đủ!');
      return;
    }

    // Deduct from balance immediately when placing chip
    setBalance(b => Math.max(0, b - chipAmt));
    setBets(curr => ({
      ...curr,
      [key]: (curr[key] || 0) + chipAmt
    }));

    // Update table bet simulation
    setTableBets(curr => ({
      ...curr,
      [key]: (curr[key] || 0) + chipAmt
    }));

    playSoundEffect('combo');
  };

  // Quick Actions
  const handleDoubleBets = () => {
    if (phase !== 'betting' || totalUserBet <= 0) return;
    if (balance < totalUserBet) {
      triggerFx?.('toast', 'Số dư không đủ để gấp đôi!');
      return;
    }

    setBalance(b => b - totalUserBet);
    setBets(curr => {
      const next = {};
      Object.keys(curr).forEach(k => { next[k] = (curr[k] || 0) * 2; });
      return next;
    });
    playSoundEffect('combo');
  };

  const handleRepeatBets = () => {
    if (phase !== 'betting') return;
    const prevTotal = Object.values(prevBets).reduce((s, v) => s + (Number(v) || 0), 0);
    if (prevTotal <= 0) {
      triggerFx?.('toast', 'Chưa có cược ván trước!');
      return;
    }
    if (balance < prevTotal) {
      triggerFx?.('toast', 'Số dư không đủ để cược lại!');
      return;
    }

    setBalance(b => b - prevTotal);
    setBets({ ...prevBets });
    playSoundEffect('combo');
  };

  const handleClearBets = () => {
    if (phase !== 'betting' || totalUserBet <= 0) return;
    // Refund placed bets
    setBalance(b => b + totalUserBet);
    setBets({});
  };

  const handleConfirmBets = () => {
    if (totalUserBet <= 0) {
      triggerFx?.('toast', 'Vui lòng chọn cửa cược trước!');
      return;
    }
    triggerFx?.('toast', `Đã xác nhận cược $${totalUserBet}`);
  };

  return (
    <div className="bauCuaScreen">
      {/* Result & Celebration FX Layer */}
      <ResultFx fx={fx} onDismiss={dismissFx} />

      {/* Top Standard Goldzone Header */}
      <Topbar
        balance={balance}
        onBack={goHome}
        sound={sound}
        setSound={setSound}
        user={user}
        onProfile={goHome}
        onWallet={() => openPanel ? openPanel('wallet') : goHome()}
      />

      {/* Main Game Container */}
      <main className="bauCuaContainer">
        {/* 1. Header Card: Top Row (Title + Timer), Bottom Row (History) */}
        <section className="bcHeaderCard">
          <div className="bcHeaderTopRow">
            <div className="bcRoomInfo">
              <span className="text-[#ffc174] text-[16px]">⚜️</span>
              <span className="bcRoomTitle">BẦU CUA VIP</span>
            </div>

            {/* Countdown Timer in Top Right */}
            <div className={`bcTimerPill ${timeLeft <= 5 && phase === 'betting' ? 'danger' : 'normal'}`}>
              <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} />
              <span className="text-[11.5px] font-bold">
                {phase === 'betting' ? `CÒN ${timeLeft}s` : phase === 'shaking' ? 'ĐANG XOAY...' : phase === 'landing' ? 'MỞ BÁT...' : 'KẾT QUẢ'}
              </span>
            </div>
          </div>

          {/* Bottom Row: History Strip */}
          <div className="bcHistoryBar">
            <span className="bcHistoryLabel">Ván trước:</span>
            <div className="bcHistoryList">
              {history.map((hDice, idx) => (
                <div key={idx} className="bcHistoryRound" style={{ opacity: idx === 0 ? 1 : 0.8 - idx * 0.12 }}>
                  {hDice.map((dId, dIdx) => (
                    <span key={dIdx} className="text-[12px] leading-none">
                      {MASCOT_LIST[dId]?.symbol}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 2. 3D Dice Shaker Stage (Elevated & Prominent) */}
        <BauCuaDice3D
          dice={dice}
          phase={phase}
        />

        {/* 3. Special Bet: Cược Bão (Triple Jackpot Zone - 1 Ăn 30) */}
        <div
          className={`bcTripleBetBanner ${lastResult?.isTriple ? 'isWinning' : ''}`}
          onClick={() => handlePlaceBet('TRIPLE_ANY')}
        >
          <div className="bcTripleLeft">
            <div className="bcCycloneIconBox">
              <Sparkles className="w-4 h-4 text-[#ffd700]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="bcTripleTitle">CƯỢC BÃO (3 CON GIỐNG NHAU)</span>
                <span className="bcRateBadge">1 ĂN 30</span>
              </div>
              <div className="bcTripleSub">
                Tổng cược bàn: ${money(tableBets.TRIPLE_ANY || 1250)} • Bạn cược: <strong className="text-[#ffc174]">${bets.TRIPLE_ANY || 0}</strong>
              </div>
            </div>
          </div>

          {bets.TRIPLE_ANY > 0 && (
            <div className="bcFloatingChip" style={{ position: 'relative', width: 24, height: 24 }}>
              ${bets.TRIPLE_ANY}
            </div>
          )}
        </div>

        {/* 4. 6 Classic Mascot Betting Boxes (2x3 Grid) */}
        <section className="bcBetGrid">
          {MASCOT_LIST.map(mascot => {
            const userBet = bets[mascot.key] || 0;
            const tableTotal = tableBets[mascot.key] || 2500;
            const matchCount = lastResult?.mascotCounts?.[mascot.key] || 0;
            const isWinning = matchCount > 0 && (phase === 'revealing' || phase === 'settled');

            return (
              <button
                key={mascot.key}
                type="button"
                className={`bcMascotBox ${isWinning ? 'isWinning' : ''}`}
                onClick={() => handlePlaceBet(mascot.key)}
              >
                <div className="bcBoxHeader">
                  <span className="bcBoxTitle" style={{ color: mascot.color }}>{mascot.label}</span>
                  <span className="bcBoxRate">1:1</span>
                </div>

                <div className="bcBoxCenter">
                  <div
                    className="bcMascotAura"
                    style={{
                      background: `radial-gradient(circle, ${mascot.color}45 0%, ${mascot.color}15 45%, transparent 70%)`
                    }}
                  />
                  <MascotIcon idOrKey={mascot.key} />
                  {userBet > 0 && (
                    <div className="bcFloatingChip">
                      {userBet >= 1000 ? (userBet / 1000) + 'k' : userBet}
                    </div>
                  )}
                  {isWinning && matchCount > 0 && (
                    <div className="bcMatchCountBadge">
                      x{matchCount}
                    </div>
                  )}
                </div>

                <div className="bcBoxFooter">
                  <span className="bcBoxTotal">Tổng: ${money(tableTotal)}</span>
                  <span className="bcBoxUserBet">${userBet}</span>
                </div>
              </button>
            );
          })}
        </section>

        {/* 5. Chip Rack & Quick Betting Controls */}
        <section className="bcControlsCard">
          {/* Chip Selector Rack */}
          <div className="bcChipRack">
            {CHIP_VALUES.map(c => {
              const isActive = selectedChip === c.value;
              return (
                <button
                  key={c.label}
                  type="button"
                  className={`bcChipBtn ${c.className} ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedChip(c.value)}
                >
                  <div className="bcChipInner">
                    {c.label}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Action Buttons */}
          <div className="bcActionGrid">
            <button type="button" className="bcActionBtn" onClick={handleDoubleBets} title="Gấp đôi cược">
              <span className="bcBtnMainText text-[#ffc174]">X2</span>
            </button>

            <button type="button" className="bcActionBtn" onClick={handleRepeatBets} title="Cược lại ván trước">
              <span className="bcBtnMainText text-slate-200">CƯỢC LẠI</span>
            </button>

            <button type="button" className="bcActionBtn" onClick={handleClearBets} title="Xóa cược">
              <span className="bcBtnMainText text-[#f87171]">HỦY</span>
            </button>

            <button type="button" className="bcActionBtn confirmBtn" onClick={handleConfirmBets} title="Xác nhận cược">
              <span className="bcBtnMainText text-[#2a1700]">
                {totalUserBet > 0 ? `CƯỢC $${totalUserBet}` : 'XÁC NHẬN'}
              </span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
