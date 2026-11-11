import { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAppServices } from '../../services/AppServicesProvider';
import { AppButton } from '../../shared/components/AppButton';
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
  const [profile, setProfile] = useState<ProfilePublic>();
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [liking, setLiking] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!services || !profileId) return;
    setError('');
    const [profileResult, savedResult] = await Promise.all([services.profile.getPublic(profileId), services.saved.isSaved(profileId)]);
    if (!profileResult.ok) { setError(profileResult.error.message); return; }
    setProfile(profileResult.data);
    if (savedResult.ok) setSaved(savedResult.data);
    const primary = profileResult.data.photos.find((photo) => photo.isPrimary) ?? profileResult.data.photos[0];
    if (primary) {
      const url = await services.profile.createPhotoUrl(primary.storagePath);
      if (url.ok) setPhotoUrl(url.data);
    }
  }, [profileId, services]);

  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

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

  const actions = <View style={styles.profileActions}>
    <IconButton icon={saved ? 'bookmarkFilled' : 'bookmark'} label={saved ? `Bỏ lưu ${profile.displayName}` : `Lưu ${profile.displayName}`} tone="primary" disabled={saving || liking} onPress={() => void toggleSaved()} style={styles.footerSave} />
    <AppButton label={liking ? 'Đang gửi' : 'Bày tỏ quan tâm'} trailingIcon="heart" loading={liking} disabled={liking || saving} onPress={() => void likeProfile()} style={styles.likeButton} />
  </View>;

  return <Screen footer={actions}>
    <View style={styles.heroWrap}>
      {photoUrl ? <Image accessibilityLabel={`Ảnh đại diện của ${profile.displayName}`} source={{ uri: photoUrl }} style={styles.heroImage} resizeMode="cover" />
        : <View style={styles.photoPlaceholder}>
          <Avatar label={profile.displayName} size={64} />
          <AppText variant="subtitle">Chưa có ảnh hiển thị</AppText>
          <AppText variant="caption" tone="muted" style={styles.photoPlaceholderText}>Hồ sơ này chưa thêm ảnh công khai.</AppText>
        </View>}
      <View style={styles.heroDetails}><AppText accessibilityRole="header" variant="display" tone="onPrimary">{profile.displayName}, {profile.age}</AppText><AppText tone="onPrimary">{profile.occupation || 'Hồ sơ công khai'}{profile.publicLocation ? ` · ${profile.publicLocation}` : ''}</AppText></View>
      <IconButton icon="more" label={`Tùy chọn cho ${profile.displayName}`} tone="onPrimary" onPress={() => navigation.navigate('Report', { profileId: profile.id })} style={styles.moreButton} />
    </View>
    <View style={styles.profileSection}><AppText accessibilityRole="header" variant="title">Một chút về {profile.displayName}</AppText><AppText tone="muted">{profile.bio || 'Người này chưa thêm phần giới thiệu.'}</AppText></View>
    {profile.interests.length ? <View style={styles.profileSection}><SectionHeader title="Sở thích" /><View style={styles.chips}>{profile.interests.map((interest) => <SelectedChip key={interest} label={interest} />)}</View></View> : null}
    {profile.languages.length ? <View style={styles.section}><SectionHeader title="Ngôn ngữ" /><View style={styles.chips}>{profile.languages.map((language) => <SelectedChip key={language} label={optionLabel(LANGUAGE_OPTIONS, language)} />)}</View></View> : null}
    {error ? <View accessibilityLiveRegion="polite" style={styles.error}><AppIcon name="error" color={colors.danger} size={20} /><Text style={styles.errorText}>{error}</Text></View> : null}
  </Screen>;
}

export function SafetyScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Safety'>) {
  return <Screen>
    <View style={styles.safetyHeader}><View style={styles.safetyHero}><AppIcon name="shield" color={colors.primaryPressed} size={25} /></View><View style={styles.safetyCopy}><AppText accessibilityRole="header" variant="title">An toàn & quyền riêng tư</AppText><AppText tone="muted">Thông tin nào được hiển thị và cách HeartSync bảo vệ bạn.</AppText></View></View>
    <View style={styles.safetyList}>
      <SectionHeader title="Quyền riêng tư của bạn" description="Những dữ liệu này luôn được xử lý theo ngữ cảnh bạn chọn." />
      <SafetyItem icon="lock" title="Dữ liệu riêng tư" description="Email, ngày sinh và tọa độ chính xác không xuất hiện trong Khám phá hoặc hồ sơ công khai." />
      <SafetyItem icon="locationOff" title="Vị trí theo lựa chọn của bạn" description="Bạn chỉ dùng tọa độ để lọc khoảng cách. Khi tắt, phạm vi sẽ trở thành không giới hạn." />
      <SafetyItem icon="shield" title="Kiểm soát tương tác" description="Chặn một người sẽ ngăn các tương tác mới theo chính sách được máy chủ xác nhận." />
    </View>
    <AppButton label="Đã hiểu" trailingIcon="check" variant="secondary" onPress={() => navigation.goBack()} />
  </Screen>;
}

/** The form is deliberately non-submitting until a ReportRepository contract exists. */
export function ReportScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Report'>) {
  const [reason, setReason] = useState('');
  if (!route.params?.profileId) return <Screen><StatePanel title="Chưa chọn hồ sơ cần báo cáo" description="Mở một hồ sơ công khai rồi chọn menu tùy chọn để báo cáo." actionLabel="Quay lại" onAction={() => navigation.goBack()} /></Screen>;
  const reasons = ['Hồ sơ hoặc ảnh không phù hợp', 'Hành vi quấy rối', 'Nghi ngờ mạo danh', 'Lý do khác'];
  return <Screen>
    <View style={styles.reportIntro}><View style={styles.reportIcon}><AppIcon name="warning" color={colors.danger} size={26} /></View><AppText accessibilityRole="header" variant="heading">Báo cáo hồ sơ</AppText><AppText tone="muted">Hãy chọn lý do gần nhất. Báo cáo chỉ là thông tin tiếp nhận, không tự xác nhận vi phạm.</AppText></View>
    <View style={styles.reportReasons}>{reasons.map((item) => {
      const selected = reason === item;
      return <AnimatedPressable key={item} accessibilityRole="radio" accessibilityLabel={item} accessibilityState={{ checked: selected }} onPress={() => setReason(item)} style={[styles.reportReason, selected && styles.reportReasonSelected]}>
        <AppText style={styles.reportReasonText}>{item}</AppText>
        <View pointerEvents="none" accessible={false} style={[styles.reportMarker, selected && styles.reportMarkerSelected]}>{selected ? <AppIcon name="check" color={colors.onPrimary} size={16} /> : null}</View>
      </AnimatedPressable>;
    })}</View>
    <StatePanel icon="lock" title="Chưa thể gửi báo cáo từ phiên bản này" description="Dự án chưa có ReportRepository để gửi dữ liệu an toàn đến backend. Lựa chọn của bạn không được lưu hoặc tuyên bố là đã gửi." />
    <AppButton label="Đóng" variant="secondary" onPress={() => navigation.goBack()} />
  </Screen>;
}

function SafetyItem({ icon, title, description }: { icon: AppIconName; title: string; description: string }) {
  return <View style={styles.safetyItem}><View style={styles.safetyItemIcon}><AppIcon name={icon} color={colors.primaryPressed} size={21} /></View><View style={styles.safetyItemCopy}><AppText variant="label">{title}</AppText><AppText variant="caption" tone="muted">{description}</AppText></View></View>;
}

const styles = StyleSheet.create({
  heroWrap: { position: 'relative', overflow: 'hidden', borderRadius: radii.lg, backgroundColor: colors.surfaceMuted }, heroImage: { width: '100%', aspectRatio: 0.84, backgroundColor: colors.surfaceMuted },
  photoPlaceholder: { width: '100%', aspectRatio: 1.4, borderRadius: radii.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.xs }, photoPlaceholderText: { textAlign: 'center' },
  heroDetails: { position: 'absolute', right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(59,16,36,0.76)', padding: spacing.lg, gap: spacing.xs }, moreButton: { position: 'absolute', top: spacing.sm, right: spacing.sm, backgroundColor: 'rgba(59,16,36,0.64)' },
  profileSection: { gap: spacing.sm }, section: { gap: spacing.sm }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }, error: { borderWidth: 1, borderColor: colors.danger, borderRadius: radii.md, padding: spacing.sm, flexDirection: 'row', gap: spacing.xs }, errorText: { ...type.caption, color: colors.danger, flex: 1 },
  profileActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md }, footerSave: { backgroundColor: colors.primarySoft }, likeButton: { flex: 1 },
  safetyHeader: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }, safetyHero: { width: 48, height: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border }, safetyCopy: { flex: 1, gap: spacing.xxs }, safetyList: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.lg, gap: spacing.xs }, safetyItem: { minHeight: 88, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }, safetyItemIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, safetyItemCopy: { flex: 1, gap: spacing.xxs },
  reportIntro: { gap: spacing.sm }, reportIcon: { width: 56, height: 56, borderRadius: radii.pill, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' }, reportReasons: { gap: spacing.sm }, reportReason: { minHeight: 64, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radii.md, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }, reportReasonSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft }, reportReasonText: { flex: 1 }, reportMarker: { width: 24, height: 24, borderRadius: radii.pill, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, reportMarkerSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
});
