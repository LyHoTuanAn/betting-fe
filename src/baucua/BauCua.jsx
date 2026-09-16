import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Trophy, Clock, LogOut, UserRound, Users, WifiOff } from 'lucide-react';
import { Topbar } from '../shared/Topbar.jsx';
import { ResultFx } from '../shared/ResultFx.jsx';
import { Popup, usePopup } from '../shared/Popup.jsx';
import { playCelebrationAudio } from '../shared/audio.js';
import { money } from '../shared/format.js';
import { useGameFx } from '../shared/hooks.js';
import { API_URL } from '../shared/api.js';
import { MASCOT_LIST, MascotIcon } from './BauCuaIcons.jsx';
import { BauCuaDice3D } from './BauCuaDice3D.jsx';
import { evaluateBauCuaWinnings, DEFAULT_PAYTABLE, netOdds } from './baucua-engine.js';
import './baucua.css';

const CHIP_VALUES = [
  { label: '10', value: 10, className: 'chip-10' },
  { label: '25', value: 25, className: 'chip-25' },
  { label: '50', value: 50, className: 'chip-50' },
  { label: '100', value: 100, className: 'chip-100' },
  { label: '500', value: 500, className: 'chip-500' },
  { label: 'ALL', value: 'all', className: 'chip-all' }
];

const DEFAULT_AVATAR = '/assets/home-avatar.webp';

/** Bốn nhịp quay 1,1s rồi 1s đáp — đúng bằng SHAKE_TIME_MS của phòng bên server. */
const SPIN_MS = 4400;
const LAND_MS = 1000;

export function BauCua({ goHome, balance, setBalance, sound, setSound, user, openPanel, token }) {
  const [fx, triggerFx, dismissFx] = useGameFx();
  const exitPopup = usePopup();

  // 'connecting' | 'waiting' | 'playing'
  const [screen, setScreen] = useState('connecting');
  const [lobby, setLobby] = useState(null);
  const [selfReady, setSelfReady] = useState(false);
  const [connError, setConnError] = useState(null);

  // Ván đang chạy, do server điều phối
  const [stage, setStage] = useState('betting');
  const [timeLeft, setTimeLeft] = useState(0);
  const [roundNo, setRoundNo] = useState(0);
  const [dice, setDice] = useState([1, 4, 5]);
  const [diceRevealed, setDiceRevealed] = useState(true);
  const [history, setHistory] = useState([]);
  const [winners, setWinners] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const [insufficient, setInsufficient] = useState(null);

  // Cược: bets là của mình (server xác nhận), tableBets là tổng thật cả bàn
  const [bets, setBets] = useState({});
  const [prevBets, setPrevBets] = useState({});
  const [tableBets, setTableBets] = useState({});
  const [selectedChip, setSelectedChip] = useState(50);

  const [limits, setLimits] = useState({ min: 10, max: 5000000 });
  const [paytable, setPaytable] = useState(DEFAULT_PAYTABLE);

  const socketRef = useRef(null);
  const playerIdRef = useRef(null);
  const soundRef = useRef(sound);
  const triggerFxRef = useRef(triggerFx);
  const setBalanceRef = useRef(setBalance);
  const betsRef = useRef(bets);
  const landTimersRef = useRef([]);
  // Kết quả server đã chốt nhưng bàn chưa mở bát; xem revealSettle().
  const pendingSettleRef = useRef(null);

  useEffect(() => { soundRef.current = sound; }, [sound]);
  useEffect(() => { triggerFxRef.current = triggerFx; }, [triggerFx]);
  useEffect(() => { setBalanceRef.current = setBalance; }, [setBalance]);
  useEffect(() => { betsRef.current = bets; }, [bets]);

  const playSoundEffect = useCallback(type => {
    if (!soundRef.current) return;
    try { playCelebrationAudio(type, true); } catch (_) {}
  }, []);

  const totalUserBet = Object.values(bets).reduce((sum, v) => sum + (Number(v) || 0), 0);
  // Cược chỉ bị trừ khi quyết toán, nên số dư hiển thị phải tự trừ phần đang treo
  // trên bàn — nếu không người chơi tưởng còn tiền và đặt quá tay.
  const available = Math.max(0, balance - totalUserBet);

  /* ------------------------------------------------------------------ *
   * Kết nối phòng
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (!token) return;
    const wsBase = API_URL.replace(/^http/, 'ws').replace(/[/]api$/, '');
    const socket = new WebSocket(`${wsBase}/ws/baucua?token=${encodeURIComponent(token)}`);
    socketRef.current = socket;

    const clearLandTimers = () => {
      landTimersRef.current.forEach(clearTimeout);
      landTimersRef.current = [];
    };

    /**
     * Server quyết toán ngay lúc bắt đầu lắc, nên gói `wallet` về tay client sớm
     * hơn 5,4 giây so với lúc xúc xắc dừng. Giữ nó lại đây rồi mới mở ra — cộng
     * tiền hay nổ hiệu ứng thắng trước khi bát mở là lộ kết quả.
     */
    const revealSettle = () => {
      const settle = pendingSettleRef.current;
      if (!settle) return;
      pendingSettleRef.current = null;

      if (settle.type === 'settle-failed') {
        triggerFxRef.current?.('toast', settle.message || 'Không quyết toán được ván này');
        return;
      }

      setBalanceRef.current(settle.balance);
      const payout = Number(settle.payout) || 0;
      const bet = Number(settle.bet) || 0;
      setLastResult({ payout, bet });
      if (payout <= 0) return;

      if (payout >= bet * 4) {
        playSoundEffect('jackpot');
        triggerFxRef.current?.('jackpot', `THẮNG LỚN +${money(payout)}`);
      } else {
        playSoundEffect('smallWin');
        triggerFxRef.current?.('win', `THẮNG +${money(payout)}`);
      }
    };

    socket.onerror = () => setConnError('Không kết nối được phòng Bầu Cua.');
    socket.onclose = () => {
      clearLandTimers();
      setConnError(curr => curr || 'Mất kết nối tới phòng Bầu Cua.');
    };

    socket.onmessage = event => {
      let m;
      try { m = JSON.parse(event.data); } catch { return; }

      // Thông tin phòng đi kèm hầu hết gói tin; gom về một chỗ cho khỏi lặp.
      if (m.minBet !== undefined) setLimits({ min: m.minBet, max: m.maxBet });
      if (m.paytable) setPaytable(m.paytable);
      if (m.tableBets) setTableBets(m.tableBets);
      if (Array.isArray(m.history)) setHistory(m.history);
      if (m.roundNo !== undefined) setRoundNo(m.roundNo);

      switch (m.type) {
        case 'joined':
          playerIdRef.current = m.playerId;
          setConnError(null);
          setLobby(m);
          setScreen(m.status === 'playing' ? 'playing' : 'waiting');
          setSelfReady(!!m.players?.find(p => p.id === m.playerId)?.ready);
          return;

        case 'lobby':
          setLobby(m);
          setSelfReady(!!m.players?.find(p => p.id === playerIdRef.current)?.ready);
          if (m.status === 'playing') setScreen('playing');
          return;

        case 'countdown':
          playSoundEffect('combo');
          return;

        case 'game-start':
          setScreen('playing');
          setBets({});
          setLastResult(null);
          setWinners([]);
          setInsufficient(null);
          return;

        case 'state':
        case 'round-start':
          // Gói state mang đủ name/code/capacity nên gộp đè lên lobby cũ; nếu chỉ
          // lấy players thì tên phòng biến mất khi vào bàn.
          setLobby(curr => ({ ...(curr || {}), ...m }));
          setStage(m.stage);
          setTimeLeft(Math.ceil((m.stageMs || 0) / 1000));
          if (m.stage === 'betting') {
            // Ván mới mở: kết quả ván trước không được phép còn treo lại.
            revealSettle();
            setBets({});
            setLastResult(null);
            setWinners([]);
            setDiceRevealed(true);
          }
          if (m.dice) setDice(m.dice);
          setInsufficient(m.insufficientCountdownSecs ? { seconds: m.insufficientCountdownSecs } : null);
          return;

        case 'bet':
          // Server là nơi chốt cược; chỉ nhận lại bàn cược của chính mình từ đây
          // nên không bao giờ lệch với thứ sẽ được quyết toán.
          if (m.playerId === playerIdRef.current) setBets(m.currentBets || {});
          return;

        case 'clear-bets':
          if (m.playerId === playerIdRef.current) setBets({});
          return;

        case 'shake': {
          setStage('shaking');
          setDiceRevealed(false);
          playSoundEffect('diceWin');
          clearLandTimers();
          // Giữ nguyên nhịp hoạt ảnh cũ: quay 4,4s rồi mới cho ba mặt đáp xuống.
          landTimersRef.current.push(setTimeout(() => {
            setDice(m.dice);
            setStage('landing');
          }, SPIN_MS));
          // Bát mở đúng lúc này: giờ mới được cộng tiền và nổ hiệu ứng.
          landTimersRef.current.push(setTimeout(() => {
            setDiceRevealed(true);
            setStage('revealing');
            revealSettle();
          }, SPIN_MS + LAND_MS));
          return;
        }

        case 'result': {
          clearLandTimers();
          setDice(m.dice);
          setDiceRevealed(true);
          setStage('revealing');
          setTimeLeft(Math.ceil((m.stageMs || 0) / 1000));
          setWinners(m.winners || []);
          setPrevBets(curr => (Object.keys(betsRef.current).length ? betsRef.current : curr));
          // Chốt chặn cuối: nếu hẹn giờ mở bát bị huỷ (vào phòng giữa ván, tab bị
          // treo) thì kết quả vẫn phải được mở ra ở đây, không bao giờ sớm hơn.
          revealSettle();
          return;
        }

        case 'wallet':
          pendingSettleRef.current = m;
          return;

        case 'settle-failed':
          pendingSettleRef.current = m;
          return;

        case 'player-left-insufficient':
          setInsufficient({ seconds: m.remainingSeconds || 30, message: m.message });
          triggerFxRef.current?.('toast', 'Phòng thiếu người, đang chờ ghép thêm...');
          return;

        case 'insufficient-countdown':
          setInsufficient(curr => ({ ...(curr || {}), seconds: m.remainingSeconds }));
          return;

        case 'insufficient-resolved':
          setInsufficient(null);
          triggerFxRef.current?.('toast', m.message || 'Đã đủ người, tiếp tục ván!');
          return;

        case 'room-dissolved':
          clearLandTimers();
          setScreen('waiting');
          setSelfReady(false);
          setBets({});
          setInsufficient(null);
          exitPopup.warn(m.message);
          return;

        case 'error':
          triggerFxRef.current?.('toast', m.message || 'Thao tác không hợp lệ');
          return;

        default:
          return;
      }
    };

    return () => {
      clearLandTimers();
      socket.onclose = null;
      socket.close();
      socketRef.current = null;
    };
    // exitPopup được tạo mới mỗi lần render nhưng chỉ dùng trong callback, không
    // đưa vào deps để tránh dựng lại socket sau mỗi lần vẽ.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, playSoundEffect]);

  /** Đồng hồ đếm lùi chạy ở client giữa hai gói tin của server. */
  useEffect(() => {
    if (screen !== 'playing') return;
    const id = setInterval(() => setTimeLeft(t => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [screen, stage, roundNo]);

  useEffect(() => {
    if (!insufficient) return;
    const id = setInterval(() => setInsufficient(curr => (curr && curr.seconds > 1 ? { ...curr, seconds: curr.seconds - 1 } : curr)), 1000);
    return () => clearInterval(id);
  }, [insufficient?.seconds != null]);

  const emit = payload => {
    if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify(payload));
  };

  const leaveRoom = () => {
    emit({ type: 'leave' });
    goHome();
  };

  const askExit = async () => {
    const agreed = await exitPopup.confirm({
      title: 'RỜI PHÒNG BẦU CUA',
      message: totalUserBet > 0
        ? 'Bạn đang có tiền cược trên bàn. Rời phòng bây giờ sẽ huỷ toàn bộ cược của ván này.'
        : 'Bạn có chắc chắn muốn rời phòng và quay về trang chính?',
      confirmLabel: 'RỜI PHÒNG',
      cancelLabel: 'Ở LẠI',
      danger: true
    });
    if (agreed) leaveRoom();
  };

  const toggleReady = () => {
    emit({ type: selfReady ? 'unready' : 'ready' });
    setSelfReady(r => !r);
  };

  /* ------------------------------------------------------------------ *
   * Đặt cược
   * ------------------------------------------------------------------ */
  const handlePlaceBet = key => {
    if (screen !== 'playing' || stage !== 'betting') return;
    // Trần cược tính trên TỔNG cả ván, giống hệt chỗ server chặn.
    const room = Math.min(available, limits.max - totalUserBet);
    if (room <= 0) {
      triggerFx?.('toast', available <= 0 ? 'Số dư không đủ!' : `Tối đa ${money(limits.max)} mỗi ván!`);
      return;
    }
    const chipAmt = selectedChip === 'all' ? room : Math.min(selectedChip, room);
    if (chipAmt <= 0) return;
    if (selectedChip !== 'all' && selectedChip > room) {
      triggerFx?.('toast', available < selectedChip ? 'Số dư không đủ!' : `Tối đa ${money(limits.max)} mỗi ván!`);
      return;
    }
    emit({ type: 'bet', target: key, amount: chipAmt });
    playSoundEffect('combo');
  };

  const handleRepeatBets = () => {
    if (stage !== 'betting') return;
    const entries = Object.entries(prevBets).filter(([, v]) => v > 0);
    const prevTotal = entries.reduce((s, [, v]) => s + v, 0);
    if (prevTotal <= 0) return triggerFx?.('toast', 'Chưa có cược ván trước!');
    if (prevTotal > available) return triggerFx?.('toast', 'Số dư không đủ để cược lại!');
    if (prevTotal + totalUserBet > limits.max) return triggerFx?.('toast', `Tối đa ${money(limits.max)} mỗi ván!`);
    entries.forEach(([k, v]) => emit({ type: 'bet', target: k, amount: v }));
    playSoundEffect('combo');
  };

  const handleDoubleBets = () => {
    if (stage !== 'betting' || totalUserBet <= 0) return;
    if (totalUserBet > available) return triggerFx?.('toast', 'Số dư không đủ để gấp đôi!');
    if (totalUserBet * 2 > limits.max) return triggerFx?.('toast', `Tối đa ${money(limits.max)} mỗi ván!`);
    Object.entries(bets).forEach(([k, v]) => { if (v > 0) emit({ type: 'bet', target: k, amount: v }); });
    playSoundEffect('combo');
  };

  const handleClearBets = () => {
    if (stage !== 'betting' || totalUserBet <= 0) return;
    emit({ type: 'clear_bets' });
  };

  /* ------------------------------------------------------------------ *
   * Màn chờ ghép phòng
   * ------------------------------------------------------------------ */
  if (screen !== 'playing') {
    const players = lobby?.players || [];
    const capacity = lobby?.capacity || 10;
    const needReady = lobby?.needReady || 6;
    const readyCount = players.filter(p => p.ready).length;
    const countdownSecs = lobby?.countdownMs ? Math.ceil(lobby.countdownMs / 1000) : null;
    const seats = Array.from({ length: capacity }, (_, i) => players.find(p => p.seatIndex === i) || null);

    return (
      <div className="bauCuaScreen bcWaitingScreen">
        <Topbar balance={balance} onBack={askExit} sound={sound} setSound={setSound} user={user}
                onProfile={goHome} onWallet={() => (openPanel ? openPanel('wallet') : goHome())} />
        <Popup popup={exitPopup.popup} onClose={exitPopup.close} />

        <main className="bauCuaContainer">
          <div className="bcWaitTitle">
            <b>PHÒNG CHỜ BẦU CUA</b>
            <span>{lobby ? (lobby.name || lobby.roomId).toUpperCase() : 'ĐANG GHÉP PHÒNG...'}</span>
          </div>

          {connError && (
            <div className="bcClosedNotice" role="status">
              <WifiOff className="w-4 h-4 shrink-0" />
              <span>{connError}</span>
            </div>
          )}

          <p className="bcWaitLead">
            {countdownSecs !== null
              ? `🔥 Đủ người sẵn sàng — Mở bàn sau ${countdownSecs}s!`
              : `Cần tối thiểu ${needReady} người sẵn sàng để mở bàn (Hiện có: ${readyCount}/${needReady})`}
          </p>

          <div className="bcWaitGrid">
            {seats.map((p, idx) => {
              const isHero = p && p.id === playerIdRef.current;
              if (!p) {
                return (
                  <div key={idx} className="bcWaitSeat isEmpty">
                    <div className="bcWaitAvatar empty"><UserRound size={18} /></div>
                    <span className="bcWaitName">Chỗ trống</span>
                    <span className="bcWaitUser">Vị trí #{idx + 1}</span>
                    <span className="bcWaitBadge empty">TRỐNG</span>
                  </div>
                );
              }
              return (
                <div key={idx} className={`bcWaitSeat ${isHero ? 'isHero' : ''} ${p.ready ? 'isReady' : ''}`}>
                  <div className="bcWaitAvatar"><img src={p.avatar || DEFAULT_AVATAR} alt={p.displayName} /></div>
                  <span className="bcWaitName">{p.displayName}{isHero ? ' (Bạn)' : ''}</span>
                  <span className="bcWaitUser">@{p.username}</span>
                  <span className={`bcWaitBadge ${p.ready ? 'ready' : 'waiting'}`}>
                    {p.ready ? 'SẴN SÀNG' : 'ĐANG CHỜ'}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="bcWaitCount">
            <Users size={13} /> {players.length}/{capacity} người trong phòng · {readyCount} đã sẵn sàng
          </p>

          <div className="bcWaitActions">
            <button type="button" className={'bcWaitReady ' + (selfReady ? 'on' : '')} onClick={toggleReady} disabled={!!connError}>
              {selfReady ? 'HUỶ SẴN SÀNG' : 'SẴN SÀNG VÀO BÀN'}
            </button>
            <button type="button" className="bcWaitLeave" onClick={askExit}>
              <LogOut size={16} /> THOÁT
            </button>
          </div>
        </main>
      </div>
    );
  }

  /* ------------------------------------------------------------------ *
   * Bàn chơi
   * ------------------------------------------------------------------ */
  const revealed = diceRevealed && (stage === 'revealing' || stage === 'landing');
  const outcome = revealed ? evaluateBauCuaWinnings(bets, dice, paytable) : null;
  const dicePhase = stage === 'shaking' ? 'shaking' : stage === 'landing' ? 'landing' : stage === 'revealing' ? 'revealing' : 'betting';
  const players = lobby?.players || [];

  return (
    <div className="bauCuaScreen">
      <ResultFx fx={fx} onDismiss={dismissFx} />
      <Topbar balance={balance} onBack={askExit} sound={sound} setSound={setSound} user={user}
              onProfile={goHome} onWallet={() => (openPanel ? openPanel('wallet') : goHome())} />
      <Popup popup={exitPopup.popup} onClose={exitPopup.close} />

      <main className="bauCuaContainer">
        <section className="bcHeaderCard">
          <div className="bcHeaderTopRow">
            <div className="bcRoomInfo">
              <span className="text-[#ffc174] text-[16px]">⚜️</span>
              <span className="bcRoomTitle">{lobby?.name || 'BẦU CUA VIP'}</span>
              <span className="bcRoomPop"><Users size={11} /> {players.length}/{lobby?.capacity || 10}</span>
            </div>

            <div className={`bcTimerPill ${timeLeft <= 5 && stage === 'betting' ? 'danger' : 'normal'}`}>
              <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} />
              <span className="text-[11.5px] font-bold">
                {stage === 'betting' ? `CÒN ${timeLeft}s` : stage === 'shaking' ? 'ĐANG XOAY...' : stage === 'landing' ? 'MỞ BÁT...' : 'KẾT QUẢ'}
              </span>
            </div>
          </div>

          <div className="bcHistoryBar">
            <span className="bcHistoryLabel">Ván #{roundNo} · Trước:</span>
            <div className="bcHistoryList">
              {history.length === 0 && <span className="bcHistoryEmpty">Chưa có ván nào</span>}
              {history.map((hDice, idx) => (
                <div key={idx} className="bcHistoryRound" style={{ opacity: idx === 0 ? 1 : 0.8 - idx * 0.12 }}>
                  {hDice.map((dId, dIdx) => (
                    <span key={dIdx} className="text-[12px] leading-none">{MASCOT_LIST[dId]?.symbol}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {insufficient && (
          <div className="bcClosedNotice" role="status">
            <Clock className="w-4 h-4 shrink-0" />
            <span>Phòng đang thiếu người — chờ ghép thêm ({insufficient.seconds}s). Bàn tạm dừng, không ai bị trừ tiền.</span>
          </div>
        )}

        <BauCuaDice3D dice={dice} phase={dicePhase} />

        {/* Bảng vinh danh người thắng của cả bàn */}
        {stage === 'revealing' && winners.length > 0 && (
          <section className="bcWinnersCard">
            <div className="bcWinnersHead"><Trophy size={14} /> NGƯỜI THẮNG VÁN NÀY</div>
            <div className="bcWinnersList">
              {winners.slice(0, 5).map((w, idx) => (
                <div key={w.userId} className={`bcWinnerRow ${w.userId === user?.id ? 'isHero' : ''}`}>
                  <span className="bcWinnerRank">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}</span>
                  <img src={w.avatar || DEFAULT_AVATAR} alt={w.displayName} className="bcWinnerAvatar" />
                  <span className="bcWinnerName">{w.displayName}{w.userId === user?.id ? ' (Bạn)' : ''}</span>
                  <span className="bcWinnerAmount">+{money(w.winAmount)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div
          className={`bcTripleBetBanner ${outcome?.isTriple ? 'isWinning' : ''} ${stage !== 'betting' ? 'isLocked' : ''}`}
          onClick={() => handlePlaceBet('TRIPLE_ANY')}
        >
          <div className="bcTripleLeft">
            <div className="bcCycloneIconBox"><Sparkles className="w-4 h-4 text-[#ffd700]" /></div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="bcTripleTitle">CƯỢC BÃO (3 CON GIỐNG NHAU)</span>
                <span className="bcRateBadge">1 ĂN {netOdds(paytable.tripleX)}</span>
              </div>
              <div className="bcTripleSub">
                Tổng cược bàn: {money(tableBets.TRIPLE_ANY || 0)} • Bạn cược: <strong className="text-[#ffc174]">{money(bets.TRIPLE_ANY || 0)}</strong>
              </div>
            </div>
          </div>
          {bets.TRIPLE_ANY > 0 && (
            <div className="bcFloatingChip" style={{ position: 'relative', width: 24, height: 24 }}>
              {bets.TRIPLE_ANY}
            </div>
          )}
        </div>

        <section className="bcBetGrid">
          {MASCOT_LIST.map(mascot => {
            const userBet = bets[mascot.key] || 0;
            const tableTotal = tableBets[mascot.key] || 0;
            const matchCount = outcome?.mascotCounts?.[mascot.key] || 0;
            const isWinning = matchCount > 0 && revealed;

            return (
              <button
                key={mascot.key}
                type="button"
                className={`bcMascotBox ${isWinning ? 'isWinning' : ''} ${stage !== 'betting' ? 'isLocked' : ''}`}
                onClick={() => handlePlaceBet(mascot.key)}
              >
                <div className="bcBoxHeader">
                  <span className="bcBoxTitle" style={{ color: mascot.color }}>{mascot.label}</span>
                  <span className="bcBoxRate">1:{netOdds(paytable.oneX)}</span>
                </div>

                <div className="bcBoxCenter">
                  <div className="bcMascotAura" style={{ background: `radial-gradient(circle, ${mascot.color}45 0%, ${mascot.color}15 45%, transparent 70%)` }} />
                  <MascotIcon idOrKey={mascot.key} />
                  {userBet > 0 && (
                    <div className="bcFloatingChip">{userBet >= 1000 ? (userBet / 1000) + 'k' : userBet}</div>
                  )}
                  {isWinning && <div className="bcMatchCountBadge">x{matchCount}</div>}
                </div>

                <div className="bcBoxFooter">
                  <span className="bcBoxTotal">Bàn: {money(tableTotal)}</span>
                  <span className="bcBoxUserBet">{money(userBet)}</span>
                </div>
              </button>
            );
          })}
        </section>

        <section className="bcControlsCard">
          <div className="bcBankRow">
            <span>Khả dụng: <strong className="text-[#ffc174]">{money(available)}</strong></span>
            <span>Đang cược: <strong className="text-[#56e5a9]">{money(totalUserBet)}</strong></span>
            {lastResult && stage === 'revealing' && (
              <span className={lastResult.payout > 0 ? 'text-[#56e5a9]' : 'text-[#f87171]'}>
                {lastResult.payout > 0 ? `Thắng +${money(lastResult.payout - lastResult.bet)}` : `Thua ${money(lastResult.bet)}`}
              </span>
            )}
          </div>

          <div className="bcChipRack">
            {CHIP_VALUES.map(c => (
              <button
                key={c.label}
                type="button"
                className={`bcChipBtn ${c.className} ${selectedChip === c.value ? 'active' : ''}`}
                onClick={() => setSelectedChip(c.value)}
              >
                <div className="bcChipInner">{c.label}</div>
              </button>
            ))}
          </div>

          <div className="bcActionGrid">
            <button type="button" className="bcActionBtn" onClick={handleDoubleBets} disabled={stage !== 'betting'} title="Gấp đôi cược">
              <span className="bcBtnMainText text-[#ffc174]">X2</span>
            </button>
            <button type="button" className="bcActionBtn" onClick={handleRepeatBets} disabled={stage !== 'betting'} title="Cược lại ván trước">
              <span className="bcBtnMainText text-slate-200">CƯỢC LẠI</span>
            </button>
            <button type="button" className="bcActionBtn" onClick={handleClearBets} disabled={stage !== 'betting'} title="Xóa cược">
              <span className="bcBtnMainText text-[#f87171]">HỦY</span>
            </button>
            <button type="button" className="bcActionBtn confirmBtn" disabled title="Tổng cược ván này">
              <span className="bcBtnMainText text-[#2a1700]">
                {totalUserBet > 0 ? `CƯỢC ${money(totalUserBet)}` : `TỐI THIỂU ${money(limits.min)}`}
              </span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
