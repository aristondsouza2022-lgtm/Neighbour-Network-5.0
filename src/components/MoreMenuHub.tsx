import React, { useMemo, useState } from 'react';
import { Apartment, Profile } from '../types/community';
import {
  filterByApartmentScope,
  ROLE_RING_CONFIG,
} from '../utils/communityRules';
import { LuxuryCrestLogo, RoleAvatar } from './LuxuryCrest';
import { Building3DViewer } from './Building3DViewer';
import {
  Users,
  Box,
  Award,
  Search,
  Lock,
  Sparkles,
  ShieldCheck,
  Code2,
} from 'lucide-react';

interface MoreMenuHubProps {
  profiles: Profile[];
  currentApartment: Apartment;
  currentUser: Profile;
  onUploadModelZip: (
    apartmentId: string,
    spec: NonNullable<Apartment['custom_model_spec']>
  ) => void;
}

export function MoreMenuHub({
  profiles,
  currentApartment,
  currentUser,
  onUploadModelZip,
}: MoreMenuHubProps) {
  const [subTab, setSubTab] = useState<'3d-viewer' | 'directory' | 'credits'>(
    '3d-viewer'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'committee' | 'resident'>(
    'all'
  );

  // Strictly isolated to current apartment
  const aptResidents = useMemo(() => {
    const scoped = filterByApartmentScope(profiles, currentApartment.id).filter(
      (p) => p.is_verified
    );
    return scoped.filter((p) => {
      const matchesSearch =
        p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.flat_no.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (roleFilter === 'committee') {
        return (
          p.role === 'admin' ||
          p.role === 'committee' ||
          p.role === 'developer'
        );
      }
      if (roleFilter === 'resident') {
        return p.role === 'resident';
      }
      return true;
    });
  }, [profiles, currentApartment.id, searchQuery, roleFilter]);

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#141821] border border-[#D4AF37]/30 rounded-xl p-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#D4AF37] uppercase tracking-widest">
            <Lock className="w-3.5 h-3.5" />
            <span>
              Architectural Twin, Registry & Credits · {currentApartment.name}
            </span>
          </div>
          <h2 className="text-2xl font-display font-semibold text-[#F9F9F9] mt-1">
            3D Society Model, Household Directory & Executive Creators
          </h2>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#0B0C10] border border-white/10 rounded-xl">
          <button
            type="button"
            onClick={() => setSubTab('3d-viewer')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              subTab === '3d-viewer'
                ? 'bg-[#D4AF37] text-[#0B0C10] font-semibold'
                : 'text-[#F9F9F9]/70 hover:text-[#F9F9F9]'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D Building Model</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('directory')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              subTab === 'directory'
                ? 'bg-[#D4AF37] text-[#0B0C10] font-semibold'
                : 'text-[#F9F9F9]/70 hover:text-[#F9F9F9]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Member Directory ({aptResidents.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('credits')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              subTab === 'credits'
                ? 'bg-[#D4AF37] text-[#0B0C10] font-semibold'
                : 'text-[#F9F9F9]/70 hover:text-[#F9F9F9]'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Developer Credits</span>
          </button>
        </div>
      </div>

      {/* SUB-VIEW 1: INTERACTIVE 3D BUILDING MODEL */}
      {subTab === '3d-viewer' && (
        <Building3DViewer
          apartment={currentApartment}
          currentUser={currentUser}
          onUploadModelZip={onUploadModelZip}
        />
      )}

      {/* SUB-VIEW 2: MEMBER DIRECTORY (80 TO 1,000+ FLATS SMOOTH SCROLL) */}
      {subTab === 'directory' && (
        <div className="bg-[#141821] border border-white/10 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-display font-semibold text-[#F9F9F9]">
                Verified Family Heads Registry — {currentApartment.name}
              </h3>
              <p className="text-xs text-[#F9F9F9]/60 mt-0.5 font-mono-tabular">
                Showing {aptResidents.length} Verified Households (Capacity:{' '}
                {currentApartment.max_houses} Residences)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-[#D4AF37] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Family Head or Flat No..."
                  className="pl-9 pr-4 py-2 rounded-lg bg-[#0B0C10] border border-white/15 text-xs text-[#F9F9F9] outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0B0C10] border border-white/10">
                {(['all', 'committee', 'resident'] as const).map((rf) => (
                  <button
                    key={rf}
                    type="button"
                    onClick={() => setRoleFilter(rf)}
                    className={`px-3 py-1 rounded text-xs capitalize cursor-pointer ${
                      roleFilter === rf
                        ? 'bg-[#D4AF37] text-[#0B0C10] font-semibold'
                        : 'text-[#F9F9F9]/65'
                    }`}
                  >
                    {rf}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="max-h-[480px] overflow-y-auto pr-1 divide-y divide-white/10 border border-white/10 rounded-xl bg-[#0B0C10]/60">
            {aptResidents.map((member) => {
              const ringCfg = ROLE_RING_CONFIG[member.role];
              return (
                <div
                  key={member.id}
                  className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <RoleAvatar
                      name={member.full_name}
                      role={member.role}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#F9F9F9] truncate">
                        {member.full_name}
                      </div>
                      <div className="text-xs text-[#F9F9F9]/55 font-mono-tabular truncate">
                        {member.admin_title
                          ? `${member.admin_title} · ${ringCfg.label}`
                          : ringCfg.label}{' '}
                        · {member.email}
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono-tabular shrink-0">
                    <div className="text-sm font-semibold text-[#D4AF37]">
                      Flat {member.flat_no}
                    </div>
                    <div className="text-[11px] text-[#10B981]">
                      Verified Household
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: LUXURY DEVELOPER CREDITS SHOWCASE */}
      {subTab === 'credits' && (
        <div
          data-testid="developer-credits-section"
          className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/50 bg-gradient-to-b from-[#0B0C10] via-[#141821] to-[#1F2833] p-8 md:p-12 space-y-10"
        >
          {/* Top Editorial Header */}
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="flex justify-center mb-3">
              <LuxuryCrestLogo className="w-16 h-16" />
            </div>
            <div className="text-xs uppercase tracking-[0.3em] text-[#D4AF37] font-semibold">
              Original Creators & Principal System Architects
            </div>
            <h3 className="text-3xl md:text-4xl font-display font-bold text-[#F9F9F9]">
              Bespoke Digital Architecture Crafted for Pune’s Premier Estates
            </h3>
            <p className="text-sm text-[#F9F9F9]/75 leading-relaxed">
              Conceived, architected, and engineered from the ground up with
              multi-tenant data isolation, real-time emergency telemetry, and
              interactive 3D spatial visualization.
            </p>
          </div>

          {/* Executive Creator Showcase Cards: Ariston Dsouza & Allwyn Bernard */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Card 1: Ariston Dsouza */}
            <div className="relative rounded-2xl border border-[#D4AF37]/60 bg-[#0B0C10]/85 p-7 flex flex-col justify-between space-y-6 shadow-xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <RoleAvatar name="Ariston Dsouza" role="developer" size="lg" />
                  <span className="text-xs font-mono-tabular uppercase tracking-widest text-[#D4AF37] border border-[#D4AF37]/40 px-3 py-1 rounded">
                    Original Creator & Lead Developer
                  </span>
                </div>

                <div>
                  <h4 className="text-2xl font-display font-bold text-[#F9F9F9]">
                    Ariston Dsouza
                  </h4>
                  <div className="text-xs text-[#EF4444] font-semibold tracking-wider uppercase mt-0.5">
                    Principal Full-Stack Architect · Systems & 3D Spatial Engine
                  </div>
                </div>

                <p className="text-xs text-[#F9F9F9]/75 leading-relaxed">
                  Spearheaded the multi-tenant isolation protocol, real-time
                  Emergency SOS broadcast architecture, Three.js procedural
                  architectural twin pipeline, and executive luxury design
                  system across Pune’s flagship towers.
                </p>
              </div>

              <div className="pt-4 border-t border-[#D4AF37]/25 flex items-center justify-between text-xs font-mono-tabular text-[#D4AF37]">
                <span>Clearance: Level-0 Red Ring</span>
                <span>Signature: AD · 2026</span>
              </div>
            </div>

            {/* Card 2: Allwyn Bernard */}
            <div className="relative rounded-2xl border border-[#D4AF37]/60 bg-[#0B0C10]/85 p-7 flex flex-col justify-between space-y-6 shadow-xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <RoleAvatar name="Allwyn Bernard" role="developer" size="lg" />
                  <span className="text-xs font-mono-tabular uppercase tracking-widest text-[#D4AF37] border border-[#D4AF37]/40 px-3 py-1 rounded">
                    Original Creator & Lead Developer
                  </span>
                </div>

                <div>
                  <h4 className="text-2xl font-display font-bold text-[#F9F9F9]">
                    Allwyn Bernard
                  </h4>
                  <div className="text-xs text-[#EF4444] font-semibold tracking-wider uppercase mt-0.5">
                    Principal Backend & Security Architect · Governance & Gate
                    Systems
                  </div>
                </div>

                <p className="text-xs text-[#F9F9F9]/75 leading-relaxed">
                  Architected the role-based security hierarchy, 7-member
                  Managing Committee rotation state machine, 6-digit gate pass
                  verification ledger, and cross-society media validation
                  pipeline.
                </p>
              </div>

              <div className="pt-4 border-t border-[#D4AF37]/25 flex items-center justify-between text-xs font-mono-tabular text-[#D4AF37]">
                <span>Clearance: Level-0 Red Ring</span>
                <span>Signature: AB · 2026</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
