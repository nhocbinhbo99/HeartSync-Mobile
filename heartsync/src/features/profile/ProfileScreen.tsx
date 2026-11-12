import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppButton } from '../../shared/components/AppButton';
import { CachedImage } from '../../shared/components/CachedImage';
import { AppIcon } from '../../shared/components/AppIcon';
import { AppText } from '../../shared/components/AppText';
import { Avatar } from '../../shared/components/Avatar';
import { AsyncStatePanel } from '../../shared/components/AsyncStatePanel';
import { IconButton } from '../../shared/components/IconButton';
import { Screen } from '../../shared/components/Screen';
import { SkeletonBlock } from '../../shared/components/SkeletonBlock';
import { StatePanel } from '../../shared/components/StatePanel';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { useAppServices } from '../../services/AppServicesProvider';
import type { AsyncViewState } from '../../shared/types/ui';
import type { ProfilePublic } from '../../shared/types/domain.types';
import { colors, radii, spacing } from '../../shared/theme/tokens';

type Props = CompositeScreenProps<BottomTabScreenProps<MainTabParamList, 'Profile'>, NativeStackScreenProps<RootStackParamList>>;
type ResolvedPhoto = { storagePath: string; url: string };

export function ProfileScreen({ navigation }: Props) {
  const services = useAppServices();
  const [profile, setProfile] = useState<ProfilePublic>();
  const [photoUrls, setPhotoUrls] = useState<ResolvedPhoto[]>([]);
  const [activePhoto, setActivePhoto] = useState(0);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [state, setState] = useState<AsyncViewState>('loading');
  const [error, setError] = useState('');
  const loadedRef = useRef(false);
  const requestRef = useRef(0);
  const { width } = useWindowDimensions();
  const photoWidth = Math.max(0, width - spacing.lg * 2);

  const load = useCallback(async () => {
    if (!services) return;
    const request = ++requestRef.current;
    if (!loadedRef.current) setState('loading');
    setError('');
    const result = await services.profile.getMine();
    if (request !== requestRef.current) return;
    if (!result.ok) {
      if (result.error.code === 'not_found') { setProfile(undefined); loadedRef.current = true; setState('empty'); return; }
      if (!loadedRef.current) { setError(result.error.message); setState('error'); }
      return;
    }
    setProfile(result.data.public);
    loadedRef.current = true;
    setState('empty');
    const orderedPhotos = [...result.data.public.photos].sort((a, b) => a.sortOrder - b.sortOrder);
    setPhotoUrls((current) => orderedPhotos.flatMap((photo) => {
      const loaded = current.find((item) => item.storagePath === photo.storagePath);
      return loaded ? [loaded] : [];
    }));
    setActivePhoto(0);
    if (orderedPhotos.length === 0) {
      setPhotoUrls([]);
      setPhotoLoading(false);
      return;
    }
    setPhotoLoading(true);
    const urls = await Promise.all(orderedPhotos
      .map(async (photo) => {
        const signed = await services.profile.createPhotoUrl(photo.storagePath);
        return signed.ok ? { storagePath: photo.storagePath, url: signed.data } : undefined;
      }));
    if (request !== requestRef.current) return;
    setPhotoUrls(urls.filter((photo): photo is ResolvedPhoto => Boolean(photo)));
    setPhotoLoading(false);
  }, [services]);

  useFocusEffect(useCallback(() => {
    void load();
    return () => { requestRef.current += 1; };
  }, [load]));
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

  return <Screen safeTop contentStyle={styles.screen}>
    {header}
    {profile ? <>
      {photoUrls.length ? <View style={styles.gallery}>
        <ScrollView horizontal pagingEnabled onMomentumScrollEnd={onPhotoScroll} showsHorizontalScrollIndicator={false} style={styles.photoPager}>
          {photoUrls.map((photo, index) => <CachedImage key={photo.storagePath} accessibilityLabel={`Ảnh hồ sơ ${index + 1} của bạn`} source={{ uri: photo.url, cacheKey: photo.storagePath }} recyclingKey={photo.storagePath} style={[styles.photo, { width: photoWidth }]} />)}
        </ScrollView>
        <View style={styles.heroScrim}>
          <AppText accessibilityRole="header" style={styles.heroName}>{profile.displayName}, {profile.age}</AppText>
          <View style={styles.metaRow}><AppIcon name="location" color={colors.onPrimary} size={17} /><AppText tone="onPrimary" style={styles.meta}>{profile.publicLocation || 'Chưa thêm khu vực công khai'}</AppText><AppText variant="caption" tone="onPrimary">•</AppText><AppText tone="onPrimary" style={styles.meta}>{profile.photos.length}/6 ảnh</AppText></View>
        </View>
        {photoUrls.length > 1 ? <View accessible accessibilityLabel={`Ảnh ${activePhoto + 1} trên ${photoUrls.length}`} style={styles.dots}>{photoUrls.map((_, index) => <View key={index} style={[styles.dot, index === activePhoto && styles.dotActive]} />)}</View> : null}
      </View> : profile.photos.length > 0 && photoLoading ? <SkeletonBlock height={photoWidth / 1.34} radius={24} accessibilityLabel="Đang tải ảnh hồ sơ" /> : <View style={styles.photoPlaceholder}>
        <Avatar label={profile.displayName} size={64} />
        <AppText variant="subtitle">Chưa có ảnh hồ sơ</AppText>
        <AppText variant="caption" tone="muted" style={styles.photoPlaceholderText}>Thêm ảnh để hồ sơ dễ được nhận ra hơn.</AppText>
      </View>}
      <AppButton label="Chỉnh sửa hồ sơ" variant="secondary" onPress={() => navigation.navigate('EditProfile')} style={styles.profileEdit} />
      <View style={styles.profileSection}>
        <AppText variant="caption" tone="muted" style={styles.sectionEyeline}>HỒ SƠ CỦA BẠN</AppText>
        <AppText accessibilityRole="header" variant="heading">Một chút về mình</AppText>
        <AppText style={styles.bio}>{profile.bio || 'Thêm một phần giới thiệu để người phù hợp dễ bắt đầu cuộc trò chuyện.'}</AppText>
      </View>
      <View style={styles.interestsSection}>
        <AppText accessibilityRole="header" variant="title">Sở thích</AppText>
        <AppText style={styles.interestLine}>{profile.interests.length ? profile.interests.join('  ·  ') : 'Thêm sở thích để gợi ý người hợp với bạn.'}</AppText>
        <AppText variant="caption" tone="muted">Thông tin riêng tư chỉ hiển thị cho bạn.</AppText>
        <AppButton label="Quản lý sở thích" variant="quiet" leadingIcon="heart" onPress={() => navigation.navigate('Interests')} style={styles.manageInterests} />
      </View>
    </> : <>
      <StatePanel title="Hoàn thiện hồ sơ của bạn" description="Thêm thông tin cơ bản để xuất hiện trong Khám phá. Ngày sinh và tọa độ luôn là dữ liệu riêng tư." />
      <AppButton label="Tạo hồ sơ" leadingIcon="add" onPress={() => navigation.navigate('EditProfile')} />
    </>}
  </Screen>;
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.sm, gap: spacing.lg },
  topBar: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingsButton: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  gallery: { borderRadius: 24, backgroundColor: colors.surfaceMuted, overflow: 'hidden', position: 'relative' }, photoPager: { backgroundColor: colors.surfaceMuted }, photo: { aspectRatio: 1.34, backgroundColor: colors.surfaceMuted },
  heroScrim: { position: 'absolute', right: 0, bottom: 0, left: 0, minHeight: 104, justifyContent: 'center', gap: spacing.xxs, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: 'rgba(34, 18, 29, 0.90)' },
  heroName: { fontSize: 29, lineHeight: 35, fontWeight: '700', color: colors.onPrimary },
  dots: { position: 'absolute', right: spacing.md, top: spacing.md, flexDirection: 'row', justifyContent: 'center', gap: spacing.xxs }, dot: { width: 6, height: 6, borderRadius: radii.pill, backgroundColor: 'rgba(255,255,255,0.55)' }, dotActive: { width: 18, backgroundColor: colors.primary },
  photoPlaceholder: { minHeight: 238, borderRadius: radii.lg, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
  photoPlaceholderText: { textAlign: 'center' }, metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, flexWrap: 'wrap' }, meta: { flexShrink: 1, fontSize: 15, lineHeight: 20 },
  profileEdit: { minHeight: 56, borderColor: colors.border, borderRadius: 18 },
  profileSection: { gap: spacing.sm, paddingTop: spacing.sm },
  sectionEyeline: { letterSpacing: 0.5, fontWeight: '700' },
  bio: { flexShrink: 1, fontSize: 18, lineHeight: 29, color: colors.inkMuted },
  interestsSection: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.lg, gap: spacing.md },
  interestLine: { color: colors.primaryPressed, fontSize: 18, lineHeight: 26 },
  manageInterests: { alignSelf: 'flex-start', marginLeft: -spacing.md },
});
