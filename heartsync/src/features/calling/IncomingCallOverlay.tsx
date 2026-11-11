import { useEffect, useState } from 'react';
import { AppState, Modal, StyleSheet, View } from 'react-native';
import { ConversationProfile } from '../../shared/components/ConversationProfile';
import { useAuth } from '../auth/AuthProvider';
import { useAppServices } from '../../services/AppServicesProvider';
import { AppButton } from '../../shared/components/AppButton';
import { AppText } from '../../shared/components/AppText';
import type { IncomingCall } from '../../shared/types/domain.types';
import { colors, radii, spacing } from '../../shared/theme/tokens';

export function IncomingCallOverlay({ onOpen }: { onOpen(call: IncomingCall): void }) {
  const services = useAppServices();
  const { user } = useAuth();
  const userId = user?.id;
  const [call, setCall] = useState<IncomingCall | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!services || !userId) return;
    let live = true;
    const refresh = async () => {
      const result = await services.calls.listActive();
      if (!live) return;
      if (result.ok) {
        setCall(result.data.find((c) => c.calleeId === userId && c.status === 'ringing') ?? null);
      }
    };
    const sub = services.calls.subscribeIncoming(
      () => void refresh(),
      (e) => {
        if (live) setError(e.message);
      },
    );
    void refresh();
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void refresh();
    }, 20_000);
    const state = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refresh();
    });
    return () => {
      live = false;
      sub.unsubscribe();
      clearInterval(timer);
      state.remove();
    };
  }, [services, userId]);

  useEffect(() => {
    let live = true;
    if (call && services) {
      void services.profile.getPublic(call.callerId).then((r) => {
        if (live) setName(r.ok ? r.data.displayName : 'Người bạn kết nối');
      });
    }
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
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ConversationProfile profileId={call.callerId} presentation="avatar" />
          <AppText accessibilityRole="header" variant="title">
            {name || 'Cuộc gọi đến'}
          </AppText>
          <AppText tone="muted">{call.type === 'video' ? 'Đang gọi video cho bạn' : 'Đang gọi thoại cho bạn'}</AppText>
          {error ? (
            <AppText accessibilityLiveRegion="polite" variant="caption" tone="danger">
              {error}
            </AppText>
          ) : null}
          <AppButton
            label="Chấp nhận"
            disabled={busy}
            style={styles.actionBtn}
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
            style={styles.actionBtn}
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(54, 17, 42, 0.56)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  actionBtn: { alignSelf: 'stretch' },
});
