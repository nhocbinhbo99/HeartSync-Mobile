import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, PermissionsAndroid, Platform, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useAuth } from "../auth/AuthProvider";
import { ConversationProfile } from "../../shared/components/ConversationProfile";
import { CallVideoView } from "../../shared/components/CallVideoView";
import { useAppServices } from "../../services/AppServicesProvider";
import type { CallGateway } from "../../services/contracts";
import { AppButton } from "../../shared/components/AppButton";
import { Screen } from "../../shared/components/Screen";
import { StatePanel } from "../../shared/components/StatePanel";
import { colors, type } from "../../shared/theme/tokens";
import type { CallStatus, CallType } from "../../shared/types/domain.types";
import type { RootStackParamList } from "../../navigation/types";

const labels: Record<CallStatus, string> = {
  idle: "Đang chuẩn bị",
  ringing: "Đang đổ chuông",
  accepted: "Đã chấp nhận",
  connecting: "Đang kết nối",
  connected: "Đã kết nối",
  rejected: "Đã từ chối",
  missed: "Cuộc gọi nhỡ",
  ended: "Đã kết thúc",
  failed: "Không thể kết nối",
};

export function AudioCallScreen(props: NativeStackScreenProps<RootStackParamList, "AudioCall">) {
  return <CallSession key={props.route.params.callId} {...props.route.params} navigation={props.navigation} callType="audio" />;
}
export function VideoCallScreen(props: NativeStackScreenProps<RootStackParamList, "VideoCall">) {
  return <CallSession key={props.route.params.callId} {...props.route.params} navigation={props.navigation} callType="video" />;
}
function CallSession({
  matchId, callId, incoming = false, callType,
  navigation,
}: RootStackParamList["AudioCall"] & { callType: CallType; navigation: NativeStackScreenProps<RootStackParamList, "AudioCall">["navigation"] | NativeStackScreenProps<RootStackParamList, "VideoCall">["navigation"] }) {
  const { user } = useAuth();
  const [participant, setParticipant] = useState("");
  const services = useAppServices();
  const [status, setStatus] = useState<CallStatus>("ringing");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [tracks, setTracks] = useState<{ local: unknown | null; remote: unknown | null; mirrorLocal: boolean }>({ local: null, remote: null, mirrorLocal: true });
  const cancelled = useRef(false);
  const connecting = useRef(false);
  const [seconds, setSeconds] = useState(0);
  const gateway = useRef<CallGateway | null>(null);
  const connect = useCallback(async () => {
    if (!services || gateway.current || connecting.current || cancelled.current)
      return;
    connecting.current = true;
    if (Platform.OS === "android") {
      const permissions = callType === "video"
        ? [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, PermissionsAndroid.PERMISSIONS.CAMERA]
        : [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
      const granted = await PermissionsAndroid.requestMultiple(permissions);
      if (permissions.some((permission) => granted[permission] !== PermissionsAndroid.RESULTS.GRANTED)) {
        connecting.current = false;
        cancelled.current = true;
        setError(callType === "video" ? "Cần quyền camera và micro để gọi video." : "Cần quyền micro để thực hiện cuộc gọi thoại.");
        setStatus("failed");
        void services.calls.endCall(callId);
        return;
      }
    }
    if (cancelled.current) {
      connecting.current = false;
      return;
    }
    try {
      const instance = services.createCallGateway();
      gateway.current = instance;
      const grant = await instance.requestJoinGrant(callId, callType);
      if (cancelled.current) {
        await instance.disconnect();
        return;
      }
      if (!grant.ok) {
        setError(grant.error.message);
        cancelled.current = true;
        setStatus("failed");
        void services.calls.endCall(callId);
        gateway.current = null;
        return;
      }
      const result = await instance.connect(grant.data, (event) => {
        if (cancelled.current) return;
        if (event.type === "connecting") setStatus("connecting");
        if (cancelled.current) return;
        if (event.type === "connected") setStatus("connected");
        if (event.type === "videoTracksChanged") setTracks(instance.getVideoTracks());
        if (cancelled.current) return;
        if (event.type === "disconnected") {
          cancelled.current = true;
          setStatus("ended");
          void services.calls.endCall(callId);
          void instance.disconnect();
        }
        if (cancelled.current) return;
        if (event.type === "failed") {
          setStatus("failed");
          setError(callType === "video" ? "Kết nối video không thành công." : "Kết nối audio không thành công.");
        }
      });
      if (!result.ok) {
        cancelled.current = true;
        void services.calls.endCall(callId);
        setError(result.error.message);
        setStatus("failed");
        gateway.current = null;
      }
    } catch {
      cancelled.current = true;
      void services.calls.endCall(callId);
      setError(
        `Cuộc gọi ${callType === "video" ? "video" : "thoại"} cần Android development build đã tích hợp native WebRTC.`,
      );
      setStatus("failed");
      gateway.current = null;
    } finally {
      connecting.current = false;
    }
  }, [callId, callType, services]);
  useEffect(() => {
    if (!services) return;
    cancelled.current = false;
    const subscription = services.calls.subscribeIncoming(
      (call) => {
        if (call.id !== callId) return;
        if (call.status !== "accepted") setStatus(call.status);
        if (call.status === "accepted") void connect();
        if (["ended", "rejected", "failed", "missed"].includes(call.status)) {
          cancelled.current = true;
          void gateway.current?.disconnect();
        }
      },
      (nextError) => setError(nextError.message),
    );
    const refresh = async () => {
      const result = await services.calls.loadCall(callId);
      if (cancelled.current) return;
      if (result.ok) {
        setParticipant(
          result.data.callerId === user?.id
            ? result.data.calleeId
            : result.data.callerId,
        );
        if (result.data.status !== "accepted") setStatus(result.data.status);
        if (result.data.status === "accepted") void connect();
        if (
          ["ended", "rejected", "failed", "missed"].includes(result.data.status)
        ) {
          cancelled.current = true;
          await gateway.current?.disconnect();
        }
      } else {
        await gateway.current?.disconnect();
        setStatus("failed");
      }
    };
    void refresh();
    const timer = setInterval(() => {
      void services.calls.listActive().then(refresh);
    }, 5000);
    return () => {
      cancelled.current = true;
      clearInterval(timer);
      subscription.unsubscribe();
      void gateway.current?.disconnect();
      void services.calls.endCall(callId);
    };
  }, [callId, connect, services, user?.id]);
  useEffect(() => {
    if (status !== "connected") return;
    const timer = setInterval(() => setSeconds((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);
  useEffect(() => {
    if (callType !== "video") return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" || cancelled.current || !gateway.current) return;
      void gateway.current.setCameraEnabled(false).then((result) => {
        if (result.ok && !cancelled.current) setCameraEnabled(false);
      });
    });
    return () => subscription.remove();
  }, [callType]);
  const accept = async () => {
    if (!services) return;
    setBusy(true);
    const result = await services.calls.acceptCall(callId);
    setBusy(false);
    if (result.ok) {
      setStatus("accepted");
      void connect();
    } else setError(result.error.message);
  };
  const reject = async () => {
    if (!services) return;
    setBusy(true);
    const result = await services.calls.rejectCall(callId);
    setBusy(false);
    if (result.ok) {
      setStatus("rejected");
      navigation.goBack();
    } else setError(result.error.message);
  };
  const end = async () => {
    if (!services) return;
    cancelled.current = true;
    setBusy(true);
    await gateway.current?.disconnect();
    const result = await services.calls.endCall(callId);
    setBusy(false);
    if (result.ok) {
      setStatus("ended");
      navigation.goBack();
    } else setError(result.error.message);
  };
  if (!services)
    return (
      <Screen>
        <StatePanel
          title="Không thể mở cuộc gọi"
          description="Cấu hình dịch vụ đang thiếu."
        />
      </Screen>
    );
  return (
    <Screen scroll={callType !== "video"} contentStyle={callType === "video" ? styles.videoContent : undefined}>
      {participant ? <ConversationProfile profileId={participant} /> : null}
      <Text accessibilityRole="header" style={styles.title}>
        {callType === "video" ? "Cuộc gọi video" : "Cuộc gọi thoại"}
      </Text>
      {callType === "video" ? (
        <View style={styles.videoArea}>
          {tracks.remote ? <CallVideoView track={tracks.remote} style={styles.remoteVideo} zOrder={0} />
            : <Text style={styles.videoPlaceholder}>{status === "ringing" ? "Đang chờ đối phương chấp nhận" : "Video đối phương chưa bật"}</Text>}
          {tracks.local ? <CallVideoView track={tracks.local} style={styles.localVideo} mirror={tracks.mirrorLocal} zOrder={1} />
            : <Text style={styles.localPlaceholder}>{status === "ringing" ? "Camera chưa bật" : cameraEnabled ? "Đang mở camera…" : "Camera đã tắt"}</Text>}
        </View>
      ) : null}
      {(callType === "audio" || !["connecting", "connected"].includes(status)) ? <StatePanel
        title={labels[status]}
        description={
          incoming && status === "ringing"
            ? `Người bạn kết nối đang gọi ${callType === "video" ? "video" : "thoại"} cho bạn. ${callType === "video" ? "Camera và micro" : "Micro"} chỉ bật nếu bạn chấp nhận.`
            : "Cuộc gọi chỉ dành cho participant của một match đang hoạt động."
        }
      /> : null}
      {status === "connected" ? (
        <Text>
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </Text>
      ) : null}
      {callType === "video" && ["connecting", "connected"].includes(status) ? (
        <>
          <AppButton label={cameraEnabled ? "Tắt camera" : "Bật camera"} disabled={cameraEnabled && !tracks.local} onPress={() => {
            void gateway.current?.setCameraEnabled(!cameraEnabled).then((result) => {
              if (result.ok) setCameraEnabled(!cameraEnabled);
              else setError(result.error.message);
            });
          }} />
          <AppButton label="Đổi camera" disabled={!cameraEnabled || !tracks.local} variant="secondary" onPress={() => {
            void gateway.current?.switchCamera().then((result) => {
              if (!result.ok) setError(result.error.message);
            });
          }} />
        </>
      ) : null}
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {incoming && status === "ringing" ? (
        <>
          <AppButton
            label="Chấp nhận"
            disabled={busy}
            onPress={() => void accept()}
          />
          <AppButton
            label="Từ chối"
            variant="danger"
            disabled={busy}
            onPress={() => void reject()}
          />
        </>
      ) : null}
      {!incoming && status === "ringing" ? (
        <AppButton
          label="Hủy cuộc gọi"
          variant="danger"
          disabled={busy}
          onPress={() => void end()}
        />
      ) : null}
      {status === "connected" ? (
        <AppButton
          label={muted ? "Bật micro" : "Tắt micro"}
          onPress={() => {
            void gateway.current?.setMuted(!muted).then((result) => {
              if (result.ok) setMuted(!muted);
              else setError(result.error.message);
            });
          }}
        />
      ) : null}
      {["accepted", "connecting", "connected"].includes(status) ? (
        <AppButton
          label="Kết thúc cuộc gọi"
          variant="danger"
          disabled={busy}
          onPress={() => void end()}
        />
      ) : null}
      {["rejected", "ended", "failed", "missed"].includes(status) ? (
        <AppButton
          label="Quay lại chat"
          variant="secondary"
          onPress={() => navigation.replace("Chat", { matchId })}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.title, color: colors.ink },
  error: { ...type.caption, color: colors.danger },
  videoContent: { padding: 12, gap: 8 },
  videoArea: { flex: 1, minHeight: 180, backgroundColor: colors.ink, borderRadius: 22, overflow: "hidden", justifyContent: "center" },
  remoteVideo: { width: "100%", height: "100%" },
  videoPlaceholder: { color: colors.onPrimary, textAlign: "center" },
  localVideo: { position: "absolute", bottom: 12, right: 12, width: 100, height: 140, borderRadius: 12 },
  localPlaceholder: { position: "absolute", bottom: 12, right: 12, width: 100, height: 140, color: colors.onPrimary, textAlign: "center" },
});
