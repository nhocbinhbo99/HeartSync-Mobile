import { useCallback, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAppServices } from '../../services/AppServicesProvider';
import { getSupabaseClient } from '../../services/supabase';
import type { CallGateway } from '../../services/contracts';
import { AppButton } from '../../shared/components/AppButton';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import { colors, type } from '../../shared/theme/tokens';
import type { CallStatus } from '../../shared/types/domain.types';
import type { RootStackParamList } from '../../navigation/types';

const labels: Record<CallStatus, string> = { idle: 'Đang chuẩn bị', ringing: 'Đang đổ chuông', accepted: 'Đã chấp nhận', connecting: 'Đang kết nối audio', connected: 'Đã kết nối', rejected: 'Đã từ chối', missed: 'Cuộc gọi nhỡ', ended: 'Đã kết thúc', failed: 'Không thể kết nối' };

export function AudioCallScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'AudioCall'>) {
  const services = useAppServices(); const { matchId, callId, incoming = false } = route.params;
  const [status, setStatus] = useState<CallStatus>(incoming ? 'ringing' : 'ringing'); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const gateway = useRef<CallGateway | null>(null);
  const connect = useCallback(async () => {
    if (!services || gateway.current) return;
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) { setError('Cần quyền micro để thực hiện cuộc gọi thoại.'); return; }
    }
    try {
      // These imports only execute in a native call flow; Expo Go can still load auth/UI.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ensureLiveKitGlobals } = require('../../services/livekit/bootstrap') as typeof import('../../services/livekit/bootstrap');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { LiveKitCallGateway } = require('../../services/livekit/LiveKitCallGateway') as typeof import('../../services/livekit/LiveKitCallGateway');
      const client = getSupabaseClient();
      if (!client) { setError('Thiếu cấu hình dịch vụ gọi thoại.'); return; }
      ensureLiveKitGlobals();
      const instance = new LiveKitCallGateway(client); gateway.current = instance;
      const grant = await instance.requestJoinGrant(callId, 'audio');
      if (!grant.ok) { setError(grant.error.message); gateway.current = null; return; }
      const result = await instance.connect(grant.data, (event) => {
        if (event.type === 'connecting') setStatus('connecting');
        if (event.type === 'connected') setStatus('connected');
        if (event.type === 'disconnected') setStatus('ended');
        if (event.type === 'failed') { setStatus('failed'); setError('Kết nối audio không thành công.'); }
      });
      if (!result.ok) { setError(result.error.message); setStatus('failed'); gateway.current = null; }
    } catch {
      setError('Cuộc gọi thoại cần Android development build đã tích hợp native WebRTC.'); setStatus('failed'); gateway.current = null;
    }
  }, [callId, services]);
  useEffect(() => {
    if (!services) return;
    const subscription = services.calls.subscribeIncoming((call) => {
      if (call.id !== callId) return;
      setStatus(call.status);
      if (call.status === 'accepted') void connect();
      if (['ended', 'rejected', 'failed'].includes(call.status)) void gateway.current?.disconnect();
    }, (nextError) => setError(nextError.message));
    return () => { subscription.unsubscribe(); void gateway.current?.disconnect(); };
  }, [callId, connect, services]);
  const accept = async () => { if (!services) return; setBusy(true); const result = await services.calls.acceptCall(callId); setBusy(false); if (result.ok) { setStatus('accepted'); void connect(); } else setError(result.error.message); };
  const reject = async () => { if (!services) return; setBusy(true); const result = await services.calls.rejectCall(callId); setBusy(false); if (result.ok) { setStatus('rejected'); navigation.goBack(); } else setError(result.error.message); };
  const end = async () => { if (!services) return; setBusy(true); await gateway.current?.disconnect(); const result = await services.calls.endCall(callId); setBusy(false); if (result.ok) { setStatus('ended'); navigation.goBack(); } else setError(result.error.message); };
  if (!services) return <Screen><StatePanel title="Không thể mở cuộc gọi" description="Cấu hình dịch vụ đang thiếu." /></Screen>;
  return <Screen><Text accessibilityRole="header" style={styles.title}>Cuộc gọi thoại</Text>
    <StatePanel title={labels[status]} description={incoming && status === 'ringing' ? 'Người bạn kết nối đang gọi cho bạn. Micro chỉ bật nếu bạn chấp nhận.' : 'Cuộc gọi chỉ dành cho participant của một match đang hoạt động.'} />
    {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
    {incoming && status === 'ringing' ? <><AppButton label="Chấp nhận" disabled={busy} onPress={() => void accept()} /><AppButton label="Từ chối" variant="danger" disabled={busy} onPress={() => void reject()} /></> : null}
    {!incoming && status === 'ringing' ? <AppButton label="Hủy cuộc gọi" variant="danger" disabled={busy} onPress={() => void end()} /> : null}
    {['accepted', 'connecting', 'connected'].includes(status) ? <AppButton label="Kết thúc cuộc gọi" variant="danger" disabled={busy} onPress={() => void end()} /> : null}
    {['rejected', 'ended', 'failed'].includes(status) ? <AppButton label="Quay lại chat" variant="secondary" onPress={() => navigation.replace('Chat', { matchId })} /> : null}
  </Screen>;
}

export function VideoCallScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'VideoCall'>) {
  return <Screen><StatePanel title="Video call chưa nằm trong MVP" description="Bản demo hiện kiểm thử cuộc gọi thoại hai chiều trên Android development build. Camera không được bật trong luồng này." />
    <AppButton label="Quay lại" variant="quiet" onPress={() => navigation.goBack()} /></Screen>;
}

const styles = StyleSheet.create({ title: { ...type.title, color: colors.ink }, error: { ...type.caption, color: colors.danger } });
