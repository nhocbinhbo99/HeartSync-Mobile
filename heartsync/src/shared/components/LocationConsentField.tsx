import { StyleSheet, Switch, Text, View } from 'react-native';
import { feedback } from '../motion/feedback';
import { colors, radii, spacing, type } from '../theme/tokens';
import { AppIcon } from './AppIcon';

type Props = { value: boolean; onChange: (value: boolean) => void; disabled?: boolean; hasCoordinates: boolean };

export function LocationConsentField({ value, onChange, disabled = false, hasCoordinates }: Props) {
  return <View style={styles.container}>
    <View style={styles.icon}><AppIcon name={value && hasCoordinates ? 'location' : 'locationOff'} color={value && hasCoordinates ? colors.primaryPressed : colors.inkMuted} size={21} /></View>
    <View style={styles.copy}>
      <Text style={styles.title}>Dùng vị trí cho bộ lọc khoảng cách</Text>
      <Text style={styles.body}>{value && hasCoordinates
        ? 'Đã có vị trí riêng tư. Người khác không nhìn thấy tọa độ của bạn.'
        : 'Khi tắt, bộ lọc khoảng cách sẽ tự chuyển thành không giới hạn.'}</Text>
    </View>
    <Switch accessibilityLabel="Dùng vị trí cho bộ lọc khoảng cách" value={value} disabled={disabled}
      onValueChange={(next) => { feedback(next ? 'toggleOn' : 'toggleOff'); onChange(next); }} trackColor={{ false: colors.disabled, true: colors.primarySoft }} thumbColor={value ? colors.primary : colors.inkMuted} />
  </View>;
}

const styles = StyleSheet.create({
  container: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md,
    backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 40, height: 40, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: spacing.xxs }, title: { ...type.label, color: colors.ink }, body: { ...type.caption, color: colors.inkMuted },
});
