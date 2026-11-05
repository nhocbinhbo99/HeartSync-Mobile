import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, type } from '../theme/tokens';
import { feedback } from '../motion/feedback';
import { AnimatedPressable } from './AnimatedPressable';
import { AppIcon } from './AppIcon';
import { InlineFieldError } from './InlineFieldError';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  error?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
};

export function NumberStepperField({ label, value, min, max, step = 1, unit, error, disabled = false, onChange }: Props) {
  const decreaseDisabled = disabled || value <= min;
  const increaseDisabled = disabled || value >= max;
  return <View style={styles.group}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.control, error && styles.errorBorder, disabled && styles.disabled]}>
      <StepButton label="Giảm" disabled={decreaseDisabled} onPress={() => onChange(Math.max(min, value - step))} />
      <Text accessibilityLiveRegion="polite" style={styles.value}>{value}{unit ? ` ${unit}` : ''}</Text>
      <StepButton label="Tăng" disabled={increaseDisabled} onPress={() => onChange(Math.min(max, value + step))} />
    </View>
    <InlineFieldError message={error} />
  </View>;
}

function StepButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return <AnimatedPressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled}
    onPress={() => { feedback('selection'); onPress(); }} style={styles.button}>
    <AppIcon name={label === 'Giảm' ? 'minus' : 'add'} color={colors.primaryPressed} size={22} />
  </AnimatedPressable>;
}

const styles = StyleSheet.create({
  group: { gap: spacing.xs }, label: { ...type.label, color: colors.ink },
  control: { minHeight: 56, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center' },
  button: { minWidth: 64, minHeight: 54, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
  value: { ...type.subtitle, color: colors.ink, flex: 1, textAlign: 'center', fontVariant: ['tabular-nums'] },
  errorBorder: { borderColor: colors.danger }, disabled: { opacity: 0.48 },
});
