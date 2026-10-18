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

test('Backend rules: secret referral code AA-0102@2006 elevates role to developer', () => {
  assert.equal(resolveRegistrationRole('AA-0102@2006'), 'developer');
  assert.equal(resolveRegistrationRole('INVALID-CODE'), 'resident');
});

test('Backend rules: social feed FILO 10-post cap deletes last post when new post is added', () => {
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
  assert.equal(result.deletedLastPost?.id, 'post-10');
});

test('Backend rules: apartment transfer sends member to wait for destination admin approval', () => {
  const trumpMember = mockProfiles[4];
  const shiftedToYoo = transferMemberApartment(trumpMember, 'apt-yoo', 'C-1202');
  assert.equal(shiftedToYoo.apartment_id, 'apt-yoo');
  assert.equal(shiftedToYoo.is_verified, false);
  assert.equal(shiftedToYoo.transferred_from_apartment_id, 'apt-trump');
});

test('Backend rules: maintenance & bills ledger and receipt screenshot upload', () => {
  const initialRecords: MaintenanceBillRecord[] = [];
  const ledgerBefore = buildSocietyMaintenanceLedger(mockProfiles, initialRecords, 'apt-trump');
  assert.equal(getSocietyMaintenanceSummary(ledgerBefore).pendingCount, 5);

  const uploadResult = submitMaintenanceReceipt(initialRecords, {
    apartment_id: 'apt-trump',
    profile_id: 'p-1',
    flat_no: 'A-2101',
    member_name: 'Vikramaditya Singhania',
    amount: 18500,
    receipt_image_url: 'receipt-visual://trump-a2101-oct2026',
  });
  assert.equal(uploadResult.error, undefined);

  const ledgerAfter = buildSocietyMaintenanceLedger(mockProfiles, uploadResult.updatedRecords, 'apt-trump');
  assert.equal(getSocietyMaintenanceSummary(ledgerAfter).paidCount, 1);
  assert.equal(getSocietyMaintenanceSummary(ledgerAfter).pendingCount, 4);
});
