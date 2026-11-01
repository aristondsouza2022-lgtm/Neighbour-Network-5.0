import React, { useEffect, useMemo, useState } from 'react';
import { Apartment, Profile } from '../types/community';
import { supabase } from '../lib/supabase';
import { Building2, CheckCircle2, XCircle } from 'lucide-react';

type JoinRequest = {
  id: string;
  apartment_id: string;
  profile_id: string;
  requested_flat_no: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
};

interface ApartmentResidenceSwitcherProps {
  apartments: Apartment[];
  currentApartment: Apartment;
  currentUser: Profile;
  profiles: Profile[];
}

export function ApartmentResidenceSwitcher({
  apartments,
  currentApartment,
  currentUser,
  profiles,
}: ApartmentResidenceSwitcherProps) {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [targetApartment, setTargetApartment] = useState('');
  const [flatNo, setFlatNo] = useState(currentUser.flat_no || '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'developer';

  const targetName = useMemo(
    () => apartments.find((apt) => apt.id === targetApartment)?.name ?? '',
    [apartments, targetApartment]
  );

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const load = async () => {
      const { data, error } = await supabase
        .from('apartment_join_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (!active) return;
      if (error) {
        console.error('Unable to load residence requests:', error.message);
        return;
      }
      setRequests((data ?? []) as JoinRequest[]);
    };
    void load();
    const channel = supabase
      .channel(`residence-requests-${currentUser.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'apartment_join_requests',
      }, () => { void load(); })
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [currentUser.id, currentApartment.id]);

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || !targetApartment || !flatNo.trim()) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.rpc('submit_apartment_join_request', {
      p_apartment_id: targetApartment,
      p_flat_no: flatNo.trim(),
    });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage(`Your request to join ${targetName} was sent to that society's administrators.`);
    setTargetApartment('');
  };

  const reviewRequest = async (requestId: string, approve: boolean) => {
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.rpc('review_apartment_join_request', {
      p_request_id: requestId,
      p_approve: approve,
    });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage(approve ? 'Residence request approved.' : 'Residence request rejected.');
    const { data } = await supabase
      .from('apartment_join_requests')
      .select('*')
      .order('created_at', { ascending: false });
    setRequests((data ?? []) as JoinRequest[]);
  };

  const pendingForThisSociety = requests.filter(
    (request) => request.apartment_id === currentApartment.id && request.status === 'pending'
  );
  const ownRequests = requests.filter((request) => request.profile_id === currentUser.id);

  return (
    <section className="bg-[#141821] border border-[#D4AF37]/35 rounded-xl p-5 space-y-5">
      <div className="flex items-center gap-2 text-[#D4AF37]">
        <Building2 className="w-5 h-5" />
        <h2 className="text-xl font-semibold text-white">Switch Residence</h2>
      </div>
      <p className="text-sm text-white/65">
        Send a request to another society. Only administrators of the selected society can review it.
        Your active residence changes only after approval.
      </p>

      {!isAdmin && (
        <form onSubmit={submitRequest} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={targetApartment}
            onChange={(event) => setTargetApartment(event.target.value)}
            required
            className="rounded-lg bg-[#0B0C10] border border-white/15 px-3 py-2 text-sm text-white"
          >
            <option value="">Select another society</option>
            {apartments.filter((apt) => apt.id !== currentApartment.id).map((apt) => (
              <option key={apt.id} value={apt.id}>{apt.name} — {apt.location}</option>
            ))}
          </select>
          <input
            value={flatNo}
            onChange={(event) => setFlatNo(event.target.value)}
            placeholder="Flat / residence number"
            required
            className="rounded-lg bg-[#0B0C10] border border-white/15 px-3 py-2 text-sm text-white"
          />
          <button
            type="submit"
            disabled={busy || !targetApartment || !flatNo.trim()}
            className="rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-[#0B0C10] disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Request to Join'}
          </button>
        </form>
      )}

      {message && <p role="status" className="text-sm text-[#D4AF37]">{message}</p>}

      {!isAdmin && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white">My residence requests</h3>
          {ownRequests.length === 0 ? (
            <p className="text-xs text-white/50">No requests submitted yet.</p>
          ) : ownRequests.map((request) => (
            <div key={request.id} className="flex items-center justify-between rounded-lg bg-[#0B0C10] p-3 text-sm">
              <span>{apartments.find((apt) => apt.id === request.apartment_id)?.name ?? 'Society'}</span>
              <span className="text-xs text-[#D4AF37]">{request.status}</span>
            </div>
          ))}
        </div>
      )}

      {isAdmin && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white">
            Join requests for {currentApartment.name} ({pendingForThisSociety.length})
          </h3>
          {pendingForThisSociety.length === 0 ? (
            <p className="text-xs text-white/50">No pending requests for this society.</p>
          ) : pendingForThisSociety.map((request) => (
            <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#0B0C10] p-3">
              <div>
                <p className="text-sm text-white">{profiles.find((profile) => profile.id === request.profile_id)?.full_name ?? 'New resident'} · Flat {request.requested_flat_no}</p>
                <p className="text-xs text-white/50">{profiles.find((profile) => profile.id === request.profile_id)?.email ?? ''}</p>
                <p className="text-xs text-white/50">Request received {new Date(request.created_at).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={() => void reviewRequest(request.id, true)} className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                </button>
                <button type="button" disabled={busy} onClick={() => void reviewRequest(request.id, false)} className="flex items-center gap-1 rounded-md bg-red-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
