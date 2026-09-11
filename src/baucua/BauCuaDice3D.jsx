import React, { useMemo } from 'react';
import { MASCOT_LIST, MascotIcon } from './BauCuaIcons.jsx';

/**
 * 3D Dice Cube component with smooth multi-axis continuous 3D rotation (no bouncing).
 * Maps face ID (0..5) to standard 3D cube faces:
 * Face 0 (Front):  NAI  [0, 0]
 * Face 1 (Right):  BAU  [0, -90]
 * Face 2 (Back):   GA   [0, -180]
 * Face 3 (Left):   CA   [0, 90]
 * Face 4 (Top):    CUA  [-90, 0]
 * Face 5 (Bottom): TOM  [90, 0]
 */
function SingleDice3D({ value = 0, rolling = false, index = 0 }) {
  const targetRotation = useMemo(() => {
    switch (value) {
      case 0: return { x: 0, y: 0 };       // NAI (Front)
      case 1: return { x: 0, y: -90 };     // BAU (Right)
      case 2: return { x: 0, y: -180 };    // GA (Back)
      case 3: return { x: 0, y: 90 };      // CA (Left)
      case 4: return { x: -90, y: 0 };     // CUA (Top)
      case 5: return { x: 90, y: 0 };      // TOM (Bottom)
      default: return { x: 0, y: 0 };
    }
  }, [value]);

  return (
    <div className="bcDiceWrapper">
      <div
        className={`bcDiceCube3D ${rolling ? `isSpinning-${index}` : ''}`}
        style={!rolling ? {
          transform: `rotateX(${targetRotation.x}deg) rotateY(${targetRotation.y}deg) rotateZ(0deg)`,
          transition: 'transform 0.95s cubic-bezier(0.18, 0.9, 0.28, 1)'
        } : undefined}
      >
        {/* Front - NAI (0) */}
        <div className="bcDiceFace faceFront">
          <MascotIcon idOrKey={0} className="w-10 h-10 drop-shadow-md" />
          <span className="faceText text-[#ffb95f]">NAI</span>
        </div>
        {/* Back - GA (2) */}
        <div className="bcDiceFace faceBack">
          <MascotIcon idOrKey={2} className="w-10 h-10 drop-shadow-md" />
          <span className="faceText text-[#ef4444]">GÀ</span>
        </div>
        {/* Right - BAU (1) */}
        <div className="bcDiceFace faceRight">
          <MascotIcon idOrKey={1} className="w-10 h-10 drop-shadow-md" />
          <span className="faceText text-[#f59e0b]">BẦU</span>
        </div>
        {/* Left - CA (3) */}
        <div className="bcDiceFace faceLeft">
          <MascotIcon idOrKey={3} className="w-10 h-10 drop-shadow-md" />
          <span className="faceText text-[#38bdf8]">CÁ</span>
        </div>
        {/* Top - CUA (4) */}
        <div className="bcDiceFace faceTop">
          <MascotIcon idOrKey={4} className="w-10 h-10 drop-shadow-md" />
          <span className="faceText text-[#f87171]">CUA</span>
        </div>
        {/* Bottom - TOM (5) */}
        <div className="bcDiceFace faceBottom">
          <MascotIcon idOrKey={5} className="w-10 h-10 drop-shadow-md" />
          <span className="faceText text-[#fb923c]">TÔM</span>
        </div>
      </div>
      {/* Dynamic 3D Ground Shadow */}
      <div className="bcDiceShadow" />
    </div>
  );
}

export function BauCuaDice3D({
  dice = [1, 4, 5],
  phase = 'betting' // 'betting' | 'shaking' | 'landing' | 'revealing' | 'settled'
}) {
  const isShaking = phase === 'shaking';
  const isRevealing = phase === 'revealing' || phase === 'settled';

  return (
    <div className="bcStageContainer">
      {/* Ambient Gold Radial Glow */}
      <div className="bcStageGlow" />

      {/* Royal Lacquer Plate & Shaker Stage */}
      <div className="bcPlateStageWrapper">
        {/* Ornate Lacquer Tray Base (Always Stationary, High-Gloss Gold & Deep Lacquer) */}
        <div className="bcLacquerTray">
          <div className="bcTrayInnerMat">
            {/* The 3 3D Dice Cubes - Spinning smoothly around their center without bouncing */}
            <div className="bcDiceRow3D">
              {dice.map((val, idx) => (
                <SingleDice3D key={idx} value={val} rolling={isShaking} index={idx} />
              ))}
            </div>

            {/* Glowing Victory Flare when revealing */}
            {isRevealing && <div className="bcWinRevealLight" />}
          </div>
        </div>
      </div>

      {/* Clean Status Subtitle */}
      <div className="bcStatusRow">
        <span className="text-[10px] uppercase tracking-wider text-[#a08e7a]">Trạng Thái:</span>
        <span className={`bcStatusBadge font-bold tracking-wide text-[11px] ${
          phase === 'betting' ? 'text-[#56e5a9]' :
          phase === 'shaking' ? 'text-[#ffc174] animate-pulse' :
          phase === 'landing' ? 'text-[#ffd700]' :
          phase === 'revealing' ? 'text-[#f59e0b]' : 'text-[#ffd285]'
        }`}>
          {phase === 'betting' && 'ĐANG MỞ CƯỢC'}
          {phase === 'shaking' && 'ĐANG XOAY XÚC XẮC 3D...'}
          {phase === 'landing' && 'ĐANG MỞ BÁT...'}
          {phase === 'revealing' && 'KẾT QUẢ VÁN!'}
          {phase === 'settled' && 'KẾT THÚC VÁN'}
        </span>
      </div>
    </div>
  );
}
