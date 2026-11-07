import { useEffect, useState } from "react";
import { AppState, Modal, Text, View } from "react-native";
import { ConversationProfile } from "../../shared/components/ConversationProfile";
import { useAuth } from "../auth/AuthProvider";
import { useAppServices } from "../../services/AppServicesProvider";
import { AppButton } from "../../shared/components/AppButton";
import type { IncomingCall } from "../../shared/types/domain.types";
import { colors } from "../../shared/theme/tokens";

export function IncomingCallOverlay({
  onOpen,
}: {
  onOpen(call: IncomingCall): void;
}) {
  const services = useAppServices();
  const { user } = useAuth();
  const [call, setCall] = useState<IncomingCall | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!services || !user) return;
    let live = true;
    const refresh = async () => {
      const result = await services.calls.listActive();
      if (!live) return;
      if (result.ok)
        setCall(
          result.data.find(
            (c) => c.calleeId === user.id && c.status === "ringing",
          ) ?? null,
        );
    };
    const sub = services.calls.subscribeIncoming(
      () => void refresh(),
      (e) => {
        if (live) setError(e.message);
      },
    );
    void refresh();
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void refresh();
    }, 5000);
    const state = AppState.addEventListener("change", (s) => {
      if (s === "active") void refresh();
    });
    return () => {
      live = false;
      sub.unsubscribe();
      clearInterval(timer);
      state.remove();
    };
  }, [services, user]);
  useEffect(() => {
    let live = true;
    if (call && services)
      void services.profile.getPublic(call.callerId).then((r) => {
        if (live) setName(r.ok ? r.data.displayName : "Người bạn kết nối");
      });
    return () => {
      live = false;
    };
  }, [call, services]);
  if (!call || !services || !user || call.calleeId !== user.id) return null;
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => {
        void services.calls.rejectCall(call.id);
      }}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          backgroundColor: "#0008",
          padding: 24,
        }}
      >
        <View
          style={{
            padding: 24,
            gap: 16,
            borderRadius: 22,
            backgroundColor: colors.surface,
          }}
        >
          <ConversationProfile profileId={call.callerId} />
          <Text>{name || "Cuộc gọi đến"}</Text>
          <Text>{call.type === "video" ? "Đang gọi video cho bạn" : "Đang gọi thoại cho bạn"}</Text>
          {error ? <Text>{error}</Text> : null}
          <AppButton
            label="Chấp nhận"
            disabled={busy}
            onPress={() => {
              setBusy(true);
              void services.calls.acceptCall(call.id).then((r) => {
                setBusy(false);
                if (r.ok) {
                  setCall(null);
                  onOpen(r.data);
                } else setError(r.error.message);
              });
            }}
          />
          <AppButton
            label="Từ chối"
            variant="danger"
            disabled={busy}
            onPress={() => {
              setBusy(true);
              void services.calls.rejectCall(call.id).then((r) => {
                setBusy(false);
                if (r.ok) setCall(null);
                else setError(r.error.message);
              });
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
