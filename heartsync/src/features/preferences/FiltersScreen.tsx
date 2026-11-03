import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAppServices } from '../../services/AppServicesProvider';
import { validateDiscoveryFilters } from '../../shared/domain/filters';
import { AppButton } from '../../shared/components/AppButton';
import { AsyncStatePanel } from '../../shared/components/AsyncStatePanel';
import { MultiChoiceField } from '../../shared/components/ChoiceFields';
import { NumberStepperField } from '../../shared/components/NumberStepperField';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import { GENDER_OPTIONS, LANGUAGE_OPTIONS } from '../../shared/domain/profileOptions';
import { colors, radii, spacing, type } from '../../shared/theme/tokens';
import type { DiscoveryFilters } from '../../shared/types/domain.types';
import type { RootStackParamList } from '../../navigation/types';

const DEFAULT_FILTERS: DiscoveryFilters = { ageMin: 18, ageMax: 99, distanceKm: null, preferredGenders: [], preferredLanguages: [] };

export function FiltersScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Filters'>) {
  const services = useAppServices();
  const [filters, setFilters] = useState<DiscoveryFilters>(DEFAULT_FILTERS);
  const [locationReady, setLocationReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!services) return;
    setLoading(true);
    setError('');
    const [preferencesResult, profileResult] = await Promise.all([
      services.preferences.get(),
      services.profile.getMine(),
    ]);
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
    if (!checked.ok) { setError(checked.error.message); return; }
    setBusy(true);
    setError('');
    setNotice('');
    const result = await services.preferences.save(checked.data);
    setBusy(false);
    if (!result.ok) { setError(result.error.message); return; }
    setFilters(result.data);
    setNotice('Đã lưu bộ lọc. Khám phá sẽ tải lại khi bạn quay về.');
    setTimeout(() => navigation.goBack(), 450);
  };

  if (!services) return <Screen><StatePanel title="Chưa thể tải bộ lọc" description="Cấu hình dịch vụ đang thiếu." /></Screen>;
  if (loading) return <Screen><AsyncStatePanel state="loading" title="Đang tải bộ lọc" description="Đang đọc lựa chọn riêng của bạn." /></Screen>;
  return <Screen>
    <View style={styles.intro}>
      <Text accessibilityRole="header" style={styles.title}>Bộ lọc khám phá</Text>
      <Text style={styles.body}>Chọn nhiều giới tính hoặc ngôn ngữ nếu bạn muốn mở rộng gợi ý. Các lựa chọn này chỉ thuộc về tài khoản của bạn.</Text>
    </View>
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Khoảng tuổi</Text>
      <NumberStepperField label="Tuổi tối thiểu" value={filters.ageMin} min={18} max={filters.ageMax}
        onChange={(ageMin) => setFilters((current) => ({ ...current, ageMin }))} />
      <NumberStepperField label="Tuổi tối đa" value={filters.ageMax} min={filters.ageMin} max={120}
        onChange={(ageMax) => setFilters((current) => ({ ...current, ageMax }))} />
    </View>
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Người bạn muốn gặp</Text>
      <MultiChoiceField label="Giới tính mong muốn" options={GENDER_OPTIONS} values={filters.preferredGenders}
        onChange={(preferredGenders) => setFilters((current) => ({ ...current, preferredGenders }))}
        helperText="Không chọn mục nào nghĩa là không giới hạn theo giới tính." searchable={false} />
      <MultiChoiceField label="Ngôn ngữ" options={LANGUAGE_OPTIONS} values={filters.preferredLanguages}
        onChange={(preferredLanguages) => setFilters((current) => ({ ...current, preferredLanguages }))}
        helperText="Không chọn mục nào nghĩa là không giới hạn theo ngôn ngữ." />
    </View>
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Khoảng cách</Text>
      {!locationReady ? <StatePanel title="Không giới hạn khoảng cách"
        description="Bật vị trí trong Hồ sơ để dùng bộ lọc khoảng cách. Tọa độ chính xác không hiển thị cho người khác."
        actionLabel="Mở hồ sơ" onAction={() => navigation.navigate('EditProfile')} /> : <>
        <AppButton label={filters.distanceKm === null ? 'Bật lọc khoảng cách' : 'Tắt giới hạn khoảng cách'}
          variant="secondary" onPress={() => setFilters((current) => ({ ...current, distanceKm: current.distanceKm === null ? 50 : null }))} />
        {filters.distanceKm !== null ? <NumberStepperField label="Khoảng cách tối đa" value={filters.distanceKm}
          min={1} max={500} step={5} unit="km" onChange={(distanceKm) => setFilters((current) => ({ ...current, distanceKm }))} /> : null}
      </>}
    </View>
    {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
    {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
    <AppButton label={busy ? 'Đang lưu…' : 'Lưu bộ lọc'} disabled={busy} onPress={() => void save()} />
    <AppButton label="Quay lại" variant="quiet" disabled={busy} onPress={() => navigation.goBack()} />
  </Screen>;
}

const styles = StyleSheet.create({
  intro: { gap: spacing.xs }, title: { ...type.title, color: colors.ink }, body: { ...type.body, color: colors.inkMuted },
  section: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg,
    padding: spacing.lg, gap: spacing.md }, sectionTitle: { ...type.subtitle, color: colors.ink },
  error: { ...type.body, color: colors.danger }, notice: { ...type.body, color: colors.success },
});
