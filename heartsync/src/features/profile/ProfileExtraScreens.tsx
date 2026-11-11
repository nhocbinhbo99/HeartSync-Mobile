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
import { colors, fonts, radii, spacing } from '../../shared/theme/tokens';
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
    const [profileResult, interestsResult] = await Promise.all([
      services.profile.getMine(),
      services.profile.listInterests(),
    ]);
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

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

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

  if (!services) {
    return (
      <Screen safeTop>
        <StatePanel title="Chưa thể tải sở thích" description="Cấu hình dịch vụ đang thiếu." />
      </Screen>
    );
  }
  if (loading) {
    return (
      <Screen safeTop>
        <AsyncStatePanel
          state="loading"
          title="Đang chuẩn bị sở thích"
          description="Chỉ danh mục và hồ sơ của bạn được tải."
        />
      </Screen>
    );
  }
  if (!profile) {
    return (
      <Screen safeTop>
        <AsyncStatePanel
          state="error"
          title="Không thể tải sở thích"
          description={error || 'Hãy thử lại sau.'}
          actionLabel="Thử lại"
          onAction={() => void load()}
        />
      </Screen>
    );
  }

  return (
    <Screen
      safeTop
      contentStyle={styles.interestsScreen}
      footer={
        <View style={styles.footer}>
          <AppButton
            label={saving ? 'Đang lưu' : 'Lưu sở thích'}
            loading={saving}
            disabled={saving}
            onPress={() => void save()}
          />
        </View>
      }
    >
      <View style={styles.subscreenHeader}>
        <IconButton icon="back" label="Quay lại hồ sơ" onPress={() => navigation.goBack()} />
        <AppText accessibilityRole="header" style={styles.subscreenTitle}>
          Sở thích của bạn
        </AppText>
      </View>
      <View style={styles.interestsIntro}>
        <AppText tone="muted" style={styles.interestsLead}>
          Chọn các sở thích nói lên cá tính của bạn.
        </AppText>
        <AppText variant="label" tone="primary" style={styles.interestsCount}>
          {selected.length} / 8 đã chọn
        </AppText>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Số sở thích đã chọn"
          accessibilityValue={{ min: 0, max: 8, now: selected.length }}
          style={styles.progressTrack}
        >
          <View style={[styles.progressFill, { width: `${Math.max(8, (selected.length / 8) * 100)}%` }]} />
        </View>
      </View>
      <View style={styles.interestGrid}>
        {options.map((option) => {
          const isSelected = selected.includes(option.label);
          return (
            <AnimatedPressable
              key={option.id}
              accessibilityRole="checkbox"
              accessibilityLabel={option.label}
              accessibilityState={{ checked: isSelected, disabled: saving }}
              disabled={saving}
              onPress={() => toggle(option.label)}
              style={[styles.interestOption, isSelected && styles.interestOptionSelected]}
            >
              <AppText variant="label" tone={isSelected ? 'onPrimary' : 'default'} style={styles.interestLabel}>
                {option.label}
              </AppText>
              {isSelected ? <AppIcon name="check" color={colors.onPrimary} size={18} /> : null}
            </AnimatedPressable>
          );
        })}
      </View>
      {error ? (
        <AppText accessibilityLiveRegion="polite" variant="caption" tone="danger">
          {error}
        </AppText>
      ) : null}
    </Screen>
  );
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

  return (
    <Screen safeTop contentStyle={styles.settingsScreen}>
      <View style={styles.subscreenHeader}>
        <IconButton icon="back" label="Quay lại hồ sơ" onPress={() => navigation.goBack()} />
        <AppText accessibilityRole="header" style={styles.subscreenTitle}>
          Cài đặt
        </AppText>
      </View>
      <View style={styles.settingSection}>
        <AppText variant="label" tone="muted" style={styles.settingGroupLabel}>
          TRẢI NGHIỆM
        </AppText>
        <View style={styles.settingCard}>
          <SettingsRow icon="moon" title="Giao diện" description="Pink Romance (Hồng dịu)" />
          <SettingsRow
            icon="heartOutline"
            title="Hồ sơ và sở thích"
            description="Chỉnh sửa thông tin bạn chia sẻ"
            onPress={() => navigation.navigate('EditProfile')}
            isLast
          />
        </View>
      </View>
      <View style={styles.settingSection}>
        <AppText variant="label" tone="muted" style={styles.settingGroupLabel}>
          QUYỀN RIÊNG TƯ
        </AppText>
        <View style={styles.settingCard}>
          <SettingsRow
            icon="shield"
            title="Trung tâm an toàn"
            description="Chặn, báo cáo và hỗ trợ"
            onPress={() => navigation.navigate('Safety')}
          />
          <SettingsRow
            icon="lock"
            title="Dữ liệu hồ sơ"
            description="Ngày sinh và tọa độ luôn được giữ riêng tư"
            isLast
          />
        </View>
      </View>
      <View style={styles.settingSection}>
        <AppText variant="label" tone="muted" style={styles.settingGroupLabel}>
          TÀI KHOẢN
        </AppText>
        <View style={styles.settingCard}>
          <SettingsRow
            icon="logout"
            title={busy ? 'Đang đăng xuất' : 'Đăng xuất'}
            description="Kết thúc phiên trên thiết bị này"
            destructive
            disabled={busy}
            onPress={() => void logOut()}
            isLast
          />
        </View>
      </View>
      <AppText variant="caption" tone="muted" style={styles.version}>
        HeartSync · Pink Romance Edition
      </AppText>
    </Screen>
  );
}

function SettingsRow({
  icon,
  title,
  description,
  destructive = false,
  disabled = false,
  onPress,
  isLast = false,
}: {
  icon: AppIconName;
  title: string;
  description: string;
  destructive?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  isLast?: boolean;
}) {
  const content = (
    <>
      <View style={[styles.settingIcon, destructive && styles.settingIconDanger]}>
        <AppIcon name={icon} color={destructive ? colors.danger : colors.primaryPressed} size={20} />
      </View>
      <View style={styles.settingCopy}>
        <AppText variant="label" tone={destructive ? 'danger' : 'default'}>
          {title}
        </AppText>
        <AppText variant="caption" tone="muted">
          {description}
        </AppText>
      </View>
      {onPress ? <AppIcon name="forward" color={destructive ? colors.danger : colors.inkMuted} size={18} /> : null}
    </>
  );
  if (!onPress) {
    return (
      <View accessibilityRole="summary" style={[styles.settingRow, isLast && styles.settingRowLast]}>
        {content}
      </View>
    );
  }
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.settingRow, isLast && styles.settingRowLast]}
    >
      {content}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  interestsScreen: { paddingTop: spacing.xs, gap: spacing.lg },
  settingsScreen: { paddingTop: spacing.xs, gap: spacing.lg },
  subscreenHeader: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: -spacing.xs,
  },
  subscreenTitle: { fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 32, color: colors.ink },
  interestsIntro: { gap: spacing.xs },
  interestsLead: { fontSize: 15, lineHeight: 22 },
  interestsCount: { fontFamily: fonts.bold, fontSize: 15, marginTop: spacing.xs },
  progressTrack: { height: 8, backgroundColor: colors.primarySoft, borderRadius: radii.pill, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radii.pill },
  interestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  interestOption: {
    minHeight: 54,
    width: '48%',
    borderWidth: 1.2,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  interestOptionSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  interestLabel: { flex: 1, fontSize: 14 },
  settingSection: { gap: spacing.xs },
  settingGroupLabel: { fontSize: 11, letterSpacing: 0.6, paddingLeft: 4 },
  settingCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: spacing.md,
  },
  settingRowLast: { borderBottomWidth: 0 },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIconDanger: { backgroundColor: colors.dangerSoft },
  settingCopy: { flex: 1, gap: 2 },
  version: { textAlign: 'center', marginTop: spacing.sm, paddingBottom: spacing.md },
});

