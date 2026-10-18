import { Router } from 'express';
import { communityController } from '../controllers/communityController.ts';

export const communityRouter = Router();

// Health & Bootstrap
communityRouter.get('/health', communityController.getHealth);
communityRouter.get('/bootstrap', communityController.getBootstrap);

// Apartments
communityRouter.get('/apartments', communityController.getApartments);
communityRouter.post('/apartments', communityController.createApartment);

// Profiles, Entry Approvals, Apartment Transfers, Role Assignment & Committee Switcher
communityRouter.get('/profiles', communityController.getProfiles);
communityRouter.post('/profiles/register', communityController.registerProfile);
communityRouter.post('/profiles/approve', communityController.approveMember);
communityRouter.post('/profiles/transfer', communityController.transferApartment);
communityRouter.post('/profiles/role', communityController.changeMemberRole);
communityRouter.post('/profiles/committee-titles', communityController.rotateCommitteeTitles);

// Global Social Feed (10-post FILO limit)
communityRouter.get('/posts', communityController.getPosts);
communityRouter.post('/posts', communityController.createPost);

// Marketplace & Polls
communityRouter.get('/marketplace', communityController.getMarketplace);
communityRouter.get('/polls', communityController.getPolls);
communityRouter.post('/polls/vote', communityController.votePoll);

// Emergency SOS Broadcast
communityRouter.get('/sos', communityController.getSOSAlerts);
communityRouter.post('/sos', communityController.triggerSOS);
communityRouter.post('/sos/resolve', communityController.resolveSOS);

// Visitor Gate Passes
communityRouter.get('/visitors', communityController.getVisitorLogs);
communityRouter.post('/visitors', communityController.createVisitorPass);
communityRouter.patch('/visitors/status', communityController.updateVisitorStatus);

// Society Maintenance & Bills (Receipt Screenshot Verification)
communityRouter.get('/maintenance/:apartmentId', communityController.getSocietyMaintenance);
communityRouter.post('/maintenance/receipt', communityController.uploadMaintenanceReceipt);
