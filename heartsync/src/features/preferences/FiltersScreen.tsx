import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAppServices } from '../../services/AppServicesProvider';
import { validateDiscoveryFilters } from '../../shared/domain/filters';
import { AppButton } from '../../shared/components/AppButton';
import { AppTextField } from '../../shared/components/AppTextField';
import { AsyncStatePanel } from '../../shared/components/AsyncStatePanel';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import { colors, type } from '../../shared/theme/tokens';
import type { DiscoveryFilters } from '../../shared/types/domain.types';
import type { RootStackParamList } from '../../navigation/types';

const csv = (value: string) => [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))];

export function FiltersScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Filters'>) {
  const services = useAppServices();
  const [filters, setFilters] = useState<DiscoveryFilters>({ ageMin: 18, ageMax: 99, distanceKm: null, preferredGenders: [], preferredLanguages: [] });
  const [genders, setGenders] = useState('');
  const [languages, setLanguages] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!services) return;
    setLoading(true); const result = await services.preferences.get(); setLoading(false);
    if (result.ok) { setFilters(result.data); setGenders(result.data.preferredGenders.join(', ')); setLanguages(result.data.preferredLanguages.join(', ')); } else setError(result.error.message);
  }, [services]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  const save = async () => {
    if (!services) return;
    const candidate = { ...filters, preferredGenders: csv(genders), preferredLanguages: csv(languages) };
    const checked = validateDiscoveryFilters(candidate);
    if (!checked.ok) { setError(checked.error.message); return; }
    setBusy(true); setError(''); const result = await services.preferences.save(checked.data); setBusy(false);
    if (!result.ok) { setError(result.error.message); return; }
    navigation.goBack();
  };
  if (!services) return <Screen><StatePanel title="Chưa thể tải bộ lọc" description="Cấu hình dịch vụ đang thiếu." /></Screen>;
  if (loading) return <Screen><AsyncStatePanel state="loading" title="Đang tải bộ lọc" description="Đang đọc lựa chọn riêng của bạn." /></Screen>;
  return <Screen keyboardAware>
    <Text accessibilityRole="header" style={styles.title}>Bộ lọc khám phá</Text>
    <Text style={styles.body}>Chỉ hồ sơ công khai đủ điều kiện mới được gợi ý. Không có ngày sinh, email hoặc tọa độ nào được hiển thị.</Text>
    <AppTextField label="Tuổi tối thiểu" value={String(filters.ageMin)} onChangeText={(value) => setFilters((current) => ({ ...current, ageMin: Number(value) }))} keyboardType="number-pad" />
    <AppTextField label="Tuổi tối đa" value={String(filters.ageMax)} onChangeText={(value) => setFilters((current) => ({ ...current, ageMax: Number(value) }))} keyboardType="number-pad" />
    <AppTextField label="Giới tính quan tâm, cách nhau bằng dấu phẩy" value={genders} onChangeText={setGenders} placeholder="woman, man" />
    <AppTextField label="Ngôn ngữ quan tâm, cách nhau bằng dấu phẩy" value={languages} onChangeText={setLanguages} placeholder="vi, en" />
    <StatePanel title="Khoảng cách" description={filters.distanceKm === null ? 'Bạn chưa bật vị trí riêng tư trong Hồ sơ, nên khoảng cách không được áp dụng.' : `Chỉ gợi ý trong phạm vi ${filters.distanceKm} km.`} />
    {filters.distanceKm !== null ? <AppTextField label="Khoảng cách (km)" value={String(filters.distanceKm)} onChangeText={(value) => setFilters((current) => ({ ...current, distanceKm: Number(value) }))} keyboardType="number-pad" /> : null}
    {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
    <AppButton label={busy ? 'Đang lưu…' : 'Lưu bộ lọc'} disabled={busy} onPress={() => void save()} />
    <AppButton label="Quay lại" variant="quiet" onPress={() => navigation.goBack()} />
  </Screen>;
}

const styles = StyleSheet.create({ title: { ...type.title, color: colors.ink }, body: { ...type.body, color: colors.inkMuted }, error: { ...type.caption, color: colors.danger } });
