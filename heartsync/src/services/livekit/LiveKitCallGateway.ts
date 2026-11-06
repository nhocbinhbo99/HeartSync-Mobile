import { AudioSession } from "@livekit/react-native";
import { Room, RoomEvent, Track } from "livekit-client";
import type { CallGateway, CallJoinGrant, CallMediaEvent } from "../contracts";
import { mapServiceError } from "../errors";
import type { AppSupabaseClient } from "../supabase";
import { parseCallJoinGrant } from "./grant";
import { mapLiveKitFunctionError } from "./functionError";
import type {
  CallSession,
  CallType,
  Result,
} from "../../shared/types/domain.types";

export class LiveKitCallGateway implements CallGateway {
  private room: Room | null = null;
  private session: CallSession | null = null;
  private audioSessionStarted = false;
  private disconnecting: Promise<Result<void>> | null = null;

  constructor(private readonly client: AppSupabaseClient) {}

  async requestJoinGrant(
    callId: string,
    callType: CallType,
  ): Promise<Result<CallJoinGrant>> {
    const { data, error } = await this.client.functions.invoke(
      "livekit-token",
      {
        body: { callId, callType },
      },
    );
    if (error)
      return { ok: false, error: await mapLiveKitFunctionError(error) };
    const grant = parseCallJoinGrant(data);
    if (grant.ok) {
      const { data: call } = await this.client
        .from("calls")
        .select("*")
        .eq("id", callId)
        .single();
      if (call)
        this.session = {
          id: call.id,
          matchId: call.match_id,
          callerId: call.caller_id,
          calleeId: call.callee_id,
          type: call.type,
          status: call.status,
          startedAt: call.started_at,
          endedAt: call.ended_at,
        };
    }
    return grant;
  }

  async connect(
    grant: CallJoinGrant,
    onMediaEvent: (event: CallMediaEvent) => void,
  ): Promise<Result<void>> {
    const validatedGrant = parseCallJoinGrant(grant);
    if (!validatedGrant.ok) return validatedGrant;
    if (this.room) {
      return {
        ok: false,
        error: {
          code: "conflict",
          message: "Đã có một phiên media đang hoạt động.",
          retryable: false,
        },
      };
    }

    const room = new Room({ adaptiveStream: true, dynacast: true });
    let hasRemoteAudio = false;
    this.room = room;
    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (this.room !== room) return;
      if (track.kind !== Track.Kind.Audio) return;
      hasRemoteAudio = true;
      if (this.session) this.session.status = "connected";
      onMediaEvent({ type: "connected" });
    });
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      if (this.room !== room) return;
      if (track.kind !== Track.Kind.Audio) return;
      hasRemoteAudio = false;
      onMediaEvent({ type: "connecting" });
    });
    room.on(RoomEvent.Reconnecting, () => {
      if (this.room === room) onMediaEvent({ type: "connecting" });
    });
    room.on(RoomEvent.Reconnected, () => {
      if (this.room === room && hasRemoteAudio)
        onMediaEvent({ type: "connected" });
    });
    room.on(RoomEvent.Disconnected, () => {
      if (this.room !== room) return;
      this.room = null;
      void this.stopAudioSession();
      onMediaEvent({ type: "disconnected" });
    });
    onMediaEvent({ type: "connecting" });

    try {
      await AudioSession.startAudioSession();
      this.audioSessionStarted = true;
      await room.connect(grant.serverUrl, grant.accessToken);
      if (this.room !== room) {
        await room.disconnect();
        await this.stopAudioSession();
        return {
          ok: false,
          error: {
            code: "conflict",
            message: "Cuộc gọi đã kết thúc.",
            retryable: false,
          },
        };
      }
      await room.localParticipant.setMicrophoneEnabled(true);
      if (this.room !== room) {
        await room.disconnect();
        await this.stopAudioSession();
      }
      if (grant.callType === "video")
        await room.localParticipant.setCameraEnabled(true);
      return { ok: true, data: undefined };
    } catch (error) {
      if (this.room === room) this.room = null;
      await room.disconnect();
      await this.stopAudioSession();
      onMediaEvent({ type: "failed", reason: "media_connection_failed" });
      return { ok: false, error: mapServiceError(error) };
    }
  }

  async setMuted(muted: boolean): Promise<Result<void>> {
    if (!this.room)
      return {
        ok: false,
        error: {
          code: "conflict",
          message: "Chưa kết nối cuộc gọi.",
          retryable: false,
        },
      };
    try {
      await this.room.localParticipant.setMicrophoneEnabled(!muted);
      return { ok: true, data: undefined };
    } catch (error) {
      return { ok: false, error: mapServiceError(error) };
    }
  }
  async disconnect(): Promise<Result<void>> {
    if (this.disconnecting) return this.disconnecting;
    if (this.session)
      this.session = {
        ...this.session,
        status: "ended",
        endedAt: new Date().toISOString(),
      };
    const room = this.room;
    this.room = null;
    this.disconnecting = (async () => {
      try {
        await room?.disconnect();
      } finally {
        await this.stopAudioSession();
      }
      return { ok: true, data: undefined } as const;
    })();
    try {
      return await this.disconnecting;
    } finally {
      this.disconnecting = null;
    }
  }

  getSession(): CallSession | null {
    return this.session;
  }

  private async stopAudioSession() {
    if (!this.audioSessionStarted) return;
    this.audioSessionStarted = false;
    try {
      await AudioSession.stopAudioSession();
    } catch {
      // Native audio cleanup is best-effort and must remain idempotent.
    }
  }
}
