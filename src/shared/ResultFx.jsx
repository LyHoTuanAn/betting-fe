import {fxAshEmbers, fxCoinRainDoF, fxConfettiAll, fxFireworks, fxFountainCoins, fxSparkles, fxVoidShards} from './fx-data.js';

export function ResultFx({fx,onDismiss,...rest}){
 const fxData = fx || rest;
 if(!fxData?.type)return null;
 const win=['win','smallWin','bigWin','jackpot','diceWin','fishWin','combo','bossWin'].includes(fxData.type);
 const isJackpot=fxData.type==='jackpot';
 const isBigWin=fxData.type==='bigWin';
 const isBossWin=fxData.type==='bossWin';
 const isCombo=fxData.type==='combo';
 const isDiceWin=fxData.type==='diceWin';
 const isFishWin=fxData.type==='fishWin';
 const lose=['lose','diceLose'].includes(fxData.type);

 let mainTitle = 'VICTORY';
 let subTitle = 'CHIẾN THẮNG RỰC RỠ';
 let themeClass = 'slotTheme';

 if(isJackpot){
  mainTitle = 'GRAND JACKPOT';
  subTitle = 'NỔ HŨ HOÀNG KIM CỰC ĐẠI';
  themeClass = 'slotTheme isJackpot';
 }else if(isBigWin){
  mainTitle = 'BIG WIN';
  subTitle = 'THẮNG LỚN SIÊU CẤP';
  themeClass = 'slotTheme isBigWin';
 }else if(isBossWin){
  mainTitle = 'BÁ CHỦ ĐẠI DƯƠNG';
  subTitle = 'HẠ GỤC THỦY QUÁI HUYỀN THOẠI';
  themeClass = 'fishTheme isBossWin';
 }else if(isCombo){
  mainTitle = 'SUPER COMBO';
  subTitle = 'LIÊN HOÀN TRÚNG ĐÍCH';
  themeClass = 'fishTheme isCombo';
 }else if(isDiceWin){
  mainTitle = 'ĐẠI THẮNG TÀI XỈU';
  subTitle = 'DỰ ĐOÁN CHÍNH XÁC';
  themeClass = 'diceTheme';
 }else if(isFishWin){
  mainTitle = 'VICTORY';
  subTitle = 'SĂN CÁ THÀNH CÔNG';
  themeClass = 'fishTheme';
 }else if(lose){
  mainTitle = fx.text === 'TRƯỢT' ? 'TRƯỢT CƯỢC' : 'DEFEAT';
  subTitle = 'CHƯA MAY MẮN · THỬ LẠI NGAY';
  themeClass = 'loseTheme';
 }

 return (
  <div
   className={`resultFx ${fx.type} ${win ? 'isWinFx' : 'isLoseFx'} ${themeClass}`}
   key={fx.key}
   onClick={onDismiss}
   role="button"
   tabIndex={0}
   style={{'--fx-dur': `${(fx.dur || 3500) / 1000}s`}}
  >
   {/* ======================= VICTORY SHOWCASE ======================= */}
   {win && (
    <>
     <div className="victoryVeil" />
     <div className="winSunburst" />
     <div className="winHaloGlow" />

     {/* Sóng xung kích hình vòng tròn vàng kim */}
     <div className="shockwaveContainer">
      <div className="shockwaveRing r1" />
      <div className="shockwaveRing r2" />
      <div className="shockwaveRing r3" />
     </div>

     {/* Pháo hoa rực rỡ nhiều màu sắc nổ nền sau */}
     <div className="fireworksContainer">
      {fxFireworks.map(fw => (
       <div
        key={fw.id}
        className="fireworkBurst"
        style={{
         left: `${fw.left}%`,
         top: `${fw.top}%`,
         animationDelay: `${fw.delay}s`,
         '--fw-color': fw.colorScheme,
         transform: `scale(${fw.scale})`
        }}
       >
        {Array.from({length: 12}, (_, k) => (
         <span key={k} className="fireworkSpur" style={{'--angle': `${k * 30}deg`}} />
        ))}
       </div>
      ))}
     </div>

     {/* Đài phun tiền vàng 3D bắn vút từ dưới màn hình */}
     <div className="coinFountainContainer">
      {fxFountainCoins.slice(0, isJackpot ? 28 : isBigWin ? 24 : 18).map(coin => (
       <span
        key={coin.id}
        className="fountainCoin"
        style={{
         animationDelay: `${coin.delay}s`,
         animationDuration: `${coin.dur}s`,
         width: `${coin.size}px`,
         height: `${coin.size}px`,
         '--vx': `${coin.vx}px`,
         '--vy': `${coin.vy}px`,
         '--spinX': `${coin.spinX}deg`,
         '--spinY': `${coin.spinY}deg`
        }}
       />
      ))}
     </div>

     {/* Mưa tiền vàng 3D tràn ngập khắp màn hình với Depth of Field */}
     <div className="coinRainContainer">
      {fxCoinRainDoF.slice(0, isJackpot ? 80 : isBigWin ? 65 : 45).map(coin => (
       <span
        key={coin.id}
        className={`coinRain ${coin.dof}`}
        style={{
         left: `${coin.left}%`,
         animationDelay: `${coin.delay}s`,
         animationDuration: `${coin.dur}s`,
         width: `${coin.size}px`,
         height: `${coin.size}px`,
         '--spin': `${coin.spin}deg`,
         '--rotZ': `${coin.rotZ}deg`
        }}
       />
      ))}
     </div>

     {/* Confetti & kim tuyến thả rơi đủ sắc màu */}
     <div className="confettiContainer">
      {fxConfettiAll.slice(0, isJackpot ? 48 : 34).map(c => (
       <span
        key={c.id}
        className="confettiRibbon"
        style={{
         left: `${c.left}%`,
         animationDelay: `${c.delay}s`,
         animationDuration: `${c.dur}s`,
         background: c.color,
         width: `${c.width}px`,
         height: `${c.height}px`,
         '--rot': `${c.rot}deg`
        }}
       />
      ))}
     </div>

     {/* Tia sáng và tinh thể lấp lánh bùng nổ từ tâm */}
     <div className="sparklesStage">
      {fxSparkles.map(sp => (
       <span
        key={sp.id}
        className="sparkleStar"
        style={{
         '--rot': `${sp.rot}deg`,
         '--dist': `${sp.dist}px`,
         animationDelay: `${sp.delay}s`,
         fontSize: `${sp.size}px`,
         color: sp.color
        }}
       >
        {sp.char}
       </span>
      ))}
     </div>

     {/* Tâm điểm 3D VICTORY / BIG WIN Banner */}
     <div className={`victoryCard ${themeClass}`}>
      <div className="victoryWings">
       <svg viewBox="0 0 240 70" className="wingSvg leftWing">
        <defs>
         <linearGradient id="vWingGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fffde6" />
          <stop offset="35%" stopColor="#ffd700" />
          <stop offset="70%" stopColor="#ff9100" />
          <stop offset="100%" stopColor="#8a4800" />
         </linearGradient>
         <filter id="vWingGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ffd700" floodOpacity="0.9" />
         </filter>
        </defs>
        <path d="M120,60 Q70,48 10,12 Q60,24 95,42 Q48,34 24,28 Q72,42 108,54 Z" fill="url(#vWingGrad)" filter="url(#vWingGlow)" />
       </svg>
       <svg viewBox="0 0 240 70" className="wingSvg rightWing">
        <path d="M120,60 Q170,48 230,12 Q180,24 145,42 Q192,34 216,28 Q168,42 132,54 Z" fill="url(#vWingGrad)" filter="url(#vWingGlow)" />
       </svg>
      </div>

      <div className="victoryEmblem">
       {isJackpot ? '👑' : isBigWin ? '🏆' : isBossWin ? '🔱' : isCombo ? '💥' : isDiceWin ? '🎲' : '⭐'}
      </div>

      <div className="victoryBanner">
       <h1 className="victoryText3D" data-text={mainTitle}>{mainTitle}</h1>
       <div className="victoryGleam" />
      </div>

      <p className="victorySubTitle">{subTitle}</p>

      {fx.text && (
       <div className="victoryAmountBox">
        <span className="amountBadgeCoin">🪙</span>
        <span className="victoryAmount">{fx.text}</span>
       </div>
      )}

      <div className="victoryTapHint">
       <span>CHẠM ĐỂ TIẾP TỤC ✕</span>
      </div>

      <div className="cardCornerGlow tl" />
      <div className="cardCornerGlow tr" />
      <div className="cardCornerGlow bl" />
      <div className="cardCornerGlow br" />
     </div>
    </>
   )}

   {/* ======================= DEFEAT SHOWCASE ======================= */}
   {lose && (
    <>
     <div className="defeatVignette" />
     <div className="defeatDarkMist" />

     {/* Hạt tro bụi u ám bay ngược lên tan biến */}
     <div className="ashEmbersContainer">
      {fxAshEmbers.map(ash => (
       <span
        key={ash.id}
        className="ashEmber"
        style={{
         left: `${ash.left}%`,
         animationDelay: `${ash.delay}s`,
         animationDuration: `${ash.dur}s`,
         width: `${ash.size}px`,
         height: `${ash.size}px`,
         background: ash.color,
         '--dx': `${ash.dx}px`
        }}
       />
      ))}
     </div>

     {/* Mảnh vỡ tiền vàng bị hút vào hố đen kỹ thuật số */}
     <div className="voidSuctionStage">
      <div className="voidVortex" />
      {fxVoidShards.map(sh => (
       <span
        key={sh.id}
        className="brokenCoinShard"
        style={{
         '--sx': `${sh.sx}px`,
         '--sy': `${sh.sy}px`,
         animationDelay: `${sh.delay}s`,
         animationDuration: `${sh.dur}s`,
         width: `${sh.size}px`,
         height: `${sh.size}px`,
         '--rot': `${sh.rot}deg`
        }}
       />
      ))}
     </div>

     {/* Tâm điểm chữ đá nứt nẻ phát sáng đỏ rực & tia chớp */}
     <div className="defeatCard">
      <div className="defeatCrackedBackdrop" />
      <div className="defeatSkullEmblem">💀</div>

      <div className="defeatBanner">
       <h1 className="defeatText3D" data-text={mainTitle}>{mainTitle}</h1>
       <svg className="crimsonCrackSvg" viewBox="0 0 300 80">
        <path d="M20,40 L60,35 L90,48 L140,28 L170,52 L220,38 L250,45 L280,30" stroke="#ff1744" strokeWidth="2.5" fill="none" filter="drop-shadow(0 0 8px #ff1744)" />
        <path d="M140,28 L135,10" stroke="#ff5252" strokeWidth="1.8" fill="none" />
        <path d="M170,52 L175,70" stroke="#ff5252" strokeWidth="1.8" fill="none" />
        <path d="M60,35 L50,18" stroke="#ff5252" strokeWidth="1.5" fill="none" />
       </svg>
      </div>

      <p className="defeatSubTitle">{subTitle}</p>

      {fx.text && (
       <div className="defeatAmountBox">
        <span className="defeatBadgeIcon">⚠️</span>
        <span className="defeatAmount">{fx.text}</span>
       </div>
      )}

      <div className="defeatTapHint">
       <span>CHẠM ĐỂ TIẾP TỤC ✕</span>
      </div>

      <div className="defeatGlitchLine" />
     </div>
    </>
   )}
  </div>
 );
}
