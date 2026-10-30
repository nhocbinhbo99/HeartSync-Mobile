/**
 * HANDWRITTEN_NOT_DB_GENERATED.
 * Mirrors the reviewable Q03 migrations so UI/service work can type-check before a local schema exists.
 * Replace database-row shapes with Supabase CLI output only after `supabase db reset` succeeds.
 */
export type SwipeAction = 'like' | 'pass';
export type SwipeOutcome = 'liked' | 'passed' | 'matched';
export type MatchStatus = 'active' | 'unmatched';
export type CallType = 'audio' | 'video';
export type CallStatus = 'ringing' | 'accepted' | 'rejected' | 'missed' | 'connecting' | 'connected' | 'ended' | 'failed';

export type PublicProfileRow = {
  id: string;
  displayName: string;
  gender: string;
  bio: string | null;
  occupation: string | null;
  education: string | null;
  publicLocation: string | null;
  profileCompletedAt: string | null;
};

export type PrivateProfileRow = {
  userId: string;
  dateOfBirth: string;
  latitude: number | null;
  longitude: number | null;
  locationConsent: boolean;
};

export type RecordSwipeResult = {
  outcome: SwipeOutcome;
  matchId: string | null;
};
