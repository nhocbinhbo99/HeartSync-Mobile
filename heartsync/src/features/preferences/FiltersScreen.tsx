import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAppServices } from '../../services/AppServicesProvider';
import { validateDiscoveryFilters } from '../../shared/domain/filters';
import { AnimatedSection } from '../../shared/components/AnimatedSection';
import { AppButton } from '../../shared/components/AppButton';
import { AppIcon } from '../../shared/components/AppIcon';
import { AsyncStatePanel } from '../../shared/components/AsyncStatePanel';
import { BottomActionBar } from '../../shared/components/BottomActionBar';
import { MultiChoiceField } from '../../shared/components/ChoiceFields';
import { RangeSliderField, ValueSliderField } from '../../shared/components/RangeFields';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import { useSnackbar } from '../../shared/components/Snackbar';
import { feedback } from '../../shared/motion/feedback';
import { GENDER_OPTIONS, LANGUAGE_OPTIONS } from '../../shared/domain/profileOptions';
import { colors, radii, spacing, type } from '../../shared/theme/tokens';
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

  if (!services) return <Screen><StatePanel title="Chưa thể tải bộ lọc" description="Cấu hình dịch vụ đang thiếu." /></Screen>;
  if (loading) return <Screen><AsyncStatePanel state="loading" title="Đang tải bộ lọc" description="Đang đọc lựa chọn riêng của bạn." /></Screen>;

  return <Screen footer={<BottomActionBar><AppButton label="Lưu bộ lọc" loading={busy} disabled={busy} trailingIcon="check" onPress={() => void save()} /></BottomActionBar>}>
    <View style={styles.intro}>
      <View style={styles.iconCircle}><AppIcon name="filter" color={colors.primaryPressed} size={24} /></View>
      <Text accessibilityRole="header" style={styles.title}>Điều chỉnh gợi ý</Text>
      <Text style={styles.body}>Bạn luôn kiểm soát tiêu chí; các lựa chọn này chỉ thuộc về tài khoản của bạn.</Text>
    </View>
    <AnimatedSection><View style={styles.section}>
      <Text style={styles.sectionTitle}>Độ tuổi</Text>
      <RangeSliderField label="Khoảng tuổi mong muốn" min={18} max={120} low={filters.ageMin} high={filters.ageMax}
        onChange={(ageMin, ageMax) => setFilters((current) => ({ ...current, ageMin, ageMax }))} />
    </View></AnimatedSection>
    <AnimatedSection><View style={styles.section}>
      <Text style={styles.sectionTitle}>Bạn muốn gặp ai?</Text>
      <MultiChoiceField label="Giới tính" options={GENDER_OPTIONS} values={filters.preferredGenders}
        onChange={(preferredGenders) => setFilters((current) => ({ ...current, preferredGenders }))}
        helperText="Không chọn nghĩa là không giới hạn theo giới tính." searchable={false} />
      <MultiChoiceField label="Ngôn ngữ" options={LANGUAGE_OPTIONS} values={filters.preferredLanguages}
        onChange={(preferredLanguages) => setFilters((current) => ({ ...current, preferredLanguages }))}
        helperText="Không chọn nghĩa là không giới hạn theo ngôn ngữ." />
    </View></AnimatedSection>
    <AnimatedSection><View style={styles.section}>
      <Text style={styles.sectionTitle}>Khoảng cách</Text>
      {!locationReady ? <View style={styles.locationNotice}>
        <View style={styles.noticeIcon}><AppIcon name="locationOff" color={colors.inkMuted} size={22} /></View>
        <View style={styles.noticeCopy}><Text style={styles.noticeTitle}>Không giới hạn khoảng cách</Text><Text style={styles.noticeBody}>Bật vị trí trong Hồ sơ để lọc theo khoảng cách. Tọa độ chính xác luôn riêng tư.</Text></View>
        <AppButton label="Thiết lập" variant="secondary" trailingIcon="forward" onPress={() => navigation.navigate('EditProfile')} />
      </View> : <>
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}><Text style={styles.noticeTitle}>Không giới hạn khoảng cách</Text><Text style={styles.noticeBody}>Tắt để chọn bán kính tối đa.</Text></View>
          <Switch accessibilityLabel="Không giới hạn khoảng cách" value={filters.distanceKm === null} trackColor={{ false: colors.border, true: colors.primarySoft }}
            thumbColor={filters.distanceKm === null ? colors.primary : colors.inkMuted} onValueChange={(unlimited) => { feedback(unlimited ? 'toggleOn' : 'toggleOff'); setFilters((current) => ({ ...current, distanceKm: unlimited ? null : 50 })); }} />
        </View>
        {filters.distanceKm !== null ? <AnimatedSection><ValueSliderField label="Khoảng cách tối đa" value={filters.distanceKm} min={1} max={500}
          onChange={(distanceKm) => setFilters((current) => ({ ...current, distanceKm }))} /></AnimatedSection> : null}
      </>}
    </View></AnimatedSection>
    {error ? <View accessibilityLiveRegion="polite" style={styles.error}><AppIcon name="error" color={colors.danger} size={20} /><Text style={styles.errorText}>{error}</Text></View> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  intro: { gap: spacing.xs, marginBottom: spacing.xs }, iconCircle: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.title, color: colors.ink }, body: { ...type.body, color: colors.inkMuted },
  section: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.lg, gap: spacing.md }, sectionTitle: { ...type.subtitle, color: colors.ink },
  locationNotice: { borderRadius: radii.md, backgroundColor: colors.surfaceMuted, padding: spacing.md, gap: spacing.sm },
  noticeIcon: { width: 40, height: 40, borderRadius: radii.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  noticeCopy: { gap: spacing.xxs }, noticeTitle: { ...type.label, color: colors.ink }, noticeBody: { ...type.caption, color: colors.inkMuted },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.surfaceMuted, borderRadius: radii.md }, switchCopy: { flex: 1, gap: spacing.xxs },
  error: { borderWidth: 1, borderColor: colors.danger, borderRadius: radii.md, padding: spacing.sm, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs }, errorText: { ...type.caption, color: colors.danger, flex: 1 },
});
