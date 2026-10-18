import React, { useMemo, useState } from 'react';
import {
  Apartment,
  MaintenanceBillRecord,
  Profile,
  SocietyMemberMaintenanceEntry,
} from '../types/community';
import {
  buildSocietyMaintenanceLedger,
  DEFAULT_BILLING_PERIOD,
  DEFAULT_MONTHLY_MAINTENANCE_AMOUNT,
  getSocietyMaintenanceSummary,
  ROLE_RING_CONFIG,
} from '../utils/communityRules';
import { RoleAvatar } from './LuxuryCrest';
import {
  Receipt,
  Upload,
  CheckCircle2,
  Clock,
  Search,
  Eye,
  X,
  Image as ImageIcon,
  FileCheck2,
  AlertCircle,
  IndianRupee,
  ShieldCheck,
} from 'lucide-react';

interface MaintenanceAndBillsProps {
  profiles: Profile[];
  records: MaintenanceBillRecord[];
  currentApartment: Apartment;
  currentUser: Profile;
  onSubmitReceipt: (payload: {
    apartment_id: string;
    profile_id: string;
    flat_no: string;
    member_name: string;
    amount: number;
    billing_period: string;
    receipt_image_url: string;
    receipt_file_name: string;
    payment_method: MaintenanceBillRecord['payment_method'];
    transaction_ref: string;
  }) => { error?: string };
  onMarkPending?: (profileId: string) => void;
}

function ReceiptScreenshotVisual({
  entry,
  compact = false,
}: {
  entry: {
    member_name: string;
    flat_no: string;
    apartment_name: string;
    amount: number;
    billing_period: string;
    payment_method?: string | null;
    transaction_ref?: string | null;
    paid_at?: string | null;
    receipt_image_url?: string | null;
    receipt_file_name?: string | null;
  };
  compact?: boolean;
}) {
  const isCustomImage =
    entry.receipt_image_url &&
    (entry.receipt_image_url.startsWith('data:image/') ||
      entry.receipt_image_url.startsWith('blob:') ||
      entry.receipt_image_url.startsWith('http'));

  if (isCustomImage && entry.receipt_image_url) {
    return (
      <div
        className={`relative overflow-hidden rounded-lg border border-[#10B981]/40 bg-[#07020D] ${
          compact ? 'h-24 w-36 shrink-0' : 'w-full max-h-[420px]'
        }`}
      >
        <img
          src={entry.receipt_image_url}
          alt={`Maintenance receipt screenshot for ${entry.member_name} (${entry.flat_no})`}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono-tabular text-[#10B981] border border-[#10B981]/40">
          Receipt Screenshot
        </div>
      </div>
    );
  }

  // Stylized realistic UPI / NEFT Maintenance Payment Screenshot for seeded or instant digital receipts
  if (compact) {
    return (
      <div className="h-24 w-40 shrink-0 rounded-lg border border-[#10B981]/40 bg-gradient-to-br from-[#071A12] via-[#0B0C10] to-[#1A092E] p-2.5 flex flex-col justify-between text-left relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono-tabular uppercase tracking-wider text-[#10B981] font-bold flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
            <span>PAID RECEIPT</span>
          </span>
          <span className="text-[9px] font-mono-tabular text-[#D4AF37]">
            {entry.flat_no}
          </span>
        </div>
        <div>
          <div className="text-xs font-mono-tabular font-bold text-[#F9F9F9]">
            <span className="font-sans">₹</span>
            {entry.amount.toLocaleString('en-IN')}
          </div>
          <div className="text-[9px] text-[#F9F9F9]/70 truncate">
            {entry.member_name}
          </div>
        </div>
        <div className="text-[8px] font-mono-tabular text-[#F9F9F9]/55 truncate">
          {entry.transaction_ref || 'UTR Verified'}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border-2 border-[#10B981]/50 bg-gradient-to-b from-[#081C15] via-[#0B0914] to-[#120722] p-6 space-y-4 shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <div className="text-[11px] font-mono-tabular uppercase tracking-widest text-[#10B981] font-bold">
            OFFICIAL SOCIETY MAINTENANCE PAYMENT RECEIPT
          </div>
          <div className="text-base font-display font-bold text-[#F9F9F9] mt-0.5">
            {entry.apartment_name} Co-operative Housing Society
          </div>
        </div>
        <div className="px-3 py-1 rounded-full bg-[#10B981]/20 border border-[#10B981] text-[#10B981] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" />
          <span>Payment Successful</span>
        </div>
      </div>

      <div className="bg-black/40 border border-[#D4AF37]/30 rounded-xl p-4 text-center space-y-1">
        <div className="text-xs uppercase tracking-wider text-[#F9F9F9]/60">
          Maintenance Amount Paid
        </div>
        <div className="text-3xl font-display font-bold text-[#D4AF37] font-mono-tabular">
          <span className="font-sans">₹</span>
          {entry.amount.toLocaleString('en-IN')}
        </div>
        <div className="text-[11px] text-[#10B981] font-mono-tabular">
          Billing Cycle: {entry.billing_period}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs bg-black/30 rounded-xl p-4 border border-white/10">
        <div>
          <div className="text-[#F9F9F9]/50">Member Name</div>
          <div className="font-semibold text-[#F9F9F9] mt-0.5">
            {entry.member_name}
          </div>
        </div>
        <div>
          <div className="text-[#F9F9F9]/50">Residence / Flat No.</div>
          <div className="font-mono-tabular font-semibold text-[#D4AF37] mt-0.5">
            Flat {entry.flat_no}
          </div>
        </div>
        <div>
          <div className="text-[#F9F9F9]/50">Payment Mode</div>
          <div className="font-semibold text-[#F9F9F9] mt-0.5">
            {entry.payment_method || 'UPI / IMPS Screenshot'}
          </div>
        </div>
        <div>
          <div className="text-[#F9F9F9]/50">UTR / Transaction Ref</div>
          <div className="font-mono-tabular font-semibold text-[#10B981] mt-0.5">
            {entry.transaction_ref || 'UTR6294810294'}
          </div>
        </div>
        <div>
          <div className="text-[#F9F9F9]/50">Attached Screenshot File</div>
          <div className="font-mono-tabular text-[#F9F9F9]/85 mt-0.5 truncate">
            {entry.receipt_file_name || 'maintenance_receipt_screenshot.png'}
          </div>
        </div>
        <div>
          <div className="text-[#F9F9F9]/50">Timestamp</div>
          <div className="font-mono-tabular text-[#F9F9F9]/85 mt-0.5">
            {entry.paid_at
              ? new Date(entry.paid_at).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
              : 'Verified Oct 2026'}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MaintenanceAndBills({
  profiles,
  records,
  currentApartment,
  currentUser,
  onSubmitReceipt,
  onMarkPending,
}: MaintenanceAndBillsProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>(
    'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    currentUser.id
  );
  const [amountInput, setAmountInput] = useState<string>(
    String(DEFAULT_MONTHLY_MAINTENANCE_AMOUNT)
  );
  const [billingPeriodInput, setBillingPeriodInput] = useState<string>(
    DEFAULT_BILLING_PERIOD
  );
  const [paymentMethod, setPaymentMethod] =
    useState<MaintenanceBillRecord['payment_method']>('UPI / IMPS Screenshot');
  const [transactionRef, setTransactionRef] = useState<string>(
    `UTR${String(Date.now()).slice(-8)}`
  );
  const [receiptDataUrl, setReceiptDataUrl] = useState<string>('');
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadSuccessBanner, setUploadSuccessBanner] = useState<string | null>(
    null
  );
  const [viewingReceiptEntry, setViewingReceiptEntry] =
    useState<SocietyMemberMaintenanceEntry | null>(null);

  const canManageAllSocietyBills =
    currentUser.role === 'developer' ||
    currentUser.role === 'admin' ||
    currentUser.role === 'committee';

  // Build full ledger of all verified residential members in the active society
  const societyLedger = useMemo(() => {
    return buildSocietyMaintenanceLedger(
      profiles,
      records,
      currentApartment.id,
      DEFAULT_MONTHLY_MAINTENANCE_AMOUNT,
      DEFAULT_BILLING_PERIOD
    );
  }, [profiles, records, currentApartment.id]);

  const summary = useMemo(
    () => getSocietyMaintenanceSummary(societyLedger),
    [societyLedger]
  );

  const filteredEntries = useMemo(() => {
    return societyLedger.filter((entry) => {
      if (statusFilter === 'paid' && entry.status !== 'paid') return false;
      if (statusFilter === 'pending' && entry.status !== 'pending') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = entry.member_name.toLowerCase().includes(q);
        const matchFlat = entry.flat_no.toLowerCase().includes(q);
        const matchRef = (entry.transaction_ref || '')
          .toLowerCase()
          .includes(q);
        return matchName || matchFlat || matchRef;
      }
      return true;
    });
  }, [societyLedger, statusFilter, searchQuery]);

  const openUploadForMember = (profileId: string) => {
    const targetEntry = societyLedger.find((e) => e.profile.id === profileId);
    setSelectedProfileId(profileId);
    setAmountInput(
      String(targetEntry?.amount || DEFAULT_MONTHLY_MAINTENANCE_AMOUNT)
    );
    setBillingPeriodInput(
      targetEntry?.billing_period || DEFAULT_BILLING_PERIOD
    );
    setPaymentMethod(targetEntry?.payment_method || 'UPI / IMPS Screenshot');
    setTransactionRef(
      targetEntry?.transaction_ref || `UTR${String(Date.now()).slice(-8)}`
    );
    setReceiptDataUrl(targetEntry?.receipt_image_url || '');
    setReceiptFileName(targetEntry?.receipt_file_name || '');
    setFormError(null);
    setShowUploadModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError(
        'Please select a valid image file (PNG, JPG, WEBP screenshot or picture of the maintenance receipt).'
      );
      return;
    }

    setReceiptFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setReceiptDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAttachSampleScreenshot = () => {
    setFormError(null);
    const targetMember =
      societyLedger.find((e) => e.profile.id === selectedProfileId)?.profile ||
      currentUser;
    const cleanFlat = targetMember.flat_no.replace(/[^a-zA-Z0-9]/g, '');
    setReceiptDataUrl(
      `receipt-visual://upi-${cleanFlat.toLowerCase()}-${Date.now()}`
    );
    setReceiptFileName(
      `${cleanFlat}_Maintenance_Receipt_Screenshot_Oct2026.png`
    );
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const targetMember =
      societyLedger.find((item) => item.profile.id === selectedProfileId)
        ?.profile || currentUser;

    const parsedAmount = Number(amountInput);
    const result = onSubmitReceipt({
      apartment_id: currentApartment.id,
      profile_id: targetMember.id,
      flat_no: targetMember.flat_no,
      member_name: targetMember.full_name,
      amount: parsedAmount,
      billing_period: billingPeriodInput.trim() || DEFAULT_BILLING_PERIOD,
      receipt_image_url: receiptDataUrl,
      receipt_file_name:
        receiptFileName ||
        `${targetMember.flat_no}_Maintenance_Receipt_Screenshot.png`,
      payment_method: paymentMethod,
      transaction_ref:
        transactionRef.trim() || `UTR${String(Date.now()).slice(-8)}`,
    });

    if (result.error) {
      setFormError(result.error);
      return;
    }

    setShowUploadModal(false);
    setUploadSuccessBanner(
      `Maintenance receipt screenshot uploaded for ${targetMember.full_name} (Flat ${targetMember.flat_no}). Status updated to PAID.`
    );
  };

  const currentUserEntry = societyLedger.find(
    (e) => e.profile.id === currentUser.id
  );

  return (
    <div data-testid="maintenance-and-bills-module" className="space-y-6">
      {/* Module Header Banner */}
      <div className="bg-[#141821] border border-[#D4AF37]/35 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#D4AF37]">
            <Receipt className="w-4 h-4" />
            <span>
              Society Maintenance &amp; Bills Ledger · {currentApartment.name}
            </span>
          </div>
          <h1 className="text-2xl font-display font-bold text-[#F9F9F9]">
            {currentApartment.name} Maintenance &amp; Bills
          </h1>
          <p className="text-xs text-[#F9F9F9]/70 max-w-2xl">
            Track monthly society maintenance payments for all verified
            households in{' '}
            <span className="text-[#F9F9F9] font-medium">
              {currentApartment.name}
            </span>
            . Members who have uploaded a screenshot or picture of their
            maintenance receipt are marked{' '}
            <span className="text-[#10B981] font-semibold">Paid</span>; members
            whose payments are awaiting receipt upload are shown as{' '}
            <span className="text-[#F59E0B] font-semibold">Pending</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => openUploadForMember(currentUser.id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#D4AF37] text-[#0B0C10] font-semibold text-xs hover:bg-[#e3be42] transition-colors cursor-pointer shadow-lg"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Maintenance Receipt Screenshot</span>
          </button>
        </div>
      </div>

      {/* Upload Confirmation Banner */}
      {uploadSuccessBanner && (
        <div
          role="status"
          className="bg-[#10B981]/15 border border-[#10B981] rounded-xl p-4 flex items-center justify-between gap-3 text-xs text-[#F9F9F9]"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
            <span>{uploadSuccessBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadSuccessBanner(null)}
            className="text-[#F9F9F9]/60 hover:text-[#F9F9F9] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Society Maintenance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#141821] border border-white/10 rounded-xl p-4 space-y-1">
          <div className="text-[11px] uppercase tracking-wider text-[#F9F9F9]/60">
            Total Society Members ({currentApartment.name})
          </div>
          <div className="text-2xl font-display font-bold text-[#F9F9F9] font-mono-tabular">
            {summary.totalMembers} Households
          </div>
          <div className="text-xs text-[#D4AF37] font-mono-tabular">
            Standard Monthly Bill: <span className="font-sans">₹</span>
            {DEFAULT_MONTHLY_MAINTENANCE_AMOUNT.toLocaleString('en-IN')} / Flat
          </div>
        </div>

        <div className="bg-[#141821] border border-[#10B981]/40 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-[#10B981] font-semibold">
              Paid · Receipt Uploaded
            </span>
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
          </div>
          <div
            data-testid="maintenance-paid-count"
            className="text-2xl font-display font-bold text-[#10B981] font-mono-tabular"
          >
            {summary.paidCount} Members Paid
          </div>
          <div className="text-xs text-[#F9F9F9]/75 font-mono-tabular">
            Total Verified: <span className="font-sans">₹</span>
            {summary.totalCollectedAmount.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-[#141821] border border-[#F59E0B]/40 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-[#F59E0B] font-semibold">
              Pending Maintenance Payments
            </span>
            <Clock className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <div
            data-testid="maintenance-pending-count"
            className="text-2xl font-display font-bold text-[#F59E0B] font-mono-tabular"
          >
            {summary.pendingCount} Members Pending
          </div>
          <div className="text-xs text-[#F9F9F9]/75 font-mono-tabular">
            Pending Dues: <span className="font-sans">₹</span>
            {summary.totalPendingAmount.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Logged-In Member Personal Maintenance Status Strip */}
      {currentUserEntry && (
        <div className="bg-[#141821] border border-[#D4AF37]/40 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <RoleAvatar
              name={currentUser.full_name}
              role={currentUser.role}
              size="md"
            />
            <div>
              <div className="text-xs text-[#D4AF37] font-semibold uppercase tracking-wider">
                Your Residence Maintenance Status · Flat {currentUser.flat_no}
              </div>
              <div className="text-sm font-semibold text-[#F9F9F9]">
                {currentUser.full_name} — {currentUserEntry.billing_period} Bill:{' '}
                <span className="font-mono-tabular text-[#D4AF37]">
                  <span className="font-sans">₹</span>
                  {currentUserEntry.amount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentUserEntry.status === 'paid' ? (
              <>
                <span className="px-3 py-1 rounded-full bg-[#10B981]/20 border border-[#10B981] text-[#10B981] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Paid (Receipt Uploaded)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setViewingReceiptEntry(currentUserEntry)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-[#F9F9F9] flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>View Receipt</span>
                </button>
              </>
            ) : (
              <>
                <span className="px-3 py-1 rounded-full bg-[#F59E0B]/20 border border-[#F59E0B] text-[#F59E0B] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pending</span>
                </span>
                <button
                  type="button"
                  onClick={() => openUploadForMember(currentUser.id)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#D4AF37] text-[#0B0C10] font-semibold text-xs hover:bg-[#e3be42] flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload My Receipt</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Controls */}
      <div className="bg-[#141821] border border-white/10 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#D4AF37] text-[#0B0C10]'
                : 'bg-black/30 text-[#F9F9F9]/75 hover:text-[#F9F9F9] border border-white/10'
            }`}
          >
            All Members ({summary.totalMembers})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('paid')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'paid'
                ? 'bg-[#10B981] text-[#0B0C10]'
                : 'bg-black/30 text-[#10B981] hover:bg-[#10B981]/15 border border-[#10B981]/30'
            }`}
          >
            Paid · Receipt Uploaded ({summary.paidCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-[#F59E0B] text-[#0B0C10]'
                : 'bg-black/30 text-[#F59E0B] hover:bg-[#F59E0B]/15 border border-[#F59E0B]/30'
            }`}
          >
            Pending ({summary.pendingCount})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#F9F9F9]/45 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            aria-label="Search society member maintenance status"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search member name or flat no..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0B0C10] border border-white/15 text-xs text-[#F9F9F9] outline-none focus:border-[#D4AF37]"
          />
        </div>
      </div>

      {/* Society Members Maintenance & Receipt List */}
      <div className="space-y-3">
        {filteredEntries.length === 0 ? (
          <div className="bg-[#141821] border border-white/10 rounded-xl p-8 text-center text-sm text-[#F9F9F9]/60">
            No society members match the selected maintenance filter.
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const roleRing = ROLE_RING_CONFIG[entry.profile.role];
            const isPaid = entry.status === 'paid';
            const canUploadForThisMember =
              canManageAllSocietyBills || entry.profile.id === currentUser.id;

            return (
              <div
                key={entry.profile.id}
                data-testid={`maintenance-member-row-${entry.flat_no}`}
                className={`bg-[#141821] rounded-xl p-4 border transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isPaid
                    ? 'border-[#10B981]/35 hover:border-[#10B981]/60'
                    : 'border-[#F59E0B]/30 hover:border-[#F59E0B]/55'
                }`}
              >
                {/* Left: Member Identity, Flat Number & Billing Info */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <RoleAvatar
                    name={entry.member_name}
                    role={entry.profile.role}
                    size="md"
                  />
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-display font-bold text-[#F9F9F9]">
                        {entry.member_name}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-black/40 border border-[#D4AF37]/35 text-[11px] font-mono-tabular text-[#D4AF37] font-semibold">
                        Flat {entry.flat_no}
                      </span>
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider ${roleRing.textClass}`}
                      >
                        {entry.profile.admin_title || roleRing.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#F9F9F9]/70">
                      <span className="font-mono-tabular">
                        Maintenance Amount:{' '}
                        <strong className="text-[#F9F9F9]">
                          <span className="font-sans">₹</span>
                          {entry.amount.toLocaleString('en-IN')}
                        </strong>
                      </span>
                      <span>·</span>
                      <span>Cycle: {entry.billing_period}</span>
                      {isPaid && entry.payment_method && (
                        <>
                          <span>·</span>
                          <span className="text-[#10B981]">
                            {entry.payment_method}
                          </span>
                        </>
                      )}
                      {isPaid && entry.transaction_ref && (
                        <>
                          <span>·</span>
                          <span className="font-mono-tabular text-[#F9F9F9]/80">
                            Ref: {entry.transaction_ref}
                          </span>
                        </>
                      )}
                    </div>

                    {isPaid ? (
                      <div className="text-[11px] text-[#10B981] flex items-center gap-1.5">
                        <FileCheck2 className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Receipt Screenshot Uploaded:{' '}
                          <span className="font-mono-tabular">
                            {entry.receipt_file_name}
                          </span>
                        </span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-[#F59E0B] flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Payment Pending — Maintenance receipt screenshot not
                          uploaded yet
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Receipt Screenshot Preview + Status Badge + Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  {isPaid ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setViewingReceiptEntry(entry)}
                        title="Click to inspect full maintenance receipt screenshot"
                        className="cursor-pointer group relative"
                      >
                        <ReceiptScreenshotVisual
                          entry={{
                            ...entry,
                            apartment_name: currentApartment.name,
                          }}
                          compact
                        />
                      </button>

                      <div className="flex flex-col items-end gap-2">
                        <span
                          data-testid={`status-badge-${entry.flat_no}`}
                          className="px-3 py-1 rounded-full bg-[#10B981]/20 border border-[#10B981] text-[#10B981] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Paid</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingReceiptEntry(entry)}
                            className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-medium text-[#F9F9F9] flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#D4AF37]" />
                            <span>View Receipt</span>
                          </button>

                          {canUploadForThisMember && (
                            <button
                              type="button"
                              onClick={() =>
                                openUploadForMember(entry.profile.id)
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-black/40 hover:bg-black/60 border border-white/15 text-[11px] text-[#D4AF37] cursor-pointer"
                            >
                              Update Receipt
                            </button>
                          )}

                          {canManageAllSocietyBills && onMarkPending && (
                            <button
                              type="button"
                              onClick={() => onMarkPending(entry.profile.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#EF4444]/15 hover:bg-[#EF4444]/25 border border-[#EF4444]/40 text-[11px] text-[#EF4444] cursor-pointer"
                            >
                              Mark Pending
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span
                        data-testid={`status-badge-${entry.flat_no}`}
                        className="px-3.5 py-1.5 rounded-full bg-[#F59E0B]/20 border border-[#F59E0B] text-[#F59E0B] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pending</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => openUploadForMember(entry.profile.id)}
                        className="px-3.5 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#e3be42] text-[#0B0C10] font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Receipt Screenshot</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Upload Maintenance Receipt Screenshot or Picture */}
      {showUploadModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-maintenance-receipt-title"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-[#141821] border border-[#D4AF37]/50 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#D4AF37]" />
                <h2
                  id="upload-maintenance-receipt-title"
                  className="text-lg font-display font-bold text-[#F9F9F9]"
                >
                  Upload Maintenance Receipt Screenshot
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-[#F9F9F9]/60 hover:text-[#F9F9F9] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Select Society Member */}
              <div className="space-y-1.5">
                <label
                  htmlFor="maintenance-member-select"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#D4AF37]"
                >
                  Society Member &amp; Residence ({currentApartment.name})
                </label>
                <select
                  id="maintenance-member-select"
                  value={selectedProfileId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setSelectedProfileId(newId);
                    const found = societyLedger.find(
                      (item) => item.profile.id === newId
                    );
                    if (found) {
                      setAmountInput(String(found.amount));
                      setReceiptDataUrl(found.receipt_image_url || '');
                      setReceiptFileName(found.receipt_file_name || '');
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-lg bg-[#0B0C10] border border-white/20 text-xs text-[#F9F9F9] outline-none focus:border-[#D4AF37]"
                >
                  {societyLedger.map((item) => (
                    <option key={item.profile.id} value={item.profile.id}>
                      Flat {item.flat_no} — {item.member_name} (
                      {item.status === 'paid' ? 'Paid' : 'Pending'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="maintenance-amount-input"
                    className="block text-xs font-semibold uppercase tracking-wider text-[#F9F9F9]/80"
                  >
                    Maintenance Amount (₹)
                  </label>
                  <div className="relative">
                    <IndianRupee className="w-3.5 h-3.5 text-[#D4AF37] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="maintenance-amount-input"
                      type="number"
                      min="1"
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#0B0C10] border border-white/20 text-xs text-[#F9F9F9] font-mono-tabular outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="maintenance-period-input"
                    className="block text-xs font-semibold uppercase tracking-wider text-[#F9F9F9]/80"
                  >
                    Billing Period
                  </label>
                  <input
                    id="maintenance-period-input"
                    type="text"
                    value={billingPeriodInput}
                    onChange={(e) => setBillingPeriodInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0C10] border border-white/20 text-xs text-[#F9F9F9] outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="maintenance-method-select"
                    className="block text-xs font-semibold uppercase tracking-wider text-[#F9F9F9]/80"
                  >
                    Payment Receipt Type
                  </label>
                  <select
                    id="maintenance-method-select"
                    value={paymentMethod || 'UPI / IMPS Screenshot'}
                    onChange={(e) =>
                      setPaymentMethod(
                        e.target.value as MaintenanceBillRecord['payment_method']
                      )
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0C10] border border-white/20 text-xs text-[#F9F9F9] outline-none focus:border-[#D4AF37]"
                  >
                    <option value="UPI / IMPS Screenshot">
                      UPI / IMPS Screenshot
                    </option>
                    <option value="NEFT / RTGS Receipt">
                      NEFT / RTGS Receipt
                    </option>
                    <option value="Cheque Deposit Slip">
                      Cheque Deposit Slip
                    </option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="maintenance-utr-input"
                    className="block text-xs font-semibold uppercase tracking-wider text-[#F9F9F9]/80"
                  >
                    Transaction / UTR Reference
                  </label>
                  <input
                    id="maintenance-utr-input"
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="e.g. UTR6294810294"
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0C10] border border-white/20 text-xs text-[#F9F9F9] font-mono-tabular outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Screenshot / Picture File Upload Box */}
              <div className="space-y-2">
                <label
                  htmlFor="receipt-file-upload"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#D4AF37]"
                >
                  Screenshot or Picture of Maintenance Receipt
                </label>

                <div className="border-2 border-dashed border-[#D4AF37]/40 rounded-xl p-4 bg-[#0B0C10]/70 space-y-3 text-center">
                  <input
                    id="receipt-file-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-[#F9F9F9]/80 file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#D4AF37] file:text-[#0B0C10] hover:file:bg-[#e3be42] file:cursor-pointer cursor-pointer"
                  />

                  <div className="flex items-center justify-center gap-2 pt-1">
                    <span className="text-[11px] text-[#F9F9F9]/50">or</span>
                    <button
                      type="button"
                      onClick={handleAttachSampleScreenshot}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-[#D4AF37]/40 text-[11px] font-medium text-[#D4AF37] flex items-center gap-1.5 cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Attach Verified UPI Receipt Screenshot</span>
                    </button>
                  </div>

                  {receiptDataUrl && (
                    <div className="pt-2 flex flex-col items-center gap-2">
                      <div className="text-[11px] text-[#10B981] font-mono-tabular flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Attached: {receiptFileName}</span>
                      </div>
                      <ReceiptScreenshotVisual
                        entry={{
                          member_name:
                            societyLedger.find(
                              (i) => i.profile.id === selectedProfileId
                            )?.member_name || currentUser.full_name,
                          flat_no:
                            societyLedger.find(
                              (i) => i.profile.id === selectedProfileId
                            )?.flat_no || currentUser.flat_no,
                          apartment_name: currentApartment.name,
                          amount:
                            Number(amountInput) ||
                            DEFAULT_MONTHLY_MAINTENANCE_AMOUNT,
                          billing_period: billingPeriodInput,
                          payment_method: paymentMethod,
                          transaction_ref: transactionRef,
                          receipt_image_url: receiptDataUrl,
                          receipt_file_name: receiptFileName,
                        }}
                        compact
                      />
                    </div>
                  )}
                </div>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-[#EF4444]/20 border border-[#EF4444] text-xs text-[#EF4444]"
                >
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-lg border border-white/20 text-xs text-[#F9F9F9]/80 hover:text-[#F9F9F9] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#10B981] hover:bg-[#059669] text-[#0B0C10] font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Submit Receipt &amp; Mark Paid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Full Maintenance Receipt Screenshot Lightbox */}
      {viewingReceiptEntry && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-receipt-modal-title"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-[#141821] border border-[#D4AF37]/50 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2
                  id="view-receipt-modal-title"
                  className="text-lg font-display font-bold text-[#F9F9F9]"
                >
                  Maintenance Receipt Screenshot · Flat{' '}
                  {viewingReceiptEntry.flat_no}
                </h2>
                <p className="text-xs text-[#F9F9F9]/65">
                  Uploaded by {viewingReceiptEntry.member_name} ·{' '}
                  {currentApartment.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingReceiptEntry(null)}
                className="text-[#F9F9F9]/60 hover:text-[#F9F9F9] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ReceiptScreenshotVisual
              entry={{
                ...viewingReceiptEntry,
                apartment_name: currentApartment.name,
              }}
            />

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewingReceiptEntry(null)}
                className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#0B0C10] font-semibold text-xs cursor-pointer"
              >
                Close Receipt Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
