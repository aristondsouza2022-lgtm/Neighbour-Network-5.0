import React, { useState } from 'react';
import {
  Announcement,
  Apartment,
  CommunityPoll,
  Profile,
  SocialEvent,
} from '../types/community';
import {
  canManageGovernance,
  filterByApartmentScope,
} from '../utils/communityRules';
import {
  Lock,
  Plus,
  Trash2,
  Edit3,
  Heart,
  CheckCircle2,
  Calendar,
  MapPin,
  BarChart3,
  Megaphone,
} from 'lucide-react';

interface GovernanceHubProps {
  polls: CommunityPoll[];
  events: SocialEvent[];
  announcements: Announcement[];
  profiles: Profile[];
  currentApartment: Apartment;
  currentUser: Profile;
  onVotePoll: (pollId: string, optionId: string) => void;
  onCreatePoll: (
    poll: Omit<CommunityPoll, 'id' | 'created_at'>
  ) => void;
  onUpdatePoll: (poll: CommunityPoll) => void;
  onDeletePoll: (pollId: string) => void;
  onToggleEventInterest: (eventId: string) => void;
  onCreateEvent: (
    evt: Omit<SocialEvent, 'id' | 'created_at' | 'interested_ids'>
  ) => void;
  onUpdateEvent: (evt: SocialEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onCreateAnnouncement: (
    ann: Omit<Announcement, 'id' | 'created_at'>
  ) => void;
  onUpdateAnnouncement: (ann: Announcement) => void;
  onDeleteAnnouncement: (annId: string) => void;
}

export function GovernanceHub({
  polls,
  events,
  announcements,
  profiles,
  currentApartment,
  currentUser,
  onVotePoll,
  onCreatePoll,
  onUpdatePoll,
  onDeletePoll,
  onToggleEventInterest,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  onCreateAnnouncement,
  onUpdateAnnouncement,
  onDeleteAnnouncement,
}: GovernanceHubProps) {
  const [activeTab, setActiveTab] = useState<'polls' | 'events' | 'announcements'>(
    'polls'
  );
  const canEdit = canManageGovernance(currentUser);

  // Isolated to current apartment
  const aptPolls = filterByApartmentScope(polls, currentApartment.id);
  const aptEvents = filterByApartmentScope(events, currentApartment.id);
  const aptAnnouncements = filterByApartmentScope(
    announcements,
    currentApartment.id
  );

  // Poll Form State
  const [showPollForm, setShowPollForm] = useState(false);
  const [editingPollId, setEditingPollId] = useState<string | null>(null);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollDesc, setPollDesc] = useState('');
  const [pollOpt1, setPollOpt1] = useState('');
  const [pollOpt2, setPollOpt2] = useState('');

  // Event Form State
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [evtTitle, setEvtTitle] = useState('');
  const [evtDesc, setEvtDesc] = useState('');
  const [evtDate, setEvtDate] = useState('2026-11-12 · 19:30 IST');
  const [evtVenue, setEvtVenue] = useState('Skydeck Pavilion');
  const [evtDress, setEvtDress] = useState('Smart Cocktail / Resort Formal');

  // Announcement Form State
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [editingAnnId, setEditingAnnId] = useState<string | null>(null);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] =
    useState<Announcement['priority']>('Priority');

  const handleSavePoll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollQuestion.trim()) return;

    if (editingPollId) {
      const existing = aptPolls.find((p) => p.id === editingPollId);
      if (existing) {
        onUpdatePoll({
          ...existing,
          question: pollQuestion.trim(),
          description: pollDesc.trim(),
        });
      }
    } else {
      onCreatePoll({
        apartment_id: currentApartment.id,
        created_by: currentUser.id,
        question: pollQuestion.trim(),
        description: pollDesc.trim() || 'Official Managing Committee Resolution.',
        closes_at: '2026-11-15',
        options: [
          {
            id: `opt-${Date.now()}-1`,
            label: pollOpt1.trim() || 'Approve Resolution',
            votes: [],
          },
          {
            id: `opt-${Date.now()}-2`,
            label: pollOpt2.trim() || 'Defer to Next Committee Session',
            votes: [],
          },
        ],
      });
    }

    setShowPollForm(false);
    setEditingPollId(null);
    setPollQuestion('');
    setPollDesc('');
    setPollOpt1('');
    setPollOpt2('');
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evtTitle.trim()) return;

    if (editingEventId) {
      const existing = aptEvents.find((ev) => ev.id === editingEventId);
      if (existing) {
        onUpdateEvent({
          ...existing,
          title: evtTitle.trim(),
          description: evtDesc.trim(),
          event_date: evtDate.trim(),
          venue: evtVenue.trim(),
          dress_code: evtDress.trim(),
        });
      }
    } else {
      onCreateEvent({
        apartment_id: currentApartment.id,
        created_by: currentUser.id,
        title: evtTitle.trim(),
        description: evtDesc.trim(),
        event_date: evtDate.trim(),
        venue: evtVenue.trim(),
        dress_code: evtDress.trim(),
      });
    }

    setShowEventForm(false);
    setEditingEventId(null);
    setEvtTitle('');
    setEvtDesc('');
  };

  const handleSaveAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    if (editingAnnId) {
      const existing = aptAnnouncements.find((a) => a.id === editingAnnId);
      if (existing) {
        onUpdateAnnouncement({
          ...existing,
          title: annTitle.trim(),
          content: annContent.trim(),
          priority: annPriority,
        });
      }
    } else {
      onCreateAnnouncement({
        apartment_id: currentApartment.id,
        created_by: currentUser.id,
        title: annTitle.trim(),
        content: annContent.trim(),
        priority: annPriority,
      });
    }

    setShowAnnForm(false);
    setEditingAnnId(null);
    setAnnTitle('');
    setAnnContent('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#141821] border border-[#D4AF37]/30 rounded-xl p-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#D4AF37] uppercase tracking-widest">
            <Lock className="w-3.5 h-3.5" />
            <span>Apartment-Locked Governance · {currentApartment.name}</span>
          </div>
          <h2 className="text-2xl font-display font-semibold text-[#F9F9F9] mt-1">
            Community Polls, Social Events & Directives
          </h2>
          <p className="text-xs text-[#F9F9F9]/65 mt-0.5">
            {canEdit
              ? 'Executive Mode Active: Full Create, Edit, and Delete privileges enabled.'
              : 'Resident Mode: Cast one household ballot per Poll and RSVP to society events.'}
          </p>
        </div>

        {/* Sub-Navigation Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-[#0B0C10] border border-white/10 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('polls')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'polls'
                ? 'bg-[#D4AF37] text-[#0B0C10] font-semibold'
                : 'text-[#F9F9F9]/70 hover:text-[#F9F9F9]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Polls ({aptPolls.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('events')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'events'
                ? 'bg-[#D4AF37] text-[#0B0C10] font-semibold'
                : 'text-[#F9F9F9]/70 hover:text-[#F9F9F9]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Social Events ({aptEvents.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('announcements')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'announcements'
                ? 'bg-[#D4AF37] text-[#0B0C10] font-semibold'
                : 'text-[#F9F9F9]/70 hover:text-[#F9F9F9]'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Announcements ({aptAnnouncements.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: COMMUNITY POLLS */}
      {activeTab === 'polls' && (
        <div className="space-y-5">
          {canEdit && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setEditingPollId(null);
                  setPollQuestion('');
                  setPollDesc('');
                  setShowPollForm((prev) => !prev);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4AF37] text-[#0B0C10] font-semibold text-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Official Poll</span>
              </button>
            </div>
          )}

          {showPollForm && canEdit && (
            <form
              onSubmit={handleSavePoll}
              className="bg-[#141821] border border-[#D4AF37]/50 rounded-xl p-5 space-y-4"
            >
              <h3 className="text-lg font-display font-semibold text-[#F9F9F9]">
                {editingPollId ? 'Edit Community Poll' : 'New Community Poll'}
              </h3>
              <div>
                <label className="block text-xs text-[#F9F9F9]/75 mb-1">
                  Resolution Question
                </label>
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="e.g., Approve Rooftop Padel Court Installation?"
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0B0C10] border border-white/15 text-sm text-[#F9F9F9]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#F9F9F9]/75 mb-1">
                  Background & Budget Context
                </label>
                <textarea
                  rows={2}
                  value={pollDesc}
                  onChange={(e) => setPollDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0B0C10] border border-white/15 text-sm text-[#F9F9F9]"
                />
              </div>
              {!editingPollId && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={pollOpt1}
                    onChange={(e) => setPollOpt1(e.target.value)}
                    placeholder="Option 1 (e.g., Approve Proposal)"
                    className="px-3.5 py-2 rounded-lg bg-[#0B0C10] border border-white/15 text-sm text-[#F9F9F9]"
                  />
                  <input
                    type="text"
                    value={pollOpt2}
                    onChange={(e) => setPollOpt2(e.target.value)}
                    placeholder="Option 2 (e.g., Decline Proposal)"
                    className="px-3.5 py-2 rounded-lg bg-[#0B0C10] border border-white/15 text-sm text-[#F9F9F9]"
                  />
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPollForm(false)}
                  className="px-4 py-2 rounded-lg text-xs text-[#F9F9F9]/70 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#D4AF37] text-[#0B0C10] font-semibold text-xs cursor-pointer"
                >
                  Save Resolution
                </button>
              </div>
            </form>
          )}

          {aptPolls.map((poll) => {
            const totalVotes = poll.options.reduce(
              (acc, opt) => acc + opt.votes.length,
              0
            );
            const userVotedOptionId = poll.options.find((opt) =>
              opt.votes.includes(currentUser.id)
            )?.id;

            return (
              <div
                key={poll.id}
                className="bg-[#141821] border border-white/10 rounded-xl p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-[#D4AF37] font-mono-tabular">
                      Closes {poll.closes_at} · {totalVotes} Household Ballots Cast
                    </div>
                    <h3 className="text-xl font-display font-semibold text-[#F9F9F9] mt-1">
                      {poll.question}
                    </h3>
                    <p className="text-xs text-[#F9F9F9]/70 mt-1">
                      {poll.description}
                    </p>
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPollId(poll.id);
                          setPollQuestion(poll.question);
                          setPollDesc(poll.description);
                          setShowPollForm(true);
                        }}
                        className="p-2 rounded-lg border border-white/15 text-[#F9F9F9]/75 hover:border-[#D4AF37] hover:text-[#D4AF37] cursor-pointer"
                        aria-label={`Edit poll ${poll.question}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeletePoll(poll.id)}
                        className="p-2 rounded-lg border border-[#EF4444]/40 text-[#EF4444] hover:bg-[#EF4444]/15 cursor-pointer"
                        aria-label={`Delete poll ${poll.question}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2.5 pt-2">
                  {poll.options.map((opt) => {
                    const pct =
                      totalVotes > 0
                        ? Math.round((opt.votes.length / totalVotes) * 100)
                        : 0;
                    const isSelected = userVotedOptionId === opt.id;

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={Boolean(userVotedOptionId)}
                        onClick={() => onVotePoll(poll.id, opt.id)}
                        className={`w-full text-left p-3.5 rounded-lg border transition-all relative overflow-hidden ${
                          isSelected
                            ? 'border-[#D4AF37] bg-[#D4AF37]/15'
                            : userVotedOptionId
                            ? 'border-white/10 bg-[#0B0C10]/60 opacity-85 cursor-default'
                            : 'border-white/15 bg-[#0B0C10]/80 hover:border-[#D4AF37] cursor-pointer'
                        }`}
                      >
                        <div className="relative z-10 flex items-center justify-between gap-4 text-xs">
                          <span className="font-medium text-[#F9F9F9] flex items-center gap-2">
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
                            )}
                            <span>{opt.label}</span>
                          </span>
                          <span className="font-mono-tabular text-[#D4AF37] shrink-0">
                            {opt.votes.length} votes ({pct}%)
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {userVotedOptionId && (
                  <div className="text-[11px] text-[#10B981] font-mono-tabular">
                    ✓ Official ballot recorded for Residence {currentUser.flat_no}
                    . Single-vote rule enforced.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: SOCIAL EVENTS */}
      {activeTab === 'events' && (
        <div className="space-y-5">
          {canEdit && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setEditingEventId(null);
                  setEvtTitle('');
                  setEvtDesc('');
                  setShowEventForm((prev) => !prev);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4AF37] text-[#0B0C10] font-semibold text-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Curate Society Soirée</span>
              </button>
            </div>
          )}

          {showEventForm && canEdit && (
            <form
              onSubmit={handleSaveEvent}
              className="bg-[#141821] border border-[#D4AF37]/50 rounded-xl p-5 space-y-4"
            >
              <h3 className="text-lg font-display font-semibold text-[#F9F9F9]">
                {editingEventId ? 'Edit Society Event' : 'Create Society Event'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={evtTitle}
                  onChange={(e) => setEvtTitle(e.target.value)}
                  placeholder="Event Title"
                  className="px-3.5 py-2 rounded-lg bg-[#0B0C10] border border-white/15 text-sm text-[#F9F9F9]"
                />
                <input
                  type="text"
                  value={evtDate}
                  onChange={(e) => setEvtDate(e.target.value)}
                  placeholder="Date & Time"
                  className="px-3.5 py-2 rounded-lg bg-[#0B0C10] border border-white/15 text-sm text-[#F9F9F9]"
                />
                <input
                  type="text"
                  value={evtVenue}
                  onChange={(e) => setEvtVenue(e.target.value)}
                  placeholder="Venue inside Society"
                  className="px-3.5 py-2 rounded-lg bg-[#0B0C10] border border-white/15 text-sm text-[#F9F9F9]"
                />
                <input
                  type="text"
                  value={evtDress}
                  onChange={(e) => setEvtDress(e.target.value)}
                  placeholder="Dress Code"
                  className="px-3.5 py-2 rounded-lg bg-[#0B0C10] border border-white/15 text-sm text-[#F9F9F9]"
                />
              </div>
              <textarea
                rows={2}
                value={evtDesc}
                onChange={(e) => setEvtDesc(e.target.value)}
                placeholder="Event programme & hospitality details..."
                className="w-full px-3.5 py-2 rounded-lg bg-[#0B0C10] border border-white/15 text-sm text-[#F9F9F9]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEventForm(false)}
                  className="px-4 py-2 text-xs text-[#F9F9F9]/70 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#D4AF37] text-[#0B0C10] font-semibold text-xs cursor-pointer"
                >
                  Publish Event
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {aptEvents.map((evt) => {
              const isInterested = evt.interested_ids.includes(currentUser.id);
              return (
                <div
                  key={evt.id}
                  className="bg-[#141821] border border-white/10 rounded-xl p-5 flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-xs font-mono-tabular text-[#D4AF37]">
                        {evt.event_date}
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEventId(evt.id);
                              setEvtTitle(evt.title);
                              setEvtDesc(evt.description);
                              setEvtDate(evt.event_date);
                              setEvtVenue(evt.venue);
                              setEvtDress(evt.dress_code);
                              setShowEventForm(true);
                            }}
                            className="p-1.5 rounded border border-white/15 text-[#F9F9F9]/70 hover:text-[#D4AF37] cursor-pointer"
                            aria-label={`Edit event ${evt.title}`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteEvent(evt.id)}
                            className="p-1.5 rounded border border-[#EF4444]/40 text-[#EF4444] cursor-pointer"
                            aria-label={`Delete event ${evt.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <h3 className="text-xl font-display font-semibold text-[#F9F9F9] mt-1">
                      {evt.title}
                    </h3>
                    <p className="text-xs text-[#F9F9F9]/75 mt-2 leading-relaxed">
                      {evt.description}
                    </p>

                    <div className="mt-4 pt-3 border-t border-white/10 text-xs text-[#F9F9F9]/65 space-y-1 font-mono-tabular">
                      <div>Venue: {evt.venue}</div>
                      <div>Attire: {evt.dress_code}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs font-mono-tabular text-[#F9F9F9]/60">
                      {evt.interested_ids.length} Households Attending
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleEventInterest(evt.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        isInterested
                          ? 'bg-[#D4AF37] text-[#0B0C10]'
                          : 'border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/15'
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          isInterested ? 'fill-[#0B0C10]' : ''
                        }`}
                      />
                      <span>
                        {isInterested ? 'Interested / RSVP’d' : 'Like / Interested'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          {canEdit && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setEditingAnnId(null);
                  setAnnTitle('');
                  setAnnContent('');
                  setShowAnnForm((prev) => !prev);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4AF37] text-[#0B0C10] font-semibold text-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Issue Committee Directive</span>
              </button>
            </div>
          )}

          {showAnnForm && canEdit && (
            <form
              onSubmit={handleSaveAnnouncement}
              className="bg-[#141821] border border-[#D4AF37]/50 rounded-xl p-5 space-y-4"
            >
              <h3 className="text-lg font-display font-semibold text-[#F9F9F9]">
                {editingAnnId ? 'Edit Announcement' : 'New Official Announcement'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <input
                  type="text"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="Directive Headline"
                  className="sm:col-span-2 px-3.5 py-2 rounded-lg bg-[#0B0C10] border border-white/15 text-sm text-[#F9F9F9]"
                />
                <select
                  value={annPriority}
                  onChange={(e) =>
                    setAnnPriority(e.target.value as Announcement['priority'])
                  }
                  className="px-3.5 py-2 rounded-lg bg-[#0B0C10] border border-white/15 text-sm text-[#F9F9F9]"
                >
                  <option value="Executive Directive">Executive Directive</option>
                  <option value="Priority">Priority</option>
                  <option value="Standard">Standard</option>
                </select>
              </div>
              <textarea
                rows={3}
                value={annContent}
                onChange={(e) => setAnnContent(e.target.value)}
                placeholder="Official circular details..."
                className="w-full px-3.5 py-2 rounded-lg bg-[#0B0C10] border border-white/15 text-sm text-[#F9F9F9]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAnnForm(false)}
                  className="px-4 py-2 text-xs text-[#F9F9F9]/70 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#D4AF37] text-[#0B0C10] font-semibold text-xs cursor-pointer"
                >
                  Broadcast Notice
                </button>
              </div>
            </form>
          )}

          {aptAnnouncements.map((ann) => {
            const author = profiles.find((p) => p.id === ann.created_by);
            return (
              <div
                key={ann.id}
                className="bg-[#141821] border border-white/10 rounded-xl p-5 space-y-2"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="text-xs font-mono-tabular text-[#D4AF37]">
                    {ann.priority} · Issued by{' '}
                    {author?.full_name || 'Managing Committee'} (
                    {author?.admin_title || 'Executive'})
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAnnId(ann.id);
                          setAnnTitle(ann.title);
                          setAnnContent(ann.content);
                          setAnnPriority(ann.priority);
                          setShowAnnForm(true);
                        }}
                        className="p-1.5 rounded border border-white/15 text-[#F9F9F9]/70 hover:text-[#D4AF37] cursor-pointer"
                        aria-label={`Edit announcement ${ann.title}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteAnnouncement(ann.id)}
                        className="p-1.5 rounded border border-[#EF4444]/40 text-[#EF4444] cursor-pointer"
                        aria-label={`Delete announcement ${ann.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <h3 className="text-xl font-display font-semibold text-[#F9F9F9]">
                  {ann.title}
                </h3>
                <p className="text-sm text-[#F9F9F9]/80 leading-relaxed">
                  {ann.content}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
