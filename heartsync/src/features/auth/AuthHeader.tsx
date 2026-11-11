import { StyleSheet, View } from 'react-native';

import { AppText } from '../../shared/components/AppText';
import { colors, spacing } from '../../shared/theme/tokens';

type Props = {
  title: string;
  body: string;
};

/** A consistent Pink Romance identity and hierarchy for auth routes. */
export function AuthHeader({ title, body }: Props) {
  return <View style={styles.container}>
    <AppText tone="primary" style={styles.brand}>HeartSync</AppText>
    <AppText accessibilityRole="header" style={styles.title}>{title}</AppText>
    <AppText tone="muted">{body}</AppText>
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  brand: { fontSize: 32, lineHeight: 38, fontWeight: '700', marginBottom: spacing.xxl },
  title: { fontSize: 44, lineHeight: 52, fontWeight: '700', color: colors.ink, letterSpacing: -0.6 },
});
