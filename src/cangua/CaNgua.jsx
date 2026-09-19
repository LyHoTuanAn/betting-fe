import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Topbar } from '../shared/Topbar.jsx';
import { Popup, usePopup } from '../shared/Popup.jsx';
import { money } from '../shared/format.js';
import { API_URL } from '../shared/api.js';
import { HorseIcon } from './HorseIcon.jsx';
import { playCanguaSound, boardToHorses, emptyHorses, horseViewAt } from './cangua-engine.js';
import './cangua.css';

const COLORS = ['red', 'green', 'gold', 'blue'];
const COLOR_LABEL = { red: 'Đỏ', green: 'Xanh Lá', gold: 'Vàng', blue: 'Lam' };
const COLOR_HEX = { red: '#ff5252', green: '#56e5a9', gold: '#ffc174', blue: '#60a5fa' };
/** Thứ tự ghế trên mini-board phòng chờ, khớp đúng góc chuồng trên bàn thật. */
const SEAT_ORDER = ['red', 'green', 'blue', 'gold'];
const SEAT_POS = { red: 'pos-tl', green: 'pos-tr', blue: 'pos-bl', gold: 'pos-br' };
const EMOTE_CHOICES = ['🐎', '😂', '👍', '🔥', '🎲', '💰'];
const DEFAULT_AVATAR = '/assets/home-avatar.webp';
/** Mỗi bước chân của ngựa; đủ chậm để mắt theo kịp, đủ nhanh để không sốt ruột. */
const STEP_MS = 190;

// Helper to render 3x3 dice pip layout (1..6)
function renderDicePips(value, pipType) {
  const pipClass = pipType === 'ruby' ? 'cg-die-pip ruby-pip' : 'cg-die-pip amber-pip';
  const patterns = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8]
  };
  const active = new Set(patterns[value] || [4]);
  return Array.from({ length: 9 }).map((_, i) => (
    <div key={i} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {active.has(i) && <span className={pipClass} />}
    </div>
  ));
}

/**
 * Access token chỉ sống 15 phút — socket bị server đá (close 1008) giữa chừng
 * thường là vì token hết hạn. Làm mới bằng refresh token rồi bắn sự kiện
 * `goldzone:token` để App cập nhật prop token; effect socket tự chạy lại.
 */
async function refreshSession() {
  const refreshToken = localStorage.getItem('goldzone_refresh');
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    if (!res.ok) return false;
    const session = await res.json();
    localStorage.setItem('goldzone_token', session.token);
    localStorage.setItem('goldzone_refresh', session.refreshToken);
    window.dispatchEvent(new CustomEvent('goldzone:token', { detail: session.token }));
    return true;
  } catch {
    return false;
  }
}

export function CaNgua({ goHome, balance, setBalance, sound = true, setSound, user, token, onWallet, onProfile }) {
  const exitPopup = usePopup();

  // Bàn cờ hiển thị. Đây là bản CHẬM HƠN server một nhịp: khi có nước đi, ngựa
  // được cho chạy từng ô rồi mới chốt về đúng bàn server gửi.
  const [horses, setHorses] = useState(emptyHorses);
  const [screen, setScreen] = useState('connecting');
  const [lobby, setLobby] = useState(null);
  const [selfReady, setSelfReady] = useState(false);
  const [myColor, setMyColor] = useState(null);
  const [connError, setConnError] = useState(null);
  /** Tăng lên để ép effect socket chạy lại (nút "Kết nối lại" ở banner lỗi). */
  const [reconnectTick, setReconnectTick] = useState(0);
  /** Lỗi mở bàn (thiếu vé, …) — hiện cố định ở phòng chờ chứ không chớp qua như toast. */
  const [waitError, setWaitError] = useState(null);

  const [stage, setStage] = useState('rolling');
  const [turnColor, setTurnColor] = useState(null);
  const [timerVal, setTimerVal] = useState(0);
  const [dice, setDice] = useState([]);
  const [diceLeft, setDiceLeft] = useState([]);
  const [myMoves, setMyMoves] = useState([]);
  const [selectedHorseId, setSelectedHorseId] = useState(null);
  const [gameLog, setGameLog] = useState([]);
  const [gameOver, setGameOver] = useState(null);
  const [busy, setBusy] = useState(false);

  const [pot, setPot] = useState(0);
  const [prizePool, setPrizePool] = useState(0);
  const [isSoundMuted, setIsSoundMuted] = useState(!sound);
  const [isRolling, setIsRolling] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [toast, setToast] = useState({ visible: false, icon: '🐎', message: '' });
  /** Đếm ngược khai cuộc ở phòng chờ; server gửi countdownMs mỗi ~2s, client tự trừ giữa hai gói. */
  const [waitCountdown, setWaitCountdown] = useState(0);
  /** Emoji đang bay lên từ chuồng của người gửi. */
  const [emojiFxs, setEmojiFxs] = useState([]);
  const dice1 = dice[0] ?? 1;
  const dice2 = dice[1] ?? 1;

  // Animated Flying Horse (Kick effect)
  const [flyingHorse, setFlyingHorse] = useState(null);
  const [kickBurst, setKickBurst] = useState(null);
  const [kickBounty, setKickBounty] = useState(null);
  const [landingRipple, setLandingRipple] = useState(null);

  // References
  const boardRef = useRef(null);
  const stableSlotsRef = useRef({});
  const stableElsRef = useRef({});
  const emojiSeqRef = useRef(0);
  const trackTilesRef = useRef({});
  const socketRef = useRef(null);
  const myColorRef = useRef(null);
  const mutedRef = useRef(!sound);
  const setBalanceRef = useRef(setBalance);
  const stepTimersRef = useRef([]);
  /** Bàn server gửi trong lúc ngựa còn đang chạy, áp vào sau khi chạy xong. */
  const pendingBoardRef = useRef(null);
  /** Cú đá server đã chốt nhưng vó ngựa chưa chạm tới ô; xem releaseKick(). */
  const pendingKickRef = useRef(null);
  /** Tiền thưởng đá ngựa, về trước cả gói `kick` nên phải giữ riêng. */
  const pendingKickWalletRef = useRef(null);

  useEffect(() => { myColorRef.current = myColor; }, [myColor]);
  useEffect(() => { mutedRef.current = isSoundMuted; }, [isSoundMuted]);
  useEffect(() => { setBalanceRef.current = setBalance; }, [setBalance]);

  // Sync sound prop
  useEffect(() => {
    setIsSoundMuted(!sound);
  }, [sound]);

  // Đồng hồ lượt và đếm ngược phòng chờ chạy ở client giữa hai gói tin của server.
  useEffect(() => {
    const timer = setInterval(() => {
      setTimerVal(v => (v > 0 ? v - 1 : 0));
      setWaitCountdown(v => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const showToastMsg = (icon, msg) => {
    setToast({ visible: true, icon, message: msg });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 2200);
  };

  const playSoundEffect = useCallback((type) => {
    if (!mutedRef.current) playCanguaSound(type, true);
  }, []);

  const clearStepTimers = useCallback(() => {
    stepTimersRef.current.forEach(clearTimeout);
    stepTimersRef.current = [];
  }, []);

  /**
   * Cho một con ngựa chạy qua TỪNG Ô một, thay vì nhảy thẳng tới đích. Server
   * chỉ gửi điểm đầu và điểm cuối, nên quãng giữa được dựng lại ở đây bằng
   * `horseViewAt` — cùng công thức server dùng, nên không bao giờ lệch ô.
   */
  const walkHorse = useCallback((color, horseId, fromProgress, toProgress, onDone) => {
    const steps = [];
    for (let p = fromProgress + 1; p <= toProgress; p++) steps.push(p);
    if (!steps.length) { onDone?.(); return; }

    steps.forEach((progress, i) => {
      stepTimersRef.current.push(setTimeout(() => {
        const view = horseViewAt(color, progress);
        setHorses(prev => ({
          ...prev,
          [color]: prev[color].map(h => h.id === horseId ? { ...h, ...view, progress } : h)
        }));
        playSoundEffect('move');
        if (i === steps.length - 1) onDone?.();
      }, (i + 1) * STEP_MS));
    });
  }, [playSoundEffect]);

  // Find which horse is at a track tile
  const getHorseAtTrackTile = (tileIndex) => {
    for (const playerKey of ['gold', 'red', 'green', 'blue']) {
      const h = horses[playerKey].find(h => h.status === 'track' && h.pos === tileIndex);
      if (h) return h;
    }
    return null;
  };

  // Find which horse is at a home run step
  const getHorseAtHomerunStep = (playerKey, stepNum) => {
    return horses[playerKey].find(h => (h.status === 'homerun' || h.status === 'finished') && h.step === stepNum);
  };

  /** Thả emoji bay lên từ chuồng của người gửi, neo theo vị trí chuồng trên bàn. */
  const spawnEmojiFx = useCallback((color, emoji) => {
    const board = boardRef.current;
    const stableEl = stableElsRef.current[color];
    if (!board || !stableEl) return;
    const boardRect = board.getBoundingClientRect();
    const rect = stableEl.getBoundingClientRect();
    const id = ++emojiSeqRef.current;
    setEmojiFxs(prev => [...prev.slice(-5), {
      id,
      emoji,
      x: rect.left - boardRect.left + rect.width / 2,
      y: rect.top - boardRect.top + rect.height / 2
    }]);
    setTimeout(() => setEmojiFxs(prev => prev.filter(fx => fx.id !== id)), 2100);
  }, []);

  // Perform Kick Animation (Victim piece flies back into their stable slot)
  const triggerKickAnimation = (victimHorse, fromElement, targetSlotIndex = 0, bounty = 0) => {
    if (!boardRef.current) return;
    const boardRect = boardRef.current.getBoundingClientRect();
    
    // Get start coordinates (from attacked track tile)
    let startX = boardRect.width * 0.5;
    let startY = boardRect.height * 0.3;
    if (fromElement) {
      const rect = fromElement.getBoundingClientRect();
      startX = rect.left - boardRect.left + rect.width / 2;
      startY = rect.top - boardRect.top + rect.height / 2;
    }

    // Get end coordinates (victim's stable slot)
    const slotKey = `${victimHorse.player}_${targetSlotIndex}`;
    const targetSlotEl = stableSlotsRef.current[slotKey];
    let endX = victimHorse.player === 'red' ? boardRect.width * 0.18 :
               victimHorse.player === 'green' ? boardRect.width * 0.82 :
               victimHorse.player === 'blue' ? boardRect.width * 0.18 :
               boardRect.width * 0.82;
    let endY = (victimHorse.player === 'red' || victimHorse.player === 'green') ?
               boardRect.height * 0.18 : boardRect.height * 0.82;

    if (targetSlotEl) {
      const rect = targetSlotEl.getBoundingClientRect();
      endX = rect.left - boardRect.left + rect.width / 2;
      endY = rect.top - boardRect.top + rect.height / 2;
    }

    // 1. Kick Impact Slash Burst & Bounty Toast
    setKickBurst({ x: startX, y: startY });
    setKickBounty({ x: startX, y: startY - 20, text: bounty > 0 ? `+${money(bounty)} ĐÁ NGỰA!` : 'ĐÁ NGỰA!' });
    playSoundEffect('kick');

    // 2. Launch Flying Arc Horse
    setFlyingHorse({
      color: victimHorse.player,
      startX,
      startY,
      endX,
      endY,
      currentX: startX,
      currentY: startY,
      progress: 0
    });

    const startTime = performance.now();
    const duration = 850; // ms

    const animateArc = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      
      const peakHeight = Math.max(120, Math.abs(endX - startX) * 0.5);
      const curX = startX + t * (endX - startX);
      const curY = startY + t * (endY - startY) - (peakHeight * 4 * t * (1 - t));

      setFlyingHorse(prev => prev ? ({
        ...prev,
        currentX: curX,
        currentY: curY,
        progress: t
      }) : null);

      if (t < 1) {
        requestAnimationFrame(animateArc);
      } else {
        setFlyingHorse(null);
        setKickBurst(null);
        setLandingRipple({ x: endX, y: endY, color: victimHorse.player });
        playSoundEffect('move');
        setTimeout(() => setLandingRipple(null), 800);

        setHorses(prev => {
          const playerHorses = prev[victimHorse.player].map(h => {
            if (h.id === victimHorse.id) {
              return { ...h, status: 'stable', slot: targetSlotIndex, pos: null, step: 0 };
            }
            return h;
          });
          return { ...prev, [victimHorse.player]: playerHorses };
        });

        // Tiền thưởng đá ngựa do server chốt và gửi về qua gói `wallet`; bàn cờ
        // chỉ lo phần hoạt ảnh, không tự cộng đồng nào vào ví.
      }
    };

    requestAnimationFrame(animateArc);
  };
  /* ------------------------------------------------------------------ *
   * Kết nối phòng
   * ------------------------------------------------------------------ */
  /** Ô hiện tại của một con ngựa, để neo hoạt ảnh đá văng. */
  const horseTileOf = (horseId) => {
    for (const color of COLORS) {
      const h = horses[color]?.find(x => x.id === horseId);
      if (h) return h.pos;
    }
    return null;
  };
  const horseTileRef = useRef(horseTileOf);
  useEffect(() => { horseTileRef.current = horseTileOf; });

  useEffect(() => {
    if (!token) return;
    const wsBase = API_URL.replace(/^http/, 'ws').replace(/[/]api$/, '');

    /** Socket + vòng đời nối lại của lần chạy effect này. `stopped` chặn
        reconnect khi unmount hoặc khi effect chạy lại vì token/tick đổi. */
    let socket = null;
    let stopped = false;
    let retryTimer = null;
    let attempt = 0;

    /**
     * Nổ cú đá đang treo. Gọi ngay TRƯỚC khi áp bàn mới, vì hoạt ảnh cần đọc ô
     * cũ của nạn nhân để biết phóng từ đâu — áp bàn trước là nạn nhân đã về
     * chuồng, không còn ô nào để neo.
     */
    const releaseKick = () => {
      // Tiền thưởng do server gửi TRƯỚC cả gói `kick`, nên nó được giữ riêng và
      // mở ra ở đây: ví nhảy trước khi vó ngựa chạm ô cũng là lộ kết quả.
      const purse = pendingKickWalletRef.current;
      if (purse !== null) {
        pendingKickWalletRef.current = null;
        setBalanceRef.current?.(purse.balance);
        if (purse.amount > 0) showToastMsg('💰', `Thưởng đá ngựa +${money(purse.amount)}`);
      }

      const k = pendingKickRef.current;
      if (!k) return;
      pendingKickRef.current = null;
      playSoundEffect('kick');
      const tile = horseTileRef.current(k.victimHorseId);
      triggerKickAnimation({ player: k.victimColor, id: k.victimHorseId }, trackTilesRef.current[`track_${tile}`], 0, k.bounty || 0);
      showToastMsg('💥', `${k.byName} đá bay ngựa ${COLOR_LABEL[k.victimColor]}!`);
    };

    /** Bàn server gửi trong lúc ngựa còn chạy, áp ngay khi bước cuối kết thúc. */
    const applyBoard = (fallback) => {
      releaseKick();
      const board = pendingBoardRef.current || fallback;
      pendingBoardRef.current = null;
      if (board) setHorses(boardToHorses(board));
    };

    /**
     * Mở một socket mới. Gọi lần đầu khi mount, rồi gọi lại từ onclose với
     * backoff khi rớt mạng / server restart — trước đây socket chết là màn
     * hình chờ đóng băng mãi, nút Sẵn Sàng bấm không ăn gì.
     */
    const connect = () => {
      if (stopped) return;
      socket = new WebSocket(`${wsBase}/ws/cangua?token=${encodeURIComponent(token)}`);
      socketRef.current = socket;
      socket.onmessage = onSocketMessage;
      socket.onerror = () => {}; // close luôn đi sau error — để onclose lo reconnect
      socket.onclose = ev => {
        if (stopped) return;
        clearStepTimers();

        // 1008 = server từ chối token (hết hạn 15 phút). Làm mới phiên: sự
        // kiện goldzone:token đổi prop token → effect này chạy lại, nối socket mới.
        if (ev.code === 1008) {
          setConnError('Phiên đăng nhập hết hạn — đang làm mới…');
          void refreshSession().then(ok => {
            if (!ok && !stopped) setConnError('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
          });
          return;
        }

        // 4001 = bị mời ra vì ngồi chờ quá lâu — để người chơi tự bấm nối lại,
        // tránh vòng lặp vào-phòng-rồi-bị-đá của tab treo.
        if (ev.code === 4001) {
          setConnError('Bạn bị mời ra khỏi phòng vì ngồi chờ quá lâu.');
          return;
        }

        setConnError('Mất kết nối tới phòng — đang kết nối lại…');
        retryTimer = setTimeout(connect, Math.min(8000, 1000 * 2 ** attempt++));
      };
    };


    const onSocketMessage = event => {
      let m;
      try { m = JSON.parse(event.data); } catch { return; }

      if (m.pot !== undefined) setPot(m.pot);
      if (m.prizePool !== undefined) setPrizePool(m.prizePool);
      if (Array.isArray(m.log)) setGameLog(m.log);

      switch (m.type) {
        case 'joined':
          attempt = 0;
          setConnError(null);
          setWaitError(null);
          setMyColor(m.color);
          setLobby(m);
          setWaitCountdown(m.countdownMs ? Math.ceil(m.countdownMs / 1000) : 0);
          setScreen(m.status === 'playing' ? 'playing' : 'waiting');
          setGameOver(null);
          setMyMoves([]);
          setSelectedHorseId(null);
          return;

        case 'lobby':
          setLobby(m);
          setSelfReady(!!m.players?.find(p => p.color === myColorRef.current)?.ready);
          setWaitCountdown(m.countdownMs ? Math.ceil(m.countdownMs / 1000) : 0);
          return;

        case 'countdown':
          setWaitError(null);
          setWaitCountdown(Math.ceil((m.ms || 5000) / 1000));
          playSoundEffect('dice');
          return;

        case 'game-start':
          setScreen('playing');
          setGameOver(null);
          setMyMoves([]);
          setSelectedHorseId(null);
          showToastMsg('🏇', 'Bàn đã mở! Chúc bạn về nhất.');
          return;

        case 'state':
          setLobby(curr => ({ ...(curr || {}), ...m }));
          setStage(m.stage);
          setTurnColor(m.turnColor);
          setTimerVal(Math.ceil((m.stageMs || 0) / 1000));
          if (!stepTimersRef.current.length) {
            setDice(m.dice || []);
            setDiceLeft(m.diceLeft || []);
          }
          // Ngựa còn đang chạy thì giữ bàn lại, áp sau khi chạy xong.
          if (m.board) {
            if (stepTimersRef.current.length) pendingBoardRef.current = m.board;
            else setHorses(boardToHorses(m.board));
          }
          if (m.status === 'playing') setScreen('playing');
          if (m.turnColor && m.turnColor !== myColorRef.current) setMyMoves([]);
          return;

        case 'your-turn':
          setMyMoves(m.moves || []);
          setDiceLeft(m.diceLeft || []);
          setSelectedHorseId(null);
          setBusy(false);
          return;

        case 'roll': {
          setIsRolling(true);
          playSoundEffect('dice');
          // Xúc xắc nhảy loạn trong lúc hoạt ảnh rồi mới chốt về mặt server đã gieo.
          const spin = setInterval(
            () => setDice([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]),
            80
          );
          setTimeout(() => {
            clearInterval(spin);
            setDice(m.dice);
            setIsRolling(false);
          }, m.animMs || 1200);
          return;
        }

        case 'no-moves': {
          const rolled = (m.dice || []).join(' và ');
          showToastMsg('🚫', m.stuck
            ? `${COLOR_LABEL[m.color] || m.color} thảy ${rolled} — cần mặt 6 mới mở cửa chuồng, mất lượt.`
            : `${COLOR_LABEL[m.color] || m.color} không có nước đi, mất lượt.`);
          return;
        }

        case 'extra-turn':
          showToastMsg('🎲', 'Ra đôi — được thảy thêm lượt!');
          return;

        case 'move': {
          const { move, color } = m;
          setBusy(false);
          if (move.deploy) {
            // Ra quân là đặt thẳng vào cửa chuồng, không có quãng chạy.
            setHorses(prev => ({
              ...prev,
              [color]: prev[color].map(h => h.id === move.horseId
                ? { ...h, ...horseViewAt(color, 0), progress: 0 }
                : h)
            }));
            playSoundEffect('move');
            applyBoard(m.board);
          } else {
            walkHorse(color, move.horseId, move.fromProgress, move.toProgress, () => {
              clearStepTimers();
              applyBoard(m.board);
            });
          }
          return;
        }

        case 'kick':
          // Server báo đá ngay khi chốt nước, tức TRƯỚC lúc ngựa tấn công chạy
          // tới nơi. Giữ lại đây; cú đá chỉ nổ khi vó ngựa đặt lên đúng ô đó.
          pendingKickRef.current = m;
          return;

        case 'wallet':
          // Thưởng đá ngựa về trước cả gói `kick`; cất lại, mở cùng cú đá.
          if (m.reason === 'kick') {
            pendingKickWalletRef.current = {balance: m.balance, amount: m.amount};
            return;
          }
          setBalanceRef.current?.(m.balance);
          if (m.reason === 'entry') showToastMsg('🎟️', `Đã trừ vé ${money(-m.amount)}`);
          if (m.reason === 'prize') { playSoundEffect('win'); showToastMsg('🏆', `Về nhất! +${money(m.amount)}`); }
          if (m.reason === 'refund') showToastMsg('↩️', `Hoàn vé ${money(m.amount)}`);
          return;

        case 'game-over':
          clearStepTimers();
          // Ván có thể kết thúc ngay ở nước vừa đá; đừng để cú đá và tiền
          // thưởng kẹt lại mà không bao giờ được mở ra.
          releaseKick();
          if (m.board) setHorses(boardToHorses(m.board));
          setGameOver(m);
          setStage('result');
          setTimerVal(Math.ceil((m.stageMs || 0) / 1000));
          playSoundEffect('win');
          return;

        case 'back-to-lobby':
          setScreen('waiting');
          setSelfReady(false);
          setWaitError(null);
          setWaitCountdown(0);
          setGameOver(null);
          setMyMoves([]);
          setHorses(emptyHorses());
          return;

        case 'player-left':
          showToastMsg('🚪', `${m.displayName} đã rời bàn.`);
          return;

        case 'idle-kick':
          showToastMsg('⏰', `${m.displayName} bỏ lượt quá nhiều lần.`);
          return;

        case 'emoji':
          spawnEmojiFx(m.color, m.emoji);
          return;

        case 'start-failed':
          setScreen('waiting');
          setSelfReady(false);
          setWaitCountdown(0);
          // Lỗi mở bàn phải nằm yên trên màn hình chờ — toast 2 giây trôi qua
          // là người chơi tưởng phòng bị kẹt mà không hiểu vì sao.
          setWaitError(m.message || 'Bàn chưa thể mở.');
          return;

        case 'error':
          setBusy(false);
          showToastMsg('⚠️', m.message || 'Thao tác không hợp lệ');
          return;

        default:
          return;
      }
    };

    connect();

    return () => {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
      clearStepTimers();
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
      socketRef.current = null;
    };
  }, [token, reconnectTick, playSoundEffect, walkHorse, clearStepTimers, spawnEmojiFx]);

  const emit = payload => {
    if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify(payload));
  };

  const isMyTurn = !!turnColor && turnColor === myColor && !gameOver;
  /** Nước đi của quân đang chọn; bàn chỉ cho bấm những quân thực sự đi được. */
  const movesForSelected = myMoves.filter(m => m.horseId === selectedHorseId);
  const movableHorseIds = new Set(myMoves.map(m => m.horseId));

  /** Người chơi thật của một màu; phòng chờ/ghế trống trả về null. */
  const playerOf = color => lobby?.players?.find(p => p.color === color) || null;
  /** Tên hiển thị theo màu, fallback nhãn màu khi người chơi đã rời bàn. */
  const nameOf = color => (color ? playerOf(color)?.displayName || COLOR_LABEL[color] : '—');

  /** Mặt xúc xắc đã dùng bị mờ đi; chỉ so sánh theo số lần xuất hiện, đôi giống
      nhau vẫn đếm đúng. */
  const diceLeftPool = [...diceLeft];
  const diceUsed = dice.map(d => {
    const idx = diceLeftPool.indexOf(d);
    if (idx < 0) return true;
    diceLeftPool.splice(idx, 1);
    return false;
  });

  /** Tổng giây của stage hiện tại — rolling/moving ~21s (gồm 1.2s hoạt ảnh),
      result 12s; khớp TURN_TIME_MS + RESULT_TIME_MS bên server. */
  const timerMax = stage === 'result' ? 12 : 21;

  /** Ước tính hũ sau rake và tiền thưởng mỗi cú đá, từ config server gửi kèm. */
  const stakeVal = lobby?.stake || 0;
  const rakeBp = lobby?.config?.rakeBp ?? 0;
  const seatCount = lobby?.capacity || 4;
  const expectedPrize = Math.max(0, stakeVal * seatCount - Math.floor(stakeVal * seatCount * rakeBp / 10_000));
  const kickBountyVal = Math.floor(stakeVal * (lobby?.config?.kickBountyBp ?? 0) / 10_000);

  /** Dòng chạy tin trên banner: ưu tiên sự kiện mới nhất server ghi vào log. */
  const tickerText = gameLog.length ? gameLog[gameLog.length - 1].text : 'Đang chờ diễn biến bàn đấu…';

  const handleRoll = () => {
    if (!isMyTurn || stage !== 'rolling' || busy) return;
    setBusy(true);
    emit({ type: 'roll' });
  };

  const handleSelectHorse = (horseId) => {
    if (!isMyTurn) { showToastMsg('⏳', 'Chưa tới lượt bạn — chờ nhà đang đi xong.'); return; }
    if (stage !== 'moving') return;
    const moves = myMoves.filter(mv => mv.horseId === horseId);
    if (!moves.length) {
      showToastMsg('🚫', 'Quân này không đi được với mặt xúc xắc đang có.');
      return;
    }
    // Ngựa chỉ có một phương án thì đi luôn — bấm ngựa là ra quân, không bắt
    // người chơi bấm thêm chip nước đi lần nữa.
    if (moves.length === 1) { handlePlayMove(moves[0]); return; }
    setSelectedHorseId(horseId);
  };

  const handlePlayMove = (move) => {
    if (!isMyTurn || stage !== 'moving' || busy) return;
    setBusy(true);
    setMyMoves([]);
    setSelectedHorseId(null);
    emit({ type: 'move', horseId: move.horseId, die: move.die });
  };

  const toggleReady = () => {
    setWaitError(null);
    emit({ type: selfReady ? 'unready' : 'ready' });
    setSelfReady(r => !r);
  };

  const leaveRoom = () => { emit({ type: 'leave' }); goHome(); };

  const askExit = async () => {
    const agreed = await exitPopup.confirm({
      title: 'RỜI BÀN CỜ CÁ NGỰA',
      message: screen === 'playing'
        ? 'Ván đang diễn ra. Rời bàn bây giờ là mất vé đã đặt và quân của bạn sẽ bị bỏ lượt.'
        : 'Bạn có chắc muốn rời phòng và quay về trang chính?',
      confirmLabel: 'RỜI BÀN',
      cancelLabel: 'Ở LẠI',
      danger: true
    });
    if (agreed) leaveRoom();
  };


  const toggleMute = () => {
    const nextState = !isSoundMuted;
    setIsSoundMuted(nextState);
    if (setSound) setSound(!nextState);
    showToastMsg(nextState ? '🔇' : '🔊', nextState ? 'Đã tắt âm thanh' : 'Đã bật âm thanh sòng bài');
  };

  const sendEmoji = (emoji) => {
    playSoundEffect('move');
    emit({ type: 'emoji', emoji });
  };

  // Helper to render pure unnumbered outer track tiles
  const renderTrackTile = (tileNum, ringClass, isStart = false) => {
    const horseOnTile = getHorseAtTrackTile(tileNum);

    return (
      <div
        key={`tile_${tileNum}`}
        ref={el => trackTilesRef.current[`track_${tileNum}`] = el}
        className={`cg-tile ${ringClass} ${isStart ? 'start-gate' : ''} ${horseOnTile ? 'has-horse' : ''}`
          + (horseOnTile && movableHorseIds.has(horseOnTile.id) ? ' is-movable' : '')
          + (horseOnTile && horseOnTile.id === selectedHorseId ? ' is-selected' : '')}
        onClick={() => {
          // Bấm vào quân của mình để xem nước đi; quân địch không bấm được.
          if (horseOnTile && horseOnTile.player === myColor) handleSelectHorse(horseOnTile.id);
        }}
        title={`Ô cờ #${tileNum}${isStart ? ' (Cửa ra quân)' : ''}`}
      >
        {horseOnTile ? (
          <HorseIcon color={horseOnTile.player} size={17} animated={true} />
        ) : isStart && ringClass.includes('start-gold') ? (
          <span style={{ fontSize: 9 }}>🚩</span>
        ) : isStart ? (
          <span style={{ fontSize: 9 }}>★</span>
        ) : null}
      </div>
    );
  };

  // Helper to render numbered home run steps (1..6)
  const renderHomeRunStep = (playerKey, stepNum, colorClass) => {
    const horseOnStep = getHorseAtHomerunStep(playerKey, stepNum);
    return (
      <div
        key={`hr_${playerKey}_${stepNum}`}
        className={`cg-hr-step ${colorClass} ${horseOnStep ? 'has-horse' : ''}`
          + (horseOnStep && movableHorseIds.has(horseOnStep.id) ? ' is-movable' : '')
          + (horseOnStep && horseOnStep.id === selectedHorseId ? ' is-selected' : '')}
        onClick={() => {
          if (horseOnStep && horseOnStep.player === myColor) handleSelectHorse(horseOnStep.id);
        }}
        title={`Bậc về đích #${stepNum}`}
      >
        {horseOnStep ? (
          <HorseIcon color={playerKey} size={15} glow={false} />
        ) : (
          stepNum
        )}
      </div>
    );
  };

  /* ------------------------------------------------------------------ *
   * Chuồng của một nhà. Header hiển thị người chơi THẬT trong phòng (không
   * còn tên dựng sẵn): avatar + tên, kèm "(Bạn)" ở chuồng của mình. Chuồng
   * đang tới lượt sáng viền để nhìn bàn là biết ai đang đi.
   * ------------------------------------------------------------------ */
  const renderStable = (color) => {
    const player = playerOf(color);
    const mine = color === myColor;
    const onTurn = !gameOver && color === turnColor;
    return (
      <div
        ref={el => { stableElsRef.current[color] = el; }}
        className={`cg-stable cg-stable-${color} ${mine ? 'is-mine' : ''} ${onTurn ? 'is-turn' : ''} ${player ? '' : 'is-empty'}`}
      >
        <div className="cg-stable-header">
          <div className="cg-player-tag">
            {player ? (
              <img className="cg-stable-avatar" src={player.avatar || DEFAULT_AVATAR} alt="" />
            ) : (
              <span className="cg-player-dot" style={{ background: COLOR_HEX[color] }} />
            )}
            <span className="cg-player-name" style={mine ? { color: '#ffc174' } : undefined}>
              {player ? `${player.displayName}${mine ? ' (Bạn)' : ''}` : 'Đã rời bàn'}
            </span>
          </div>
          <span className="cg-stable-stat">
            {mine ? money(balance ?? user?.balance ?? 0) : (player?.bounty > 0 ? `+${money(player.bounty)}` : '')}
          </span>
        </div>

        <div className="cg-slots-grid">
          {horses[color].map((h, idx) => (
            <div
              key={h.id}
              ref={el => { stableSlotsRef.current[`${color}_${idx}`] = el; }}
              onClick={mine && h.status === 'stable' ? () => handleSelectHorse(h.id) : undefined}
              className={`cg-stable-slot ${h.status === 'stable' ? 'occupied' : ''}`
                + (mine && movableHorseIds.has(h.id) ? ' is-movable' : '')
                + (mine && selectedHorseId === h.id ? ' is-selected' : '')}
              title={h.status === 'stable'
                ? (mine ? `Chọn ngựa #${idx + 1}` : `Ngựa ${COLOR_LABEL[color]} #${idx + 1}`)
                : h.status === 'finished' ? 'Đã về đích' : 'Đang thi đấu'}
            >
              {h.status === 'stable' ? (
                <HorseIcon color={color} size={19} glow={false} />
              ) : h.status === 'finished' ? (
                <span style={{ fontSize: 11, color: '#ffc174' }}>🏆</span>
              ) : (
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: `${COLOR_HEX[color]}4d` }} />
              )}
            </div>
          ))}
        </div>
        <span className="cg-stable-name" style={{ color: COLOR_HEX[color] }}>Chuồng {COLOR_LABEL[color]}</span>
      </div>
    );
  };

  /* ------------------------------------------------------------------ *
   * Màn chờ ghép bàn — cá ngựa phải đủ cả bốn nhà mới khai cuộc.
   * ------------------------------------------------------------------ */
  if (screen !== 'playing') {
    const players = lobby?.players || [];
    const needReady = lobby?.needReady || 4;
    const readyCount = players.filter(p => p.ready).length;

    return (
      <div className="cg-screen">
        <Topbar balance={balance} onBack={askExit} sound={!isSoundMuted} setSound={setSound}
                user={user} onProfile={onProfile} onWallet={onWallet} />
        <Popup popup={exitPopup.popup} onClose={exitPopup.close} />

        <div className="cg-container">
          <div className="cg-wait-title">
            <b>PHÒNG CHỜ CỜ CÁ NGỰA</b>
            <span>{lobby ? (lobby.name || lobby.roomId).toUpperCase() : 'ĐANG GHÉP BÀN...'}</span>
          </div>

          {connError && (
            <div className="cg-wait-error">
              ⚠️ {connError}
              <button className="cg-wait-retry" onClick={() => { setConnError(null); setReconnectTick(t => t + 1); }}>KẾT NỐI LẠI</button>
            </div>
          )}
          {waitError && <div className="cg-wait-error">⚠️ {waitError}</div>}

          <p className="cg-wait-lead">
            {waitCountdown > 0
              ? `🔥 Đủ bốn nhà — khai cuộc sau ${waitCountdown}s!`
              : 'Đợi đủ 4 nhà cùng bấm SẴN SÀNG — bàn mở ngay khi đủ người.'}
          </p>

          <div className="cg-wait-vebox">
            Vé vào bàn: <strong>{money(stakeVal)}</strong> · Hũ dự kiến:{' '}
            <strong>{money(expectedPrize)}</strong>
          </div>

          {/* Mini-board: 4 ghế đặt đúng góc chuồng của bàn thật, hub giữa hiện
              tiến độ sẵn sàng / đếm ngược khai cuộc. */}
          <div className="cg-wait-board">
            {SEAT_ORDER.map(color => {
              const p = players.find(pl => pl.color === color) || null;
              const isHero = p && p.color === myColor;
              return (
                <div key={color} className={`cg-wait-seat ${SEAT_POS[color]} c-${color} ${p ? '' : 'is-empty'} ${p?.ready ? 'is-ready' : ''} ${isHero ? 'is-hero' : ''}`}>
                  <div className="cg-wait-avatar">
                    {p ? <img src={p.avatar || DEFAULT_AVATAR} alt={p.displayName} /> : <HorseIcon color={color} size={22} />}
                  </div>
                  <span className="cg-wait-name">{p ? p.displayName + (isHero ? ' (Bạn)' : '') : 'Chỗ trống'}</span>
                  <span className="cg-wait-color">Chuồng {COLOR_LABEL[color]}</span>
                  <span className={`cg-wait-badge ${p ? (p.canPay === false ? 'broke' : p.ready ? 'ready' : 'waiting') : 'empty'}`}>
                    {p ? (p.canPay === false ? 'THIẾU VÉ' : p.ready ? 'SẴN SÀNG' : 'ĐANG CHỜ') : 'TRỐNG'}
                  </span>
                </div>
              );
            })}

            <div className="cg-wait-hub">
              <span className="cg-wait-hub-icon">🏇</span>
              <b className="cg-wait-hub-num">{waitCountdown > 0 ? `${waitCountdown}s` : `${readyCount}/${needReady}`}</b>
              <span className="cg-wait-hub-label">{waitCountdown > 0 ? 'Khai cuộc' : 'Sẵn sàng'}</span>
            </div>
          </div>

          <div className="cg-wait-actions">
            <button className={'cg-wait-ready ' + (selfReady ? 'on' : '')} onClick={toggleReady} disabled={!!connError}>
              {selfReady ? 'HUỶ SẴN SÀNG' : 'SẴN SÀNG VÀO BÀN'}
            </button>
            <button className="cg-wait-leave" onClick={askExit}>🚪 THOÁT</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cg-screen">
      <Popup popup={exitPopup.popup} onClose={exitPopup.close} />

      {/* Bảng xếp hạng cuối ván */}
      {gameOver && (
        <div className="cg-modal-backdrop">
          <div className="cg-modal-content">
            <h3 style={{ color: '#ffd285', marginBottom: 4 }}>🏆 KẾT THÚC VÁN</h3>
            <p style={{ color: '#a08e7a', fontSize: 12, marginBottom: 10 }}>{gameOver.reason}</p>
            {gameOver.ranking?.map((r, i) => (
              <div key={r.userId} className={`cg-rank-row ${r.userId === user?.id ? 'is-hero' : ''}`}>
                <span className="cg-rank-pos">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                <HorseIcon color={r.color} size={16} />
                <span className="cg-rank-name">{r.displayName}{r.userId === user?.id ? ' (Bạn)' : ''}</span>
                <span className="cg-rank-stat">{r.finished}/4 về đích · {r.kicks} lần đá</span>
                <span className="cg-rank-payout">{r.payout > 0 ? `+${money(r.payout)}` : '—'}</span>
              </div>
            ))}
            <p style={{ color: '#a08e7a', fontSize: 11, marginTop: 10 }}>Tự về sảnh chờ sau {timerVal}s...</p>
          </div>
        </div>
      )}

      {/* Topbar navigation */}
      <Topbar
        balance={balance}
        onBack={askExit}
        sound={!isSoundMuted}
        setSound={setSound}
        user={user}
        onProfile={onProfile}
        onWallet={onWallet}
      />

      <div className="cg-container">
        {/* Streamlined Sleek Room & Pot Banner */}
        <section className="cg-banner">
          <div className="cg-banner-left">
            <span className="cg-room-title">CỜ CÁ NGỰA VIP</span>
            <span className="cg-room-tag">{lobby?.name || `Phòng #${lobby?.code || '—'}`}</span>
            <div className="cg-live-ticker-inline">
              <span className="cg-live-dot"></span>
              <span>{tickerText}</span>
            </div>
          </div>

          <div className="cg-pot-compact" title="Hũ về nhất (đã trừ phí bàn)">
            <div className="cg-pot-icon-mini">🏆</div>
            <span className="cg-pot-val-mini">{money(prizePool || pot)}</span>
          </div>
        </section>

        {/* LUXURY DARK CASINO BOARD CONTAINER */}
        <section className="cg-board-wrapper">
          <div ref={boardRef} className="cg-board-mat">
            <div className="cg-board-ambient"></div>

            {/* =========================================
                TOP ROW: Chuồng Đỏ | North Arm | Chuồng Xanh Lá
               ========================================= */}
            <div className="cg-row-top">
              {/* CHUỒNG ĐỎ (góc trái trên) */}
              {renderStable('red')}

              {/* NORTH ARM (Vertical 3 cols) */}
              <div className="cg-arm-vertical">
                {/* Col 1 (Outer Tiles - No numbers) */}
                <div className="cg-track-col-tiles">
                  {[47, 46, 45, 44, 43, 42].map(n => renderTrackTile(n, 'ring-red'))}
                </div>

                {/* Col 2 (Red Numbered Home Run: 1 -> 6 into center) */}
                <div className="cg-track-col-tiles cg-lane-red">
                  {[1, 2, 3, 4, 5, 6].map(step => renderHomeRunStep('red', step, 'c-red'))}
                </div>

                {/* Col 3 (Outer Tiles - No numbers) */}
                <div className="cg-track-col-tiles">
                  {[2, 3, 4, 5, 6, 7].map(n => renderTrackTile(n, 'ring-red'))}
                </div>
              </div>

              {/* CHUỒNG XANH LÁ (góc phải trên) */}
              {renderStable('green')}
            </div>

            {/* =========================================
                MIDDLE ROW: West Arm | Tâm Đích VIP | East Arm
               ========================================= */}
            <div className="cg-row-middle">
              {/* WEST ARM (Horizontal 3 rows) */}
              <div className="cg-arm-horizontal">
                {/* Row 1 (Outer tiles with Red start gate) */}
                <div className="cg-track-row-tiles">
                  {[38, 39, 40, 41, 48].map(n => renderTrackTile(n, 'ring-blue'))}
                  {renderTrackTile(1, 'start-red', true)}
                </div>

                {/* Row 2 (Blue Numbered Home Run: 1 -> 6 into center) */}
                <div className="cg-track-row-tiles cg-lane-blue">
                  {[1, 2, 3, 4, 5, 6].map(step => renderHomeRunStep('blue', step, 'c-blue'))}
                </div>

                {/* Row 3 (Outer tiles with Blue start gate) */}
                <div className="cg-track-row-tiles">
                  {renderTrackTile(37, 'start-blue', true)}
                  {[36, 35, 34, 33, 32].map(n => renderTrackTile(n, 'ring-blue'))}
                </div>
              </div>

              {/* CENTER VIP TROPHY HUB & 3D DICE ARENA */}
              <div
                className={`cg-trophy-hub ${isRolling ? 'is-rolling' : ''} ${isMyTurn && stage === 'rolling' ? 'ready-to-roll' : ''}`}
                onClick={handleRoll}
                title={isMyTurn && stage === 'rolling' ? 'Bấm vào tâm bàn cờ để THẢY XÚC XẮC' : `Lượt của ${nameOf(turnColor)}`}
              >
                <div className="cg-trophy-hub-inner">
                  {/* Pair of 3D Dice Rolling in the Center */}
                  <div className="cg-center-dice-stage">
                    <div className={`cg-center-die ruby ${isRolling ? 'rolling-1' : ''} ${!isRolling && diceUsed[0] ? 'is-used' : ''}`}>
                      {renderDicePips(dice1, 'ruby')}
                    </div>
                    <div className={`cg-center-die amber ${isRolling ? 'rolling-2' : ''} ${!isRolling && diceUsed[1] ? 'is-used' : ''}`}>
                      {renderDicePips(dice2, 'amber')}
                    </div>
                  </div>

                  {/* Mặt còn lại trong lượt; chưa gieo thì để trống thay vì đoán bừa. */}
                  <span className="cg-center-sum-label">
                    {isRolling ? '...'
                      : !dice.length ? '—'
                      : stage === 'moving' ? `Còn: ${diceLeft.join(' · ') || '—'}`
                      : `Tổng: ${dice1 + dice2}`}
                  </span>
                </div>
              </div>

              {/* EAST ARM (Horizontal 3 rows) */}
              <div className="cg-arm-horizontal">
                {/* Row 1 (Outer tiles with Green start gate) */}
                <div className="cg-track-row-tiles">
                  {[8, 9, 10, 11, 12].map(n => renderTrackTile(n, 'ring-green'))}
                  {renderTrackTile(13, 'start-green', true)}
                </div>

                {/* Row 2 (Green Numbered Home Run: 6 -> 1 into center) */}
                <div className="cg-track-row-tiles cg-lane-green">
                  {[6, 5, 4, 3, 2, 1].map(step => renderHomeRunStep('green', step, 'c-green'))}
                </div>

                {/* Row 3 (Outer tiles) */}
                <div className="cg-track-row-tiles">
                  {[19, 18, 17, 16, 15, 14].map(n => renderTrackTile(n, 'ring-green'))}
                </div>
              </div>
            </div>

            {/* =========================================
                BOTTOM ROW: Chuồng Lam | South Arm | Chuồng Vàng (Hero)
               ========================================= */}
            <div className="cg-row-bottom">
              {/* CHUỒNG LAM (góc trái dưới) */}
              {renderStable('blue')}

              {/* SOUTH ARM (Vertical 3 cols) */}
              <div className="cg-arm-vertical">
                {/* Col 1 (Outer tiles) */}
                <div className="cg-track-col-tiles">
                  {[31, 30, 29, 28, 27, 26].map(n => renderTrackTile(n, 'ring-gold'))}
                </div>

                {/* Col 2 (Gold Numbered Home Run: 6 -> 1 into center) */}
                <div className="cg-track-col-tiles cg-lane-gold">
                  {[6, 5, 4, 3, 2, 1].map(step => renderHomeRunStep('gold', step, 'c-gold'))}
                </div>

                {/* Col 3 (Outer tiles with Gold start gate) */}
                <div className="cg-track-col-tiles">
                  {[20, 21, 22, 23, 24].map(n => renderTrackTile(n, 'ring-gold'))}
                  {renderTrackTile(25, 'start-gold', true)}
                </div>
              </div>

              {/* CHUỒNG VÀNG (góc phải dưới) */}
              {renderStable('gold')}
            </div>

            {/* DYNAMIC KICK ANIMATIONS OVERLAY */}
            {kickBurst && (
              <div className="kick-impact-burst" style={{ left: kickBurst.x, top: kickBurst.y }}>
                <span style={{ fontSize: 28 }}>💥</span>
              </div>
            )}

            {kickBounty && (
              <div className="kick-bounty-badge" style={{ left: kickBounty.x, top: kickBounty.y }}>
                {kickBounty.text}
              </div>
            )}

            {flyingHorse && (
              <div className="flying-horse-overlay" style={{ left: `${flyingHorse.currentX}px`, top: `${flyingHorse.currentY}px` }}>
                <div className="flying-horse-inner">
                  <HorseIcon color={flyingHorse.color} size={38} glow={true} />
                </div>
              </div>
            )}

            {landingRipple && (
              <div
                className="stable-landing-ripple"
                style={{
                  left: landingRipple.x - 15,
                  top: landingRipple.y - 15,
                  borderColor: COLOR_HEX[landingRipple.color] || '#ffc174'
                }}
              />
            )}

            {/* Biểu cảm người chơi gửi, bay lên từ chuồng của họ */}
            {emojiFxs.map(fx => (
              <div key={fx.id} className="cg-emoji-float" style={{ left: fx.x, top: fx.y }}>{fx.emoji}</div>
            ))}
          </div>
        </section>

        {/* Streamlined Luxury Action Deck */}
        <section className="cg-control-panel">
          {/* Main Action Bar */}
          <div className="cg-deck-main">
            <div className="cg-deck-turn">
              <div className="cg-timer-ring-box">
                <svg viewBox="0 0 36 36" style={{ width: 32, height: 32, transform: 'rotate(-90deg)' }}>
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#1c1f2a"
                    strokeWidth="3.5"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#ffc174"
                    strokeWidth="3.5"
                    strokeDasharray={`${Math.min(100, (timerVal / timerMax) * 100)}, 100`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 1s linear' }}
                  />
                </svg>
                <span className="cg-timer-num">{timerVal < 10 ? `0${timerVal}` : timerVal}</span>
              </div>
              <div className="cg-turn-texts">
                <span className="cg-turn-title">
                  {gameOver ? 'VÁN ĐÃ KẾT THÚC'
                    : isMyTurn ? 'LƯỢT CỦA BẠN'
                    : `LƯỢT: ${nameOf(turnColor).toUpperCase()}`}
                </span>
                <span className="cg-turn-sub">
                  {gameOver ? 'Đang về lại sảnh chờ...'
                    : !isMyTurn ? `Chờ ${nameOf(turnColor)} đi — còn ${timerVal}s`
                    : stage === 'rolling' ? 'Bấm THẢY XÚC XẮC ở tâm bàn cờ'
                    : movesForSelected.length ? 'Chọn nước đi bên dưới'
                    : myMoves.some(mv => mv.deploy) ? 'Ra 6 rồi — chạm ngựa đang sáng trong chuồng để RA QUÂN'
                    : `Xúc xắc còn ${diceLeft.join(' và ') || '—'} — chạm vào ngựa đang sáng`}
                </span>
              </div>
            </div>

            {isMyTurn && stage === 'rolling' && (
              <button className="cg-action-btn-main" onClick={handleRoll} disabled={busy}>
                <span>🎲</span>
                <span>THẢY XÚC XẮC</span>
              </button>
            )}

            {/* Bảng nước đi: chỉ hiện đúng những nước server chấp nhận, nên
                không thể bấm ra một nước sai luật. */}
            {isMyTurn && stage === 'moving' && (
              <div className="cg-move-list">
                {(movesForSelected.length ? movesForSelected : myMoves).map((mv, i) => (
                  <button
                    key={`${mv.horseId}_${mv.die}_${i}`}
                    className={`cg-move-btn ${mv.kicks ? 'is-kick' : ''}`}
                    onClick={() => handlePlayMove(mv)}
                    disabled={busy}
                  >
                    <HorseIcon color={myColor} size={15} />
                    <span className="cg-move-label">
                      {mv.deploy
                        ? `Ra quân #${Number(mv.horseId.split('_')[1]) + 1}`
                        : `Ngựa #${Number(mv.horseId.split('_')[1]) + 1} đi ${mv.die}`}
                    </span>
                    <span className="cg-move-dest">
                      {mv.toHomerunStep ? `→ đích ${mv.toHomerunStep}` : `→ ô ${mv.toTile}`}
                    </span>
                    {mv.kicks && <span className="cg-move-kick">ĐÁ!</span>}
                  </button>
                ))}
                {!myMoves.length && <span className="cg-move-empty">Không có nước đi</span>}
              </div>
            )}
          </div>

          {/* Quick Tooling & Micro-Emotes Bar */}
          <div className="cg-deck-footer">
            <div className="cg-deck-pills">
              <button className="cg-pill-btn" onClick={askExit} title="Rời bàn">
                <span>🚪</span>
                <span>Rời bàn</span>
              </button>
              <div className="cg-deck-emotes">
                {EMOTE_CHOICES.map(emoji => (
                  <button key={emoji} className="cg-emote-mini" onClick={() => sendEmoji(emoji)} title={`Gửi ${emoji}`}>{emoji}</button>
                ))}
              </div>
            </div>

            <div className="cg-deck-pills">
              <button className="cg-pill-btn" onClick={toggleMute} title="Bật/Tắt âm thanh">
                <span>{isSoundMuted ? '🔇' : '🔊'}</span>
              </button>
              <button className="cg-pill-btn" onClick={() => setShowRulesModal(true)} title="Xem luật chơi">
                <span>?</span>
              </button>
            </div>
          </div>
        </section>

        {/* Dynamic Toast Notification */}
        <div className={`cg-toast ${toast.visible ? 'visible' : 'hidden'}`}>
          <span>{toast.icon}</span>
          <span>{toast.message}</span>
        </div>

        {/* Rules Modal */}
        {showRulesModal && (
          <div className="cg-modal-backdrop" onClick={() => setShowRulesModal(false)}>
            <div className="cg-modal-content" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#ffc174', fontWeight: 800, fontSize: 15 }}>📜 LUẬT CỜ CÁ NGỰA VIP</span>
                <button
                  style={{ background: 'none', border: 'none', color: '#a08e7a', fontSize: 18, cursor: 'pointer' }}
                  onClick={() => setShowRulesModal(false)}
                >
                  ✕
                </button>
              </div>
              <div style={{ fontSize: 11.5, lineHeight: 1.6, color: '#dfe2f1' }}>
                <p>• <strong>Đường đi chung:</strong> Các ô cờ tròn viền màu chạy quanh 4 cánh, ngựa đi theo chiều kim đồng hồ.</p>
                <p>• <strong>Cửa ra quân:</strong> Ô viền dày có cờ / sao cạnh chuồng — cần gieo ra <strong>mặt 6</strong> để mở cửa.</p>
                <p>• <strong>Chuồng về đích:</strong> Dãy bậc thang cùng màu đánh số <strong style={{ color: '#ffc174' }}>1 đến 6</strong> dẫn vào tâm; đưa đủ 4 ngựa vào là về nhất.</p>
                <p>• <strong>Đá ngựa:</strong> Đáp vào ô đối phương đang đứng để <strong style={{ color: '#ff5252' }}>ĐÁ BAY</strong> về chuồng{kickBountyVal > 0 ? <> và nhận <strong style={{ color: '#ffc174' }}>+{money(kickBountyVal)} vàng</strong> từ hũ</> : ''}!</p>
                <p>• <strong>Ra đôi:</strong> Hai mặt giống nhau được thảy thêm một lượt (tối đa 2 lần liên tiếp).</p>
                <p>• <strong>Về nhất:</strong> Ôm trọn hũ <strong style={{ color: '#ffc174' }}>{money(prizePool || expectedPrize)} vàng</strong>.</p>
              </div>
              <button className="cg-action-btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowRulesModal(false)}>
                ĐÃ HIỂU & TIẾP TỤC
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CaNgua;
