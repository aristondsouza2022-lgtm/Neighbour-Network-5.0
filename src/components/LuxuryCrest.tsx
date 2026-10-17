import React from 'react';
import { UserRole } from '../types/community';
import { ROLE_RING_CONFIG } from '../utils/communityRules';
import { renderProceduralLuxuryImage } from '../utils/aiFeedImageGenerator';

export function LuxuryCrestLogo({ className = 'w-14 h-14' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Neighbour Network Luxury Crest"
    >
      <defs>
        <linearGradient id="champagneGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5E6A8" />
          <stop offset="45%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#9A7B1C" />
        </linearGradient>
      </defs>
      {/* Outer Octagonal Architectural Shield */}
      <polygon
        points="60,6 98,22 114,60 98,98 60,114 22,98 6,60 22,22"
        stroke="url(#champagneGold)"
        strokeWidth="2.2"
        fill="rgba(11, 12, 16, 0.85)"
      />
      {/* Inner Filigree Ring */}
      <circle
        cx="60"
        cy="60"
        r="42"
        stroke="url(#champagneGold)"
        strokeWidth="1"
        strokeDasharray="4 3"
      />
      {/* Twin High-Rise Spire Motif */}
      <path
        d="M44 86V36L56 26V86H44Z"
        fill="url(#champagneGold)"
        fillOpacity="0.9"
      />
      <path
        d="M64 86V26L76 36V86H64Z"
        fill="url(#champagneGold)"
        fillOpacity="0.65"
      />
      {/* Skybridge Connection */}
      <rect x="42" y="48" width="36" height="4" fill="#F9F9F9" />
      {/* Base Plinth */}
      <path
        d="M32 86H88M38 92H82"
        stroke="url(#champagneGold)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Crown Star */}
      <path
        d="M60 13L62.2 18.5L68 19L63.5 22.8L65 28.5L60 25.2L55 28.5L56.5 22.8L52 19L57.8 18.5L60 13Z"
        fill="url(#champagneGold)"
      />
    </svg>
  );
}

/**
 * Renders a user avatar with the mandatory glowing role border/ring:
 * - Developer: #EF4444 (Red)
 * - Admin / Committee: #10B981 (Green)
 * - Resident / Family Head: #3B82F6 (Blue)
 * - Gate Security: #9CA3AF (Gray)
 */
export function RoleAvatar({
  name,
  role,
  size = 'md',
}: {
  name: string;
  role: UserRole;
  size?: 'sm' | 'md' | 'lg';
}) {
  const config = ROLE_RING_CONFIG[role] || ROLE_RING_CONFIG.resident;
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const sizeClasses = {
    sm: 'w-9 h-9 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-14 h-14 text-base',
  }[size];

  return (
    <div
      className={`relative rounded-full flex items-center justify-center font-semibold tracking-wider bg-[#141821] text-[#F9F9F9] border-2 ${config.borderClass} shrink-0 select-none ${sizeClasses}`}
      style={{ boxShadow: config.glowStyle }}
      title={`${name} · ${config.label}`}
    >
      <span>{initials}</span>
    </div>
  );
}

/**
 * Supports user-uploaded Phone/PC images (data:image, blob:), user-uploaded videos (<=120s),
 * marketplace product photography, and AI-generated Nature & Wildlife visuals.
 */
export function LuxuryMediaArt({
  variant,
  className = 'w-full h-56',
  durationSec,
}: {
  variant?: string | null;
  className?: string;
  durationSec?: number;
}) {
  const v = variant || 'nature-visual://nature-peacock-sanctuary';

  // 1. User-uploaded Video from Phone or PC (blob: or data:video)
  if (
    v.startsWith('data:video/') ||
    (v.startsWith('blob:') && typeof durationSec === 'number')
  ) {
    return (
      <div className={`relative overflow-hidden bg-black flex items-center justify-center ${className}`}>
        <video
          src={v}
          controls
          playsInline
          className="w-full h-full object-contain max-h-96"
        />
        {durationSec && (
          <span className="absolute top-3 right-3 text-xs font-mono-tabular bg-black/80 text-[#D4AF37] border border-[#D4AF37]/40 px-2.5 py-1 rounded pointer-events-none">
            {durationSec}s / 120s MAX
          </span>
        )}
      </div>
    );
  }

  // 2. User-uploaded Photo from Phone or PC (data:image, blob:, http, or /src/assets)
  if (
    v.startsWith('data:image/') ||
    v.startsWith('blob:') ||
    v.startsWith('http://') ||
    v.startsWith('https://') ||
    v.startsWith('/src/')
  ) {
    return (
      <div className={`relative overflow-hidden bg-[#0B0C10] flex items-center justify-center ${className}`}>
        <img
          src={v}
          alt="Uploaded Community Media"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  if (v.includes('espresso')) {
    return (
      <div className={`relative overflow-hidden bg-gradient-to-br from-[#141821] via-[#1B1F2A] to-[#0B0C10] flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 400 260" className="w-full h-full object-cover" fill="none">
          <defs>
            <linearGradient id="brass" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#F5E6A8" />
              <stop offset="50%" stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#7A5C12" />
            </linearGradient>
          </defs>
          <rect width="400" height="260" fill="#0E1117" />
          <ellipse cx="200" cy="220" rx="130" ry="18" fill="#1F2833" />
          {/* Espresso Body */}
          <rect x="115" y="70" width="170" height="135" rx="8" fill="#191D26" stroke="url(#brass)" strokeWidth="2.5" />
          <rect x="125" y="82" width="150" height="32" rx="4" fill="url(#brass)" fillOpacity="0.2" stroke="url(#brass)" strokeWidth="1.2" />
          {/* Dual Pressure Gauges */}
          <circle cx="160" cy="98" r="10" fill="#0B0C10" stroke="url(#brass)" strokeWidth="1.5" />
          <circle cx="240" cy="98" r="10" fill="#0B0C10" stroke="url(#brass)" strokeWidth="1.5" />
          {/* Group Head & Walnut Portafilter */}
          <rect x="182" y="122" width="36" height="24" rx="3" fill="url(#brass)" />
          <path d="M218 134H272" stroke="#8B5A2B" strokeWidth="7" strokeLinecap="round" />
          {/* Espresso Cups */}
          <path d="M172 178H196L193 198H175L172 178Z" fill="#F9F9F9" />
          <path d="M204 178H228L225 198H207L204 178Z" fill="#F9F9F9" />
          <rect x="135" y="198" width="130" height="7" rx="2" fill="url(#brass)" />
        </svg>
        <span className="absolute bottom-3 right-3 text-[11px] font-mono-tabular tracking-widest uppercase text-[#D4AF37]/80 bg-black/60 px-2.5 py-1 rounded">
          Florentine Dual-Boiler · Verified Asset
        </span>
      </div>
    );
  }

  if (v.includes('eames')) {
    return (
      <div className={`relative overflow-hidden bg-gradient-to-br from-[#161922] via-[#0F1319] to-[#0B0C10] flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 400 260" className="w-full h-full object-cover" fill="none">
          <rect width="400" height="260" fill="#0D1016" />
          <ellipse cx="200" cy="222" rx="145" ry="16" fill="#18202C" />
          {/* Palisander Shell & Aniline Leather Cushion Curves */}
          <path d="M125 65C125 55 175 55 185 75L205 155C208 168 150 172 138 152L125 65Z" fill="#6E4726" stroke="#D4AF37" strokeWidth="1.5" />
          <path d="M132 72C138 66 172 68 178 82L194 148C182 156 150 154 144 142L132 72Z" fill="#1C212B" />
          <path d="M148 158H245C255 158 260 176 242 180H155C142 180 140 164 148 158Z" fill="#6E4726" stroke="#D4AF37" strokeWidth="1.5" />
          {/* Star Base */}
          <path d="M195 180V215M195 215L155 224M195 215L235 224M195 215L200 226" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" />
          {/* Ottoman */}
          <rect x="255" y="168" width="68" height="20" rx="6" fill="#1C212B" stroke="#6E4726" strokeWidth="3" />
          <path d="M289 188V218M289 218L265 224M289 218L313 224" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="absolute bottom-3 right-3 text-[11px] font-mono-tabular tracking-widest uppercase text-[#D4AF37]/80 bg-black/60 px-2.5 py-1 rounded">
          Vitra Certificated · Santos Palisander
        </span>
      </div>
    );
  }

  if (v.includes('telescope')) {
    return (
      <div className={`relative overflow-hidden bg-gradient-to-br from-[#0B0C10] via-[#151D28] to-[#1F2833] flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 400 260" className="w-full h-full object-cover" fill="none">
          <rect width="400" height="260" fill="#0B0D13" />
          <circle cx="320" cy="58" r="22" fill="#D4AF37" fillOpacity="0.18" />
          <circle cx="320" cy="58" r="12" fill="#F5E6A8" fillOpacity="0.5" />
          {/* Optical Tube */}
          <g transform="rotate(-24 200 135)">
            <rect x="120" y="110" width="160" height="36" rx="6" fill="#1B222D" stroke="#D4AF37" strokeWidth="2" />
            <rect x="268" y="106" width="18" height="44" rx="2" fill="#D4AF37" />
            <rect x="104" y="118" width="18" height="20" rx="2" fill="#9CA3AF" />
          </g>
          {/* Equatorial Mount & Tripod */}
          <circle cx="200" cy="148" r="14" fill="#D4AF37" />
          <path d="M200 162L145 235M200 162L255 235M200 162V238" stroke="#9CA3AF" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
        <span className="absolute bottom-3 right-3 text-[11px] font-mono-tabular tracking-widest uppercase text-[#D4AF37]/80 bg-black/60 px-2.5 py-1 rounded">
          1100HD Optical Assembly
        </span>
      </div>
    );
  }

  if (v.includes('beosound')) {
    return (
      <div className={`relative overflow-hidden bg-gradient-to-br from-[#14171F] via-[#1D2430] to-[#0B0C10] flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 400 260" className="w-full h-full object-cover" fill="none">
          <rect width="400" height="260" fill="#0E1117" />
          <path d="M200 145L158 235M200 145L242 235M200 145V238" stroke="#C69C6D" strokeWidth="4" strokeLinecap="round" />
          <circle cx="200" cy="118" r="64" fill="#1F2833" stroke="#D4AF37" strokeWidth="3" />
          <circle cx="200" cy="118" r="46" stroke="#D4AF37" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="200" cy="118" r="18" fill="#D4AF37" fillOpacity="0.25" />
        </svg>
        <span className="absolute bottom-3 right-3 text-[11px] font-mono-tabular tracking-widest uppercase text-[#D4AF37]/80 bg-black/60 px-2.5 py-1 rounded">
          Acoustic Sculpture · Gold Tone
        </span>
      </div>
    );
  }

  // AI-Generated Nature, Animals & Wildlife Visuals for Feed Examples
  const seedMatch = v.match(/seed=(\d+)/);
  const customSeed = seedMatch ? parseInt(seedMatch[1], 10) : v.length * 17;
  const { dataUrl, preset } = renderProceduralLuxuryImage(v, customSeed);

  return (
    <div className={`relative overflow-hidden bg-[#0B0C10] ${className}`}>
      {dataUrl && (
        <img
          src={dataUrl}
          alt={preset.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
      <div className="absolute bottom-3 left-4 right-4 flex flex-wrap items-end justify-between gap-2 pointer-events-none">
        <div>
          <div className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#D4AF37]">
            {preset.subtitle}
          </div>
          <div className="text-xs font-display font-semibold text-[#F9F9F9]">
            {preset.title}
          </div>
        </div>
        {durationSec && (
          <span className="text-xs font-mono-tabular bg-black/80 text-[#F9F9F9] border border-[#D4AF37]/40 px-2.5 py-1 rounded">
            00:{String(durationSec).padStart(2, '0')} / 02:00 MAX · 4K HDR
          </span>
        )}
      </div>
      {durationSec && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-14 h-14 rounded-full bg-black/75 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37] shadow-lg">
            <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
