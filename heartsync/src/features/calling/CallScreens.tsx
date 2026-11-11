import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, PermissionsAndroid, Platform, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../auth/AuthProvider';
import { ConversationProfile } from '../../shared/components/ConversationProfile';
import { CallVideoView } from '../../shared/components/CallVideoView';
import { useAppServices } from '../../services/AppServicesProvider';
import type { CallGateway } from '../../services/contracts';
import { AppButton } from '../../shared/components/AppButton';
import { AppText } from '../../shared/components/AppText';
import { IconButton } from '../../shared/components/IconButton';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import { colors, fonts, type } from '../../shared/theme/tokens';
import type { CallStatus, CallType } from '../../shared/types/domain.types';
import type { RootStackParamList } from '../../navigation/types';

const labels: Record<CallStatus, string> = {
  idle: 'Đang chuẩn bị',
  ringing: 'Đang đổ chuông',
  accepted: 'Đã chấp nhận',
  connecting: 'Đang kết nối',
  connected: 'Đã kết nối',
  rejected: 'Đã từ chối',
  missed: 'Cuộc gọi nhỡ',
  ended: 'Đã kết thúc',
  failed: 'Không thể kết nối',
};

export function AudioCallScreen(props: NativeStackScreenProps<RootStackParamList, 'AudioCall'>) {
  return (
    <CallSession
      key={props.route.params.callId}
      {...props.route.params}
      navigation={props.navigation}
      callType="audio"
    />
  );
}
export function VideoCallScreen(props: NativeStackScreenProps<RootStackParamList, 'VideoCall'>) {
  return (
    <CallSession
      key={props.route.params.callId}
      {...props.route.params}
      navigation={props.navigation}
      callType="video"
    />
  );
}

function CallSession({
  matchId,
  callId,
  incoming = false,
  callType,
  navigation,
}: RootStackParamList['AudioCall'] & {
  callType: CallType;
  navigation:
    | NativeStackScreenProps<RootStackParamList, 'AudioCall'>['navigation']
    | NativeStackScreenProps<RootStackParamList, 'VideoCall'>['navigation'];
}) {
  const { user } = useAuth();
  const [participant, setParticipant] = useState('');
  const services = useAppServices();
  const [status, setStatus] = useState<CallStatus>('ringing');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [previewTrack, setPreviewTrack] = useState<unknown | null>(null);
  const [tracks, setTracks] = useState<{ local: unknown | null; remote: unknown | null; mirrorLocal: boolean }>({
    local: null,
    remote: null,
    mirrorLocal: true,
  });
  const cancelled = useRef(false);
  const connecting = useRef(false);
  const terminalFailure = useRef(false);
  const mediaJoinStarted = useRef(false);
  const [seconds, setSeconds] = useState(0);
  const gateway = useRef<CallGateway | null>(null);

  const connect = useCallback(async () => {
    if (!services || connecting.current || mediaJoinStarted.current || cancelled.current) return;
    connecting.current = true;
    mediaJoinStarted.current = true;
    if (Platform.OS === 'android') {
      const permissions =
        callType === 'video'
          ? [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, PermissionsAndroid.PERMISSIONS.CAMERA]
          : [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
      const granted = await PermissionsAndroid.requestMultiple(permissions);
      if (permissions.some((permission) => granted[permission] !== PermissionsAndroid.RESULTS.GRANTED)) {
        terminalFailure.current = true;
        connecting.current = false;
        cancelled.current = true;
        setError(
          callType === 'video'
            ? 'Cần quyền camera và micro để gọi video.'
            : 'Cần quyền micro để thực hiện cuộc gọi thoại.',
        );
        setStatus('failed');
        void services.calls.endCall(callId);
        return;
      }
    }
    if (cancelled.current) {
      connecting.current = false;
      return;
    }
    try {
      const instance = gateway.current ?? services.createCallGateway();
      gateway.current = instance;
      const grant = await instance.requestJoinGrant(callId, callType);
      if (cancelled.current) {
        await instance.disconnect();
        return;
      }
      if (!grant.ok) {
        terminalFailure.current = true;
        setError(grant.error.message);
        cancelled.current = true;
        setStatus('failed');
        void services.calls.endCall(callId);
        gateway.current = null;
        return;
      }
      const result = await instance.connect(grant.data, (event) => {
        if (cancelled.current) return;
        if (event.type === 'connecting') setStatus('connecting');
        if (cancelled.current) return;
        if (event.type === 'connected') setStatus('connected');
        if (event.type === 'videoTracksChanged') setTracks(instance.getVideoTracks());
        if (cancelled.current) return;
        if (event.type === 'disconnected') {
          if (terminalFailure.current) return;
          cancelled.current = true;
          setStatus('ended');
          void services.calls.endCall(callId);
          void instance.disconnect();
        }
        if (cancelled.current) return;
        if (event.type === 'failed') {
          terminalFailure.current = true;
          setStatus('failed');
          setError(callType === 'video' ? 'Kết nối video không thành công.' : 'Kết nối audio không thành công.');
        }
      });
      if (!result.ok) {
        terminalFailure.current = true;
        cancelled.current = true;
        void services.calls.endCall(callId);
        setError(result.error.message);
        setStatus('failed');
        gateway.current = null;
      }
    } catch {
      terminalFailure.current = true;
      cancelled.current = true;
      void services.calls.endCall(callId);
      setError(`Cuộc gọi ${callType === 'video' ? 'video' : 'thoại'} cần Android development build đã tích hợp WebRTC.`);
      setStatus('failed');
      gateway.current = null;
    } finally {
      connecting.current = false;
    }
  }, [callId, callType, services]);

  useEffect(() => {
    if (!services) return;
    cancelled.current = false;
    mediaJoinStarted.current = false;
    const subscription = services.calls.subscribeIncoming(
      (call) => {
        if (call.id !== callId) return;
        if (terminalFailure.current && ['ended', 'rejected', 'failed', 'missed'].includes(call.status)) return;
        if (call.status !== 'accepted') setStatus(call.status);
        if (call.status === 'accepted') void connect();
        if (['ended', 'rejected', 'failed', 'missed'].includes(call.status)) {
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
        setParticipant(result.data.callerId === user?.id ? result.data.calleeId : result.data.callerId);
        if (!terminalFailure.current && result.data.status !== 'accepted') setStatus(result.data.status);
        if (result.data.status === 'accepted') void connect();
        if (['ended', 'rejected', 'failed', 'missed'].includes(result.data.status)) {
          cancelled.current = true;
          await gateway.current?.disconnect();
        }
      } else {
        await gateway.current?.disconnect();
        setStatus('failed');
      }
    };
    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, 1000);
    return () => {
      cancelled.current = true;
      clearInterval(timer);
      subscription.unsubscribe();
      void gateway.current?.disconnect();
      void services.calls.endCall(callId);
    };
  }, [callId, connect, services, user?.id]);

  useEffect(() => {
    if (!services || terminalFailure.current || !['accepted', 'connecting', 'connected'].includes(status)) return;
    let live = true;
    const heartbeat = async () => {
      if (!live || AppState.currentState !== 'active') return;
      const result = await services.calls.heartbeatCall(callId);
      if (!live || result.ok || result.error.code === 'network') return;
      setError(result.error.message);
    };
    void heartbeat();
    const timer = setInterval(() => void heartbeat(), 15_000);
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') void heartbeat();
    });
    return () => {
      live = false;
      clearInterval(timer);
      appState.remove();
    };
  }, [callId, services, status]);

  useEffect(() => {
    if (status !== 'connected') return;
    const timer = setInterval(() => setSeconds((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (callType !== 'video') return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' || cancelled.current || !gateway.current) return;
      void gateway.current.setCameraEnabled(false).then((result) => {
        if (result.ok && !cancelled.current) setCameraEnabled(false);
      });
    });
    return () => subscription.remove();
  }, [callType]);

  useEffect(() => {
    if (!services || incoming || callType !== 'video' || status !== 'ringing') return;
    let active = true;
    const startPreview = async () => {
      if (Platform.OS === 'android') {
        const camera = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
        if (camera !== PermissionsAndroid.RESULTS.GRANTED) {
          if (active) setError('Cần quyền camera để xem trước hình ảnh của bạn.');
          return;
        }
      }
      const instance = gateway.current ?? services.createCallGateway();
      gateway.current = instance;
      const result = await instance.startCameraPreview();
      if (!active) {
        await instance.stopCameraPreview();
        return;
      }
      if (result.ok) setPreviewTrack(result.data);
      else setError(result.error.message);
    };
    void startPreview();
    return () => {
      active = false;
      setPreviewTrack(null);
      void gateway.current?.stopCameraPreview();
    };
  }, [callType, incoming, services, status]);

  const accept = async () => {
    if (!services) return;
    setBusy(true);
    const result = await services.calls.acceptCall(callId);
    setBusy(false);
    if (result.ok) {
      setStatus('accepted');
      void connect();
    } else setError(result.error.message);
  };
  const reject = async () => {
    if (!services) return;
    setBusy(true);
    const result = await services.calls.rejectCall(callId);
    setBusy(false);
    if (result.ok) {
      setStatus('rejected');
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
      setStatus('ended');
      navigation.goBack();
    } else setError(result.error.message);
  };

  const waitingForParticipant = ['ringing', 'accepted', 'connecting'].includes(status);
  const waitingLabel = incoming ? 'Cuộc gọi đến' : callType === 'video' ? 'Đang gọi video' : 'Đang gọi thoại';
  const waitingDescription =
    status === 'ringing' ? (incoming ? 'Chấp nhận để bắt đầu cuộc gọi' : 'Đang đổ chuông…') : 'Đang kết nối an toàn…';
  const fullScreenVideo = callType === 'video' && status === 'connected';

  if (!services) {
    return (
      <Screen safeTop>
        <StatePanel title="Không thể mở cuộc gọi" description="Cấu hình dịch vụ đang thiếu." />
      </Screen>
    );
  }
  if (callType === 'audio' && (waitingForParticipant || status === 'connected')) {
    return (
      <Screen scroll={false} safeTop contentStyle={styles.audioWaitingContent}>
        <View style={styles.audioWaitingSurface}>
          {participant ? (
            <ConversationProfile profileId={participant} presentation="callHero" />
          ) : (
            <View style={styles.waitingFallback} />
          )}
          <AppText tone="onPrimary" style={styles.audioModeLabel}>
            {status === 'connected' ? 'ĐANG GỌI THOẠI' : 'Cuộc gọi thoại'}
          </AppText>
          <View pointerEvents="none" style={styles.audioCallMeta}>
            <AppText tone="onPrimary" style={styles.audioCallStatus}>
              {status === 'connected'
                ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
                : waitingDescription}
            </AppText>
          </View>
          <View style={styles.audioCallActions}>
            {incoming && status === 'ringing' ? (
              <>
                <AppButton
                  label="Từ chối"
                  variant="danger"
                  disabled={busy}
                  onPress={() => void reject()}
                  style={styles.audioIncomingAction}
                />
                <AppButton
                  label="Chấp nhận"
                  disabled={busy}
                  onPress={() => void accept()}
                  style={styles.audioIncomingAction}
                />
              </>
            ) : null}
            {!incoming && status === 'ringing' ? (
              <AppButton
                label="Hủy cuộc gọi"
                disabled={busy}
                onPress={() => void end()}
                style={styles.audioCancelAction}
              />
            ) : null}
            {status === 'connected' ? (
              <>
                <IconButton
                  icon={muted ? 'microphoneOff' : 'microphone'}
                  label={muted ? 'Bật micro' : 'Tắt micro'}
                  tone="onPrimary"
                  style={styles.audioRoundControl}
                  onPress={() => {
                    void gateway.current?.setMuted(!muted).then((result) => {
                      if (result?.ok) setMuted(!muted);
                      else if (result) setError(result.error.message);
                    });
                  }}
                />
                <IconButton
                  icon="callEnd"
                  label="Kết thúc cuộc gọi"
                  tone="onPrimary"
                  style={styles.audioEndControl}
                  onPress={() => void end()}
                />
              </>
            ) : null}
          </View>
          {error ? (
            <AppText accessibilityLiveRegion="polite" variant="caption" tone="onPrimary" style={styles.audioCallError}>
              {error}
            </AppText>
          ) : null}
        </View>
      </Screen>
    );
  }
  if (fullScreenVideo) {
    return (
      <Screen scroll={false} safeTop contentStyle={styles.fullScreenContent}>
        <View style={styles.fullScreenVideo}>
          {tracks.remote ? (
            <CallVideoView track={tracks.remote} style={styles.remoteVideo} zOrder={0} />
          ) : participant ? (
            <ConversationProfile profileId={participant} presentation="callHero" />
          ) : (
            <View style={styles.remoteCameraFallback} />
          )}
          {!tracks.remote ? (
            <View pointerEvents="none" style={styles.remoteCameraOffMessage}>
              <AppText variant="title" tone="onPrimary" style={styles.remoteCameraOffTitle}>
                Camera đã tắt
              </AppText>
              <AppText tone="onPrimary" style={styles.remoteCameraOffDescription}>
                Bạn vẫn đang kết nối âm thanh với người kia
              </AppText>
            </View>
          ) : null}
          {tracks.local ? (
            <CallVideoView
              track={tracks.local}
              style={styles.fullScreenLocalVideo}
              mirror={tracks.mirrorLocal}
              zOrder={1}
            />
          ) : user ? (
            <View style={styles.fullScreenLocalAvatar}>
              <ConversationProfile profileId={user.id} presentation="callTile" />
            </View>
          ) : (
            <Text style={styles.fullScreenLocalPlaceholder}>
              {cameraEnabled ? 'Đang mở camera…' : 'Camera đã tắt'}
            </Text>
          )}
          <View style={styles.callTopBar} pointerEvents="none">
            <AppText variant="subtitle" tone="onPrimary">
              Cuộc gọi video
            </AppText>
            <AppText variant="caption" tone="onPrimary">
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
            </AppText>
          </View>
          <View style={styles.callControls}>
            <IconButton
              icon={muted ? 'microphoneOff' : 'microphone'}
              label={muted ? 'Bật micro' : 'Tắt micro'}
              tone={muted ? 'onPrimary' : 'default'}
              style={muted ? styles.callControlMuted : styles.callControlLight}
              onPress={() => {
                void gateway.current?.setMuted(!muted).then((result) => {
                  if (result?.ok) setMuted(!muted);
                  else if (result) setError(result.error.message);
                });
              }}
            />
            <IconButton
              icon={cameraEnabled ? 'video' : 'videoOff'}
              label={cameraEnabled ? 'Tắt camera' : 'Bật camera'}
              tone={!cameraEnabled ? 'onPrimary' : 'default'}
              style={!cameraEnabled ? styles.callControlMuted : styles.callControlLight}
              onPress={() => {
                void gateway.current?.setCameraEnabled(!cameraEnabled).then((result) => {
                  if (result?.ok) setCameraEnabled(!cameraEnabled);
                  else if (result) setError(result.error.message);
                });
              }}
            />
            <IconButton
              icon="cameraFlip"
              label="Đổi camera"
              tone="onPrimary"
              style={styles.callControl}
              onPress={() => {
                void gateway.current?.switchCamera().then((result) => {
                  if (result && !result.ok) setError(result.error.message);
                });
              }}
            />
            <IconButton
              icon="callEnd"
              label="Kết thúc cuộc gọi"
              tone="onPrimary"
              style={styles.endCallControl}
              onPress={() => void end()}
            />
          </View>
          {error ? (
            <AppText accessibilityLiveRegion="polite" variant="caption" tone="onPrimary" style={styles.fullScreenError}>
              {error}
            </AppText>
          ) : null}
        </View>
      </Screen>
    );
  }
  return (
    <Screen scroll={callType !== 'video'} safeTop contentStyle={callType === 'video' ? styles.videoContent : undefined}>
      {waitingForParticipant ? (
        <View style={styles.waitingSurface}>
          {participant ? (
            <ConversationProfile profileId={participant} presentation="callHero" />
          ) : (
            <View style={styles.waitingFallback} />
          )}
          {previewTrack ? (
            <CallVideoView track={previewTrack} preview mirror style={styles.waitingLocalVideo} zOrder={1} />
          ) : null}
          <View pointerEvents="none" style={styles.waitingMeta}>
            <AppText accessibilityRole="header" variant="title" tone="onPrimary">
              {waitingLabel}
            </AppText>
            <AppText accessibilityLiveRegion="polite" tone="onPrimary" style={styles.waitingDescription}>
              {waitingDescription}
            </AppText>
          </View>
        </View>
      ) : null}
      {!waitingForParticipant && participant ? <ConversationProfile profileId={participant} /> : null}
      {!waitingForParticipant ? (
        <AppText accessibilityRole="header" variant="title">
          {callType === 'video' ? 'Cuộc gọi video' : 'Cuộc gọi thoại'}
        </AppText>
      ) : null}
      {!waitingForParticipant && (callType === 'audio' || !['connecting', 'connected'].includes(status)) ? (
        <StatePanel
          title={labels[status]}
          description={
            incoming && status === 'ringing'
              ? `Người bạn kết nối đang gọi ${callType === 'video' ? 'video' : 'thoại'} cho bạn.`
              : 'Cuộc gọi đã kết thúc.'
          }
        />
      ) : null}
      {error ? (
        <AppText accessibilityLiveRegion="polite" variant="caption" tone="danger" style={styles.error}>
          {error}
        </AppText>
      ) : null}
      {incoming && status === 'ringing' ? (
        <>
          <AppButton label="Chấp nhận" disabled={busy} onPress={() => void accept()} />
          <AppButton label="Từ chối" variant="danger" disabled={busy} onPress={() => void reject()} />
        </>
      ) : null}
      {!incoming && status === 'ringing' ? (
        <AppButton label="Hủy cuộc gọi" variant="danger" disabled={busy} onPress={() => void end()} />
      ) : null}
      {['rejected', 'ended', 'failed', 'missed'].includes(status) ? (
        <AppButton label="Quay lại chat" variant="secondary" onPress={() => navigation.replace('Chat', { matchId })} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {},
  audioWaitingContent: { padding: 0, gap: 0, backgroundColor: colors.callBackdrop },
  audioWaitingSurface: { flex: 1, backgroundColor: colors.callBackdrop, overflow: 'hidden' },
  audioModeLabel: {
    position: 'absolute',
    top: 76,
    left: 24,
    right: 24,
    textAlign: 'center',
    fontFamily: fonts.bold,
    fontSize: 17,
    lineHeight: 24,
  },
  audioCallMeta: { position: 'absolute', left: 24, right: 24, bottom: 226, alignItems: 'center' },
  audioCallStatus: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 30, textAlign: 'center' },
  audioCallActions: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 48,
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  audioCancelAction: { alignSelf: 'stretch', flex: 1, backgroundColor: colors.primary, borderColor: colors.primary },
  audioIncomingAction: { flex: 1, alignSelf: 'stretch' },
  audioRoundControl: { width: 68, height: 68, backgroundColor: 'rgba(36, 25, 37, 0.80)' },
  audioEndControl: { width: 68, height: 68, backgroundColor: colors.danger },
  audioCallError: { position: 'absolute', left: 24, right: 24, bottom: 132, textAlign: 'center', color: colors.onPrimary },
  waitingSurface: { flex: 1, minHeight: 480, backgroundColor: colors.callBackdrop, borderRadius: 24, overflow: 'hidden' },
  waitingFallback: { flex: 1, backgroundColor: colors.primarySoft },
  waitingLocalVideo: {
    position: 'absolute',
    top: 20,
    right: 16,
    width: 116,
    height: 164,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.onPrimary,
    backgroundColor: colors.callBackdrop,
  },
  waitingMeta: { position: 'absolute', left: 24, right: 24, bottom: 36, alignItems: 'center', gap: 4 },
  waitingDescription: { ...type.body, color: colors.onPrimary, textAlign: 'center' },
  videoContent: { padding: 12, gap: 8 },
  fullScreenContent: { padding: 0, gap: 0, backgroundColor: colors.callBackdrop },
  fullScreenVideo: { flex: 1, backgroundColor: colors.callBackdrop, justifyContent: 'center', overflow: 'hidden' },
  remoteCameraFallback: { flex: 1, backgroundColor: colors.callBackdrop },
  remoteCameraOffMessage: { position: 'absolute', left: 28, right: 28, bottom: 128, alignItems: 'center', gap: 4 },
  remoteCameraOffTitle: { ...type.title, color: colors.onPrimary },
  remoteCameraOffDescription: { ...type.body, color: colors.onPrimary, textAlign: 'center' },
  fullScreenLocalVideo: {
    position: 'absolute',
    top: 18,
    right: 16,
    width: 108,
    height: 152,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  fullScreenLocalAvatar: {
    position: 'absolute',
    top: 18,
    right: 16,
    width: 108,
    height: 152,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  fullScreenLocalPlaceholder: {
    position: 'absolute',
    top: 18,
    right: 16,
    width: 108,
    height: 152,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.inkMuted,
    color: colors.onPrimary,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  callTopBar: { position: 'absolute', top: 20, left: 20, right: 140, gap: 2 },
  callControls: { position: 'absolute', left: 0, right: 0, bottom: 32, flexDirection: 'row', justifyContent: 'center', gap: 16 },
  callControlLight: { backgroundColor: '#FFFFFF', width: 58, height: 58 },
  callControl: { backgroundColor: 'rgba(31, 31, 31, 0.56)', width: 58, height: 58 },
  callControlMuted: { backgroundColor: colors.inkMuted, width: 58, height: 58 },
  endCallControl: { backgroundColor: '#FF4757', width: 58, height: 58 },
  fullScreenError: { position: 'absolute', left: 24, right: 24, bottom: 100, ...type.caption, color: colors.onPrimary, textAlign: 'center' },
  remoteVideo: { width: '100%', height: '100%' },
});
