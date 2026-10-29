import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radii, spacing, type } from '../theme/tokens';

type Props = TextInputProps & { label: string; error?: string };
export function AppTextField({ label, error, style, ...inputProps }: Props) {
  return <View style={styles.group}>
    <Text style={styles.label}>{label}</Text>
    <TextInput accessibilityLabel={label} accessibilityHint={error} placeholderTextColor={colors.inkMuted}
      style={[styles.input, error ? styles.inputError : undefined, style]} {...inputProps} />
    {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  group: { gap: spacing.xs }, label: { ...type.label, color: colors.ink },
  input: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    backgroundColor: colors.background, paddingHorizontal: spacing.md, color: colors.ink, fontSize: 16 },
  inputError: { borderColor: colors.danger }, error: { ...type.caption, color: colors.danger },
});
