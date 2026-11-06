import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useAuth } from "../auth/AuthProvider";
import { ConversationProfile } from "../../shared/components/ConversationProfile";
import { useAppServices } from "../../services/AppServicesProvider";
import type { CallGateway } from "../../services/contracts";
import { AppButton } from "../../shared/components/AppButton";
import { Screen } from "../../shared/components/Screen";
import { StatePanel } from "../../shared/components/StatePanel";
import { colors, type } from "../../shared/theme/tokens";
import type { CallStatus } from "../../shared/types/domain.types";
import type { RootStackParamList } from "../../navigation/types";

const labels: Record<CallStatus, string> = {
  idle: "Đang chuẩn bị",
  ringing: "Đang đổ chuông",
  accepted: "Đã chấp nhận",
  connecting: "Đang kết nối audio",
  connected: "Đã kết nối",
  rejected: "Đã từ chối",
  missed: "Cuộc gọi nhỡ",
  ended: "Đã kết thúc",
  failed: "Không thể kết nối",
};

export function AudioCallScreen(props: NativeStackScreenProps<RootStackParamList, "AudioCall">) {
  return <AudioCallSession key={props.route.params.callId} {...props} />;
}
function AudioCallSession({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, "AudioCall">) {
  const { user } = useAuth();
  const [participant, setParticipant] = useState("");
  const services = useAppServices();
  const { matchId, callId, incoming = false } = route.params;
  const [status, setStatus] = useState<CallStatus>(
    incoming ? "ringing" : "ringing",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const cancelled = useRef(false);
  const connecting = useRef(false);
  const terminalFailure = useRef(false);
  const [seconds, setSeconds] = useState(0);
  const gateway = useRef<CallGateway | null>(null);
  const connect = useCallback(async () => {
    if (!services || gateway.current || connecting.current || cancelled.current)
      return;
    connecting.current = true;
    try {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          terminalFailure.current = true;
          cancelled.current = true;
          setError("Cần quyền micro để thực hiện cuộc gọi thoại.");
          setStatus("failed");
          void services.calls.endCall(callId);
          return;
        }
      }
      if (cancelled.current) return;
      const instance = services.createCallGateway();
      gateway.current = instance;
      const grant = await instance.requestJoinGrant(callId, "audio");
      if (cancelled.current) {
        await instance.disconnect();
        return;
      }
      if (!grant.ok) {
        terminalFailure.current = true;
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
        if (cancelled.current) return;
        if (event.type === "disconnected") {
          if (terminalFailure.current) return;
          cancelled.current = true;
          setStatus("ended");
          void services.calls.endCall(callId);
          void instance.disconnect();
        }
        if (cancelled.current) return;
        if (event.type === "failed") {
          terminalFailure.current = true;
          setStatus("failed");
          setError("Kết nối audio không thành công.");
        }
      });
      if (!result.ok) {
        terminalFailure.current = true;
        cancelled.current = true;
        void services.calls.endCall(callId);
        setError(result.error.message);
        setStatus("failed");
        gateway.current = null;
      }
    } catch {
      terminalFailure.current = true;
      cancelled.current = true;
      void services.calls.endCall(callId);
      setError(
        "Cuộc gọi thoại cần Android development build đã tích hợp native WebRTC.",
      );
      setStatus("failed");
      gateway.current = null;
    } finally {
      connecting.current = false;
    }
  }, [callId, services]);
  useEffect(() => {
    if (!services) return;
    cancelled.current = false;
    const subscription = services.calls.subscribeIncoming(
      (call) => {
        if (call.id !== callId) return;
        if (
          terminalFailure.current &&
          ["ended", "rejected", "failed", "missed"].includes(call.status)
        )
          return;
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
        if (
          !terminalFailure.current &&
          result.data.status !== "accepted"
        )
          setStatus(result.data.status);
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
    if (
      !services ||
      terminalFailure.current ||
      !["accepted", "connecting", "connected"].includes(status)
    )
      return;
    let live = true;
    const heartbeat = async () => {
      if (!live || AppState.currentState !== "active") return;
      const result = await services.calls.heartbeatCall(callId);
      if (!live || result.ok || result.error.code === "network") return;
      setError(result.error.message);
    };
    void heartbeat();
    const timer = setInterval(() => void heartbeat(), 15_000);
    const appState = AppState.addEventListener("change", (next) => {
      if (next === "active") void heartbeat();
    });
    return () => {
      live = false;
      clearInterval(timer);
      appState.remove();
    };
  }, [callId, services, status]);
  useEffect(() => {
    if (status !== "connected") return;
    const timer = setInterval(() => setSeconds((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);
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
    <Screen>
      {participant ? <ConversationProfile profileId={participant} /> : null}
      <Text accessibilityRole="header" style={styles.title}>
        Cuộc gọi thoại
      </Text>
      <StatePanel
        title={labels[status]}
        description={
          incoming && status === "ringing"
            ? "Người bạn kết nối đang gọi cho bạn. Micro chỉ bật nếu bạn chấp nhận."
            : "Cuộc gọi chỉ dành cho participant của một match đang hoạt động."
        }
      />
      {status === "connected" ? (
        <Text>
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </Text>
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

export function VideoCallScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "VideoCall">) {
  return (
    <Screen>
      <StatePanel
        title="Video call chưa nằm trong MVP"
        description="Bản demo hiện kiểm thử cuộc gọi thoại hai chiều trên Android development build. Camera không được bật trong luồng này."
      />
      <AppButton
        label="Quay lại"
        variant="quiet"
        onPress={() => navigation.goBack()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.title, color: colors.ink },
  error: { ...type.caption, color: colors.danger },
});
