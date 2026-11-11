import { useCallback, useRef, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppButton } from '../../shared/components/AppButton';
import { AppIcon, type AppIconName } from '../../shared/components/AppIcon';
import { AppText } from '../../shared/components/AppText';
import { AnimatedPressable } from '../../shared/components/AnimatedPressable';
import { AsyncStatePanel } from '../../shared/components/AsyncStatePanel';
import { IconButton } from '../../shared/components/IconButton';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { useAppServices } from '../../services/AppServicesProvider';
import { getCachedPhotoUrl, resolvePhotoUrls } from '../../services/photoCache';
import type { AsyncViewState } from '../../shared/types/ui';
import type { ProfilePublic } from '../../shared/types/domain.types';
import { colors, fonts, radii, spacing } from '../../shared/theme/tokens';
import {
  brandAssets,
  formatNaturalBio,
  getFallbackAvatar,
  getProfileImageSource,
} from '../../shared/utils/avatarHelper';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Profile'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function ProfileScreen({ navigation }: Props) {
  const services = useAppServices();
  const [profile, setProfile] = useState<ProfilePublic>();
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [activePhoto, setActivePhoto] = useState(0);
  const [state, setState] = useState<AsyncViewState>('loading');
  const [error, setError] = useState('');
  const { width } = useWindowDimensions();
  const photoWidth = Math.max(0, width - spacing.lg * 2);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async (silent = false) => {
    if (!services) return;
    if (!hasLoadedRef.current && !silent) setState('loading');
    if (!silent) setError('');
    const result = await services.profile.getMine();
    if (!result.ok) {
      if (result.error.code === 'not_found') {
        setProfile(undefined);
        hasLoadedRef.current = true;
        setState('empty');
        return;
      }
      if (!hasLoadedRef.current) {
        setError(result.error.message);
        setState('error');
      }
      return;
    }
    const sortedPhotos = [...result.data.public.photos].sort((a, b) => a.sortOrder - b.sortOrder);
    const paths = sortedPhotos.map((p) => p.storagePath);
    const urlMap = await resolvePhotoUrls(services.profile, paths);
    const urls = paths.map((path) => urlMap[path] ?? getCachedPhotoUrl(path)).filter((url): url is string => Boolean(url));
    hasLoadedRef.current = true;
    setProfile(result.data.public);
    setPhotoUrls(urls);
    setState('empty');
  }, [services]);

  useFocusEffect(
    useCallback(() => {
      void load(hasLoadedRef.current);
    }, [load]),
  );

  const onPhotoScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const w = event.nativeEvent.layoutMeasurement.width;
    if (w) setActivePhoto(Math.round(event.nativeEvent.contentOffset.x / w));
  };

  const header = (
    <View style={styles.topBar}>
      <AppText accessibilityRole="header" style={styles.pageTitle}>
        Hồ sơ
      </AppText>
      <IconButton
        icon="settings"
        label="Mở cài đặt"
        tone="default"
        onPress={() => navigation.navigate('Settings')}
        style={styles.settingsButton}
      />
    </View>
  );

  if (!services) {
    return (
      <Screen safeTop>
        {header}
        <StatePanel title="Chưa thể tải hồ sơ" description="Cấu hình dịch vụ đang thiếu." />
      </Screen>
    );
  }
  if (state === 'loading') {
    return (
      <Screen safeTop>
        {header}
        <AsyncStatePanel
          state="loading"
          title="Đang tải hồ sơ"
          description="Đang đọc thông tin hồ sơ của bạn."
        />
      </Screen>
    );
  }
  if (state === 'error') {
    return (
      <Screen safeTop>
        {header}
        <AsyncStatePanel
          state="error"
          title="Không thể tải hồ sơ"
          description={error}
          actionLabel="Thử lại"
          onAction={() => void load()}
        />
      </Screen>
    );
  }

  const avatarSource = getProfileImageSource(photoUrls[0], profile?.id ?? 'me', profile?.gender, profile?.displayName);

  return (
    <Screen safeTop contentStyle={styles.screen}>
      {header}
      {profile ? (
        <>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={`Hồ sơ của ${profile.displayName}`}
            onPress={() => navigation.navigate('EditProfile')}
            style={styles.profileHeaderRow}
          >
            <View style={styles.avatarWrap}>
              <Image
                accessibilityLabel={`Ảnh đại diện của ${profile.displayName}`}
                source={avatarSource}
                fadeDuration={0}
                style={styles.avatarImage}
              />
              <View style={styles.onlineDot} />
            </View>
            <View style={styles.profileHeaderCopy}>
              <View style={styles.nameBadgeRow}>
                <AppText accessibilityRole="header" numberOfLines={1} style={styles.profileName}>
                  {profile.displayName}, {profile.age}
                </AppText>
                <View style={styles.verifiedBadge}>
                  <AppIcon name="check" color="#FFFFFF" size={11} />
                </View>
              </View>
              <AppText tone="muted" style={styles.viewProfileHint}>
                {profile.publicLocation ? `${profile.publicLocation} · Xem hồ sơ của bạn` : 'Xem hồ sơ của bạn'}
              </AppText>
            </View>
          </AnimatedPressable>

          {photoUrls.length > 0 ? (
            <View style={styles.gallery}>
              <ScrollView
                horizontal
                pagingEnabled
                onMomentumScrollEnd={onPhotoScroll}
                showsHorizontalScrollIndicator={false}
                style={styles.photoPager}
              >
                {photoUrls.map((uri, index) => (
                  <Image
                    key={uri}
                    accessibilityLabel={`Ảnh hồ sơ ${index + 1} của bạn`}
                    source={{ uri }}
                    style={[styles.photo, { width: photoWidth }]}
                  />
                ))}
              </ScrollView>
              <Image source={brandAssets.cardScrimGradient} style={styles.scrimImage} resizeMode="stretch" />
              <View style={styles.heroScrim}>
                <View style={styles.metaRow}>
                  <AppIcon name="location" color={colors.onPrimary} size={14} />
                  <AppText tone="onPrimary" style={styles.meta}>
                    {profile.publicLocation || 'Chưa thêm khu vực'}
                  </AppText>
                  <AppText variant="caption" tone="onPrimary">
                    •
                  </AppText>
                  <AppText tone="onPrimary" style={styles.meta}>
                    {profile.photos.length}/6 ảnh
                  </AppText>
                </View>
              </View>
              {photoUrls.length > 1 ? (
                <View
                  accessible
                  accessibilityLabel={`Ảnh ${activePhoto + 1} trên ${photoUrls.length}`}
                  style={styles.dots}
                >
                  {photoUrls.map((_, index) => (
                    <View key={index} style={[styles.dot, index === activePhoto && styles.dotActive]} />
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.infoCard}>
            <AppText style={styles.bio}>
              {formatNaturalBio(profile.bio, profile.displayName)}
            </AppText>

            {profile.interests.length > 0 ? (
              <View style={styles.chipsWrap}>
                {profile.interests.map((interest) => (
                  <View key={interest} style={styles.interestPill}>
                    <AppText style={styles.interestPillText}>{interest}</AppText>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.menuList}>
            <ProfileMenuRow
              icon="edit"
              title="Chỉnh sửa hồ sơ"
              onPress={() => navigation.navigate('EditProfile')}
            />
            <ProfileMenuRow
              icon="heart"
              title="Sở thích của bạn"
              onPress={() => navigation.navigate('Interests')}
            />
            <ProfileMenuRow
              icon="filter"
              title="Tiêu chí tìm kiếm"
              onPress={() => navigation.navigate('Filters')}
            />
            <ProfileMenuRow
              icon="lock"
              title="Tài khoản & bảo mật"
              onPress={() => navigation.navigate('Settings')}
            />
            <ProfileMenuRow
              icon="shield"
              title="Trung tâm an toàn"
              onPress={() => navigation.navigate('Safety')}
            />
            <ProfileMenuRow
              icon="settings"
              title="Cài đặt & Tài khoản"
              onPress={() => navigation.navigate('Settings')}
              isLast
            />
          </View>
        </>
      ) : (
        <View style={styles.emptyCard}>
          <Image
            accessibilityLabel="Ảnh đại diện mặc định"
            source={getFallbackAvatar('me')}
            style={styles.emptyAvatar}
          />
          <StatePanel
            title="Hoàn thiện hồ sơ của bạn"
            description="Thêm tên, giới thiệu và sở thích để kết nối với những người phù hợp trên HeartSync."
          />
          <AppButton label="Tạo hồ sơ ngay" leadingIcon="add" onPress={() => navigation.navigate('EditProfile')} />
        </View>
      )}
    </Screen>
  );
}

function ProfileMenuRow({
  icon,
  title,
  onPress,
  isLast = false,
}: {
  icon: AppIconName;
  title: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={[styles.menuRow, isLast && styles.menuRowLast]}
    >
      <View style={styles.menuIconWrap}>
        <AppIcon name={icon} color={colors.ink} size={20} />
      </View>
      <View style={styles.menuCopy}>
        <AppText style={styles.menuTitle}>{title}</AppText>
      </View>
      <AppIcon name="chevronRight" color={colors.inkMuted} size={20} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.xs, paddingBottom: spacing.xl, gap: spacing.md },
  topBar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, color: colors.ink },
  settingsButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  avatarWrap: {
    position: 'relative',
    width: 72,
    height: 72,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceMuted,
  },
  onlineDot: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: colors.online,
    borderWidth: 2.5,
    borderColor: colors.background,
  },
  profileHeaderCopy: {
    flex: 1,
    gap: 3,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileName: {
    flexShrink: 1,
    fontFamily: fonts.extrabold,
    fontSize: 22,
    lineHeight: 28,
    color: colors.ink,
  },
  verifiedBadge: {
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: colors.verified,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewProfileHint: {
    fontSize: 14,
    lineHeight: 19,
  },
  gallery: {
    borderRadius: 24,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
    position: 'relative',
  },
  photoPager: { backgroundColor: colors.surfaceMuted },
  photo: { aspectRatio: 1.25, resizeMode: 'cover', backgroundColor: colors.surfaceMuted },
  scrimImage: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: '45%',
    width: '100%',
  },
  heroScrim: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dots: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  dot: { width: 6, height: 6, borderRadius: radii.pill, backgroundColor: 'rgba(255,255,255,0.55)' },
  dotActive: { width: 18, backgroundColor: colors.primary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, flexWrap: 'wrap' },
  meta: { flexShrink: 1, fontSize: 13, lineHeight: 18, opacity: 0.94 },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  bio: { fontSize: 14, lineHeight: 21, color: colors.ink },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 2 },
  interestPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  interestPillText: { fontFamily: fonts.bold, fontSize: 12, color: colors.primaryPressed },
  menuList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(243, 214, 226, 0.55)',
  },
  menuRowLast: { borderBottomWidth: 0 },
  menuIconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCopy: { flex: 1 },
  menuTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  emptyCard: { gap: spacing.md, alignItems: 'center' },
  emptyAvatar: { width: 92, height: 92, borderRadius: 46 },
});
