import { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppButton } from '../../shared/components/AppButton';
import { AppIcon } from '../../shared/components/AppIcon';
import { AnimatedPressable } from '../../shared/components/AnimatedPressable';
import { AsyncStatePanel } from '../../shared/components/AsyncStatePanel';
import { Screen } from '../../shared/components/Screen';
import { SelectedChip } from '../../shared/components/SelectedChip';
import { StatePanel } from '../../shared/components/StatePanel';
import { useSnackbar } from '../../shared/components/Snackbar';
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
  const snackbar = useSnackbar();
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
  const handleSignOut = async () => {
    const result = await signOut();
    if (!result.ok) snackbar.show({ message: result.message, tone: 'error' });
  };

  if (!services) return <Screen><StatePanel title="Chưa thể tải hồ sơ" description="Cấu hình dịch vụ đang thiếu." /></Screen>;
  if (state === 'loading') return <Screen><AsyncStatePanel state="loading" title="Đang tải hồ sơ" description="Đang đọc hồ sơ riêng của bạn." /></Screen>;
  if (state === 'error') return <Screen><AsyncStatePanel state="error" title="Không thể tải hồ sơ" description={error} actionLabel="Thử lại" onAction={() => void load()} /></Screen>;

  return <Screen>
    {profile ? <>
      {photoUrls.length ? <View style={styles.gallery}>
        <ScrollView horizontal pagingEnabled onMomentumScrollEnd={onPhotoScroll} showsHorizontalScrollIndicator={false} style={styles.photoPager}>
          {photoUrls.map((uri, index) => <Image key={uri} accessibilityLabel={`Ảnh hồ sơ ${index + 1} của bạn`} source={{ uri }} style={[styles.photo, { width: photoWidth }]} />)}
        </ScrollView>
        {photoUrls.length > 1 ? <View accessible accessibilityLabel={`Ảnh ${activePhoto + 1} trên ${photoUrls.length}`} style={styles.dots}>{photoUrls.map((_, index) => <View key={index} style={[styles.dot, index === activePhoto && styles.dotActive]} />)}</View> : null}
      </View> : <View style={styles.photoPlaceholder}><AppIcon name="photoAdd" color={colors.primaryPressed} size={36} /><Text style={styles.photoPlaceholderText}>Thêm ảnh để hồ sơ dễ được nhận ra hơn.</Text></View>}
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>{profile.displayName}, {profile.age}</Text>
        <View style={styles.metaRow}><AppIcon name="location" color={colors.inkMuted} size={17} /><Text style={styles.meta}>{profile.publicLocation || 'Chưa thêm khu vực công khai'}</Text><Text style={styles.metaDot}>•</Text><Text style={styles.meta}>{profile.photos.length}/6 ảnh</Text></View>
      </View>
      <Text style={styles.bio}>{profile.bio || 'Thêm một phần giới thiệu để người phù hợp dễ bắt đầu cuộc trò chuyện.'}</Text>
      {profile.interests.length ? <View style={styles.chips}>{profile.interests.map((interest) => <SelectedChip key={interest} label={interest} />)}</View> : null}
      <AppButton label="Chỉnh sửa hồ sơ" leadingIcon="more" onPress={() => navigation.navigate('EditProfile')} />
      <View style={styles.settingsGroup}>
        <SettingsRow icon="shield" title="An toàn & quyền riêng tư" description="Xem cách HeartSync bảo vệ dữ liệu của bạn" onPress={() => navigation.navigate('Safety')} />
        <SettingsRow icon="logout" title="Đăng xuất" description="Kết thúc phiên trên thiết bị này" destructive onPress={() => void handleSignOut()} />
      </View>
    </> : <>
      <StatePanel title="Hoàn thiện hồ sơ của bạn" description="Thêm thông tin cơ bản để xuất hiện trong Khám phá. Ngày sinh và tọa độ luôn là dữ liệu riêng tư." />
      <AppButton label="Tạo hồ sơ" leadingIcon="add" onPress={() => navigation.navigate('EditProfile')} />
    </>}
  </Screen>;
}

function SettingsRow({ icon, title, description, destructive = false, onPress }: { icon: 'shield' | 'logout'; title: string; description: string; destructive?: boolean; onPress: () => void }) {
  const color = destructive ? colors.danger : colors.primaryPressed;
  return <AnimatedPressable accessibilityRole="button" accessibilityLabel={title} accessibilityHint={description} onPress={onPress} style={styles.settingsRow}>
    <View style={[styles.settingsIcon, { backgroundColor: destructive ? '#FDEBED' : colors.primarySoft }]}><AppIcon name={icon} color={color} size={21} /></View>
    <View style={styles.settingsCopy}><Text style={[styles.settingsTitle, destructive && { color }]}>{title}</Text><Text style={styles.settingsDescription}>{description}</Text></View>
    <AppIcon name="forward" color={destructive ? colors.danger : colors.inkMuted} size={22} />
  </AnimatedPressable>;
}

const styles = StyleSheet.create({
  gallery: { gap: spacing.sm }, photoPager: { borderRadius: radii.lg, backgroundColor: colors.surfaceMuted }, photo: { aspectRatio: 0.86, borderRadius: radii.lg, backgroundColor: colors.surfaceMuted },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xxs }, dot: { width: 6, height: 6, borderRadius: radii.pill, backgroundColor: colors.border }, dotActive: { width: 18, backgroundColor: colors.primary },
  photoPlaceholder: { minHeight: 238, borderRadius: radii.lg, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
  photoPlaceholderText: { ...type.body, color: colors.primaryPressed, textAlign: 'center' }, heading: { gap: spacing.xxs }, title: { ...type.title, color: colors.ink }, metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, flexWrap: 'wrap' }, meta: { ...type.body, color: colors.inkMuted }, metaDot: { ...type.caption, color: colors.inkMuted },
  bio: { ...type.body, color: colors.ink }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  settingsGroup: { borderTopWidth: 1, borderTopColor: colors.border }, settingsRow: { minHeight: 80, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  settingsIcon: { width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' }, settingsCopy: { flex: 1, gap: spacing.xxs }, settingsTitle: { ...type.label, color: colors.ink }, settingsDescription: { ...type.caption, color: colors.inkMuted },
});
