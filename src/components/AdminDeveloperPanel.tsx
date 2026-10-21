import React, { useState } from 'react';
import { Apartment, Profile, UserRole } from '../types/community';
import {
  assignCommitteeTitles,
  canApproveApartmentMember,
  canChangeMemberRole,
  ROLE_RING_CONFIG,
} from '../utils/communityRules';
import { RoleAvatar } from './LuxuryCrest';
import {
  Crown,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Clock,
} from 'lucide-react';

interface AdminDeveloperPanelProps {
  apartments: Apartment[];
  profiles: Profile[];
  currentApartment: Apartment;
  currentUser: Profile;
  onVerifyResident: (profileId: string) => void;
  onUpdateProfilesBatch: (updated: Profile[]) => void;
  onCreateNewApartment: (apt: Omit<Apartment, 'id' | 'created_at'>) => void;
  onToggleCommitteeAppointment: (profileId: string, targetRole?: UserRole) => void;
}

export function AdminDeveloperPanel({
  apartments,
  profiles,
  currentApartment,
  currentUser,
  onVerifyResident,
  onUpdateProfilesBatch,
  onCreateNewApartment,
  onToggleCommitteeAppointment,
}: AdminDeveloperPanelProps) {
  const isDeveloper = currentUser.role === 'developer';
  const canManageRoles =
    currentUser.role === 'developer' ||
    currentUser.role === 'admin';

  // Filter profiles in current apartment
  const aptProfiles = profiles.filter(
    (p) => p.apartment_id === currentApartment.id
  );
  // Developers can approve pending members across all apartments; Apartment Admins see their apartment's pending members
  const pendingResidents = isDeveloper
    ? profiles.filter((p) => !p.is_verified)
    : aptProfiles.filter((p) => !p.is_verified);

  const committeePool = aptProfiles.filter(
    (p) => p.role === 'admin' || p.role === 'committee'
  );

  // Search filter for Member Role Management
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [roleUpdateNotice, setRoleUpdateNotice] = useState<string | null>(null);
  const [approvalNotice, setApprovalNotice] = useState<string | null>(null);

  const filteredMemberRoster = aptProfiles.filter((p) => {
    if (!roleSearchQuery.trim()) return true;
    const q = roleSearchQuery.toLowerCase();
    return (
      p.full_name.toLowerCase().includes(q) ||
      p.flat_no.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q)
    );
  });

  // Committee Role Switcher State (Chairman, Secretary, Treasurer among up to 7 members)
  const currentChair =
    committeePool.find((p) => p.admin_title === 'Chairman')?.id ||
    committeePool[0]?.id ||
    '';
  const currentSec =
    committeePool.find((p) => p.admin_title === 'Secretary')?.id ||
    committeePool[1]?.id ||
    '';
  const currentTreas =
    committeePool.find((p) => p.admin_title === 'Treasurer')?.id ||
    committeePool[2]?.id ||
    '';

  const [chairId, setChairId] = useState(currentChair);
  const [secId, setSecId] = useState(currentSec);
  const [treasId, setTreasId] = useState(currentTreas);
  const [committeeFeedback, setCommitteeFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Developer: Add New Pune Luxury Apartment State
  const [newAptName, setNewAptName] = useState('');
  const [newAptLocation, setNewAptLocation] = useState('');
  const [newAptMaxHouses, setNewAptMaxHouses] = useState('350');
  const [aptFeedback, setAptFeedback] = useState<string | null>(null);

  const handleRotateTitles = (e: React.FormEvent) => {
    e.preventDefault();
    setCommitteeFeedback(null);

    const result = assignCommitteeTitles(profiles, currentApartment.id, {
      Chairman: chairId,
      Secretary: secId,
      Treasurer: treasId,
    });

    if (result.error) {
      setCommitteeFeedback({ type: 'error', text: result.error });
      return;
    }

    onUpdateProfilesBatch(result.updatedProfiles);
    setCommitteeFeedback({
      type: 'success',
      text: `Executive titles (Chairman, Secretary, Treasurer) successfully rotated across the ${committeePool.length}-member committee of ${currentApartment.name}.`,
    });
  };

  const handleAddApartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAptName.trim() || !newAptLocation.trim()) return;

    onCreateNewApartment({
      name: newAptName.trim(),
      location: newAptLocation.trim(),
      max_houses: Math.max(84, Number(newAptMaxHouses) || 300),
      model_3d_url: 'procedural://new-pune-estate',
      custom_model_spec: {
        fileName: `${newAptName.toLowerCase().replace(/\s+/g, '_')}_master.glb`,
        extractedFiles: ['estate_towers.glb', 'champagne_trim.bin'],
        format: 'glb',
        uploadedAt: new Date().toISOString(),
        towerCount: 2,
        floors: 30,
        facadeStyle: 'obsidian-gold',
      },
    });

    setAptFeedback(
      `Provisioned new luxury society "${newAptName.trim()}" into the Pune multi-tenant network.`
    );
    setNewAptName('');
    setNewAptLocation('');
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-[#141821] border border-[#D4AF37]/30 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#D4AF37] uppercase tracking-widest">
            <Crown className="w-4 h-4" />
            <span>
              {isDeveloper
                ? 'Lead System Developer & Estate Command'
                : 'Managing Committee & Admin Executive Console'}
            </span>
          </div>
          <h2 className="text-2xl font-display font-semibold text-[#F9F9F9] mt-1">
            {currentApartment.name} Governance &amp; Entry Approval Console
          </h2>
          <p className="text-xs text-[#F9F9F9]/65 mt-0.5">
            New &amp; transferring members remain in &ldquo;Wait for Admin
            Access&rdquo; status until the particular Admin of their apartment
            or a Lead Developer approves their residence entry.
          </p>
        </div>
      </div>

      {/* SECTION 1: NEW & TRANSFERRED MEMBER ENTRY APPROVAL ("WAIT FOR ADMIN ACCESS" QUEUE — APARTMENT ADMIN & DEVELOPER) */}
      <div className="bg-[#141821] border border-[#D4AF37]/45 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#D4AF37]">
              <Clock className="w-4 h-4" />
              <span>
                Apartment Admin &amp; Developer Entry Gate ·{' '}
                {isDeveloper
                  ? 'All 7 Pune Estates (Developer View)'
                  : currentApartment.name}
              </span>
            </div>
            <h3 className="text-xl font-display font-semibold text-[#F9F9F9] mt-1">
              Pending Member &amp; Transfer Approvals ({pendingResidents.length}{' '}
              Waiting for Admin Access)
            </h3>
            <p className="text-xs text-[#F9F9F9]/65 mt-0.5">
              The particular{' '}
              <span className="text-[#10B981] font-medium">
                Admin of the Apartment
              </span>{' '}
              and the{' '}
              <span className="text-[#EF4444] font-medium">
                Developer Role
              </span>{' '}
              can approve pending resident registrations and apartment transfers. New residents must register their own accounts before approval.
            </p>
          </div>
        </div>

        {approvalNotice && (
          <div className="p-3 rounded-lg bg-[#10B981]/15 border border-[#10B981]/40 text-xs text-[#10B981] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{approvalNotice}</span>
          </div>
        )}

        {pendingResidents.length === 0 ? (
          <p className="text-xs text-[#F9F9F9]/60 p-4 rounded-lg bg-[#0B0C10] border border-white/5">
            All registered Family Heads have been approved. No members are
            currently waiting for Admin Access.
          </p>
        ) : (
          <div className="space-y-3">
            {pendingResidents.map((res) => {
              const canApprove = canApproveApartmentMember(currentUser, res);
              const memberAptName =
                apartments.find((a) => a.id === res.apartment_id)?.name ||
                currentApartment.name;
              const fromAptName = res.transferred_from_apartment_id
                ? apartments.find(
                    (a) => a.id === res.transferred_from_apartment_id
                  )?.name
                : null;

              return (
                <div
                  key={res.id}
                  className="p-4 rounded-lg bg-[#0B0C10] border border-[#D4AF37]/35 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <RoleAvatar
                      name={res.full_name}
                      role={res.role}
                      size="sm"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[#F9F9F9]">
                          {res.full_name}
                        </span>
                        <span className="text-[10px] font-mono-tabular uppercase px-2 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37]">
                          Wait for Admin Access
                        </span>
                        {fromAptName && (
                          <span className="text-[10px] font-mono-tabular uppercase px-2 py-0.5 rounded bg-[#3B82F6]/20 text-[#3B82F6]">
                            Apartment Transfer: {fromAptName} &rarr;{' '}
                            {memberAptName}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#F9F9F9]/65 font-mono-tabular mt-0.5">
                        {memberAptName} · Residence {res.flat_no} · {res.email}
                      </div>
                    </div>
                  </div>

                  {canApprove ? (
                    <button
                      type="button"
                      onClick={() => {
                        onVerifyResident(res.id);
                        setApprovalNotice(
                          `Approved entry for ${res.full_name} (Flat ${res.flat_no}) in ${memberAptName} (${
                            isDeveloper ? 'Developer Authority' : 'Admin Approval'
                          }). Their "Wait for Admin Access" lock has been lifted.`
                        );
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#10B981] hover:bg-[#059669] text-[#0B0C10] font-semibold text-xs cursor-pointer transition-colors"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>
                        Allow Entry to {memberAptName} (
                        {isDeveloper ? 'Developer / Admin Approval' : 'Admin Approval'})
                      </span>
                    </button>
                  ) : (
                    <span className="text-xs font-mono-tabular text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-3 py-1.5 rounded-lg">
                      Only {memberAptName} Admin or Developer Can Approve Entry
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* SECTION 2: MEMBER ROLE MANAGEMENT (SHARED BY ADMINS & DEVELOPERS) */}
      {canManageRoles && (
        <div className="bg-[#141821] border border-[#10B981]/35 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#10B981]">
                <ShieldCheck className="w-4 h-4" />
                <span>Admin &amp; Developer Role Assignment Authority</span>
              </div>
              <h3 className="text-xl font-display font-semibold text-[#F9F9F9] mt-1">
                Change Member Role / Promote Resident to Admin (
                {currentApartment.name})
              </h3>
              <p className="text-xs text-[#F9F9F9]/65 mt-0.5">
                New registrations start as pending Residents. Admins and Developers can change approved members to Resident or Admin / Committee. Only the apartment Admin can assign Gate Security.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#D4AF37] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={roleSearchQuery}
                onChange={(e) => setRoleSearchQuery(e.target.value)}
                placeholder="Search member by name or flat..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0B0C10] border border-white/15 focus:border-[#D4AF37] text-xs text-[#F9F9F9] outline-none"
              />
            </div>
          </div>

          {roleUpdateNotice && (
            <div className="p-3 rounded-lg bg-[#10B981]/15 border border-[#10B981]/40 text-xs text-[#10B981] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{roleUpdateNotice}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
            {filteredMemberRoster.slice(0, 24).map((p) => {
              const isCommitteeOrAdmin =
                p.role === 'admin' || p.role === 'committee';
              const allowedToEdit = canChangeMemberRole(currentUser, p);

              return (
                <div
                  key={p.id}
                  className="p-3.5 rounded-lg bg-[#0B0C10] border border-white/10 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <RoleAvatar name={p.full_name} role={p.role} size="sm" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#F9F9F9] truncate">
                        {p.full_name}
                      </div>
                      <div className="text-[11px] text-[#F9F9F9]/60 font-mono-tabular truncate">
                        Flat {p.flat_no} · {ROLE_RING_CONFIG[p.role].label}
                      </div>
                    </div>
                  </div>

                  {allowedToEdit && p.role !== 'developer' && (
                    <div className="flex items-center gap-2">
                      <select
                        aria-label={`Change role for ${p.full_name}`}
                        value={
                          isCommitteeOrAdmin
                            ? 'admin'
                            : p.role === 'security'
                              ? 'security'
                              : 'resident'
                        }
                        onChange={(e) => {
                          const nextRole = e.target.value as UserRole;
                          onToggleCommitteeAppointment(p.id, nextRole);
                          setRoleUpdateNotice(
                            `Updated ${p.full_name} (Flat ${p.flat_no}) role to ${ROLE_RING_CONFIG[nextRole].label}.`
                          );
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-[#141821] border border-[#D4AF37]/40 text-xs text-[#F9F9F9] outline-none cursor-pointer"
                      >
                        <option value="resident">
                          Resident (Blue Ring - Default)
                        </option>
                        <option value="admin">
                          Admin / Committee (Green Ring)
                        </option>
                        <option value="security" disabled={currentUser.role !== 'admin'}>
                          Gate Security (Gray Ring — Admin Only)
                        </option>
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: 7-MEMBER COMMITTEE ROLE SWITCHER (CHAIRMAN, SECRETARY, TREASURER) */}
      <div className="bg-[#141821] border border-white/10 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-display font-semibold text-[#F9F9F9]">
              Committee Title Switcher ({committeePool.length} / 7 Committee
              Seats Active)
            </h3>
            <p className="text-xs text-[#F9F9F9]/65 mt-0.5">
              Rotate the 3 active Executive Admin titles (Chairman, Secretary,
              Treasurer) among the verified committee members of{' '}
              {currentApartment.name}.
            </p>
          </div>
        </div>

        {committeeFeedback && (
          <div
            className={`p-3.5 rounded-lg border text-xs flex items-center gap-2 ${
              committeeFeedback.type === 'success'
                ? 'bg-[#10B981]/15 border-[#10B981]/40 text-[#10B981]'
                : 'bg-[#EF4444]/15 border-[#EF4444]/50 text-[#EF4444]'
            }`}
          >
            {committeeFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{committeeFeedback.text}</span>
          </div>
        )}

        {committeePool.length >= 3 ? (
          <form
            onSubmit={handleRotateTitles}
            className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-4 rounded-xl bg-[#0B0C10]/80 border border-[#D4AF37]/25"
          >
            <div>
              <label className="block text-xs font-medium text-[#D4AF37] mb-1">
                1. Active Chairman
              </label>
              <select
                value={chairId}
                onChange={(e) => setChairId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#141821] border border-white/15 text-xs text-[#F9F9F9]"
              >
                {committeePool.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.flat_no})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#D4AF37] mb-1">
                2. Active Secretary
              </label>
              <select
                value={secId}
                onChange={(e) => setSecId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#141821] border border-white/15 text-xs text-[#F9F9F9]"
              >
                {committeePool.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.flat_no})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#D4AF37] mb-1">
                3. Active Treasurer
              </label>
              <select
                value={treasId}
                onChange={(e) => setTreasId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#141821] border border-white/15 text-xs text-[#F9F9F9]"
              >
                {committeePool.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.flat_no})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#D4AF37] hover:bg-[#e3be42] text-[#0B0C10] font-semibold text-xs cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Transfer Active Titles</span>
            </button>
          </form>
        ) : (
          <div className="text-xs text-[#F9F9F9]/60 p-4 rounded-lg bg-[#0B0C10]">
            Appoint at least 3 committee/admin members in this society above to
            rotate Chairman, Secretary, and Treasurer titles.
          </div>
        )}

        {/* Current Committee Members Display */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {committeePool.map((member) => (
            <div
              key={member.id}
              className="p-3.5 rounded-lg bg-[#0B0C10]/60 border border-[#10B981]/30 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <RoleAvatar
                  name={member.full_name}
                  role={member.role}
                  size="sm"
                />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#F9F9F9] truncate">
                    {member.full_name}
                  </div>
                  <div className="text-[11px] font-mono-tabular text-[#10B981]">
                    {member.admin_title
                      ? `Active ${member.admin_title}`
                      : 'Admin / Committee'}
                    {' · '}
                    {member.flat_no}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 4: DEVELOPER-EXCLUSIVE SYSTEM CONTROLS (ADD NEW PUNE APARTMENTS) */}
      {isDeveloper && (
        <div className="bg-[#141821] border border-[#EF4444]/50 rounded-xl p-6 space-y-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-[#EF4444] font-semibold">
              Developer-Exclusive System Controls (Red Ring Authority)
            </div>
            <h3 className="text-xl font-display font-semibold text-[#F9F9F9] mt-1">
              Provision New Pune Apartment Society
            </h3>
          </div>

          {aptFeedback && (
            <div className="p-3 rounded-lg bg-[#10B981]/15 border border-[#10B981]/40 text-xs text-[#10B981]">
              {aptFeedback}
            </div>
          )}

          {/* Create New Apartment Form */}
          <form
            onSubmit={handleAddApartment}
            className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end p-4 rounded-xl bg-[#0B0C10] border border-white/10"
          >
            <div>
              <label className="block text-xs text-[#F9F9F9]/75 mb-1">
                Society Name
              </label>
              <input
                type="text"
                value={newAptName}
                onChange={(e) => setNewAptName(e.target.value)}
                placeholder="e.g., Ritz-Carlton Residences"
                className="w-full px-3 py-2 rounded-lg bg-[#141821] border border-white/15 text-xs text-[#F9F9F9]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#F9F9F9]/75 mb-1">
                Pune Micro-Market Location
              </label>
              <input
                type="text"
                value={newAptLocation}
                onChange={(e) => setNewAptLocation(e.target.value)}
                placeholder="e.g., Koregaon Park, Pune"
                className="w-full px-3 py-2 rounded-lg bg-[#141821] border border-white/15 text-xs text-[#F9F9F9]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#F9F9F9]/75 mb-1">
                Max Residences (84–1,000+)
              </label>
              <input
                type="number"
                min={84}
                max={2000}
                value={newAptMaxHouses}
                onChange={(e) => setNewAptMaxHouses(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#141821] border border-white/15 text-xs text-[#F9F9F9] font-mono-tabular"
              />
            </div>
            <button
              type="submit"
              className="py-2 px-4 rounded-lg bg-[#EF4444] hover:bg-[#dc2626] text-white font-semibold text-xs cursor-pointer whitespace-nowrap"
            >
              + Add Luxury Society
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
