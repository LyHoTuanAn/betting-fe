import {useEffect, useRef, useState} from 'react';
import {LogOut, RotateCcw, Trash2, Trophy, UserRound, Users, X} from 'lucide-react';
import {API_URL} from '../shared/api.js';
import {ResultFx} from '../shared/ResultFx.jsx';
import {Topbar} from '../shared/Topbar.jsx';
import {playCelebrationAudio} from '../shared/audio.js';
import {money} from '../shared/format.js';
import {useGameFx} from '../shared/hooks.js';
import {Popup, usePopup} from '../shared/Popup.jsx';
import {
  CHIP_PRESETS,
  RED_NUMBERS,
  ROW_1,
  ROW_2,
  ROW_3,
  WHEEL_SEQUENCE,
  getNumberColor
} from './roulette-data.js';
import './roulette.css';

const SEGMENT_ANGLE = 360 / 37;
const HALF_ANGLE = SEGMENT_ANGLE / 2;

function renderRouletteWheel() {
  const cx = 200;
  const cy = 200;
  const Ro = 196;
  const Ri = 104;
  const Rtext = 152;

  return (
    <svg viewBox="0 0 400 400" className="rouletteWheelSvg" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="wheelInnerShadow" cx="50%" cy="50%" r="50%">
          <stop offset="70%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
        </radialGradient>
      </defs>

      {/* Outer rim background circle */}
      <circle cx={cx} cy={cy} r={Ro} fill="#11141c" stroke="#d4af37" strokeWidth="3" />

      {/* Slices */}
      {WHEEL_SEQUENCE.map((num, i) => {
        const midAngle = i * SEGMENT_ANGLE;
        const a1 = midAngle - HALF_ANGLE;
        const a2 = midAngle + HALF_ANGLE;

        const rad1 = ((a1 - 90) * Math.PI) / 180;
        const rad2 = ((a2 - 90) * Math.PI) / 180;

        const xo1 = cx + Ro * Math.cos(rad1);
        const yo1 = cy + Ro * Math.sin(rad1);
        const xo2 = cx + Ro * Math.cos(rad2);
        const yo2 = cy + Ro * Math.sin(rad2);

        const xi1 = cx + Ri * Math.cos(rad1);
        const yi1 = cy + Ri * Math.sin(rad1);
        const xi2 = cx + Ri * Math.cos(rad2);
        const yi2 = cy + Ri * Math.sin(rad2);

        const pathD = `M ${xo1.toFixed(2)} ${yo1.toFixed(2)} A ${Ro} ${Ro} 0 0 1 ${xo2.toFixed(2)} ${yo2.toFixed(2)} L ${xi2.toFixed(2)} ${yi2.toFixed(2)} A ${Ri} ${Ri} 0 0 0 ${xi1.toFixed(2)} ${yi1.toFixed(2)} Z`;

        const color = num === 0 ? '#10b981' : RED_NUMBERS.includes(num) ? '#dc2626' : '#1e232d';

        return (
          <g key={num}>
            {/* Sector */}
            <path d={pathD} fill={color} />

            {/* Divider */}
            <line
              x1={cx}
              y1={cy - Ri}
              x2={cx}
              y2={cy - Ro}
              stroke="#eab308"
              strokeWidth="1.2"
              transform={`rotate(${a1} ${cx} ${cy})`}
            />

            {/* Number Text */}
            <text
              x={cx}
              y={cy - Rtext}
              transform={`rotate(${midAngle} ${cx} ${cy})`}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#ffffff"
              fontSize="14"
              fontWeight="900"
              fontFamily="'Oswald', sans-serif"
            >
              {num}
            </text>
          </g>
        );
      })}

      {/* Inner pocket divider ring */}
      <circle cx={cx} cy={cy} r={Ri} fill="none" stroke="#d4af37" strokeWidth="2.5" />
      {/* Outer shadow overlay */}
      <circle cx={cx} cy={cy} r={Ro} fill="url(#wheelInnerShadow)" pointerEvents="none" />
    </svg>
  );
}

const DEFAULT_AVATARS = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCXHazhsFoYtskfBBFCmR3HI6l5xu8K_3LOMZpY_ErMDhf-Pm0tFjf2ao5bFkoKwxdsydK7wiZ-Chj6srlhBavpRpxf3zHRBpvwcVkWRbf_uUOGpqy5mRQO_cVY9ybNauenQCY4j67LVWimJzp4TFtZ6lV434D4NsDG2wwEzrSH7DvcL9O5o1gsIuJN7FtcIe1-L14xW6XafnbyCgE10SdehgxavvfBDCNG3XPYaiGCPhpxxwuMB7cx',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBRAsQ50KA8XZRhom16rs-UfNZHonSFzCKpeqFpVWfM8GlR4k03dBupZGTVCuSU_VZzT8JO4bcnbk-yOvr6BoLXDW07zwUHwZZnG3dJlXILwNsuCs-7Pf2plL9og3tqsOd-WwNYHMuwOnwYLk7S0iUd106SeeVaVH8FT37fZyHBHNv3w7NN7-43qiooyl9ashly1Wu0_ANp_0mKkseqdtudjD4ZtoytuIQ-AwS7sduFoRCh7xWS-87R',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCZRv9nVhiiAb3cIqAMx3A_Px2PYBdlUHraojN2mKKQVjec7rAhpRy2UT034laTex38rshN9BaXcbw9LFNoXbjlticuZhbcbzItWsW0ZDQh0UoSV-ASis8Tp4JGF9enRbojvZZrhTVeuIbVLWN-Ue_OU31_YsmLrdOYkg4sEgRRr_lsGjXWrlUyLpS_9KBbZ0FtSBj_Da1mpHgkc5DDDMdNK8EaUL3JYFxez8m48dbYZvSDTGeOGxpT',
  '/assets/home-avatar.webp',
  '/assets/dice-avatar.webp',
  '/assets/home-avatar.webp',
  '/assets/dice-avatar.webp',
  '/assets/home-avatar.webp',
  '/assets/dice-avatar.webp',
  '/assets/home-avatar.webp'
];

export function Roulette({goHome, balance, setBalance, sound, setSound, token, user}) {
  const [fx, triggerFx, dismissFx] = useGameFx();
  const socketRef = useRef(null);
  const playerIdRef = useRef(null);
  const exitPopup = usePopup();

  // Multi-player Room Phase: 'waiting' | 'playing'
  const [phase, setPhase] = useState('waiting');
  const [lobby, setLobby] = useState(null);
  const [selfReady, setSelfReady] = useState(false);
  const [stage, setStage] = useState('betting'); // 'betting' | 'spinning' | 'result'
  const [stageTimer, setStageTimer] = useState(20);
  const [playersList, setPlayersList] = useState([]);
  const [heroSeatIndex, setHeroSeatIndex] = useState(0);
  const [roomInfo, setRoomInfo] = useState({ count: 0, capacity: 10 });
  const [isPlayerDrawerOpen, setIsPlayerDrawerOpen] = useState(false);

  // Betting & Wheel States
  const [selectedChip, setSelectedChip] = useState(() => (balance > 0 && balance < 10000 ? Math.max(1000, balance) : 10000));
  const [chipInput, setChipInput] = useState('');
  const [isEditingChip, setIsEditingChip] = useState(false);
  const [bets, setBets] = useState({});
  const [betHistory, setBetHistory] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const [winningNumber, setWinningNumber] = useState(null);
  const [displayedWinningNumber, setDisplayedWinningNumber] = useState(null);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [recentNumbers, setRecentNumbers] = useState([17, 32, 0, 8, 29]);
  const [feedback, setFeedback] = useState('Chọn phỉnh cược và chạm vào các ô trên bàn');
  const [roomWinners, setRoomWinners] = useState([]);
  const [showWinnersPodium, setShowWinnersPodium] = useState(false);
  const [insufficientNotice, setInsufficientNotice] = useState(null);

  const soundRef = useRef(sound);
  useEffect(() => { soundRef.current = sound; }, [sound]);

  const totalBetAmount = Object.values(bets).reduce((a, b) => a + b, 0);
  const availableBalance = balance - totalBetAmount;

  // Ask exit confirmation
  const askExit = async () => {
    const agreed = await exitPopup.confirm({
      title: 'RỜI PHÒNG ROULETTE',
      message: 'Bạn có chắc chắn muốn rời phòng và quay về trang chính?',
      confirmLabel: 'RỜI PHÒNG',
      cancelLabel: 'Ở LẠI',
      danger: true
    });
    if (agreed) {
      leaveRoom();
    }
  };

  const leaveRoom = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'leave' }));
    }
    goHome();
  };

  const toggleReady = () => {
    const next = !selfReady;
    setSelfReady(next);
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: next ? 'ready' : 'unready' }));
    }
  };

  // Local insufficient countdown ticker
  useEffect(() => {
    if (!insufficientNotice?.active) return;
    const interval = setInterval(() => {
      setInsufficientNotice(curr => {
        if (!curr || !curr.active) return null;
        if (curr.seconds <= 1) return { ...curr, seconds: 0 };
        return { ...curr, seconds: curr.seconds - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [insufficientNotice?.active]);

  // WebSocket Connection (Identical to FishGame)
  useEffect(() => {
    if (!token) return;

    const wsBase = API_URL.replace(/^http/, 'ws').replace(/[/]api$/, '');
    const socket = new WebSocket(`${wsBase}/ws/roulette?token=${encodeURIComponent(token)}`);
    socketRef.current = socket;

    socket.onerror = () => {
      triggerFx('diceLose', 'KHÔNG KẾT NỐI ĐƯỢC PHÒNG ROULETTE', 2200);
    };

    socket.onclose = () => {
      // Disconnected
    };

    socket.onmessage = (event) => {
      let m;
      try {
        m = JSON.parse(event.data);
      } catch {
        return;
      }

      if (m.type === 'joined') {
        playerIdRef.current = m.playerId;
        if (m.seatIndex !== undefined) setHeroSeatIndex(m.seatIndex);
        setLobby(m);
        setPlayersList(m.players || []);
        setPhase(m.status === 'playing' ? 'playing' : 'waiting');
        setRoomInfo({ count: m.players?.length || 1, capacity: m.capacity || 10 });
        const me = m.players?.find(p => p.id === m.playerId || p.userId === user?.id);
        if (me && typeof me.ready === 'boolean') setSelfReady(me.ready);
        if (m.insufficientCountdownSecs) {
          setInsufficientNotice({
            active: true,
            seconds: m.insufficientCountdownSecs,
            message: 'Đang chờ ghép đủ 6 người (30s)...'
          });
        } else {
          setInsufficientNotice(null);
        }
        return;
      }

      if (m.type === 'lobby') {
        setLobby(m);
        setPlayersList(m.players || []);
        setRoomInfo({ count: m.players?.length || 1, capacity: m.capacity || 10 });
        const me = m.players?.find(p => p.id === playerIdRef.current || p.userId === user?.id);
        if (me && typeof me.ready === 'boolean') setSelfReady(me.ready);
        if (m.status === 'playing') setPhase('playing');
        return;
      }

      if (m.type === 'waiting-reset') {
        setLobby(m);
        setPlayersList(m.players || []);
        setRoomInfo({ count: m.players?.length || 1, capacity: m.capacity || 10 });
        setPhase('waiting');
        setSelfReady(false);
        setSpinning(false);
        setDisplayedWinningNumber(null);
        setShowWinnersPodium(false);
        setInsufficientNotice(null);
        return;
      }

      if (m.type === 'room-dissolved') {
        setPhase('waiting');
        setSelfReady(false);
        setSpinning(false);
        setDisplayedWinningNumber(null);
        setShowWinnersPodium(false);
        setInsufficientNotice(null);
        setBets({});
        setBetHistory([]);
        exitPopup.warn(m.message || 'Không đủ 6 người chơi sau 30s chờ ghép. Tất cả người chơi quay về sảnh chờ!');
        return;
      }

      if (m.type === 'player-left-insufficient') {
        setSpinning(false);
        setInsufficientNotice({
          active: true,
          seconds: m.remainingSeconds || 30,
          message: m.message || 'Có người chơi rời phòng. Đang chờ ghép đủ 6 người (30s)... Nếu không đủ sẽ tự động quay về sảnh chờ.'
        });
        triggerFx('diceLose', 'Phòng thiếu người! Dừng quay & chờ ghép 30s...', 3000);
        return;
      }

      if (m.type === 'insufficient-countdown') {
        setSpinning(false);
        setInsufficientNotice(curr => ({
          active: true,
          seconds: m.remainingSeconds,
          message: curr?.message || 'Đang chờ ghép người...'
        }));
        return;
      }

      if (m.type === 'insufficient-resolved') {
        setInsufficientNotice(null);
        triggerFx('win', 'Đã ghép đủ người chơi!', 2500);
        return;
      }

      if (m.type === 'game-start') {
        setPhase('playing');
        setStage('betting');
        setStageTimer(20);
        setSpinning(false);
        setDisplayedWinningNumber(null);
        setShowWinnersPodium(false);
        setInsufficientNotice(null);
        setBets({});
        setBetHistory([]);
        setFeedback('Ván mới bắt đầu! Hãy chọn cửa cược.');
        return;
      }

      if (m.type === 'state' || m.type === 'round-start') {
        setPhase('playing');
        setStage(m.stage || 'betting');
        setPlayersList(m.players || []);
        setRoomInfo({ count: m.players?.length || 1, capacity: m.capacity || 10 });
        if (m.insufficientCountdownSecs) {
          setInsufficientNotice({
            active: true,
            seconds: m.insufficientCountdownSecs,
            message: 'Đang chờ ghép đủ 6 người (30s)...'
          });
        } else {
          setInsufficientNotice(null);
        }
        if (m.stageMs) setStageTimer(Math.ceil(m.stageMs / 1000));
        if (m.stage === 'betting') {
          setSpinning(false);
          setDisplayedWinningNumber(null);
          setShowWinnersPodium(false);
          setBets({});
          setBetHistory([]);
          setFeedback('Thời gian đặt cược đang đếm ngược...');
        }
        return;
      }

      if (m.type === 'bet') {
        setPlayersList(curr => curr.map(p => {
          if (p.id === m.playerId || p.userId === m.userId) {
            return { ...p, currentBets: m.currentBets, totalBet: m.totalBet };
          }
          return p;
        }));
        return;
      }

      if (m.type === 'clear-bets') {
        setPlayersList(curr => curr.map(p => {
          if (p.id === m.playerId || p.userId === m.userId) {
            return { ...p, currentBets: {}, totalBet: 0 };
          }
          return p;
        }));
        return;
      }

      if (m.type === 'spin') {
        setPhase('playing');
        setStage('spinning');
        setSpinning(true);
        setDisplayedWinningNumber(null); // Keep hidden while spinning!
        const winNum = m.winningNumber;
        setWinningNumber(winNum);

        // Animate wheel
        const targetIndex = WHEEL_SEQUENCE.indexOf(winNum);
        const segmentAngle = 360 / 37;
        const targetAngle = 360 - (targetIndex * segmentAngle);
        const fullSpins = 360 * 6;
        setWheelRotation(prev => prev + fullSpins + (targetAngle - (prev % 360)));
        setFeedback(`Bánh xe Roulette đang quay số...`);
        return;
      }

      if (m.type === 'result') {
        setSpinning(false);
        setStage('result');
        const winNum = m.winningNumber;
        setWinningNumber(winNum);
        setDisplayedWinningNumber(winNum); // Reveal number NOW!
        setRecentNumbers(prev => [winNum, ...prev.slice(0, 9)]);

        const winners = m.winners || [];
        setRoomWinners(winners);
        setShowWinnersPodium(true);
        if (m.players) setPlayersList(m.players);

        const myWin = winners.find(w => w.userId === user?.id);
        if (myWin && myWin.winAmount > 0) {
          triggerFx('win');
          if (soundRef.current) playCelebrationAudio();
          setFeedback(`🎉 Chúc mừng! Bạn trúng cược +$${money(myWin.winAmount)}!`);
        } else {
          setFeedback(`Kết quả ô [${winNum}]. Chuẩn bị ván tiếp theo...`);
        }
        return;
      }

      if (m.type === 'wallet') {
        setBalance(m.balance);
        return;
      }

      if (m.type === 'error') {
        triggerFx('diceLose', m.message || 'Lỗi cược', 1600);
        return;
      }
    };

    return () => {
      socket.close();
    };
  }, [token, user?.id]);

  // Local stage countdown
  useEffect(() => {
    if (phase !== 'playing') return;
    const interval = setInterval(() => {
      setStageTimer(t => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Place bet action
  const handlePlaceBet = (target) => {
    if (spinning || stage !== 'betting') {
      setFeedback('Chưa đến hoặc đã hết thời gian đặt cược!');
      return;
    }
    if (availableBalance < selectedChip) {
      setFeedback('Số dư không đủ để đặt thêm cược!');
      return;
    }

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'bet',
        target,
        amount: selectedChip
      }));
    }

    setBets(curr => ({
      ...curr,
      [target]: (curr[target] || 0) + selectedChip
    }));
    setBetHistory(h => [...h, { target, amount: selectedChip }]);
    setFeedback(`Đã đặt ${money(selectedChip)} vào ô [${target}]`);
  };

  // Undo action
  const handleUndo = () => {
    if (spinning || betHistory.length === 0 || stage !== 'betting') return;
    const last = betHistory[betHistory.length - 1];
    const rem = (bets[last.target] || 0) - last.amount;
    const nextBets = { ...bets };
    if (rem <= 0) delete nextBets[last.target];
    else nextBets[last.target] = rem;

    setBets(nextBets);
    setBetHistory(h => h.slice(0, -1));

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'clear_bets' }));
      Object.entries(nextBets).forEach(([tgt, amt]) => {
        socketRef.current.send(JSON.stringify({ type: 'bet', target: tgt, amount: amt }));
      });
    }
    setFeedback(`Đã hoàn tác cược ô [${last.target}]`);
  };

  // Clear bets action
  const handleClearBets = () => {
    if (spinning || totalBetAmount === 0 || stage !== 'betting') return;
    setBets({});
    setBetHistory([]);
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'clear_bets' }));
    }
    setFeedback('Đã hủy tất cả cược trên bàn.');
  };

  // Build 10 seats array for waiting room
  const totalCapacity = lobby ? lobby.capacity : 10;
  const needReady = lobby ? lobby.needReady : 6;
  const taken = lobby ? lobby.players.length : 1;
  const readyCount = lobby ? lobby.readyCount : (selfReady ? 1 : 0);
  const countdownSecs = lobby && lobby.countdownMs !== null ? Math.ceil(lobby.countdownMs / 1000) : null;

  const seats = Array.from({ length: 10 }, (_, i) => {
    const isHero = i === heroSeatIndex;
    const player = playersList.find(p => p.seatIndex === i);
    const resolvedPlayer = player || (isHero ? { id: playerIdRef.current, userId: user?.id, displayName: user?.displayName || 'Bạn', username: user?.username || 'you', ready: selfReady, balance } : null);
    return {
      seatIndex: i,
      player: resolvedPlayer ? { ...resolvedPlayer, ready: isHero ? selfReady : resolvedPlayer.ready } : null,
      isHero
    };
  });

  // SCREEN 1: WAITING ROOM (Sảnh chờ ghép người)
  if (phase === 'waiting') {
    return (
      <div className="screen rouletteScreen rltWaitingScreen">
        <Topbar balance={balance} onBack={askExit} sound={sound} setSound={setSound} user={user} />
        <Popup popup={exitPopup.popup} onClose={exitPopup.close} />

        <div className="rltTitle">
          <b>PHÒNG CHỜ ROULETTE</b>
          <span>{lobby ? (lobby.name || lobby.roomId).toUpperCase() : 'ĐANG GHÉP PHÒNG'}</span>
        </div>

        <main className="rltWaitRoom">
          <p className="rltWaitLead">
            {countdownSecs !== null
              ? `🔥 Đủ người sẵn sàng — Trận đấu bắt đầu sau ${countdownSecs}s!`
              : `Cần tối thiểu ${needReady} người sẵn sàng để mở bàn Roulette (Hiện có: ${readyCount}/${needReady})`}
          </p>

          <div className="rltWaitRoomLuxuryGrid">
            {seats.map((seat, idx) => {
              const p = seat.player;
              const isHero = seat.isHero;
              const avatarSrc = p?.avatar || (isHero ? (user?.avatar || DEFAULT_AVATARS[idx]) : DEFAULT_AVATARS[idx]);
              const displayName = isHero ? (user?.displayName || 'Bạn') : (p?.displayName || `Người chơi #${idx + 1}`);
              const userName = isHero ? (user?.username || 'me') : (p?.username || `player_${idx + 1}`);

              if (p) {
                return (
                  <div key={idx} className={`rltWaitSeatCard ${isHero ? 'isHero' : ''} ${p.ready ? 'isReady' : ''}`}>
                    <div className="rltWaitSeatAvatarWrap">
                      <img src={avatarSrc} alt={displayName} />
                    </div>
                    <span className="rltWaitSeatName">{displayName}</span>
                    <span className="rltWaitSeatUser">@{userName}</span>
                    <span className={`rltWaitSeatStatusBadge ${p.ready ? 'ready' : 'waiting'}`}>
                      {p.ready ? 'SẴN SÀNG' : 'ĐANG CHỜ'}
                    </span>
                  </div>
                );
              }

              return (
                <div key={idx} className="rltWaitSeatCard isEmpty">
                  <div className="rltWaitSeatEmptyAvatar">
                    <UserRound size={18} />
                  </div>
                  <span className="rltWaitSeatName">Chỗ trống</span>
                  <span className="rltWaitSeatUser">Vị trí #{idx + 1}</span>
                  <span className="rltWaitSeatStatusBadge empty">TRỐNG</span>
                </div>
              );
            })}
          </div>

          <p className="rltWaitCount">
            {taken}/{totalCapacity} người trong phòng · {readyCount} đã sẵn sàng
          </p>

          <div className="rltWaitActions">
            <button className={'rltWaitReady ' + (selfReady ? 'on' : '')} onClick={toggleReady}>
              {selfReady ? 'HUỶ SẴN SÀNG' : 'SẴN SÀNG VÀO TRẬN'}
            </button>
            <button className="rltWaitLeave" onClick={askExit}>
              <LogOut size={16} /> THOÁT
            </button>
          </div>
        </main>
      </div>
    );
  }

  // SCREEN 2: ACTIVE PLAYING ROULETTE TABLE
  return (
    <div className="screen rouletteScreen">
      <ResultFx fx={fx} onDismiss={dismissFx} />
      <Topbar balance={balance} onBack={askExit} sound={sound} setSound={setSound} user={user} />
      <Popup popup={exitPopup.popup} onClose={exitPopup.close} />

      {/* Winner Podium Celebration Modal Overlay (Fixed Backdrop) */}
      {showWinnersPodium && (
        <div className="rltWinnersOverlay" onClick={() => setShowWinnersPodium(false)}>
          <div className="rltWinnersPodiumCard" onClick={e => e.stopPropagation()}>
            <div className="podiumHeader">
              <Trophy className="goldCupIcon" size={28} />
              <h3>VINH DANH NGƯỜI THẮNG</h3>
              <p>Số trúng thưởng: <strong className={`numBadge ${getNumberColor(winningNumber)}`}>{winningNumber}</strong></p>
            </div>

            <div className="winnersListScroll">
              {roomWinners.length > 0 ? (
                roomWinners.map((w, idx) => {
                  const isMe = w.userId === user?.id;
                  return (
                    <div key={w.userId || idx} className={`winnerRow ${idx === 0 ? 'top1' : ''} ${isMe ? 'heroWinner' : ''}`}>
                      <span className="winnerRank">
                        {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `#${idx + 1}`}
                      </span>
                      <img src={w.avatar || DEFAULT_AVATARS[idx]} alt={w.displayName} className="winnerAvatar" />
                      <div className="winnerMeta">
                        <span className="wName">{w.displayName} {isMe && '(Bạn)'}</span>
                        <span className="wBet">Đã cược: ${money(w.betAmount)}</span>
                      </div>
                      <span className="winnerAmount">+${money(w.winAmount)}</span>
                    </div>
                  );
                })
              ) : (
                <div className="noWinnersText">
                  Vòng này không có người chơi nào trúng cược.
                </div>
              )}
            </div>

            <button
              type="button"
              className="rltDismissWinnersBtn"
              onClick={() => setShowWinnersPodium(false)}
            >
              Tiếp tục ván mới
            </button>
          </div>
        </div>
      )}

      {/* Active Players Drawer Modal */}
      {isPlayerDrawerOpen && (
        <div className="rltPlayersModalBackdrop" onClick={() => setIsPlayerDrawerOpen(false)}>
          <div className="rltPlayersModal" onClick={e => e.stopPropagation()}>
            <div className="rltModalHeader">
              <div className="modalTitle">
                <Users size={16} />
                <span>NGƯỜI CHƠI TRONG PHÒNG ({playersList.length}/10)</span>
              </div>
              <button type="button" className="closeBtn" onClick={() => setIsPlayerDrawerOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="rltPlayersList">
              {playersList.map((p, idx) => {
                const isMe = p.id === playerIdRef.current || p.userId === user?.id;
                return (
                  <div key={p.id || p.userId || idx} className={`rltPlayerItem ${isMe ? 'hero' : ''}`}>
                    <img src={p.avatar || DEFAULT_AVATARS[idx]} alt={p.displayName} className="pAvatar" />
                    <div className="pInfo">
                      <div className="pNameRow">
                        <span className="pName">{p.displayName}</span>
                        {isMe && <span className="meTag">BẠN</span>}
                      </div>
                      <span className="pBalance">${money(p.balance || 0)}</span>
                    </div>
                    {p.totalBet > 0 && (
                      <div className="pBetBadge">
                        Đang cược: ${money(p.totalBet)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="rouletteBody">
        {/* Insufficient Players 30s Countdown Warning Banner */}
        {insufficientNotice?.active && (
          <div className="rltInsufficientAlertBanner">
            <div className="rltAlertPulseDot" />
            <div className="rltAlertText">
              <span className="rltAlertTitle">⚠️ PHÒNG THIẾU NGƯỜI (TỐI THIỂU 6/10)</span>
              <span className="rltAlertDesc">
                Chờ ghép thêm người: <b className="rltAlertTimer">{insufficientNotice.seconds}s</b>. Nếu hết giờ, phòng sẽ tự động quay về sảnh chờ!
              </span>
            </div>
          </div>
        )}

        {/* Top Multi-player Status Bar */}
        <div className="rltMultiplayerBar">
          <div className="rltRoomTagBadge">
            <span>{lobby?.name || 'Phòng Roulette'}</span>
          </div>

          <div className={`tableStatusBadge ${insufficientNotice?.active ? 'paused' : stage}`}>
            <span className="timerDot" />
            <span>
              {insufficientNotice?.active
                ? `TẠM DỪNG (CHỜ GHÉP ${insufficientNotice.seconds}s)`
                : stage === 'betting'
                ? `ĐẶT CƯỢC: ${stageTimer}s`
                : stage === 'spinning'
                ? 'ĐANG QUAY SỐ...'
                : 'TRẢ THƯỞNG'}
            </span>
          </div>

          <button
            type="button"
            className="rltPlayersTriggerBtn"
            onClick={() => setIsPlayerDrawerOpen(true)}
            title="Xem danh sách người chơi trong phòng"
          >
            <Users size={13} />
            <span>{playersList.length || 1}/10</span>
          </button>
        </div>

        {/* 1. Wheel Showcase Card */}
        <div className="rouletteWheelCard">
          <div className="wheelCardTopRow">
            <div className="recentHistoryRow">
              <span className="historyTitle">GẦN ĐÂY:</span>
              <div className="historyPills">
                {recentNumbers.map((num, i) => (
                  <span key={i} className={`recentNumBadge ${getNumberColor(num)}`}>
                    {num}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="wheelVisualStage">
            <div className="wheelPointerMarker" />
            <div className="outerRimGold">
              <div
                className="rotatingWheelDisc"
                style={{
                  transform: `rotate(${wheelRotation}deg)`,
                  transition: spinning ? 'transform 7s cubic-bezier(0.12, 0.8, 0.2, 1)' : 'none'
                }}
              >
                {renderRouletteWheel()}
              </div>
              <div className="centerWheelBadge">
                <span className="centerStatusLabel">
                  {spinning || stage === 'spinning' ? 'QUAY...' : displayedWinningNumber !== null ? 'TRÚNG' : 'ROULETTE'}
                </span>
                <span className={`centerNumberBig ${displayedWinningNumber !== null ? getNumberColor(displayedWinningNumber) : ''}`}>
                  {spinning || stage === 'spinning' ? '🎲' : displayedWinningNumber !== null ? displayedWinningNumber : '--'}
                </span>
              </div>
            </div>
          </div>

          <div className="payoutFeedbackTicker">
            {feedback}
          </div>
        </div>

        {/* 2. Betting Table Grid Layout */}
        <div className="rouletteGridCard">
          <div className="tableNumbersGrid">
            <button
              type="button"
              className={`zeroButton ${displayedWinningNumber === 0 ? 'winningHit' : ''}`}
              onClick={() => handlePlaceBet('0')}
              disabled={spinning || stage !== 'betting'}
            >
              <span>0</span>
              {bets['0'] > 0 && <span className="cellBetChipBadge">{money(bets['0'])}</span>}
            </button>

            <div className="numbersColsArea">
              <div className="numRow">
                {ROW_3.map(num => (
                  <button
                    key={num}
                    type="button"
                    className={`rouletteCellBtn ${getNumberColor(num)} ${displayedWinningNumber === num ? 'winningHit' : ''}`}
                    onClick={() => handlePlaceBet(String(num))}
                    disabled={spinning || stage !== 'betting'}
                  >
                    <span>{num}</span>
                    {bets[String(num)] > 0 && <span className="cellBetChipBadge">{money(bets[String(num)])}</span>}
                  </button>
                ))}
              </div>

              <div className="numRow">
                {ROW_2.map(num => (
                  <button
                    key={num}
                    type="button"
                    className={`rouletteCellBtn ${getNumberColor(num)} ${displayedWinningNumber === num ? 'winningHit' : ''}`}
                    onClick={() => handlePlaceBet(String(num))}
                    disabled={spinning || stage !== 'betting'}
                  >
                    <span>{num}</span>
                    {bets[String(num)] > 0 && <span className="cellBetChipBadge">{money(bets[String(num)])}</span>}
                  </button>
                ))}
              </div>

              <div className="numRow">
                {ROW_1.map(num => (
                  <button
                    key={num}
                    type="button"
                    className={`rouletteCellBtn ${getNumberColor(num)} ${displayedWinningNumber === num ? 'winningHit' : ''}`}
                    onClick={() => handlePlaceBet(String(num))}
                    disabled={spinning || stage !== 'betting'}
                  >
                    <span>{num}</span>
                    {bets[String(num)] > 0 && <span className="cellBetChipBadge">{money(bets[String(num)])}</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="dozensRow">
            {['1st 12', '2nd 12', '3rd 12'].map(dozen => (
              <button
                key={dozen}
                type="button"
                className="outsideBetBtn"
                onClick={() => handlePlaceBet(dozen)}
                disabled={spinning || stage !== 'betting'}
              >
                <span>{dozen.toUpperCase()}</span>
                {bets[dozen] > 0 && <span className="cellBetChipBadge">{money(bets[dozen])}</span>}
              </button>
            ))}
          </div>

          <div className="outsideRow">
            <button className="outsideBetBtn" onClick={() => handlePlaceBet('1-18')} disabled={spinning || stage !== 'betting'}>
              <span>1-18</span>
              {bets['1-18'] > 0 && <span className="cellBetChipBadge">{money(bets['1-18'])}</span>}
            </button>
            <button className="outsideBetBtn" onClick={() => handlePlaceBet('EVEN')} disabled={spinning || stage !== 'betting'}>
              <span>CHẴN</span>
              {bets['EVEN'] > 0 && <span className="cellBetChipBadge">{money(bets['EVEN'])}</span>}
            </button>
            <button className="outsideBetBtn redBox" onClick={() => handlePlaceBet('RED')} disabled={spinning || stage !== 'betting'}>
              <span>ĐỎ</span>
              {bets['RED'] > 0 && <span className="cellBetChipBadge">{money(bets['RED'])}</span>}
            </button>
            <button className="outsideBetBtn blackBox" onClick={() => handlePlaceBet('BLACK')} disabled={spinning || stage !== 'betting'}>
              <span>ĐEN</span>
              {bets['BLACK'] > 0 && <span className="cellBetChipBadge">{money(bets['BLACK'])}</span>}
            </button>
            <button className="outsideBetBtn" onClick={() => handlePlaceBet('ODD')} disabled={spinning || stage !== 'betting'}>
              <span>LẺ</span>
              {bets['ODD'] > 0 && <span className="cellBetChipBadge">{money(bets['ODD'])}</span>}
            </button>
            <button className="outsideBetBtn" onClick={() => handlePlaceBet('19-36')} disabled={spinning || stage !== 'betting'}>
              <span>19-36</span>
              {bets['19-36'] > 0 && <span className="cellBetChipBadge">{money(bets['19-36'])}</span>}
            </button>
          </div>
        </div>

        {/* 3. Luxury Chip Rack & Action Controls */}
        <div className="rouletteChipBar">
          <div className="rouletteChipBarHeader">
            <div className="rouletteActiveChipPill">
              <span className="pillLabel">CƯỢC:</span>
              <span className="pillValue">${money(selectedChip)}</span>
            </div>

            <div className="rouletteTotalBetPill">
              <span className="pillLabel">TỔNG ĐẶT:</span>
              <span className="pillValue gold">${money(totalBetAmount)}</span>
            </div>

            <button
              type="button"
              className={`rouletteCustomTriggerBtn ${isEditingChip ? 'active' : ''}`}
              onClick={() => setIsEditingChip(v => !v)}
            >
              {isEditingChip ? '✕ Đóng' : 'Tự nhập'}
            </button>
          </div>

          {isEditingChip && (
            <div className="rouletteCustomInputRow">
              <span className="customInputLabel">MỨC CƯỢC:</span>
              <div className="customInputBox">
                <input
                  type="text"
                  inputMode="numeric"
                  value={chipInput}
                  onChange={e => setChipInput(e.target.value.replace(/\D/g, ''))}
                  placeholder={`Tối thiểu ${lobby?.minBet || 1000}...`}
                />
                <button
                  type="button"
                  className="customApplyBtn"
                  onClick={() => {
                    const num = Number(chipInput) || lobby?.minBet || 1000;
                    setSelectedChip(Math.max(lobby?.minBet || 1000, num));
                    setIsEditingChip(false);
                  }}
                >
                  ÁP DỤNG
                </button>
              </div>
            </div>
          )}

          <div className="rouletteChipsRow">
            {CHIP_PRESETS.map(preset => (
              <button
                key={preset.value}
                type="button"
                className={`chipSelectBtn ${selectedChip === preset.value ? 'active' : ''}`}
                style={{
                  background: preset.color,
                  borderColor: preset.border
                }}
                onClick={() => {
                  setSelectedChip(preset.value);
                  setIsEditingChip(false);
                }}
              >
                <div className="chipInnerDisc">
                  <span className="chipLabel">{preset.label}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="rouletteControlsGrid">
            <button
              type="button"
              className="rltActBtn"
              onClick={handleUndo}
              disabled={spinning || betHistory.length === 0 || stage !== 'betting'}
            >
              <RotateCcw />
              <span>Hoàn tác</span>
            </button>

            <button
              type="button"
              className="rltActBtn"
              onClick={handleClearBets}
              disabled={spinning || totalBetAmount === 0 || stage !== 'betting'}
            >
              <Trash2 />
              <span>Hủy cược</span>
            </button>

            <button
              type="button"
              className="rltActBtn"
              onClick={() => setIsPlayerDrawerOpen(true)}
            >
              <Users />
              <span>Phòng ({playersList.length}/10)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
