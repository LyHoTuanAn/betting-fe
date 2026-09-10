import {useEffect, useRef, useState} from 'react';
import {Topbar} from '../shared/Topbar.jsx';
import {ResultFx} from '../shared/ResultFx.jsx';
import {useGameFx} from '../shared/hooks.js';
import {playCelebrationAudio} from '../shared/audio.js';
import {money} from '../shared/format.js';
import {api} from '../shared/api.js';
import {analyzeCombination, canBeat, findBestMove, sortByRank, sortBySuit} from './tienlen-engine.js';
import './tienlen.css';

const TL_CHIPS = [10000, 50000, 100000, 500000, 1000000];

// Khớp BOT_NAMES bên backend: bot1 → phải, bot2 → trên, bot3 → trái.
const SEAT_OF = {hero: 'hero', bot1: 'right', bot2: 'top', bot3: 'left'};
const SEAT_NAME = {hero: 'Bạn', right: 'HoàngTửĐỏ', top: 'ĐạiGia_SàiGòn', left: 'BảoNgọc_VIP'};

const OPPONENTS = [
  {
    id: 'top',
    name: 'ĐạiGia_SàiGòn',
    vip: 'VIP 8',
    chips: 45200,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCXHazhsFoYtskfBBFCmR3HI6l5xu8K_3LOMZpY_ErMDhf-Pm0tFjf2ao5bFkoKwxdsydK7wiZ-Chj6srlhBavpRpxf3zHRBpvwcVkWRbf_uUOGpqy5mRQO_cVY9ybNauenQCY4j67LVWimJzp4TFtZ6lV434D4NsDG2wwEzrSH7DvcL9O5o1gsIuJN7FtcIe1-L14xW6XafnbyCgE10SdehgxavvfBDCNG3XPYaiGCPhpxxwuMB7cx'
  },
  {
    id: 'left',
    name: 'BảoNgọc_VIP',
    vip: 'VIP 5',
    chips: 18600,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBRAsQ50KA8XZRhom16rs-UfNZHonSFzCKpeqFpVWfM8GlR4k03dBupZGTVCuSU_VZzT8JO4bcnbk-yOvr6BoLXDW07zwUHwZZnG3dJlXILwNsuCs-7Pf2plL9og3tqsOd-WwNYHMuwOnwYLk7S0iUd106SeeVaVH8FT37fZyHBHNv3w7NN7-43qiooyl9ashly1Wu0_ANp_0mKkseqdtudjD4ZtoytuIQ-AwS7sduFoRCh7xWS-87R'
  },
  {
    id: 'right',
    name: 'HoàngTửĐỏ',
    vip: 'VIP 6',
    chips: 82000,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCZRv9nVhiiAb3cIqAMx3A_Px2PYBdlUHraojN2mKKQVjec7rAhpRy2UT034laTex38rshN9BaXcbw9LFNoXbjlticuZhbcbzItWsW0ZDQh0UoSV-ASis8Tp4JGF9enRbojvZZrhTVeuIbVLWN-Ue_OU31_YsmLrdOYkg4sEgRRr_lsGjXWrlUyLpS_9KBbZ0FtSBj_Da1mpHgkc5DDDMdNK8EaUL3JYFxez8m48dbYZvSDTGeOGxpT'
  }
];

/**
 * Tiến Lên server-authoritative: chia bài, kiểm tra combo, lượt bot và chốt
 * thắng thua đều do backend xử lý. Client chỉ chọn bài, gửi nước đi rồi vẽ lại
 * state máy chủ trả về (moves được animate tuần tự cho sinh động).
 */
export function TienLen({goHome, balance, setBalance, sound, setSound, token, user}) {
  const [fx, triggerFx, dismissFx] = useGameFx();
  const [phase, setPhase] = useState('betting'); // betting | playing | settled
  const [selectedChip, setSelectedChip] = useState(100000);
  const [betAmount, setBetAmount] = useState(100000);
  const [sortMode, setSortMode] = useState('rank');
  const [handId, setHandId] = useState(null);
  const [heroHand, setHeroHand] = useState([]);
  const [botCounts, setBotCounts] = useState({top: 13, left: 13, right: 13});
  const [selectedCardIds, setSelectedCardIds] = useState(new Set());
  const [currentTurn, setCurrentTurn] = useState('hero'); // hero | right | top | left
  const [foldedPlayers, setFoldedPlayers] = useState(new Set());
  const [tableCombo, setTableCombo] = useState(null);
  const [lastPlayedBy, setLastPlayedBy] = useState('Chọn mức cược để bắt đầu');
  const [turnTimer, setTurnTimer] = useState(15);
  const [toastMsg, setToastMsg] = useState('');
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [busy, setBusy] = useState(false);

  const soundRef = useRef(sound);
  useEffect(() => { soundRef.current = sound; }, [sound]);
  const busyRef = useRef(false);
  const passRef = useRef(() => {});

  const showToast = (msg, duration = 2400) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(curr => curr === msg ? '' : curr);
    }, duration);
  };

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Khôi phục ván đang dở sau reload (máy chủ giữ state trong 20 phút)
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api('/games/tienlen/active', {token}).then(data => {
      if (cancelled || !data?.active) return;
      const a = data.active;
      setHandId(a.handId);
      setBetAmount(a.bet);
      setHeroHand(a.heroHand || []);
      setBotCounts(Object.fromEntries((a.bots || []).map(b => [b.key, b.cardsLeft])));
      setTableCombo(a.table || null);
      setCurrentTurn(SEAT_OF[a.turn] || 'hero');
      setLastPlayedBy(a.lastPlayedBy || '');
      setPhase('playing');
      setTurnTimer(15);
      if (typeof a.balance === 'number') setBalance(a.balance);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [token]);

  // Đếm ngược lượt: hết giờ tự bỏ lượt (nếu đang bị đè bài)
  useEffect(() => {
    if (phase !== 'playing') return;
    const interval = setInterval(() => {
      setTurnTimer(t => {
        if (t <= 1) {
          if (currentTurn === 'hero' && tableCombo && !busyRef.current) {
            passRef.current();
          }
          return 15;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, currentTurn, tableCombo]);

  const resetToBetting = (message = 'Chọn mức cược để bắt đầu') => {
    setPhase('betting');
    setHandId(null);
    setHeroHand([]);
    setBotCounts({top: 13, left: 13, right: 13});
    setSelectedCardIds(new Set());
    setFoldedPlayers(new Set());
    setTableCombo(null);
    setCurrentTurn('hero');
    setLastPlayedBy(message);
  };

  const handleDeal = async () => {
    if (busyRef.current) return;
    if (balance < betAmount) {
      showToast('Số dư của bạn không đủ để đặt cược!');
      return;
    }
    busyRef.current = true; setBusy(true);
    try {
      const data = await api('/games/tienlen/deal', {
        token, method: 'POST',
        body: JSON.stringify({bet: betAmount})
      });
      setBalance(data.balance);
      setHandId(data.handId);
      setHeroHand(data.heroHand || []);
      setBotCounts(Object.fromEntries((data.bots || []).map(b => [b.key, b.cardsLeft])));
      setSelectedCardIds(new Set());
      setFoldedPlayers(new Set());
      setTableCombo(null);
      setCurrentTurn(SEAT_OF[data.turn] || 'hero');
      setLastPlayedBy(data.lastPlayedBy || 'Ván mới — bạn ra bài tự do');
      setPhase('playing');
      setTurnTimer(15);
      showToast(`Đã chia bài — cược ${money(betAmount)}`);
    } catch (err) {
      if (err.code === 'HAND_IN_PROGRESS' && err.details) {
        // Có ván dở trên server: vào lại ván đó thay vì mở ván mới
        const a = err.details;
        setHandId(a.handId);
        setBetAmount(a.bet);
        setHeroHand(a.heroHand || []);
        setBotCounts(Object.fromEntries((a.bots || []).map(b => [b.key, b.cardsLeft])));
        setTableCombo(a.table || null);
        setCurrentTurn(SEAT_OF[a.turn] || 'hero');
        setLastPlayedBy(a.lastPlayedBy || '');
        setPhase('playing');
        setTurnTimer(15);
        showToast('Bạn còn ván chưa xong, chơi nốt nhé!');
      } else {
        showToast(err.display || 'Không chia được bài, thử lại nhé!');
      }
    } finally {
      busyRef.current = false; setBusy(false);
    }
  };

  const applySettled = (data) => {
    setBalance(data.balance);
    setHeroHand(data.heroHand || []);
    setBotCounts(Object.fromEntries((data.bots || []).map(b => [b.key, b.cardsLeft])));
    setTableCombo(data.table || null);
    setLastPlayedBy(data.reason || data.lastPlayedBy || 'Ván đã kết thúc');
    setPhase('settled');
    setHandId(null);
    setSelectedCardIds(new Set());
    setFoldedPlayers(new Set());
    if (data.heroWin) {
      playCelebrationAudio('jackpot', soundRef.current);
      triggerFx('jackpot', `TỚI NHẤT! +${money(data.payout || 0)}`, 4500);
      showToast(`🎉 Bạn VỀ NHẤT — nhận ${money(data.payout || 0)}!`, 4000);
    } else {
      triggerFx('diceLose', `${data.reason || 'ĐỐI THỦ VỀ NHẤT'}`, 3000);
      showToast(`💔 ${data.reason || 'Bạn thua ván này'} — mất ${money(data.bet || betAmount)}`, 3600);
    }
  };

  // Animate tuần tự các nước bot rồi áp state cuối cùng từ máy chủ
  const applyPlay = async (data) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try {
      setSelectedCardIds(new Set());
      for (const move of data.moves || []) {
        const seat = SEAT_OF[move.by] || 'hero';
        if (move.pass) {
          setFoldedPlayers(prev => new Set([...prev, seat]));
          setLastPlayedBy(`${move.byName} đã bỏ lượt`);
        } else if (move.combo) {
          setTableCombo(move.combo);
          setFoldedPlayers(prev => {
            const next = new Set(prev);
            next.delete(seat);
            return next;
          });
          if (seat !== 'hero') {
            setBotCounts(prev => ({...prev, [seat]: Math.max(0, (prev[seat] ?? 13) - move.combo.cards.length)}));
          }
          if (move.bonus > 0) {
            setLastPlayedBy(`${move.byName} vừa đánh ${move.combo.label} 🔥 CHẶT +${money(move.bonus)}`);
            playCelebrationAudio('bigWin', soundRef.current);
            triggerFx('bigWin', `🔥 CHẶT HEO/HÀNG +${money(move.bonus)}`, 3000);
          } else {
            setLastPlayedBy(`${move.byName} vừa đánh ${move.combo.label}`);
          }
        } else if (move.newRound) {
          setFoldedPlayers(new Set());
          setTableCombo(null);
          setLastPlayedBy('Vòng mới — người thắng lượt trước ra bài tự do');
        }
        await sleep(850);
      }
      if (data.settled) {
        applySettled(data);
        return;
      }
      setBalance(data.balance);
      setHeroHand(data.heroHand || []);
      setBotCounts(Object.fromEntries((data.bots || []).map(b => [b.key, b.cardsLeft])));
      setTableCombo(data.table || null);
      setCurrentTurn(SEAT_OF[data.turn] || 'hero');
      setLastPlayedBy(data.lastPlayedBy || '');
      setFoldedPlayers(prev => (data.table ? prev : new Set()));
      setTurnTimer(15);
    } finally {
      busyRef.current = false; setBusy(false);
    }
  };

  const sendPlay = async (action, cardIds) => {
    if (busyRef.current || !handId) return;
    busyRef.current = true; setBusy(true);
    try {
      const data = await api('/games/tienlen/play', {
        token, method: 'POST',
        body: JSON.stringify({handId, action, ...(cardIds ? {cardIds} : {})})
      });
      await applyPlay(data);
    } catch (err) {
      if (['HAND_NOT_FOUND', 'HAND_ENDED'].includes(err.code)) {
        showToast('Ván đã kết thúc trên máy chủ, mở ván mới nhé!');
        resetToBetting('Ván đã kết thúc — chọn cược để chơi tiếp');
      } else {
        showToast(err.display || 'Máy chủ từ chối nước đi này.');
      }
    } finally {
      busyRef.current = false; setBusy(false);
    }
  };

  // Card selection toggle
  const toggleSelectCard = (cardId) => {
    setSelectedCardIds(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  // Sorting hand (chỉ sắp xếp hiển thị, không đổi giá trị)
  const handleSort = (mode) => {
    setSortMode(mode);
    setHeroHand(prev => mode === 'suit' ? sortBySuit(prev) : sortByRank(prev));
  };

  // Player Play Hand
  const handlePlay = () => {
    if (currentTurn !== 'hero' || busy) return;
    const selectedCards = heroHand.filter(c => selectedCardIds.has(c.id));
    if (selectedCards.length === 0) {
      showToast('Vui lòng chọn lá bài muốn đánh!');
      return;
    }
    const combo = analyzeCombination(selectedCards);
    if (!combo) {
      showToast('Tổ hợp bài không hợp lệ (không phải Đôi, Sám, Sảnh...)!');
      return;
    }
    if (tableCombo && !canBeat(combo, tableCombo)) {
      showToast('Bài của bạn không đủ lớn để đè bài trên bàn!');
      return;
    }
    sendPlay('play', [...selectedCardIds]);
  };

  // Player Pass Turn
  const handlePass = () => {
    if (currentTurn !== 'hero' || busy) return;
    if (!tableCombo) {
      showToast('Bạn đang có lượt tự do, phải đánh bài!');
      return;
    }
    sendPlay('pass');
  };
  passRef.current = handlePass;

  // Player Hint (Gợi ý — engine local chỉ dùng để gợi ý, kết quả vẫn do server duyệt)
  const handleHint = () => {
    if (currentTurn !== 'hero') return;
    const move = findBestMove(heroHand, tableCombo);
    if (move && move.length > 0) {
      setSelectedCardIds(new Set(move.map(c => c.id)));
      showToast(`Gợi ý: ${move.map(c => c.rank + c.symbol).join(' ')}`);
    } else {
      showToast('Không có bài hợp lệ để đè! Bạn nên Bỏ lượt.');
    }
  };

  // Floating Emojis
  const spawnEmoji = (symbol) => {
    const id = Date.now() + Math.random();
    setFloatingEmojis(prev => [...prev, {id, symbol, left: 50 + (Math.random() * 30 - 15)}]);
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => e.id !== id));
    }, 1800);
  };

  const turnLabel = currentTurn === 'hero'
    ? 'LƯỢT CỦA BẠN'
    : `CHỜ ${SEAT_NAME[currentTurn] || 'ĐỐI THỦ'}...`;
  const canAct = currentTurn === 'hero' && !busy && phase === 'playing';

  return (
    <div className={'screen tlScreen ' + (fx.type ? `fx-${fx.type}` : '')}>
      <ResultFx fx={fx} onDismiss={dismissFx} />
      <Topbar balance={balance} onBack={goHome} sound={sound} setSound={setSound} user={user} />

      <main className="tlMain">
        {/* Table Header Status Bar */}
        <div className="tlHeaderStatus">
          <div className="tlStatusTopRow">
            <div className="tlLiveRoomTag">
              <div className="tlLiveDotWrap">
                <span className="tlPingDot" />
                <span className="tlStaticDot" />
              </div>
              <span className="tlRoomTitle">TIẾN LÊN MIỀN NAM • PHÒNG ĐẠI GIA</span>
            </div>
            <div className="tlTablePill">
              <span className="material-symbols-outlined text-[14px] text-[#ffc174]">table_restaurant</span>
              <span>ĐẠI GIA • CƯỢC {money(betAmount)}</span>
            </div>
          </div>

          <div className="tlStatusBottomRow">
            <div className="tlBetPerCard">
              <span className="material-symbols-outlined text-[15px] text-[#ffb77d]">monetization_on</span>
              <span>Về nhất: <strong className="text-[#dfe2f1] font-semibold">x1.9 tiền cược</strong></span>
            </div>
            <div className="tlRuleTags">
              <span className="tlRuleTag green">Chặt Heo: +50%</span>
              <span className="tlRuleTag gold">Tứ Quý/Hàng: +100%</span>
            </div>
          </div>
        </div>

        {/* Velvet Felt Arena */}
        <div className="tlArenaFelt">
          <div className="tlAmbientGlow" />
          <div className="tlCenterBloom" />

          {/* Top Opponent: ĐạiGia_SàiGòn */}
          <div className="tlTopOpponent">
            <div className="tlOpponentCard">
              <div className="tlOpponentAvatar">
                <img src={OPPONENTS[0].avatar} alt={OPPONENTS[0].name} />
              </div>
              <div className="tlOpponentInfo">
                <div className="tlOpponentNameRow">
                  <span className="tlOpponentName">{OPPONENTS[0].name}</span>
                  <span className="tlVipBadge">{OPPONENTS[0].vip}</span>
                </div>
                <span className="tlOpponentChips">${money(OPPONENTS[0].chips)}</span>
              </div>
              <div className="tlCardsCountBadge">
                <span className="material-symbols-outlined text-[14px] text-[#ffb77d]">playing_cards</span>
                <span>{botCounts.top}</span>
              </div>
            </div>
          </div>

          {/* Middle Row: Left Opponent + Center Table Discard + Right Opponent */}
          <div className="tlMiddleRow">
            {/* Left Opponent: BảoNgọc_VIP */}
            <div className="tlSidePlayer">
              <div className="tlOpponentCard">
                <div className="tlOpponentAvatar">
                  <img src={OPPONENTS[1].avatar} alt={OPPONENTS[1].name} />
                </div>
                <div className="tlOpponentInfo">
                  <span className="tlOpponentName">{OPPONENTS[1].name}</span>
                  <span className="tlOpponentChips">${money(OPPONENTS[1].chips)}</span>
                </div>
              </div>
              <div className="tlCardsCountBadge mt-1">
                <span className="material-symbols-outlined text-[13px] text-[#56e5a9]">style</span>
                <span>{botCounts.left} lá</span>
              </div>
            </div>

            {/* Center Discard Pile & Table Pot */}
            <div className="tlCenterArena">
              <div className="tlPotSummaryBadge">
                <span className="material-symbols-outlined text-[14px] text-[#ffc174]">poker_chip</span>
                <span>Cược ván:</span>
                <span className="tlPotAmount">{money(betAmount)}</span>
              </div>

              {/* Played Cards */}
              <div className="tlPlayedCardsStage">
                <div className="tlPlayedCardsGlow" />
                {tableCombo ? (
                  tableCombo.cards.map((c, i) => (
                    <div
                      key={c.id || i}
                      className={'tlTableCard ' + (i > 0 ? 'overlap' : '')}
                      style={{
                        transform: `rotate(${(i - (tableCombo.cards.length - 1) / 2) * 6}deg)`
                      }}
                    >
                      <div className="tlTableCardBg" />
                      <div className="tlCardCornerTop relative z-10" style={{color: c.color}}>
                        <span className="tlCardRank">{c.rank}</span>
                        <span className="tlCardSuit">{c.symbol}</span>
                      </div>
                      <div className="tlCardCenterSuit relative z-10 drop-shadow" style={{color: c.color}}>
                        {c.symbol}
                      </div>
                      <div className="tlCardCornerBottom relative z-10" style={{color: c.color}}>
                        <span className="tlCardRank">{c.rank}</span>
                        <span className="tlCardSuit">{c.symbol}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-[11px] text-[#a08e7a] py-4 italic">Bàn đang trống · Đánh bất kỳ tổ hợp nào</div>
                )}
              </div>

              <div className="tlPlayedByTag">
                <span className="material-symbols-outlined text-[12px] text-[#ffc174]">local_fire_department</span>
                <span>{lastPlayedBy}</span>
              </div>
            </div>

            {/* Right Opponent: HoàngTửĐỏ */}
            <div className="tlSidePlayer right">
              <div className="tlOpponentCard">
                <div className="tlOpponentInfo text-right">
                  <span className="tlOpponentName">{OPPONENTS[2].name}</span>
                  <span className="tlOpponentChips">${money(OPPONENTS[2].chips)}</span>
                </div>
                <div className="tlOpponentAvatar">
                  <img src={OPPONENTS[2].avatar} alt={OPPONENTS[2].name} />
                </div>
              </div>
              {foldedPlayers.has('right') ? (
                <div className="tlFoldedTag mt-1">
                  <span className="material-symbols-outlined text-[11px]">block</span>
                  <span>Bỏ Vòng</span>
                </div>
              ) : (
                <div className="tlCardsCountBadge mt-1">
                  <span className="material-symbols-outlined text-[13px] text-[#56e5a9]">style</span>
                  <span>{botCounts.right} lá</span>
                </div>
              )}
            </div>
          </div>

          {/* Active Turn Notification Banner */}
          <div className="tlTurnBanner">
            <div className="tlTurnLabelGroup">
              <span className="material-symbols-outlined text-[18px] text-[#ffc174] animate-bounce">timer</span>
              <span className="tlTurnTitle">{phase === 'playing' ? turnLabel : 'SẴN SÀNG CHƠI'}</span>
              <span className="tlTurnRuleHint">
                {phase === 'playing'
                  ? (tableCombo ? `(Cần đè ${tableCombo.label})` : '(Được đánh tự do)')
                  : '(Chọn cược rồi chia bài)'}
              </span>
            </div>

            {/* Golden Timer Ring Micro-Widget */}
            <div className="tlTimerRingWidget">
              <div className="tlTimerCircleBox">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-[#262a35]"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="text-[#ffc174]"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray="100, 100"
                    strokeDashoffset={100 - (turnTimer / 15) * 100}
                    strokeLinecap="round"
                    strokeWidth="4"
                  />
                </svg>
                <span className="tlTimerNum">{turnTimer < 10 ? '0' + turnTimer : turnTimer}</span>
              </div>
              <span className="tlTimerSec">giây</span>
            </div>
          </div>
        </div>

        {/* Player's Hand & Action Console */}
        <div className="tlPlayerHandConsole">
          <div className="tlHandHeader">
            <div className="tlHandCountText">
              <span className="material-symbols-outlined text-[16px] text-[#ffc174]">visibility</span>
              <span>
                {phase === 'playing'
                  ? <>Tay bài: <strong className="text-[#dfe2f1] font-bold">{heroHand.length} lá</strong></>
                  : 'Bài của bạn xuất hiện sau khi chia'}
              </span>
            </div>

            {phase === 'playing' && (
              <div className="tlHandSortGroup">
                <button
                  className={`tlSortBtn ${sortMode === 'combo' ? 'active' : ''}`}
                  onClick={() => handleSort('rank')}
                >
                  Sảnh/Đôi
                </button>
                <button
                  className={`tlSortBtn ${sortMode === 'suit' ? 'active' : ''}`}
                  onClick={() => handleSort('suit')}
                >
                  Theo Chất
                </button>
                <button
                  className={`tlSortBtn ${sortMode === 'rank' ? 'active' : ''}`}
                  onClick={() => handleSort('rank')}
                >
                  Theo Số
                </button>
              </div>
            )}
          </div>

          {/* Interactive Fanned Hand */}
          <div className="tlHandScrollContainer">
            {phase === 'betting' || phase === 'settled' ? (
              <div className="text-[13px] text-[#a08e7a] py-6 text-center italic">
                {phase === 'settled'
                  ? `Ván kết thúc — ${lastPlayedBy}`
                  : 'Chọn mức cược bên dưới rồi bấm CHIA BÀI'}
              </div>
            ) : heroHand.map(card => {
              const isSelected = selectedCardIds.has(card.id);
              const isHeoVip = card.rank === '2' && card.suit === 'diamonds';
              return (
                <div
                  key={card.id}
                  className={`tlHandCard ${isSelected ? 'selected' : ''} ${isHeoVip ? 'heoVip' : ''}`}
                  onClick={() => toggleSelectCard(card.id)}
                >
                  <div className="tlCardCornerTop" style={{color: card.color}}>
                    <div className="flex items-center gap-0.5">
                      <span className="tlCardRank">{card.rank}</span>
                      {card.rank === '2' && <span className="text-[9px] text-[#ffc174]">★</span>}
                    </div>
                    <span className="tlCardSuit">{card.symbol}</span>
                  </div>
                  <div className="tlCardCenterSuit" style={{color: card.color}}>{card.symbol}</div>
                  <div className="tlCardCornerBottom" style={{color: card.color}}>
                    <span className="tlCardRank">{card.rank}</span>
                    <span className="tlCardSuit">{card.symbol}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main Action Controls */}
          {phase === 'playing' ? (
            <div className="tlActionControlsRow">
              <button
                className="tlPassBtn"
                disabled={!canAct}
                onClick={handlePass}
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
                <span>BỎ LƯỢT</span>
              </button>

              <button
                className="tlHintBtn"
                disabled={!canAct}
                onClick={handleHint}
              >
                <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                <span>GỢI Ý</span>
              </button>

              <button
                className="tlPlayBtn"
                disabled={!canAct}
                onClick={handlePlay}
              >
                <span className="material-symbols-outlined text-[20px]">bolt</span>
                <span>ĐÁNH BÀI</span>
              </button>

              {/* Social / Emojis */}
              <div className="tlSocialBtnGroup">
                <button
                  className="tlEmojiBtn text-[#ffb4ab]"
                  title="Thả tim"
                  onClick={() => spawnEmoji('❤️')}
                >
                  <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings: "'FILL' 1"}}>favorite</span>
                </button>
                <button
                  className="tlEmojiBtn text-[#ffc174]"
                  title="Nâng ly"
                  onClick={() => spawnEmoji('🥂')}
                >
                  <span className="material-symbols-outlined text-[20px]">wine_bar</span>
                </button>
              </div>
            </div>
          ) : (
            /* Betting Console: chip tray + deal/new-round button */
            <div className="tlActionControlsRow">
              <div className="flex items-center gap-1.5 flex-1 overflow-x-auto py-1">
                {TL_CHIPS.map(val => (
                  <button
                    key={val}
                    className={`tlSortBtn ${selectedChip === val ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedChip(val);
                      setBetAmount(val);
                    }}
                  >
                    {val >= 1000000 ? val / 1000000 + 'M' : val / 1000 + 'K'}
                  </button>
                ))}
              </div>

              <button
                className="tlPlayBtn"
                disabled={busy}
                onClick={() => phase === 'settled' ? resetToBetting() : handleDeal()}
              >
                <span className="material-symbols-outlined text-[20px]">bolt</span>
                <span>{phase === 'settled' ? 'VÁN MỚI' : `CHIA BÀI (${money(betAmount)})`}</span>
              </button>
            </div>
          )}
        </div>

        {/* Floating Emojis Overlay */}
        {floatingEmojis.map(item => (
          <div
            key={item.id}
            className="tlFloatingEmoji"
            style={{left: `${item.left}%`, bottom: '160px'}}
          >
            {item.symbol}
          </div>
        ))}

        {/* Toast Notification */}
        {toastMsg && (
          <div className="bjToast">
            <span className="material-symbols-outlined text-[#ffc174] text-[18px]">info</span>
            <span>{toastMsg}</span>
          </div>
        )}
      </main>
    </div>
  );
}
