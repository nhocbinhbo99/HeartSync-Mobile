import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/types';
import { useAppServices } from '../../services/AppServicesProvider';
import { AppButton } from '../../shared/components/AppButton';
import { AppIcon, type AppIconName } from '../../shared/components/AppIcon';
import { AppText } from '../../shared/components/AppText';
import { AnimatedPressable } from '../../shared/components/AnimatedPressable';
import { AsyncStatePanel } from '../../shared/components/AsyncStatePanel';
import { IconButton } from '../../shared/components/IconButton';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import { useSnackbar } from '../../shared/components/Snackbar';
import { colors, radii, spacing } from '../../shared/theme/tokens';
import type { InterestOption, ProfilePrivate, ProfilePublic, ProfileSaveInput } from '../../shared/types/domain.types';
import { useAuth } from '../auth/AuthProvider';

type InterestsProps = NativeStackScreenProps<RootStackParamList, 'Interests'>;
type SettingsProps = NativeStackScreenProps<RootStackParamList, 'Settings'>;

type ProfileSnapshot = { public: ProfilePublic; private: ProfilePrivate };

export function InterestsScreen({ navigation }: InterestsProps) {
  const services = useAppServices();
  const snackbar = useSnackbar();
  const [profile, setProfile] = useState<ProfileSnapshot>();
  const [options, setOptions] = useState<InterestOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!services) return;
    setLoading(true);
    setError('');
    const [profileResult, interestsResult] = await Promise.all([services.profile.getMine(), services.profile.listInterests()]);
    if (!profileResult.ok) {
      setError(profileResult.error.message);
      setLoading(false);
      return;
    }
    if (!interestsResult.ok) {
      setError(interestsResult.error.message);
      setLoading(false);
      return;
    }
    setProfile(profileResult.data);
    setOptions(interestsResult.data);
    setSelected(profileResult.data.public.interests);
    setLoading(false);
  }, [services]);

  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  const toggle = (label: string) => {
    setError('');
    setSelected((current) => {
      if (current.includes(label)) return current.filter((item) => item !== label);
      if (current.length >= 8) {
        setError('Bạn có thể chọn tối đa 8 sở thích.');
        return current;
      }
      return [...current, label];
    });
  };

  const save = async () => {
    if (!services || !profile || saving) return;
    const input: ProfileSaveInput = {
      displayName: profile.public.displayName,
      gender: profile.public.gender,
      dateOfBirth: profile.private.dateOfBirth,
      bio: profile.public.bio,
      occupation: profile.public.occupation,
      education: profile.public.education,
      publicLocation: profile.public.publicLocation,
      interests: selected,
      languages: profile.public.languages,
      locationConsent: profile.private.locationConsent,
      latitude: profile.private.latitude,
      longitude: profile.private.longitude,
    };
    setSaving(true);
    setError('');
    const result = await services.profile.save(input);
    setSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    snackbar.show({ message: 'Đã lưu sở thích của bạn.', tone: 'success' });
    navigation.goBack();
  };

  if (!services) return <Screen><StatePanel title="Chưa thể tải sở thích" description="Cấu hình dịch vụ đang thiếu." /></Screen>;
  if (loading) return <Screen><AsyncStatePanel state="loading" title="Đang chuẩn bị sở thích" description="Chỉ danh mục và hồ sơ của bạn được tải." /></Screen>;
  if (!profile) return <Screen><AsyncStatePanel state="error" title="Không thể tải sở thích" description={error || 'Hãy thử lại sau.'} actionLabel="Thử lại" onAction={() => void load()} /></Screen>;

  return <Screen safeTop contentStyle={styles.interestsScreen} footer={<View style={styles.footer}><AppButton label={saving ? 'Đang lưu' : 'Lưu sở thích'} loading={saving} disabled={saving} onPress={() => void save()} style={styles.saveInterests} /></View>}>
    <View style={styles.subscreenHeader}><IconButton icon="back" label="Quay lại hồ sơ" onPress={() => navigation.goBack()} /><AppText accessibilityRole="header" style={styles.subscreenTitle}>Sở thích của bạn</AppText></View>
    <View style={styles.interestsIntro}>
      <AppText tone="muted" style={styles.interestsLead}>Chọn từ 3 đến 8 sở thích thật sự nói lên bạn.</AppText>
      <AppText variant="label" tone="primary" style={styles.interestsCount}>{selected.length} / 8 đã chọn</AppText>
      <View accessibilityRole="progressbar" accessibilityLabel="Số sở thích đã chọn" accessibilityValue={{ min: 0, max: 8, now: selected.length }} style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.max(6, selected.length / 8 * 100)}%` }]} />
      </View>
    </View>
    <View style={styles.interestGrid}>
      {options.map((option) => {
        const isSelected = selected.includes(option.label);
        return <AnimatedPressable key={option.id} accessibilityRole="checkbox" accessibilityLabel={option.label} accessibilityState={{ checked: isSelected, disabled: saving }}
          disabled={saving} onPress={() => toggle(option.label)} style={[styles.interestOption, isSelected && styles.interestOptionSelected]}>
          <AppText variant="label" tone={isSelected ? 'onPrimary' : 'default'} style={styles.interestLabel}>{option.label}</AppText>
          {isSelected ? <AppIcon name="check" color={colors.onPrimary} size={20} /> : null}
        </AnimatedPressable>;
      })}
    </View>
    {error ? <AppText accessibilityLiveRegion="polite" variant="caption" tone="danger">{error}</AppText> : null}
  </Screen>;
}

export function SettingsScreen({ navigation }: SettingsProps) {
  const { signOut } = useAuth();
  const snackbar = useSnackbar();
  const [busy, setBusy] = useState(false);

  const logOut = async () => {
    if (busy) return;
    setBusy(true);
    const result = await signOut();
    setBusy(false);
    if (!result.ok) snackbar.show({ message: result.message, tone: 'error' });
  };

  return <Screen safeTop contentStyle={styles.settingsScreen}>
    <View style={styles.subscreenHeader}><IconButton icon="back" label="Quay lại hồ sơ" onPress={() => navigation.goBack()} /><AppText accessibilityRole="header" style={styles.subscreenTitle}>Cài đặt</AppText></View>
    <View style={styles.settingSection}>
      <AppText variant="label" tone="muted">TRẢI NGHIỆM</AppText>
      <SettingsRow icon="moon" title="Giao diện" description="Hồng Romance sáng" />
      <SettingsRow icon="heartOutline" title="Hồ sơ và sở thích" description="Chỉnh sửa thông tin bạn chia sẻ" onPress={() => navigation.navigate('EditProfile')} />
    </View>
    <View style={styles.settingSection}>
      <AppText variant="label" tone="muted">QUYỀN RIÊNG TƯ</AppText>
      <SettingsRow icon="shield" title="Trung tâm an toàn" description="Chặn, báo cáo và hỗ trợ" onPress={() => navigation.navigate('Safety')} />
      <SettingsRow icon="lock" title="Dữ liệu hồ sơ" description="Ngày sinh và tọa độ luôn được giữ riêng tư" />
    </View>
    <View style={styles.settingSection}>
      <AppText variant="label" tone="muted">TÀI KHOẢN</AppText>
      <SettingsRow icon="logout" title={busy ? 'Đang đăng xuất' : 'Đăng xuất'} description="Kết thúc phiên trên thiết bị này" destructive disabled={busy} onPress={() => void logOut()} />
    </View>
    <AppText variant="caption" tone="muted" style={styles.version}>HeartSync · Pink Romance UI</AppText>
  </Screen>;
}

function SettingsRow({ icon, title, description, destructive = false, disabled = false, onPress }: {
  icon: AppIconName; title: string; description: string; destructive?: boolean; disabled?: boolean; onPress?: () => void;
}) {
  const content = <>
    <View style={[styles.settingIcon, destructive && styles.settingIconDanger]}><AppIcon name={icon} color={destructive ? colors.danger : colors.primaryPressed} size={22} /></View>
    <View style={styles.settingCopy}><AppText variant="label" tone={destructive ? 'danger' : 'default'}>{title}</AppText><AppText variant="caption" tone="muted">{description}</AppText></View>
    {onPress ? <AppIcon name="forward" color={destructive ? colors.danger : colors.inkMuted} size={22} /> : null}
  </>;
  if (!onPress) return <View accessibilityRole="summary" style={styles.settingRow}>{content}</View>;
  return <AnimatedPressable accessibilityRole="button" accessibilityLabel={title} accessibilityHint={description} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={styles.settingRow}>{content}</AnimatedPressable>;
}

const styles = StyleSheet.create({
  footer: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  interestsScreen: { paddingTop: spacing.sm, gap: spacing.xl },
  settingsScreen: { paddingTop: spacing.sm, gap: spacing.xl },
  subscreenHeader: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginLeft: -spacing.xs },
  subscreenTitle: { fontSize: 35, lineHeight: 42, fontWeight: '700', color: colors.ink, letterSpacing: -0.4 },
  interestsIntro: { gap: spacing.md }, interestsLead: { fontSize: 19, lineHeight: 29 }, interestsCount: { fontSize: 18, lineHeight: 26, marginTop: spacing.sm },
  progressTrack: { height: 8, backgroundColor: colors.primarySoft, borderRadius: radii.pill, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radii.pill },
  interestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  interestOption: { minHeight: 76, width: '48%', borderWidth: 1, borderColor: colors.border, borderRadius: 20, backgroundColor: colors.surface, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  interestOptionSelected: { borderColor: colors.primaryPressed, backgroundColor: colors.primaryPressed },
  interestLabel: { flex: 1, fontSize: 18, lineHeight: 24 }, saveInterests: { minHeight: 58, borderRadius: 20 },
  settingSection: { gap: spacing.xs },
  settingRow: { minHeight: 104, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.md },
  settingIcon: { width: 48, height: 48, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  settingIconDanger: { backgroundColor: colors.dangerSoft },
  settingCopy: { flex: 1, gap: spacing.xxs },
  version: { marginTop: 'auto', paddingTop: spacing.lg, paddingBottom: spacing.sm },
});
