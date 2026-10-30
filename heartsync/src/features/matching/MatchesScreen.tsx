import { useCallback, useEffect, useState } from 'react';
import { Text } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../auth/AuthProvider';
import { useAppServices } from '../../services/AppServicesProvider';
import { AsyncStatePanel } from '../../shared/components/AsyncStatePanel';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { colors, type } from '../../shared/theme/tokens';
import type { IncomingCall, MatchSummary } from '../../shared/types/domain.types';

type Props = CompositeScreenProps<BottomTabScreenProps<MainTabParamList, 'Matches'>, NativeStackScreenProps<RootStackParamList>>;
export function MatchesScreen({ navigation }: Props) {
  const services = useAppServices(); const { user } = useAuth();
  const [matches, setMatches] = useState<MatchSummary[]>([]); const [incoming, setIncoming] = useState<IncomingCall>(); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { if (!services) return; setLoading(true); const result = await services.matches.listMatches(); setLoading(false); if (result.ok) setMatches(result.data.items); else setError(result.error.message); }, [services]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  useEffect(() => {
    if (!services || !user) return;
    const subscription = services.calls.subscribeIncoming((call) => { if (call.status === 'ringing' && call.calleeId === user.id) setIncoming(call); }, (nextError) => setError(nextError.message));
    return () => subscription.unsubscribe();
  }, [services, user]);
  if (!services) return <Screen><StatePanel title="Chưa thể tải kết nối" description="Cấu hình dịch vụ đang thiếu." /></Screen>;
  if (loading) return <Screen><AsyncStatePanel state="loading" title="Đang tải kết nối" description="Chỉ mutual like do máy chủ xác nhận mới có ở đây." /></Screen>;
  if (error) return <Screen><AsyncStatePanel state="error" title="Không thể tải kết nối" description={error} actionLabel="Thử lại" onAction={() => void load()} /></Screen>;
  return <Screen><Text accessibilityRole="header" style={{ ...type.title, color: colors.ink }}>Kết nối</Text>
    {incoming ? <StatePanel title="Cuộc gọi thoại đến" description="Người bạn kết nối đang gọi. Mic chỉ được bật sau khi bạn chấp nhận." actionLabel="Mở cuộc gọi" onAction={() => navigation.navigate('AudioCall', { matchId: incoming.matchId, callId: incoming.id, incoming: true })} /> : null}
    {matches.length === 0 ? <StatePanel title="Chưa có match" description="Khi cả hai cùng thích, kết nối sẽ xuất hiện tại đây." /> : matches.map((match) => <StatePanel key={match.id} title={match.otherProfile.displayName} description={match.lastMessagePreview || 'Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện.'} actionLabel="Trò chuyện" onAction={() => navigation.navigate('Chat', { matchId: match.id })} />)}
  </Screen>;
}
