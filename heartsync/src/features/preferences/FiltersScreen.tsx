import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAppServices } from '../../services/AppServicesProvider';
import { validateDiscoveryFilters } from '../../shared/domain/filters';
import { AnimatedSection } from '../../shared/components/AnimatedSection';
import { AnimatedPressable } from '../../shared/components/AnimatedPressable';
import { AppButton } from '../../shared/components/AppButton';
import { AppIcon } from '../../shared/components/AppIcon';
import { AppText } from '../../shared/components/AppText';
import { AsyncStatePanel } from '../../shared/components/AsyncStatePanel';
import { BottomActionBar } from '../../shared/components/BottomActionBar';
import { IconButton } from '../../shared/components/IconButton';
import { MultiChoiceField } from '../../shared/components/ChoiceFields';
import { RangeSliderField, ValueSliderField } from '../../shared/components/RangeFields';
import { Screen } from '../../shared/components/Screen';
import { SectionHeader } from '../../shared/components/SectionHeader';
import { StatePanel } from '../../shared/components/StatePanel';
import { useSnackbar } from '../../shared/components/Snackbar';
import { feedback } from '../../shared/motion/feedback';
import { GENDER_OPTIONS, LANGUAGE_OPTIONS } from '../../shared/domain/profileOptions';
import { colors, radii, spacing } from '../../shared/theme/tokens';
import type { DiscoveryFilters } from '../../shared/types/domain.types';
import type { RootStackParamList } from '../../navigation/types';

const DEFAULT_FILTERS: DiscoveryFilters = { ageMin: 18, ageMax: 99, distanceKm: null, preferredGenders: [], preferredLanguages: [] };

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
    const [preferencesResult, profileResult] = await Promise.all([services.preferences.get(), services.profile.getMine()]);
    setLoading(false);
    if (!preferencesResult.ok) { setError(preferencesResult.error.message); return; }
    setFilters(preferencesResult.data);
    setLocationReady(profileResult.ok && profileResult.data.private.locationConsent
      && profileResult.data.private.latitude !== null && profileResult.data.private.longitude !== null);
  }, [services]);

  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  const save = async () => {
    if (!services) return;
    const candidate = { ...filters, distanceKm: locationReady ? filters.distanceKm : null };
    const checked = validateDiscoveryFilters(candidate);
    if (!checked.ok) { setError(checked.error.message); feedback('error'); return; }
    setBusy(true);
    setError('');
    const result = await services.preferences.save(checked.data);
    setBusy(false);
    if (!result.ok) { setError(result.error.message); return; }
    setFilters(result.data);
    snackbar.show({ message: 'Đã lưu bộ lọc. Khám phá sẽ cập nhật gợi ý mới.', tone: 'success' });
    setTimeout(() => navigation.goBack(), 360);
  };

  const toggleGender = (value: string) => setFilters((current) => ({
    ...current,
    preferredGenders: current.preferredGenders.includes(value)
      ? current.preferredGenders.filter((item) => item !== value)
      : [...current.preferredGenders, value],
  }));

  if (!services) return <Screen><StatePanel title="Chưa thể tải bộ lọc" description="Cấu hình dịch vụ đang thiếu." /></Screen>;
  if (loading) return <Screen><AsyncStatePanel state="loading" title="Đang tải bộ lọc" description="Đang đọc lựa chọn riêng của bạn." /></Screen>;

  return <Screen safeTop contentStyle={styles.filterScreen} footer={<BottomActionBar><AppButton label="Áp dụng bộ lọc" loading={busy} disabled={busy} trailingIcon="check" onPress={() => void save()} style={styles.applyButton} /><AppButton label="Đặt lại" variant="quiet" disabled={busy} onPress={() => setFilters({ ...DEFAULT_FILTERS, distanceKm: locationReady ? 50 : null })} /></BottomActionBar>}>
    <View style={styles.filterHeader}>
      <IconButton icon="back" label="Quay lại Khám phá" onPress={() => navigation.goBack()} />
      <AppText accessibilityRole="header" style={styles.filterTitle}>Tùy chỉnh tìm kiếm</AppText>
      <IconButton icon="close" label="Đóng bộ lọc" onPress={() => navigation.goBack()} />
    </View>
    <AnimatedSection><View style={styles.section}>
      <SectionHeader title="Độ tuổi" action={<AppText variant="label" tone="primary">{filters.ageMin} – {filters.ageMax}</AppText>} />
      <RangeSliderField label="Khoảng tuổi mong muốn" min={18} max={120} low={filters.ageMin} high={filters.ageMax}
        onChange={(ageMin, ageMax) => setFilters((current) => ({ ...current, ageMin, ageMax }))} />
    </View></AnimatedSection>
    <AnimatedSection><View style={styles.section}>
      <SectionHeader title="Giới tính mong muốn" description="Không chọn nghĩa là không giới hạn." />
      <View style={styles.genderChoices}>{GENDER_OPTIONS.map((option) => {
        const selected = filters.preferredGenders.includes(option.value);
        return <AnimatedPressable key={option.value} accessibilityRole="checkbox" accessibilityLabel={option.label} accessibilityState={{ checked: selected }} onPress={() => toggleGender(option.value)} style={[styles.genderChoice, selected && styles.genderChoiceSelected]}><AppText variant="label" tone={selected ? 'onPrimary' : 'default'}>{option.label}</AppText></AnimatedPressable>;
      })}</View>
    </View></AnimatedSection>
    <AnimatedSection><View style={styles.section}>
      <SectionHeader title="Ngôn ngữ" description="Chọn nếu bạn muốn giới hạn theo ngôn ngữ." />
      <MultiChoiceField label="Ngôn ngữ" options={LANGUAGE_OPTIONS} values={filters.preferredLanguages}
        onChange={(preferredLanguages) => setFilters((current) => ({ ...current, preferredLanguages }))}
        helperText="Không chọn nghĩa là không giới hạn theo ngôn ngữ." />
    </View></AnimatedSection>
    <AnimatedSection><View style={styles.section}>
      <SectionHeader title="Khoảng cách" description="Vị trí chính xác không xuất hiện trên hồ sơ công khai." />
      {!locationReady ? <View style={styles.locationNotice}>
        <View style={styles.noticeIcon}><AppIcon name="locationOff" color={colors.inkMuted} size={22} /></View>
        <View style={styles.noticeCopy}><AppText variant="label">Không giới hạn khoảng cách</AppText><AppText variant="caption" tone="muted">Bật vị trí trong Hồ sơ để lọc theo khoảng cách. Tọa độ chính xác luôn riêng tư.</AppText></View>
        <AppButton label="Thiết lập" variant="secondary" trailingIcon="forward" onPress={() => navigation.navigate('EditProfile')} />
      </View> : <>
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}><AppText variant="label">Không giới hạn khoảng cách</AppText><AppText variant="caption" tone="muted">Tắt để chọn bán kính tối đa.</AppText></View>
          <Switch accessibilityLabel="Không giới hạn khoảng cách" value={filters.distanceKm === null} trackColor={{ false: colors.border, true: colors.primarySoft }}
            thumbColor={filters.distanceKm === null ? colors.primary : colors.inkMuted} onValueChange={(unlimited) => { feedback(unlimited ? 'toggleOn' : 'toggleOff'); setFilters((current) => ({ ...current, distanceKm: unlimited ? null : 50 })); }} />
        </View>
        {filters.distanceKm !== null ? <AnimatedSection><ValueSliderField label="Khoảng cách tối đa" value={filters.distanceKm} min={1} max={500}
          onChange={(distanceKm) => setFilters((current) => ({ ...current, distanceKm }))} /></AnimatedSection> : null}
      </>}
    </View></AnimatedSection>
    {error ? <View accessibilityLiveRegion="polite" style={styles.error}><AppIcon name="error" color={colors.danger} size={20} /><AppText variant="caption" tone="danger" style={styles.errorText}>{error}</AppText></View> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  filterScreen: { paddingTop: spacing.sm, gap: spacing.xl },
  filterHeader: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginHorizontal: -spacing.xs },
  filterTitle: { flex: 1, fontSize: 34, lineHeight: 40, fontWeight: '700', color: colors.ink, letterSpacing: -0.4 },
  section: { gap: spacing.md },
  genderChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  genderChoice: { minHeight: 52, minWidth: '46%', flexGrow: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center' },
  genderChoiceSelected: { borderColor: colors.primary, backgroundColor: colors.primaryPressed },
  locationNotice: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: spacing.md, gap: spacing.sm },
  noticeIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  noticeCopy: { gap: spacing.xxs },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radii.md }, switchCopy: { flex: 1, gap: spacing.xxs },
  applyButton: { minHeight: 58, borderRadius: 20 },
  error: { borderWidth: 1, borderColor: colors.danger, borderRadius: radii.md, padding: spacing.sm, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs }, errorText: { flex: 1 },
});
