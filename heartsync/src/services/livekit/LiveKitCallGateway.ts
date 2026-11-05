import { AudioSession } from "@livekit/react-native";
import { Room, RoomEvent } from "livekit-client";
import type { CallGateway, CallJoinGrant, CallMediaEvent } from "../contracts";
import { mapServiceError } from "../errors";
import type { AppSupabaseClient } from "../supabase";
import { parseCallJoinGrant } from "./grant";
import type {
  CallSession,
  CallType,
  Result,
} from "../../shared/types/domain.types";

export class LiveKitCallGateway implements CallGateway {
  private room: Room | null = null;
  private session: CallSession | null = null;

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
    if (error) return { ok: false, error: mapServiceError(error) };
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
    this.room = room;
    room.on(RoomEvent.TrackSubscribed, () => {
      if (this.room !== room) return;
      if (this.session) this.session.status = "connected";
      onMediaEvent({ type: "connected" });
    });
    room.on(RoomEvent.Disconnected, () =>
      onMediaEvent({ type: "disconnected" }),
    );
    onMediaEvent({ type: "connecting" });

    try {
      await AudioSession.startAudioSession();
      await room.connect(grant.serverUrl, grant.accessToken);
      if (this.room !== room) {
        await room.disconnect();
        await AudioSession.stopAudioSession();
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
        await AudioSession.stopAudioSession();
      }
      if (grant.callType === "video")
        await room.localParticipant.setCameraEnabled(true);
      return { ok: true, data: undefined };
    } catch (error) {
      room.disconnect();
      this.room = null;
      await AudioSession.stopAudioSession();
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
    if (this.session)
      this.session = {
        ...this.session,
        status: "ended",
        endedAt: new Date().toISOString(),
      };
    await this.room?.disconnect();
    this.room = null;
    await AudioSession.stopAudioSession();
    return { ok: true, data: undefined };
  }

  getSession(): CallSession | null {
    return this.session;
  }
}
