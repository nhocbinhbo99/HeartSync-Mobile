import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAppServices } from '../../services/AppServicesProvider';
import { validateDiscoveryFilters } from '../../shared/domain/filters';
import { AnimatedSection } from '../../shared/components/AnimatedSection';
import { AnimatedPressable } from '../../shared/components/AnimatedPressable';
import { AppButton } from '../../shared/components/AppButton';
import { AppIcon } from '../../shared/components/AppIcon';
import { AsyncStatePanel } from '../../shared/components/AsyncStatePanel';
import { BottomActionBar } from '../../shared/components/BottomActionBar';
import { RangeSliderField, ValueSliderField } from '../../shared/components/RangeFields';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import { useSnackbar } from '../../shared/components/Snackbar';
import { feedback } from '../../shared/motion/feedback';
import { colors, radii, spacing, type } from '../../shared/theme/tokens';
import type { DiscoveryFilters } from '../../shared/types/domain.types';
import type { RootStackParamList } from '../../navigation/types';

const DEFAULT_FILTERS: DiscoveryFilters = {
  ageMin: 18,
  ageMax: 99,
  distanceKm: null,
  preferredGenders: [],
  preferredLanguages: [],
};

const GENDER_CHIPS = [
  { value: 'man', label: 'Nam', icon: 'person' as const },
  { value: 'woman', label: 'Nữ', icon: 'heart' as const },
  { value: 'nonbinary', label: 'Phi nhị nguyên', icon: 'sparkle' as const },
  { value: 'prefer_not_to_say', label: 'Khác', icon: 'shield' as const },
] as const;

const POPULAR_LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'en', label: 'Tiếng Anh' },
  { code: 'ko', label: 'Tiếng Hàn' },
  { code: 'ja', label: 'Tiếng Nhật' },
  { code: 'zh', label: 'Tiếng Trung' },
  { code: 'fr', label: 'Tiếng Pháp' },
] as const;

export function FiltersScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Filters'>) {
  const services = useAppServices();
  const snackbar = useSnackbar();
  const [filters, setFilters] = useState<DiscoveryFilters>(DEFAULT_FILTERS);
  const [locationReady, setLocationReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!services) return;
    setLoading(true);
    setError('');
    const [preferencesResult, profileResult] = await Promise.all([
      services.preferences.get(),
      services.profile.getMine(),
    ]);
    setLoading(false);
    if (!preferencesResult.ok) {
      setError(preferencesResult.error.message);
      return;
    }
    setFilters(preferencesResult.data);
    setLocationReady(
      profileResult.ok &&
        profileResult.data.private.locationConsent &&
        profileResult.data.private.latitude !== null &&
        profileResult.data.private.longitude !== null,
    );
  }, [services]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const toggleGender = (value: string) => {
    feedback('selection');
    setFilters((current) => {
      const exists = current.preferredGenders.includes(value);
      const nextGenders = exists
        ? current.preferredGenders.filter((item) => item !== value)
        : [...current.preferredGenders, value];
      return { ...current, preferredGenders: nextGenders };
    });
  };

  const toggleLanguage = (code: string) => {
    feedback('selection');
    setFilters((current) => {
      const exists = current.preferredLanguages.includes(code);
      const nextLangs = exists
        ? current.preferredLanguages.filter((item) => item !== code)
        : [...current.preferredLanguages, code];
      return { ...current, preferredLanguages: nextLangs };
    });
  };

  const resetFilters = () => {
    feedback('selection');
    setFilters(DEFAULT_FILTERS);
    snackbar.show({ message: 'Đã đặt lại tiêu chí về mặc định.', tone: 'neutral' });
  };

  const save = async () => {
    if (!services) return;
    const candidate = { ...filters, distanceKm: locationReady ? filters.distanceKm : null };
    const checked = validateDiscoveryFilters(candidate);
    if (!checked.ok) {
      setError(checked.error.message);
      feedback('error');
      return;
    }
    setBusy(true);
    setError('');
    const result = await services.preferences.save(checked.data);
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setFilters(result.data);
    snackbar.show({ message: 'Đã lưu bộ lọc thành công!', tone: 'success' });
    setTimeout(() => navigation.goBack(), 320);
  };

  if (!services) {
    return (
      <Screen>
        <StatePanel title="Chưa thể tải bộ lọc" description="Cấu hình dịch vụ đang thiếu." />
      </Screen>
    );
  }
  if (loading) {
    return (
      <Screen>
        <AsyncStatePanel state="loading" title="Đang tải bộ lọc" description="Đang đọc các tùy chọn của bạn." />
      </Screen>
    );
  }

  const actions = (
    <BottomActionBar>
      <AppButton
        label="Áp dụng bộ lọc"
        loading={busy}
        disabled={busy}
        trailingIcon="check"
        onPress={() => void save()}
      />
      <AppButton
        label="Đặt lại về mặc định"
        variant="quiet"
        disabled={busy}
        onPress={resetFilters}
      />
    </BottomActionBar>
  );

  return (
    <Screen footer={actions}>
      {/* Header Intro */}
      <View style={styles.intro}>
        <View style={styles.iconCircle}>
          <AppIcon name="filter" color={colors.primary} size={24} />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          Tùy chỉnh tìm kiếm
        </Text>
        <Text style={styles.body}>
          Khám phá những người phù hợp với sở thích và mong muốn của bạn.
        </Text>
      </View>

      {/* Error Banner */}
      {error ? (
        <View style={styles.errorBox}>
          <AppIcon name="error" color={colors.danger} size={18} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Age Section */}
      <AnimatedSection>
        <View style={styles.cardSection}>
          <RangeSliderField
            label="Độ tuổi mong muốn"
            min={18}
            max={99}
            low={filters.ageMin}
            high={filters.ageMax}
            onChange={(ageMin, ageMax) => setFilters((current) => ({ ...current, ageMin, ageMax }))}
          />
        </View>
      </AnimatedSection>

      {/* Gender Section */}
      <AnimatedSection>
        <View style={styles.cardSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Giới tính mong muốn</Text>
            <Text style={styles.sectionHint}>
              {filters.preferredGenders.length === 0 ? 'Mọi giới tính' : `${filters.preferredGenders.length} đã chọn`}
            </Text>
          </View>
          <Text style={styles.helperText}>Không chọn nghĩa là hiển thị tất cả mọi người.</Text>
          <View style={styles.genderGrid}>
            {GENDER_CHIPS.map((chip) => {
              const active = filters.preferredGenders.includes(chip.value);
              return (
                <AnimatedPressable
                  key={chip.value}
                  accessibilityRole="checkbox"
                  accessibilityLabel={chip.label}
                  accessibilityState={{ checked: active }}
                  onPress={() => toggleGender(chip.value)}
                  style={[styles.genderChip, active && styles.genderChipActive]}
                >
                  <AppIcon
                    name={chip.icon}
                    color={active ? colors.primaryPressed : colors.inkMuted}
                    size={18}
                  />
                  <Text style={[styles.genderChipLabel, active && styles.genderChipLabelActive]}>
                    {chip.label}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>
      </AnimatedSection>

      {/* Languages Section */}
      <AnimatedSection>
        <View style={styles.cardSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ngôn ngữ giao tiếp</Text>
            <Text style={styles.sectionHint}>
              {filters.preferredLanguages.length === 0 ? 'Tất cả' : `${filters.preferredLanguages.length} đã chọn`}
            </Text>
          </View>
          <Text style={styles.helperText}>Chọn ngôn ngữ bạn muốn trò chuyện.</Text>
          <View style={styles.languageTags}>
            {POPULAR_LANGUAGES.map((lang) => {
              const active = filters.preferredLanguages.includes(lang.code);
              return (
                <AnimatedPressable
                  key={lang.code}
                  accessibilityRole="checkbox"
                  accessibilityLabel={lang.label}
                  accessibilityState={{ checked: active }}
                  onPress={() => toggleLanguage(lang.code)}
                  style={[styles.langChip, active && styles.langChipActive]}
                >
                  <Text style={[styles.langChipText, active && styles.langChipTextActive]}>
                    {lang.label}
                  </Text>
                  {active ? (
                    <AppIcon name="check" color={colors.primaryPressed} size={14} />
                  ) : null}
                </AnimatedPressable>
              );
            })}
          </View>
        </View>
      </AnimatedSection>

      {/* Distance Section */}
      <AnimatedSection>
        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>Khoảng cách</Text>
          {!locationReady ? (
            <View style={styles.locationNotice}>
              <View style={styles.noticeIcon}>
                <AppIcon name="locationOff" color={colors.inkMuted} size={22} />
              </View>
              <View style={styles.noticeCopy}>
                <Text style={styles.noticeTitle}>Chưa bật vị trí</Text>
                <Text style={styles.noticeBody}>
                  Bật vị trí trong Hồ sơ để lọc theo khoảng cách. Tọa độ chính xác luôn được bảo mật riêng tư.
                </Text>
              </View>
              <AppButton
                label="Bật vị trí"
                variant="secondary"
                trailingIcon="forward"
                onPress={() => navigation.navigate('EditProfile')}
              />
            </View>
          ) : (
            <>
              <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <Text style={styles.switchTitle}>Không giới hạn khoảng cách</Text>
                  <Text style={styles.switchBody}>Tắt để chọn bán kính tìm kiếm quanh bạn.</Text>
                </View>
                <Switch
                  accessibilityLabel="Không giới hạn khoảng cách"
                  value={filters.distanceKm === null}
                  trackColor={{ false: colors.border, true: colors.primarySoft }}
                  thumbColor={filters.distanceKm === null ? colors.primary : colors.inkMuted}
                  onValueChange={(unlimited) => {
                    feedback(unlimited ? 'toggleOn' : 'toggleOff');
                    setFilters((current) => ({ ...current, distanceKm: unlimited ? null : 50 }));
                  }}
                />
              </View>
              {filters.distanceKm !== null ? (
                <ValueSliderField
                  label="Bán kính tối đa"
                  value={filters.distanceKm}
                  min={5}
                  max={200}
                  onChange={(distanceKm) => setFilters((current) => ({ ...current, distanceKm }))}
                />
              ) : null}
            </>
          )}
        </View>
      </AnimatedSection>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    gap: spacing.xs,
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    ...type.title,
    color: colors.ink,
    textAlign: 'center',
  },
  body: {
    ...type.body,
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: '#FFE5EC',
    marginBottom: spacing.sm,
  },
  errorText: {
    ...type.caption,
    color: colors.danger,
    flex: 1,
  },
  cardSection: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...type.subtitle,
    fontSize: 16,
    color: colors.ink,
    fontWeight: '700',
  },
  sectionHint: {
    ...type.caption,
    color: colors.primaryPressed,
    fontWeight: '600',
  },
  helperText: {
    ...type.caption,
    color: colors.inkMuted,
    marginTop: -spacing.xs,
  },
  genderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  genderChip: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: spacing.sm,
  },
  genderChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  genderChipLabel: {
    ...type.label,
    fontSize: 14,
    color: colors.inkMuted,
  },
  genderChipLabelActive: {
    color: colors.primaryPressed,
    fontWeight: '700',
  },
  languageTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  langChipText: {
    ...type.caption,
    fontSize: 13,
    color: colors.inkMuted,
    fontWeight: '500',
  },
  langChipTextActive: {
    color: colors.primaryPressed,
    fontWeight: '700',
  },
  locationNotice: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  noticeIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeCopy: {
    alignItems: 'center',
    gap: spacing.xxs,
  },
  noticeTitle: {
    ...type.subtitle,
    fontSize: 15,
    color: colors.ink,
    textAlign: 'center',
  },
  noticeBody: {
    ...type.caption,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  switchCopy: {
    flex: 1,
    gap: spacing.xxs,
    marginRight: spacing.sm,
  },
  switchTitle: {
    ...type.label,
    fontSize: 14,
    color: colors.ink,
  },
  switchBody: {
    ...type.caption,
    color: colors.inkMuted,
  },
});
