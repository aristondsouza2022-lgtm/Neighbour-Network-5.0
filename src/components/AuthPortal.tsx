import React, { useEffect, useMemo, useState } from 'react';
import { Apartment, Profile } from '../types/community';
import { supabase } from '../lib/supabase';
import {
  resolveRegistrationRole,
  validateFlatUniqueness,
  transferMemberApartment,
  SECRET_DEVELOPER_REFERRAL_CODE,
  ROLE_RING_CONFIG,
} from '../utils/communityRules';
import { LuxuryCrestLogo } from './LuxuryCrest';
import {
  Building2,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  User,
  Home,
  AlertCircle,
  CheckCircle2,
  LogIn,
  Database,
  ArrowRightLeft,
} from 'lucide-react';

interface AuthPortalProps {
  apartments: Apartment[];
  profiles: Profile[];
  onSignInProfile: (profile: Profile) => void;
  onRegisterProfile: (newProfile: Profile, stayOnLoginStep?: boolean) => void;
}

export function AuthPortal({
  apartments,
  profiles,
  onSignInProfile,
  onRegisterProfile,
}: AuthPortalProps) {
  // Step 1: 'signin' (New Member Registration) -> Step 2: 'login' (Returning Member Login via Saved Email)
  const [mode, setMode] = useState<'signin' | 'login'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedApartmentId, setSelectedApartmentId] = useState(
    apartments[0]?.id || 'apt-trump'
  );
  const [flatNo, setFlatNo] = useState('');
  const [referralCode, setReferralCode] = useState('');
  // Optional Apartment Shift / Transfer during Returning Member Login
  const [loginTargetApartmentId, setLoginTargetApartmentId] = useState<string>('');
  const [loginTransferFlatNo, setLoginTransferFlatNo] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Live check if the typed email exists in the saved database for Returning Member Login
  const matchedSavedProfile = useMemo(() => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return null;
    return profiles.find((p) => p.email.toLowerCase() === trimmed) || null;
  }, [email, profiles]);

  useEffect(() => {
    if (matchedSavedProfile) {
      setLoginTargetApartmentId(matchedSavedProfile.apartment_id);
      setLoginTransferFlatNo(matchedSavedProfile.flat_no);
    } else {
      setLoginTargetApartmentId('');
      setLoginTransferFlatNo('');
    }
  }, [matchedSavedProfile]);

  const matchedApartmentName = useMemo(() => {
    if (!matchedSavedProfile) return '';
    return (
      apartments.find((a) => a.id === matchedSavedProfile.apartment_id)?.name ||
      'Pune Estate'
    );
  }, [matchedSavedProfile, apartments]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = fullName.trim();
    const trimmedFlat = flatNo.trim().toUpperCase();
    if (!trimmedEmail || !password.trim()) {
      setErrorMessage('Please enter both your email address and security passkey.');
      return;
    }
    if (!supabase) {
      setErrorMessage('Database connection is not configured. Please contact the site administrator.');
      return;
    }

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (error) throw error;
        if (!data.session || !data.user) {
          setErrorMessage('Login could not be verified. Please try again.');
          return;
        }
        const { data: row, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        if (profileError || !row) {
          await supabase.auth.signOut();
          throw new Error('Your account profile is not ready yet. Confirm your email, then try again. If this continues, contact the administrator.');
        }
        onSignInProfile(row as Profile);
        return;
      }

      if (!trimmedName) {
        setErrorMessage('Please enter your Full Name (Family Head).');
        return;
      }
      if (!trimmedFlat) {
        setErrorMessage('Please enter your Flat or Penthouse number.');
        return;
      }
      if (!selectedApartmentId) {
        setErrorMessage('Please select your apartment.');
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: trimmedName,
            apartment_id: selectedApartmentId,
            flat_no: trimmedFlat,
          },
        },
      });
      if (error) throw error;

      if (!data.session || !data.user) {
        setMode('login');
        setSuccessMessage('Check your email and confirm your account before logging in.');
        return;
      }

      const { data: row, error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          full_name: trimmedName,
          email: trimmedEmail,
          apartment_id: selectedApartmentId,
          flat_no: trimmedFlat,
          role: 'resident',
          admin_title: null,
          is_verified: false,
          warnings_count: 0,
        }, { onConflict: 'id' })
        .select('*')
        .single();
      if (profileError || !row) {
        await supabase.auth.signOut();
        throw new Error(profileError?.message || 'Your account was created, but the resident profile could not be saved. Please contact the administrator.');
      }
      onRegisterProfile(row as Profile, false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed. Please try again.';
      setErrorMessage(message);
    }
  };

  // Non-clickable Role Ring Governance Legend
  const roleGovernanceLegend = [
    {
      label: 'Resident / Family Head (Blue Ring)',
      badge: 'Default Role',
      desc: 'Automatically assigned to every new member upon joining. Never asked during sign-in.',
      dotColor: 'bg-[#3B82F6]',
      borderColor: 'border-[#3B82F6]/45',
      textColor: 'text-[#3B82F6]',
    },
    {
      label: 'Admin / Managing Committee (Green Ring)',
      badge: 'Admin Appointed',
      desc: 'Only existing Admins and Lead Developers can promote a Resident to Admin.',
      dotColor: 'bg-[#10B981]',
      borderColor: 'border-[#10B981]/35',
      textColor: 'text-[#10B981]',
    },
    {
      label: 'Lead System Developer (Red Ring)',
      badge: 'Referral Key',
      desc: 'System architecture & global moderation unlocked via secret Developer Referral Key.',
      dotColor: 'bg-[#EF4444]',
      borderColor: 'border-[#EF4444]/35',
      textColor: 'text-[#EF4444]',
    },
    {
      label: 'Gate Security Command (Gray Ring)',
      badge: 'Admin Assigned',
      desc: 'Designated by Society Admins for visitor pass & gate entry verification.',
      dotColor: 'bg-[#9CA3AF]',
      borderColor: 'border-[#9CA3AF]/35',
      textColor: 'text-[#9CA3AF]',
    },
  ];

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 md:p-8 overflow-hidden">
      {/* Black and Gold Luxury Aesthetic Background Image */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[#050507]">
        <img
          src="/black-and-gold-aesthetic.svg"
          alt="Black and Gold Luxury Aesthetic Background"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover scale-102"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/50" />
      </div>

      {/* Crystal Transparent & Blurred Glassmorphism Portal Card */}
      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 rounded-2xl border border-[#D4AF37]/60 backdrop-blur-md bg-black/25 shadow-[0_24px_80px_rgba(0,0,0,0.65)] overflow-hidden">
        {/* Left Column: Brand Crest, Philosophy & Non-Clickable Role Ring Governance Legend */}
        <div className="lg:col-span-5 p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#D4AF37]/30 bg-white/[0.03] backdrop-blur-sm">
          <div>
            <div className="flex items-center gap-3.5">
              <LuxuryCrestLogo className="w-14 h-14 shrink-0" />
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-[#D4AF37] whitespace-nowrap">
                  Connecting to People With
                </div>
                <h1 className="text-2xl font-display font-bold tracking-wide text-[#F9F9F9]">
                  Neighbour Network
                </h1>
              </div>
            </div>

            <p className="text-sm text-[#F9F9F9]/90 mt-5 leading-relaxed drop-shadow">
              An architectural sanctuary connecting Family Heads across Pune’s
              seven most prestigious residential towers. Cross-society social
              discourse paired with strictly isolated estate governance.
            </p>

            <div className="mt-5 space-y-1.5 text-xs text-[#F9F9F9]/85 font-mono-tabular drop-shadow">
              <div>· 1. Sign In: New Member Flat Registration</div>
              <div>· 2. Login: Returning Member Saved Email</div>
              <div>· 3. Default Role: Resident (Blue Ring)</div>
            </div>
          </div>

          {/* Static Role & Avatar Ring Governance Policy */}
          <div className="mt-6 pt-5 border-t border-[#D4AF37]/30">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#D4AF37] mb-2.5">
              Avatar Ring & Role Governance Policy
            </div>
            <div className="space-y-2">
              {roleGovernanceLegend.map((item) => (
                <div
                  key={item.label}
                  className={`px-3 py-2 rounded-lg bg-black/30 backdrop-blur-sm border ${item.borderColor}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.dotColor}`}
                      />
                      <span className="text-xs font-semibold text-[#F9F9F9] truncate">
                        {item.label}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono-tabular uppercase px-1.5 py-0.5 rounded bg-black/40 ${item.textColor} shrink-0`}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#F9F9F9]/75 mt-1 leading-snug">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Step 1 Sign In (New Member) & Step 2 Login (Returning Member) */}
        <div className="lg:col-span-7 p-8 bg-black/20 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
              <div>
                <div className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#D4AF37]">
                  {mode === 'signin'
                    ? 'Step 1 · New Member Onboarding'
                    : 'Step 2 · Returning Member Database Auth'}
                </div>
                <h2 className="text-2xl font-display font-semibold text-[#F9F9F9] drop-shadow mt-0.5">
                  {mode === 'signin'
                    ? 'Sign In (New Member)'
                    : 'Login (Returning Member)'}
                </h2>
                <p className="text-xs text-[#F9F9F9]/80 mt-0.5">
                  {mode === 'signin'
                    ? 'Register your flat once; your email and Resident role will be saved in the database.'
                    : 'Login directly with your saved email address from the community database.'}
                </p>
              </div>

              <div className="flex rounded-lg bg-black/35 backdrop-blur-sm p-1 border border-[#D4AF37]/40">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    mode === 'signin'
                      ? 'bg-[#D4AF37] text-[#0B0C10] font-semibold'
                      : 'text-[#F9F9F9]/80 hover:text-[#F9F9F9]'
                  }`}
                >
                  1. Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    mode === 'login'
                      ? 'bg-[#D4AF37] text-[#0B0C10] font-semibold'
                      : 'text-[#F9F9F9]/80 hover:text-[#F9F9F9]'
                  }`}
                >
                  2. Login
                </button>
              </div>
            </div>

            {/* Automatic Default Resident Role Notice */}
            {mode === 'signin' && (
              <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-[#3B82F6]/15 border border-[#3B82F6]/45 backdrop-blur-sm flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#3B82F6] shrink-0" />
                <div className="text-xs text-[#F9F9F9]/90">
                  <span className="font-semibold text-[#3B82F6]">
                    Default Resident Role (Blue Ring):
                  </span>{' '}
                  New members are never asked for a role and automatically join
                  as Residents. Only Admins &amp; Developers can change a
                  member&apos;s role to Admin.
                </div>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3.5 rounded-lg bg-[#10B981]/20 backdrop-blur-sm border border-[#10B981] text-xs text-[#F9F9F9] flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 p-3.5 rounded-lg bg-[#EF4444]/25 backdrop-blur-sm border border-[#EF4444] text-xs text-[#F9F9F9] flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {mode === 'signin' ? (
                <>
                  {/* NEW MEMBER SIGN IN FIELDS */}
                  <div>
                    <label
                      htmlFor="auth-fullname"
                      className="block text-xs font-medium text-[#F9F9F9]/90 mb-1"
                    >
                      Your Full Name (Family Head)
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="auth-fullname"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name (e.g., Aarav Deshmukh)"
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-black/35 backdrop-blur-sm border border-white/25 focus:border-[#D4AF37] text-sm text-[#F9F9F9] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="auth-email"
                        className="block text-xs font-medium text-[#F9F9F9]/90 mb-1"
                      >
                        Official Email Address (Saved to DB)
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          id="auth-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@domain.com"
                          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-black/35 backdrop-blur-sm border border-white/25 focus:border-[#D4AF37] text-sm text-[#F9F9F9] outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="auth-password"
                        className="block text-xs font-medium text-[#F9F9F9]/90 mb-1"
                      >
                        Create Security Passkey
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          id="auth-password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Create your passkey"
                          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-black/35 backdrop-blur-sm border border-white/25 focus:border-[#D4AF37] text-sm text-[#F9F9F9] outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="auth-apartment"
                        className="block text-xs font-medium text-[#F9F9F9]/90 mb-1"
                      >
                        Pune Luxury Society ({apartments.length} Estates)
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <select
                          id="auth-apartment"
                          value={selectedApartmentId}
                          onChange={(e) =>
                            setSelectedApartmentId(e.target.value)
                          }
                          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-black/45 backdrop-blur-sm border border-white/25 focus:border-[#D4AF37] text-sm text-[#F9F9F9] outline-none"
                        >
                          {apartments.map((apt) => (
                            <option
                              key={apt.id}
                              value={apt.id}
                              className="bg-[#0B0C10] text-[#F9F9F9]"
                            >
                              {apt.name} ({apt.location.replace(', Pune', '')})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="auth-flat"
                        className="block text-xs font-medium text-[#F9F9F9]/90 mb-1"
                      >
                        Flat / Penthouse No.
                      </label>
                      <div className="relative">
                        <Home className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          id="auth-flat"
                          type="text"
                          value={flatNo}
                          onChange={(e) => setFlatNo(e.target.value)}
                          placeholder="e.g., A-1204"
                          className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-black/35 backdrop-blur-sm border border-white/25 focus:border-[#D4AF37] text-sm text-[#F9F9F9] font-mono-tabular uppercase outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Optional Developer Referral Key */}
                  <div>
                    <label
                      htmlFor="auth-referral"
                      className="block text-xs font-medium text-[#D4AF37] mb-1"
                    >
                      Optional Developer Referral Key (Leave blank for default
                      Resident role)
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="auth-referral"
                        type="text"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value)}
                        placeholder="Optional lead developer key"
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-black/35 backdrop-blur-sm border border-[#D4AF37]/45 focus:border-[#D4AF37] text-sm text-[#F9F9F9] font-mono-tabular outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-5 rounded-lg bg-[#D4AF37] hover:bg-[#e2be46] text-[#0B0C10] font-semibold text-sm tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Complete Sign In &amp; Proceed to Login</span>
                  </button>
                </>
              ) : (
                <>
                  {/* RETURNING MEMBER LOGIN FIELDS (EMAIL SAVED IN DATABASE) */}
                  <div className="p-3.5 rounded-lg bg-black/35 border border-[#D4AF37]/35 backdrop-blur-sm flex items-center gap-3">
                    <Database className="w-4 h-4 text-[#D4AF37] shrink-0" />
                    <div className="text-xs text-[#F9F9F9]/85">
                      Returning members only need their{' '}
                      <span className="text-[#D4AF37] font-semibold">
                        saved email address
                      </span>{' '}
                      and passkey. Your Pune society, flat number, and role ring
                      are automatically loaded from the database.
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="login-email"
                      className="block text-xs font-medium text-[#F9F9F9]/90 mb-1"
                    >
                      Registered Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="login-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your registered email"
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-black/35 backdrop-blur-sm border border-white/25 focus:border-[#D4AF37] text-sm text-[#F9F9F9] outline-none"
                      />
                    </div>
                  </div>

                  {/* Live Database Lookup Preview when Email matches a saved account */}
                  {matchedSavedProfile && (
                    <div className="p-3.5 rounded-lg bg-[#10B981]/15 border border-[#10B981]/45 backdrop-blur-sm space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs text-[#F9F9F9]">
                          <div className="font-semibold text-[#10B981]">
                            Saved Account Verified in Database
                          </div>
                          <div className="mt-0.5 text-[#F9F9F9]/85">
                            {matchedSavedProfile.full_name} ·{' '}
                            {matchedApartmentName} (Flat{' '}
                            {matchedSavedProfile.flat_no})
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-mono-tabular uppercase px-2 py-1 rounded bg-black/45 ${
                            ROLE_RING_CONFIG[matchedSavedProfile.role].textClass
                          }`}
                        >
                          {ROLE_RING_CONFIG[matchedSavedProfile.role].label}
                        </span>
                      </div>

                      {/* Optional Apartment Transfer / Shift Residence Control on Login */}
                      <div className="pt-2.5 border-t border-white/15 space-y-2">
                        <label
                          htmlFor="login-transfer-apartment"
                          className="flex items-center gap-1.5 text-[11px] font-medium text-[#D4AF37]"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>
                            Current or Shifted Apartment (Change if you shifted residence):
                          </span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <select
                            id="login-transfer-apartment"
                            value={
                              loginTargetApartmentId ||
                              matchedSavedProfile.apartment_id
                            }
                            onChange={(e) =>
                              setLoginTargetApartmentId(e.target.value)
                            }
                            className="sm:col-span-2 px-3 py-2 rounded-lg bg-black/50 border border-[#D4AF37]/40 text-xs text-[#F9F9F9] outline-none"
                          >
                            {apartments.map((apt) => (
                              <option
                                key={apt.id}
                                value={apt.id}
                                className="bg-[#0B0C10] text-[#F9F9F9]"
                              >
                                {apt.name} ({apt.location.replace(', Pune', '')})
                                {apt.id === matchedSavedProfile.apartment_id
                                  ? ' — Current'
                                  : ' — Shift Here'}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            aria-label="Shifted Flat Number"
                            value={loginTransferFlatNo}
                            onChange={(e) =>
                              setLoginTransferFlatNo(e.target.value)
                            }
                            placeholder="Flat No."
                            className="px-3 py-2 rounded-lg bg-black/50 border border-white/20 text-xs text-[#F9F9F9] font-mono-tabular uppercase outline-none"
                          />
                        </div>
                        {loginTargetApartmentId &&
                          loginTargetApartmentId !==
                            matchedSavedProfile.apartment_id &&
                          matchedSavedProfile.role !== 'developer' && (
                            <div className="text-[11px] text-[#D4AF37] bg-black/45 p-2 rounded border border-[#D4AF37]/40 leading-snug">
                              Shifting from{' '}
                              <strong>{matchedApartmentName}</strong> to{' '}
                              <strong>
                                {
                                  apartments.find(
                                    (a) => a.id === loginTargetApartmentId
                                  )?.name
                                }
                              </strong>{' '}
                              will place your account in{' '}
                              <strong>Wait for Admin Access</strong> until the
                              Admin of that apartment (or Developer) approves
                              your transfer.
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-medium text-[#F9F9F9]/90 mb-1"
                    >
                      Security Passkey
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="login-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your security passkey"
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-black/35 backdrop-blur-sm border border-white/25 focus:border-[#D4AF37] text-sm text-[#F9F9F9] outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-5 rounded-lg bg-[#D4AF37] hover:bg-[#e2be46] text-[#0B0C10] font-semibold text-sm tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>
                      {matchedSavedProfile &&
                      loginTargetApartmentId &&
                      loginTargetApartmentId !==
                        matchedSavedProfile.apartment_id
                        ? 'Login & Request Apartment Transfer Approval'
                        : 'Login to Member Portal'}
                    </span>
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
