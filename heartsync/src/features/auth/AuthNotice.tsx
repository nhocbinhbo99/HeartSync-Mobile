import { StyleSheet, View } from 'react-native';

import { AppIcon } from '../../shared/components/AppIcon';
import { AppText } from '../../shared/components/AppText';
import { colors, radii, spacing } from '../../shared/theme/tokens';

type Props = { tone: 'success' | 'error'; message: string };

export function AuthNotice({ tone, message }: Props) {
  const isSuccess = tone === 'success';
  const color = isSuccess ? colors.success : colors.danger;
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.notice,
        {
          borderColor: color,
          backgroundColor: isSuccess ? colors.successSoft : colors.dangerSoft,
        },
      ]}
    >
      <AppIcon name={isSuccess ? 'checkCircle' : 'error'} color={color} size={20} />
      <AppText variant="caption" tone={isSuccess ? 'success' : 'danger'} style={styles.message}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: spacing.xs,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  message: { flex: 1 },
});

