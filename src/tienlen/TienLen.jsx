import {useEffect, useRef, useState} from 'react';
import {Topbar} from '../shared/Topbar.jsx';
import {ResultFx} from '../shared/ResultFx.jsx';
import {useGameFx} from '../shared/hooks.js';
import {playCelebrationAudio} from '../shared/audio.js';
import {money} from '../shared/format.js';
import {
  analyzeCombination,
  canBeat,
  deal4Players,
  findBestMove,
  sortByRank,
  sortBySuit
} from './tienlen-engine.js';
import './tienlen.css';

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

export function TienLen({goHome, balance, setBalance, sound, setSound, user}) {
  const [fx, triggerFx, dismissFx] = useGameFx();
  const [betPerCard] = useState(10000);
  const [sortMode, setSortMode] = useState('rank'); // 'rank', 'suit', 'combo'
  const [heroHand, setHeroHand] = useState([]);
  const [botHands, setBotHands] = useState({ top: [], left: [], right: [] });
  const [selectedCardIds, setSelectedCardIds] = useState(new Set());
  const [currentTurn, setCurrentTurn] = useState('hero'); // 'hero', 'right', 'top', 'left'
  const [foldedPlayers, setFoldedPlayers] = useState(new Set());
  const [tableCombo, setTableCombo] = useState(null);
  const [lastPlayedBy, setLastPlayedBy] = useState('BảoNgọc_VIP vừa đánh Đôi Heo');
  const [pot, setPot] = useState(120000);
  const [roundNo, setRoundNo] = useState(4);
  const [turnTimer, setTurnTimer] = useState(14);
  const [toastMsg, setToastMsg] = useState('');
  const [floatingEmojis, setFloatingEmojis] = useState([]);

  const soundRef = useRef(sound);
  useEffect(() => { soundRef.current = sound; }, [sound]);

  // Initial Deal
  const initGame = () => {
    const hands = deal4Players();
    setHeroHand(hands.hero);
    setBotHands({
      top: hands.bot2,
      left: hands.bot3,
      right: hands.bot1
    });
    setSelectedCardIds(new Set());
    setFoldedPlayers(new Set());
    // Initial display table combo (Đôi Heo 2♥ 2♠)
    const initial2Heart = { id: '2-hearts', rank: '2', rankOrder: 12, suit: 'hearts', symbol: '♥', color: '#ffb4ab', isRed: true, score: 51 };
    const initial2Spade = { id: '2-spades', rank: '2', rankOrder: 12, suit: 'spades', symbol: '♠', color: '#dfe2f1', isRed: false, score: 48 };
    setTableCombo({
      type: 'PAIR',
      cards: [initial2Heart, initial2Spade],
      highestCard: initial2Heart,
      label: 'Đôi Heo',
      length: 2
    });
    setCurrentTurn('hero');
    setTurnTimer(14);
  };

  useEffect(() => {
    initGame();
  }, []);

  // Timer countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTurnTimer(t => {
        if (t <= 1) {
          if (currentTurn === 'hero') {
            handlePass();
          }
          return 15;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentTurn]);

  // Bot turns AI simulation
  useEffect(() => {
    if (currentTurn === 'hero') return;

    const timer = setTimeout(() => {
      const botKey = currentTurn;
      const botHand = botHands[botKey] || [];

      // If bot is already folded in this trick
      if (foldedPlayers.has(botKey)) {
        nextTurn(botKey);
        return;
      }

      // Find move
      const move = findBestMove(botHand, tableCombo);
      if (move && move.length > 0) {
        const combo = analyzeCombination(move);
        const remaining = botHand.filter(c => !move.some(m => m.id === c.id));
        setBotHands(prev => ({ ...prev, [botKey]: remaining }));
        setTableCombo(combo);
        const botName = OPPONENTS.find(o => o.id === botKey)?.name || 'Người chơi';
        setLastPlayedBy(`${botName} vừa đánh ${combo.label}`);
        setPot(p => p + 10000);

        if (remaining.length === 0) {
          // Bot won
          triggerFx('diceLose', `${botName.toUpperCase()} ĐÃ VỀ NHẤT!`, 3000);
          setTimeout(initGame, 4000);
          return;
        }
      } else {
        // Bot passes
        setFoldedPlayers(prev => new Set([...prev, botKey]));
        const botName = OPPONENTS.find(o => o.id === botKey)?.name || 'Người chơi';
        setLastPlayedBy(`${botName} đã bỏ lượt`);
      }

      nextTurn(botKey);
    }, 1200);

    return () => clearTimeout(timer);
  }, [currentTurn, tableCombo, foldedPlayers, botHands]);

  const nextTurn = (curr) => {
    const turnOrder = ['hero', 'right', 'top', 'left'];
    const idx = turnOrder.indexOf(curr);
    const nextPlayer = turnOrder[(idx + 1) % 4];

    // Check if 3 players have folded -> clear trick and start free turn
    const activeFolded = new Set(foldedPlayers);
    if (activeFolded.size >= 3) {
      setFoldedPlayers(new Set());
      setTableCombo(null);
      setLastPlayedBy('Vòng mới: Người thắng lượt trước được quyền ra bài');
      // Winner of previous trick gets turn
      setCurrentTurn(curr);
    } else {
      setCurrentTurn(nextPlayer);
    }
    setTurnTimer(15);
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

  // Sorting hand
  const handleSort = (mode) => {
    setSortMode(mode);
    if (mode === 'suit') {
      setHeroHand(prev => sortBySuit(prev));
    } else {
      setHeroHand(prev => sortByRank(prev));
    }
  };

  // Player Play Hand
  const handlePlay = () => {
    if (currentTurn !== 'hero') return;
    const selectedCards = heroHand.filter(c => selectedCardIds.has(c.id));
    if (selectedCards.length === 0) {
      setToastMsg('Vui lòng chọn lá bài muốn đánh!');
      return;
    }

    const combo = analyzeCombination(selectedCards);
    if (!combo) {
      setToastMsg('Tổ hợp bài không hợp lệ (không phải Đôi, Sám, Sảnh...)!');
      return;
    }

    if (tableCombo && !canBeat(combo, tableCombo)) {
      setToastMsg('Bài của bạn không đủ lớn để đè bài trên bàn!');
      return;
    }

    // Valid play!
    const remaining = heroHand.filter(c => !selectedCardIds.has(c.id));
    setHeroHand(remaining);
    setSelectedCardIds(new Set());
    setTableCombo(combo);
    setLastPlayedBy(`Bạn vừa đánh ${combo.label}`);
    setPot(p => p + 20000);

    // Check if player won
    if (remaining.length === 0) {
      const winPayout = pot + betPerCard * (botHands.top.length + botHands.left.length + botHands.right.length);
      setBalance(b => b + winPayout);
      playCelebrationAudio('jackpot', soundRef.current);
      triggerFx('jackpot', `+${money(winPayout)}`, 4500);
      setToastMsg(`🎉 BẠN ĐÃ TỚI NHẤT! NHẬN +${money(winPayout)}!`);
      setTimeout(initGame, 5000);
      return;
    }

    // Special chop celebration
    if (combo.type === 'FOUR_OF_A_KIND' || combo.type === 'FOUR_PAIRS_PINE' || (tableCombo?.highestCard?.rank === '2' && combo.type !== 'SINGLE')) {
      playCelebrationAudio('bigWin', soundRef.current);
      triggerFx('bigWin', '🔥 CHẶT HEO / CHẶT HÀNG! +50.000', 3000);
      setBalance(b => b + 50000);
    }

    nextTurn('hero');
  };

  // Player Pass Turn
  const handlePass = () => {
    if (currentTurn !== 'hero') return;
    if (!tableCombo) {
      setToastMsg('Bạn đang có lượt tự do, không thể bỏ lượt!');
      return;
    }
    setFoldedPlayers(prev => new Set([...prev, 'hero']));
    setLastPlayedBy('Bạn đã bỏ lượt');
    setSelectedCardIds(new Set());
    nextTurn('hero');
  };

  // Player Hint (Gợi ý)
  const handleHint = () => {
    const move = findBestMove(heroHand, tableCombo);
    if (move && move.length > 0) {
      setSelectedCardIds(new Set(move.map(c => c.id)));
      setToastMsg(`Gợi ý: ${move.map(c => c.rank + c.symbol).join(' ')}`);
    } else {
      setToastMsg('Không có bài hợp lệ để đè! Bạn nên Bỏ lượt.');
    }
  };

  // Floating Emojis
  const spawnEmoji = (symbol) => {
    const id = Date.now() + Math.random();
    setFloatingEmojis(prev => [...prev, { id, symbol, left: 50 + (Math.random() * 30 - 15) }]);
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => e.id !== id));
    }, 1800);
  };

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
              <span>BÀN #888 • VÁN {roundNo}/10</span>
            </div>
          </div>

          <div className="tlStatusBottomRow">
            <div className="tlBetPerCard">
              <span className="material-symbols-outlined text-[15px] text-[#ffb77d]">monetization_on</span>
              <span>Cược: <strong className="text-[#dfe2f1] font-semibold">{money(betPerCard)}/lá</strong></span>
            </div>
            <div className="tlRuleTags">
              <span className="tlRuleTag green">Chặt Heo: x2</span>
              <span className="tlRuleTag gold">Tứ Quý: x4</span>
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
                <span>{botHands.top.length}</span>
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
                <span>{botHands.left.length} lá</span>
              </div>
            </div>

            {/* Center Discard Pile & Table Pot */}
            <div className="tlCenterArena">
              <div className="tlPotSummaryBadge">
                <span className="material-symbols-outlined text-[14px] text-[#ffc174]">poker_chip</span>
                <span>Hũ ván:</span>
                <span className="tlPotAmount">{money(pot)}</span>
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
                  <span>{botHands.right.length} lá</span>
                </div>
              )}
            </div>
          </div>

          {/* Active Turn Notification Banner */}
          <div className="tlTurnBanner">
            <div className="tlTurnLabelGroup">
              <span className="material-symbols-outlined text-[18px] text-[#ffc174] animate-bounce">timer</span>
              <span className="tlTurnTitle">{currentTurn === 'hero' ? 'LƯỢT CỦA BẠN' : 'CHỜ ĐỐI THỦ...'}</span>
              <span className="tlTurnRuleHint">
                {tableCombo ? `(Cần đè ${tableCombo.label})` : '(Được đánh tự do)'}
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
              <span>Tay bài: <strong className="text-[#dfe2f1] font-bold">{heroHand.length} lá</strong></span>
            </div>

            <div className="tlHandSortGroup">
              <button
                className={`tlSortBtn ${sortMode === 'combo' ? 'active' : ''}`}
                onClick={() => handleSort('combo')}
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
          </div>

          {/* Interactive Fanned Hand */}
          <div className="tlHandScrollContainer">
            {heroHand.map(card => {
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
          <div className="tlActionControlsRow">
            <button
              className="tlPassBtn"
              disabled={currentTurn !== 'hero'}
              onClick={handlePass}
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
              <span>BỎ LƯỢT</span>
            </button>

            <button
              className="tlHintBtn"
              disabled={currentTurn !== 'hero'}
              onClick={handleHint}
            >
              <span className="material-symbols-outlined text-[18px]">lightbulb</span>
              <span>GỢI Ý</span>
            </button>

            <button
              className="tlPlayBtn"
              disabled={currentTurn !== 'hero'}
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
