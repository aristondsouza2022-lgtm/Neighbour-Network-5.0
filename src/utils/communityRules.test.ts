import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveRegistrationRole,
  canChangeMemberRole,
  canApproveApartmentMember,
  addSocialPostWithLimit,
  transferMemberApartment,
  MAX_SOCIAL_FEED_POSTS,
  validateFlatUniqueness,
  validateVideoDuration,
  filterByApartmentScope,
  getActiveApartmentSOSAlerts,
  hasActiveApartmentSOS,
  canResolveSOS,
  castPollVote,
  assignCommitteeTitles,
  generateSixDigitPassCode,
  calculateStayDurationMinutes,
  getMarketplaceStatusBadge,
  buildSocietyMaintenanceLedger,
  submitMaintenanceReceipt,
  getSocietyMaintenanceSummary,
} from './communityRules.ts';
import type {
  Profile,
  EmergencySOS,
  CommunityPoll,
  SocialPost,
  MaintenanceBillRecord,
} from '../types/community.ts';

const mockProfiles: Profile[] = [
  {
    id: 'p-1',
    full_name: 'Vikramaditya Singhania',
    email: 'vikram@trumptowers.in',
    apartment_id: 'apt-trump',
    flat_no: 'A-2101',
    role: 'admin',
    admin_title: 'Chairman',
    is_verified: true,
    warnings_count: 0,
    created_at: '2026-10-01T10:00:00Z',
  },
  {
    id: 'p-2',
    full_name: 'Meera Deshmukh',
    email: 'meera@trumptowers.in',
    apartment_id: 'apt-trump',
    flat_no: 'B-1402',
    role: 'admin',
    admin_title: 'Secretary',
    is_verified: true,
    warnings_count: 0,
    created_at: '2026-10-01T10:00:00Z',
  },
  {
    id: 'p-3',
    full_name: 'Rohan Kirloskar',
    email: 'rohan@trumptowers.in',
    apartment_id: 'apt-trump',
    flat_no: 'A-1801',
    role: 'admin',
    admin_title: 'Treasurer',
    is_verified: true,
    warnings_count: 0,
    created_at: '2026-10-01T10:00:00Z',
  },
  {
    id: 'p-4',
    full_name: 'Ananya Joshi',
    email: 'ananya@trumptowers.in',
    apartment_id: 'apt-trump',
    flat_no: 'A-0901',
    role: 'committee',
    admin_title: null,
    is_verified: true,
    warnings_count: 0,
    created_at: '2026-10-01T10:00:00Z',
  },
  {
    id: 'p-5',
    full_name: 'Kabir Malhotra',
    email: 'kabir@trumptowers.in',
    apartment_id: 'apt-trump',
    flat_no: 'B-0501',
    role: 'resident',
    admin_title: null,
    is_verified: true,
    warnings_count: 0,
    created_at: '2026-10-01T10:00:00Z',
  },
];

test('secret referral code AA-0102@2006 elevates role to developer, otherwise always resident default', () => {
  assert.equal(resolveRegistrationRole('AA-0102@2006'), 'developer');
  assert.equal(resolveRegistrationRole('  AA-0102@2006 '), 'developer');
  assert.equal(resolveRegistrationRole('INVALID-CODE'), 'resident');
  assert.equal(resolveRegistrationRole(''), 'resident');
  assert.equal(resolveRegistrationRole(undefined, 'admin'), 'resident');
  assert.equal(resolveRegistrationRole(undefined, 'security'), 'resident');
});

test('only admins and developers can change a resident role', () => {
  const adminProfile = mockProfiles[0]; // Chairman admin in apt-trump
  const committeeProfile = mockProfiles[3]; // Committee in apt-trump
  const residentProfile = mockProfiles[4]; // Resident in apt-trump
  const developerProfile: Profile = {
    ...mockProfiles[0],
    id: 'p-dev',
    role: 'developer',
  };

  assert.equal(canChangeMemberRole(developerProfile, residentProfile), true);
  assert.equal(canChangeMemberRole(adminProfile, residentProfile), true);
  assert.equal(canChangeMemberRole(committeeProfile, residentProfile), true);
  assert.equal(canChangeMemberRole(residentProfile, residentProfile), false);
});

test('both the particular admin of that apartment and developer role can approve/add a pending member entry', () => {
  const trumpAdmin = mockProfiles[0];
  const developerActor: Profile = {
    ...mockProfiles[0],
    id: 'p-dev-allwyn',
    apartment_id: 'apt-panchshil',
    role: 'developer',
  };
  const amanoraAdmin: Profile = {
    ...mockProfiles[0],
    id: 'p-amanora-admin',
    apartment_id: 'apt-amanora',
    role: 'admin',
  };
  const pendingTrumpMember: Profile = {
    ...mockProfiles[4],
    id: 'p-pending',
    apartment_id: 'apt-trump',
    is_verified: false,
  };

  assert.equal(canApproveApartmentMember(trumpAdmin, pendingTrumpMember), true);
  assert.equal(canApproveApartmentMember(developerActor, pendingTrumpMember), true);
  assert.equal(canApproveApartmentMember(amanoraAdmin, pendingTrumpMember), false);
  assert.equal(canApproveApartmentMember(mockProfiles[4], pendingTrumpMember), false);
});

test('social feed posts last up to 10 posts and permanently delete the last post when a new post is added', () => {
  const tenPosts: SocialPost[] = Array.from({ length: 10 }, (_, idx) => ({
    id: `post-${idx + 1}`,
    author_id: 'p-1',
    apartment_id: 'apt-trump',
    content: `Post number ${idx + 1}`,
    likes_count: 0,
    liked_by: [],
    comments: [],
    created_at: `2026-10-17T0${idx}:00:00Z`,
  }));

  const newEleventhPost: SocialPost = {
    id: 'post-new-11',
    author_id: 'p-5',
    apartment_id: 'apt-trump',
    content: 'Brand new post at the top',
    likes_count: 0,
    liked_by: [],
    comments: [],
    created_at: '2026-10-17T12:00:00Z',
  };

  const result = addSocialPostWithLimit(tenPosts, newEleventhPost, MAX_SOCIAL_FEED_POSTS);
  assert.equal(result.updatedPosts.length, 10);
  assert.equal(result.updatedPosts[0].id, 'post-new-11');
  assert.equal(result.updatedPosts[9].id, 'post-9');
  assert.equal(result.deletedLastPost?.id, 'post-10');
});

test('when an existing member shifts from Trump Towers to Yoo Pune Hadapsar, they are sent back to wait for admin approval', () => {
  const trumpMember = mockProfiles[4]; // Verified resident in apt-trump
  assert.equal(trumpMember.is_verified, true);
  assert.equal(trumpMember.apartment_id, 'apt-trump');

  const shiftedToYoo = transferMemberApartment(trumpMember, 'apt-yoo', 'C-1202');
  assert.equal(shiftedToYoo.apartment_id, 'apt-yoo');
  assert.equal(shiftedToYoo.flat_no, 'C-1202');
  assert.equal(shiftedToYoo.is_verified, false);
  assert.equal(shiftedToYoo.transferred_from_apartment_id, 'apt-trump');

  const yooAdmin: Profile = {
    ...mockProfiles[0],
    id: 'prof-yoo-chair',
    apartment_id: 'apt-yoo',
    role: 'admin',
  };
  // Old Trump Towers admin cannot approve the member in Yoo Pune; Yoo Pune Admin (or Developer) must approve
  assert.equal(canApproveApartmentMember(mockProfiles[0], shiftedToYoo), false);
  assert.equal(canApproveApartmentMember(yooAdmin, shiftedToYoo), true);
});

test('1 Account = 1 Family Head per Flat uniqueness check per apartment', () => {
  const duplicate = validateFlatUniqueness(mockProfiles, 'apt-trump', 'a-2101');
  assert.equal(duplicate.valid, false);

  const differentAptSameFlat = validateFlatUniqueness(mockProfiles, 'apt-amanora', 'A-2101');
  assert.equal(differentAptSameFlat.valid, true);

  const newFlatSameApt = validateFlatUniqueness(mockProfiles, 'apt-trump', 'A-2201');
  assert.equal(newFlatSameApt.valid, true);
});

test('video duration strictly validates <= 120 seconds', () => {
  assert.equal(validateVideoDuration(45).valid, true);
  assert.equal(validateVideoDuration(120).valid, true);
  assert.equal(validateVideoDuration(120.5).valid, false);
  assert.equal(validateVideoDuration(0).valid, false);
});

test('apartment isolation filters strictly by user apartment_id', () => {
  const items = [
    { id: '1', apartment_id: 'apt-trump' },
    { id: '2', apartment_id: 'apt-yoo' },
    { id: '3', apartment_id: 'apt-trump' },
  ];
  const isolated = filterByApartmentScope(items, 'apt-trump');
  assert.equal(isolated.length, 2);
  assert.deepEqual(isolated.map((i) => i.id), ['1', '3']);
});

test('Emergency SOS resolution authorization checks', () => {
  const sos: EmergencySOS = {
    id: 'sos-1',
    apartment_id: 'apt-trump',
    triggered_by: 'p-5',
    triggered_by_name: 'Kabir Malhotra',
    flat_no: 'B-0501',
    emergency_type: 'Medical Critical',
    reason: 'Cardiac assist needed in lobby',
    is_active: true,
    created_at: '2026-10-17T08:00:00Z',
  };

  // Triggering resident can resolve
  assert.equal(canResolveSOS(sos, mockProfiles[4]), true);
  // Apartment Admin can resolve
  assert.equal(canResolveSOS(sos, mockProfiles[0]), true);
  // Unrelated resident cannot resolve
  const otherResident: Profile = {
    ...mockProfiles[4],
    id: 'p-99',
    flat_no: 'B-0902',
  };
  assert.equal(canResolveSOS(sos, otherResident), false);
});

test('hasActiveApartmentSOS triggers full-screen red gradient overlay ONLY when an active SOS alert exists in that apartment', () => {
  const alerts: EmergencySOS[] = [
    {
      id: 'sos-trump-resolved',
      apartment_id: 'apt-trump',
      triggered_by: 'p-5',
      triggered_by_name: 'Kabir Malhotra',
      flat_no: 'B-0501',
      emergency_type: 'Medical Critical',
      reason: 'Resolved medical call',
      is_active: false,
      created_at: '2026-10-17T08:00:00Z',
    },
    {
      id: 'sos-yoo-active',
      apartment_id: 'apt-yoo',
      triggered_by: 'prof-yoo-chair',
      triggered_by_name: 'Rohan Deshmukh',
      flat_no: 'A-1001',
      emergency_type: 'Fire Emergency',
      reason: 'Smoke detector triggered in basement B1',
      is_active: true,
      created_at: '2026-10-17T09:30:00Z',
    },
  ];

  // apt-trump has only a resolved SOS -> should NOT trigger full-screen red overlay
  assert.equal(hasActiveApartmentSOS(alerts, 'apt-trump'), false);
  assert.equal(getActiveApartmentSOSAlerts(alerts, 'apt-trump').length, 0);

  // apt-yoo has an active SOS -> SHOULD trigger full-screen red overlay
  assert.equal(hasActiveApartmentSOS(alerts, 'apt-yoo'), true);
  assert.equal(getActiveApartmentSOSAlerts(alerts, 'apt-yoo').length, 1);

  // apt-panchshil has no SOS alerts -> should NOT trigger full-screen red overlay
  assert.equal(hasActiveApartmentSOS(alerts, 'apt-panchshil'), false);
});

test('Community poll enforces single household vote', () => {
  const poll: CommunityPoll = {
    id: 'poll-1',
    apartment_id: 'apt-trump',
    created_by: 'p-1',
    question: 'Approve Skydeck Heated Pool Upgrade?',
    description: 'Proposal for Q4 temperature regulation system',
    closes_at: '2026-11-01',
    created_at: '2026-10-10',
    options: [
      { id: 'opt-1', label: 'Approve', votes: [] },
      { id: 'opt-2', label: 'Defer', votes: [] },
    ],
  };

  const firstVote = castPollVote(poll, 'opt-1', 'p-5');
  assert.equal(firstVote.voted, true);
  assert.equal(firstVote.updatedPoll.options[0].votes.length, 1);

  const secondVote = castPollVote(firstVote.updatedPoll, 'opt-2', 'p-5');
  assert.equal(secondVote.voted, false);
  assert.ok(secondVote.error);
});

test('Committee Role Switcher rotates Chairman, Secretary, Treasurer among 7 members', () => {
  const result = assignCommitteeTitles(mockProfiles, 'apt-trump', {
    Chairman: 'p-4',
    Secretary: 'p-1',
    Treasurer: 'p-2',
  });
  assert.equal(result.error, undefined);

  const newChair = result.updatedProfiles.find((p) => p.id === 'p-4');
  const formerTreasurer = result.updatedProfiles.find((p) => p.id === 'p-3');

  assert.equal(newChair?.admin_title, 'Chairman');
  assert.equal(newChair?.role, 'admin');
  assert.equal(formerTreasurer?.admin_title, null);
  assert.equal(formerTreasurer?.role, 'committee');
});

test('Gate pass 6-digit code and stay duration calculation', () => {
  const code = generateSixDigitPassCode(48291);
  assert.equal(code.length, 6);
  assert.match(code, /^\d{6}$/);

  const duration = calculateStayDurationMinutes(
    '2026-10-17T10:00:00.000Z',
    '2026-10-17T11:45:00.000Z'
  );
  assert.equal(duration, 105);
});

test('Marketplace dynamic status badges match specification', () => {
  assert.equal(getMarketplaceStatusBadge('available').label, 'Available');
  assert.equal(getMarketplaceStatusBadge('occupied').label, 'Occupied');
  assert.equal(getMarketplaceStatusBadge('purchased').label, 'Purchased');
});

test('Society Maintenance & Bills ledger shows members with uploaded receipt as paid and others as pending', () => {
  const initialRecords: MaintenanceBillRecord[] = [
    {
      id: 'maint-1',
      apartment_id: 'apt-trump',
      profile_id: 'p-1',
      flat_no: 'A-2101',
      member_name: 'Vikramaditya Singhania',
      billing_period: 'October 2026',
      amount: 18500,
      status: 'paid',
      receipt_image_url: 'receipt-visual://trump-a2101-oct2026',
      receipt_file_name: 'trump_a2101_upi_receipt.png',
      payment_method: 'UPI / IMPS Screenshot',
      transaction_ref: 'UTR62940182',
      paid_at: '2026-10-05T10:15:00Z',
      updated_at: '2026-10-05T10:15:00Z',
    },
  ];

  const ledger = buildSocietyMaintenanceLedger(
    mockProfiles,
    initialRecords,
    'apt-trump',
    18500,
    'October 2026'
  );

  assert.equal(ledger.length, 5);
  const p1Entry = ledger.find((e) => e.profile.id === 'p-1');
  const p5Entry = ledger.find((e) => e.profile.id === 'p-5');

  assert.equal(p1Entry?.status, 'paid');
  assert.equal(p1Entry?.receipt_image_url, 'receipt-visual://trump-a2101-oct2026');
  assert.equal(p5Entry?.status, 'pending');
  assert.equal(p5Entry?.receipt_image_url, null);

  const summaryBefore = getSocietyMaintenanceSummary(ledger);
  assert.equal(summaryBefore.totalMembers, 5);
  assert.equal(summaryBefore.paidCount, 1);
  assert.equal(summaryBefore.pendingCount, 4);

  // Uploading a maintenance receipt screenshot transitions pending member p-5 to paid
  const uploadResult = submitMaintenanceReceipt(initialRecords, {
    apartment_id: 'apt-trump',
    profile_id: 'p-5',
    flat_no: 'B-0501',
    member_name: 'Kabir Malhotra',
    amount: 18500,
    billing_period: 'October 2026',
    receipt_image_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    receipt_file_name: 'kabir_b0501_receipt.png',
    payment_method: 'UPI / IMPS Screenshot',
    transaction_ref: 'UTR99887766',
  });

  assert.equal(uploadResult.error, undefined);
  const updatedLedger = buildSocietyMaintenanceLedger(
    mockProfiles,
    uploadResult.updatedRecords,
    'apt-trump',
    18500,
    'October 2026'
  );
  const updatedP5 = updatedLedger.find((e) => e.profile.id === 'p-5');
  assert.equal(updatedP5?.status, 'paid');
  assert.ok(updatedP5?.receipt_image_url);

  const summaryAfter = getSocietyMaintenanceSummary(updatedLedger);
  assert.equal(summaryAfter.paidCount, 2);
  assert.equal(summaryAfter.pendingCount, 3);
});

