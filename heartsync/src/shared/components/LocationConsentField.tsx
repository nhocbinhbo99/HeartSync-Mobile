import { StyleSheet, Switch, Text, View } from 'react-native';
import { colors, radii, spacing, type } from '../theme/tokens';

type Props = { value: boolean; onChange: (value: boolean) => void; disabled?: boolean; hasCoordinates: boolean };

export function LocationConsentField({ value, onChange, disabled = false, hasCoordinates }: Props) {
  return <View style={styles.container}>
    <View style={styles.copy}>
      <Text style={styles.title}>Dùng vị trí cho bộ lọc khoảng cách</Text>
      <Text style={styles.body}>{value && hasCoordinates
        ? 'Đã có vị trí riêng tư. Người khác không nhìn thấy tọa độ của bạn.'
        : 'Khi tắt, bộ lọc khoảng cách sẽ tự chuyển thành không giới hạn.'}</Text>
    </View>
    <Switch accessibilityLabel="Dùng vị trí cho bộ lọc khoảng cách" value={value} disabled={disabled}
      onValueChange={onChange} trackColor={{ false: colors.disabled, true: colors.primarySoft }} thumbColor={value ? colors.primary : colors.inkMuted} />
  </View>;
}

const styles = StyleSheet.create({
  container: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md,
    backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  copy: { flex: 1, gap: spacing.xxs }, title: { ...type.label, color: colors.ink }, body: { ...type.caption, color: colors.inkMuted },
});
