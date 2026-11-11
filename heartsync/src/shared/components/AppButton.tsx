import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, type ViewStyle } from 'react-native';
import { colors, componentSize, radii, spacing, type } from '../theme/tokens';
import { AnimatedPressable } from './AnimatedPressable';
import { AppIcon, type AppIconName } from './AppIcon';

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger';
type AppButtonProps = { label: string; onPress: () => void; variant?: ButtonVariant; disabled?: boolean;
  icon?: ReactNode; leadingIcon?: AppIconName; trailingIcon?: AppIconName; loading?: boolean; style?: ViewStyle; accessibilityHint?: string };
const variants = {
  primary: { background: colors.primary, border: colors.primary, text: colors.onPrimary },
  secondary: { background: colors.surface, border: colors.primary, text: colors.primaryPressed },
  quiet: { background: 'transparent', border: 'transparent', text: colors.primaryPressed },
  danger: { background: colors.surface, border: colors.danger, text: colors.danger },
} as const;

export function AppButton({ label, onPress, variant = 'primary', disabled = false, icon, leadingIcon, trailingIcon, loading = false, style, accessibilityHint }: AppButtonProps) {
  const palette = variants[variant];
  const isDisabled = disabled || loading;
  const contentColor = isDisabled ? colors.ink : palette.text;
  return (
    <AnimatedPressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }} disabled={isDisabled} disabledOpacity={1} onPress={onPress}
      rippleColor={variant === 'primary' ? 'rgba(255,255,255,0.22)' : 'rgba(230,56,111,0.12)'} style={[styles.base,
        { backgroundColor: palette.background, borderColor: palette.border }, isDisabled ? styles.disabled : undefined, style]}>
      {loading ? <ActivityIndicator color={contentColor} /> : leadingIcon ? <AppIcon name={leadingIcon} color={contentColor} size={20} /> : icon}
      <Text style={[styles.label, { color: contentColor }]}>{label}</Text>
      {trailingIcon && !loading ? <AppIcon name={trailingIcon} color={contentColor} size={20} /> : null}
    </AnimatedPressable>
  );
}
const styles = StyleSheet.create({
  base: { minHeight: componentSize.buttonHeight, borderRadius: radii.md, borderWidth: 1, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.xs },
  label: type.label, disabled: { backgroundColor: colors.disabled, borderColor: colors.border },
});
