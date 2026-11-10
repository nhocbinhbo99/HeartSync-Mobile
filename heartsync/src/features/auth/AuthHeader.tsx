import { StyleSheet, View } from 'react-native';

import { AppIcon } from '../../shared/components/AppIcon';
import { AppText } from '../../shared/components/AppText';
import { colors, radii, spacing } from '../../shared/theme/tokens';

type Props = {
  title: string;
  body: string;
};

/** A consistent, non-decorative identity and hierarchy for auth routes. */
export function AuthHeader({ title, body }: Props) {
  return <View style={styles.container}>
    <View style={styles.brand}>
      <View accessible={false} style={styles.mark}><AppIcon name="shield" color={colors.ink} size={20} /></View>
      <AppText variant="label" tone="muted">HeartSync</AppText>
    </View>
    <AppText accessibilityRole="header" variant="display">{title}</AppText>
    <AppText tone="muted">{body}</AppText>
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  mark: { width: 40, height: 40, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
});
