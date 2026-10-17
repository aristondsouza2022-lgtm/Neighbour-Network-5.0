import React, { useState } from 'react';
import {
  Apartment,
  ComplaintTicket,
  EmergencySOS,
  Profile,
} from '../types/community';
import {
  canResolveSOS,
  filterByApartmentScope,
} from '../utils/communityRules';
import {
  Siren,
  ShieldAlert,
  CheckCircle2,
  Wrench,
  Plus,
  Lock,
} from 'lucide-react';

interface EmergencyAndHelpdeskProps {
  sosAlerts: EmergencySOS[];
  complaints: ComplaintTicket[];
  profiles: Profile[];
  currentApartment: Apartment;
  currentUser: Profile;
  onTriggerSOS: (
    emergencyType: EmergencySOS['emergency_type'],
    reason: string
  ) => void;
  onResolveSOS: (sosId: string) => void;
  onCreateComplaint: (
    ticket: Omit<ComplaintTicket, 'id' | 'created_at' | 'status'>
  ) => void;
  onUpdateComplaintStatus: (
    ticketId: string,
    status: ComplaintTicket['status']
  ) => void;
}

export function EmergencyAndHelpdesk({
  sosAlerts,
  complaints,
  profiles,
  currentApartment,
  currentUser,
  onTriggerSOS,
  onResolveSOS,
  onCreateComplaint,
  onUpdateComplaintStatus,
}: EmergencyAndHelpdeskProps) {
  const [emergencyType, setEmergencyType] =
    useState<EmergencySOS['emergency_type']>('Medical Critical');
  const [sosReason, setSosReason] = useState('');

  // Complaint Form State
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [cmpCategory, setCmpCategory] =
    useState<ComplaintTicket['category']>('Plumbing & Hydro');
  const [cmpTitle, setCmpTitle] = useState('');
  const [cmpDesc, setCmpDesc] = useState('');

  const aptSosList = filterByApartmentScope(sosAlerts, currentApartment.id);
  const activeSosList = aptSosList.filter((s) => s.is_active);
  const aptComplaints = filterByApartmentScope(complaints, currentApartment.id);

  const handleSOSDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason =
      sosReason.trim() ||
      `Immediate ${emergencyType} response requested at Residence ${currentUser.flat_no}.`;
    onTriggerSOS(emergencyType, finalReason);
    setSosReason('');
  };

  const handleComplaintSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmpTitle.trim()) return;
    onCreateComplaint({
      apartment_id: currentApartment.id,
      author_id: currentUser.id,
      flat_no: currentUser.flat_no,
      category: cmpCategory,
      title: cmpTitle.trim(),
      description:
        cmpDesc.trim() ||
        'Reported via Neighbour Network Concierge Board for immediate inspection.',
    });
    setCmpTitle('');
    setCmpDesc('');
    setShowComplaintForm(false);
  };

  return (
    <div className="space-y-8">
      {/* SECTION 1: EMERGENCY SOS REAL-TIME BROADCAST SYSTEM */}
      <div className="bg-[#141821] border border-[#EF4444]/50 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#EF4444] uppercase tracking-widest font-semibold">
              <Siren className="w-4 h-4" />
              <span>
                Real-Time Single-Apartment SOS Broadcast · {currentApartment.name}
              </span>
            </div>
            <h2 className="text-2xl font-display font-semibold text-[#F9F9F9] mt-1">
              Emergency Rapid Response Command
            </h2>
            <p className="text-xs text-[#F9F9F9]/70 mt-0.5 max-w-2xl">
              Triggering an SOS activates a persistent pulsing crimson alert
              across the screens of all verified Family Heads and Managing
              Committee Admins in {currentApartment.name}. It can only be stood
              down by an Apartment Admin or the triggering household.
            </p>
          </div>
        </div>

        {/* SOS Trigger Form */}
        <form
          onSubmit={handleSOSDispatch}
          className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 rounded-xl bg-[#0B0C10]/90 border border-[#EF4444]/30"
        >
          <div className="md:col-span-4">
            <label className="block text-[11px] uppercase tracking-wider text-[#F9F9F9]/60 mb-1">
              Emergency Classification
            </label>
            <select
              value={emergencyType}
              onChange={(e) =>
                setEmergencyType(
                  e.target.value as EmergencySOS['emergency_type']
                )
              }
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#141821] border border-white/15 text-sm text-[#F9F9F9] outline-none focus:border-[#EF4444]"
            >
              <option value="Medical Critical">Medical Critical</option>
              <option value="Fire Emergency">Fire Emergency</option>
              <option value="Security Breach">Security Breach</option>
              <option value="Structural / Lift Entrapment">
                Structural / Lift Entrapment
              </option>
            </select>
          </div>

          <div className="md:col-span-5">
            <label className="block text-[11px] uppercase tracking-wider text-[#F9F9F9]/60 mb-1">
              Location / Situation Brief (Flat {currentUser.flat_no})
            </label>
            <input
              type="text"
              value={sosReason}
              onChange={(e) => setSosReason(e.target.value)}
              placeholder={`e.g., Immediate paramedic team required at Flat ${currentUser.flat_no}`}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#141821] border border-white/15 text-sm text-[#F9F9F9] outline-none focus:border-[#EF4444]"
            />
          </div>

          <div className="md:col-span-3 flex items-end">
            <button
              type="submit"
              data-testid="trigger-sos-btn"
              className="w-full py-2.5 px-4 rounded-lg bg-[#EF4444] hover:bg-[#dc2626] text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Trigger Emergency SOS</span>
            </button>
          </div>
        </form>

        {/* Active & Historical SOS Log for Current Apartment */}
        <div className="space-y-3">
          <div className="text-xs font-mono-tabular uppercase tracking-wider text-[#F9F9F9]/60">
            {activeSosList.length > 0
              ? `Active Emergency Broadcasts (${activeSosList.length})`
              : 'Recent SOS Audit Log'}
          </div>

          {aptSosList.map((sos) => {
            const userCanResolve = canResolveSOS(sos, currentUser);
            return (
              <div
                key={sos.id}
                className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${
                  sos.is_active
                    ? 'bg-[#EF4444]/15 border-[#EF4444]'
                    : 'bg-[#0B0C10]/60 border-white/10'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono-tabular">
                    <span
                      className={`font-bold uppercase ${
                        sos.is_active ? 'text-[#EF4444]' : 'text-[#10B981]'
                      }`}
                    >
                      {sos.is_active ? 'ACTIVE SOS ALERT' : 'RESOLVED'}
                    </span>
                    <span>·</span>
                    <span className="text-[#D4AF37]">
                      Residence {sos.flat_no}
                    </span>
                    <span>·</span>
                    <span>{sos.emergency_type}</span>
                  </div>
                  <div className="text-sm font-semibold text-[#F9F9F9] mt-1">
                    {sos.reason}
                  </div>
                  <div className="text-xs text-[#F9F9F9]/60 mt-0.5 font-mono-tabular">
                    Triggered by {sos.triggered_by_name}
                    {sos.resolved_by_name
                      ? ` · Resolved by ${sos.resolved_by_name}`
                      : ''}
                  </div>
                </div>

                {sos.is_active && (
                  <div>
                    {userCanResolve ? (
                      <button
                        type="button"
                        onClick={() => onResolveSOS(sos.id)}
                        className="px-4 py-2 rounded-lg bg-[#10B981] text-[#0B0C10] font-bold text-xs cursor-pointer whitespace-nowrap"
                      >
                        Mark Resolved & Stand Down
                      </button>
                    ) : (
                      <span className="text-xs text-[#EF4444] font-mono-tabular">
                        Awaiting Admin or Flat {sos.flat_no} Resolution
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: COMPLAINTS & NEIGHBOR HELPDESK (SINGLE-APARTMENT SCOPE) */}
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[#141821] border border-[#D4AF37]/30 rounded-xl p-5">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#D4AF37] uppercase tracking-widest">
              <Lock className="w-3.5 h-3.5" />
              <span>Apartment-Locked Helpdesk · {currentApartment.name}</span>
            </div>
            <h2 className="text-2xl font-display font-semibold text-[#F9F9F9] mt-1">
              Complaints, Engineering & Neighbor Assistance Board
            </h2>
            <p className="text-xs text-[#F9F9F9]/65 mt-0.5">
              Transparent issue tracking across Plumbing, Valet Parking, and
              Neighbor Help exclusively for {currentApartment.name}.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowComplaintForm((prev) => !prev)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#D4AF37] text-[#0B0C10] font-semibold text-xs cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Log Issue / Request Help</span>
          </button>
        </div>

        {showComplaintForm && (
          <form
            onSubmit={handleComplaintSubmit}
            className="bg-[#141821] border border-[#D4AF37]/50 rounded-xl p-5 space-y-4"
          >
            <h3 className="text-lg font-display font-semibold text-[#F9F9F9]">
              New Helpdesk Ticket — Residence {currentUser.flat_no}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-[#F9F9F9]/75 mb-1">
                  Category
                </label>
                <select
                  value={cmpCategory}
                  onChange={(e) =>
                    setCmpCategory(
                      e.target.value as ComplaintTicket['category']
                    )
                  }
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0B0C10] border border-white/15 text-sm text-[#F9F9F9]"
                >
                  <option value="Plumbing & Hydro">Plumbing & Hydro</option>
                  <option value="Valet & Parking">Valet & Parking</option>
                  <option value="Electrical & HVAC">Electrical & HVAC</option>
                  <option value="Acoustic / Noise">Acoustic / Noise</option>
                  <option value="Concierge & Neighbor Help">
                    Concierge & Neighbor Help
                  </option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-[#F9F9F9]/75 mb-1">
                  Subject / Summary
                </label>
                <input
                  type="text"
                  value={cmpTitle}
                  onChange={(e) => setCmpTitle(e.target.value)}
                  placeholder="e.g., Water pipe pressure drop or wrong parking in Bay B2"
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0B0C10] border border-white/15 text-sm text-[#F9F9F9]"
                />
              </div>
            </div>
            <textarea
              rows={2}
              value={cmpDesc}
              onChange={(e) => setCmpDesc(e.target.value)}
              placeholder="Provide exact bay number, wing, or assistance needed..."
              className="w-full px-3.5 py-2 rounded-lg bg-[#0B0C10] border border-white/15 text-sm text-[#F9F9F9]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowComplaintForm(false)}
                className="px-4 py-2 text-xs text-[#F9F9F9]/70 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-[#D4AF37] text-[#0B0C10] font-semibold text-xs cursor-pointer"
              >
                Submit to Society Board
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {aptComplaints.map((ticket) => {
            const author = profiles.find((p) => p.id === ticket.author_id);
            return (
              <div
                key={ticket.id}
                className="bg-[#141821] border border-white/10 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular text-[#F9F9F9]/60">
                    <span className="text-[#D4AF37]">{ticket.category}</span>
                    <span>·</span>
                    <span>Residence {ticket.flat_no}</span>
                    <span>·</span>
                    <span>{author?.full_name || 'Verified Resident'}</span>
                  </div>
                  <h3 className="text-lg font-display font-semibold text-[#F9F9F9]">
                    {ticket.title}
                  </h3>
                  <p className="text-xs text-[#F9F9F9]/75 leading-relaxed">
                    {ticket.description}
                  </p>
                </div>

                {/* Status Progression Controls */}
                <div className="flex items-center gap-1.5 bg-[#0B0C10] p-1 rounded-lg border border-white/10">
                  {(['Open', 'In Progress', 'Resolved'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => onUpdateComplaintStatus(ticket.id, st)}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        ticket.status === st
                          ? st === 'Resolved'
                            ? 'bg-[#10B981] text-[#0B0C10] font-semibold'
                            : st === 'In Progress'
                            ? 'bg-[#D4AF37] text-[#0B0C10] font-semibold'
                            : 'bg-[#EF4444] text-white font-semibold'
                          : 'text-[#F9F9F9]/60 hover:text-[#F9F9F9]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
