import type {
  ApiError,
  CallSession,
  CallType,
  ChatMessage,
  DiscoveryFilters,
  IncomingCall,
  InterestOption,
  MatchSummary,
  Page,
  ProfilePrivate,
  ProfilePhoto,
  ProfilePublic,
  ProfileSaveInput,
  Result,
  SwipeAction,
  SwipeResult,
} from "../shared/types/domain.types";

export type AuthCredentials = { email: string; password: string };
export type SignUpInput = AuthCredentials & {
  displayName: string;
  dateOfBirth: string;
  gender: string;
};

export interface AuthRepository {
  getCurrentUserId(): Promise<Result<string | null>>;
  signIn(credentials: AuthCredentials): Promise<Result<void>>;
  signUp(input: SignUpInput): Promise<Result<void>>;
  requestPasswordReset(email: string): Promise<Result<void>>;
  signOut(): Promise<Result<void>>;
}

export interface ProfileRepository {
  getMine(): Promise<
    Result<{ public: ProfilePublic; private: ProfilePrivate }>
  >;
  getPublic(profileId: string): Promise<Result<ProfilePublic>>;
  listInterests(): Promise<Result<InterestOption[]>>;
  save(
    input: ProfileSaveInput,
  ): Promise<Result<{ public: ProfilePublic; private: ProfilePrivate }>>;
  uploadPhoto(
    sourceUri: string,
    sortOrder: number,
  ): Promise<Result<ProfilePhoto>>;
  deletePhoto(photo: ProfilePhoto): Promise<Result<void>>;
  reorderPhotos(photoIds: string[]): Promise<Result<ProfilePhoto[]>>;
  setPrimaryPhoto(photoId: string): Promise<Result<void>>;
  createPhotoUrl(storagePath: string): Promise<Result<string>>;
}

export interface PreferencesRepository {
  get(): Promise<Result<DiscoveryFilters>>;
  save(filters: DiscoveryFilters): Promise<Result<DiscoveryFilters>>;
}

export interface SavedProfilesRepository {
  list(cursor?: string, limit?: number): Promise<Result<Page<ProfilePublic>>>;
  isSaved(targetProfileId: string): Promise<Result<boolean>>;
  setSaved(targetProfileId: string, saved: boolean): Promise<Result<void>>;
}

export interface DiscoveryRepository {
  getCandidates(
    filters: DiscoveryFilters,
    cursor?: string,
  ): Promise<Result<Page<ProfilePublic>>>;
}

export interface MatchRepository {
  /** The server RPC alone may create a match. A client must never insert one. */
  recordSwipe(
    targetProfileId: string,
    action: SwipeAction,
  ): Promise<Result<SwipeResult>>;
  listMatches(cursor?: string): Promise<Result<Page<MatchSummary>>>;
  unmatch(matchId: string): Promise<Result<void>>;
  blockUser(targetProfileId: string): Promise<Result<void>>;
}

export type SendMessageInput = {
  matchId: string;
  clientMessageId: string;
  content: string;
};

export type MessageSubscription = { unsubscribe(): void };

export interface ChatRepository {
  getRecipient(matchId: string): Promise<Result<ProfilePublic>>;
  subscribeInbox(onChange: () => void): MessageSubscription;
  isActive(matchId: string): Promise<Result<boolean>>;
  markRead(matchId: string, ids: string[]): Promise<Result<void>>;
  listMessages(
    matchId: string,
    cursor?: string,
  ): Promise<Result<Page<ChatMessage>>>;
  sendMessage(input: SendMessageInput): Promise<Result<ChatMessage>>;
  subscribe(
    matchId: string,
    onMessage: (message: ChatMessage) => void,
    onError: (error: ApiError) => void,
  ): MessageSubscription;
}

export type CallJoinGrant = {
  serverUrl: string;
  accessToken: string;
  roomName: string;
  identity: string;
  callType: CallType;
  expiresAt: string;
};

export type CallMediaEvent =
  | { type: "connecting" }
  | { type: "connected" }
  | { type: "disconnected" }
  | { type: "failed"; reason: string };

export interface CallGateway {
  /** Requests a short-lived token from a trusted server/Edge Function; never signs locally. */
  requestJoinGrant(
    callId: string,
    callType: CallType,
  ): Promise<Result<CallJoinGrant>>;
  connect(
    grant: CallJoinGrant,
    onMediaEvent: (event: CallMediaEvent) => void,
  ): Promise<Result<void>>;
  setMuted(muted: boolean): Promise<Result<void>>;
  disconnect(): Promise<Result<void>>;
  getSession(): CallSession | null;
}

export interface CallRepository {
  loadCall(callId: string): Promise<Result<IncomingCall>>;
  listActive(): Promise<Result<IncomingCall[]>>;
  startAudioCall(matchId: string): Promise<Result<IncomingCall>>;
  acceptCall(callId: string): Promise<Result<IncomingCall>>;
  rejectCall(callId: string): Promise<Result<void>>;
  endCall(callId: string): Promise<Result<void>>;
  subscribeIncoming(
    onCall: (call: IncomingCall) => void,
    onError: (error: ApiError) => void,
  ): MessageSubscription;
}
