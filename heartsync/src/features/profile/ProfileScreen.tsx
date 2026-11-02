import { useCallback, useEffect, useState } from 'react';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppButton } from '../../shared/components/AppButton';
import { AsyncStatePanel } from '../../shared/components/AsyncStatePanel';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { useAuth } from '../auth/AuthProvider';
import { useAppServices } from '../../services/AppServicesProvider';
import type { AsyncViewState } from '../../shared/types/ui';
import type { ProfilePublic } from '../../shared/types/domain.types';

type Props = CompositeScreenProps<BottomTabScreenProps<MainTabParamList, 'Profile'>, NativeStackScreenProps<RootStackParamList>>;

export function ProfileScreen({ navigation }: Props) {
  const { signOut } = useAuth();
  const services = useAppServices();
  const [profile, setProfile] = useState<ProfilePublic>();
  const [state, setState] = useState<AsyncViewState>('loading');
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!services) return;
    setState('loading');
    const result = await services.profile.getMine();
    if (result.ok) { setProfile(result.data.public); setState('empty'); return; }
    if (result.error.code === 'not_found') { setProfile(undefined); setState('empty'); return; }
    setError(result.error.message); setState('error');
  }, [services]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  if (!services) return <Screen><StatePanel title="Chưa thể tải hồ sơ" description="Cấu hình dịch vụ đang thiếu." /></Screen>;
  if (state === 'loading') return <Screen><AsyncStatePanel state="loading" title="Đang tải hồ sơ" description="Đang xác minh dữ liệu riêng tư của bạn." /></Screen>;
  if (state === 'error') return <Screen><AsyncStatePanel state="error" title="Không thể tải hồ sơ" description={error} actionLabel="Thử lại" onAction={() => void load()} /></Screen>;
  return <Screen>
    {profile ? <StatePanel title={profile.displayName} description={`${profile.age} tuổi · ${profile.photos.length}/6 ảnh · ${profile.interests.length ? profile.interests.join(', ') : 'Chưa có sở thích'}`} />
      : <StatePanel title="Hoàn thiện hồ sơ của bạn" description="Thêm thông tin cơ bản để xuất hiện trong Khám phá. Ngày sinh và tọa độ luôn là dữ liệu riêng tư." />}
    <AppButton label={profile ? 'Chỉnh sửa hồ sơ' : 'Tạo hồ sơ'} onPress={() => navigation.navigate('EditProfile')} />
    <AppButton label="An toàn & quyền riêng tư" variant="secondary" onPress={() => navigation.navigate('Safety')} />
    <AppButton label="Đăng xuất" variant="quiet" onPress={() => void signOut()} />
  </Screen>;
}
