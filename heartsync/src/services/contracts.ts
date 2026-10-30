import type {
  ApiError,
  CallSession,
  CallType,
  ChatMessage,
  DiscoveryFilters,
  MatchSummary,
  Page,
  ProfilePrivate,
  ProfilePublic,
  Result,
  SwipeAction,
  SwipeResult,
} from '../shared/types/domain.types';

export type AuthCredentials = { email: string; password: string };

export interface AuthRepository {
  getCurrentUserId(): Promise<Result<string | null>>;
  signIn(credentials: AuthCredentials): Promise<Result<void>>;
  signUp(credentials: AuthCredentials): Promise<Result<void>>;
  requestPasswordReset(email: string): Promise<Result<void>>;
  signOut(): Promise<Result<void>>;
}

export interface ProfileRepository {
  getMine(): Promise<Result<{ public: ProfilePublic; private: ProfilePrivate }>>;
  getPublic(profileId: string): Promise<Result<ProfilePublic>>;
  savePublic(profile: ProfilePublic): Promise<Result<ProfilePublic>>;
  savePrivate(profile: ProfilePrivate): Promise<Result<ProfilePrivate>>;
}

export interface DiscoveryRepository {
  getCandidates(filters: DiscoveryFilters, cursor?: string): Promise<Result<Page<ProfilePublic>>>;
}

export interface MatchRepository {
  /** The server RPC alone may create a match. A client must never insert one. */
  recordSwipe(targetProfileId: string, action: SwipeAction): Promise<Result<SwipeResult>>;
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
  listMessages(matchId: string, cursor?: string): Promise<Result<Page<ChatMessage>>>;
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
  expiresAt: string;
};

export type CallMediaEvent =
  | { type: 'connecting' }
  | { type: 'connected' }
  | { type: 'disconnected' }
  | { type: 'failed'; reason: string };

export interface CallGateway {
  /** Requests a short-lived token from a trusted server/Edge Function; never signs locally. */
  requestJoinGrant(matchId: string, callType: CallType): Promise<Result<CallJoinGrant>>;
  connect(grant: CallJoinGrant, onMediaEvent: (event: CallMediaEvent) => void): Promise<Result<void>>;
  disconnect(): Promise<Result<void>>;
  getSession(): CallSession | null;
}
