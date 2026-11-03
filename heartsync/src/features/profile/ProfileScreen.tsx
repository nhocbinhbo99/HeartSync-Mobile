import { useCallback, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
import { colors, radii, spacing, type } from '../../shared/theme/tokens';

type Props = CompositeScreenProps<BottomTabScreenProps<MainTabParamList, 'Profile'>, NativeStackScreenProps<RootStackParamList>>;

export function ProfileScreen({ navigation }: Props) {
  const { signOut } = useAuth();
  const services = useAppServices();
  const [profile, setProfile] = useState<ProfilePublic>();
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [state, setState] = useState<AsyncViewState>('loading');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!services) return;
    setState('loading');
    setError('');
    const result = await services.profile.getMine();
    if (!result.ok) {
      if (result.error.code === 'not_found') { setProfile(undefined); setState('empty'); return; }
      setError(result.error.message); setState('error'); return;
    }
    setProfile(result.data.public);
    const primary = result.data.public.photos.find((photo) => photo.isPrimary) ?? result.data.public.photos[0];
    if (primary) {
      const url = await services.profile.createPhotoUrl(primary.storagePath);
      setPhotoUrl(url.ok ? url.data : undefined);
    } else setPhotoUrl(undefined);
    setState('empty');
  }, [services]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (!services) return <Screen><StatePanel title="Chưa thể tải hồ sơ" description="Cấu hình dịch vụ đang thiếu." /></Screen>;
  if (state === 'loading') return <Screen><AsyncStatePanel state="loading" title="Đang tải hồ sơ" description="Đang xác minh dữ liệu riêng tư của bạn." /></Screen>;
  if (state === 'error') return <Screen><AsyncStatePanel state="error" title="Không thể tải hồ sơ" description={error}
    actionLabel="Thử lại" onAction={() => void load()} /></Screen>;

  return <Screen>
    {profile ? <>
      {photoUrl ? <Image accessibilityLabel="Ảnh hồ sơ chính của bạn" source={{ uri: photoUrl }} style={styles.photo} />
        : <View style={styles.photoPlaceholder}><Text style={styles.photoLetter}>{profile.displayName.slice(0, 1).toUpperCase()}</Text></View>}
      <View style={styles.heading}><Text accessibilityRole="header" style={styles.title}>{profile.displayName}, {profile.age}</Text>
        <Text style={styles.body}>{profile.publicLocation || 'Chưa thêm khu vực công khai'} · {profile.photos.length}/6 ảnh</Text></View>
      <Text style={styles.bio}>{profile.bio || 'Thêm một phần giới thiệu để hồ sơ của bạn dễ bắt đầu trò chuyện hơn.'}</Text>
      {profile.interests.length ? <Text style={styles.meta}>{profile.interests.join(' · ')}</Text> : null}
    </> : <StatePanel title="Hoàn thiện hồ sơ của bạn" description="Thêm thông tin cơ bản để xuất hiện trong Khám phá. Ngày sinh và tọa độ luôn là dữ liệu riêng tư." />}
    <AppButton label={profile ? 'Chỉnh sửa hồ sơ' : 'Tạo hồ sơ'} onPress={() => navigation.navigate('EditProfile')} />
    <AppButton label="An toàn & quyền riêng tư" variant="secondary" onPress={() => navigation.navigate('Safety')} />
    <AppButton label="Đăng xuất" variant="quiet" onPress={() => void signOut()} />
  </Screen>;
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 1.15, borderRadius: radii.lg, backgroundColor: colors.surfaceMuted },
  photoPlaceholder: { width: '100%', aspectRatio: 1.4, borderRadius: radii.lg, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center' }, photoLetter: { ...type.display, color: colors.primaryPressed },
  heading: { gap: spacing.xxs }, title: { ...type.title, color: colors.ink }, body: { ...type.body, color: colors.inkMuted },
  bio: { ...type.body, color: colors.ink }, meta: { ...type.label, color: colors.primaryPressed },
});
