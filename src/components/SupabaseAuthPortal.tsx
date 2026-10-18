import React, { useEffect, useState } from 'react';
import { Apartment, Profile, UserRole } from '../types/community';
import { requireSupabase } from '../lib/supabase';
import { LuxuryCrestLogo } from './LuxuryCrest';
import { Mail, Lock, User, Building2, Home, AlertCircle, CheckCircle2, LogIn } from 'lucide-react';

interface Props {
  apartments: Apartment[];
  profiles: Profile[];
  onSignInProfile: (profile: Profile) => void;
  onRegisterProfile: (profile: Profile, stayOnLoginStep?: boolean) => void;
}

type ApartmentOption = Pick<Apartment, 'id' | 'name' | 'location' | 'max_houses' | 'created_at'>;

export function SupabaseAuthPortal({ onSignInProfile }: Props) {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [apartments, setApartments] = useState<ApartmentOption[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [apartmentId, setApartmentId] = useState('');
  const [flatNo, setFlatNo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadProfile = async (userId: string) => {
    const db = requireSupabase();
    const { data, error: profileError } = await db.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (profileError) throw profileError;
    if (!data) throw new Error('Your login is valid, but your resident profile is missing. Please register or contact your society administrator.');
    onSignInProfile({
      id: data.id,
      full_name: data.full_name,
      email: data.email,
      apartment_id: data.apartment_id,
      flat_no: data.flat_no,
      role: (data.role || 'resident') as UserRole,
      admin_title: data.admin_title || null,
      is_verified: Boolean(data.is_verified),
      warnings_count: data.warnings_count || 0,
      created_at: data.created_at || new Date().toISOString(),
    });
  };

  useEffect(() => {
    let alive = true;
    const db = requireSupabase();
    db.from('apartments').select('id,name,location,max_houses,created_at').order('name')
      .then(({ data, error: e }) => {
        if (!alive) return;
        if (e) setError(e.message);
        else {
          setApartments((data || []) as ApartmentOption[]);
          if (data?.[0]) setApartmentId(data[0].id);
        }
      });
    db.auth.getSession().then(({ data, error: e }) => {
      if (!alive || e || !data.session?.user) return;
      loadProfile(data.session.user.id).catch((err) => alive && setError(err.message || 'Could not load your profile.'));
    });
    const { data: listener } = db.auth.onAuthStateChange((_event, session) => {
      if (!alive || !session?.user) return;
      // Defer profile query outside the auth callback to avoid lock contention.
      setTimeout(() => loadProfile(session.user.id).catch((err) => alive && setError(err.message || 'Could not load your profile.')), 0);
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const db = requireSupabase();
      const normalizedEmail = email.trim().toLowerCase();
      if (mode === 'register') {
        if (!name.trim() || !apartmentId || !flatNo.trim()) throw new Error('Enter your name, apartment, and flat number.');
        const { data, error: signUpError } = await db.auth.signUp({
          email: normalizedEmail,
          password,
          options: { data: { full_name: name.trim() } },
        });
        if (signUpError) throw signUpError;
        if (!data.user) throw new Error('Registration did not return a user. Please try again.');
        if (!data.session) {
          setNotice('Account created. Check your email to confirm the address, then return here to log in.');
          setMode('login');
          return;
        }
        const { error: insertError } = await db.from('profiles').insert({
          id: data.user.id,
          full_name: name.trim(),
          email: normalizedEmail,
          apartment_id: apartmentId,
          flat_no: flatNo.trim().toUpperCase(),
          role: 'resident',
          is_verified: false,
          warnings_count: 0,
        });
        if (insertError) throw insertError;
        await loadProfile(data.user.id);
      } else {
        const { data, error: loginError } = await db.auth.signInWithPassword({ email: normalizedEmail, password });
        if (loginError) throw loginError;
        if (!data.user) throw new Error('Login did not return a user.');
        await loadProfile(data.user.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#0B0C10] text-[#F9F9F9]">
      <div className="w-full max-w-md rounded-2xl border border-[#D4AF37]/35 bg-[#141821] p-6 sm:p-8 shadow-2xl">
        <div className="flex justify-center mb-5"><LuxuryCrestLogo /></div>
        <h1 className="text-2xl font-semibold text-center">Neighbour Network</h1>
        <p className="text-sm text-center text-white/60 mt-2">Secure resident account</p>
        <div className="grid grid-cols-2 gap-2 mt-6 mb-5">
          <button type="button" onClick={() => { setMode('register'); setError(''); setNotice(''); }} className={`rounded-lg p-2 text-sm ${mode === 'register' ? 'bg-[#D4AF37] text-black font-semibold' : 'bg-black/30 text-white/70'}`}>Register</button>
          <button type="button" onClick={() => { setMode('login'); setError(''); setNotice(''); }} className={`rounded-lg p-2 text-sm ${mode === 'login' ? 'bg-[#D4AF37] text-black font-semibold' : 'bg-black/30 text-white/70'}`}>Log in</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === 'register' && <>
            <label className="block text-xs text-white/70">Full name<div className="flex items-center gap-2 mt-1 rounded-lg border border-white/15 px-3"><User size={16}/><input required value={name} onChange={e=>setName(e.target.value)} className="w-full bg-transparent py-3 outline-none text-sm" placeholder="Your full name"/></div></label>
            <label className="block text-xs text-white/70">Apartment<div className="flex items-center gap-2 mt-1 rounded-lg border border-white/15 px-3"><Building2 size={16}/><select required value={apartmentId} onChange={e=>setApartmentId(e.target.value)} className="w-full bg-[#141821] py-3 outline-none text-sm">{apartments.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></div></label>
            <label className="block text-xs text-white/70">Flat number<div className="flex items-center gap-2 mt-1 rounded-lg border border-white/15 px-3"><Home size={16}/><input required value={flatNo} onChange={e=>setFlatNo(e.target.value)} className="w-full bg-transparent py-3 outline-none text-sm" placeholder="e.g. A-1201"/></div></label>
          </>}
          <label className="block text-xs text-white/70">Email<div className="flex items-center gap-2 mt-1 rounded-lg border border-white/15 px-3"><Mail size={16}/><input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-transparent py-3 outline-none text-sm" placeholder="you@example.com"/></div></label>
          <label className="block text-xs text-white/70">Password<div className="flex items-center gap-2 mt-1 rounded-lg border border-white/15 px-3"><Lock size={16}/><input required minLength={8} type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-transparent py-3 outline-none text-sm" placeholder="At least 8 characters"/></div></label>
          {error && <div role="alert" className="flex gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300"><AlertCircle size={16} className="shrink-0"/><span>{error}</span></div>}
          {notice && <div role="status" className="flex gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300"><CheckCircle2 size={16} className="shrink-0"/><span>{notice}</span></div>}
          <button disabled={busy || (mode === 'register' && apartments.length === 0)} className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#D4AF37] py-3 text-sm font-bold text-black disabled:opacity-50">{busy ? 'Please wait…' : mode === 'register' ? 'Create resident account' : 'Log in'} <LogIn size={16}/></button>
        </form>
        {mode === 'register' && apartments.length === 0 && <p className="mt-3 text-xs text-amber-300">Loading apartments… If this persists, check Supabase configuration and read access.</p>}
        <p className="mt-4 text-[11px] leading-5 text-white/45">New accounts receive the Resident role. Privileged roles must be assigned by an authorized administrator.</p>
      </div>
    </div>
  );
}
