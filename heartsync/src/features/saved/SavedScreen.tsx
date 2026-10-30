import { useCallback, useEffect, useState } from 'react';
import { Text } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAppServices } from '../../services/AppServicesProvider';
import { AsyncStatePanel } from '../../shared/components/AsyncStatePanel';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { colors, type } from '../../shared/theme/tokens';
import type { ProfilePublic } from '../../shared/types/domain.types';

type Props = CompositeScreenProps<BottomTabScreenProps<MainTabParamList, 'Saved'>, NativeStackScreenProps<RootStackParamList>>;
export function SavedScreen({ navigation }: Props) {
  const services = useAppServices(); const [profiles, setProfiles] = useState<ProfilePublic[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { if (!services) return; setLoading(true); const result = await services.saved.list(); setLoading(false); if (result.ok) setProfiles(result.data.items); else setError(result.error.message); }, [services]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  if (!services) return <Screen><StatePanel title="Chưa thể tải hồ sơ đã lưu" description="Cấu hình dịch vụ đang thiếu." /></Screen>;
  if (loading) return <Screen><AsyncStatePanel state="loading" title="Đang tải hồ sơ đã lưu" description="Chỉ bạn có thể xem danh sách này." /></Screen>;
  if (error) return <Screen><AsyncStatePanel state="error" title="Không thể tải hồ sơ đã lưu" description={error} actionLabel="Thử lại" onAction={() => void load()} /></Screen>;
  return <Screen><Text accessibilityRole="header" style={{ ...type.title, color: colors.ink }}>Đã lưu</Text>
    {profiles.length === 0 ? <StatePanel title="Chưa có hồ sơ đã lưu" description="Bạn có thể lưu một hồ sơ từ màn Khám phá để xem lại sau." /> : profiles.map((profile) => <StatePanel key={profile.id} title={`${profile.displayName}, ${profile.age}`} description={profile.bio || 'Chưa có giới thiệu.'} actionLabel="Xem hồ sơ" onAction={() => navigation.navigate('OtherProfile', { profileId: profile.id })} />)}
  </Screen>;
}
