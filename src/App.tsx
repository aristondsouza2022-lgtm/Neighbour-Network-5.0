/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Announcement,
  Apartment,
  CommunityPoll,
  ComplaintTicket,
  EmergencySOS,
  MaintenanceBillRecord,
  MarketplaceItem,
  Profile,
  SocialEvent,
  SocialPost,
  VisitorLog,
} from './types/community';
import {
  INITIAL_ANNOUNCEMENTS,
  INITIAL_APARTMENTS,
  INITIAL_COMPLAINTS,
  INITIAL_EVENTS,
  INITIAL_MAINTENANCE_RECORDS,
  INITIAL_MARKETPLACE_ITEMS,
  INITIAL_POLLS,
  INITIAL_PROFILES,
  INITIAL_SOCIAL_POSTS,
  INITIAL_SOS_ALERTS,
  INITIAL_VISITOR_LOGS,
} from './data/seedData';
import {
  addSocialPostWithLimit,
  calculateStayDurationMinutes,
  canManageGovernance,
  canResolveSOS,
  castPollVote,
  filterByApartmentScope,
  getActiveApartmentSOSAlerts,
  hasActiveApartmentSOS,
  MAX_SOCIAL_FEED_POSTS,
  ROLE_RING_CONFIG,
  submitMaintenanceReceipt,
  transferMemberApartment,
} from './utils/communityRules';
import { LuxuryCrestLogo, RoleAvatar } from './components/LuxuryCrest';
import { AuthPortal } from './components/AuthPortal';
import { GlobalSocialFeed } from './components/GlobalSocialFeed';
import { ApartmentMarketplace } from './components/ApartmentMarketplace';
import { MaintenanceAndBills } from './components/MaintenanceAndBills';
import { GovernanceHub } from './components/GovernanceHub';
import { EmergencyAndHelpdesk } from './components/EmergencyAndHelpdesk';
import { VisitorGateAccess } from './components/VisitorGateAccess';
import { AdminDeveloperPanel } from './components/AdminDeveloperPanel';
import { MoreMenuHub } from './components/MoreMenuHub';
import {
  Globe,
  ShoppingBag,
  Receipt,
  Vote,
  Siren,
  QrCode,
  Crown,
  Compass,
  ShieldAlert,
  CheckCircle2,
  Bell,
  Clock,
  ScrollText,
  X,
  Menu,
  LogOut,
} from 'lucide-react';

type ActiveModule =
  | 'feed'
  | 'marketplace'
  | 'maintenance-bills'
  | 'governance'
  | 'sos-helpdesk'
  | 'gate-pass'
  | 'admin-panel'
  | 'more';

export default function App() {
  // Core Multi-Tenant State (with persistent database storage for registered member emails & roles)
  const [apartments, setApartments] = useState<Apartment[]>(INITIAL_APARTMENTS);
  const [profiles, setProfiles] = useState<Profile[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('neighbour_network_profiles_v3');
        if (saved) {
          const parsed: Profile[] = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const existingIds = new Set(parsed.map((p) => p.id));
            const missingSeeds = INITIAL_PROFILES.filter(
              (seed) => !existingIds.has(seed.id)
            );
            return [...parsed, ...missingSeeds];
          }
        }
      } catch {
        // Fallback to INITIAL_PROFILES
      }
    }
    return INITIAL_PROFILES;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(
          'neighbour_network_profiles_v3',
          JSON.stringify(profiles)
        );
      } catch {
        // Ignore storage quota issues
      }
    }
  }, [profiles]);

  const [socialPosts, setSocialPosts] =
    useState<SocialPost[]>(INITIAL_SOCIAL_POSTS);
  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>(
    INITIAL_MARKETPLACE_ITEMS
  );
  const [polls, setPolls] = useState<CommunityPoll[]>(INITIAL_POLLS);
  const [events, setEvents] = useState<SocialEvent[]>(INITIAL_EVENTS);
  const [announcements, setAnnouncements] = useState<Announcement[]>(
    INITIAL_ANNOUNCEMENTS
  );
  const [sosAlerts, setSosAlerts] =
    useState<EmergencySOS[]>(INITIAL_SOS_ALERTS);
  const [complaints, setComplaints] =
    useState<ComplaintTicket[]>(INITIAL_COMPLAINTS);
  const [visitorLogs, setVisitorLogs] =
    useState<VisitorLog[]>(INITIAL_VISITOR_LOGS);
  const [maintenanceRecords, setMaintenanceRecords] = useState<
    MaintenanceBillRecord[]
  >(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem(
          'neighbour_network_maintenance_v1'
        );
        if (saved) {
          const parsed: MaintenanceBillRecord[] = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {
        // Fallback to INITIAL_MAINTENANCE_RECORDS
      }
    }
    return INITIAL_MAINTENANCE_RECORDS;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(
          'neighbour_network_maintenance_v1',
          JSON.stringify(maintenanceRecords)
        );
      } catch {
        // Ignore storage quota issues
      }
    }
  }, [maintenanceRecords]);

  // Default to Sign-In page first; support ?autostart=1 query param for automated bypass
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return 'prof-dev-ariston';
      }
    }
    return null;
  });

  const [activeModule, setActiveModule] = useState<ActiveModule>('feed');
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showGuidelinesModal, setShowGuidelinesModal] = useState(false);
  const [showQuickSosModal, setShowQuickSosModal] = useState(false);
  const [quickSosType, setQuickSosType] =
    useState<EmergencySOS['emergency_type']>('Medical Critical');
  const [quickSosReason, setQuickSosReason] = useState(
    'Immediate emergency assistance required at residence.'
  );

  // Cross-tab BroadcastChannel for real-time SOS & state sync
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('neighbour_network_realtime');
    channel.onmessage = (event) => {
      if (event.data?.type === 'SOS_UPDATE' && event.data?.payload) {
        setSosAlerts(event.data.payload);
      }
    };
    return () => channel.close();
  }, []);

  const broadcastSOSUpdate = (updatedList: EmergencySOS[]) => {
    setSosAlerts(updatedList);
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('neighbour_network_realtime');
      channel.postMessage({ type: 'SOS_UPDATE', payload: updatedList });
      channel.close();
    }
  };

  const currentUser = useMemo(
    () => profiles.find((p) => p.id === currentUserId) || null,
    [profiles, currentUserId]
  );

  const currentApartment = useMemo(() => {
    if (!currentUser) return apartments[0];
    return (
      apartments.find((a) => a.id === currentUser.apartment_id) || apartments[0]
    );
  }, [apartments, currentUser]);

  // Active SOS alerts strictly isolated to the current user's apartment
  const activeApartmentSOS = useMemo(() => {
    if (!currentUser) return [];
    return getActiveApartmentSOSAlerts(sosAlerts, currentApartment.id);
  }, [sosAlerts, currentApartment.id, currentUser]);

  const isApartmentSOSActive = useMemo(() => {
    if (!currentUser) return false;
    return hasActiveApartmentSOS(sosAlerts, currentApartment.id);
  }, [sosAlerts, currentApartment.id, currentUser]);

  // Pending unverified members in the current apartment waiting for Admin / Developer approval
  const pendingApartmentMembers = useMemo(() => {
    if (!currentUser) return [];
    return profiles.filter(
      (p) => p.apartment_id === currentApartment.id && !p.is_verified
    );
  }, [profiles, currentApartment.id, currentUser]);

  // Particular Admins of the current apartment + Lead System Developers who can grant access
  const currentApartmentAdminsAndDevelopers = useMemo(() => {
    const aptAdmins = profiles.filter(
      (p) =>
        p.apartment_id === currentApartment.id &&
        (p.role === 'admin' || p.role === 'committee')
    );
    const developers = profiles.filter((p) => p.role === 'developer');
    return [...aptAdmins, ...developers];
  }, [profiles, currentApartment.id]);

  // Recent society announcements & events for Notifications dropdown
  const apartmentAnnouncements = useMemo(() => {
    return filterByApartmentScope(announcements, currentApartment.id);
  }, [announcements, currentApartment.id]);

  const totalNotificationCount =
    activeApartmentSOS.length +
    pendingApartmentMembers.length +
    apartmentAnnouncements.length;

  // If Gate Security logs in, restrict them to Visitor Access & Gate Verification module
  useEffect(() => {
    if (currentUser?.role === 'security' && activeModule !== 'gate-pass') {
      setActiveModule('gate-pass');
    }
  }, [currentUser, activeModule]);

  // Handlers
  const handleSignInProfile = (profile: Profile) => {
    setCurrentUserId(profile.id);
    setShowNotifications(false);
    setShowQuickSosModal(false);
    if (profile.role === 'security') {
      setActiveModule('gate-pass');
    } else {
      setActiveModule('feed');
    }
  };

  const handleRegisterProfile = (
    newOrUpdatedProfile: Profile,
    stayOnLoginStep = false
  ) => {
    setProfiles((prev) => {
      const exists = prev.some((p) => p.id === newOrUpdatedProfile.id);
      if (exists) {
        return prev.map((p) =>
          p.id === newOrUpdatedProfile.id ? newOrUpdatedProfile : p
        );
      }
      return [newOrUpdatedProfile, ...prev];
    });
    if (!stayOnLoginStep) {
      setCurrentUserId(newOrUpdatedProfile.id);
      if (newOrUpdatedProfile.role === 'security') {
        setActiveModule('gate-pass');
      } else {
        setActiveModule('feed');
      }
    }
  };

  // Shift / Transfer apartment for an existing member (sends non-developer members back to Wait for Admin Access for the new apartment)
  const handleSwitchApartmentContext = (newApartmentId: string) => {
    if (!currentUser || newApartmentId === currentUser.apartment_id) return;
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === currentUser.id
          ? transferMemberApartment(p, newApartmentId)
          : p
      )
    );
  };

  if (!currentUser) {
    return (
      <AuthPortal
        apartments={apartments}
        profiles={profiles}
        onSignInProfile={handleSignInProfile}
        onRegisterProfile={handleRegisterProfile}
      />
    );
  }

  const ringConfig = ROLE_RING_CONFIG[currentUser.role];
  const isGateSecurityOnly = currentUser.role === 'security';
  const hasAdminPanelAccess =
    currentUser.role === 'developer' ||
    currentUser.role === 'admin' ||
    currentUser.role === 'committee';

  const isWaitingForAdminApproval =
    !currentUser.is_verified && currentUser.role !== 'developer';

  const transferredFromApartmentName = currentUser.transferred_from_apartment_id
    ? apartments.find(
        (a) => a.id === currentUser.transferred_from_apartment_id
      )?.name
    : null;

  // Formal Application Guidelines Modal (Accessible from the Top Bar Guidelines Icon)
  const guidelinesModalElement = showGuidelinesModal ? (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => setShowGuidelinesModal(false)}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#141821] border-2 border-[#D4AF37]/60 shadow-[0_24px_80px_rgba(0,0,0,0.85)] p-5 md:p-6 space-y-4 text-[#F9F9F9]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#D4AF37]/25">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shrink-0">
              <ScrollText className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#D4AF37]">
                Official Community Charter &amp; Governance Protocol
              </div>
              <h2 className="text-lg md:text-xl font-display font-bold text-[#F9F9F9]">
                Neighbour Network — Application Guidelines
              </h2>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close Application Guidelines"
            onClick={() => setShowGuidelinesModal(false)}
            className="p-1.5 rounded-lg bg-[#0B0C10] border border-white/15 text-[#F9F9F9]/70 hover:text-[#D4AF37] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-snug">
          {/* Guideline 1 */}
          <div className="p-3.5 rounded-xl bg-[#0B0C10]/90 border border-[#D4AF37]/30 space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#D4AF37]">
              1. Admin &amp; Developer Entry Gate &amp; Apartment Transfers
            </div>
            <p className="text-[#F9F9F9]/80">
              <strong className="text-[#F9F9F9]">1 Account = 1 Family Head</strong>. New members receive the default <strong className="text-[#3B82F6]">Resident (Blue Ring)</strong> role and wait in <strong className="text-[#D4AF37]">Wait for Admin Access</strong> until approved by the <strong className="text-[#10B981]">particular Admin of that apartment</strong> or a <strong className="text-[#EF4444]">Developer</strong>. If an existing member shifts to a different apartment (e.g., Trump Towers &rarr; Yoo Pune), they are sent back to wait for approval from the new apartment&apos;s Admin.
            </p>
          </div>

          {/* Guideline 2 */}
          <div className="p-3.5 rounded-xl bg-[#0B0C10]/90 border border-[#D4AF37]/30 space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#D4AF37]">
              2. Multi-Tenant Data Isolation Rule
            </div>
            <p className="text-[#F9F9F9]/80">
              <strong className="text-[#F9F9F9]">Global Scope:</strong> Only the <strong className="text-[#D4AF37]">Global Social Feed</strong> is shared across all 7 Pune societies for city-wide connection.
              <br />
              <strong className="text-[#F9F9F9]">Apartment-Locked Scope:</strong> Marketplace, Polls, Events, Announcements, Emergency SOS, Helpdesk, and Gate Visitor Access are strictly isolated to your registered apartment.
            </p>
          </div>

          {/* Guideline 3 */}
          <div className="p-3.5 rounded-xl bg-[#0B0C10]/90 border border-[#D4AF37]/30 space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#D4AF37]">
              3. Role Hierarchy &amp; Avatar Ring Governance
            </div>
            <p className="text-[#F9F9F9]/80">
              • <strong className="text-[#EF4444]">Developer (Red Ring):</strong> System control, adding/approving pending members across apartments, global feed moderation &amp; 3D building uploads.
              <br />• <strong className="text-[#10B981]">Admin / Committee (Green Ring):</strong> Up to 7 members (3 active titles: Chairman, Secretary, Treasurer). Approves flat members, manages society governance &amp; resolves SOS.
              <br />• <strong className="text-[#3B82F6]">Resident (Blue Ring):</strong> Verified flat representative.
              <br />• <strong className="text-[#9CA3AF]">Gate Security (Gray Ring):</strong> Restricted to Gate Verification.
            </p>
          </div>

          {/* Guideline 4 */}
          <div className="p-3.5 rounded-xl bg-[#0B0C10]/90 border border-[#D4AF37]/30 space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#D4AF37]">
              4. Global Social Feed (10-Post FILO Limit &amp; Media)
            </div>
            <p className="text-[#F9F9F9]/80">
              The Global Social Feed holds up to <strong className="text-[#D4AF37]">10 posts maximum (FILO stack cap)</strong>—when a new post is published, the last post (#10) is permanently deleted. Members may upload photos and videos (&le; 120 seconds) from their Phone or PC. Developers moderate the global feed.
            </p>
          </div>

          {/* Guideline 5 */}
          <div className="p-3.5 rounded-xl bg-[#0B0C10]/90 border border-[#D4AF37]/30 space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#D4AF37]">
              5. Emergency SOS &amp; Gate Pass Protocol
            </div>
            <p className="text-[#F9F9F9]/80">
              The <strong className="text-[#EF4444]">Emergency SOS</strong> trigger is strictly for genuine <strong className="text-[#F9F9F9]">Medical, Fire, Security, or Lift</strong> emergencies in your apartment. Active alerts can only be resolved by an <strong className="text-[#10B981]">Admin of that apartment</strong> or the <strong className="text-[#3B82F6]">Resident who triggered the SOS</strong>. Visitors require a 6-digit Gate Pass code with automated entry/exit logs.
            </p>
          </div>

          {/* Guideline 6 */}
          <div className="p-3.5 rounded-xl bg-[#0B0C10]/90 border border-[#D4AF37]/30 space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#D4AF37]">
              6. Single-Apartment Marketplace &amp; Polling Ethics
            </div>
            <p className="text-[#F9F9F9]/80">
              Marketplace listings (<strong className="text-[#F9F9F9]">For Sale</strong>, <strong className="text-[#F9F9F9]">For Rent/Day</strong>, or <strong className="text-[#F9F9F9]">Both</strong>) are restricted to verified neighbours within the same apartment. Sellers must promptly update item badges to <strong className="text-[#F9F9F9]">Occupied</strong> or <strong className="text-[#F9F9F9]">Purchased</strong>. Each household is entitled to one formal vote per active society poll.
            </p>
          </div>
        </div>

        <div className="pt-2.5 border-t border-white/10 flex items-center justify-between gap-4">
          <span className="text-[11px] text-[#F9F9F9]/60 font-mono-tabular">
            Enforced across all 7 Pre-Loaded Pune Luxury Societies
          </span>
          <button
            type="button"
            onClick={() => setShowGuidelinesModal(false)}
            className="px-5 py-2 rounded-lg bg-[#D4AF37] text-[#0B0C10] font-semibold text-xs hover:bg-[#e3be42] cursor-pointer"
          >
            Acknowledge Guidelines
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // ===========================================================================
  // WAIT FOR ADMIN ACCESS HOLDING SCREEN (For Newly Entered or Transferred Members)
  // ===========================================================================
  if (isWaitingForAdminApproval) {
    return (
      <div className="min-h-screen flex flex-col account-purple-black-gradient bg-[linear-gradient(135deg,#05010A_0%,#4C1D95_22%,#0A0314_48%,#581C87_74%,#2E1065_88%,#040108_100%)] text-[#F9F9F9]">
        {guidelinesModalElement}
        {/* Top Header */}
        <header className="flex items-center justify-between gap-4 px-6 py-3.5 border-b border-[#D4AF37]/25 bg-[linear-gradient(90deg,rgba(7,2,14,0.94)_0%,rgba(46,16,101,0.88)_50%,rgba(7,2,14,0.94)_100%)] backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-3 text-xl font-display font-bold tracking-wider text-[#D4AF37]">
            <LuxuryCrestLogo className="w-9 h-9 shrink-0" />
            <span className="truncate">Neighbour Network</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Application Guidelines"
              onClick={() => setShowGuidelinesModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#F9F9F9] bg-[#141821] hover:bg-[#1F2833] border border-[#D4AF37]/40 rounded-lg transition-colors cursor-pointer"
              title="View Formal Application Guidelines"
            >
              <ScrollText className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Guidelines</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentUserId(null)}
              className="px-4 py-2 text-xs font-semibold text-[#0B0C10] bg-[#D4AF37] rounded-lg hover:bg-[#e3be42] transition-colors whitespace-nowrap cursor-pointer"
            >
              Switch Account / Sign Out
            </button>
          </div>
        </header>

        {/* Centered "Wait for Admin Access" Holding Gate */}
        <div className="flex-1 flex items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-2xl rounded-2xl border border-[#D4AF37]/50 bg-[#141821]/90 backdrop-blur-md p-8 shadow-[0_24px_80px_rgba(0,0,0,0.75)] space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/10">
              <div className="flex items-center gap-4">
                <RoleAvatar
                  name={currentUser.full_name}
                  role={currentUser.role}
                  size="lg"
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#D4AF37] text-xs font-mono-tabular uppercase tracking-wider">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Wait for Admin Access</span>
                    </div>
                    {transferredFromApartmentName && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#3B82F6]/20 border border-[#3B82F6]/50 text-[#3B82F6] text-xs font-mono-tabular uppercase tracking-wider">
                        <span>
                          Apartment Transfer: {transferredFromApartmentName} &rarr;{' '}
                          {currentApartment.name}
                        </span>
                      </div>
                    )}
                  </div>
                  <h1 className="text-2xl font-display font-bold text-[#F9F9F9] mt-2">
                    {currentUser.full_name}
                  </h1>
                  <p className="text-xs text-[#F9F9F9]/70 font-mono-tabular">
                    {currentApartment.name} · Residence {currentUser.flat_no} ·{' '}
                    {currentUser.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0B0C10] border border-[#D4AF37]/30 space-y-2">
              <div className="text-sm font-semibold text-[#D4AF37]">
                {transferredFromApartmentName
                  ? `Apartment Transfer Pending · Waiting for Approval from ${currentApartment.name} Admin`
                  : `Waiting for Entry Approval by ${currentApartment.name} Admin`}
              </div>
              <p className="text-xs text-[#F9F9F9]/80 leading-relaxed">
                {transferredFromApartmentName ? (
                  <>
                    You have shifted your registered apartment from{' '}
                    <span className="text-[#F9F9F9] font-semibold">
                      {transferredFromApartmentName}
                    </span>{' '}
                    to{' '}
                    <span className="text-[#D4AF37] font-semibold">
                      {currentApartment.name} (Flat {currentUser.flat_no})
                    </span>
                    . Because each Pune society is strictly isolated, transferring
                    to another apartment requires entry approval from the{' '}
                    <span className="text-[#10B981] font-semibold">
                      Admin of {currentApartment.name}
                    </span>{' '}
                    (or a{' '}
                    <span className="text-[#EF4444] font-semibold">
                      Lead Developer
                    </span>
                    ). Until then, your account displays{' '}
                    <span className="text-[#D4AF37] font-semibold">
                      Wait for Admin Access
                    </span>
                    .
                  </>
                ) : (
                  <>
                    Your membership registration for{' '}
                    <span className="text-[#F9F9F9] font-semibold">
                      Flat {currentUser.flat_no}
                    </span>{' '}
                    in{' '}
                    <span className="text-[#D4AF37] font-semibold">
                      {currentApartment.name}
                    </span>{' '}
                    has been recorded with the default{' '}
                    <span className="text-[#3B82F6] font-semibold">
                      Resident (Blue Ring)
                    </span>{' '}
                    role. Only the particular{' '}
                    <span className="text-[#10B981] font-semibold">
                      Admin of {currentApartment.name}
                    </span>{' '}
                    (or a{' '}
                    <span className="text-[#EF4444] font-semibold">
                      Lead Developer
                    </span>
                    ) can approve and allow your entry into the apartment
                    community. Until then, your account displays{' '}
                    <span className="text-[#D4AF37] font-semibold">
                      Wait for Admin Access
                    </span>
                    .
                  </>
                )}
              </p>
            </div>

            {/* Only Display the Names of the Particular Admins of This Apartment & Developers who can grant access */}
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#10B981]">
                Authorized Admin(s) of {currentApartment.name} &amp; Developers Who Can Grant Access:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentApartmentAdminsAndDevelopers.slice(0, 6).map((adm) => (
                  <div
                    key={adm.id}
                    className="p-3.5 rounded-xl bg-[#0B0C10]/80 border border-[#10B981]/35 flex items-center gap-3"
                  >
                    <RoleAvatar
                      name={adm.full_name}
                      role={adm.role}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#F9F9F9] truncate">
                        {adm.full_name}
                      </div>
                      <div
                        className={`text-[11px] font-mono-tabular truncate ${
                          adm.role === 'developer'
                            ? 'text-[#EF4444]'
                            : 'text-[#10B981]'
                        }`}
                      >
                        {adm.role === 'developer'
                          ? 'Lead System Developer'
                          : adm.admin_title || 'Society Admin'}{' '}
                        · Flat {adm.flat_no}
                      </div>
                      <div className="text-[10px] text-[#F9F9F9]/60 font-mono-tabular truncate">
                        {adm.email}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setCurrentUserId(null)}
                className="px-4 py-2 rounded-lg border border-white/20 hover:border-[#D4AF37] text-xs text-[#F9F9F9]/85 cursor-pointer"
              >
                Return to Sign In / Login Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const navItems: Array<{
    id: ActiveModule;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    scopeTag: string;
  }> = isGateSecurityOnly
    ? [
        {
          id: 'gate-pass',
          label: 'Gate Security Pass',
          icon: QrCode,
          scopeTag: 'Isolated',
        },
      ]
    : [
        {
          id: 'feed',
          label: 'Global Social Feed',
          icon: Globe,
          scopeTag: 'All Pune',
        },
        {
          id: 'marketplace',
          label: 'Marketplace',
          icon: ShoppingBag,
          scopeTag: 'Society',
        },
        {
          id: 'maintenance-bills',
          label: 'Maintenance & Bills',
          icon: Receipt,
          scopeTag: 'Society',
        },
        {
          id: 'governance',
          label: 'Polls & Events',
          icon: Vote,
          scopeTag: 'Society',
        },
        {
          id: 'sos-helpdesk',
          label: 'SOS & Helpdesk',
          icon: Siren,
          scopeTag: 'Realtime',
        },
        {
          id: 'gate-pass',
          label: 'Visitor Pass',
          icon: QrCode,
          scopeTag: 'Gate',
        },
        ...(hasAdminPanelAccess
          ? [
              {
                id: 'admin-panel' as ActiveModule,
                label: 'Admin & Dev Panel',
                icon: Crown,
                scopeTag: 'Command',
              },
            ]
          : []),
        {
          id: 'more',
          label: 'More (3D & Credits)',
          icon: Compass,
          scopeTag: '3D Twin',
        },
      ];

  return (
    <div
      data-testid="logged-in-account-shell"
      className={`min-h-screen flex flex-col account-purple-black-gradient bg-[linear-gradient(135deg,#05010A_0%,#4C1D95_22%,#0A0314_48%,#581C87_74%,#2E1065_88%,#040108_100%)] text-[#F9F9F9] relative ${
        isApartmentSOSActive ? 'sos-frame-active' : ''
      }`}
    >
      {guidelinesModalElement}

      {/* Persistent Full-Screen Red Gradient Overlay Pulse Animation (Triggers ONLY when an active SOS alert exists in the apartment) */}
      {isApartmentSOSActive && (
        <div
          data-testid="active-sos-fullscreen-overlay"
          role="region"
          aria-label={`Active Emergency SOS Alert Overlay in ${currentApartment.name}`}
          className="fixed inset-0 z-[60] pointer-events-none overflow-hidden"
        >
          {/* Primary Full-Viewport Red Radial & Vertical Gradient Pulse Layer */}
          <div className="absolute inset-0 sos-fullscreen-red-overlay" />

          {/* Secondary Top & Bottom Crimson Emergency Beacon Sweep Layer */}
          <div className="absolute inset-0 sos-fullscreen-edge-glow" />

          {/* Corner Emergency Perimeter Brackets */}
          <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-[#EF4444]" />
          <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-[#EF4444]" />
          <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-[#EF4444]" />
          <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-[#EF4444]" />
        </div>
      )}

      {/* Persistent Blinking Red Emergency SOS Alert Banner (Strictly Single-Apartment) */}
      {activeApartmentSOS.map((sos) => {
        const userCanResolve = canResolveSOS(sos, currentUser);
        return (
          <div
            key={sos.id}
            data-testid="active-sos-banner"
            className="bg-gradient-to-r from-[#991B1B] via-[#EF4444] to-[#991B1B] text-white px-6 py-3 flex flex-wrap items-center justify-between gap-4 border-b border-white/30 shadow-[0_6px_30px_rgba(239,68,68,0.55)] relative z-[65]"
          >
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <div className="text-xs md:text-sm font-semibold">
                <span className="uppercase tracking-wider font-mono-tabular">
                  [EMERGENCY SOS · {currentApartment.name.toUpperCase()} · FLAT{' '}
                  {sos.flat_no}]
                </span>{' '}
                — {sos.emergency_type}: {sos.reason} (Triggered by{' '}
                {sos.triggered_by_name})
              </div>
            </div>

            {userCanResolve ? (
              <button
                type="button"
                onClick={() => {
                  const updated = sosAlerts.map((item) =>
                    item.id === sos.id
                      ? {
                          ...item,
                          is_active: false,
                          resolved_by: currentUser.id,
                          resolved_by_name: `${currentUser.full_name} (${
                            currentUser.admin_title || currentUser.role
                          })`,
                          resolved_at: new Date().toISOString(),
                        }
                      : item
                  );
                  broadcastSOSUpdate(updated);
                }}
                className="px-4 py-1.5 rounded-lg bg-[#0B0C10] text-[#F9F9F9] hover:bg-[#141821] text-xs font-bold uppercase tracking-wider cursor-pointer whitespace-nowrap shrink-0"
              >
                Resolve & Silence Alert
              </button>
            ) : (
              <span className="text-xs font-mono-tabular bg-black/30 px-3 py-1 rounded">
                Only Society Admin or Flat {sos.flat_no} Can Silence
              </span>
            )}
          </div>
        );
      })}

      {/* 3-Zone Top Navigation Header */}
      <header className="w-full border-b border-[#D4AF37]/25 bg-[linear-gradient(90deg,rgba(7,2,14,0.94)_0%,rgba(46,16,101,0.88)_50%,rgba(7,2,14,0.94)_100%)] backdrop-blur-md sticky top-0 z-40">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-2 px-3 sm:px-6 py-2.5">
          <button type="button" aria-label="Open navigation menu" onClick={() => setMobileMenuOpen(true)} className="lg:hidden inline-flex items-center justify-center rounded-lg border border-white/15 p-2 text-[#D4AF37] shrink-0"><Menu className="w-5 h-5" /></button>
          {/* Zone 1: Brand Crest Logo + Neighbour Network */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              if (!isGateSecurityOnly) setActiveModule('feed');
            }}
            className="flex min-w-0 items-center gap-2 text-sm sm:text-lg font-display font-bold tracking-wider text-[#D4AF37] shrink"
          >
            <LuxuryCrestLogo className="w-7 h-7 shrink-0" />
            <span>Neighbour Network</span>
          </a>

          {/* Zone 2: Clean single-line text navigation links */}
          <nav
            aria-label="Primary Community Modules"
            className="hidden xl:flex items-center gap-2.5 text-[11px] font-medium text-[#F9F9F9]/75"
          >
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveModule(item.id)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                  activeModule === item.id
                    ? 'border-[#D4AF37] text-[#D4AF37] font-semibold'
                    : 'border-transparent hover:text-[#F9F9F9]'
                }`}
              >
                {item.id === 'more'
                  ? '3D & Credits'
                  : item.id === 'feed'
                  ? 'Social Feed'
                  : item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Small Emergency SOS Button + Notification Button + Guidelines Button + Switch Account */}
          <div className="relative flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Small Emergency SOS Button (Left of Notification & Switch Account) */}
            <button
              type="button"
              onClick={() => {
                setShowQuickSosModal((prev) => !prev);
                setShowNotifications(false);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-white bg-[#EF4444] hover:bg-[#dc2626] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.45)]"
              title={`Trigger Emergency SOS for ${currentApartment.name}`}
            >
              <Siren className="w-3.5 h-3.5" />
              <span>Emergency SOS</span>
            </button>

            {/* Notification Button Next to SOS */}
            <button
              type="button"
              aria-label="Society Notifications"
              onClick={() => {
                setShowNotifications((prev) => !prev);
                setShowQuickSosModal(false);
              }}
              className="relative flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-[#F9F9F9] bg-[#141821] hover:bg-[#1F2833] border border-[#D4AF37]/40 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="View Society Notifications & Pending Approvals"
            >
              <Bell className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="hidden sm:inline">Notifications</span>
              {totalNotificationCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-mono-tabular font-bold rounded-full bg-[#D4AF37] text-[#0B0C10]">
                  {totalNotificationCount}
                </span>
              )}
            </button>

            {/* Guidelines Logo Button Beside Notification Logo */}
            <button
              type="button"
              aria-label="Application Guidelines"
              onClick={() => {
                setShowGuidelinesModal(true);
                setShowNotifications(false);
                setShowQuickSosModal(false);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-[#F9F9F9] bg-[#141821] hover:bg-[#1F2833] border border-[#D4AF37]/40 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="View Formal Application Guidelines"
            >
              <ScrollText className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="hidden sm:inline">Guidelines</span>
            </button>

            {/* Switch Account / Sign Out Button */}
            <button
              type="button"
              onClick={() => setCurrentUserId(null)}
              className="px-2 py-1.5 sm:px-2.5 text-[11px] font-semibold text-[#0B0C10] bg-[#D4AF37] rounded-lg hover:bg-[#e3be42] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              aria-label="Switch account or sign out"
              title="Switch Account / Sign Out"
            >
              <span className="hidden md:inline">Switch Account / Sign Out</span><LogOut className="w-4 h-4 md:hidden" />
            </button>

          {/* Quick Emergency SOS Popover Modal */}
          {showQuickSosModal && (
            <div className="absolute right-0 top-12 w-80 sm:w-96 rounded-xl bg-[#141821] border-2 border-[#EF4444] shadow-2xl p-4 z-50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#EF4444]">
                  <Siren className="w-4 h-4" />
                  <span>Quick SOS · {currentApartment.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuickSosModal(false)}
                  className="text-[#F9F9F9]/60 hover:text-[#F9F9F9] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { value: 'Medical Critical', label: 'Medical Emergency' },
                    { value: 'Fire Emergency', label: 'Fire Emergency' },
                    { value: 'Security Breach', label: 'Security Emergency' },
                    {
                      value: 'Structural / Lift Entrapment',
                      label: 'Lift Emergency',
                    },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setQuickSosType(item.value)}
                    className={`py-1.5 px-2.5 rounded text-xs font-medium border cursor-pointer ${
                      quickSosType === item.value
                        ? 'bg-[#EF4444] text-white border-[#EF4444]'
                        : 'bg-[#0B0C10] text-[#F9F9F9]/80 border-white/15'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={quickSosReason}
                onChange={(e) => setQuickSosReason(e.target.value)}
                placeholder="Describe emergency situation..."
                className="w-full px-3 py-2 rounded-lg bg-[#0B0C10] border border-white/20 text-xs text-[#F9F9F9] outline-none"
              />

              <button
                type="button"
                onClick={() => {
                  const newSos: EmergencySOS = {
                    id: `sos-${Date.now()}`,
                    apartment_id: currentApartment.id,
                    triggered_by: currentUser.id,
                    triggered_by_name: currentUser.full_name,
                    flat_no: currentUser.flat_no,
                    emergency_type: quickSosType,
                    reason:
                      quickSosReason.trim() ||
                      `${quickSosType} emergency reported at Flat ${currentUser.flat_no}`,
                    is_active: true,
                    created_at: new Date().toISOString(),
                  };
                  broadcastSOSUpdate([newSos, ...sosAlerts]);
                  setShowQuickSosModal(false);
                }}
                className="w-full py-2.5 px-4 rounded-lg bg-[#EF4444] hover:bg-[#dc2626] text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                Broadcast SOS Alert to {currentApartment.name}
              </button>
            </div>
          )}

          {/* Society Notifications Popover */}
          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 sm:w-96 rounded-xl bg-[#141821] border border-[#D4AF37]/50 shadow-2xl p-4 z-50 space-y-3 max-h-[420px] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#D4AF37]">
                  {currentApartment.name} Notifications (
                  {totalNotificationCount})
                </div>
                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  className="text-[#F9F9F9]/60 hover:text-[#F9F9F9] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Active SOS notifications */}
              {activeApartmentSOS.map((sos) => (
                <div
                  key={sos.id}
                  onClick={() => {
                    setActiveModule('sos-helpdesk');
                    setShowNotifications(false);
                  }}
                  className="p-2.5 rounded-lg bg-[#EF4444]/20 border border-[#EF4444] text-xs cursor-pointer"
                >
                  <div className="font-bold text-[#EF4444]">
                    ACTIVE SOS · Flat {sos.flat_no} ({sos.emergency_type})
                  </div>
                  <div className="text-[#F9F9F9]/85 mt-0.5">{sos.reason}</div>
                </div>
              ))}

              {/* Pending Member Entry Approvals for Apartment Admin */}
              {pendingApartmentMembers.map((pend) => (
                <div
                  key={pend.id}
                  onClick={() => {
                    if (hasAdminPanelAccess) {
                      setActiveModule('admin-panel');
                      setShowNotifications(false);
                    }
                  }}
                  className="p-2.5 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/45 text-xs cursor-pointer"
                >
                  <div className="font-semibold text-[#D4AF37]">
                    Wait for Admin Access · New Member Pending
                  </div>
                  <div className="text-[#F9F9F9]/85 mt-0.5">
                    {pend.full_name} (Flat {pend.flat_no}) is waiting for{' '}
                    {currentApartment.name} Admin approval.
                  </div>
                </div>
              ))}

              {/* Recent Society Announcements */}
              {apartmentAnnouncements.map((ann) => (
                <div
                  key={ann.id}
                  onClick={() => {
                    setActiveModule('governance');
                    setShowNotifications(false);
                  }}
                  className="p-2.5 rounded-lg bg-[#0B0C10] border border-white/10 text-xs cursor-pointer hover:border-[#D4AF37]/40"
                >
                  <div className="font-semibold text-[#F9F9F9]">
                    {ann.title}
                  </div>
                  <div className="text-[#F9F9F9]/65 mt-0.5 line-clamp-2">
                    {ann.body}
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      </header>

      {/* Main Workspace Container (1440px Desktop Layout with Sidebar + Content Viewport) */}
      <div className="flex-1 w-full max-w-7xl mx-auto min-w-0 overflow-x-hidden px-3 sm:px-6 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Luxury Resident Identity & Society Context Sidebar */}
        {mobileMenuOpen && <button type="button" aria-label="Close navigation drawer" onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm lg:hidden" />}
        <aside className={`fixed inset-y-0 left-0 z-50 w-[min(88vw,360px)] overflow-y-auto bg-[#08040F] p-3 pt-16 shadow-2xl transition-transform duration-300 lg:static lg:z-auto lg:w-auto lg:overflow-visible lg:bg-transparent lg:p-0 lg:pt-0 lg:shadow-none lg:translate-x-0 lg:col-span-3 space-y-5 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
          {/* Active Profile Card with Glowing Role Ring */}
          <div className="bg-[#141821] border border-[#D4AF37]/35 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-3.5">
              <RoleAvatar
                name={currentUser.full_name}
                role={currentUser.role}
                size="lg"
              />
              <div className="min-w-0">
                <div
                  className={`text-[11px] font-semibold uppercase tracking-wider ${ringConfig.textClass}`}
                >
                  {currentUser.admin_title
                    ? `${currentUser.admin_title} · ${ringConfig.label}`
                    : ringConfig.label}
                </div>
                <h2 className="text-lg font-display font-bold text-[#F9F9F9] truncate">
                  {currentUser.full_name}
                </h2>
                <div className="text-xs text-[#F9F9F9]/60 font-mono-tabular">
                  Residence {currentUser.flat_no}
                </div>
              </div>
            </div>

            {/* Active Society Isolation Context & Apartment Transfer */}
            <div className="pt-3 border-t border-white/10 space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-[#D4AF37]">
                {currentUser.role === 'developer'
                  ? 'Registered Pune Estate (Developer Switch)'
                  : 'Registered Pune Estate (Shift Apartment)'}
              </div>
              <select
                aria-label="Active Apartment Society"
                value={currentApartment.id}
                onChange={(e) => handleSwitchApartmentContext(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0C10] border border-[#D4AF37]/40 text-xs text-[#F9F9F9] font-medium outline-none"
              >
                {apartments.map((apt) => (
                  <option key={apt.id} value={apt.id}>
                    {apt.name} ({apt.location.replace(', Pune', '')})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[#F9F9F9]/55 leading-relaxed">
                {currentUser.role === 'developer' ? (
                  <>
                    All modules except the Global Social Feed are strictly
                    isolated to{' '}
                    <span className="text-[#F9F9F9]">
                      {currentApartment.name}
                    </span>
                    .
                  </>
                ) : (
                  <>
                    Isolated to{' '}
                    <span className="text-[#F9F9F9]">
                      {currentApartment.name}
                    </span>
                    . Shifting to a different apartment will send you to{' '}
                    <span className="text-[#D4AF37]">Wait for Admin Access</span>{' '}
                    for that apartment&apos;s Admin approval.
                  </>
                )}
              </p>
            </div>

            {/* Role Ring Legend (Highlights Current User's Active Role — Never switches to another person's account) */}
            <div className="pt-3 border-t border-white/10 space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-[#F9F9F9]/60">
                Role Hierarchy & Avatar Rings
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div
                  className={`px-2.5 py-1.5 rounded border text-left truncate ${
                    currentUser.role === 'developer'
                      ? 'border-[#EF4444] bg-[#EF4444]/15 text-[#F9F9F9] font-semibold'
                      : 'border-white/10 text-[#EF4444]/75'
                  }`}
                >
                  Red · Developer
                </div>
                <div
                  className={`px-2.5 py-1.5 rounded border text-left truncate ${
                    currentUser.role === 'admin' ||
                    currentUser.role === 'committee'
                      ? 'border-[#10B981] bg-[#10B981]/15 text-[#F9F9F9] font-semibold'
                      : 'border-white/10 text-[#10B981]/75'
                  }`}
                >
                  Green · Admin
                </div>
                <div
                  className={`px-2.5 py-1.5 rounded border text-left truncate ${
                    currentUser.role === 'resident'
                      ? 'border-[#3B82F6] bg-[#3B82F6]/15 text-[#F9F9F9] font-semibold'
                      : 'border-white/10 text-[#3B82F6]/75'
                  }`}
                >
                  Blue · Resident
                </div>
                <div
                  className={`px-2.5 py-1.5 rounded border text-left truncate ${
                    currentUser.role === 'security'
                      ? 'border-[#9CA3AF] bg-[#9CA3AF]/15 text-[#F9F9F9] font-semibold'
                      : 'border-white/10 text-[#9CA3AF]/75'
                  }`}
                >
                  Gray · Security
                </div>
              </div>
              <p className="text-[10px] text-[#F9F9F9]/50 leading-relaxed">
                New members receive the <span className="text-[#3B82F6]">Blue · Resident</span> role by default. Only Admins &amp; Developers can change a member&apos;s role to Admin.
              </p>
            </div>
          </div>

          {/* Vertical Module Navigation Menu */}
          <div className="bg-[#141821] border border-white/10 rounded-xl p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setActiveModule(item.id); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#D4AF37] text-[#0B0C10] font-semibold'
                      : 'text-[#F9F9F9]/75 hover:bg-white/5 hover:text-[#F9F9F9]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono-tabular ${
                      isActive ? 'text-[#0B0C10]/80' : 'text-[#D4AF37]/80'
                    }`}
                  >
                    {item.scopeTag}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Primary Module Viewport */}
        <main className="w-full min-w-0 max-w-full overflow-x-hidden lg:col-span-9">
          {activeModule === 'feed' && (
            <GlobalSocialFeed
              posts={socialPosts}
              profiles={profiles}
              apartments={apartments}
              currentUser={currentUser}
              onCreatePost={(newPost) => {
                const post: SocialPost = {
                  ...newPost,
                  id: `post-${Date.now()}`,
                  likes_count: 0,
                  liked_by: [],
                  comments: [],
                  created_at: new Date().toISOString(),
                };
                setSocialPosts(
                  (prev) =>
                    addSocialPostWithLimit(prev, post, MAX_SOCIAL_FEED_POSTS)
                      .updatedPosts
                );
              }}
              onToggleLike={(postId) => {
                setSocialPosts((prev) =>
                  prev.map((p) => {
                    if (p.id !== postId) return p;
                    const already = p.liked_by.includes(currentUser.id);
                    const updatedLikes = already
                      ? p.liked_by.filter((id) => id !== currentUser.id)
                      : [...p.liked_by, currentUser.id];
                    return {
                      ...p,
                      liked_by: updatedLikes,
                      likes_count: updatedLikes.length,
                    };
                  })
                );
              }}
              onAddComment={(postId, content) => {
                setSocialPosts((prev) =>
                  prev.map((p) => {
                    if (p.id !== postId) return p;
                    return {
                      ...p,
                      comments: [
                        ...p.comments,
                        {
                          id: `c-${Date.now()}`,
                          author_id: currentUser.id,
                          author_name: currentUser.full_name,
                          author_role: currentUser.role,
                          flat_no: currentUser.flat_no,
                          apartment_name: currentApartment.name,
                          content,
                          created_at: new Date().toISOString(),
                        },
                      ],
                    };
                  })
                );
              }}
              onDeletePost={(postId) => {
                setSocialPosts((prev) => prev.filter((p) => p.id !== postId));
              }}
              onIssueWarning={(authorId) => {
                setProfiles((prev) =>
                  prev.map((prof) =>
                    prof.id === authorId
                      ? { ...prof, warnings_count: prof.warnings_count + 1 }
                      : prof
                  )
                );
              }}
            />
          )}

          {activeModule === 'marketplace' && (
            <ApartmentMarketplace
              items={marketplaceItems}
              profiles={profiles}
              currentApartment={currentApartment}
              currentUser={currentUser}
              onCreateListing={(newItem) => {
                const created: MarketplaceItem = {
                  ...newItem,
                  id: `mkt-${Date.now()}`,
                  status: 'available',
                  created_at: new Date().toISOString(),
                };
                setMarketplaceItems((prev) => [created, ...prev]);
              }}
              onUpdateStatus={(itemId, status) => {
                setMarketplaceItems((prev) =>
                  prev.map((item) =>
                    item.id === itemId
                      ? {
                          ...item,
                          status,
                          buyer_or_renter_id:
                            status === 'available' ? null : currentUser.id,
                        }
                      : item
                  )
                );
              }}
            />
          )}

          {activeModule === 'maintenance-bills' && (
            <MaintenanceAndBills
              profiles={profiles}
              records={maintenanceRecords}
              currentApartment={currentApartment}
              currentUser={currentUser}
              onSubmitReceipt={(payload) => {
                const res = submitMaintenanceReceipt(
                  maintenanceRecords,
                  payload
                );
                if (!res.error) {
                  setMaintenanceRecords(res.updatedRecords);
                }
                return { error: res.error };
              }}
              onMarkPending={(profileId) => {
                setMaintenanceRecords((prev) =>
                  prev.filter(
                    (r) =>
                      !(
                        r.apartment_id === currentApartment.id &&
                        r.profile_id === profileId
                      )
                  )
                );
              }}
            />
          )}

          {activeModule === 'governance' && (
            <GovernanceHub
              polls={polls}
              events={events}
              announcements={announcements}
              profiles={profiles}
              currentApartment={currentApartment}
              currentUser={currentUser}
              onVotePoll={(pollId, optionId) => {
                setPolls((prev) =>
                  prev.map((poll) => {
                    if (poll.id !== pollId) return poll;
                    const res = castPollVote(poll, optionId, currentUser.id);
                    return res.updatedPoll;
                  })
                );
              }}
              onCreatePoll={(newPoll) => {
                setPolls((prev) => [
                  {
                    ...newPoll,
                    id: `poll-${Date.now()}`,
                    created_at: new Date().toISOString(),
                  },
                  ...prev,
                ]);
              }}
              onUpdatePoll={(updated) => {
                setPolls((prev) =>
                  prev.map((p) => (p.id === updated.id ? updated : p))
                );
              }}
              onDeletePoll={(pollId) => {
                setPolls((prev) => prev.filter((p) => p.id !== pollId));
              }}
              onToggleEventInterest={(eventId) => {
                setEvents((prev) =>
                  prev.map((evt) => {
                    if (evt.id !== eventId) return evt;
                    const has = evt.interested_ids.includes(currentUser.id);
                    return {
                      ...evt,
                      interested_ids: has
                        ? evt.interested_ids.filter((id) => id !== currentUser.id)
                        : [...evt.interested_ids, currentUser.id],
                    };
                  })
                );
              }}
              onCreateEvent={(newEvt) => {
                setEvents((prev) => [
                  {
                    ...newEvt,
                    id: `evt-${Date.now()}`,
                    interested_ids: [currentUser.id],
                    created_at: new Date().toISOString(),
                  },
                  ...prev,
                ]);
              }}
              onUpdateEvent={(updated) => {
                setEvents((prev) =>
                  prev.map((ev) => (ev.id === updated.id ? updated : ev))
                );
              }}
              onDeleteEvent={(eventId) => {
                setEvents((prev) => prev.filter((ev) => ev.id !== eventId));
              }}
              onCreateAnnouncement={(newAnn) => {
                setAnnouncements((prev) => [
                  {
                    ...newAnn,
                    id: `ann-${Date.now()}`,
                    created_at: new Date().toISOString(),
                  },
                  ...prev,
                ]);
              }}
              onUpdateAnnouncement={(updated) => {
                setAnnouncements((prev) =>
                  prev.map((a) => (a.id === updated.id ? updated : a))
                );
              }}
              onDeleteAnnouncement={(annId) => {
                setAnnouncements((prev) => prev.filter((a) => a.id !== annId));
              }}
            />
          )}

          {activeModule === 'sos-helpdesk' && (
            <EmergencyAndHelpdesk
              sosAlerts={sosAlerts}
              complaints={complaints}
              profiles={profiles}
              currentApartment={currentApartment}
              currentUser={currentUser}
              onTriggerSOS={(emergencyType, reason) => {
                const newSos: EmergencySOS = {
                  id: `sos-${Date.now()}`,
                  apartment_id: currentApartment.id,
                  triggered_by: currentUser.id,
                  triggered_by_name: currentUser.full_name,
                  flat_no: currentUser.flat_no,
                  emergency_type: emergencyType,
                  reason,
                  is_active: true,
                  created_at: new Date().toISOString(),
                };
                broadcastSOSUpdate([newSos, ...sosAlerts]);
              }}
              onResolveSOS={(sosId) => {
                const updated = sosAlerts.map((s) =>
                  s.id === sosId
                    ? {
                        ...s,
                        is_active: false,
                        resolved_by: currentUser.id,
                        resolved_by_name: `${currentUser.full_name} (${
                          currentUser.admin_title || currentUser.role
                        })`,
                        resolved_at: new Date().toISOString(),
                      }
                    : s
                );
                broadcastSOSUpdate(updated);
              }}
              onCreateComplaint={(ticket) => {
                setComplaints((prev) => [
                  {
                    ...ticket,
                    id: `cmp-${Date.now()}`,
                    status: 'Open',
                    created_at: new Date().toISOString(),
                  },
                  ...prev,
                ]);
              }}
              onUpdateComplaintStatus={(ticketId, status) => {
                setComplaints((prev) =>
                  prev.map((c) => (c.id === ticketId ? { ...c, status } : c))
                );
              }}
            />
          )}

          {activeModule === 'gate-pass' && (
            <VisitorGateAccess
              logs={visitorLogs}
              currentApartment={currentApartment}
              currentUser={currentUser}
              onPreBookVisitor={(entry) => {
                setVisitorLogs((prev) => [
                  {
                    ...entry,
                    id: `vis-${Date.now()}`,
                    status: 'pre_booked',
                    entry_time: null,
                    exit_time: null,
                    duration_minutes: null,
                    created_at: new Date().toISOString(),
                  },
                  ...prev,
                ]);
              }}
              onApproveEntryAtGate={(logId, vehicleNo, code) => {
                setVisitorLogs((prev) =>
                  prev.map((l) =>
                    l.id === logId
                      ? {
                          ...l,
                          status: 'inside',
                          vehicle_no: vehicleNo,
                          pass_code: code,
                          entry_time: new Date().toISOString(),
                        }
                      : l
                  )
                );
              }}
              onMarkExitAtGate={(logId) => {
                setVisitorLogs((prev) =>
                  prev.map((l) => {
                    if (l.id !== logId) return l;
                    const exitIso = new Date().toISOString();
                    const mins = calculateStayDurationMinutes(
                      l.entry_time || exitIso,
                      exitIso
                    );
                    return {
                      ...l,
                      status: 'exited',
                      exit_time: exitIso,
                      duration_minutes: mins,
                    };
                  })
                );
              }}
            />
          )}

          {activeModule === 'admin-panel' && hasAdminPanelAccess && (
            <AdminDeveloperPanel
              apartments={apartments}
              profiles={profiles}
              currentApartment={currentApartment}
              currentUser={currentUser}
              onVerifyResident={(profileId) => {
                setProfiles((prev) =>
                  prev.map((p) =>
                    p.id === profileId ? { ...p, is_verified: true } : p
                  )
                );
              }}
              onUpdateProfilesBatch={(updated) => setProfiles(updated)}
              onCreateNewApartment={(newApt) => {
                const created: Apartment = {
                  ...newApt,
                  id: `apt-${Date.now()}`,
                  created_at: new Date().toISOString(),
                };
                setApartments((prev) => [...prev, created]);
              }}
              onToggleCommitteeAppointment={(profileId, targetRole) => {
                setProfiles((prev) =>
                  prev.map((p) => {
                    if (p.id !== profileId) return p;
                    if (targetRole) {
                      return {
                        ...p,
                        role: targetRole,
                        admin_title:
                          targetRole === 'admin' || targetRole === 'committee'
                            ? p.admin_title
                            : null,
                        is_verified: true,
                      };
                    }
                    const isCom =
                      p.role === 'admin' || p.role === 'committee';
                    return {
                      ...p,
                      role: isCom ? 'resident' : 'committee',
                      admin_title: null,
                    };
                  })
                );
              }}
            />
          )}

          {activeModule === 'more' && (
            <MoreMenuHub
              profiles={profiles}
              currentApartment={currentApartment}
              currentUser={currentUser}
              onUploadModelZip={(aptId, spec) => {
                setApartments((prev) =>
                  prev.map((a) =>
                    a.id === aptId ? { ...a, custom_model_spec: spec } : a
                  )
                );
              }}
            />
          )}
        </main>
      </div>

      {/* Quiet Luxury Footer */}
      <footer className="mt-12 border-t border-white/10 py-5 px-6 text-xs text-[#F9F9F9]/50 flex flex-wrap items-center justify-between gap-4 max-w-[1440px] w-full mx-auto">
        <div>
          Neighbour Network · Private Residential Community Network · 7 Flagship
          Societies
        </div>
        <div>
          Original Creators & Lead Developers:{' '}
          <span className="text-[#D4AF37] font-medium">Ariston Dsouza</span> &{' '}
          <span className="text-[#D4AF37] font-medium">Allwyn Bernard</span>
        </div>
      </footer>
    </div>
  );
}
