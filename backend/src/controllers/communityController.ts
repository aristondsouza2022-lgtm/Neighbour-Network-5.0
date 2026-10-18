import type { Request, Response } from 'express';
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
} from '../data/seedData.ts';
import {
  addSocialPostWithLimit,
  assignCommitteeTitles,
  buildSocietyMaintenanceLedger,
  calculateStayDurationMinutes,
  canApproveApartmentMember,
  canChangeMemberRole,
  canResolveSOS,
  castPollVote,
  filterByApartmentScope,
  generateSixDigitPassCode,
  getSocietyMaintenanceSummary,
  resolveRegistrationRole,
  submitMaintenanceReceipt,
  transferMemberApartment,
  validateFlatUniqueness,
} from '../utils/communityRules.ts';
import type {
  Announcement,
  Apartment,
  ComplaintTicket,
  CommunityPoll,
  EmergencySOS,
  MaintenanceBillRecord,
  MarketplaceItem,
  Profile,
  SocialEvent,
  SocialPost,
  VisitorLog,
} from '../types/community.ts';

// In-memory state store initialized from seedData
let apartments: Apartment[] = [...INITIAL_APARTMENTS];
let profiles: Profile[] = [...INITIAL_PROFILES];
let posts: SocialPost[] = [...INITIAL_SOCIAL_POSTS];
let marketplaceItems: MarketplaceItem[] = [...INITIAL_MARKETPLACE_ITEMS];
let polls: CommunityPoll[] = [...INITIAL_POLLS];
let events: SocialEvent[] = [...INITIAL_EVENTS];
let announcements: Announcement[] = [...INITIAL_ANNOUNCEMENTS];
let sosAlerts: EmergencySOS[] = [...INITIAL_SOS_ALERTS];
let complaints: ComplaintTicket[] = [...INITIAL_COMPLAINTS];
let visitorLogs: VisitorLog[] = [...INITIAL_VISITOR_LOGS];
let maintenanceRecords: MaintenanceBillRecord[] = [...INITIAL_MAINTENANCE_RECORDS];

export const communityController = {
  getHealth(_req: Request, res: Response) {
    res.json({
      status: 'ok',
      service: 'Neighbour Network Backend API',
      apartmentsCount: apartments.length,
      profilesCount: profiles.length,
      activeFeedPostsCount: posts.length,
    });
  },

  getBootstrap(_req: Request, res: Response) {
    res.json({
      apartments,
      profiles,
      posts,
      marketplaceItems,
      polls,
      events,
      announcements,
      sosAlerts,
      complaints,
      visitorLogs,
      maintenanceRecords,
    });
  },

  getApartments(_req: Request, res: Response) {
    res.json(apartments);
  },

  createApartment(req: Request, res: Response) {
    const { name, location, max_houses, model_3d_url, custom_model_spec } = req.body;
    const newApt: Apartment = {
      id: `apt-${Date.now()}`,
      name,
      location,
      max_houses: Number(max_houses) || 300,
      model_3d_url: model_3d_url || 'procedural://new-pune-estate',
      custom_model_spec,
      created_at: new Date().toISOString(),
    };
    apartments = [...apartments, newApt];
    res.status(201).json(newApt);
  },

  getProfiles(req: Request, res: Response) {
    const { apartmentId } = req.query;
    if (typeof apartmentId === 'string' && apartmentId) {
      res.json(filterByApartmentScope(profiles, apartmentId));
      return;
    }
    res.json(profiles);
  },

  registerProfile(req: Request, res: Response) {
    const { fullName, email, apartmentId, flatNo, referralCode } = req.body;
    const uniqueness = validateFlatUniqueness(profiles, apartmentId, flatNo);
    if (!uniqueness.valid) {
      res.status(400).json({ error: uniqueness.error });
      return;
    }

    const role = resolveRegistrationRole(referralCode);
    const newProfile: Profile = {
      id: `prof-user-${Date.now()}`,
      full_name: fullName,
      email: String(email).toLowerCase(),
      apartment_id: apartmentId,
      flat_no: String(flatNo).toUpperCase(),
      role,
      admin_title: null,
      is_verified: role === 'developer',
      warnings_count: 0,
      created_at: new Date().toISOString(),
    };
    profiles = [newProfile, ...profiles];
    res.status(201).json(newProfile);
  },

  approveMember(req: Request, res: Response) {
    const { actorId, targetProfileId } = req.body;
    const actor = profiles.find((p) => p.id === actorId);
    const target = profiles.find((p) => p.id === targetProfileId);
    if (!actor || !target) {
      res.status(404).json({ error: 'Actor or pending member not found.' });
      return;
    }
    if (!canApproveApartmentMember(actor, target)) {
      res.status(403).json({
        error: 'Only the destination apartment Admin or a Lead Developer can approve this member.',
      });
      return;
    }

    profiles = profiles.map((p) =>
      p.id === targetProfileId
        ? { ...p, is_verified: true, transferred_from_apartment_id: null }
        : p
    );
    const updated = profiles.find((p) => p.id === targetProfileId);
    res.json(updated);
  },

  transferApartment(req: Request, res: Response) {
    const { profileId, targetApartmentId, newFlatNo } = req.body;
    const member = profiles.find((p) => p.id === profileId);
    if (!member) {
      res.status(404).json({ error: 'Member profile not found.' });
      return;
    }

    const updatedMember = transferMemberApartment(member, targetApartmentId, newFlatNo);
    profiles = profiles.map((p) => (p.id === profileId ? updatedMember : p));
    res.json(updatedMember);
  },

  changeMemberRole(req: Request, res: Response) {
    const { actorId, targetProfileId, targetRole } = req.body;
    const actor = profiles.find((p) => p.id === actorId);
    const target = profiles.find((p) => p.id === targetProfileId);
    if (!actor || !target) {
      res.status(404).json({ error: 'Actor or target member not found.' });
      return;
    }
    if (!canChangeMemberRole(actor, target)) {
      res.status(403).json({ error: 'Unauthorized role change request.' });
      return;
    }

    profiles = profiles.map((p) =>
      p.id === targetProfileId
        ? {
            ...p,
            role: targetRole,
            admin_title: targetRole === 'admin' || targetRole === 'committee' ? p.admin_title : null,
          }
        : p
    );
    res.json(profiles.find((p) => p.id === targetProfileId));
  },

  rotateCommitteeTitles(req: Request, res: Response) {
    const { apartmentId, assignments } = req.body;
    const result = assignCommitteeTitles(profiles, apartmentId, assignments);
    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }
    profiles = result.updatedProfiles;
    res.json(filterByApartmentScope(profiles, apartmentId));
  },

  getPosts(_req: Request, res: Response) {
    res.json(posts);
  },

  createPost(req: Request, res: Response) {
    const { author_id, apartment_id, content, media_url, media_type, video_duration_sec } = req.body;
    const newPost: SocialPost = {
      id: `post-${Date.now()}`,
      author_id,
      apartment_id,
      content,
      media_url: media_url || null,
      media_type: media_type || null,
      video_duration_sec,
      likes_count: 0,
      liked_by: [],
      comments: [],
      created_at: new Date().toISOString(),
    };
    const result = addSocialPostWithLimit(posts, newPost);
    posts = result.updatedPosts;
    res.status(201).json(result);
  },

  getMarketplace(req: Request, res: Response) {
    const { apartmentId } = req.query;
    if (typeof apartmentId === 'string' && apartmentId) {
      res.json(filterByApartmentScope(marketplaceItems, apartmentId));
      return;
    }
    res.json(marketplaceItems);
  },

  getPolls(req: Request, res: Response) {
    const { apartmentId } = req.query;
    if (typeof apartmentId === 'string' && apartmentId) {
      res.json(filterByApartmentScope(polls, apartmentId));
      return;
    }
    res.json(polls);
  },

  votePoll(req: Request, res: Response) {
    const { pollId, optionId, userId } = req.body;
    const poll = polls.find((p) => p.id === pollId);
    if (!poll) {
      res.status(404).json({ error: 'Poll not found.' });
      return;
    }
    const result = castPollVote(poll, optionId, userId);
    if (!result.voted) {
      res.status(400).json({ error: result.error });
      return;
    }
    polls = polls.map((p) => (p.id === pollId ? result.updatedPoll : p));
    res.json(result.updatedPoll);
  },

  getSOSAlerts(req: Request, res: Response) {
    const { apartmentId } = req.query;
    if (typeof apartmentId === 'string' && apartmentId) {
      res.json(filterByApartmentScope(sosAlerts, apartmentId));
      return;
    }
    res.json(sosAlerts);
  },

  triggerSOS(req: Request, res: Response) {
    const { apartment_id, triggered_by, triggered_by_name, flat_no, emergency_type, reason } = req.body;
    const newSOS: EmergencySOS = {
      id: `sos-${Date.now()}`,
      apartment_id,
      triggered_by,
      triggered_by_name,
      flat_no,
      emergency_type,
      reason,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    sosAlerts = [newSOS, ...sosAlerts];
    res.status(201).json(newSOS);
  },

  resolveSOS(req: Request, res: Response) {
    const { sosId, userId } = req.body;
    const sos = sosAlerts.find((s) => s.id === sosId);
    const user = profiles.find((p) => p.id === userId);
    if (!sos || !user) {
      res.status(404).json({ error: 'SOS alert or user not found.' });
      return;
    }
    if (!canResolveSOS(sos, user)) {
      res.status(403).json({ error: 'Not authorized to resolve this SOS alert.' });
      return;
    }
    sosAlerts = sosAlerts.map((s) =>
      s.id === sosId
        ? {
            ...s,
            is_active: false,
            resolved_by: user.id,
            resolved_by_name: user.full_name,
            resolved_at: new Date().toISOString(),
          }
        : s
    );
    res.json(sosAlerts.find((s) => s.id === sosId));
  },

  getVisitorLogs(req: Request, res: Response) {
    const { apartmentId } = req.query;
    if (typeof apartmentId === 'string' && apartmentId) {
      res.json(filterByApartmentScope(visitorLogs, apartmentId));
      return;
    }
    res.json(visitorLogs);
  },

  createVisitorPass(req: Request, res: Response) {
    const { apartment_id, resident_id, flat_no, visitor_name, visitor_type, company_or_relation, expected_time, vehicle_no } = req.body;
    const newPass: VisitorLog = {
      id: `vis-${Date.now()}`,
      apartment_id,
      resident_id,
      flat_no,
      visitor_name,
      visitor_type,
      company_or_relation,
      expected_time,
      vehicle_no: vehicle_no || null,
      pass_code: generateSixDigitPassCode(),
      status: 'pre_booked',
      entry_time: null,
      exit_time: null,
      duration_minutes: null,
      created_at: new Date().toISOString(),
    };
    visitorLogs = [newPass, ...visitorLogs];
    res.status(201).json(newPass);
  },

  updateVisitorStatus(req: Request, res: Response) {
    const { visitorId, nextStatus } = req.body;
    const nowIso = new Date().toISOString();
    visitorLogs = visitorLogs.map((v) => {
      if (v.id !== visitorId) return v;
      if (nextStatus === 'inside') {
        return { ...v, status: 'inside', entry_time: nowIso };
      }
      if (nextStatus === 'exited') {
        const entryIso = v.entry_time || v.created_at;
        return {
          ...v,
          status: 'exited',
          exit_time: nowIso,
          duration_minutes: calculateStayDurationMinutes(entryIso, nowIso),
        };
      }
      return v;
    });
    res.json(visitorLogs.find((v) => v.id === visitorId));
  },

  getSocietyMaintenance(req: Request, res: Response) {
    const { apartmentId } = req.params;
    const ledger = buildSocietyMaintenanceLedger(profiles, maintenanceRecords, apartmentId);
    const summary = getSocietyMaintenanceSummary(ledger);
    res.json({ ledger, summary, records: filterByApartmentScope(maintenanceRecords, apartmentId) });
  },

  uploadMaintenanceReceipt(req: Request, res: Response) {
    const result = submitMaintenanceReceipt(maintenanceRecords, req.body);
    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }
    maintenanceRecords = result.updatedRecords;
    const ledger = buildSocietyMaintenanceLedger(
      profiles,
      maintenanceRecords,
      req.body.apartment_id
    );
    const summary = getSocietyMaintenanceSummary(ledger);
    res.status(201).json({ records: maintenanceRecords, ledger, summary });
  },
};
