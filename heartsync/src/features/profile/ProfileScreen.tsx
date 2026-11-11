import { useCallback, useState } from 'react';
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
import type { AsyncViewState } from '../../shared/types/ui';
import type { ProfilePublic } from '../../shared/types/domain.types';
import { colors, fonts, radii, spacing } from '../../shared/theme/tokens';
import { getFallbackAvatar } from '../../shared/utils/avatarHelper';

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

  const load = useCallback(async () => {
    if (!services) return;
    setState('loading');
    setError('');
    const result = await services.profile.getMine();
    if (!result.ok) {
      if (result.error.code === 'not_found') {
        setProfile(undefined);
        setState('empty');
        return;
      }
      setError(result.error.message);
      setState('error');
      return;
    }
    setProfile(result.data.public);
    const urls = await Promise.all(
      result.data.public.photos
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(async (photo) => {
          const signed = await services.profile.createPhotoUrl(photo.storagePath);
          return signed.ok ? signed.data : undefined;
        }),
    );
    setPhotoUrls(urls.filter((url): url is string => Boolean(url)));
    setState('empty');
  }, [services]);

  useFocusEffect(
    useCallback(() => {
      void load();
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
        tone="primary"
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

  return (
    <Screen safeTop contentStyle={styles.screen}>
      {header}
      {profile ? (
        <>
          <View style={styles.gallery}>
            {photoUrls.length ? (
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
            ) : (
              <Image
                accessibilityLabel={`Ảnh đại diện của ${profile.displayName}`}
                source={getFallbackAvatar(profile.id, profile.gender)}
                style={[styles.photo, { width: photoWidth }]}
              />
            )}
            <View style={styles.heroScrim}>
              <View style={styles.heroNameRow}>
                <AppText accessibilityRole="header" style={styles.heroName}>
                  {profile.displayName}, {profile.age}
                </AppText>
                <View style={styles.verifiedBadge}>
                  <AppIcon name="check" color="#FFFFFF" size={13} />
                </View>
              </View>
              <View style={styles.metaRow}>
                <AppIcon name="location" color={colors.onPrimary} size={15} />
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

          <AppButton
            label="Chỉnh sửa hồ sơ"
            leadingIcon="photoAdd"
            onPress={() => navigation.navigate('EditProfile')}
          />

          <View style={styles.infoCard}>
            <AppText variant="label" tone="muted" style={styles.sectionEyeline}>
              GIỚI THIỆU BẢN THÂN
            </AppText>
            <AppText style={styles.bio}>
              {profile.bio || 'Thêm đôi dòng giới thiệu để mọi người hiểu hơn về bạn nhé.'}
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

          <View style={styles.menuCard}>
            <ProfileMenuRow
              icon="heart"
              title="Sở thích của bạn"
              subtitle="Chọn các chủ đề giúp ghép đôi chuẩn hơn"
              onPress={() => navigation.navigate('Interests')}
            />
            <ProfileMenuRow
              icon="filter"
              title="Tiêu chí tìm kiếm"
              subtitle="Tuổi, giới tính và ngôn ngữ ưu tiên"
              onPress={() => navigation.navigate('Filters')}
            />
            <ProfileMenuRow
              icon="shield"
              title="Trung tâm an toàn & quyền riêng tư"
              subtitle="Kiểm soát hiển thị và dữ liệu cá nhân"
              onPress={() => navigation.navigate('Safety')}
            />
            <ProfileMenuRow
              icon="settings"
              title="Cài đặt & Tài khoản"
              subtitle="Đăng xuất và tùy chỉnh ứng dụng"
              onPress={() => navigation.navigate('Settings')}
              isLast
            />
          </View>
        </>
      ) : (
        <View style={styles.emptyCard}>
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
  subtitle,
  onPress,
  isLast = false,
}: {
  icon: AppIconName;
  title: string;
  subtitle: string;
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
        <AppIcon name={icon} color={colors.primaryPressed} size={20} />
      </View>
      <View style={styles.menuCopy}>
        <AppText style={styles.menuTitle}>{title}</AppText>
        <AppText variant="caption" tone="muted">
          {subtitle}
        </AppText>
      </View>
      <AppIcon name="forward" color={colors.inkMuted} size={18} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.xs, paddingBottom: spacing.xl, gap: spacing.md },
  topBar: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, color: colors.ink },
  settingsButton: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  gallery: {
    borderRadius: 26,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 4,
  },
  photoPager: { backgroundColor: colors.surfaceMuted },
  photo: { aspectRatio: 1.15, resizeMode: 'cover', backgroundColor: colors.surfaceMuted },
  heroScrim: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    gap: 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(32, 12, 24, 0.72)',
  },
  heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  heroName: { fontFamily: fonts.extrabold, fontSize: 24, lineHeight: 30, color: colors.onPrimary },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
  meta: { flexShrink: 1, fontSize: 13, lineHeight: 18, opacity: 0.9 },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionEyeline: { fontSize: 11, letterSpacing: 0.6 },
  bio: { fontSize: 15, lineHeight: 22, color: colors.ink },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xxs },
  interestPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  interestPillText: { fontFamily: fonts.bold, fontSize: 13, color: colors.primaryPressed },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuRowLast: { borderBottomWidth: 0 },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCopy: { flex: 1, gap: 1 },
  menuTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  emptyCard: { gap: spacing.md },
});
