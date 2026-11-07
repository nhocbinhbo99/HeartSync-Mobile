import { LiveKitCallGateway } from "../LiveKitCallGateway";
import type { AppSupabaseClient } from "../../supabase";
import type { CallJoinGrant, CallMediaEvent } from "../../contracts";
import { AppState } from "react-native";

jest.mock("@livekit/react-native", () => ({
  AudioSession: { startAudioSession: jest.fn().mockResolvedValue(undefined), stopAudioSession: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock("livekit-client", () => {
  class Room {
    static latest: Room;
    localParticipant = {
      setMicrophoneEnabled: jest.fn().mockResolvedValue(undefined),
      setCameraEnabled: jest.fn().mockResolvedValue(undefined),
      getTrackPublication: jest.fn().mockReturnValue(undefined),
    };
    remoteParticipants = new Map();
    handlers = new Map<string, (() => void)[]>();
    connect = jest.fn().mockResolvedValue(undefined);
    disconnect = jest.fn().mockResolvedValue(undefined);
    constructor() { Room.latest = this; }
    on(event: string, handler: () => void) {
      this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
    }
    emit(event: string) { this.handlers.get(event)?.forEach((handler) => handler()); }
    removeAllListeners() { this.handlers.clear(); }
  }
  return {
    Room,
    RoomEvent: {
      TrackSubscribed: "subscribed", TrackUnsubscribed: "unsubscribed", TrackMuted: "muted",
      TrackUnmuted: "unmuted", LocalTrackPublished: "localPublished",
      LocalTrackUnpublished: "localUnpublished", Disconnected: "disconnected",
    },
    Track: { Source: { Camera: "camera" } },
  };
});

const grant = (callType: "audio" | "video"): CallJoinGrant => ({
  serverUrl: "wss://example.livekit.cloud",
  accessToken: "synthetic-token-long-enough-for-parser",
  roomName: "call:00000000-0000-0000-0000-000000000001",
  identity: "user",
  callType,
  expiresAt: "2099-01-01T00:00:00Z",
});

type FakeRoom = { localParticipant: { setCameraEnabled: jest.Mock; setMicrophoneEnabled: jest.Mock }; emit(event: string): void; disconnect: jest.Mock };
const latestRoom = () => (jest.requireMock("livekit-client") as { Room: { latest: FakeRoom } }).Room.latest;

beforeAll(() => {
  Object.defineProperty(AppState, "currentState", { value: "active", configurable: true });
});

it.each(["audio", "video"] as const)("publishes only the requested %s media", async (type) => {
  const gateway = new LiveKitCallGateway({} as AppSupabaseClient);
  const events: CallMediaEvent[] = [];
  expect((await gateway.connect(grant(type), (event) => events.push(event))).ok).toBe(true);
  const room = latestRoom();
  expect(room.localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(true);
  expect(room.localParticipant.setCameraEnabled).toHaveBeenCalledTimes(type === "video" ? 1 : 0);
  room.emit("subscribed");
  room.emit("subscribed");
  expect(events.filter((event) => event.type === "connected")).toHaveLength(1);
  await gateway.disconnect();
  expect(room.disconnect).toHaveBeenCalledTimes(1);
});
