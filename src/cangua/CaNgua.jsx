import React, { useState, useEffect, useRef } from 'react';
import { Topbar } from '../shared/Topbar.jsx';
import { HorseIcon } from './HorseIcon.jsx';
import { PLAYERS, createInitialHorses, playCanguaSound } from './cangua-engine.js';
import './cangua.css';

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

export function CaNgua({ goHome, balance, setBalance, sound = true, setSound, user, onWallet, onProfile }) {
  // Game state
  const [horses, setHorses] = useState(createInitialHorses);
  const [pot, setPot] = useState(4800);
  const [timerVal, setTimerVal] = useState(8);
  const [isAuto, setIsAuto] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(!sound);
  const [dice1, setDice1] = useState(6);
  const [dice2, setDice2] = useState(4);
  const [isRolling, setIsRolling] = useState(false);
  const [selectedHorseId, setSelectedHorseId] = useState('gold_0');
  const [actionLabel, setActionLabel] = useState('XUẤT QUÂN #1');
  const [aiAdviceVisible, setAiAdviceVisible] = useState(true);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [toast, setToast] = useState({ visible: false, icon: '🐎', message: '' });
  const [tickerMsg, setTickerMsg] = useState({
    actor: 'Bạn',
    action: 'vừa ĐÁ NGỰA của',
    target: 'Minh_TrùmVIP',
    amount: '+$200!'
  });

  // Animated Flying Horse (Kick effect)
  const [flyingHorse, setFlyingHorse] = useState(null);
  const [kickBurst, setKickBurst] = useState(null);
  const [kickBounty, setKickBounty] = useState(null);
  const [landingRipple, setLandingRipple] = useState(null);

  // References
  const boardRef = useRef(null);
  const stableSlotsRef = useRef({});
  const trackTilesRef = useRef({});

  // Sync sound prop
  useEffect(() => {
    setIsSoundMuted(!sound);
  }, [sound]);

  // Turn Countdown Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimerVal(prev => {
        if (prev <= 1) {
          if (isAuto) {
            handleAutoTurn();
          }
          return 10;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isAuto]);

  const showToastMsg = (icon, msg) => {
    setToast({ visible: true, icon, message: msg });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 2200);
  };

  const playSoundEffect = (type) => {
    if (!isSoundMuted) {
      playCanguaSound(type, true);
    }
  };

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

  // Perform Kick Animation (Victim piece flies back into their stable slot)
  const triggerKickAnimation = (victimHorse, fromElement, targetSlotIndex = 0) => {
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
    setKickBounty({ x: startX, y: startY - 20, text: '+$200 ĐÁ NGỰA!' });
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

        setPot(p => p + 200);
        if (setBalance) setBalance(b => (b || 12450) + 200);
      }
    };

    requestAnimationFrame(animateArc);
  };

  // Roll Dices in the Center Destination Hub
  const rollDicesAnimation = () => {
    if (isRolling) return;
    setIsRolling(true);
    playSoundEffect('dice');
    showToastMsg('✨', 'Đang thảy xúc xắc Hoàng Gia vào tâm Đích...');

    let shakes = 0;
    const interval = setInterval(() => {
      setDice1(Math.floor(Math.random() * 6) + 1);
      setDice2(Math.floor(Math.random() * 6) + 1);
      shakes++;
      if (shakes > 7) {
        clearInterval(interval);
        const final1 = Math.floor(Math.random() * 6) + 1;
        const final2 = Math.floor(Math.random() * 6) + 1;
        setDice1(final1);
        setDice2(final2);
        setIsRolling(false);
        setActionLabel(final1 === 6 || final2 === 6 || final1 === final2 ? 'XUẤT QUÂN #1' : `TIẾN ${final1 + final2} BƯỚC`);
        if (final1 === 6 || final2 === 6 || final1 === final2) {
          playSoundEffect('win');
          showToastMsg('🎉', `Cặp ${final1}-${final2}! Đủ điều kiện ra quân & thêm lượt!`);
        }
      }
    }, 75);
  };

  // Handle Main Action: Deploy or Move
  const handleMainAction = () => {
    if (actionLabel.startsWith('XUẤT QUÂN')) {
      playSoundEffect('move');
      showToastMsg('🐎', 'Ngựa Vàng số 1 ra quân dũng mãnh!');
      setHorses(prev => {
        const goldHorses = prev.gold.map(h => {
          if (h.id === 'gold_0') {
            return { ...h, status: 'track', pos: 25, step: 1, isReady: false };
          }
          return h;
        });
        return { ...prev, gold: goldHorses };
      });
      setActionLabel('TIẾN 4 BƯỚC');
    } else if (actionLabel.startsWith('TIẾN')) {
      handleTestKick();
    } else {
      rollDicesAnimation();
    }
  };

  // Kick simulation
  const handleTestKick = () => {
    const redHorse = horses.red.find(h => h.status === 'track') || horses.red[2];
    const fromEl = trackTilesRef.current['track_9'] || boardRef.current;
    
    setTickerMsg({
      actor: 'Bạn',
      action: 'vừa ĐÁ BAY NGỰA của',
      target: 'Minh_TrùmVIP',
      amount: '+$200!'
    });
    showToastMsg('💥', 'ĐÁ NGỰA! Ngựa Đỏ bay về chuồng! +$200');

    triggerKickAnimation(
      { player: 'red', id: redHorse.id },
      fromEl,
      0
    );
  };

  const handleAutoTurn = () => {
    rollDicesAnimation();
    setTimeout(() => {
      handleMainAction();
    }, 1000);
  };

  const handleSelectHorse = (id) => {
    setSelectedHorseId(`gold_${id - 1}`);
    showToastMsg('🐎', `Đã chọn Ngựa Chiến #${id} để xuất kích!`);
    setActionLabel(`XUẤT QUÂN NGỰA #${id}`);
  };

  const toggleAutoPlay = () => {
    const nextAuto = !isAuto;
    setIsAuto(nextAuto);
    showToastMsg(nextAuto ? '🤖' : '👤', nextAuto ? 'Đã bật chế độ Tự Động Chiến Thuật' : 'Đã chuyển về chế độ điều khiển thủ công');
  };

  const toggleMute = () => {
    const nextState = !isSoundMuted;
    setIsSoundMuted(nextState);
    if (setSound) setSound(!nextState);
    showToastMsg(nextState ? '🔇' : '🔊', nextState ? 'Đã tắt âm thanh' : 'Đã bật âm thanh sòng bài');
  };

  const sendEmoji = (emoji) => {
    playSoundEffect('move');
    showToastMsg(emoji, `Bạn vừa gửi biểu cảm ${emoji} lên bàn đấu!`);
  };

  // Helper to render pure unnumbered outer track tiles
  const renderTrackTile = (tileNum, ringClass, isStart = false) => {
    const horseOnTile = getHorseAtTrackTile(tileNum);

    return (
      <div
        key={`tile_${tileNum}`}
        ref={el => trackTilesRef.current[`track_${tileNum}`] = el}
        className={`cg-tile ${ringClass} ${isStart ? 'start-gate' : ''} ${horseOnTile ? 'has-horse' : ''}`}
        onClick={() => {
          if (horseOnTile && horseOnTile.player !== 'gold') {
            triggerKickAnimation(horseOnTile, trackTilesRef.current[`track_${tileNum}`], 0);
          }
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
        className={`cg-hr-step ${colorClass} ${horseOnStep ? 'has-horse' : ''}`}
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

  return (
    <div className="cg-screen">
      {/* Topbar navigation */}
      <Topbar
        balance={balance}
        onBack={goHome}
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
            <span className="cg-room-tag">Phòng #999</span>
            <div className="cg-live-ticker-inline">
              <span className="cg-live-dot"></span>
              <span>
                <strong style={{ color: '#56e5a9' }}>{tickerMsg.actor}</strong> {tickerMsg.action}{' '}
                <strong style={{ color: '#ff5252' }}>{tickerMsg.target}</strong> ({tickerMsg.amount})
              </span>
            </div>
          </div>

          <div className="cg-pot-compact">
            <div className="cg-pot-icon-mini">$</div>
            <span className="cg-pot-val-mini">${pot.toLocaleString()}</span>
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
              {/* CHUỒNG ĐỎ (Minh_Trùm) */}
              <div className="cg-stable cg-stable-red">
                <div className="cg-stable-header">
                  <div className="cg-player-tag">
                    <span className="cg-player-dot" style={{ background: '#ff5252' }}></span>
                    <span style={{ color: '#dfe2f1' }}>Minh_Trùm</span>
                  </div>
                  <span style={{ color: '#ffc174' }}>$32.1k</span>
                </div>

                <div className="cg-slots-grid">
                  {horses.red.map((h, idx) => (
                    <div
                      key={h.id}
                      ref={el => stableSlotsRef.current[`red_${idx}`] = el}
                      className={`cg-stable-slot ${h.status === 'stable' ? 'occupied' : ''}`}
                    >
                      {h.status === 'stable' ? (
                        <HorseIcon color="red" size={19} glow={false} />
                      ) : (
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,82,82,0.3)' }} />
                      )}
                    </div>
                  ))}
                </div>
                <span className="cg-stable-name" style={{ color: '#ff5252' }}>Chuồng Đỏ</span>
              </div>

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

              {/* CHUỒNG XANH LÁ (Sơn_ĐạiGia) */}
              <div className="cg-stable cg-stable-green">
                <div className="cg-stable-header">
                  <div className="cg-player-tag">
                    <span className="cg-player-dot" style={{ background: '#56e5a9' }}></span>
                    <span style={{ color: '#dfe2f1' }}>Sơn_ĐạiGia</span>
                  </div>
                  <span style={{ color: '#ffc174' }}>$45.0k</span>
                </div>

                <div className="cg-slots-grid">
                  {horses.green.map((h, idx) => (
                    <div
                      key={h.id}
                      ref={el => stableSlotsRef.current[`green_${idx}`] = el}
                      className={`cg-stable-slot ${h.status === 'stable' ? 'occupied' : ''}`}
                    >
                      {h.status === 'stable' ? (
                        <HorseIcon color="green" size={19} glow={false} />
                      ) : (
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(86,229,169,0.3)' }} />
                      )}
                    </div>
                  ))}
                </div>
                <span className="cg-stable-name" style={{ color: '#56e5a9' }}>Chuồng Xanh Lá</span>
              </div>
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
                className={`cg-trophy-hub ${isRolling ? 'is-rolling' : 'ready-to-roll'}`}
                onClick={rollDicesAnimation}
                title="Bấm vào tâm bàn cờ để THẢY XÚC XẮC"
              >
                <div className="cg-trophy-hub-inner">
                  {/* Pair of 3D Dice Rolling in the Center */}
                  <div className="cg-center-dice-stage">
                    <div className={`cg-center-die ruby ${isRolling ? 'rolling-1' : ''}`}>
                      {renderDicePips(dice1, 'ruby')}
                    </div>
                    <div className={`cg-center-die amber ${isRolling ? 'rolling-2' : ''}`}>
                      {renderDicePips(dice2, 'amber')}
                    </div>
                  </div>

                  {/* Clean Center Sum */}
                  <span className="cg-center-sum-label">
                    {isRolling ? '...' : `Tổng: ${dice1 + dice2}`}
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
              {/* CHUỒNG LAM (Kim_Kim99) */}
              <div className="cg-stable cg-stable-blue">
                <div className="cg-stable-header">
                  <div className="cg-player-tag">
                    <span className="cg-player-dot" style={{ background: '#60a5fa' }}></span>
                    <span style={{ color: '#dfe2f1' }}>Kim_Kim99</span>
                  </div>
                  <span style={{ color: '#ffc174' }}>$18.4k</span>
                </div>

                <div className="cg-slots-grid">
                  {horses.blue.map((h, idx) => (
                    <div
                      key={h.id}
                      ref={el => stableSlotsRef.current[`blue_${idx}`] = el}
                      className={`cg-stable-slot ${h.status === 'stable' ? 'occupied' : ''}`}
                    >
                      {h.status === 'stable' ? (
                        <HorseIcon color="blue" size={19} glow={false} />
                      ) : h.status === 'finished' ? (
                        <span style={{ fontSize: 11, color: '#ffc174' }}>🏆</span>
                      ) : (
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(96,165,250,0.3)' }} />
                      )}
                    </div>
                  ))}
                </div>
                <span className="cg-stable-name" style={{ color: '#60a5fa' }}>Chuồng Lam</span>
              </div>

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

              {/* CHUỒNG VÀNG (BẠN VIP) */}
              <div className="cg-stable cg-stable-gold">
                <div className="cg-stable-header">
                  <div className="cg-player-tag">
                    <span className="cg-player-dot" style={{ background: '#ffc174' }}></span>
                    <strong style={{ color: '#ffc174' }}>BẠN (VIP)</strong>
                  </div>
                  <span style={{ color: '#ffc174', fontWeight: 800 }}>${(balance || user?.balance || 12450).toLocaleString()}</span>
                </div>

                <div className="cg-slots-grid">
                  {horses.gold.map((h, idx) => (
                    <div
                      key={h.id}
                      ref={el => stableSlotsRef.current[`gold_${idx}`] = el}
                      onClick={() => handleSelectHorse(idx + 1)}
                      className={`cg-stable-slot ${h.status === 'stable' ? 'occupied' : ''} ${h.isReady ? 'ready' : ''}`}
                      title={h.status === 'stable' ? `Chọn Ngựa Chiến #${idx + 1}` : 'Đang thi đấu'}
                    >
                      {h.status === 'stable' ? (
                        <>
                          <HorseIcon color="gold" size={20} glow={h.isReady} animated={h.isReady} />
                          {h.isReady && (
                            <span style={{
                              position: 'absolute', top: -3, right: -3,
                              background: '#56e5a9', color: '#002113',
                              fontSize: 6.5, fontWeight: 900, padding: '1px 2px', borderRadius: 4
                            }}>
                              SẴN
                            </span>
                          )}
                        </>
                      ) : (
                        <span style={{ color: '#56e5a9', fontWeight: 800, fontSize: 11 }}>✓</span>
                      )}
                    </div>
                  ))}
                </div>
                <span className="cg-stable-name" style={{ color: '#ffc174' }}>Chuồng Vàng (Bạn)</span>
              </div>
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
                  borderColor: landingRipple.color === 'red' ? '#ff5252' : '#56e5a9'
                }}
              />
            )}
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
                    strokeDasharray={`${(timerVal / 10) * 100}, 100`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 1s linear' }}
                  />
                </svg>
                <span className="cg-timer-num">{timerVal < 10 ? `0${timerVal}` : timerVal}</span>
              </div>
              <div className="cg-turn-texts">
                <span className="cg-turn-title">LƯỢT CỦA BẠN</span>
                <span className="cg-turn-sub">Đi {dice1 + dice2} bước • Nhấn ô sáng hoặc Ra quân</span>
              </div>
            </div>

            <button className="cg-action-btn-main" onClick={handleMainAction}>
              <span>▶</span>
              <span>{actionLabel}</span>
            </button>
          </div>

          {/* Quick Tooling & Micro-Emotes Bar */}
          <div className="cg-deck-footer">
            <div className="cg-deck-pills">
              <button
                className={`cg-pill-btn ${isAuto ? 'active' : ''}`}
                onClick={toggleAutoPlay}
                title="Bật/Tắt tự động đánh"
              >
                <span>🤖</span>
                <span>Auto</span>
              </button>
              <div className="cg-deck-emotes">
                <button className="cg-emote-mini" onClick={() => sendEmoji('🐎')} title="Thả Ngựa Hí">🐎</button>
                <button className="cg-emote-mini" onClick={() => sendEmoji('🍷')} title="Mời Rượu">🍷</button>
                <button className="cg-emote-mini" onClick={() => sendEmoji('🎲')} title="Xí Ngầu May Mắn">🎲</button>
                <button className="cg-emote-mini" onClick={() => sendEmoji('💰')} title="Túi Tiền">💰</button>
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
                <p>• <strong>Đường đi chung:</strong> Các ô cờ tròn viền màu chạy quanh 4 cánh (không đánh số).</p>
                <p>• <strong>Cửa ra quân:</strong> Ô tiếp đất viền dày có cờ / sao cạnh chuồng.</p>
                <p>• <strong>Chuồng về đích:</strong> 4 dãy bậc thang đánh số <strong style={{ color: '#ffc174' }}>1 đến 6</strong> dẫn vào tâm.</p>
                <p>• <strong>Đá ngựa:</strong> Đi vào ô đối phương đứng để <strong style={{ color: '#ff5252' }}>ĐÁ BAY</strong> về chuồng và nhận <strong style={{ color: '#ffc174' }}>+$200</strong>!</p>
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
