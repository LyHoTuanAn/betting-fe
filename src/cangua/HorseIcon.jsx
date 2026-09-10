import React from 'react';

/**
 * Luxury Vector Artwork for Royal Seahorse / Chess Knight (Cá Ngựa Hoàng Gia)
 * Drawn with high precision SVG paths, gradients, armor crest, royal crown and glowing aura.
 */
export function HorseIcon({ color = 'gold', size = 24, glow = true, animated = false, className = '' }) {
  const colorMap = {
    gold: {
      primary: '#ffc174',
      secondary: '#f59e0b',
      accent: '#ffe5b4',
      dark: '#78350f',
      glowColor: 'rgba(255, 193, 116, 0.6)',
      id: 'horse-gold'
    },
    red: {
      primary: '#ff5252',
      secondary: '#d32f2f',
      accent: '#ff8a80',
      dark: '#5f0909',
      glowColor: 'rgba(255, 82, 82, 0.6)',
      id: 'horse-red'
    },
    green: {
      primary: '#56e5a9',
      secondary: '#059669',
      accent: '#a7f3d0',
      dark: '#064e3b',
      glowColor: 'rgba(86, 229, 169, 0.6)',
      id: 'horse-green'
    },
    blue: {
      primary: '#60a5fa',
      secondary: '#2563eb',
      accent: '#bfdbfe',
      dark: '#1e3a8a',
      glowColor: 'rgba(96, 165, 250, 0.6)',
      id: 'horse-blue'
    }
  };

  const c = colorMap[color] || colorMap.gold;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`horse-svg ${animated ? 'horse-animated' : ''} ${className}`}
      style={{
        filter: glow ? `drop-shadow(0 0 ${size * 0.15}px ${c.glowColor})` : 'none',
        overflow: 'visible'
      }}
    >
      <defs>
        {/* Main Body Gradient */}
        <linearGradient id={`${c.id}-body`} x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={c.accent} />
          <stop offset="35%" stopColor={c.primary} />
          <stop offset="75%" stopColor={c.secondary} />
          <stop offset="100%" stopColor={c.dark} />
        </linearGradient>

        {/* Armor / Highlight Gradient */}
        <linearGradient id={`${c.id}-crest`} x1="16" y1="4" x2="48" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="50%" stopColor={c.accent} />
          <stop offset="100%" stopColor={c.primary} />
        </linearGradient>

        {/* Crown Gold Gradient */}
        <linearGradient id={`${c.id}-crown`} x1="20" y1="2" x2="38" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff7ed" />
          <stop offset="40%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>

        {/* Base Pedestal Gradient */}
        <radialGradient id={`${c.id}-base`} cx="32" cy="54" r="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={c.accent} />
          <stop offset="55%" stopColor={c.secondary} />
          <stop offset="100%" stopColor="#0a0a0f" />
        </radialGradient>
      </defs>

      {/* Outer Subtle Ambient Ring */}
      <circle cx="32" cy="32" r="30" fill={c.primary} fillOpacity="0.08" stroke={c.primary} strokeWidth="1.2" strokeDasharray="3 3" opacity="0.6" />

      {/* Base Pedestal Token */}
      <ellipse cx="32" cy="54" rx="18" ry="6" fill={`url(#${c.id}-base)`} stroke={c.accent} strokeWidth="1.2" />
      <ellipse cx="32" cy="52" rx="14" ry="4" fill={c.dark} stroke={c.primary} strokeWidth="0.8" />

      {/* Seahorse / Chess Knight Main Body */}
      <path
        d="M26 14
           C28 10, 36 8, 42 12
           C46 15, 47 20, 44 24
           C42 27, 39 28, 41 33
           C43 38, 46 42, 45 47
           C44 51, 40 53, 35 52
           C29 51, 26 46, 28 42
           C30 38, 33 37, 32 34
           C30 28, 20 28, 18 23
           C16 18, 18 16, 21 16
           C23 16, 24 18, 26 18
           Z"
        fill={`url(#${c.id}-body)`}
        stroke={c.accent}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Dorsal Fin / Crest Armor Spines */}
      <path
        d="M40 13 L47 9 L43 16
           M44 19 L52 17 L44 24
           M43 27 L50 27 L41 33
           M41 36 L48 38 L39 42"
        stroke={c.accent}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={c.primary}
      />

      {/* Segmented Chest Armor Plates */}
      <path
        d="M24 24 C28 25, 33 28, 35 32
           M26 31 C29 32, 34 35, 36 39
           M28 37 C31 39, 34 42, 35 46"
        stroke={c.dark}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M24 23 C28 24, 33 27, 35 31
           M26 30 C29 31, 34 34, 36 38
           M28 36 C31 38, 34 41, 35 45"
        stroke={c.accent}
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.9"
      />

      {/* Glowing Royal Eye */}
      <circle cx="27" cy="18" r="2.8" fill="#ffffff" />
      <circle cx="27" cy="18" r="1.8" fill={c.dark} />
      <circle cx="27.6" cy="17.4" r="0.8" fill="#ffffff" />

      {/* Seahorse Snout & Royal Nostril */}
      <path d="M18 20 C16 19, 15 22, 17 23 Z" fill={c.accent} />
      <circle cx="18" cy="20" r="0.8" fill={c.dark} />

      {/* Royal Crown Ornament atop the Head */}
      <path
        d="M28 10 L30 4 L34 8 L38 3 L40 10 Z"
        fill={`url(#${c.id}-crown)`}
        stroke="#ffffff"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* Crown Jewels */}
      <circle cx="30" cy="4" r="1" fill="#ff4d4f" />
      <circle cx="34" cy="7" r="1.2" fill="#52c41a" />
      <circle cx="38" cy="3" r="1" fill="#1890ff" />

      {/* Specular Highlight Sheen */}
      <path
        d="M30 14 C33 13, 37 14, 39 17 C36 17, 32 17, 30 14 Z"
        fill="#ffffff"
        fillOpacity="0.6"
      />

      {/* Curled Seahorse Tail Swirl */}
      <path
        d="M34 46 C36 48, 34 51, 31 50 C29 49, 30 47, 32 47"
        stroke={c.accent}
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export default HorseIcon;
