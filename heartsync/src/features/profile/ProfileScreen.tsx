import { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppButton } from '../../shared/components/AppButton';
import { AppIcon } from '../../shared/components/AppIcon';
import { AppText } from '../../shared/components/AppText';
import { Avatar } from '../../shared/components/Avatar';
import { AsyncStatePanel } from '../../shared/components/AsyncStatePanel';
import { IconButton } from '../../shared/components/IconButton';
import { Screen } from '../../shared/components/Screen';
import { SelectedChip } from '../../shared/components/SelectedChip';
import { StatePanel } from '../../shared/components/StatePanel';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { useAppServices } from '../../services/AppServicesProvider';
import type { AsyncViewState } from '../../shared/types/ui';
import type { ProfilePublic } from '../../shared/types/domain.types';
import { colors, radii, spacing } from '../../shared/theme/tokens';

type Props = CompositeScreenProps<BottomTabScreenProps<MainTabParamList, 'Profile'>, NativeStackScreenProps<RootStackParamList>>;

export function ProfileScreen({ navigation }: Props) {
  const services = useAppServices();
  const [profile, setProfile] = useState<ProfilePublic>();
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [activePhoto, setActivePhoto] = useState(0);
  const [state, setState] = useState<AsyncViewState>('loading');
  const [error, setError] = useState('');
  const { width } = useWindowDimensions();
  const photoWidth = Math.max(0, width - spacing.lg * 2);

  const load = useCallback(async () => {
    if (!services) return;
    setState('loading'); setError('');
    const result = await services.profile.getMine();
    if (!result.ok) {
      if (result.error.code === 'not_found') { setProfile(undefined); setState('empty'); return; }
      setError(result.error.message); setState('error'); return;
    }
    setProfile(result.data.public);
    const urls = await Promise.all(result.data.public.photos
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(async (photo) => { const signed = await services.profile.createPhotoUrl(photo.storagePath); return signed.ok ? signed.data : undefined; }));
    setPhotoUrls(urls.filter((url): url is string => Boolean(url)));
    setState('empty');
  }, [services]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const onPhotoScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const width = event.nativeEvent.layoutMeasurement.width;
    if (width) setActivePhoto(Math.round(event.nativeEvent.contentOffset.x / width));
  };
  const header = <View style={styles.topBar}>
    <AppText accessibilityRole="header" variant="heading">Trang cá nhân</AppText>
    <IconButton icon="settings" label="Mở cài đặt" tone="primary" onPress={() => navigation.navigate('Settings')} style={styles.settingsButton} />
  </View>;

  if (!services) return <Screen safeTop>{header}<StatePanel title="Chưa thể tải hồ sơ" description="Cấu hình dịch vụ đang thiếu." /></Screen>;
  if (state === 'loading') return <Screen safeTop>{header}<AsyncStatePanel state="loading" title="Đang tải hồ sơ" description="Đang đọc hồ sơ riêng của bạn." /></Screen>;
  if (state === 'error') return <Screen safeTop>{header}<AsyncStatePanel state="error" title="Không thể tải hồ sơ" description={error} actionLabel="Thử lại" onAction={() => void load()} /></Screen>;

  return <Screen safeTop>
    {header}
    {profile ? <>
      {photoUrls.length ? <View style={styles.gallery}>
        <ScrollView horizontal pagingEnabled onMomentumScrollEnd={onPhotoScroll} showsHorizontalScrollIndicator={false} style={styles.photoPager}>
          {photoUrls.map((uri, index) => <Image key={uri} accessibilityLabel={`Ảnh hồ sơ ${index + 1} của bạn`} source={{ uri }} style={[styles.photo, { width: photoWidth }]} />)}
        </ScrollView>
        {photoUrls.length > 1 ? <View accessible accessibilityLabel={`Ảnh ${activePhoto + 1} trên ${photoUrls.length}`} style={styles.dots}>{photoUrls.map((_, index) => <View key={index} style={[styles.dot, index === activePhoto && styles.dotActive]} />)}</View> : null}
      </View> : <View style={styles.photoPlaceholder}>
        <Avatar label={profile.displayName} size={64} />
        <AppText variant="subtitle">Chưa có ảnh hồ sơ</AppText>
        <AppText variant="caption" tone="muted" style={styles.photoPlaceholderText}>Thêm ảnh để hồ sơ dễ được nhận ra hơn.</AppText>
      </View>}
      <View style={styles.heading}>
        <AppText accessibilityRole="header" variant="title">{profile.displayName}, {profile.age}</AppText>
        <View style={styles.metaRow}><AppIcon name="location" color={colors.inkMuted} size={17} /><AppText tone="muted" style={styles.meta}>{profile.publicLocation || 'Chưa thêm khu vực công khai'}</AppText><AppText variant="caption" tone="muted">•</AppText><AppText tone="muted" style={styles.meta}>{profile.photos.length}/6 ảnh</AppText></View>
      </View>
      <AppText style={styles.bio}>{profile.bio || 'Thêm một phần giới thiệu để người phù hợp dễ bắt đầu cuộc trò chuyện.'}</AppText>
      {profile.interests.length ? <View style={styles.chips}>{profile.interests.map((interest) => <SelectedChip key={interest} label={interest} />)}</View> : null}
      <AppButton label="Chỉnh sửa hồ sơ" onPress={() => navigation.navigate('EditProfile')} />
      <AppButton label="Sở thích của bạn" variant="secondary" leadingIcon="heart" onPress={() => navigation.navigate('Interests')} />
    </> : <>
      <StatePanel title="Hoàn thiện hồ sơ của bạn" description="Thêm thông tin cơ bản để xuất hiện trong Khám phá. Ngày sinh và tọa độ luôn là dữ liệu riêng tư." />
      <AppButton label="Tạo hồ sơ" leadingIcon="add" onPress={() => navigation.navigate('EditProfile')} />
    </>}
  </Screen>;
}

const styles = StyleSheet.create({
  topBar: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingsButton: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  gallery: { gap: spacing.sm }, photoPager: { borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted }, photo: { aspectRatio: 0.86, borderRadius: radii.lg, backgroundColor: colors.surfaceMuted },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xxs }, dot: { width: 6, height: 6, borderRadius: radii.pill, backgroundColor: colors.border }, dotActive: { width: 18, backgroundColor: colors.primary },
  photoPlaceholder: { minHeight: 238, borderRadius: radii.lg, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
  photoPlaceholderText: { textAlign: 'center' }, heading: { gap: spacing.xxs }, metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, flexWrap: 'wrap' }, meta: { flexShrink: 1 },
  bio: { flexShrink: 1 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
