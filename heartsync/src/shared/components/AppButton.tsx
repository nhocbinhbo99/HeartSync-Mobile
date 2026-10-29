import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { colors, radii, spacing, type } from '../theme/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger';
type AppButtonProps = { label: string; onPress: () => void; variant?: ButtonVariant; disabled?: boolean;
  icon?: ReactNode; style?: ViewStyle; accessibilityHint?: string };
const variants = {
  primary: { background: colors.primary, border: colors.primary, text: colors.onPrimary },
  secondary: { background: colors.surface, border: colors.primary, text: colors.primaryPressed },
  quiet: { background: 'transparent', border: 'transparent', text: colors.primaryPressed },
  danger: { background: colors.surface, border: colors.danger, text: colors.danger },
} as const;

export function AppButton({ label, onPress, variant = 'primary', disabled = false, icon, style, accessibilityHint }: AppButtonProps) {
  const palette = variants[variant];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={accessibilityHint}
      disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.base,
        { backgroundColor: palette.background, borderColor: palette.border },
        pressed && !disabled ? styles.pressed : undefined, disabled ? styles.disabled : undefined, style]}>
      {icon}<Text style={[styles.label, { color: disabled ? colors.ink : palette.text }]}>{label}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  base: { minHeight: 48, borderRadius: radii.md, borderWidth: 1, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.xs },
  label: type.label, pressed: { opacity: 0.78 }, disabled: { backgroundColor: colors.disabled, borderColor: colors.border },
});
