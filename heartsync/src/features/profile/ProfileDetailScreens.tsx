import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAppServices } from '../../services/AppServicesProvider';
import { getCachedPhotoUrl, getCachedPublicProfile, resolvePhotoUrls } from '../../services/photoCache';
import { claimMatchCelebration } from '../matching/matchCelebrationGuard';
import { AppButton } from '../../shared/components/AppButton';
import { AppIcon, type AppIconName } from '../../shared/components/AppIcon';
import { AppText } from '../../shared/components/AppText';
import { AnimatedPressable } from '../../shared/components/AnimatedPressable';
import { AsyncStatePanel } from '../../shared/components/AsyncStatePanel';
import { IconButton } from '../../shared/components/IconButton';
import { Screen } from '../../shared/components/Screen';
import { SectionHeader } from '../../shared/components/SectionHeader';
import { SelectedChip } from '../../shared/components/SelectedChip';
import { StatePanel } from '../../shared/components/StatePanel';
import { useSnackbar } from '../../shared/components/Snackbar';
import { VerifiedBadge } from '../../shared/components/VerifiedBadge';
import { optionLabel, LANGUAGE_OPTIONS } from '../../shared/domain/profileOptions';
import { colors, fonts, radii, spacing, type } from '../../shared/theme/tokens';
import type { ProfilePublic } from '../../shared/types/domain.types';
import type { RootStackParamList } from '../../navigation/types';
import {
  brandAssets,
  formatNaturalBio,
  formatNaturalOccupation,
  getProfileImageSource,
} from '../../shared/utils/avatarHelper';
import { ProfileEditor } from './ProfileEditor';

export function EditProfileScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'EditProfile'>) {
  return <ProfileEditor mode="edit" onCancel={() => navigation.goBack()} />;
}

export function OtherProfileScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'OtherProfile'>) {
  const services = useAppServices();
  const snackbar = useSnackbar();
  const { width, height } = useWindowDimensions();
  const heroWidth = Math.max(1, width);
  const heroHeight = Math.max(360, Math.round(Math.min(width * 1.18, height * 0.62)));
  const profileId = route.params?.profileId;
  const cachedProfile = getCachedPublicProfile(profileId);
  const [loadedProfile, setLoadedProfile] = useState<{ profileId: string; profile: ProfilePublic }>();
  const [loadedPhotos, setLoadedPhotos] = useState<{ profileId: string; urls: string[] }>();
  const [activePhoto, setActivePhoto] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [liking, setLiking] = useState(false);
  const [error, setError] = useState('');
  const requestRef = useRef(0);

  const profile =
    (loadedProfile && loadedProfile.profileId === profileId ? loadedProfile.profile : undefined) ?? cachedProfile;
  const cachedUrls = profile?.photos.length
    ? [...profile.photos]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((photo) => getCachedPhotoUrl(photo.storagePath))
        .filter((url): url is string => Boolean(url))
    : [];
  const photoUrls =
    loadedPhotos && loadedPhotos.profileId === profileId && loadedPhotos.urls.length > 0
      ? loadedPhotos.urls
      : cachedUrls;

  const load = useCallback(async () => {
    if (!services || !profileId) return;
    const request = ++requestRef.current;
    setError('');
    setActivePhoto(0);
    const [profileResult, savedResult] = await Promise.all([
      services.profile.getPublic(profileId),
      services.saved.isSaved(profileId),
    ]);
    if (request !== requestRef.current) return;
    if (!profileResult.ok) {
      setError(profileResult.error.message);
      return;
    }
    setLoadedProfile({ profileId, profile: profileResult.data });
    if (savedResult.ok) setSaved(savedResult.data);
    const paths = [...profileResult.data.photos]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((photo) => photo.storagePath);
    if (paths.length > 0) {
      const urlMap = await resolvePhotoUrls(services.profile, paths);
      if (request !== requestRef.current) return;
      const urls = paths
        .map((path) => urlMap[path] ?? getCachedPhotoUrl(path))
        .filter((url): url is string => Boolean(url));
      if (urls.length > 0) setLoadedPhotos({ profileId, urls });
    }
  }, [profileId, services]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => {
      clearTimeout(timer);
      requestRef.current += 1;
    };
  }, [load]);

  const toggleSaved = async () => {
    if (!services || !profile || saving) return;
    const previous = saved;
    const next = !previous;
    setSaved(next);
    setSaving(true);
    setError('');
    const result = await services.saved.setSaved(profile.id, next);
    setSaving(false);
    if (!result.ok) {
      setSaved(previous);
      setError(result.error.message);
      snackbar.show({ message: result.error.message, tone: 'error' });
      return;
    }
    snackbar.show({
      message: next ? 'Đã lưu hồ sơ để xem lại sau.' : 'Đã bỏ lưu hồ sơ.',
      tone: 'success',
    });
  };

  const likeProfile = async () => {
    if (!services || !profile || liking) return;
    setLiking(true);
    setError('');
    const result = await services.matches.recordSwipe(profile.id, 'like');
    setLiking(false);
    if (!result.ok) {
      setError(result.error.message);
      snackbar.show({ message: result.error.message, tone: 'error' });
      return;
    }
    if (result.data.outcome === 'matched') {
      if (claimMatchCelebration(result.data.matchId)) {
        navigation.navigate('MatchFound', { matchId: result.data.matchId });
      }
      return;
    }
    snackbar.show({ message: 'Đã thả tim tới người này!', tone: 'success' });
  };

  const onPhotoScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const w = event.nativeEvent.layoutMeasurement.width;
    if (w) setActivePhoto(Math.round(event.nativeEvent.contentOffset.x / w));
  };

  if (!profileId) {
    return (
      <Screen safeTop>
        <StatePanel title="Chưa chọn hồ sơ" description="Hãy chọn một hồ sơ từ Khám phá hoặc Đã lưu." />
      </Screen>
    );
  }
  if (!services) {
    return (
      <Screen safeTop>
        <StatePanel title="Chưa thể tải hồ sơ" description="Cấu hình dịch vụ đang thiếu." />
      </Screen>
    );
  }
  if (error && !profile) {
    return (
      <Screen safeTop>
        <AsyncStatePanel
          state="error"
          title="Không thể xem hồ sơ"
          description={error}
          actionLabel="Thử lại"
          onAction={() => void load()}
        />
      </Screen>
    );
  }
  if (!profile) {
    return (
      <Screen safeTop>
        <AsyncStatePanel state="loading" title="Đang tải hồ sơ" description="Đang tải thông tin công khai." />
      </Screen>
    );
  }

  const actions = (
    <View style={styles.profileActions}>
      <IconButton
        icon={saved ? 'bookmarkFilled' : 'bookmark'}
        label={saved ? `Bỏ lưu ${profile.displayName}` : `Lưu ${profile.displayName}`}
        tone="primary"
        disabled={saving || liking}
        onPress={() => void toggleSaved()}
        style={styles.footerSave}
      />
      <AppButton
        label={liking ? 'Đang gửi' : 'Thả tim ngay'}
        trailingIcon="heart"
        loading={liking}
        disabled={liking || saving}
        onPress={() => void likeProfile()}
        style={styles.likeButton}
      />
    </View>
  );

  return (
    <Screen safeTop contentStyle={styles.otherProfileScreen} footer={actions}>
      <View style={[styles.heroWrap, { width: heroWidth, height: heroHeight }]}>
        {photoUrls.length > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled
            onMomentumScrollEnd={onPhotoScroll}
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0, width: heroWidth, height: heroHeight }}
          >
            {photoUrls.map((uri, index) => (
              <Image
                key={uri}
                accessibilityLabel={`Ảnh ${index + 1} của ${profile.displayName}`}
                source={{ uri }}
                fadeDuration={0}
                style={[styles.heroImage, { width: heroWidth, height: heroHeight }]}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        ) : (
          <Image
            accessibilityLabel={`Ảnh đại diện của ${profile.displayName}`}
            source={getProfileImageSource(undefined, profile.id, profile.gender, profile.displayName)}
            fadeDuration={0}
            style={[styles.heroImage, { width: heroWidth, height: heroHeight }]}
            resizeMode="cover"
          />
        )}
        <Image source={brandAssets.cardScrimGradient} pointerEvents="none" style={styles.heroScrimImage} resizeMode="stretch" />
        <View style={styles.heroTopActions}>
          <IconButton
            icon="back"
            label="Quay lại"
            tone="default"
            onPress={() => navigation.goBack()}
            style={styles.heroTopButton}
          />
          {photoUrls.length > 1 ? (
            <View style={styles.heroDots}>
              {photoUrls.map((_, index) => (
                <View key={index} style={[styles.heroDot, index === activePhoto && styles.heroDotActive]} />
              ))}
            </View>
          ) : null}
          <IconButton
            icon="more"
            label={`Tùy chọn cho ${profile.displayName}`}
            tone="default"
            onPress={() => navigation.navigate('Report', { profileId: profile.id })}
            style={styles.heroTopButton}
          />
        </View>
        <View pointerEvents="none" style={styles.heroDetails}>
          <View style={styles.heroNameRow}>
            <AppText accessibilityRole="header" tone="onPrimary" style={styles.heroName}>
              {profile.displayName}, {profile.age}
            </AppText>
            <VerifiedBadge size={24} />
          </View>
          <AppText tone="onPrimary" style={styles.heroMeta}>
            {formatNaturalOccupation(profile.occupation) || 'Thành viên HeartSync'}
            {profile.publicLocation ? ` · ${profile.publicLocation}` : ''}
          </AppText>
        </View>
      </View>

      <View style={styles.profileBody}>
        <View style={styles.profileSection}>
          <AppText accessibilityRole="header" style={styles.detailTitle}>
            Một chút về {profile.displayName}
          </AppText>
          <AppText tone="muted" style={styles.detailBody}>
            {formatNaturalBio(profile.bio, profile.displayName)}
          </AppText>
        </View>

        {profile.education ? (
          <View style={styles.profileSection}>
            <AppText accessibilityRole="header" style={styles.detailSubtitle}>
              Học vấn
            </AppText>
            <AppText tone="muted" style={styles.detailBody}>
              {profile.education}
            </AppText>
          </View>
        ) : null}

        {profile.interests.length ? (
          <View style={styles.profileSection}>
            <AppText accessibilityRole="header" style={styles.detailSubtitle}>
              Sở thích
            </AppText>
            <View style={styles.chips}>
              {profile.interests.map((interest) => (
                <SelectedChip key={interest} label={interest} />
              ))}
            </View>
          </View>
        ) : null}

        {profile.languages.length ? (
          <View style={styles.section}>
            <SectionHeader title="Ngôn ngữ" />
            <View style={styles.chips}>
              {profile.languages.map((language) => (
                <SelectedChip key={language} label={optionLabel(LANGUAGE_OPTIONS, language)} />
              ))}
            </View>
          </View>
        ) : null}

        {error ? (
          <View accessibilityLiveRegion="polite" style={styles.error}>
            <AppIcon name="error" color={colors.danger} size={20} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

export function SafetyScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Safety'>) {
  return (
    <Screen safeTop contentStyle={styles.detailScreen}>
      <View style={styles.detailHeader}>
        <IconButton icon="back" label="Quay lại" onPress={() => navigation.goBack()} />
        <AppText accessibilityRole="header" style={styles.detailHeaderTitle}>
          An toàn & riêng tư
        </AppText>
      </View>
      <View style={styles.safetyHeader}>
        <View style={styles.safetyHero}>
          <AppIcon name="shield" color={colors.success} size={30} />
        </View>
        <View style={styles.safetyCopy}>
          <AppText accessibilityRole="header" style={styles.safetyHeroTitle}>
            Bạn quyết định giới hạn.
          </AppText>
          <AppText tone="muted" style={styles.safetyHeroBody}>
            Chặn hoặc báo cáo bất cứ khi nào một tương tác khiến bạn không thoải mái.
          </AppText>
        </View>
      </View>
      <View style={styles.safetyList}>
        <AppText accessibilityRole="header" style={styles.safetySectionTitle}>
          Quyền kiểm soát của bạn
        </AppText>
        <SafetyItem
          icon="lock"
          title="Dữ liệu riêng tư"
          description="Email, ngày sinh và tọa độ GPS chính xác không bao giờ hiển thị công khai."
        />
        <SafetyItem
          icon="locationOff"
          title="Vị trí theo lựa chọn"
          description="Bạn chỉ dùng tọa độ khi bật bộ lọc bán kính. Tắt đi sẽ đặt lại thành không giới hạn."
        />
        <SafetyItem
          icon="shield"
          title="Tương tác an toàn"
          description="Chặn một người sẽ chấm dứt ngay lập tức quyền nhắn tin và gọi điện."
        />
      </View>
      <View style={styles.safetyHelp}>
        <AppText style={styles.safetyHelpTitle}>Cần hỗ trợ thêm?</AppText>
        <AppText tone="muted" style={styles.safetyHelpBody}>
          Bạn luôn có thể rời khỏi cuộc trò chuyện hoặc hủy kết nối bất kỳ lúc nào.
        </AppText>
      </View>
    </Screen>
  );
}

export function ReportScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Report'>) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  if (!route.params?.profileId) {
    return (
      <Screen safeTop>
        <StatePanel
          title="Chưa chọn hồ sơ cần báo cáo"
          description="Mở một hồ sơ công khai rồi chọn menu tùy chọn để báo cáo."
          actionLabel="Quay lại"
          onAction={() => navigation.goBack()}
        />
      </Screen>
    );
  }
  const reasons = [
    'Hồ sơ giả mạo',
    'Ngôn từ hoặc hành vi quấy rối',
    'Nội dung không phù hợp',
    'Spam hoặc quảng cáo',
    'Lý do khác',
  ];
  return (
    <Screen safeTop contentStyle={styles.detailScreen}>
      <View style={styles.detailHeader}>
        <IconButton icon="back" label="Quay lại" onPress={() => navigation.goBack()} />
        <AppText accessibilityRole="header" style={styles.detailHeaderTitle}>
          Báo cáo hồ sơ
        </AppText>
      </View>
      <View style={styles.reportIntro}>
        <AppText accessibilityRole="header" style={styles.reportTitle}>
          Bạn muốn báo cáo điều gì?
        </AppText>
        <AppText tone="muted" style={styles.reportBody}>
          Chọn lý do phù hợp để giúp cộng đồng HeartSync văn minh và an toàn hơn.
        </AppText>
      </View>
      <View style={styles.reportReasons}>
        {reasons.map((item) => {
          const selected = reason === item;
          return (
            <AnimatedPressable
              key={item}
              accessibilityRole="radio"
              accessibilityLabel={item}
              accessibilityState={{ checked: selected }}
              onPress={() => setReason(item)}
              style={[styles.reportReason, selected && styles.reportReasonSelected]}
            >
              <AppText style={styles.reportReasonText}>{item}</AppText>
              <View
                pointerEvents="none"
                accessible={false}
                style={[styles.reportMarker, selected && styles.reportMarkerSelected]}
              >
                {selected ? <View style={styles.reportMarkerDot} /> : null}
              </View>
            </AnimatedPressable>
          );
        })}
      </View>
      <View style={styles.reportDetails}>
        <AppText variant="label" tone="muted">
          MÔ TẢ THÊM (KHÔNG BẮT BUỘC)
        </AppText>
        <TextInput
          accessibilityLabel="Mô tả thêm cho báo cáo"
          value={details}
          onChangeText={setDetails}
          multiline
          maxLength={1200}
          placeholder="Bạn có thể cung cấp thêm chi tiết…"
          placeholderTextColor={colors.inkMuted}
          style={styles.reportInput}
        />
      </View>
      <View style={styles.reportUnavailable}>
        <AppIcon name="lock" color={colors.inkMuted} size={18} />
        <AppText variant="caption" tone="muted" style={styles.reportUnavailableCopy}>
          Chức năng gửi báo cáo tự động tới máy chủ đang được hoàn thiện ở phiên bản tiếp theo.
        </AppText>
      </View>
      <AppButton label="Đóng" variant="secondary" onPress={() => navigation.goBack()} />
    </Screen>
  );
}

function SafetyItem({
  icon,
  badgeColor = colors.primary,
  title,
  description,
}: {
  icon: AppIconName;
  badgeColor?: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.safetyItem}>
      <View style={[styles.safetyItemIcon, { backgroundColor: badgeColor }]}>
        <AppIcon name={icon} color="#FFFFFF" size={20} />
      </View>
      <View style={styles.safetyItemCopy}>
        <AppText style={styles.safetyItemTitle}>{title}</AppText>
        <AppText tone="muted" style={styles.safetyItemDescription}>
          {description}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  otherProfileScreen: { padding: 0, gap: spacing.md },
  heroWrap: { position: 'relative', overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  heroImage: { backgroundColor: colors.surfaceMuted },
  heroDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(20, 10, 16, 0.36)',
    alignSelf: 'center',
  },
  heroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.50)',
  },
  heroDotActive: {
    width: 16,
    backgroundColor: '#FFFFFF',
  },
  heroScrimImage: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: '45%',
    width: '100%',
  },
  heroTopActions: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroTopButton: { backgroundColor: 'rgba(255, 247, 249, 0.90)' },
  heroDetails: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 4,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroName: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, color: colors.onPrimary },
  verifiedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.verified,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMeta: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 20, opacity: 0.92 },
  profileBody: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },
  profileSection: { gap: spacing.xs },
  detailTitle: { fontFamily: fonts.extrabold, fontSize: 20, color: colors.ink },
  detailSubtitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  detailBody: { fontSize: 15, lineHeight: 23 },
  section: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  profileActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'android' ? spacing.lg : spacing.sm,
  },
  footerSave: {
    width: 52,
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  likeButton: { flex: 1 },
  error: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radii.md,
    padding: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  errorText: { ...type.caption, color: colors.danger, flex: 1 },
  detailScreen: { paddingTop: spacing.xs, gap: spacing.lg },
  detailHeader: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: -spacing.xs,
  },
  detailHeaderTitle: { fontFamily: fonts.extrabold, fontSize: 24, lineHeight: 30, color: colors.ink },
  safetyHeader: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  safetyHero: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successSoft,
  },
  safetyCopy: { flex: 1, gap: 4 },
  safetyHeroTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.ink },
  safetyHeroBody: { fontSize: 14, lineHeight: 20 },
  safetyList: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, gap: spacing.xs },
  safetySectionTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  safetyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  safetyItemIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyItemCopy: { flex: 1, gap: 2 },
  safetyItemTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  safetyItemDescription: { fontSize: 14, lineHeight: 20 },
  safetyHelp: { gap: 4, paddingTop: spacing.xs },
  safetyHelpTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  safetyHelpBody: { fontSize: 14, lineHeight: 20 },
  reportIntro: { gap: spacing.xs },
  reportTitle: { fontFamily: fonts.extrabold, fontSize: 24, color: colors.ink },
  reportBody: { fontSize: 14, lineHeight: 21 },
  reportReasons: { gap: spacing.xs },
  reportReason: {
    minHeight: 54,
    borderWidth: 1.2,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  reportReasonSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceMuted },
  reportReasonText: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  reportMarker: {
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportMarkerSelected: { borderColor: colors.primary },
  reportMarkerDot: { width: 10, height: 10, borderRadius: radii.pill, backgroundColor: colors.primary },
  reportDetails: { gap: spacing.xs },
  reportInput: {
    minHeight: 108,
    borderWidth: 1.2,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  reportUnavailable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
  },
  reportUnavailableCopy: { flex: 1 },
});
