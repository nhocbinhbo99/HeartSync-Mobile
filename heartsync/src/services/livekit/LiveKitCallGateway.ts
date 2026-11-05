import { AudioSession } from "@livekit/react-native";
import { AppState } from "react-native";
import { Room, RoomEvent, Track } from "livekit-client";
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
  private cameraFacing: "user" | "environment" = "user";
  private onMediaEvent: ((event: CallMediaEvent) => void) | null = null;
  private connected = false;
  private callType: CallType | null = null;

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
      if (grant.data.callType !== callType || grant.data.roomName !== `call:${callId}`) {
        return { ok: false, error: { code: "forbidden", message: "Quyền tham gia cuộc gọi không khớp.", retryable: false } };
      }
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
    this.callType = grant.callType;
    this.onMediaEvent = onMediaEvent;
    this.connected = false;
    const tracksChanged = () => {
      if (this.room !== room) return;
      const tracks = this.getVideoTracks();
      onMediaEvent({ type: "videoTracksChanged", local: !!tracks.local, remote: !!tracks.remote });
    };
    room.on(RoomEvent.TrackSubscribed, () => {
      if (this.room !== room) return;
      if (!this.connected) {
        this.connected = true;
        if (this.session) this.session.status = "connected";
        onMediaEvent({ type: "connected" });
      }
      tracksChanged();
    });
    room.on(RoomEvent.TrackUnsubscribed, tracksChanged);
    room.on(RoomEvent.TrackMuted, tracksChanged);
    room.on(RoomEvent.TrackUnmuted, tracksChanged);
    room.on(RoomEvent.LocalTrackPublished, tracksChanged);
    room.on(RoomEvent.LocalTrackUnpublished, tracksChanged);
    room.on(RoomEvent.Disconnected, () => {
      if (this.room === room) onMediaEvent({ type: "disconnected" });
    });
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
        return { ok: false, error: { code: "conflict", message: "Cuộc gọi đã kết thúc.", retryable: false } };
      }
      if (grant.callType === "video") {
        if (AppState.currentState !== "active") throw new Error("App is not active for camera capture");
        await room.localParticipant.setCameraEnabled(true);
        if (AppState.currentState !== "active") await room.localParticipant.setCameraEnabled(false);
        if (this.room !== room) {
          await room.disconnect();
          await AudioSession.stopAudioSession();
          return { ok: false, error: { code: "conflict", message: "Cuộc gọi đã kết thúc.", retryable: false } };
        }
        tracksChanged();
      }
      return { ok: true, data: undefined };
    } catch (error) {
      this.room = null;
      this.callType = null;
      await room.disconnect();
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
  getVideoTracks(): { local: unknown | null; remote: unknown | null; mirrorLocal: boolean } {
    if (!this.room) return { local: null, remote: null, mirrorLocal: true };
    const localPublication = this.room.localParticipant.getTrackPublication(Track.Source.Camera);
    const local = localPublication?.videoTrack && !localPublication.isMuted
      ? { participant: this.room.localParticipant, publication: localPublication, source: Track.Source.Camera }
      : null;
    const remoteParticipant = [...this.room.remoteParticipants.values()][0];
    const remotePublication = remoteParticipant?.getTrackPublication(Track.Source.Camera);
    const remote = remotePublication?.videoTrack && !remotePublication.isMuted
      ? { participant: remoteParticipant, publication: remotePublication, source: Track.Source.Camera }
      : null;
    return { local, remote, mirrorLocal: this.cameraFacing === "user" };
  }
  async setCameraEnabled(enabled: boolean): Promise<Result<void>> {
    if (!this.room || this.callType !== "video")
      return { ok: false, error: { code: "conflict", message: "Chưa kết nối cuộc gọi video.", retryable: false } };
    try {
      await this.room.localParticipant.setCameraEnabled(enabled);
      const tracks = this.getVideoTracks();
      this.onMediaEvent?.({ type: "videoTracksChanged", local: !!tracks.local, remote: !!tracks.remote });
      return { ok: true, data: undefined };
    } catch (error) { return { ok: false, error: mapServiceError(error) }; }
  }
  async switchCamera(): Promise<Result<void>> {
    const track = this.room?.localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack;
    if (!track || this.callType !== "video")
      return { ok: false, error: { code: "conflict", message: "Hãy bật camera trước.", retryable: false } };
    try {
      const next = this.cameraFacing === "user" ? "environment" : "user";
      await track.restartTrack({ facingMode: next });
      this.cameraFacing = next;
      const tracks = this.getVideoTracks();
      this.onMediaEvent?.({ type: "videoTracksChanged", local: !!tracks.local, remote: !!tracks.remote });
      return { ok: true, data: undefined };
    } catch (error) { return { ok: false, error: mapServiceError(error) }; }
  }
  async disconnect(): Promise<Result<void>> {
    if (this.session)
      this.session = {
        ...this.session,
        status: "ended",
        endedAt: new Date().toISOString(),
      };
    const room = this.room;
    this.room = null;
    this.onMediaEvent = null;
    this.connected = false;
    this.callType = null;
    this.cameraFacing = "user";
    await room?.disconnect();
    room?.removeAllListeners();
    await AudioSession.stopAudioSession();
    return { ok: true, data: undefined };
  }

  getSession(): CallSession | null {
    return this.session;
  }
}
