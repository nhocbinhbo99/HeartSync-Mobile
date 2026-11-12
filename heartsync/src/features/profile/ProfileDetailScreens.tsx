import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAppServices } from '../../services/AppServicesProvider';
import { AppButton } from '../../shared/components/AppButton';
import { CachedImage } from '../../shared/components/CachedImage';
import { AppIcon, type AppIconName } from '../../shared/components/AppIcon';
import { AppText } from '../../shared/components/AppText';
import { AnimatedPressable } from '../../shared/components/AnimatedPressable';
import { Avatar } from '../../shared/components/Avatar';
import { AsyncStatePanel } from '../../shared/components/AsyncStatePanel';
import { IconButton } from '../../shared/components/IconButton';
import { Screen } from '../../shared/components/Screen';
import { SectionHeader } from '../../shared/components/SectionHeader';
import { SelectedChip } from '../../shared/components/SelectedChip';
import { StatePanel } from '../../shared/components/StatePanel';
import { useSnackbar } from '../../shared/components/Snackbar';
import { optionLabel, LANGUAGE_OPTIONS } from '../../shared/domain/profileOptions';
import { colors, radii, spacing, type } from '../../shared/theme/tokens';
import type { ProfilePublic } from '../../shared/types/domain.types';
import type { RootStackParamList } from '../../navigation/types';
import { ProfileEditor } from './ProfileEditor';

export function EditProfileScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'EditProfile'>) {
  return <ProfileEditor mode="edit" onCancel={() => navigation.goBack()} />;
}

export function OtherProfileScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'OtherProfile'>) {
  const services = useAppServices();
  const snackbar = useSnackbar();
  const profileId = route.params?.profileId;
  const [loadedProfile, setLoadedProfile] = useState<{ profileId: string; profile: ProfilePublic }>();
  const [photo, setPhoto] = useState<{ profileId: string; storagePath: string; url: string }>();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [liking, setLiking] = useState(false);
  const [error, setError] = useState('');
  const requestRef = useRef(0);
  const profile = loadedProfile && loadedProfile.profileId === profileId ? loadedProfile.profile : undefined;

  const load = useCallback(async () => {
    if (!services || !profileId) return;
    const request = ++requestRef.current;
    setError('');
    const [profileResult, savedResult] = await Promise.all([services.profile.getPublic(profileId), services.saved.isSaved(profileId)]);
    if (request !== requestRef.current) return;
    if (!profileResult.ok) { setError(profileResult.error.message); return; }
    setLoadedProfile({ profileId, profile: profileResult.data });
    if (savedResult.ok) setSaved(savedResult.data);
    const primary = profileResult.data.photos.find((photo) => photo.isPrimary) ?? profileResult.data.photos[0];
    setPhoto((current) => current?.profileId === profileId && current.storagePath === primary?.storagePath ? current : undefined);
    if (primary) {
      const url = await services.profile.createPhotoUrl(primary.storagePath);
      if (request === requestRef.current && url.ok) setPhoto({ profileId, storagePath: primary.storagePath, url: url.data });
    }
  }, [profileId, services]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => { clearTimeout(timer); requestRef.current += 1; };
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
    snackbar.show({ message: next ? 'Đã lưu hồ sơ để xem lại sau.' : 'Đã bỏ lưu hồ sơ.', tone: 'success' });
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
      navigation.navigate('MatchFound', { matchId: result.data.matchId });
      return;
    }
    snackbar.show({ message: 'Đã bày tỏ sự quan tâm.', tone: 'success' });
  };

  if (!profileId) return <Screen><StatePanel title="Chưa chọn hồ sơ" description="Hãy chọn một hồ sơ từ Khám phá hoặc Đã lưu." /></Screen>;
  if (!services) return <Screen><StatePanel title="Chưa thể tải hồ sơ" description="Cấu hình dịch vụ đang thiếu." /></Screen>;
  if (error && !profile) return <Screen><AsyncStatePanel state="error" title="Không thể xem hồ sơ" description={error} actionLabel="Thử lại" onAction={() => void load()} /></Screen>;
  if (!profile) return <Screen><AsyncStatePanel state="loading" title="Đang tải hồ sơ" description="Chỉ dữ liệu công khai được tải." /></Screen>;
  const primaryPhoto = profile.photos.find((item) => item.isPrimary) ?? profile.photos[0];
  const visiblePhoto = photo?.profileId === profileId && photo.storagePath === primaryPhoto?.storagePath ? photo : undefined;

  const actions = <View style={styles.profileActions}>
    <IconButton icon={saved ? 'bookmarkFilled' : 'bookmark'} label={saved ? `Bỏ lưu ${profile.displayName}` : `Lưu ${profile.displayName}`} tone="primary" disabled={saving || liking} onPress={() => void toggleSaved()} style={styles.footerSave} />
    <AppButton label={liking ? 'Đang gửi' : 'Bày tỏ quan tâm'} trailingIcon="heart" loading={liking} disabled={liking || saving} onPress={() => void likeProfile()} style={styles.likeButton} />
  </View>;

  return <Screen safeTop contentStyle={styles.otherProfileScreen} footer={actions}>
    <View style={styles.heroWrap}>
      {visiblePhoto ? <CachedImage accessibilityLabel={`Ảnh đại diện của ${profile.displayName}`} source={{ uri: visiblePhoto.url, cacheKey: visiblePhoto.storagePath }} recyclingKey={profile.id} style={styles.heroImage} />
        : <View style={styles.photoPlaceholder}>
          <Avatar label={profile.displayName} size={64} />
          <AppText variant="subtitle">Chưa có ảnh hiển thị</AppText>
          <AppText variant="caption" tone="muted" style={styles.photoPlaceholderText}>Hồ sơ này chưa thêm ảnh công khai.</AppText>
        </View>}
      <View style={styles.heroTopActions}>
        <IconButton icon="back" label="Quay lại" tone="default" onPress={() => navigation.goBack()} style={styles.heroTopButton} />
        <IconButton icon="more" label={`Tùy chọn cho ${profile.displayName}`} tone="default" onPress={() => navigation.navigate('Report', { profileId: profile.id })} style={styles.heroTopButton} />
      </View>
      <View style={styles.heroDetails}><AppText accessibilityRole="header" tone="onPrimary" style={styles.heroName}>{profile.displayName}, {profile.age}</AppText><AppText tone="onPrimary" style={styles.heroMeta}>{profile.occupation || 'Hồ sơ công khai'}{profile.publicLocation ? ` · ${profile.publicLocation}` : ''}</AppText></View>
    </View>
    <View style={styles.profileBody}>
      <View style={styles.profileSection}><AppText accessibilityRole="header" style={styles.detailTitle}>Một chút về {profile.displayName}</AppText><AppText tone="muted" style={styles.detailBody}>{profile.bio || 'Người này chưa thêm phần giới thiệu.'}</AppText></View>
      {profile.interests.length ? <View style={styles.profileSection}><AppText accessibilityRole="header" style={styles.detailSubtitle}>Có thể chúng ta cùng thích</AppText><View style={styles.interestLine}>{profile.interests.map((interest) => <AppText key={interest} tone="primary" style={styles.interestLabel}>{interest}</AppText>)}</View></View> : null}
      {profile.languages.length ? <View style={styles.section}><SectionHeader title="Ngôn ngữ" /><View style={styles.chips}>{profile.languages.map((language) => <SelectedChip key={language} label={optionLabel(LANGUAGE_OPTIONS, language)} />)}</View></View> : null}
      {error ? <View accessibilityLiveRegion="polite" style={styles.error}><AppIcon name="error" color={colors.danger} size={20} /><Text style={styles.errorText}>{error}</Text></View> : null}
    </View>
  </Screen>;
}

export function SafetyScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Safety'>) {
  return <Screen safeTop contentStyle={styles.detailScreen}>
    <View style={styles.detailHeader}><IconButton icon="back" label="Quay lại" onPress={() => navigation.goBack()} /><AppText accessibilityRole="header" style={styles.detailHeaderTitle}>An toàn & riêng tư</AppText></View>
    <View style={styles.safetyHeader}><View style={styles.safetyHero}><AppIcon name="shield" color={colors.success} size={31} /></View><View style={styles.safetyCopy}><AppText accessibilityRole="header" style={styles.safetyHeroTitle}>Bạn quyết định giới hạn.</AppText><AppText tone="muted" style={styles.safetyHeroBody}>Chặn hoặc báo cáo khi một tương tác khiến bạn không thoải mái.</AppText></View></View>
    <View style={styles.safetyList}>
      <AppText accessibilityRole="header" style={styles.safetySectionTitle}>Quản lý tương tác</AppText>
      <SafetyItem icon="lock" title="Dữ liệu riêng tư" description="Email, ngày sinh và tọa độ chính xác không xuất hiện trong Khám phá hoặc hồ sơ công khai." />
      <SafetyItem icon="locationOff" title="Vị trí theo lựa chọn của bạn" description="Bạn chỉ dùng tọa độ để lọc khoảng cách. Khi tắt, phạm vi sẽ trở thành không giới hạn." />
      <SafetyItem icon="shield" title="Kiểm soát tương tác" description="Chặn một người sẽ ngăn các tương tác mới theo chính sách được máy chủ xác nhận." />
    </View>
    <View style={styles.safetyHelp}><AppText style={styles.safetyHelpTitle}>Cần hỗ trợ?</AppText><AppText tone="muted" style={styles.safetyHelpBody}>Bạn luôn có thể kết thúc một cuộc trò chuyện hoặc hủy match bất cứ lúc nào.</AppText></View>
  </Screen>;
}

/** The form is deliberately non-submitting until a ReportRepository contract exists. */
export function ReportScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Report'>) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  if (!route.params?.profileId) return <Screen><StatePanel title="Chưa chọn hồ sơ cần báo cáo" description="Mở một hồ sơ công khai rồi chọn menu tùy chọn để báo cáo." actionLabel="Quay lại" onAction={() => navigation.goBack()} /></Screen>;
  const reasons = ['Hồ sơ giả mạo', 'Ngôn từ hoặc hành vi quấy rối', 'Nội dung không phù hợp', 'Spam hoặc quảng cáo', 'Lý do khác'];
  return <Screen safeTop contentStyle={styles.detailScreen}>
    <View style={styles.detailHeader}><IconButton icon="back" label="Quay lại" onPress={() => navigation.goBack()} /><AppText accessibilityRole="header" style={styles.detailHeaderTitle}>Báo cáo hồ sơ</AppText></View>
    <View style={styles.reportIntro}><AppText accessibilityRole="header" style={styles.reportTitle}>Bạn muốn báo cáo điều gì?</AppText><AppText tone="muted" style={styles.reportBody}>Thông tin này chỉ được dùng để xem xét báo cáo. Hiện phiên bản này chưa có kênh gửi an toàn đến máy chủ.</AppText></View>
    <View style={styles.reportReasons}>{reasons.map((item) => {
      const selected = reason === item;
      return <AnimatedPressable key={item} accessibilityRole="radio" accessibilityLabel={item} accessibilityState={{ checked: selected }} onPress={() => setReason(item)} style={[styles.reportReason, selected && styles.reportReasonSelected]}>
        <AppText style={styles.reportReasonText}>{item}</AppText>
        <View pointerEvents="none" accessible={false} style={[styles.reportMarker, selected && styles.reportMarkerSelected]}>{selected ? <View style={styles.reportMarkerDot} /> : null}</View>
      </AnimatedPressable>;
    })}</View>
    <View style={styles.reportDetails}><AppText variant="label" tone="muted">MÔ TẢ THÊM (KHÔNG BẮT BUỘC)</AppText><TextInput accessibilityLabel="Mô tả thêm cho báo cáo" value={details} onChangeText={setDetails} multiline maxLength={1200} placeholder="Bạn có thể cung cấp thêm bối cảnh…" placeholderTextColor={colors.inkMuted} style={styles.reportInput} /></View>
    <View style={styles.reportUnavailable}><AppIcon name="lock" color={colors.inkMuted} size={18} /><AppText variant="caption" tone="muted" style={styles.reportUnavailableCopy}>Chưa thể gửi: dự án chưa có ReportRepository. Lựa chọn và mô tả này không được lưu.</AppText></View>
    <AppButton label="Đóng" variant="secondary" onPress={() => navigation.goBack()} />
  </Screen>;
}

function SafetyItem({ icon, title, description }: { icon: AppIconName; title: string; description: string }) {
  return <View style={styles.safetyItem}><View style={styles.safetyItemIcon}><AppIcon name={icon} color={colors.primaryPressed} size={21} /></View><View style={styles.safetyItemCopy}><AppText variant="label">{title}</AppText><AppText variant="caption" tone="muted">{description}</AppText></View></View>;
}

const styles = StyleSheet.create({
  otherProfileScreen: { padding: 0, gap: 0 },
  heroWrap: { position: 'relative', overflow: 'hidden', backgroundColor: colors.surfaceMuted }, heroImage: { width: '100%', aspectRatio: 0.84, backgroundColor: colors.surfaceMuted },
  photoPlaceholder: { width: '100%', aspectRatio: 1.4, borderRadius: radii.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.xs }, photoPlaceholderText: { textAlign: 'center' },
  heroTopActions: { position: 'absolute', top: spacing.md, right: spacing.lg, left: spacing.lg, flexDirection: 'row', justifyContent: 'space-between' }, heroTopButton: { backgroundColor: colors.surface },
  heroDetails: { position: 'absolute', right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(59,16,36,0.82)', paddingHorizontal: 26, paddingVertical: 24, gap: spacing.xs }, heroName: { fontSize: 42, lineHeight: 50, fontWeight: '700' }, heroMeta: { fontSize: 18, lineHeight: 25 },
  profileBody: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl, backgroundColor: colors.surfaceMuted, gap: spacing.xl }, profileSection: { gap: spacing.md }, section: { gap: spacing.sm }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }, interestLine: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }, interestLabel: { fontSize: 18, lineHeight: 26 }, detailTitle: { fontSize: 32, lineHeight: 40, fontWeight: '700' }, detailSubtitle: { fontSize: 26, lineHeight: 34, fontWeight: '700' }, detailBody: { fontSize: 19, lineHeight: 30 }, error: { borderWidth: 1, borderColor: colors.danger, borderRadius: radii.md, padding: spacing.sm, flexDirection: 'row', gap: spacing.xs }, errorText: { ...type.caption, color: colors.danger, flex: 1 },
  profileActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md }, footerSave: { backgroundColor: colors.primarySoft }, likeButton: { flex: 1, minHeight: 58, borderRadius: 20 },
  detailScreen: { paddingTop: spacing.sm, gap: spacing.xl }, detailHeader: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginLeft: -spacing.xs }, detailHeaderTitle: { fontSize: 35, lineHeight: 42, fontWeight: '700', color: colors.ink, letterSpacing: -0.4 },
  safetyHeader: { backgroundColor: '#FDEAF0', borderRadius: 28, padding: spacing.lg, gap: spacing.md }, safetyHero: { width: 48, height: 48, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }, safetyCopy: { gap: spacing.sm }, safetyHeroTitle: { fontSize: 29, lineHeight: 36, fontWeight: '700' }, safetyHeroBody: { fontSize: 18, lineHeight: 28 }, safetyList: { paddingTop: spacing.sm, gap: spacing.xs }, safetySectionTitle: { fontSize: 27, lineHeight: 34, fontWeight: '700', marginBottom: spacing.sm }, safetyItem: { minHeight: 104, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }, safetyItemIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }, safetyItemCopy: { flex: 1, gap: spacing.xs }, safetyHelp: { marginTop: 'auto', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 24, padding: spacing.lg, gap: spacing.sm }, safetyHelpTitle: { fontSize: 24, lineHeight: 30, fontWeight: '700' }, safetyHelpBody: { fontSize: 17, lineHeight: 26 },
  reportIntro: { gap: spacing.md }, reportTitle: { fontSize: 34, lineHeight: 42, fontWeight: '700' }, reportBody: { fontSize: 18, lineHeight: 28 }, reportReasons: { gap: spacing.sm }, reportReason: { minHeight: 74, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }, reportReasonSelected: { borderColor: colors.primary }, reportReasonText: { flex: 1, fontSize: 18, lineHeight: 25 }, reportMarker: { width: 32, height: 32, borderRadius: radii.pill, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, reportMarkerSelected: { borderColor: colors.primary }, reportMarkerDot: { width: 16, height: 16, borderRadius: radii.pill, backgroundColor: colors.primary }, reportDetails: { gap: spacing.sm }, reportInput: { minHeight: 138, borderWidth: 1, borderColor: colors.border, borderRadius: 20, backgroundColor: colors.surface, padding: spacing.md, color: colors.ink, fontSize: 17, textAlignVertical: 'top' }, reportUnavailable: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surfaceMuted }, reportUnavailableCopy: { flex: 1 },
});
