import React, { useRef, useState } from 'react';
import { Apartment, Profile, SocialPost } from '../types/community';
import {
  canModerateGlobalFeed,
  ROLE_RING_CONFIG,
  validateVideoDuration,
} from '../utils/communityRules';
import { LuxuryMediaArt, RoleAvatar } from './LuxuryCrest';
import {
  Heart,
  MessageSquare,
  Send,
  Trash2,
  AlertTriangle,
  Video,
  Image as ImageIcon,
  Globe,
  CheckCircle2,
  AlertCircle,
  Upload,
} from 'lucide-react';

interface GlobalSocialFeedProps {
  posts: SocialPost[];
  profiles: Profile[];
  apartments: Apartment[];
  currentUser: Profile;
  onCreatePost: (
    post: Omit<
      SocialPost,
      'id' | 'created_at' | 'likes_count' | 'liked_by' | 'comments'
    >
  ) => Promise<boolean> | boolean;
  onToggleLike: (postId: string) => void;
  onAddComment: (postId: string, content: string) => void;
  onDeletePost: (postId: string) => void;
  onIssueWarning: (authorId: string, postId: string) => void;
}

export function GlobalSocialFeed({
  posts,
  profiles,
  apartments,
  currentUser,
  onCreatePost,
  onToggleLike,
  onAddComment,
  onDeletePost,
  onIssueWarning,
}: GlobalSocialFeedProps) {
  const [content, setContent] = useState('');
  const [mediaType, setMediaType] = useState<'none' | 'image' | 'video'>('none');
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [videoDurationSec, setVideoDurationSec] = useState<number>(30);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'error' | 'info';
    text: string;
  } | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);

  const isDeveloper = canModerateGlobalFeed(currentUser);
  const currentUserApartment = apartments.find(
    (a) => a.id === currentUser.apartment_id
  );

  // Real Phone / PC Image File Upload Handler
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadStatus({
        type: 'error',
        text: 'Please select a valid image file (.jpg, .png, .webp, .heic).',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : null;
      if (dataUrl) {
        setUploadedMediaUrl(dataUrl);
        setUploadedFileName(file.name);
        setMediaType('image');
        setUploadStatus({
          type: 'info',
          text: `Attached photo "${file.name}" from your device. Ready to publish.`,
        });
      }
    };
    reader.onerror = () => {
      setUploadStatus({
        type: 'error',
        text: 'Could not read the selected image file from your device.',
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Real Phone / PC Video File Upload & Duration Inspector (<= 120 seconds)
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus(null);
    const objectUrl = URL.createObjectURL(file);
    const videoEl = document.createElement('video');
    videoEl.preload = 'metadata';

    const attachVideo = (duration: number) => {
      const check = validateVideoDuration(duration);
      setVideoDurationSec(duration);
      setUploadedFileName(file.name);
      setMediaType('video');
      if (!check.valid) {
        setUploadStatus({ type: 'error', text: check.error || 'Video exceeds the 120-second (2-minute) limit.' });
        URL.revokeObjectURL(objectUrl);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setUploadedMediaUrl(reader.result);
          setUploadStatus({ type: 'info', text: `Attached video "${file.name}" (${duration}s / 120s max). Ready to publish.` });
        }
        URL.revokeObjectURL(objectUrl);
      };
      reader.onerror = () => {
        setUploadStatus({ type: 'error', text: 'Could not read the selected video file from your device.' });
        URL.revokeObjectURL(objectUrl);
      };
      reader.readAsDataURL(file);
    };

    videoEl.onloadedmetadata = () => {
      const rawDuration = videoEl.duration;
      attachVideo(Number.isFinite(rawDuration) && rawDuration > 0 ? Math.max(1, Math.round(rawDuration)) : 30);
    };
    videoEl.onerror = () => attachVideo(30);
    videoEl.src = objectUrl;
    e.target.value = '';
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadStatus(null);

    const hasMedia = mediaType !== 'none' && Boolean(uploadedMediaUrl);

    if (!content.trim() && !hasMedia) {
      setUploadStatus({
        type: 'error',
        text: 'Please write a message or upload a photo/video from your Phone or PC to post.',
      });
      return;
    }

    if (mediaType === 'video') {
      const check = validateVideoDuration(videoDurationSec);
      if (!check.valid) {
        setUploadStatus({
          type: 'error',
          text:
            check.error ||
            'Gallery videos must be 120 seconds (2 minutes) or shorter.',
        });
        return;
      }
    }

    const willPurgeLastPost = posts.length >= 10;
    const purgedPostPreview = willPurgeLastPost
      ? posts[posts.length - 1]?.content.slice(0, 48)
      : null;

    const published = await onCreatePost({
      author_id: currentUser.id,
      apartment_id: currentUser.apartment_id,
      content: content.trim(),
      media_type: hasMedia ? mediaType : null,
      media_url: hasMedia ? uploadedMediaUrl : null,
      video_duration_sec: mediaType === 'video' ? videoDurationSec : undefined,
    });
    if (!published) {
      setUploadStatus({ type: 'error', text: 'The post could not be saved. Your draft is still here; please try again.' });
      return;
    }

    setContent('');
    setMediaType('none');
    setUploadedMediaUrl(null);
    setUploadedFileName('');
    setUploadStatus({
      type: 'info',
      text: willPurgeLastPost
        ? `Published to Global Feed (10/10 Max). Last post #10 ("${purgedPostPreview}...") was permanently deleted (FILO 10-post limit).`
        : 'Your post has been published to the Cross-Apartment Global Social Feed.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Scope Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#141821] border border-[#D4AF37]/30 rounded-xl p-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#D4AF37] uppercase tracking-widest">
            <Globe className="w-3.5 h-3.5" />
            <span>Global Scope · Cross-Apartment Network · Max 10 Posts (FILO)</span>
          </div>
          <h2 className="text-2xl font-display font-semibold text-[#F9F9F9] mt-1">
            Pune Inter-Society Social Feed
          </h2>
          <p className="text-xs text-[#F9F9F9]/65 mt-0.5">
            Connecting verified Family Heads across all {apartments.length}{' '}
            luxury estates in Pune. Holds up to 10 posts—when a new post is
            added, the last post (#10) is permanently deleted.
          </p>
        </div>

        <div className="text-right space-y-1">
          <div className="text-xs text-[#D4AF37] font-mono-tabular font-semibold">
            Active Feed Stack: {posts.length} / 10 Posts Max
          </div>
          <div className="text-xs text-[#F9F9F9]/70 font-mono-tabular">
            Posting as{' '}
            <span className="text-[#D4AF37]">{currentUser.full_name}</span> ·{' '}
            {currentUserApartment?.name} ({currentUser.flat_no})
          </div>
        </div>
      </div>

      {/* Post Composer with Direct Phone / PC Photo & Video Upload */}
      <form
        onSubmit={handlePublish}
        className="bg-[#141821] border border-white/10 rounded-xl p-5 space-y-4"
      >
        <div className="flex items-start gap-3.5">
          <RoleAvatar name={currentUser.full_name} role={currentUser.role} />
          <div className="flex-1">
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Share an update, nature & pet moment, or community note from ${currentUserApartment?.name} (or upload a photo/video below)...`}
              className="w-full rounded-lg bg-[#0B0C10]/80 border border-white/15 focus:border-[#D4AF37] p-3.5 text-sm text-[#F9F9F9] outline-none resize-none"
            />
          </div>
        </div>

        {/* Hidden Native File Inputs for Phone & PC */}
        <input
          ref={imageFileInputRef}
          id="feed-photo-upload"
          type="file"
          accept="image/*"
          onChange={handleImageFileChange}
          className="hidden"
        />
        <input
          ref={videoFileInputRef}
          id="feed-video-upload"
          type="file"
          accept="video/*"
          onChange={handleVideoFileChange}
          className="hidden"
        />

        {/* Live Preview of User's Uploaded Photo or Video */}
        {mediaType !== 'none' && uploadedMediaUrl && (
          <div className="p-4 rounded-lg bg-[#0B0C10]/90 border border-[#D4AF37]/30 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-medium text-[#D4AF37] flex items-center gap-2">
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {mediaType === 'image'
                    ? `Uploaded Photo Preview: ${uploadedFileName || 'Image'}`
                    : `Uploaded Video Preview: ${uploadedFileName || 'Video'} (${videoDurationSec}s / 120s max)`}
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setMediaType('none');
                  setUploadedMediaUrl(null);
                  setUploadedFileName('');
                  setUploadStatus(null);
                }}
                className="text-xs text-[#EF4444] hover:underline cursor-pointer"
              >
                Remove Media
              </button>
            </div>

            <LuxuryMediaArt
              variant={uploadedMediaUrl}
              durationSec={mediaType === 'video' ? videoDurationSec : undefined}
              className="w-full h-64 rounded-lg border border-white/10"
            />
          </div>
        )}

        {uploadStatus && (
          <div
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs border ${
              uploadStatus.type === 'error'
                ? 'bg-[#EF4444]/15 border-[#EF4444]/50 text-[#EF4444]'
                : 'bg-[#10B981]/15 border-[#10B981]/40 text-[#10B981]'
            }`}
          >
            {uploadStatus.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{uploadStatus.text}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => imageFileInputRef.current?.click()}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                mediaType === 'image'
                  ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37]'
                  : 'border-[#D4AF37]/45 text-[#D4AF37] hover:bg-[#D4AF37]/10'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Upload Photo (Phone / PC)</span>
            </button>

            <button
              type="button"
              onClick={() => videoFileInputRef.current?.click()}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                mediaType === 'video'
                  ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37]'
                  : 'border-white/20 text-[#F9F9F9]/85 hover:border-[#D4AF37]/50'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Upload Video (Phone / PC &le;120s)</span>
            </button>
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#e3be42] text-[#0B0C10] font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publish to All Societies</span>
          </button>
        </div>
      </form>

      {/* Feed Stream */}
      <div className="space-y-5">
        {posts.map((post) => {
          const author = profiles.find((p) => p.id === post.author_id);
          const apartment = apartments.find((a) => a.id === post.apartment_id);
          const authorName = author?.full_name || 'Verified Resident';
          const authorRole = author?.role || 'resident';
          const authorFlat = author?.flat_no || 'A-101';
          const roleConfig = ROLE_RING_CONFIG[authorRole];
          const isLiked = post.liked_by.includes(currentUser.id);

          return (
            <article
              key={post.id}
              className="bg-[#141821] border border-white/10 rounded-xl overflow-hidden"
            >
              <div className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <RoleAvatar name={authorName} role={authorRole} />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-base text-[#F9F9F9]">
                          {authorName}
                        </span>
                        <span className="text-xs text-[#F9F9F9]/40">·</span>
                        <span
                          className={`text-xs font-medium ${roleConfig.textClass}`}
                        >
                          {author?.admin_title
                            ? `${author.admin_title} (${roleConfig.label})`
                            : roleConfig.label}
                        </span>
                      </div>

                      {/* Zero-Pill Unboxed Metadata with Typographic Separators */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#F9F9F9]/60 mt-0.5 font-mono-tabular">
                        <span className="text-[#D4AF37]">
                          {apartment?.name || 'Pune Society'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Residence {authorFlat}</span>
                        {author && author.warnings_count > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#EF4444]">
                              {author.warnings_count} Guideline Warning(s)
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Developer-Exclusive Global Moderation Controls */}
                  {isDeveloper && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onIssueWarning(post.author_id, post.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
                        title="Developer Moderation: Issue Community Guideline Warning"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Issue Guideline Warning</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeletePost(post.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EF4444]/50 text-[#EF4444] hover:bg-[#EF4444]/15 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
                        title="Developer Moderation: Delete Global Post"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Post</span>
                      </button>
                    </div>
                  )}
                </div>

                {post.content && (
                  <p className="text-sm text-[#F9F9F9]/90 leading-relaxed mt-4">
                    {post.content}
                  </p>
                )}
              </div>

              {post.media_type && (
                <div className="border-y border-white/10">
                  <LuxuryMediaArt
                    variant={post.media_url}
                    durationSec={
                      post.media_type === 'video'
                        ? post.video_duration_sec || 48
                        : undefined
                    }
                    className="w-full h-64"
                  />
                </div>
              )}

              {/* Likes & Comments Footer */}
              <div className="p-4 bg-[#0B0C10]/50 space-y-3">
                <div className="flex items-center gap-6">
                  <button
                    type="button"
                    onClick={() => onToggleLike(post.id)}
                    className={`flex items-center gap-2 text-xs font-medium transition-colors cursor-pointer ${
                      isLiked
                        ? 'text-[#D4AF37]'
                        : 'text-[#F9F9F9]/70 hover:text-[#F9F9F9]'
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 ${isLiked ? 'fill-[#D4AF37]' : ''}`}
                    />
                    <span className="font-mono-tabular">
                      {post.likes_count} Appreciations
                    </span>
                  </button>

                  <div className="flex items-center gap-2 text-xs text-[#F9F9F9]/70 font-mono-tabular">
                    <MessageSquare className="w-4 h-4" />
                    <span>{post.comments.length} Responses</span>
                  </div>
                </div>

                {post.comments.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    {post.comments.map((c) => (
                      <div
                        key={c.id}
                        className="text-xs bg-[#141821] px-3.5 py-2.5 rounded-lg border border-white/5"
                      >
                        <div className="flex items-center gap-2 text-[#F9F9F9]/75 font-mono-tabular">
                          <span className="font-semibold text-[#F9F9F9]">
                            {c.author_name}
                          </span>
                          <span>·</span>
                          <span className="text-[#D4AF37]">
                            {c.apartment_name}
                          </span>
                          <span>·</span>
                          <span>{c.flat_no}</span>
                        </div>
                        <p className="text-[#F9F9F9]/85 mt-1">{c.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={commentInputs[post.id] || ''}
                    onChange={(e) =>
                      setCommentInputs((prev) => ({
                        ...prev,
                        [post.id]: e.target.value,
                      }))
                    }
                    placeholder="Add a courteous inter-society response..."
                    className="flex-1 px-3.5 py-2 rounded-lg bg-[#141821] border border-white/10 focus:border-[#D4AF37] text-xs text-[#F9F9F9] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const text = (commentInputs[post.id] || '').trim();
                      if (!text) return;
                      onAddComment(post.id, text);
                      setCommentInputs((prev) => ({ ...prev, [post.id]: '' }));
                    }}
                    className="px-3.5 py-2 rounded-lg bg-[#D4AF37]/20 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-[#0B0C10] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Reply
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
