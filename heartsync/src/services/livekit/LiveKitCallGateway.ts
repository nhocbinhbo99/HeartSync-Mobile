import { AudioSession } from '@livekit/react-native';
import { Room, RoomEvent } from 'livekit-client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CallGateway, CallJoinGrant, CallMediaEvent } from '../contracts';
import { mapServiceError } from '../errors';
import { parseCallJoinGrant } from './grant';
import type { CallSession, CallType, Result } from '../../shared/types/domain.types';

export class LiveKitCallGateway implements CallGateway {
  private room: Room | null = null;

  constructor(private readonly client: SupabaseClient) {}

  async requestJoinGrant(callId: string, callType: CallType): Promise<Result<CallJoinGrant>> {
    const { data, error } = await this.client.functions.invoke('livekit-token', {
      body: { callId, callType },
    });
    if (error) return { ok: false, error: mapServiceError(error) };
    return parseCallJoinGrant(data);
  }

  async connect(grant: CallJoinGrant, onMediaEvent: (event: CallMediaEvent) => void): Promise<Result<void>> {
    const validatedGrant = parseCallJoinGrant(grant);
    if (!validatedGrant.ok) return validatedGrant;
    if (this.room) {
      return { ok: false, error: { code: 'conflict', message: 'Đã có một phiên media đang hoạt động.', retryable: false } };
    }

    const room = new Room({ adaptiveStream: true, dynacast: true });
    this.room = room;
    room.on(RoomEvent.TrackSubscribed, () => onMediaEvent({ type: 'connected' }));
    room.on(RoomEvent.Disconnected, () => onMediaEvent({ type: 'disconnected' }));
    onMediaEvent({ type: 'connecting' });

    try {
      await AudioSession.startAudioSession();
      await room.connect(grant.serverUrl, grant.accessToken);
      await room.localParticipant.setMicrophoneEnabled(true);
      if (grant.callType === 'video') await room.localParticipant.setCameraEnabled(true);
      return { ok: true, data: undefined };
    } catch (error) {
      room.disconnect();
      this.room = null;
      await AudioSession.stopAudioSession();
      onMediaEvent({ type: 'failed', reason: 'media_connection_failed' });
      return { ok: false, error: mapServiceError(error) };
    }
  }

  async disconnect(): Promise<Result<void>> {
    this.room?.disconnect();
    this.room = null;
    await AudioSession.stopAudioSession();
    return { ok: true, data: undefined };
  }

  getSession(): CallSession | null {
    return null;
  }
}
