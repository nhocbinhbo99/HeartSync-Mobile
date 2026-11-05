import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, type } from '../theme/tokens';
import { feedback } from '../motion/feedback';
import { AnimatedPressable } from './AnimatedPressable';
import { AppIcon } from './AppIcon';

type Props = { label: string; onRemove?: () => void; disabled?: boolean };

export function SelectedChip({ label, onRemove, disabled = false }: Props) {
  return <AnimatedPressable accessibilityRole={onRemove ? 'button' : 'text'}
    accessibilityLabel={onRemove ? `Bỏ chọn ${label}` : label} disabled={disabled || !onRemove}
    onPress={() => { if (onRemove) { feedback('selection'); onRemove(); } }} style={styles.chip}>
    <Text style={styles.label}>{label}</Text>
    {onRemove ? <View pointerEvents="none" accessible={false} style={styles.remove}><AppIcon name="close" color={colors.primaryPressed} size={16} /></View> : null}
  </AnimatedPressable>;
}

const styles = StyleSheet.create({
  chip: { minHeight: 48, borderRadius: radii.md, backgroundColor: colors.primarySoft, borderWidth: 1,
    borderColor: colors.primary, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  label: { ...type.label, color: colors.primaryPressed },
  remove: { width: 22, height: 22, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  disabled: { opacity: 0.55 },
});
