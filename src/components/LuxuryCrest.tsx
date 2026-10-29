import React from 'react';
import { UserRole } from '../types/community';
import { ROLE_RING_CONFIG } from '../utils/communityRules';
import { renderProceduralLuxuryImage } from '../utils/aiFeedImageGenerator';

export function LuxuryCrestLogo({ className = 'w-14 h-14' }: { className?: string }) {
  return (
    <img
      src="data:image/jpeg;base64,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"
      alt="Neighbour Network"
      className={className + ' object-cover rounded-xl'}
      style={{ boxShadow: '0 0 18px rgba(236, 72, 153, 0.22), 0 0 24px rgba(163, 230, 53, 0.10)' }}
    />
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
