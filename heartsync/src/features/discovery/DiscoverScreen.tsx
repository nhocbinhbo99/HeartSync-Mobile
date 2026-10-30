import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAppServices } from '../../services/AppServicesProvider';
import { AppButton } from '../../shared/components/AppButton';
import { AsyncStatePanel } from '../../shared/components/AsyncStatePanel';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { colors, type } from '../../shared/theme/tokens';
import type { ProfilePublic } from '../../shared/types/domain.types';

type Props = CompositeScreenProps<BottomTabScreenProps<MainTabParamList, 'Discover'>, NativeStackScreenProps<RootStackParamList>>;
export function DiscoverScreen({ navigation }: Props) {
  const services = useAppServices();
  const [candidates, setCandidates] = useState<ProfilePublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!services) return;
    setLoading(true); setError('');
    const preferences = await services.preferences.get();
    if (!preferences.ok) { setError(preferences.error.message); setLoading(false); return; }
    const result = await services.discovery.getCandidates(preferences.data);
    setLoading(false);
    if (result.ok) setCandidates(result.data.items); else setError(result.error.message);
  }, [services]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  const swipe = async (action: 'like' | 'pass') => {
    if (!services || !candidates[0]) return;
    setBusy(true); const current = candidates[0]; const result = await services.matches.recordSwipe(current.id, action); setBusy(false);
    if (!result.ok) { setError(result.error.message); return; }
    setCandidates((items) => items.slice(1));
    if (result.data.outcome === 'matched' && result.data.matchId) navigation.navigate('MatchFound', { matchId: result.data.matchId });
  };
  if (!services) return <Screen><StatePanel title="Chưa thể tải Khám phá" description="Cấu hình dịch vụ đang thiếu." /></Screen>;
  if (loading) return <Screen><AsyncStatePanel state="loading" title="Đang tìm hồ sơ phù hợp" description="Chỉ dữ liệu công khai đủ điều kiện được tải." /></Screen>;
  if (error) return <Screen><AsyncStatePanel state="error" title="Không thể tải Khám phá" description={error} actionLabel="Thử lại" onAction={() => void load()} /><AppButton label="Mở bộ lọc" variant="secondary" onPress={() => navigation.navigate('Filters')} /></Screen>;
  const candidate = candidates[0];
  if (!candidate) return <Screen><Text accessibilityRole="header" style={styles.title}>Khám phá</Text><StatePanel title="Chưa có gợi ý mới" description="Hãy chỉnh bộ lọc hoặc quay lại sau khi có hồ sơ đủ điều kiện." /><AppButton label="Mở bộ lọc" onPress={() => navigation.navigate('Filters')} /></Screen>;
  return <Screen>
    <Text accessibilityRole="header" style={styles.title}>Khám phá</Text>
    <StatePanel title={`${candidate.displayName}, ${candidate.age}`} description={[candidate.bio, candidate.occupation, candidate.education, candidate.publicLocation, candidate.interests.join(', '), candidate.languages.join(', ')].filter(Boolean).join('\n') || 'Hồ sơ này chưa thêm phần giới thiệu.'} />
    <AppButton label="Xem hồ sơ" variant="secondary" onPress={() => navigation.navigate('OtherProfile', { profileId: candidate.id })} />
    <AppButton label="Thích" disabled={busy} onPress={() => void swipe('like')} />
    <AppButton label="Bỏ qua" variant="secondary" disabled={busy} onPress={() => void swipe('pass')} />
    <AppButton label="Mở bộ lọc" variant="quiet" onPress={() => navigation.navigate('Filters')} />
  </Screen>;
}
const styles = StyleSheet.create({ title: { ...type.title, color: colors.ink } });
