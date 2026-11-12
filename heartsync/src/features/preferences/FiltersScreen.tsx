import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAppServices } from '../../services/AppServicesProvider';
import { validateDiscoveryFilters } from '../../shared/domain/filters';
import { AnimatedSection } from '../../shared/components/AnimatedSection';
import { AnimatedPressable } from '../../shared/components/AnimatedPressable';
import { AppButton } from '../../shared/components/AppButton';
import { AppIcon } from '../../shared/components/AppIcon';
import { AsyncStatePanel } from '../../shared/components/AsyncStatePanel';
import { BottomActionBar } from '../../shared/components/BottomActionBar';
import { IconButton } from '../../shared/components/IconButton';
import { PinkSwitch } from '../../shared/components/PinkSwitch';
import { RangeSliderField, ValueSliderField } from '../../shared/components/RangeFields';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import { useSnackbar } from '../../shared/components/Snackbar';
import { feedback } from '../../shared/motion/feedback';
import { colors, fonts, radii, spacing, type } from '../../shared/theme/tokens';
import type { DiscoveryFilters } from '../../shared/types/domain.types';
import type { RootStackParamList } from '../../navigation/types';

const DEFAULT_FILTERS: DiscoveryFilters = {
  ageMin: 18,
  ageMax: 99,
  distanceKm: null,
  preferredGenders: [],
  preferredLanguages: [],
};

const GENDER_PILLS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'woman', label: 'Nữ' },
  { value: 'man', label: 'Nam' },
  { value: 'nonbinary', label: 'Khác' },
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

  const selectGender = (value: string) => {
    feedback('selection');
    if (value === 'all') {
      setFilters((current) => ({ ...current, preferredGenders: [] }));
      return;
    }
    setFilters((current) => {
      const exists = current.preferredGenders.includes(value);
      const nextGenders = exists
        ? current.preferredGenders.filter((item) => item !== value)
        : [value];
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
    feedback('confirm');
    navigation.goBack();
  };

  const topHeader = (
    <View style={styles.topHeader}>
      <Text accessibilityRole="header" style={styles.topTitle}>
        Tùy chỉnh tìm kiếm
      </Text>
      <IconButton icon="close" label="Đóng bộ lọc" onPress={() => navigation.goBack()} />
    </View>
  );

  if (!services) {
    return (
      <Screen safeTop>
        {topHeader}
        <StatePanel title="Chưa thể tải bộ lọc" description="Cấu hình dịch vụ đang thiếu." />
      </Screen>
    );
  }
  if (loading) {
    return (
      <Screen safeTop>
        {topHeader}
        <AsyncStatePanel
          state="loading"
          title="Đang tải bộ lọc"
          description="Đang đọc các tùy chọn của bạn."
        />
      </Screen>
    );
  }

  const actions = (
    <BottomActionBar>
      <AppButton
        label="Áp dụng bộ lọc"
        loading={busy}
        disabled={busy}
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
    <Screen safeTop footer={actions} contentStyle={styles.page}>
      <View style={styles.sheetHandle} />
      {topHeader}

      {error ? (
        <View style={styles.errorBox}>
          <AppIcon name="error" color={colors.danger} size={18} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <AnimatedSection>
        <View style={styles.sectionBlock}>
          <RangeSliderField
            label="Độ tuổi"
            min={18}
            max={99}
            low={filters.ageMin}
            high={filters.ageMax}
            onChange={(ageMin, ageMax) =>
              setFilters((current) => ({ ...current, ageMin, ageMax }))
            }
          />
        </View>
      </AnimatedSection>

      <View style={styles.divider} />

      <AnimatedSection>
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Giới tính mong muốn</Text>
          <View style={styles.pillRow}>
            {GENDER_PILLS.map((pill) => {
              const active =
                pill.value === 'all'
                  ? filters.preferredGenders.length === 0
                  : filters.preferredGenders.includes(pill.value);
              return (
                <AnimatedPressable
                  key={pill.value}
                  accessibilityRole="button"
                  accessibilityLabel={pill.label}
                  accessibilityState={{ selected: active }}
                  onPress={() => selectGender(pill.value)}
                  style={[styles.choicePill, active && styles.choicePillActive]}
                >
                  <Text style={[styles.choicePillText, active && styles.choicePillTextActive]}>
                    {pill.label}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>
      </AnimatedSection>

      <View style={styles.divider} />

      <AnimatedSection>
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ngôn ngữ giao tiếp</Text>
            <Text style={styles.sectionHint}>
              {filters.preferredLanguages.length === 0
                ? 'Tất cả ngôn ngữ'
                : `${filters.preferredLanguages.length} đã chọn`}
            </Text>
          </View>
          <Text style={styles.helperText}>Chỉ chọn điều thật sự quan trọng với bạn.</Text>
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
                </AnimatedPressable>
              );
            })}
          </View>
        </View>
      </AnimatedSection>

      <View style={styles.divider} />

      <AnimatedSection>
        <View style={styles.sectionBlock}>
          {!locationReady ? (
            <View style={styles.locationCompactCard}>
              <View style={styles.locationCompactLeft}>
                <View style={styles.noticeIcon}>
                  <AppIcon name="location" color={colors.primaryPressed} size={18} />
                </View>
                <View style={styles.locationCompactCopy}>
                  <Text style={styles.noticeTitle}>Khoảng cách quanh bạn</Text>
                  <Text style={styles.noticeBody}>
                    Bật vị trí trong Hồ sơ để lọc theo km.
                  </Text>
                </View>
              </View>
              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel="Bật vị trí"
                onPress={() => navigation.navigate('EditProfile')}
                style={styles.enableLocBtn}
              >
                <Text style={styles.enableLocText}>Bật vị trí</Text>
              </AnimatedPressable>
            </View>
          ) : (
            <>
              <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <Text style={styles.sectionTitle}>Khoảng cách</Text>
                  <Text style={styles.switchBody}>
                    {filters.distanceKm === null
                      ? 'Đang hiển thị mọi khoảng cách'
                      : `Trong bán kính ${filters.distanceKm} km`}
                  </Text>
                </View>
                <PinkSwitch
                  accessibilityLabel="Giới hạn khoảng cách"
                  value={filters.distanceKm !== null}
                  onValueChange={(limited) => {
                    feedback(limited ? 'toggleOn' : 'toggleOff');
                    setFilters((current) => ({ ...current, distanceKm: limited ? 25 : null }));
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
  page: {
    backgroundColor: '#FFF7F9',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  sheetHandle: {
    width: 48,
    height: 5,
    borderRadius: 99,
    backgroundColor: '#F3C8D8',
    alignSelf: 'center',
    marginBottom: -4,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 46,
  },
  topTitle: {
    fontFamily: fonts.extrabold,
    fontSize: 24,
    lineHeight: 30,
    color: colors.ink,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.dangerSoft,
  },
  errorText: {
    ...type.caption,
    color: colors.danger,
    flex: 1,
  },
  sectionBlock: {
    gap: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#F5DCE6',
    marginVertical: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.ink,
  },
  sectionHint: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.primaryPressed,
  },
  helperText: {
    ...type.caption,
    fontSize: 13,
    color: colors.inkMuted,
    marginTop: -4,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 10,
  },
  choicePill: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3D6E2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  choicePillActive: {
    backgroundColor: colors.primaryPressed,
    borderColor: colors.primaryPressed,
    shadowColor: '#E6386F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  choicePillText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.ink,
  },
  choicePillTextActive: {
    fontFamily: fonts.bold,
    color: '#FFFFFF',
  },
  languageTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  langChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3D6E2',
  },
  langChipActive: {
    backgroundColor: colors.primaryPressed,
    borderColor: colors.primaryPressed,
  },
  langChipText: {
    fontFamily: fonts.semibold,
    fontSize: 13.5,
    color: colors.ink,
  },
  langChipTextActive: {
    fontFamily: fonts.bold,
    color: '#FFFFFF',
  },
  locationCompactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#F3D6E2',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    gap: spacing.sm,
  },
  locationCompactLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  noticeIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF0F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCompactCopy: {
    flex: 1,
    gap: 2,
  },
  noticeTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.ink,
  },
  noticeBody: {
    ...type.caption,
    fontSize: 12.5,
    color: colors.inkMuted,
  },
  enableLocBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: '#FFF0F5',
    borderWidth: 1,
    borderColor: '#F6C6D8',
  },
  enableLocText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.primaryPressed,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchCopy: {
    flex: 1,
    gap: 2,
    marginRight: spacing.sm,
  },
  switchBody: {
    ...type.caption,
    fontSize: 13,
    color: colors.inkMuted,
  },
});
