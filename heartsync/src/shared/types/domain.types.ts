/**
 * HANDWRITTEN_NOT_DB_GENERATED.
 * Mirrors the reviewable Q03 migrations so UI/service work can type-check before a local schema exists.
 * Replace database-row shapes with Supabase CLI output only after `supabase db reset` succeeds.
 */
export type SwipeAction = 'like' | 'pass';
export type MatchStatus = 'active' | 'unmatched';
export type CallType = 'audio' | 'video';
export type PersistedCallStatus = 'ringing' | 'accepted' | 'rejected' | 'missed' | 'connecting' | 'connected' | 'ended' | 'failed';
/** UI/media state; `idle` is local and is not persisted in the SQL call_status enum. */
export type CallStatus = 'idle' | PersistedCallStatus;

export type ProfilePhoto = {
  id: string;
  storagePath: string;
  sortOrder: number;
  isPrimary: boolean;
};

export type ProfilePublic = {
  id: string;
  displayName: string;
  /** Derived by a trusted query from private date_of_birth; the date itself is never public. */
  age: number;
  gender: string;
  bio: string | null;
  occupation: string | null;
  education: string | null;
  publicLocation: string | null;
  profileCompletedAt: string | null;
  photos: ProfilePhoto[];
  interests: string[];
  languages: string[];
};

export type ProfilePrivate = {
  userId: string;
  dateOfBirth: string;
  latitude: number | null;
  longitude: number | null;
  locationConsent: boolean;
};

export type DiscoveryFilters = {
  ageMin: number;
  ageMax: number;
  distanceKm: number;
  preferredGenders: string[];
  preferredLanguages: string[];
};

export type SwipeResult =
  | { outcome: 'liked'; matchId: null }
  | { outcome: 'passed'; matchId: null }
  | { outcome: 'matched'; matchId: string };

export type MatchSummary = {
  id: string;
  otherProfile: ProfilePublic;
  status: MatchStatus;
  createdAt: string;
  unmatchedAt: string | null;
  lastMessagePreview: string | null;
};

export type ChatMessage = {
  id: string;
  matchId: string;
  senderId: string;
  clientMessageId: string;
  content: string;
  sentAt: string;
  readAt: string | null;
};

export type CallSession = {
  id: string;
  matchId: string;
  callerId: string;
  calleeId: string;
  type: CallType;
  status: PersistedCallStatus;
  startedAt: string;
  endedAt: string | null;
};

export type ApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'network'
  | 'validation'
  | 'not_found'
  | 'conflict'
  | 'rate_limited';

export type ApiError = { code: ApiErrorCode; message: string; retryable: boolean };
export type Result<T> = { ok: true; data: T } | { ok: false; error: ApiError };
export type Page<T> = { items: T[]; nextCursor: string | null };
