import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii, spacing, type } from '../theme/tokens';

type Props = { label: string; onRemove?: () => void; disabled?: boolean };

export function SelectedChip({ label, onRemove, disabled = false }: Props) {
  return <Pressable accessibilityRole={onRemove ? 'button' : 'text'}
    accessibilityLabel={onRemove ? `Bỏ chọn ${label}` : label} disabled={disabled || !onRemove}
    onPress={onRemove} style={({ pressed }) => [styles.chip, pressed && styles.pressed, disabled && styles.disabled]}>
    <Text style={styles.label}>{label}</Text>
    {onRemove ? <Text aria-hidden style={styles.remove}>Bỏ</Text> : null}
  </Pressable>;
}

const styles = StyleSheet.create({
  chip: { minHeight: 48, borderRadius: radii.md, backgroundColor: colors.primarySoft, borderWidth: 1,
    borderColor: colors.primary, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  label: { ...type.label, color: colors.primaryPressed },
  remove: { ...type.caption, color: colors.primaryPressed },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.55 },
});
