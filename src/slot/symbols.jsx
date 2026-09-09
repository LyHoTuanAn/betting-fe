export const symbols=['7','◆','♛','BAR','♕','✦','💰','🪙','🍀','🔔','🍒','⚡','🍇','🐉','🃏','🔮'];
export const slotScrollSymbols=Array.from({length:48},(_,i)=>symbols[i%symbols.length]);
const randomSymbol=()=>symbols[Math.floor(Math.random()*symbols.length)];
export const createGrid=()=>Array.from({length:25},()=>randomSymbol());
export const getColumn=(grid,col)=>[grid[col],grid[col+5],grid[col+10],grid[col+15],grid[col+20]];
export const setColumn=(grid,col,column)=>{const next=[...grid];column.forEach((value,row)=>{next[col+row*5]=value});return next};
export const ensure25Grid=(rawGrid)=>{
 if(!rawGrid || rawGrid.length===25) return rawGrid || createGrid();
 return Array.from({length:25},(_,i)=>{
  const col=i%5, row=Math.floor(i/5);
  if(row>=1 && row<=3) return rawGrid[(row-1)*5+col]||randomSymbol();
  return randomSymbol();
 });
};
export const renderSlotSymbol=(x,isWin=false)=>{
 const symClass=x==='◆'?'gem':x==='♛'?'crown':x==='7'?'seven':x==='BAR'?'bar':x==='♕'?'tiara':x==='✦'?'star':x==='💰'?'pouch':x==='🪙'?'coin':x==='🍀'?'clover':x==='🔔'?'bell':x==='🍒'?'cherry':x==='⚡'?'thunder':x==='🍇'?'grape':x==='🐉'?'dragon':x==='🃏'?'joker':'orb';
 return (
  <div className={`symContent sym-${symClass} ${isWin?'winHighlight':''}`}>
   {x==='◆'?(
    <div className="gemWrapper">
     <svg viewBox="0 0 48 48" className="symbolSvg diamondSvg">
      <defs>
       <linearGradient id="gemGrad1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#e0fcff"/><stop offset="45%" stopColor="#00d4ff"/><stop offset="100%" stopColor="#005dbd"/></linearGradient>
       <linearGradient id="gemGradTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffffff"/><stop offset="100%" stopColor="#80f1ff"/></linearGradient>
       <filter id="gemGlow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#00d2ff" floodOpacity="0.8"/></filter>
      </defs>
      <polygon points="12,12 36,12 45,23 24,44 3,23" fill="url(#gemGrad1)" filter="url(#gemGlow)" stroke="#fff" strokeWidth="1"/>
      <polygon points="12,12 36,12 30,23 18,23" fill="url(#gemGradTop)"/>
      <polygon points="12,12 18,23 3,23" fill="#60e4ff" opacity="0.9"/>
      <polygon points="36,12 45,23 30,23" fill="#00a3e0" opacity="0.9"/>
      <polygon points="18,23 30,23 24,44" fill="#ffffff" opacity="0.88"/>
      <polygon points="3,23 18,23 24,44" fill="#0084c7"/>
      <polygon points="45,23 30,23 24,44" fill="#005096"/>
     </svg>
     <div className="symGleam"></div>
    </div>
   ):x==='♛'?(
    <div className="crownWrapper">
     <svg viewBox="0 0 48 48" className="symbolSvg crownSvg">
      <defs>
       <linearGradient id="crownGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fffcee"/><stop offset="30%" stopColor="#ffd700"/><stop offset="70%" stopColor="#f39c12"/><stop offset="100%" stopColor="#a36605"/></linearGradient>
       <radialGradient id="rubyGrad" cx="35%" cy="35%" r="65%"><stop offset="0%" stopColor="#ff7b7b"/><stop offset="60%" stopColor="#e74c3c"/><stop offset="100%" stopColor="#8a1e12"/></radialGradient>
       <filter id="crownGlow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#f39c12" floodOpacity="0.8"/></filter>
      </defs>
      <path d="M5,35 L43,35 L40,16 L30,25 L24,9 L18,25 L8,16 Z" fill="url(#crownGrad)" stroke="#fff2b2" strokeWidth="1.2" filter="url(#crownGlow)"/>
      <rect x="6" y="35" width="36" height="6" rx="2" fill="url(#crownGrad)" stroke="#fff2b2" strokeWidth="1"/>
      <circle cx="24" cy="8" r="3.2" fill="#fffbe8"/>
      <circle cx="8" cy="15" r="2.8" fill="#fffbe8"/>
      <circle cx="40" cy="15" r="2.8" fill="#fffbe8"/>
      <circle cx="24" cy="38" r="2.5" fill="url(#rubyGrad)"/>
      <circle cx="15" cy="38" r="2" fill="#2ecc71"/>
      <circle cx="33" cy="38" r="2" fill="#3498db"/>
     </svg>
     <div className="symGleam"></div>
    </div>
   ):x==='7'?(
    <div className="sevenWrapper">
     <svg viewBox="0 0 48 48" className="symbolSvg sevenSvg">
      <defs>
       <linearGradient id="sevenGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffffff"/><stop offset="22%" stopColor="#ffe600"/><stop offset="55%" stopColor="#ff2800"/><stop offset="100%" stopColor="#7a0000"/></linearGradient>
       <filter id="sevenShadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="1.5" floodColor="#350000" floodOpacity="0.95"/>
        <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#ff5722" floodOpacity="0.7"/>
       </filter>
      </defs>
      <path d="M10,8 L38,8 L38,14 L24,42 L15,42 L28,15 L10,15 Z" fill="url(#sevenGrad)" stroke="#ffeaa7" strokeWidth="1.2" filter="url(#sevenShadow)"/>
     </svg>
     <div className="symGleam"></div>
    </div>
   ):x==='BAR'?(
    <div className="barWrapper">
     <svg viewBox="0 0 48 48" className="symbolSvg barSvg">
      <defs>
       <linearGradient id="barFrameGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fff0a8"/><stop offset="45%" stopColor="#e5a119"/><stop offset="100%" stopColor="#633e00"/></linearGradient>
       <linearGradient id="barInnerGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3d2b12"/><stop offset="100%" stopColor="#120c03"/></linearGradient>
       <linearGradient id="barTextGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffffff"/><stop offset="38%" stopColor="#ffeaa7"/><stop offset="70%" stopColor="#f39c12"/><stop offset="100%" stopColor="#9e6400"/></linearGradient>
       <filter id="barGlow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#e5a119" floodOpacity="0.7"/></filter>
      </defs>
      <rect x="3" y="13" width="42" height="22" rx="5" fill="url(#barInnerGrad)" stroke="url(#barFrameGrad)" strokeWidth="2" filter="url(#barGlow)"/>
      <text x="24" y="29.5" textAnchor="middle" fill="url(#barTextGrad)" fontFamily="Oswald, sans-serif" fontWeight="900" fontSize="16" letterSpacing="2">BAR</text>
     </svg>
     <div className="symGleam"></div>
    </div>
   ):x==='♕'?(
    <div className="tiaraWrapper">
     <svg viewBox="0 0 48 48" className="symbolSvg tiaraSvg">
      <defs>
       <linearGradient id="tiaraGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffffff"/><stop offset="35%" stopColor="#ffb9ff"/><stop offset="70%" stopColor="#ba55d3"/><stop offset="100%" stopColor="#660088"/></linearGradient>
       <radialGradient id="gemPurple" cx="35%" cy="35%" r="65%"><stop offset="0%" stopColor="#fff"/><stop offset="50%" stopColor="#e056fd"/><stop offset="100%" stopColor="#68009c"/></radialGradient>
       <filter id="tiaraGlow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#ba55d3" floodOpacity="0.8"/></filter>
      </defs>
      <path d="M6,34 C12,28 16,16 24,8 C32,16 36,28 42,34 L38,37 L10,37 Z" fill="url(#tiaraGrad)" stroke="#ffde59" strokeWidth="1.2" filter="url(#tiaraGlow)"/>
      <circle cx="24" cy="18" r="4.5" fill="url(#gemPurple)" stroke="#fff" strokeWidth="1"/>
      <circle cx="15" cy="27" r="3" fill="url(#gemPurple)" stroke="#fff" strokeWidth="0.8"/>
      <circle cx="33" cy="27" r="3" fill="url(#gemPurple)" stroke="#fff" strokeWidth="0.8"/>
     </svg>
     <div className="symGleam"></div>
    </div>
   ):x==='✦'?(
    <div className="starWrapper">
     <svg viewBox="0 0 48 48" className="symbolSvg starSvg">
      <defs>
       <linearGradient id="starGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ffffff"/><stop offset="30%" stopColor="#fff385"/><stop offset="65%" stopColor="#ffaa00"/><stop offset="100%" stopColor="#d97706"/></linearGradient>
       <radialGradient id="starHalo" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#ffd700" stopOpacity="0.8"/><stop offset="100%" stopColor="#ff9800" stopOpacity="0"/></radialGradient>
       <filter id="starGlow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ffd700" floodOpacity="0.9"/></filter>
      </defs>
      <circle cx="24" cy="24" r="18" fill="url(#starHalo)"/>
      <path d="M24,4 L27,18 L41,21 L29,27 L33,41 L24,31 L15,41 L19,27 L7,21 L21,18 Z" fill="url(#starGrad)" stroke="#ffffff" strokeWidth="0.8" filter="url(#starGlow)"/>
     </svg>
     <div className="symGleam"></div>
    </div>
   ):x==='💰'?(
    <div className="pouchWrapper">
     <svg viewBox="0 0 48 48" className="symbolSvg pouchSvg">
      <defs>
       <linearGradient id="pouchGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffeb8a"/><stop offset="35%" stopColor="#f39c12"/><stop offset="85%" stopColor="#c0392b"/><stop offset="100%" stopColor="#78170c"/></linearGradient>
       <linearGradient id="goldCoinGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fffab3"/><stop offset="60%" stopColor="#ffd700"/><stop offset="100%" stopColor="#b8860b"/></linearGradient>
       <filter id="pouchGlow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#f39c12" floodOpacity="0.75"/></filter>
      </defs>
      <path d="M14,14 C14,8 20,4 24,4 C28,4 34,8 34,14 C30,17 18,17 14,14 Z" fill="#e74c3c" stroke="#ffeb8a" strokeWidth="1"/>
      <ellipse cx="24" cy="15" rx="10" ry="3" fill="#b8860b" stroke="#ffd700" strokeWidth="1"/>
      <path d="M11,16 C7,24 8,39 15,43 C20,45 28,45 33,43 C40,39 41,24 37,16 C30,18 18,18 11,16 Z" fill="url(#pouchGrad)" stroke="#ffd700" strokeWidth="1.2" filter="url(#pouchGlow)"/>
      <circle cx="24" cy="28" r="8" fill="url(#goldCoinGrad)" stroke="#fff" strokeWidth="0.8"/>
      <text x="24" y="32" textAnchor="middle" fill="#5c3800" fontFamily="Oswald, sans-serif" fontWeight="900" fontSize="11">₫</text>
     </svg>
     <div className="symGleam"></div>
    </div>
   ):x==='🪙'?(
    <div className="coinWrapper">
     <svg viewBox="0 0 48 48" className="symbolSvg coinSvg">
      <defs>
       <radialGradient id="coinFaceGrad" cx="35%" cy="35%" r="65%"><stop offset="0%" stopColor="#fffde6"/><stop offset="30%" stopColor="#ffd700"/><stop offset="70%" stopColor="#e59800"/><stop offset="100%" stopColor="#8a5300"/></radialGradient>
       <linearGradient id="coinRimGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ffffff"/><stop offset="50%" stopColor="#ffd700"/><stop offset="100%" stopColor="#633900"/></linearGradient>
       <filter id="coinGlow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#ffd700" floodOpacity="0.8"/></filter>
      </defs>
      <circle cx="24" cy="24" r="20" fill="url(#coinRimGrad)" filter="url(#coinGlow)"/>
      <circle cx="24" cy="24" r="17" fill="url(#coinFaceGrad)" stroke="#fff8b3" strokeWidth="1.2"/>
      <circle cx="24" cy="24" r="12" fill="none" stroke="#7a4600" strokeWidth="0.8" strokeDasharray="2,2"/>
      <polygon points="24,14 27,21 34,24 27,27 24,34 21,27 14,24 21,21" fill="#fff" opacity="0.9"/>
      <circle cx="24" cy="24" r="3.5" fill="#e74c3c" stroke="#ffd700" strokeWidth="0.8"/>
     </svg>
     <div className="symGleam"></div>
    </div>
   ):x==='🍀'?(
    <div className="cloverWrapper">
     <svg viewBox="0 0 48 48" className="symbolSvg cloverSvg">
      <defs>
       <radialGradient id="cloverGrad" cx="40%" cy="40%" r="60%"><stop offset="0%" stopColor="#a3ff75"/><stop offset="45%" stopColor="#2ecc71"/><stop offset="85%" stopColor="#1b7e44"/><stop offset="100%" stopColor="#0a4623"/></radialGradient>
       <radialGradient id="cloverGold" cx="35%" cy="35%" r="65%"><stop offset="0%" stopColor="#ffffff"/><stop offset="60%" stopColor="#ffd700"/><stop offset="100%" stopColor="#c08000"/></radialGradient>
       <filter id="cloverGlow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#2ecc71" floodOpacity="0.8"/></filter>
      </defs>
      <path d="M24,24 Q24,12 18,10 Q12,12 14,18 Q16,24 24,24 Z" fill="url(#cloverGrad)" stroke="#ffd700" strokeWidth="0.8" filter="url(#cloverGlow)"/>
      <path d="M24,24 Q36,24 38,18 Q36,12 30,14 Q24,16 24,24 Z" fill="url(#cloverGrad)" stroke="#ffd700" strokeWidth="0.8"/>
      <path d="M24,24 Q24,36 30,38 Q36,36 34,30 Q32,24 24,24 Z" fill="url(#cloverGrad)" stroke="#ffd700" strokeWidth="0.8"/>
      <path d="M24,24 Q12,24 10,30 Q12,36 18,34 Q24,32 24,24 Z" fill="url(#cloverGrad)" stroke="#ffd700" strokeWidth="0.8"/>
      <path d="M24,24 Q23,38 18,44" stroke="#27ae60" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <circle cx="24" cy="24" r="4.5" fill="url(#cloverGold)" stroke="#fff" strokeWidth="0.8"/>
     </svg>
     <div className="symGleam"></div>
    </div>
   ):x==='🔔'?(
    <div className="bellWrapper">
     <svg viewBox="0 0 48 48" className="symbolSvg bellSvg">
      <defs>
       <linearGradient id="bellGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fff8db"/><stop offset="35%" stopColor="#ffd700"/><stop offset="70%" stopColor="#e59400"/><stop offset="100%" stopColor="#7a4600"/></linearGradient>
       <filter id="bellGlow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#ffd700" floodOpacity="0.8"/></filter>
      </defs>
      <path d="M22,6 C22,4 26,4 26,6 L26,9 C33,11 37,17 37,27 L39,32 C41,34 39,37 36,37 L12,37 C9,37 7,34 9,32 L11,27 C11,17 15,11 22,9 Z" fill="url(#bellGrad)" stroke="#fff2b2" strokeWidth="1.2" filter="url(#bellGlow)"/>
      <ellipse cx="24" cy="37" rx="14" ry="3" fill="#995c00" stroke="#ffd700" strokeWidth="1"/>
      <circle cx="24" cy="39" r="4" fill="#ffd700" stroke="#fff" strokeWidth="0.8"/>
      <path d="M20,6 Q24,3 28,6 Q24,9 20,6 Z" fill="#e74c3c" stroke="#ffd700" strokeWidth="0.8"/>
     </svg>
     <div className="symGleam"></div>
    </div>
   ):x==='🍒'?(
    <div className="cherryWrapper">
     <svg viewBox="0 0 48 48" className="symbolSvg cherrySvg">
      <defs>
       <radialGradient id="cherryGrad" cx="35%" cy="35%" r="65%"><stop offset="0%" stopColor="#ff7b89"/><stop offset="40%" stopColor="#e71d36"/><stop offset="85%" stopColor="#8a0014"/><stop offset="100%" stopColor="#400008"/></radialGradient>
       <linearGradient id="stemGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#a3ff75"/><stop offset="100%" stopColor="#2ecc71"/></linearGradient>
       <filter id="cherryGlow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#e71d36" floodOpacity="0.85"/></filter>
      </defs>
      <path d="M22,12 Q28,4 34,8 Q28,14 26,24" stroke="url(#stemGrad)" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M22,12 Q18,6 12,10 Q16,16 17,26" stroke="url(#stemGrad)" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M22,12 Q30,8 38,10 Q32,15 22,12 Z" fill="#2ecc71" stroke="#fff" strokeWidth="0.6"/>
      <circle cx="16" cy="30" r="10" fill="url(#cherryGrad)" filter="url(#cherryGlow)" stroke="#ffb3ba" strokeWidth="0.8"/>
      <circle cx="32" cy="28" r="10.5" fill="url(#cherryGrad)" filter="url(#cherryGlow)" stroke="#ffb3ba" strokeWidth="0.8"/>
      <circle cx="13" cy="26" r="3" fill="#fff" opacity="0.75"/>
      <circle cx="29" cy="24" r="3.2" fill="#fff" opacity="0.75"/>
     </svg>
     <div className="symGleam"></div>
    </div>
   ):x==='⚡'?(
    <div className="thunderWrapper">
     <svg viewBox="0 0 48 48" className="symbolSvg thunderSvg">
      <defs>
       <linearGradient id="boltGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffffff"/><stop offset="30%" stopColor="#ffe600"/><stop offset="70%" stopColor="#ff9100"/><stop offset="100%" stopColor="#ff3d00"/></linearGradient>
       <filter id="boltGlow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ffe600" floodOpacity="0.95"/><feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#00e5ff" floodOpacity="0.7"/></filter>
      </defs>
      <polygon points="26,4 10,24 22,24 16,44 38,20 26,20" fill="url(#boltGrad)" stroke="#ffffff" strokeWidth="1.2" filter="url(#boltGlow)"/>
     </svg>
     <div className="symGleam"></div>
    </div>
   ):x==='🍇'?(
    <div className="grapeWrapper">
     <svg viewBox="0 0 48 48" className="symbolSvg grapeSvg">
      <defs>
       <radialGradient id="grapeGrad" cx="35%" cy="35%" r="65%"><stop offset="0%" stopColor="#e0aaff"/><stop offset="45%" stopColor="#9d4edd"/><stop offset="85%" stopColor="#5a189a"/><stop offset="100%" stopColor="#240046"/></radialGradient>
       <filter id="grapeGlow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#9d4edd" floodOpacity="0.8"/></filter>
      </defs>
      <path d="M24,6 Q24,2 28,3 Q26,8 24,12" stroke="#4ade80" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M24,10 Q14,6 18,12 Q22,14 24,10 Z" fill="#22c55e" stroke="#fff" strokeWidth="0.5"/>
      <circle cx="18" cy="18" r="5" fill="url(#grapeGrad)" filter="url(#grapeGlow)" stroke="#f3e8ff" strokeWidth="0.6"/>
      <circle cx="30" cy="18" r="5" fill="url(#grapeGrad)" filter="url(#grapeGlow)" stroke="#f3e8ff" strokeWidth="0.6"/>
      <circle cx="24" cy="22" r="5.5" fill="url(#grapeGrad)" filter="url(#grapeGlow)" stroke="#f3e8ff" strokeWidth="0.6"/>
      <circle cx="16" cy="27" r="4.8" fill="url(#grapeGrad)" filter="url(#grapeGlow)" stroke="#f3e8ff" strokeWidth="0.6"/>
      <circle cx="32" cy="27" r="4.8" fill="url(#grapeGrad)" filter="url(#grapeGlow)" stroke="#f3e8ff" strokeWidth="0.6"/>
      <circle cx="24" cy="31" r="5" fill="url(#grapeGrad)" filter="url(#grapeGlow)" stroke="#f3e8ff" strokeWidth="0.6"/>
      <circle cx="20" cy="38" r="4.2" fill="url(#grapeGrad)" filter="url(#grapeGlow)" stroke="#f3e8ff" strokeWidth="0.6"/>
      <circle cx="28" cy="38" r="4.2" fill="url(#grapeGrad)" filter="url(#grapeGlow)" stroke="#f3e8ff" strokeWidth="0.6"/>
      <circle cx="24" cy="43" r="3.5" fill="url(#grapeGrad)" filter="url(#grapeGlow)" stroke="#f3e8ff" strokeWidth="0.6"/>
     </svg>
     <div className="symGleam"></div>
    </div>
   ):x==='🐉'?(
    <div className="dragonWrapper">
     <svg viewBox="0 0 48 48" className="symbolSvg dragonSvg">
      <defs>
       <linearGradient id="dragonGoldGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fff8db"/><stop offset="30%" stopColor="#ffd700"/><stop offset="65%" stopColor="#ff6f00"/><stop offset="100%" stopColor="#b71c1c"/></linearGradient>
       <filter id="dragonGlow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ffd700" floodOpacity="0.9"/></filter>
      </defs>
      <path d="M12,12 Q16,4 24,8 Q32,4 36,12 L42,20 L36,36 L24,44 L12,36 L6,20 Z" fill="url(#dragonGoldGrad)" stroke="#fff" strokeWidth="1" filter="url(#dragonGlow)"/>
      <circle cx="18" cy="22" r="3.5" fill="#ff1744" stroke="#fff" strokeWidth="0.8"/>
      <circle cx="30" cy="22" r="3.5" fill="#ff1744" stroke="#fff" strokeWidth="0.8"/>
      <circle cx="18" cy="22" r="1.5" fill="#000"/>
      <circle cx="30" cy="22" r="1.5" fill="#000"/>
      <path d="M18,34 Q24,40 30,34" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <polygon points="20,34 24,38 28,34" fill="#fff"/>
     </svg>
     <div className="symGleam"></div>
    </div>
   ):x==='🃏'?(
    <div className="jokerWrapper">
     <svg viewBox="0 0 48 48" className="symbolSvg jokerSvg">
      <defs>
       <linearGradient id="jokerGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ffffff"/><stop offset="35%" stopColor="#00f2fe"/><stop offset="70%" stopColor="#9d4edd"/><stop offset="100%" stopColor="#ff007f"/></linearGradient>
       <filter id="jokerGlow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#00f2fe" floodOpacity="0.85"/></filter>
      </defs>
      <path d="M10,24 C10,12 24,6 24,6 C24,6 38,12 38,24 C38,36 24,42 24,42 C24,42 10,36 10,24 Z" fill="url(#jokerGrad)" stroke="#fff" strokeWidth="1.2" filter="url(#jokerGlow)"/>
      <polygon points="24,12 28,20 36,24 28,28 24,36 20,28 12,24 20,20" fill="#ffffff"/>
      <circle cx="24" cy="24" r="3" fill="#ff007f"/>
     </svg>
     <div className="symGleam"></div>
    </div>
   ):(
    <div className="orbWrapper">
     <svg viewBox="0 0 48 48" className="symbolSvg orbSvg">
      <defs>
       <radialGradient id="orbGrad" cx="35%" cy="30%" r="70%"><stop offset="0%" stopColor="#ffffff"/><stop offset="25%" stopColor="#f0abfc"/><stop offset="55%" stopColor="#c026d3"/><stop offset="85%" stopColor="#4c0519"/><stop offset="100%" stopColor="#0f051d"/></radialGradient>
       <filter id="orbGlow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#d946ef" floodOpacity="0.9"/></filter>
      </defs>
      <circle cx="24" cy="24" r="18" fill="url(#orbGrad)" stroke="#fdf4ff" strokeWidth="1.2" filter="url(#orbGlow)"/>
      <ellipse cx="24" cy="20" rx="10" ry="4" fill="#ffffff" opacity="0.4" transform="rotate(-20 24 20)"/>
      <circle cx="18" cy="16" r="3" fill="#ffffff" opacity="0.8"/>
     </svg>
     <div className="symGleam"></div>
    </div>
   )}
   {isWin&&<div className="winSparkles"><span>✨</span><span>✨</span></div>}
  </div>
 );
};
