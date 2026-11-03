import { StyleSheet, Text, View, type TextInputProps } from 'react-native';
import { AppTextField } from './AppTextField';
import { colors, spacing, type } from '../theme/tokens';

type Props = TextInputProps & {
  label: string;
  error?: string;
  helperText?: string;
  showCharacterCount?: boolean;
};

export function FormField({ label, error, helperText, showCharacterCount = false, maxLength, value, ...props }: Props) {
  return <View style={styles.group}>
    <AppTextField label={label} error={error} maxLength={maxLength} value={value} {...props} />
    {helperText || (showCharacterCount && maxLength) ? <View style={styles.meta}>
      <Text style={styles.helper}>{helperText}</Text>
      {showCharacterCount && maxLength ? <Text style={styles.counter}>{value?.length ?? 0}/{maxLength}</Text> : null}
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  group: { gap: spacing.xxs },
  meta: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  helper: { ...type.caption, color: colors.inkMuted, flex: 1 },
  counter: { ...type.caption, color: colors.inkMuted, fontVariant: ['tabular-nums'] },
});
