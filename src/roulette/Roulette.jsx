import {useEffect, useRef, useState} from 'react';
import {Dices, Play, Redo, RotateCcw, Trash2, Zap} from 'lucide-react';
import {ResultFx} from '../shared/ResultFx.jsx';
import {Topbar} from '../shared/Topbar.jsx';
import {playCelebrationAudio} from '../shared/audio.js';
import {money} from '../shared/format.js';
import {useGameFx} from '../shared/hooks.js';
import {
  CHIP_PRESETS,
  RED_NUMBERS,
  ROW_1,
  ROW_2,
  ROW_3,
  WHEEL_SEQUENCE,
  calculatePayout,
  getNumberColor
} from './roulette-data.js';
import './roulette.css';

export function Roulette({goHome, balance, setBalance, sound, setSound, token}) {
  const [fx, triggerFx, dismissFx] = useGameFx();
  const [selectedChip, setSelectedChip] = useState(10000);
  const [bets, setBets] = useState({});
  const [betHistory, setBetHistory] = useState([]);
  const [lastBets, setLastBets] = useState({});
  const [spinning, setSpinning] = useState(false);
  const [winningNumber, setWinningNumber] = useState(null);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [recentNumbers, setRecentNumbers] = useState([17, 32, 0, 8, 29]);
  const [feedback, setFeedback] = useState('Chọn phỉnh cược và chạm vào các ô trên bàn');

  const soundRef = useRef(sound);
  useEffect(() => { soundRef.current = sound; }, [sound]);

  const totalBetAmount = Object.values(bets).reduce((a, b) => a + b, 0);

  // Place bet on a cell / target
  const handlePlaceBet = (target) => {
    if (spinning) return;
    if (balance < selectedChip) {
      setFeedback('Số dư không đủ để đặt thêm cược!');
      return;
    }

    setBalance(b => b - selectedChip);
    setBets(curr => {
      const next = { ...curr, [target]: (curr[target] || 0) + selectedChip };
      return next;
    });
    setBetHistory(h => [...h, { target, amount: selectedChip }]);
    setFeedback(`Đã đặt ${money(selectedChip)} vào ô [${target}]`);
  };

  // Undo last bet
  const handleUndo = () => {
    if (spinning || betHistory.length === 0) return;
    const last = betHistory[betHistory.length - 1];
    setBalance(b => b + last.amount);
    setBets(curr => {
      const next = { ...curr };
      const rem = (next[last.target] || 0) - last.amount;
      if (rem <= 0) delete next[last.target];
      else next[last.target] = rem;
      return next;
    });
    setBetHistory(h => h.slice(0, -1));
    setFeedback(`Đã hoàn tác cược ô [${last.target}]`);
  };

  // Clear all bets
  const handleClear = () => {
    if (spinning || totalBetAmount === 0) return;
    setBalance(b => b + totalBetAmount);
    setBets({});
    setBetHistory([]);
    setFeedback('Đã xóa tất cả cược trên bàn.');
  };

  // Repeat previous bets
  const handleRepeat = () => {
    if (spinning || Object.keys(lastBets).length === 0) return;
    const cost = Object.values(lastBets).reduce((a, b) => a + b, 0);
    if (balance < cost) {
      setFeedback('Số dư không đủ để lặp lại ván cược trước!');
      return;
    }
    setBalance(b => b - cost);
    setBets({ ...lastBets });
    setFeedback(`Đã lặp lại cược trước: ${money(cost)}`);
  };

  // 2X Double all current bets
  const handleDouble = () => {
    if (spinning || totalBetAmount === 0) return;
    if (balance < totalBetAmount) {
      setFeedback('Số dư không đủ để nhân đôi cược!');
      return;
    }
    setBalance(b => b - totalBetAmount);
    setBets(curr => {
      const doubled = {};
      for (const [k, v] of Object.entries(curr)) {
        doubled[k] = v * 2;
      }
      return doubled;
    });
    setFeedback(`Đã nhân đôi tất cả các ô cược!`);
  };

  // Spin the Roulette wheel
  const handleSpin = () => {
    if (spinning || totalBetAmount === 0) {
      if (totalBetAmount === 0) setFeedback('Vui lòng đặt cược trước khi quay!');
      return;
    }

    setSpinning(true);
    setLastBets({ ...bets });
    setFeedback('Vòng quay đang quay... Chúc bạn may mắn!');

    // Random winner from 0 to 36
    const outcome = Math.floor(Math.random() * 37);
    const pocketIndex = WHEEL_SEQUENCE.indexOf(outcome);
    const pocketDegrees = pocketIndex * (360 / 37);
    
    // Smooth multi-revolution spin
    const targetRotation = wheelRotation + 1440 + pocketDegrees;
    setWheelRotation(targetRotation);

    setTimeout(() => {
      setWinningNumber(outcome);
      setSpinning(false);
      setRecentNumbers(r => [outcome, ...r.slice(0, 4)]);

      const winPayout = calculatePayout(bets, outcome);
      const color = getNumberColor(outcome);
      const colorText = color === 'green' ? 'XANH LÁ' : color === 'red' ? 'ĐỎ' : 'ĐEN';

      if (winPayout > 0) {
        setBalance(b => b + winPayout);
        playCelebrationAudio('jackpot', soundRef.current);
        triggerFx('jackpot', `+${money(winPayout)}`, 4500);
        setFeedback(`🎉 KẾT QUẢ: SỐ ${outcome} (${colorText}) · THẮNG +${money(winPayout)}!`);
      } else {
        triggerFx('diceLose', `SỐ ${outcome} (${colorText})`, 2200);
        setFeedback(`KẾT QUẢ: SỐ ${outcome} (${colorText}) · Chúc bạn may mắn lần sau!`);
      }

      setBets({});
      setBetHistory([]);
    }, 3800);
  };

  return (
    <div className={'screen rouletteScreen ' + (fx.type ? `fx-${fx.type}` : '')}>
      <ResultFx fx={fx} onDismiss={dismissFx} />
      <Topbar balance={balance} onBack={goHome} sound={sound} setSound={setSound} />

      <main className="rouletteBody">
        {/* Top 3D Wheel Showcase Card */}
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

            <div className={`tableStatusBadge ${spinning ? 'spinning' : ''}`}>
              <span className="livePulseDot" />
              <span>{spinning ? 'ĐANG QUAY...' : 'BÀN MỞ CƯỢC'}</span>
            </div>
          </div>

          {/* 3D Circular Wheel Visual Stage */}
          <div className="wheelVisualStage">
            <div className="outerRimGold">
              <div
                className="rotatingWheelDisc"
                style={{
                  transform: `rotate(${wheelRotation}deg)`
                }}
              />
            </div>

            {/* Central Winner Readout */}
            <div className="centerWheelBadge">
              <span className="centerStatusLabel">
                {spinning ? 'QUAY...' : winningNumber !== null ? 'KẾT QUẢ' : 'CHÂU ÂU'}
              </span>
              <span className="centerNumberBig">
                {spinning ? '...' : winningNumber !== null ? winningNumber : '37 Ô'}
              </span>
            </div>
          </div>

          {/* Payout Feedback Ticker */}
          <div className="payoutFeedbackTicker">
            {feedback}
          </div>
        </div>

        {/* Interactive Betting Table Grid */}
        <div className="rouletteGridCard">
          <div className="tableNumbersGrid">
            {/* Zero (0) Box */}
            <button
              className="zeroButton"
              onClick={() => handlePlaceBet('0')}
              disabled={spinning}
            >
              <span>0</span>
              {bets['0'] > 0 && (
                <span className="cellBetChipBadge">{money(bets['0'])}</span>
              )}
            </button>

            {/* Numbers 1-36 in 3 Rows */}
            <div className="numbersColsArea">
              {/* Row 3: 3, 6, 9 ... 36 */}
              <div className="numRow">
                {ROW_3.map(num => (
                  <button
                    key={num}
                    className={`rouletteCellBtn ${RED_NUMBERS.includes(num) ? 'red' : 'black'}`}
                    onClick={() => handlePlaceBet(num)}
                    disabled={spinning}
                  >
                    <span>{num}</span>
                    {bets[num] > 0 && (
                      <span className="cellBetChipBadge">{money(bets[num])}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Row 2: 2, 5, 8 ... 35 */}
              <div className="numRow">
                {ROW_2.map(num => (
                  <button
                    key={num}
                    className={`rouletteCellBtn ${RED_NUMBERS.includes(num) ? 'red' : 'black'}`}
                    onClick={() => handlePlaceBet(num)}
                    disabled={spinning}
                  >
                    <span>{num}</span>
                    {bets[num] > 0 && (
                      <span className="cellBetChipBadge">{money(bets[num])}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Row 1: 1, 4, 7 ... 34 */}
              <div className="numRow">
                {ROW_1.map(num => (
                  <button
                    key={num}
                    className={`rouletteCellBtn ${RED_NUMBERS.includes(num) ? 'red' : 'black'}`}
                    onClick={() => handlePlaceBet(num)}
                    disabled={spinning}
                  >
                    <span>{num}</span>
                    {bets[num] > 0 && (
                      <span className="cellBetChipBadge">{money(bets[num])}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dozens Bets (1st 12, 2nd 12, 3rd 12) */}
          <div className="dozensRow">
            {['1st 12', '2nd 12', '3rd 12'].map(dozen => (
              <button
                key={dozen}
                className="outsideBetBtn"
                onClick={() => handlePlaceBet(dozen)}
                disabled={spinning}
              >
                <span>{dozen}</span>
                {bets[dozen] > 0 && (
                  <span className="cellBetChipBadge">{money(bets[dozen])}</span>
                )}
              </button>
            ))}
          </div>

          {/* Outside Bets (1-18, EVEN, RED, BLACK, ODD, 19-36) */}
          <div className="outsideRow">
            {['1-18', 'EVEN', 'RED', 'BLACK', 'ODD', '19-36'].map(outside => (
              <button
                key={outside}
                className={`outsideBetBtn ${outside === 'RED' ? 'redBox' : outside === 'BLACK' ? 'blackBox' : ''}`}
                onClick={() => handlePlaceBet(outside)}
                disabled={spinning}
              >
                <span>{outside}</span>
                {bets[outside] > 0 && (
                  <span className="cellBetChipBadge">{money(bets[outside])}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chip Denomination Selector */}
        <div className="rouletteChipBar">
          {CHIP_PRESETS.map(chip => (
            <button
              key={chip.value}
              className={`chipSelectBtn ${selectedChip === chip.value ? 'active' : ''}`}
              style={{
                background: `radial-gradient(circle, ${chip.color}, #111)`,
                borderColor: chip.border,
                color: '#fff'
              }}
              onClick={() => setSelectedChip(chip.value)}
              disabled={spinning}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Action Controls Bar (Undo, Clear, Repeat, 2X, Spin) */}
        <div className="rouletteControlsGrid">
          <button
            className="rltActBtn"
            onClick={handleUndo}
            disabled={spinning || betHistory.length === 0}
            title="Hoàn tác cược vừa đặt"
          >
            <RotateCcw />
            <span>Undo</span>
          </button>

          <button
            className="rltActBtn"
            onClick={handleClear}
            disabled={spinning || totalBetAmount === 0}
            title="Xóa tất cả cược"
          >
            <Trash2 />
            <span>Clear</span>
          </button>

          <button
            className="rltActBtn"
            onClick={handleRepeat}
            disabled={spinning || Object.keys(lastBets).length === 0}
            title="Cược lại ván trước"
          >
            <Redo />
            <span>Repeat</span>
          </button>

          <button
            className="rltActBtn"
            onClick={handleDouble}
            disabled={spinning || totalBetAmount === 0}
            title="Nhân đôi tất cả cược"
          >
            <Zap />
            <span>2X</span>
          </button>

          <button
            className="rltActBtn spinBtnRlt"
            onClick={handleSpin}
            disabled={spinning || totalBetAmount === 0}
            title="Bắt đầu quay Roulette"
          >
            <Play />
            <span>{spinning ? 'QUAY...' : 'QUAY'}</span>
          </button>
        </div>
      </main>
    </div>
  );
}
