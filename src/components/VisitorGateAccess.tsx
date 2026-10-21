import React, { useState } from 'react';
import { Apartment, Profile, VisitorLog } from '../types/community';
import {
  calculateStayDurationMinutes,
  filterByApartmentScope,
  generateSixDigitPassCode,
} from '../utils/communityRules';
import { LuxuryCrestLogo } from './LuxuryCrest';
import {
  ShieldCheck,
  QrCode,
  Car,
  Clock,
  LogIn,
  LogOut,
  Plus,
  Lock,
} from 'lucide-react';

interface VisitorGateAccessProps {
  logs: VisitorLog[];
  currentApartment: Apartment;
  currentUser: Profile;
  onPreBookVisitor: (
    entry: Omit<
      VisitorLog,
      'id' | 'created_at' | 'status' | 'entry_time' | 'exit_time' | 'duration_minutes'
    >
  ) => void;
  onApproveEntryAtGate: (
    logId: string,
    vehicleNo: string,
    newSixDigitCode: string
  ) => void;
  onMarkExitAtGate: (logId: string) => void;
}

export function VisitorGateAccess({
  logs,
  currentApartment,
  currentUser,
  onPreBookVisitor,
  onApproveEntryAtGate,
  onMarkExitAtGate,
}: VisitorGateAccessProps) {
  const [visitorName, setVisitorName] = useState('');
  const [visitorType, setVisitorType] =
    useState<VisitorLog['visitor_type']>('guest');
  const [companyOrRelation, setCompanyOrRelation] = useState('');
  const [expectedTime, setExpectedTime] = useState(() =>
    new Date(Date.now() + 60 * 60 * 1000 - new Date().getTimezoneOffset() * 60 * 1000)
      .toISOString()
      .slice(0, 16)
  );
  const [vehicleInputMap, setVehicleInputMap] = useState<
    Record<string, string>
  >({});

  // Strictly isolated to current apartment
  const aptLogs = filterByApartmentScope(logs, currentApartment.id);

  const handleCreatePass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim()) return;

    onPreBookVisitor({
      apartment_id: currentApartment.id,
      resident_id: currentUser.id,
      flat_no: currentUser.flat_no,
      visitor_name: visitorName.trim(),
      visitor_type: visitorType,
      company_or_relation:
        companyOrRelation.trim() ||
        (visitorType === 'guest' ? 'Personal Guest' : 'Priority Concierge Delivery'),
      expected_time: new Date(expectedTime).toISOString(),
      vehicle_no: null,
      pass_code: generateSixDigitPassCode(),
    });

    setVisitorName('');
    setCompanyOrRelation('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#141821] border border-[#D4AF37]/30 rounded-xl p-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#D4AF37] uppercase tracking-widest">
            <Lock className="w-3.5 h-3.5" />
            <span>
              Apartment-Locked Perimeter Protocol · {currentApartment.name}
            </span>
          </div>
          <h2 className="text-2xl font-display font-semibold text-[#F9F9F9] mt-1">
            Visitor Access Cards & Gate Security Verification
          </h2>
          <p className="text-xs text-[#F9F9F9]/65 mt-0.5">
            Residents pre-book guests to generate digital Visiting Access Cards.
            Gate Security verifies Flat No., logs Vehicle Registration, issues a
            6-digit code on entry, and calculates stay duration upon exit.
          </p>
        </div>

        <div className="text-xs font-mono-tabular text-[#D4AF37] bg-[#0B0C10] px-3.5 py-2 rounded-lg border border-[#D4AF37]/30">
          Inside Premises Now:{' '}
          {aptLogs.filter((l) => l.status === 'inside').length} Active Passes
        </div>
      </div>

      {/* Resident Pre-Booking Form */}
      <form
        onSubmit={handleCreatePass}
        className="bg-[#141821] border border-white/10 rounded-xl p-5 space-y-4"
      >
        <div className="text-sm font-display font-semibold text-[#D4AF37] uppercase tracking-wider">
          Resident Pre-Authorization — Issue Digital Visiting Access Card (Flat{' '}
          {currentUser.flat_no})
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-[#F9F9F9]/75 mb-1">
              Visitor / Personnel Name
            </label>
            <input
              type="text"
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              placeholder="e.g., Adar Poonawalla"
              className="w-full px-3.5 py-2 rounded-lg bg-[#0B0C10] border border-white/15 text-sm text-[#F9F9F9] outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#F9F9F9]/75 mb-1">
              Classification
            </label>
            <select
              value={visitorType}
              onChange={(e) =>
                setVisitorType(e.target.value as VisitorLog['visitor_type'])
              }
              className="w-full px-3.5 py-2 rounded-lg bg-[#0B0C10] border border-white/15 text-sm text-[#F9F9F9] outline-none focus:border-[#D4AF37]"
            >
              <option value="guest">Private Guest / Chauffeur</option>
              <option value="delivery">White-Glove Courier / Delivery</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#F9F9F9]/75 mb-1">
              Affiliation / Notes
            </label>
            <input
              type="text"
              value={companyOrRelation}
              onChange={(e) => setCompanyOrRelation(e.target.value)}
              placeholder="e.g., Family Guest / Taj Catering"
              className="w-full px-3.5 py-2 rounded-lg bg-[#0B0C10] border border-white/15 text-sm text-[#F9F9F9] outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#F9F9F9]/75 mb-1">
              Expected Arrival Window
            </label>
            <input
              type="datetime-local"
              value={expectedTime}
              onChange={(e) => setExpectedTime(e.target.value)}
              required
              className="w-full px-3.5 py-2 rounded-lg bg-[#0B0C10] border border-white/15 text-sm text-[#F9F9F9] font-mono-tabular outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#e3be42] text-[#0B0C10] font-semibold text-xs cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>Generate Digital Visiting Access Card</span>
          </button>
        </div>
      </form>

      {/* Visiting Access Cards & Gate Verification Console */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {aptLogs.map((log) => {
          const vehicleVal =
            vehicleInputMap[log.id] !== undefined
              ? vehicleInputMap[log.id]
              : log.vehicle_no || 'MH-12-LUX-0009';

          return (
            <div
              key={log.id}
              className="bg-gradient-to-br from-[#141821] to-[#0B0C10] border border-[#D4AF37]/35 rounded-xl p-5 flex flex-col justify-between space-y-4"
            >
              <div>
                {/* Top Crest & 6-Digit Verification Pass Code */}
                <div className="flex items-start justify-between gap-4 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <LuxuryCrestLogo className="w-10 h-10 shrink-0" />
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]">
                        Visiting Access Card · {currentApartment.name}
                      </div>
                      <h3 className="text-lg font-display font-semibold text-[#F9F9F9]">
                        {log.visitor_name}
                      </h3>
                      <div className="text-xs text-[#F9F9F9]/60 font-mono-tabular">
                        Host Residence: <span className="text-[#F9F9F9]">{log.flat_no}</span> ·{' '}
                        {log.visitor_type.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono-tabular">
                    <div className="text-[10px] uppercase text-[#F9F9F9]/50">
                      6-Digit Gate Key
                    </div>
                    <div className="text-xl font-bold tracking-widest text-[#D4AF37]">
                      {log.pass_code}
                    </div>
                  </div>
                </div>

                {/* Live Tracking Telemetry */}
                <div className="grid grid-cols-2 gap-3 mt-3 text-xs font-mono-tabular">
                  <div>
                    <span className="text-[#F9F9F9]/50 block">Status</span>
                    <span
                      className={`font-semibold uppercase ${
                        log.status === 'inside'
                          ? 'text-[#10B981]'
                          : log.status === 'pre_booked'
                          ? 'text-[#D4AF37]'
                          : 'text-[#9CA3AF]'
                      }`}
                    >
                      {log.status === 'inside'
                        ? 'CURRENTLY INSIDE PREMISES'
                        : log.status === 'pre_booked'
                        ? 'PRE-BOOKED / AWAITING ARRIVAL'
                        : 'EXITED & ARCHIVED'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#F9F9F9]/50 block">Vehicle No.</span>
                    <span className="text-[#F9F9F9]">
                      {log.vehicle_no || 'Pedestrian / Chauffeur Drop'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#F9F9F9]/50 block">In-time</span>
                    <span className="text-[#F9F9F9]">
                      {log.entry_time
                        ? new Date(log.entry_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                        : 'Not entered yet'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#F9F9F9]/50 block">Exit-time</span>
                    <span className="text-[#F9F9F9]">
                      {log.exit_time
                        ? new Date(log.exit_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                        : log.status === 'inside' ? 'Still inside premises' : 'Not exited yet'}
                    </span>
                  </div>

                  {log.exit_time && (
                    <div>
                      <span className="text-[#F9F9F9]/50 block">Total Duration Stayed</span>
                      <span className="text-[#D4AF37] font-semibold">
                        {log.duration_minutes} mins (Archived)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Gate Security Action Controls */}
              <div className="pt-3 border-t border-white/10">
                {log.status === 'pre_booked' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[160px]">
                      <Car className="w-3.5 h-3.5 text-[#D4AF37] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={vehicleVal}
                        onChange={(e) =>
                          setVehicleInputMap((prev) => ({
                            ...prev,
                            [log.id]: e.target.value.toUpperCase(),
                          }))
                        }
                        placeholder="Vehicle No (MH-12-...)"
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#0B0C10] border border-white/15 text-xs text-[#F9F9F9] font-mono-tabular uppercase"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onApproveEntryAtGate(
                          log.id,
                          vehicleVal,
                          log.pass_code || generateSixDigitPassCode()
                        )
                      }
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#10B981] text-[#0B0C10] font-semibold text-xs cursor-pointer whitespace-nowrap"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Verify Flat & Log Entry</span>
                    </button>
                  </div>
                )}

                {log.status === 'inside' && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-[#10B981] font-mono-tabular">
                      Verified Inside {currentApartment.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => onMarkExitAtGate(log.id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#0B0C10] font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Mark Exit & Calculate Duration</span>
                    </button>
                  </div>
                )}

                {log.status === 'exited' && (
                  <div className="text-xs text-[#F9F9F9]/50 font-mono-tabular flex items-center justify-between">
                    <span>Gate Pass Archived</span>
                    <span>Stay Duration: {log.duration_minutes} Minutes</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
