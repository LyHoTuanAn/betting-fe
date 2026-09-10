import {useEffect, useRef, useState} from 'react';
import {Crosshair, LogOut, Minus, Plus, UserRound} from 'lucide-react';
import {ResultFx} from '../shared/ResultFx.jsx';
import {Topbar} from '../shared/Topbar.jsx';
import {API_URL} from '../shared/api.js';
import {playCelebrationAudio} from '../shared/audio.js';
import {BET_LIMITS} from '../shared/constants.js';
import {compactFishFx} from '../shared/device.js';
import {money} from '../shared/format.js';
import {useGameFx} from '../shared/hooks.js';
import {Popup, usePopup} from '../shared/Popup.jsx';
import {FishModel, OceanAmbient} from './FishModel.jsx';
import {createFish, fishTypes} from './fish-data.js';
import './fish-stations.css';

const DEFAULT_AVATARS = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCXHazhsFoYtskfBBFCmR3HI6l5xu8K_3LOMZpY_ErMDhf-Pm0tFjf2ao5bFkoKwxdsydK7wiZ-Chj6srlhBavpRpxf3zHRBpvwcVkWRbf_uUOGpqy5mRQO_cVY9ybNauenQCY4j67LVWimJzp4TFtZ6lV434D4NsDG2wwEzrSH7DvcL9O5o1gsIuJN7FtcIe1-L14xW6XafnbyCgE10SdehgxavvfBDCNG3XPYaiGCPhpxxwuMB7cx',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBRAsQ50KA8XZRhom16rs-UfNZHonSFzCKpeqFpVWfM8GlR4k03dBupZGTVCuSU_VZzT8JO4bcnbk-yOvr6BoLXDW07zwUHwZZnG3dJlXILwNsuCs-7Pf2plL9og3tqsOd-WwNYHMuwOnwYLk7S0iUd106SeeVaVH8FT37fZyHBHNv3w7NN7-43qiooyl9ashly1Wu0_ANp_0mKkseqdtudjD4ZtoytuIQ-AwS7sduFoRCh7xWS-87R',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCZRv9nVhiiAb3cIqAMx3A_Px2PYBdlUHraojN2mKKQVjec7rAhpRy2UT034laTex38rshN9BaXcbw9LFNoXbjlticuZhbcbzItWsW0ZDQh0UoSV-ASis8Tp4JGF9enRbojvZZrhTVeuIbVLWN-Ue_OU31_YsmLrdOYkg4sEgRRr_lsGjXWrlUyLpS_9KBbZ0FtSBj_Da1mpHgkc5DDDMdNK8EaUL3JYFxez8m48dbYZvSDTGeOGxpT',
  '/assets/home-avatar.webp',
  '/assets/dice-avatar.webp',
  '/assets/home-avatar.webp'
];

const SEAT_POSITIONS = [
  { xRatio: 0.14, isTop: false }, // Seat 0: Bottom-Left
  { xRatio: 0.50, isTop: false }, // Seat 1: Bottom-Center (Hero default)
  { xRatio: 0.86, isTop: false }, // Seat 2: Bottom-Right
  { xRatio: 0.86, isTop: true },  // Seat 3: Top-Right
  { xRatio: 0.50, isTop: true },  // Seat 4: Top-Center
  { xRatio: 0.14, isTop: true },  // Seat 5: Top-Left
];

export function FishGame({goHome, balance, setBalance, sound, setSound, token, user}) {
  const comboRef = useRef(0);
  const comboTimer = useRef(null);
  const fireTimerRef = useRef(null);
  const pointerRef = useRef(null);
  const shootRef = useRef(null);
  const aimFrameRef = useRef(null);
  const socketRef = useRef(null);
  const playerIdRef = useRef(null);

  const [fx, triggerFx, dismissFx] = useGameFx();
  const area = useRef(null);
  const [power, setPower] = useState(1000);
  const [powerInput, setPowerInput] = useState('');
  const [isEditingPower, setIsEditingPower] = useState(false);
  const [shots, setShots] = useState([]);
  const [hits, setHits] = useState([]);
  const [coins, setCoins] = useState([]);
  const [fishes, setFishes] = useState(() => Array.from({length: 12}, (_, i) => createFish(i)));
  const [target, setTarget] = useState({x: 50, y: 45});
  const [aim, setAim] = useState(0);
  const [eventNotice, setEventNotice] = useState(null);
  const [frenzy, setFrenzy] = useState(false);

  // Multi-player State
  const [playersList, setPlayersList] = useState([]);
  const [heroSeatIndex, setHeroSeatIndex] = useState(1);
  const heroSeatIndexRef = useRef(1);
  const [otherAims, setOtherAims] = useState({});

  const updateHeroSeat = idx => {
    const safeIdx = typeof idx === 'number' && idx >= 0 && idx < 6 ? idx : 1;
    heroSeatIndexRef.current = safeIdx;
    setHeroSeatIndex(safeIdx);
  };

  const [roomInfo, setRoomInfo] = useState({count: 0, capacity: 6});
  const exitPopup = usePopup();
  const [roomReady, setRoomReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(35);
  const [phase, setPhase] = useState('waiting');
  const [lobby, setLobby] = useState(null);
  const [stage, setStage] = useState('calm');
  const [selfReady, setSelfReady] = useState(false);

  const fishesRef = useRef(fishes);
  useEffect(() => { fishesRef.current = fishes; }, [fishes]);

  const getSeatAnchorPx = (seatIdx, width, height) => {
    const cfg = SEAT_POSITIONS[seatIdx] || SEAT_POSITIONS[1];
    const bx = width * cfg.xRatio;
    let by;
    if (cfg.isTop) {
      by = 86; // top: 58px + 28px center
    } else if (seatIdx === 1) {
      by = height - 106; // bottom: 78px + 28px center
    } else {
      by = height - 68; // bottom: 12px + 26px + 30px center
    }
    return { bx, by, isTop: cfg.isTop };
  };

  useEffect(() => {
    let isMounted = true;
    const criticalAssets = [
      '/assets/fish-real-bg.webp',
      '/assets/fish-cannon-real.webp',
      '/assets/fish-real-clown.webp',
      '/assets/fish-real-blue.webp',
      '/assets/fish-real-lion.webp',
      '/assets/fish-real-arowana.webp',
      '/assets/fish-real-manta.webp',
      '/assets/fish-real-turtle.webp',
      '/assets/fish-real-squid.webp',
      '/assets/fish-real-shark.webp',
      '/assets/fish-real-dragon.webp',
      '/assets/fish-real-dragoncarp.webp',
      '/assets/fish-real-mermaid.webp'
    ];
    let count = 0;
    criticalAssets.forEach(src => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        if (!isMounted) return;
        count++;
        setLoadProgress(Math.floor(35 + (count / criticalAssets.length) * 65));
        if (count >= criticalAssets.length) {
          setTimeout(() => { if (isMounted) setRoomReady(true); }, 150);
        }
      };
      img.onerror = () => {
        if (!isMounted) return;
        count++;
        if (count >= criticalAssets.length && isMounted) setRoomReady(true);
      };
      img.src = src;
    });
    const fallback = setTimeout(() => { if (isMounted) setRoomReady(true); }, 900);
    return () => { isMounted = false; clearTimeout(fallback); };
  }, []);

  useEffect(() => {
    const wsBase = API_URL.replace(/^http/, 'ws').replace(/[/]api$/, '');
    const socket = new WebSocket(`${wsBase}/ws/fish?token=${encodeURIComponent(token)}`);
    socketRef.current = socket;

    let leaving = false;
    const CLOSE_REASON = {
      1008: 'PHIÊN ĐĂNG NHẬP HẾT HẠN, VUI LÒNG ĐĂNG NHẬP LẠI',
      1013: 'GAME BẮN CÁ ĐANG TẠM ĐÓNG ĐỂ BẢO TRÌ',
      1006: 'MẤT KẾT NỐI MẠNG TỚI PHÒNG BẮN CÁ',
      1011: 'PHÒNG BẮN CÁ GẶP SỰ CỐ, VUI LÒNG VÀO LẠI'
    };

    const shape = f => {
      const t = fishTypes.find(k => k.kind === f.kind) || {};
      return {
        id: f.id,
        kind: f.kind,
        value: f.value,
        hp: f.hp,
        maxHp: f.maxHp,
        tag: f.tag,
        size: t.size || 'small',
        name: t.name || '',
        x: f.x * 100,
        top: f.y * 100,
        heading: f.heading,
        server: true,
        round: 0,
        delay: 0,
        dur: 0,
        hitKey: 0,
        dead: false
      };
    };

    const STAGE_NOTICE = {
      'school-warn': {type: 'school', title: 'ĐÀN CÁ LỚN SẮP XUẤT HIỆN', sub: 'Chuẩn bị săn bầy cá'},
      'school': {type: 'school active', title: '🌊 BẦY CÁ ĐANG DI CƯ 🌊', sub: 'Săn nhanh trước khi đàn rời đi'},
      'rare-warn': {type: 'mermaid', title: '🧜‍♀️ CÁ HOÀNG KIM SẮP XUẤT HIỆN', sub: 'Chuẩn bị dồn hoả lực'},
      'rare': {type: 'mermaid active', title: '🧜‍♀️ CÁ HOÀNG KIM ĐÃ XUẤT HIỆN', sub: 'Ai dứt điểm người đó ăn trọn'}
    };

    socket.onerror = () => { if (!leaving) triggerFx('diceLose', 'KHÔNG KẾT NỐI ĐƯỢC PHÒNG BẮN CÁ', 2200); };
    socket.onclose = event => {
      if (leaving || event.code === 1000) return;
      triggerFx('diceLose', CLOSE_REASON[event.code] || (event.reason ? event.reason.toUpperCase() : 'MẤT KẾT NỐI TỚI PHÒNG BẮN CÁ, VUI LÒNG VÀO LẠI'), 2600);
    };

    socket.onmessage = event => {
      let m;
      try { m = JSON.parse(event.data); } catch { return triggerFx('diceLose', 'MÁY CHỦ GỬI DỮ LIỆU KHÔNG ĐỌC ĐƯỢC', 1600); }
      
      if (m.type === 'joined') {
        playerIdRef.current = m.playerId;
        if (m.seatIndex !== undefined) updateHeroSeat(m.seatIndex);
        setLobby(m);
        setPlayersList(m.players || []);
        setPhase(m.status === 'playing' ? 'playing' : 'waiting');
        return;
      }
      if (m.type === 'lobby') {
        setLobby(m);
        setPlayersList(m.players || []);
        if (m.status === 'playing') setPhase('playing');
        return;
      }
      if (m.type === 'game-start') {
        setPhase('playing');
        setEventNotice(null);
        return;
      }
      if (m.type === 'state') {
        setPhase('playing');
        setStage(m.stage);
        setFishes(m.fish.map(shape));
        setPlayersList(m.players || []);
        setRoomInfo({count: m.players.length, capacity: m.capacity});
        return;
      }
      if (m.type === 'stage') {
        setEventNotice(STAGE_NOTICE[m.stage] || null);
        setFrenzy(m.stage === 'school');
        return;
      }
      if (m.type === 'wallet') {
        setBalance(m.balance);
        return;
      }
      if (m.type === 'error') {
        triggerFx('diceLose', m.message || 'Không thể bắn', 1400);
        return;
      }

      if (m.type === 'shot') {
        const isHero = m.playerId === playerIdRef.current;
        const seatIdx = m.seatIndex !== undefined ? m.seatIndex : (isHero ? heroSeatIndexRef.current : 0);

        // If another player shot, animate their turret and display their bullet trail originating from their gun
        if (!isHero && area.current) {
          const r = area.current.getBoundingClientRect();
          const { bx, by } = getSeatAnchorPx(seatIdx, r.width, r.height);
          const targetPxX = m.aimX * r.width;
          const targetPxY = m.aimY * r.height;
          const oAngle = Math.atan2(targetPxY - by, targetPxX - bx) * 180 / Math.PI;
          const oRad = oAngle * Math.PI / 180;
          const barrelLen = 30;
          const oMuzzleX = bx + Math.cos(oRad) * barrelLen;
          const oMuzzleY = by + Math.sin(oRad) * barrelLen;
          const oDist = Math.max(40, Math.hypot(targetPxX - oMuzzleX, targetPxY - oMuzzleY));

          const shotId = Date.now() + Math.random();
          setShots(s => [...s, {
            id: shotId,
            x: m.aimX * 100,
            y: m.aimY * 100,
            angle: oAngle,
            distance: oDist,
            power: m.power,
            sx: oMuzzleX,
            sy: oMuzzleY
          }]);
          setTimeout(() => setShots(s => s.filter(a => a.id !== shotId)), 360);

          setOtherAims(prev => ({
            ...prev,
            [seatIdx]: {
              aimAngle: oAngle + 90,
              firing: true,
              power: m.power
            }
          }));
          setTimeout(() => {
            setOtherAims(prev => ({
              ...prev,
              [seatIdx]: { ...prev[seatIdx], firing: false }
            }));
          }, 200);
        }

        // When a fish is killed
        if (m.killed) {
          if (isHero) {
            comboRef.current += 1;
            clearTimeout(comboTimer.current);
            comboTimer.current = setTimeout(() => comboRef.current = 0, 1500);
          }

          const coinId = Date.now() + Math.random();
          const isBoss = m.payout >= 40000 || m.fishKind === 'mermaid' || m.fishKind === 'dragoncarp' || m.fishKind === 'dragon';
          
          setCoins(c => [...c, {
            id: coinId,
            x: m.aimX * 100,
            y: m.aimY * 100,
            value: m.payout,
            combo: comboRef.current,
            isBoss,
            playerName: isHero ? 'Bạn' : (m.displayName || 'Người chơi')
          }]);

          // IMPORTANT: Only Boss / Mermaid / Golden Dragon shows full-screen ResultFx!
          // Normal fish ONLY shows compact floating gold text!
          if (isHero) {
            if (isBoss) {
              playCelebrationAudio('bossWin', sound);
              triggerFx('bossWin', `+${money(m.payout)}`, 4000);
            } else {
              playCelebrationAudio('fishWin', sound);
            }
          }

          setTimeout(() => setCoins(c => c.filter(a => a.id !== coinId)), 1600);
          return;
        }

        const hitId = Date.now() + Math.random();
        setHits(h => [...h, {id: hitId, x: m.aimX * 100, y: m.aimY * 100, miss: !m.fishId, damage: m.damage}]);
        setTimeout(() => setHits(h => h.filter(a => a.id !== hitId)), 820);
      }
    };

    return () => {
      leaving = true;
      socket.close(1000, 'left');
      socketRef.current = null;
      clearTimeout(comboTimer.current);
      clearInterval(fireTimerRef.current);
      cancelAnimationFrame(aimFrameRef.current);
    };
  }, [token, sound]);

  const pointAt = e => {
    if (!area.current) return;
    const r = area.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const { bx, by } = getSeatAnchorPx(heroSeatIndexRef.current, r.width, r.height);
    const angle = Math.atan2(y - by, x - bx) * 180 / Math.PI;
    setTarget({x: (x / r.width) * 100, y: (y / r.height) * 100});
    setAim(angle + 90);
  };

  const resetFishLap = id => {
    const current = fishesRef.current.find(f => f.id === id);
    if (!current || current.dead || (current.hp === current.maxHp && current.hitKey === 0)) return;
    const refreshed = fishesRef.current.map(f => f.id === id && !f.dead ? {...f, hp: f.maxHp, hitKey: 0} : f);
    fishesRef.current = refreshed;
    setFishes(refreshed);
  };

  const shoot = e => {
    if (!area.current) return;
    if (balance < power) {
      triggerFx('diceLose', 'KHÔNG ĐỦ VÀNG ĐỂ BẮN', 1400);
      return;
    }
    const r = area.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const px = (x / r.width) * 100;
    const py = (y / r.height) * 100;
    const id = Date.now();

    const curSeat = heroSeatIndexRef.current;
    const { bx, by } = getSeatAnchorPx(curSeat, r.width, r.height);
    const barrelLen = 30;
    const dx = x - bx;
    const dy = y - by;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const rad = angle * Math.PI / 180;
    const muzzleX = bx + Math.cos(rad) * barrelLen;
    const muzzleY = by + Math.sin(rad) * barrelLen;
    const distance = Math.max(40, Math.hypot(x - muzzleX, y - muzzleY));

    setTarget({x: px, y: py});
    setAim(angle + 90);
    setShots(s => [...s, {id, x: px, y: py, angle, distance, power, sx: muzzleX, sy: muzzleY}]);
    setTimeout(() => setShots(s => s.filter(a => a.id !== id)), 360);

    const shotPower = power;
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({type: 'shoot', aimX: px / 100, aimY: py / 100, power: shotPower, seatIndex: curSeat}));
    } else {
      triggerFx('diceLose', 'CHƯA KẾT NỐI ĐƯỢC PHÒNG BẮN CÁ, VUI LÒNG CHỜ HOẶC VÀO LẠI', 1800);
    }
  };
  shootRef.current = shoot;

  const trackAim = e => {
    if (pointerRef.current) pointerRef.current = {clientX: e.clientX, clientY: e.clientY};
    if (aimFrameRef.current) return;
    aimFrameRef.current = requestAnimationFrame(() => {
      aimFrameRef.current = null;
      pointAt(e);
    });
  };

  const stopFiring = e => {
    clearInterval(fireTimerRef.current);
    fireTimerRef.current = null;
    pointerRef.current = null;
    if (e?.pointerId != null && area.current?.hasPointerCapture?.(e.pointerId)) area.current.releasePointerCapture(e.pointerId);
  };

  const startFiring = e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    area.current?.setPointerCapture?.(e.pointerId);
    pointerRef.current = {clientX: e.clientX, clientY: e.clientY};
    shoot(e);
    clearInterval(fireTimerRef.current);
    fireTimerRef.current = setInterval(() => {
      if (pointerRef.current) shootRef.current?.(pointerRef.current);
    }, compactFishFx ? 180 : 130);
  };

  const toggleReady = () => {
    const next = !selfReady;
    setSelfReady(next);
    socketRef.current?.send(JSON.stringify({type: next ? 'ready' : 'unready'}));
  };

  const leaveRoom = () => {
    socketRef.current?.send(JSON.stringify({type: 'leave'}));
    goHome();
  };

  const askExit = async () => {
    const agreed = await exitPopup.confirm({
      title: 'Thoát phòng bắn cá?',
      message: phase === 'waiting' ? 'Bạn sẽ rời phòng chờ và quay về trang chủ.' : 'Trận đang diễn ra. Rời phòng bây giờ sẽ mất lượt chơi hiện tại.',
      confirmLabel: 'THOÁT PHÒNG',
      cancelLabel: 'Ở LẠI',
      danger: true
    });
    if (agreed) leaveRoom();
  };

  // Build 6 Seat Stations List
  const seats = Array.from({length: 6}, (_, i) => {
    const player = playersList.find(p => (p.seatIndex ?? 0) === i);
    const isHero = player ? (player.id === playerIdRef.current || player.userId === user?.id) : (i === heroSeatIndex);
    return {
      seatIndex: i,
      player: isHero && !player ? { id: playerIdRef.current, userId: user?.id, displayName: user?.displayName || 'Bạn', username: user?.username || 'you', ready: selfReady } : player,
      isHero
    };
  });

  // WAITING ROOM (Sảnh chờ)
  if (phase === 'waiting') {
    const totalCapacity = lobby ? lobby.capacity : 6;
    const taken = lobby ? lobby.players.length : 1;
    const readyCount = lobby ? lobby.readyCount : (selfReady ? 1 : 0);
    const secs = lobby && lobby.countdownMs !== null ? Math.ceil(lobby.countdownMs / 1000) : null;

    return (
      <div className="screen fishScreen fishWaiting">
        <Topbar balance={balance} onBack={askExit} sound={sound} setSound={setSound} user={user} />
        <Popup popup={exitPopup.popup} onClose={exitPopup.close} />
        <div className="fishTitle">
          <b>PHÒNG CHỜ</b>
          <span>{lobby ? lobby.roomId.toUpperCase() : 'ĐANG GHÉP PHÒNG'}</span>
        </div>

        <main className="waitRoom">
          <p className="waitLead">
            {secs !== null ? `🔥 Đủ người sẵn sàng — Trận đấu bắt đầu sau ${secs}s!` : `Cần tối thiểu ${lobby ? lobby.needReady : 4} người sẵn sàng để mở cổng đại dương`}
          </p>

          {/* Luxury 6-Player Waiting Cards Grid */}
          <div className="waitRoomLuxuryGrid">
            {seats.map((seat, idx) => {
              const p = seat.player;
              const isHero = seat.isHero;
              const avatarSrc = p?.avatar || (isHero ? (user?.avatar || DEFAULT_AVATARS[idx]) : DEFAULT_AVATARS[idx]);
              const displayName = isHero ? (user?.displayName || 'Bạn') : (p?.displayName || `Người chơi #${idx + 1}`);
              const userName = isHero ? (user?.username || 'me') : (p?.username || `player_${idx + 1}`);

              if (p) {
                return (
                  <div key={idx} className={`waitSeatCard ${isHero ? 'isHero' : ''} ${p.ready ? 'isReady' : ''}`}>
                    <div className="waitSeatAvatarWrap">
                      <img src={avatarSrc} alt={displayName} />
                    </div>
                    <span className="waitSeatName">{displayName}</span>
                    <span className="waitSeatUser">@{userName}</span>
                    <span className={`waitSeatStatusBadge ${p.ready ? 'ready' : 'waiting'}`}>
                      {p.ready ? 'SẴN SÀNG' : 'ĐANG CHỜ'}
                    </span>
                  </div>
                );
              }

              return (
                <div key={idx} className="waitSeatCard isEmpty">
                  <div className="waitSeatEmptyAvatar">
                    <UserRound size={20} />
                  </div>
                  <span className="waitSeatName">Chỗ trống</span>
                  <span className="waitSeatUser">Vị trí #{idx + 1}</span>
                  <span className="waitSeatStatusBadge empty">ĐANG CHỜ</span>
                </div>
              );
            })}
          </div>

          <p className="waitCount">
            {taken}/{totalCapacity} người trong phòng · {readyCount} đã sẵn sàng
          </p>

          <div className="waitActions">
            <button className={'waitReady ' + (selfReady ? 'on' : '')} onClick={toggleReady}>
              {selfReady ? 'HUỶ SẴN SÀNG' : 'SẴN SÀNG VÀO TRẬN'}
            </button>
            <button className="waitLeave" onClick={leaveRoom}>
              <LogOut size={16} /> THOÁT
            </button>
          </div>
        </main>
      </div>
    );
  }

  // PLAYING ARENA
  return (
    <div className={'screen fishScreen ' + (frenzy ? 'fishFrenzy' : '')}>
      {!roomReady && (
        <div className="fishMatchmakingOverlay">
          <div className="matchmakingRadar">
            <div className="radarSweep" />
            <div className="radarPulse r1" />
            <div className="radarPulse r2" />
            <div className="radarCenterIcon">🔱</div>
          </div>
          <h2 className="matchmakingTitle">ĐANG VÀO ĐẠI DƯƠNG VÀNG</h2>
          <p className="matchmakingSub">Đang nạp súng pháo và khóa mục tiêu...</p>
          <div className="matchmakingBarBox">
            <div className="matchmakingFill" style={{width: `${loadProgress}%`}} />
          </div>
          <span className="matchmakingPercent">{loadProgress}%</span>
        </div>
      )}

      <ResultFx fx={fx} onDismiss={dismissFx} />
      <Topbar balance={balance} onBack={askExit} sound={sound} setSound={setSound} user={user} />
      <div className="roomPlayersArena">
        <UserRound size={13} /> {roomInfo.count || playersList.length || 1}/{roomInfo.capacity || 6} ngư thủ
      </div>
      <Popup popup={exitPopup.popup} onClose={exitPopup.close} />

      {eventNotice && (
        <div className={'fishEventNotice ' + eventNotice.type}>
          <strong>{eventNotice.title}</strong>
          <span>{eventNotice.sub}</span>
        </div>
      )}

      <main
        className="ocean"
        ref={area}
        onPointerMove={trackAim}
        onPointerDown={startFiring}
        onPointerUp={stopFiring}
        onPointerCancel={stopFiring}
      >
        <OceanAmbient />

        {/* Swimming Fishes */}
        {fishes.map(f => (
          <div
            data-fish-id={f.id + ':' + f.round}
            onAnimationIteration={e => {
              if (!f.server && e.target === e.currentTarget) resetFishLap(f.id);
            }}
            className={'movingFish fish3d ' + f.kind + ' ' + f.size + ' ' + (f.server ? 'serverFish ' : '') + (f.hitKey ? 'damaged ' : '') + (f.dead ? 'dead' : '')}
            key={f.id + '-' + f.round}
            style={{
              top: f.server ? undefined : f.top + '%',
              animation: f.server ? 'none' : undefined,
              animationDelay: f.delay + 's',
              animationDuration: f.dur + 's',
              '--server-x': f.server ? f.x + '%' : undefined,
              '--server-y': f.server ? f.top + '%' : undefined,
              '--fish-rot': f.server ? (f.heading * 180 / Math.PI).toFixed(1) + 'deg' : undefined,
              '--fish-flip': f.server ? (Math.cos(f.heading) < 0 ? -1 : 1) : undefined,
              '--hit': f.hitKey
            }}
          >
            <FishModel key={f.hitKey} fish={f} />
          </div>
        ))}

        {/* Hero Crosshair */}
        <div className="crosshair" style={{left: target.x + '%', top: target.y + '%'}}>
          <Crosshair />
        </div>

        {/* Shot Projectiles */}
        {shots.map(s => (
          <div
            className="trueShot"
            key={s.id}
            style={{
              '--sx': s.sx + 'px',
              '--sy': s.sy + 'px',
              '--angle': s.angle + 'deg',
              '--dist': s.distance + 'px',
              '--power': Math.min(1.8, 1 + s.power / 9000)
            }}
          >
            <span className="trueTrail" />
            <span className="trueCore" />
            <span className="trueBullet"><i /><b /></span>
          </div>
        ))}

        {/* Hit Net Impacts */}
        {hits.map(h => (
          <div className={'hit fishHit ' + (h.miss ? 'miss' : '') + ' ' + (h.killed ? 'killed' : '')} key={h.id} style={{left: h.x + '%', top: h.y + '%'}}>
            <i className="impactRing" />
            {!h.miss && (
              <>
                <span className="captureNet" />
                <span className="captureNet netTwo" />
                <span className="waterImpact" />
              </>
            )}
            {h.miss ? 'MISS' : h.killed ? 'HẠ CÁ' : 'TRÚNG'}
            {!h.miss && <b>-{h.damage}</b>}
          </div>
        ))}

        {/* CLEAN KILL FLOATING REWARDS (HIGH-VISIBILITY & ON TOP OF NETS) */}
        {coins.map(c => (
          <div className="fishRewardNormal" key={c.id} style={{left: c.x + '%', top: c.y + '%'}}>
            <div className="fishRewardBadge">
              <span className="rewardCoinIcon">🪙</span>
              <strong>+{money(c.value)}</strong>
              {c.combo > 1 && <span className="rewardComboBadge">{c.combo}x COMBO</span>}
            </div>
          </div>
        ))}

        {/* MULTIPLAYER CANNON STATIONS LAYER (6 SEATS AROUND TABLE) */}
        <div className="cannonStationsLayer">
          {seats.map((seat, idx) => {
            const p = seat.player;
            const isHero = seat.isHero;
            const isTop = idx >= 3;
            const otherAim = otherAims[idx];
            const barrelRot = isHero ? aim : (otherAim?.aimAngle ?? (isTop ? 180 : 0));
            const avatarSrc = p?.avatar || (isHero ? (user?.avatar || DEFAULT_AVATARS[idx]) : DEFAULT_AVATARS[idx]);
            const displayName = isHero ? (user?.displayName || 'Bạn') : (p?.displayName || `Người chơi #${idx + 1}`);
            const isFiring = isHero ? (shots.length > 0) : (otherAim?.firing ?? false);

            if (p) {
              return (
                <div key={idx} className={`cannonStation seat-${idx} ${isTop ? 'isTopSeat' : 'isBottomSeat'} ${isHero ? 'isHero' : ''}`}>
                  {/* Turret */}
                  <div className={`compactTurretWrap ${isFiring ? 'firing' : ''}`}>
                    <div className="compactTurretBase" />
                    <div className="compactTurretBarrel" style={{transform: `rotate(${barrelRot}deg)`}}>
                      <img src="/assets/fish-cannon-real.webp" alt="Súng bắn cá" />
                      <div className="compactTurretMuzzle" />
                    </div>
                  </div>

                  {/* Player Name Badge (Rendered below turret so top seats never collide with Topbar) */}
                  {!(idx === 1 && isHero) && (
                    <div className="playerStationBadge">
                      <div className="stationAvatar">
                        <img src={avatarSrc} alt={displayName} />
                      </div>
                      <div className="stationInfo">
                        <div className="stationNameRow">
                          <span className="stationName">{displayName}</span>
                          {isHero && <span className="stationHeroTag">⭐ BẠN</span>}
                        </div>
                        <span className="stationPower">🪙 {isHero ? money(power) : money(otherAim?.power || 1000)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div key={idx} className={`cannonStation seat-${idx} ${isTop ? 'isTopSeat' : 'isBottomSeat'} isEmpty`}>
                <div className="emptyTurretDisc">
                  <UserRound size={15} />
                </div>
                {!(idx === 1 && isHero) && (
                  <div className="emptyStationBadge">
                    <span>Trống</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* HERO UNIFIED CONSOLE (FIXED BOTTOM CENTER) */}
      <div className="heroControlsOverlay">
        <div className="heroQuickPowerPills">
          <div className="heroConsoleIdentity">
            <img src={user?.avatar || DEFAULT_AVATARS[1]} alt="Avatar" className="heroMiniAvatar" />
            <span className="heroConsoleTag">⭐ BẠN</span>
          </div>
          <div className="heroPillDivider" />
          {[100, 500, 1000, 2000, 5000, 10000].map(v => (
            <button
              key={v}
              className={power === v ? 'active' : ''}
              onPointerDown={e => {
                e.stopPropagation();
                setPower(v);
                setPowerInput(String(v));
              }}
            >
              {v >= 1000 ? v / 1000 + 'K' : v}
            </button>
          ))}
        </div>

        <div className="power" style={{transform: 'scale(0.88)'}}>
          <button onPointerDown={e => { e.stopPropagation(); setPower(Math.max(BET_LIMITS.fish.min, power - 100)); }}>
            <Minus />
          </button>
          <input
            type="text"
            inputMode="numeric"
            className="powerInput"
            value={isEditingPower ? powerInput : money(power)}
            onPointerDown={e => e.stopPropagation()}
            onFocus={() => { setIsEditingPower(true); setPowerInput(String(power)); }}
            onChange={e => {
              const raw = e.target.value.replace(/\D/g, '');
              setPowerInput(raw);
              const val = parseInt(raw, 10);
              if (!isNaN(val) && val > 0) setPower(Math.min(BET_LIMITS.fish.max, val));
            }}
            onBlur={() => {
              setIsEditingPower(false);
              const val = parseInt(powerInput, 10);
              if (!isNaN(val)) {
                setPower(Math.min(BET_LIMITS.fish.max, Math.max(BET_LIMITS.fish.min, val)));
              } else {
                setPower(BET_LIMITS.fish.min);
              }
            }}
            title="Nhập công suất đạn tùy ý"
          />
          <button onPointerDown={e => { e.stopPropagation(); setPower(Math.min(BET_LIMITS.fish.max, power + 100)); }}>
            <Plus />
          </button>
        </div>
      </div>
    </div>
  );
}
