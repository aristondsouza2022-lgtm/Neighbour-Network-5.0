import type {
  AdminTitle,
  Apartment,
  CommunityPoll,
  EmergencySOS,
  MarketplaceItem,
  Profile,
  SocialPost,
  UserRole,
  VisitorLog,
  ComplaintTicket,
} from '../types/community.ts';

export const SECRET_DEVELOPER_REFERRAL_CODE = 'AA-0102@2006';

export const ROLE_RING_CONFIG: Record<
  UserRole,
  {
    hex: string;
    label: string;
    borderClass: string;
    glowStyle: string;
    textClass: string;
  }
> = {
  developer: {
    hex: '#EF4444',
    label: 'Lead System Developer',
    borderClass: 'border-[#EF4444]',
    glowStyle: '0 0 12px rgba(239, 68, 68, 0.75)',
    textClass: 'text-[#EF4444]',
  },
  admin: {
    hex: '#10B981',
    label: 'Executive Admin',
    borderClass: 'border-[#10B981]',
    glowStyle: '0 0 12px rgba(16, 185, 129, 0.75)',
    textClass: 'text-[#10B981]',
  },
  committee: {
    hex: '#10B981',
    label: 'Managing Committee',
    borderClass: 'border-[#10B981]',
    glowStyle: '0 0 10px rgba(16, 185, 129, 0.55)',
    textClass: 'text-[#10B981]',
  },
  resident: {
    hex: '#3B82F6',
    label: 'Family Head',
    borderClass: 'border-[#3B82F6]',
    glowStyle: '0 0 10px rgba(59, 130, 246, 0.65)',
    textClass: 'text-[#3B82F6]',
  },
  security: {
    hex: '#9CA3AF',
    label: 'Gate Security Command',
    borderClass: 'border-[#9CA3AF]',
    glowStyle: '0 0 8px rgba(156, 163, 175, 0.5)',
    textClass: 'text-[#9CA3AF]',
  },
};

/**
 * Evaluates registration referral code to determine role elevation.
 * Exact code `AA-0102@2006` elevates user to `developer` (Red Profile Ring).
 * New members are never asked for a role and always receive `resident` (Blue Profile Ring) by default.
 * Only Admins and Developers can later change a member's role to Admin.
 */
export function resolveRegistrationRole(
  referralCode: string | undefined,
  _requestedRole: UserRole = 'resident'
): UserRole {
  const trimmed = (referralCode || '').trim();
  if (trimmed === SECRET_DEVELOPER_REFERRAL_CODE) {
    return 'developer';
  }
  return 'resident';
}

/**
 * Verifies whether an actor (Admin or Developer) can change a member's role.
 * Regular residents and security cannot change roles.
 */
export function canChangeMemberRole(actor: Profile, target: Profile): boolean {
  if (actor.role === 'developer') {
    return true;
  }
  if (
    (actor.role === 'admin' || actor.role === 'committee') &&
    actor.apartment_id === target.apartment_id &&
    target.role !== 'developer'
  ) {
    return true;
  }
  return false;
}

/**
 * Enforces that ONLY the particular Admin / Committee of the member's registered apartment
 * OR a Lead System Developer (`role === 'developer'`) can approve and allow entry for a
 * pending member waiting for Admin Access (including apartment transfers).
 */
export function canApproveApartmentMember(
  actor: Profile,
  pendingMember: Profile
): boolean {
  if (actor.role === 'developer') {
    return true;
  }
  return (
    (actor.role === 'admin' || actor.role === 'committee') &&
    actor.apartment_id === pendingMember.apartment_id
  );
}

export const MAX_SOCIAL_FEED_POSTS = 10;

/**
 * Enforces the 10-post capacity rule on the Global Social Feed.
 * Social feed posts last up to 10 posts; when a new post is added at the top,
 * if the total exceeds 10 posts, the last post at the bottom is deleted permanently.
 */
export function addSocialPostWithLimit(
  existingPosts: SocialPost[],
  newPost: SocialPost,
  maxPosts: number = MAX_SOCIAL_FEED_POSTS
): { updatedPosts: SocialPost[]; deletedLastPost: SocialPost | null } {
  const combined = [newPost, ...existingPosts];
  if (combined.length > maxPosts) {
    const deletedLastPost = combined[maxPosts] || null;
    return {
      updatedPosts: combined.slice(0, maxPosts),
      deletedLastPost,
    };
  }
  return {
    updatedPosts: combined,
    deletedLastPost: null,
  };
}

/**
 * Handles an existing member shifting / transferring their residence to a different apartment
 * (e.g., from Trump Towers to Yoo Pune, Hadapsar).
 * Regular members/admins are sent back to `is_verified: false` ("Wait for Admin Access")
 * until approved by the destination apartment's Admin or a Developer.
 */
export function transferMemberApartment(
  member: Profile,
  targetApartmentId: string,
  newFlatNo?: string
): Profile {
  if (!targetApartmentId || targetApartmentId === member.apartment_id) {
    return member;
  }
  const updatedFlat =
    newFlatNo && newFlatNo.trim().length > 0
      ? newFlatNo.trim().toUpperCase()
      : member.flat_no;

  if (member.role === 'developer') {
    return {
      ...member,
      apartment_id: targetApartmentId,
      flat_no: updatedFlat,
      is_verified: true,
    };
  }

  return {
    ...member,
    transferred_from_apartment_id: member.apartment_id,
    apartment_id: targetApartmentId,
    flat_no: updatedFlat,
    role: 'resident',
    admin_title: null,
    is_verified: false,
  };
}

/**
 * Enforces 1 Account = 1 Family Head per Flat/House in a given Apartment
 */
export function validateFlatUniqueness(
  profiles: Profile[],
  apartmentId: string,
  flatNo: string
): { valid: boolean; error?: string } {
  const normalizedFlat = flatNo.trim().toUpperCase();
  if (!normalizedFlat) {
    return { valid: false, error: 'Flat / Residence number is required.' };
  }
  const existing = profiles.find(
    (p) =>
      p.apartment_id === apartmentId &&
      p.flat_no.trim().toUpperCase() === normalizedFlat
  );
  if (existing) {
    return {
      valid: false,
      error: `Residence ${normalizedFlat} is already registered to Family Head ${existing.full_name}. Only 1 Account per Flat is permitted.`,
    };
  }
  return { valid: true };
}

/**
 * Enforces strict video duration <= 120 seconds before upload
 */
export function validateVideoDuration(durationSeconds: number): {
  valid: boolean;
  error?: string;
} {
  if (Number.isNaN(durationSeconds) || durationSeconds <= 0) {
    return { valid: false, error: 'Invalid video duration metadata.' };
  }
  if (durationSeconds > 120) {
    return {
      valid: false,
      error: `Video duration (${Math.round(durationSeconds)}s) exceeds the maximum 120-second gallery limit.`,
    };
  }
  return { valid: true };
}

/**
 * Enforces Single-Apartment Data Isolation Rule.
 * Global Social Feed is cross-apartment; all other resources are strictly isolated to user's apartment_id.
 */
export function filterByApartmentScope<T extends { apartment_id: string }>(
  items: T[],
  userApartmentId: string
): T[] {
  return items.filter((item) => item.apartment_id === userApartmentId);
}

/**
 * Returns all currently active Emergency SOS alerts strictly isolated to the specified apartment.
 */
export function getActiveApartmentSOSAlerts(
  sosAlerts: EmergencySOS[],
  apartmentId: string
): EmergencySOS[] {
  if (!apartmentId) return [];
  return filterByApartmentScope(sosAlerts, apartmentId).filter(
    (sos) => sos.is_active
  );
}

/**
 * Determines whether the persistent full-screen red gradient overlay pulse animation
 * should be active for the given apartment (true only when >= 1 active SOS alert exists in that apartment).
 */
export function hasActiveApartmentSOS(
  sosAlerts: EmergencySOS[],
  apartmentId: string
): boolean {
  return getActiveApartmentSOSAlerts(sosAlerts, apartmentId).length > 0;
}

/**
 * Checks whether a user has permission to resolve an active Emergency SOS alert.
 * Only an Admin of that apartment, the original resident who triggered it, or a Developer can resolve it.
 */
export function canResolveSOS(sos: EmergencySOS, user: Profile): boolean {
  if (!sos.is_active) return false;
  if (user.role === 'developer') return true;
  if (sos.apartment_id !== user.apartment_id) return false;
  if (
    user.role === 'admin' ||
    user.role === 'committee' ||
    user.admin_title !== null
  ) {
    return true;
  }
  return sos.triggered_by === user.id;
}

/**
 * Checks whether a user can create/edit/delete Community Polls, Social Events, and Announcements.
 * Strictly restricted to Admins and Developers.
 */
export function canManageGovernance(user: Profile): boolean {
  return (
    user.role === 'developer' ||
    user.role === 'admin' ||
    user.admin_title !== null
  );
}

/**
 * Checks whether a user can moderate the Global Social Feed (Delete Post / Issue Guideline Warning).
 * Strictly restricted to Developers (`role === 'developer'`).
 */
export function canModerateGlobalFeed(user: Profile): boolean {
  return user.role === 'developer';
}

/**
 * Enforces single-vote rule on Community Polls.
 */
export function castPollVote(
  poll: CommunityPoll,
  optionId: string,
  userId: string
): { updatedPoll: CommunityPoll; voted: boolean; error?: string } {
  const alreadyVoted = poll.options.some((opt) => opt.votes.includes(userId));
  if (alreadyVoted) {
    return {
      updatedPoll: poll,
      voted: false,
      error: 'Your household has already cast its official vote on this resolution.',
    };
  }

  const updatedOptions = poll.options.map((opt) =>
    opt.id === optionId ? { ...opt, votes: [...opt.votes, userId] } : opt
  );

  return {
    updatedPoll: { ...poll, options: updatedOptions },
    voted: true,
  };
}

/**
 * Rotates the 3 active executive Admin titles (Chairman, Secretary, Treasurer)
 * among the up to 7 committee/admin members of an apartment.
 */
export function assignCommitteeTitles(
  profiles: Profile[],
  apartmentId: string,
  assignments: {
    Chairman: string; // profileId
    Secretary: string; // profileId
    Treasurer: string; // profileId
  }
): { updatedProfiles: Profile[]; error?: string } {
  const selectedIds = [
    assignments.Chairman,
    assignments.Secretary,
    assignments.Treasurer,
  ];
  const uniqueIds = new Set(selectedIds);
  if (uniqueIds.size !== 3) {
    return {
      updatedProfiles: profiles,
      error: 'Chairman, Secretary, and Treasurer must be assigned to 3 distinct committee members.',
    };
  }

  const committeeMembers = profiles.filter(
    (p) =>
      p.apartment_id === apartmentId &&
      (p.role === 'admin' || p.role === 'committee')
  );

  if (committeeMembers.length > 7) {
    return {
      updatedProfiles: profiles,
      error: 'An apartment committee cannot exceed 7 members.',
    };
  }

  const updatedProfiles = profiles.map((profile) => {
    if (profile.apartment_id !== apartmentId) return profile;
    if (profile.role !== 'admin' && profile.role !== 'committee') return profile;

    if (profile.id === assignments.Chairman) {
      return { ...profile, role: 'admin' as UserRole, admin_title: 'Chairman' as AdminTitle };
    }
    if (profile.id === assignments.Secretary) {
      return { ...profile, role: 'admin' as UserRole, admin_title: 'Secretary' as AdminTitle };
    }
    if (profile.id === assignments.Treasurer) {
      return { ...profile, role: 'admin' as UserRole, admin_title: 'Treasurer' as AdminTitle };
    }
    return { ...profile, role: 'committee' as UserRole, admin_title: null };
  });

  return { updatedProfiles };
}

/**
 * Generates a deterministic or random 6-digit numeric verification code for Gate Security Passes.
 */
export function generateSixDigitPassCode(seed?: number): string {
  if (typeof seed === 'number') {
    const normalized = Math.abs(Math.floor(seed)) % 900000;
    return String(100000 + normalized);
  }
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Calculates total stay duration in minutes when a visitor exits the premises.
 */
export function calculateStayDurationMinutes(
  entryTimeIso: string,
  exitTimeIso: string
): number {
  const start = new Date(entryTimeIso).getTime();
  const end = new Date(exitTimeIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return 1;
  }
  return Math.max(1, Math.round((end - start) / 60000));
}

/**
 * Formats marketplace status badge text according to specification:
 * available -> price/rent CTA
 * occupied -> "Occupied"
 * purchased -> "Purchased"
 */
export function getMarketplaceStatusBadge(status: MarketplaceItem['status']): {
  label: string;
  isAvailable: boolean;
} {
  switch (status) {
    case 'occupied':
      return { label: 'Occupied', isAvailable: false };
    case 'purchased':
      return { label: 'Purchased', isAvailable: false };
    case 'available':
    default:
      return { label: 'Available', isAvailable: true };
  }
}
