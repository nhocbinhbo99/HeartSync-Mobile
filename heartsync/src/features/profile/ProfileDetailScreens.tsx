import { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAppServices } from '../../services/AppServicesProvider';
import { AppButton } from '../../shared/components/AppButton';
import { AppIcon, type AppIconName } from '../../shared/components/AppIcon';
import { AsyncStatePanel } from '../../shared/components/AsyncStatePanel';
import { IconButton } from '../../shared/components/IconButton';
import { Screen } from '../../shared/components/Screen';
import { SelectedChip } from '../../shared/components/SelectedChip';
import { StatePanel } from '../../shared/components/StatePanel';
import { useSnackbar } from '../../shared/components/Snackbar';
import { optionLabel, GENDER_OPTIONS, LANGUAGE_OPTIONS } from '../../shared/domain/profileOptions';
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

  if (!profileId) return <Screen><StatePanel title="Chưa chọn hồ sơ" description="Hãy chọn một hồ sơ từ Khám phá hoặc Đã lưu." /></Screen>;
  if (!services) return <Screen><StatePanel title="Chưa thể tải hồ sơ" description="Cấu hình dịch vụ đang thiếu." /></Screen>;
  if (error && !profile) return <Screen><AsyncStatePanel state="error" title="Không thể xem hồ sơ" description={error} actionLabel="Thử lại" onAction={() => void load()} /></Screen>;
  if (!profile) return <Screen><AsyncStatePanel state="loading" title="Đang tải hồ sơ" description="Chỉ dữ liệu công khai được tải." /></Screen>;

  return <Screen>
    <View style={styles.heroWrap}>
      {photoUrl ? <Image accessibilityLabel={`Ảnh đại diện của ${profile.displayName}`} source={{ uri: photoUrl }} style={styles.heroImage} resizeMode="cover" />
        : <View style={styles.photoPlaceholder}><AppIcon name="photoAdd" color={colors.inkMuted} size={30} /><Text style={styles.photoPlaceholderText}>Hồ sơ chưa có ảnh hiển thị</Text></View>}
      <IconButton icon={saved ? 'bookmarkFilled' : 'bookmark'} label={saved ? `Bỏ lưu ${profile.displayName}` : `Lưu ${profile.displayName}`} tone={saved ? 'primary' : 'default'} disabled={saving} onPress={() => void toggleSaved()} style={styles.saveButton} />
    </View>
    <View style={styles.heading}>
      <Text accessibilityRole="header" style={styles.title}>{profile.displayName}, {profile.age}</Text>
      <Text style={styles.meta}>{optionLabel(GENDER_OPTIONS, profile.gender)}{profile.publicLocation ? ` · ${profile.publicLocation}` : ''}</Text>
    </View>
    <Text style={styles.bio}>{profile.bio || 'Người này chưa thêm phần giới thiệu.'}</Text>
    <View style={styles.details}>
      {profile.occupation ? <Detail label="Nghề nghiệp" value={profile.occupation} /> : null}
      {profile.education ? <Detail label="Học vấn" value={profile.education} /> : null}
    </View>
    {profile.interests.length ? <View style={styles.section}><Text style={styles.sectionTitle}>Sở thích</Text><View style={styles.chips}>{profile.interests.map((interest) => <SelectedChip key={interest} label={interest} />)}</View></View> : null}
    {profile.languages.length ? <View style={styles.section}><Text style={styles.sectionTitle}>Ngôn ngữ</Text><View style={styles.chips}>{profile.languages.map((language) => <SelectedChip key={language} label={optionLabel(LANGUAGE_OPTIONS, language)} />)}</View></View> : null}
    {error ? <View accessibilityLiveRegion="polite" style={styles.error}><AppIcon name="error" color={colors.danger} size={20} /><Text style={styles.errorText}>{error}</Text></View> : null}
  </Screen>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

export function SafetyScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Safety'>) {
  return <Screen>
    <View style={styles.safetyHeader}><View style={styles.safetyHero}><AppIcon name="shield" color={colors.primaryPressed} size={25} /></View><View style={styles.safetyCopy}><Text accessibilityRole="header" style={styles.title}>An toàn & quyền riêng tư</Text><Text style={styles.meta}>Thông tin nào được hiển thị và cách HeartSync bảo vệ bạn.</Text></View></View>
    <View style={styles.safetyList}>
      <SafetyItem icon="lock" title="Dữ liệu riêng tư" description="Email, ngày sinh và tọa độ chính xác không xuất hiện trong Khám phá hoặc hồ sơ công khai." />
      <SafetyItem icon="locationOff" title="Vị trí theo lựa chọn của bạn" description="Bạn chỉ dùng tọa độ để lọc khoảng cách. Khi tắt, phạm vi sẽ trở thành không giới hạn." />
      <SafetyItem icon="shield" title="Kiểm soát tương tác" description="Chặn một người sẽ ngăn các tương tác mới theo chính sách được máy chủ xác nhận." />
    </View>
    <AppButton label="Đã hiểu" trailingIcon="check" variant="secondary" onPress={() => navigation.goBack()} />
  </Screen>;
}

function SafetyItem({ icon, title, description }: { icon: AppIconName; title: string; description: string }) {
  return <View style={styles.safetyItem}><View style={styles.safetyItemIcon}><AppIcon name={icon} color={colors.primaryPressed} size={21} /></View><View style={styles.safetyItemCopy}><Text style={styles.safetyItemTitle}>{title}</Text><Text style={styles.safetyItemDescription}>{description}</Text></View></View>;
}

const styles = StyleSheet.create({
  heroWrap: { position: 'relative' }, heroImage: { width: '100%', aspectRatio: 0.84, borderRadius: radii.lg, backgroundColor: colors.surfaceMuted },
  photoPlaceholder: { width: '100%', aspectRatio: 1.4, borderRadius: radii.lg, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.xs }, photoPlaceholderText: { ...type.body, color: colors.inkMuted, textAlign: 'center' },
  saveButton: { position: 'absolute', top: spacing.sm, right: spacing.sm, backgroundColor: colors.surface }, heading: { gap: spacing.xxs }, title: { ...type.title, color: colors.ink }, meta: { ...type.body, color: colors.inkMuted }, bio: { ...type.body, color: colors.ink },
  details: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border }, detailRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm }, detailLabel: { ...type.label, color: colors.inkMuted, width: 96 }, detailValue: { ...type.body, color: colors.ink, flex: 1 },
  section: { gap: spacing.sm }, sectionTitle: { ...type.subtitle, color: colors.ink }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }, error: { borderWidth: 1, borderColor: colors.danger, borderRadius: radii.md, padding: spacing.sm, flexDirection: 'row', gap: spacing.xs }, errorText: { ...type.caption, color: colors.danger, flex: 1 },
  safetyHeader: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }, safetyHero: { width: 56, height: 56, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft }, safetyCopy: { flex: 1, gap: spacing.xxs }, safetyList: { borderTopWidth: 1, borderTopColor: colors.border }, safetyItem: { minHeight: 100, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }, safetyItemIcon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }, safetyItemCopy: { flex: 1, gap: spacing.xxs }, safetyItemTitle: { ...type.label, color: colors.ink }, safetyItemDescription: { ...type.body, color: colors.inkMuted },
});
