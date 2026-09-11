import React from 'react';

/**
 * Ultra-Luxurious, 3D-styled SVGs for the 6 traditional Bau Cua mascots:
 * 1. NAI (Majestic Golden Stag)
 * 2. BAU (Sacred Golden Gourd with Silk Ribbon)
 * 3. GA  (Royal Imperial Rooster)
 * 4. CA  (Celestial Koi Fish)
 * 5. CUA (Royal Ruby King Crab)
 * 6. TOM (Ocean Flame Lobster)
 */

export function NaiIcon({ className = 'w-16 h-16', ...props }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`bcMascotSvg ${className}`} {...props}>
      <defs>
        <radialGradient id="naiBgGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="naiHeadGrad" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#fed7aa" />
          <stop offset="40%" stopColor="#f59e0b" />
          <stop offset="85%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#78350f" />
        </radialGradient>
        <linearGradient id="antlerGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fffbeb" />
          <stop offset="35%" stopColor="#fde047" />
          <stop offset="70%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
        <filter id="naiShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#f59e0b" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* Aura Glow */}
      <circle cx="50" cy="50" r="45" fill="url(#naiBgGlow)" />

      {/* Left Antlers */}
      <g filter="url(#naiShadow)">
        <path d="M34 32C30 18 20 12 12 15C16 20 22 24 28 32M24 20C18 14 14 8 10 5C15 8 18 14 22 20M30 26C24 18 23 11 20 8C23 11 26 18 28 24" 
              stroke="url(#antlerGold)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Right Antlers */}
        <path d="M66 32C70 18 80 12 88 15C84 20 78 24 72 32M76 20C82 14 86 8 90 5C85 8 82 14 78 20M70 26C76 18 77 11 80 8C77 11 74 18 72 24" 
              stroke="url(#antlerGold)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>
      </g>

      {/* Ears */}
      <path d="M26 38C16 32 12 38 18 48C24 46 27 42 26 38Z" fill="#d97706" stroke="#fef3c7" strokeWidth="2" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"/>
      <path d="M22 40C18 36 16 39 20 44C22 43 23 41 22 40Z" fill="#fecaca"/>
      <path d="M74 38C84 32 88 38 82 48C76 46 73 42 74 38Z" fill="#d97706" stroke="#fef3c7" strokeWidth="2" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"/>
      <path d="M78 40C82 36 84 39 80 44C78 43 77 41 78 40Z" fill="#fecaca"/>

      {/* Head / Face */}
      <ellipse cx="50" cy="54" rx="22" ry="26" fill="url(#naiHeadGrad)" stroke="#fef08a" strokeWidth="2.5" filter="drop-shadow(0 6px 12px rgba(0,0,0,0.6))"/>
      
      {/* Forehead Star */}
      <polygon points="50,34 52,39 57,39 53,42 55,47 50,44 45,47 47,42 43,39 48,39" fill="#ffffff" filter="drop-shadow(0 0 4px #ffd700)"/>

      {/* Big Sparkling Eyes */}
      <ellipse cx="38" cy="49" rx="4.5" ry="6" fill="#0f172a"/>
      <ellipse cx="37" cy="47" rx="2" ry="3" fill="#ffffff"/>
      <circle cx="40" cy="51" r="1" fill="#ffffff"/>

      <ellipse cx="62" cy="49" rx="4.5" ry="6" fill="#0f172a"/>
      <ellipse cx="61" cy="47" rx="2" ry="3" fill="#ffffff"/>
      <circle cx="64" cy="51" r="1" fill="#ffffff"/>

      {/* Rosy Cheeks & Dapples */}
      <circle cx="32" cy="57" r="3.5" fill="#ef4444" opacity="0.45"/>
      <circle cx="68" cy="57" r="3.5" fill="#ef4444" opacity="0.45"/>
      <circle cx="34" cy="42" r="1.5" fill="#ffffff" opacity="0.9"/>
      <circle cx="66" cy="42" r="1.5" fill="#ffffff" opacity="0.9"/>

      {/* Snout & Nose */}
      <ellipse cx="50" cy="67" rx="13" ry="9" fill="#fffbeb" stroke="#fde68a" strokeWidth="1.5"/>
      <path d="M46 64C48 62 52 62 54 64C55 66 53 68 50 68C47 68 45 66 46 64Z" fill="#451a03"/>
      <path d="M50 68V72M46 72C48 73.5 52 73.5 54 72" stroke="#451a03" strokeWidth="1.5" strokeLinecap="round"/>

      {/* Golden Bell Collar */}
      <path d="M36 76C44 80 56 80 64 76C63 80 57 82 50 82C43 82 37 80 36 76Z" fill="#dc2626" stroke="#fbbf24" strokeWidth="1.5"/>
      <circle cx="50" cy="83" r="4.5" fill="url(#antlerGold)" stroke="#78350f" strokeWidth="1" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"/>
    </svg>
  );
}

export function BauIcon({ className = 'w-16 h-16', ...props }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`bcMascotSvg ${className}`} {...props}>
      <defs>
        <radialGradient id="bauBgGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="gourdUpper" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="35%" stopColor="#f59e0b" />
          <stop offset="75%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </radialGradient>
        <radialGradient id="gourdLower" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="30%" stopColor="#f59e0b" />
          <stop offset="70%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#7c2d12" />
        </radialGradient>
        <linearGradient id="silkRibbon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="50%" stopColor="#b91c1c" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>
        <linearGradient id="jadeGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
      </defs>

      {/* Aura Glow */}
      <circle cx="50" cy="50" r="45" fill="url(#bauBgGlow)" />

      {/* Stem & Leaves */}
      <path d="M50 18C50 10 56 6 62 4" stroke="#78350f" strokeWidth="4.5" strokeLinecap="round"/>
      <path d="M51 14C58 9 70 11 68 18C61 21 54 18 51 14Z" fill="#15803d" stroke="#86efac" strokeWidth="1.5" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))"/>

      {/* Lower Big Gourd Sphere */}
      <circle cx="50" cy="62" r="27" fill="url(#gourdLower)" stroke="#fef08a" strokeWidth="2.5" filter="drop-shadow(0 8px 16px rgba(0,0,0,0.65))"/>
      
      {/* Upper Gourd Sphere */}
      <circle cx="50" cy="34" r="18" fill="url(#gourdUpper)" stroke="#fef08a" strokeWidth="2.5" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.5))"/>

      {/* Specular 3D Gloss Curves */}
      <path d="M36 28C34 33 37 38 40 40" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.75"/>
      <path d="M30 54C28 64 33 73 40 78" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.6"/>

      {/* Ornate Red Silk Ribbon at Waist */}
      <path d="M36 45C44 48 56 48 64 45C66 49 63 51 50 52C37 51 34 49 36 45Z" fill="url(#silkRibbon)" stroke="#fca5a5" strokeWidth="1.5"/>
      
      {/* Hanging Ribbons & Jade Coin */}
      <path d="M47 52L44 68L48 65L52 68L49 52" fill="url(#silkRibbon)" stroke="#fca5a5" strokeWidth="1"/>
      <circle cx="50" cy="52" r="5.5" fill="url(#jadeGlow)" stroke="#fef08a" strokeWidth="1.5" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.6))"/>
      <rect x="48" y="50" width="4" height="4" fill="#0f172a" rx="0.5"/>

      {/* Lucky Coin / Wealth Chinese Character 'LỘC' Stamp */}
      <circle cx="50" cy="65" r="10" fill="rgba(180, 83, 9, 0.4)" stroke="#fde047" strokeWidth="1.5" strokeDasharray="2 1.5"/>
      <text x="50" y="69" fontSize="10" fontWeight="900" textAnchor="middle" fill="#fef08a" fontFamily="serif">LỘC</text>
    </svg>
  );
}

export function GaIcon({ className = 'w-16 h-16', ...props }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`bcMascotSvg ${className}`} {...props}>
      <defs>
        <radialGradient id="gaBgGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="gaBodyGrad" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fed7aa" />
          <stop offset="45%" stopColor="#f97316" />
          <stop offset="85%" stopColor="#c2410c" />
          <stop offset="100%" stopColor="#7c2d12" />
        </radialGradient>
        <linearGradient id="roosterComb" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="50%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#991b1b" />
        </linearGradient>
        <linearGradient id="tailGreen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="60%" stopColor="#059669" />
          <stop offset="100%" stopColor="#064e3b" />
        </linearGradient>
        <linearGradient id="tailBlue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="60%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0c4a6e" />
        </linearGradient>
      </defs>

      {/* Aura Glow */}
      <circle cx="50" cy="50" r="45" fill="url(#gaBgGlow)" />

      {/* Magnificent Tail Feathers */}
      <path d="M30 55C14 48 6 32 12 18C18 32 25 42 38 48" fill="url(#tailGreen)" stroke="#a7f3d0" strokeWidth="1.5" filter="drop-shadow(0 3px 6px rgba(0,0,0,0.5))"/>
      <path d="M26 60C10 55 4 42 8 30C15 40 22 48 35 54" fill="url(#tailBlue)" stroke="#bae6fd" strokeWidth="1.5" filter="drop-shadow(0 3px 6px rgba(0,0,0,0.5))"/>
      <path d="M28 64C16 62 10 52 14 42C20 48 26 55 35 59" fill="#eab308" stroke="#fef08a" strokeWidth="1.2"/>

      {/* Rooster Majestic Comb */}
      <path d="M52 24C48 16 52 10 58 11C63 9 66 15 67 12C72 11 76 16 73 24C68 25 60 27 52 24Z" 
            fill="url(#roosterComb)" stroke="#fecaca" strokeWidth="1.8" filter="drop-shadow(0 3px 6px rgba(0,0,0,0.6))"/>

      {/* Main Plump Body */}
      <ellipse cx="48" cy="62" rx="22" ry="19" fill="url(#gaBodyGrad)" stroke="#fef08a" strokeWidth="2.5" filter="drop-shadow(0 6px 14px rgba(0,0,0,0.6))"/>
      
      {/* Head */}
      <circle cx="58" cy="36" r="14" fill="url(#gaBodyGrad)" stroke="#fef08a" strokeWidth="2"/>

      {/* Golden Wing */}
      <path d="M42 54C50 50 60 54 62 64C58 71 46 72 38 67C36 61 38 56 42 54Z" 
            fill="#d97706" stroke="#fde047" strokeWidth="2" filter="drop-shadow(0 3px 6px rgba(0,0,0,0.4))"/>
      <path d="M46 58C52 56 56 60 57 66" stroke="#fef08a" strokeWidth="1.5" strokeLinecap="round"/>

      {/* Sharp Golden Beak */}
      <path d="M70 33L84 39L70 43Z" fill="#facc15" stroke="#a16207" strokeWidth="1.5" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))"/>

      {/* Crimson Wattle (Yếm cổ) */}
      <path d="M66 42C71 44 73 51 68 54C65 55 62 50 63 44" fill="url(#roosterComb)" stroke="#fecaca" strokeWidth="1"/>

      {/* Sparkling Eye */}
      <circle cx="63" cy="33" r="3.5" fill="#ffffff" stroke="#991b1b" strokeWidth="1"/>
      <circle cx="64" cy="33" r="2" fill="#0f172a"/>
      <circle cx="64.5" cy="32.5" r="0.8" fill="#ffffff"/>

      {/* Golden Feet */}
      <path d="M44 80L41 90M41 90L35 92M41 90L46 92M54 80L57 90M57 90L52 92M57 90L62 92" 
            stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"/>
    </svg>
  );
}

export function CaIcon({ className = 'w-16 h-16', ...props }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`bcMascotSvg ${className}`} {...props}>
      <defs>
        <radialGradient id="caBgGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0284c7" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="caBodyGrad" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="35%" stopColor="#38bdf8" />
          <stop offset="75%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0c4a6e" />
        </radialGradient>
        <linearGradient id="finGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="50%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
      </defs>

      {/* Aura Glow */}
      <circle cx="50" cy="50" r="45" fill="url(#caBgGlow)" />

      {/* Flowing Tail Fin */}
      <path d="M26 50C14 34 8 28 4 38C10 46 10 54 4 62C8 72 14 66 26 50Z" 
            fill="url(#finGrad)" stroke="#e0f2fe" strokeWidth="2" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.6))"/>
      <path d="M12 42C18 48 18 52 12 58" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>

      {/* Dorsal Fin (Vây lưng) */}
      <path d="M38 32C42 20 56 22 62 28C53 29 44 31 38 32Z" 
            fill="url(#finGrad)" stroke="#e0f2fe" strokeWidth="1.8" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"/>

      {/* Ventral Fin (Vây bụng) */}
      <path d="M42 68C46 78 56 76 60 72C52 70 46 69 42 68Z" 
            fill="url(#finGrad)" stroke="#e0f2fe" strokeWidth="1.8" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"/>

      {/* Pectoral Fin (Vây bơi hông) */}
      <path d="M52 56C58 64 68 64 70 58C64 56 58 55 52 56Z" 
            fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))"/>

      {/* Main Fish Body (Curved Aerodynamic Koi Shape) */}
      <ellipse cx="54" cy="50" rx="27" ry="18" fill="url(#caBodyGrad)" stroke="#f0f9ff" strokeWidth="2.5" filter="drop-shadow(0 8px 16px rgba(0,0,0,0.65))"/>

      {/* Glowing Fish Scales */}
      <path d="M48 41C52 45 52 55 48 59M40 43C44 47 44 53 40 57M58 43C61 47 61 53 58 57M66 45C68 48 68 52 66 55" 
            stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.75"/>

      {/* Large Expressive Eye */}
      <circle cx="70" cy="45" r="4.5" fill="#ffffff" filter="drop-shadow(0 1px 3px rgba(0,0,0,0.5))"/>
      <circle cx="71" cy="45" r="2.8" fill="#0f172a"/>
      <circle cx="72" cy="44" r="1.2" fill="#ffffff"/>

      {/* Water Shimmer & Bubbles */}
      <circle cx="84" cy="38" r="3.5" fill="#7dd3fc" opacity="0.8" stroke="#ffffff" strokeWidth="1"/>
      <circle cx="90" cy="30" r="2" fill="#7dd3fc" opacity="0.6"/>
      <circle cx="86" cy="24" r="1.2" fill="#7dd3fc" opacity="0.5"/>
    </svg>
  );
}

export function CuaIcon({ className = 'w-16 h-16', ...props }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`bcMascotSvg ${className}`} {...props}>
      <defs>
        <radialGradient id="cuaBgGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#dc2626" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="crabShell" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="40%" stopColor="#ef4444" />
          <stop offset="80%" stopColor="#b91c1c" />
          <stop offset="100%" stopColor="#450a0a" />
        </radialGradient>
        <radialGradient id="clawGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="50%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </radialGradient>
      </defs>

      {/* Aura Glow */}
      <circle cx="50" cy="50" r="45" fill="url(#cuaBgGlow)" />

      {/* Walking Legs (Left & Right) */}
      <g stroke="#991b1b" strokeWidth="3.5" strokeLinecap="round">
        {/* Left */}
        <path d="M34 54C22 54 16 60 10 72"/>
        <path d="M36 60C24 64 18 72 14 84"/>
        <path d="M40 66C30 72 26 80 24 90"/>
        {/* Right */}
        <path d="M66 54C78 54 84 60 90 72"/>
        <path d="M64 60C76 64 82 72 86 84"/>
        <path d="M60 66C70 72 74 80 76 90"/>
      </g>

      {/* Giant Powerful Left Claw */}
      <g filter="drop-shadow(0 4px 8px rgba(0,0,0,0.65))">
        <path d="M32 44C22 36 12 26 10 16C18 16 26 22 32 30M20 18C18 10 24 6 30 12C32 20 28 28 22 32" 
              fill="url(#clawGrad)" stroke="#fecaca" strokeWidth="2"/>
      </g>

      {/* Giant Powerful Right Claw */}
      <g filter="drop-shadow(0 4px 8px rgba(0,0,0,0.65))">
        <path d="M68 44C78 36 88 26 90 16C82 16 74 22 68 30M80 18C82 10 76 6 70 12C68 20 72 28 78 32" 
              fill="url(#clawGrad)" stroke="#fecaca" strokeWidth="2"/>
      </g>

      {/* Heavy Arm Joints */}
      <ellipse cx="32" cy="46" rx="5" ry="6" fill="#b91c1c" stroke="#fecaca" strokeWidth="1.5"/>
      <ellipse cx="68" cy="46" rx="5" ry="6" fill="#b91c1c" stroke="#fecaca" strokeWidth="1.5"/>

      {/* Main Armored Crab Shell */}
      <ellipse cx="50" cy="58" rx="25" ry="19" fill="url(#crabShell)" stroke="#fecaca" strokeWidth="2.5" filter="drop-shadow(0 8px 18px rgba(0,0,0,0.7))"/>

      {/* Carapace Grooves & Spikes */}
      <path d="M38 52C44 56 56 56 62 52M40 62C46 65 54 65 60 62" stroke="#fef2f2" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
      <polygon points="26,56 22,54 26,60" fill="#dc2626" stroke="#fecaca" strokeWidth="1"/>
      <polygon points="74,56 78,54 74,60" fill="#dc2626" stroke="#fecaca" strokeWidth="1"/>

      {/* Stalk Eyes with Glowing Piercing Gaze */}
      <circle cx="42" cy="40" r="4.5" fill="#ffffff" stroke="#991b1b" strokeWidth="1.5" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"/>
      <circle cx="42" cy="40" r="2.5" fill="#0f172a"/>
      <circle cx="43" cy="39" r="1" fill="#ffffff"/>

      <circle cx="58" cy="40" r="4.5" fill="#ffffff" stroke="#991b1b" strokeWidth="1.5" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"/>
      <circle cx="58" cy="40" r="2.5" fill="#0f172a"/>
      <circle cx="59" cy="39" r="1" fill="#ffffff"/>
    </svg>
  );
}

export function TomIcon({ className = 'w-16 h-16', ...props }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`bcMascotSvg ${className}`} {...props}>
      <defs>
        <radialGradient id="tomBgGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ea580c" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="prawnBody" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fed7aa" />
          <stop offset="35%" stopColor="#fb923c" />
          <stop offset="75%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#7c2d12" />
        </radialGradient>
      </defs>

      {/* Aura Glow */}
      <circle cx="50" cy="50" r="45" fill="url(#tomBgGlow)" />

      {/* Sweeping Majestic Antennae (Râu tôm) */}
      <path d="M68 30C82 20 94 14 98 8M66 34C80 30 92 26 96 16" 
            stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"/>

      {/* Prawn Claws */}
      <path d="M64 42C74 46 80 52 78 58M60 46C68 52 74 58 70 62" 
            stroke="#c2410c" strokeWidth="3" strokeLinecap="round"/>

      {/* Fan Tail Fins */}
      <path d="M18 46C10 46 4 52 2 60C10 58 18 55 22 50Z" fill="#c2410c" stroke="#fed7aa" strokeWidth="1.5"/>
      <path d="M20 42C12 38 6 42 3 48C11 49 18 48 22 45Z" fill="#ea580c" stroke="#fed7aa" strokeWidth="1.5"/>

      {/* Dynamic Curved Prawn Body */}
      <path d="M62 34C72 38 72 52 66 58C58 68 44 74 32 71C20 68 14 58 18 46C20 38 30 30 40 32C48 32 58 30 62 34Z" 
            fill="url(#prawnBody)" stroke="#fef08a" strokeWidth="2.5" filter="drop-shadow(0 8px 16px rgba(0,0,0,0.65))"/>

      {/* Shell Segment Bands with Golden Ridge */}
      <path d="M54 36C56 46 52 56 46 62M44 36C46 44 42 54 36 60M34 38C34 46 30 54 24 58" 
            stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.8"/>

      {/* Shiny Bead Eye */}
      <circle cx="68" cy="35" r="3.5" fill="#ffffff" stroke="#7c2d12" strokeWidth="1"/>
      <circle cx="68.5" cy="35" r="2" fill="#0f172a"/>
      <circle cx="69" cy="34.5" r="0.8" fill="#ffffff"/>

      {/* Fine Walking Legs */}
      <path d="M52 64L50 74M44 67L41 77M36 68L31 78M28 66L23 75" 
            stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))"/>
    </svg>
  );
}

export const MASCOT_MAP = {
  NAI: { key: 'NAI', id: 0, label: 'NAI', symbol: '🦌', color: '#ffb95f', border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', Icon: NaiIcon },
  BAU: { key: 'BAU', id: 1, label: 'BẦU', symbol: '🎃', color: '#f59e0b', border: '#d97706', bg: 'rgba(217, 119, 6, 0.12)', Icon: BauIcon },
  GA:  { key: 'GA',  id: 2, label: 'GÀ',  symbol: '🐓', color: '#ef4444', border: '#dc2626', bg: 'rgba(239, 68, 68, 0.12)', Icon: GaIcon },
  CA:  { key: 'CA',  id: 3, label: 'CÁ',  symbol: '🐟', color: '#38bdf8', border: '#0284c7', bg: 'rgba(2, 132, 199, 0.12)', Icon: CaIcon },
  CUA: { key: 'CUA', id: 4, label: 'CUA', symbol: '🦀', color: '#f87171', border: '#b91c1c', bg: 'rgba(220, 38, 38, 0.12)', Icon: CuaIcon },
  TOM: { key: 'TOM', id: 5, label: 'TÔM', symbol: '🦐', color: '#fb923c', border: '#ea580c', bg: 'rgba(234, 88, 12, 0.12)', Icon: TomIcon },
};

export const MASCOT_LIST = [
  MASCOT_MAP.NAI,
  MASCOT_MAP.BAU,
  MASCOT_MAP.GA,
  MASCOT_MAP.CA,
  MASCOT_MAP.CUA,
  MASCOT_MAP.TOM,
];

export function MascotIcon({ idOrKey, className = 'w-16 h-16', ...props }) {
  const item = typeof idOrKey === 'number' ? MASCOT_LIST[idOrKey] : MASCOT_MAP[idOrKey] || MASCOT_MAP.BAU;
  const Component = item?.Icon || BauIcon;
  return <Component className={className} {...props} />;
}
