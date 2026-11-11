import { StyleSheet, View } from 'react-native';

import { AppIcon } from '../../shared/components/AppIcon';
import { AppText } from '../../shared/components/AppText';
import { colors, fonts, radii, spacing } from '../../shared/theme/tokens';

type Props = {
  title: string;
  body: string;
};

/** Pink Romance identity and hierarchy for auth routes. */
export function AuthHeader({ title, body }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <View style={styles.brandBadge}>
          <AppIcon name="heart" color={colors.primary} size={22} />
        </View>
        <AppText tone="primary" style={styles.brand}>
          HeartSync
        </AppText>
      </View>
      <AppText accessibilityRole="header" style={styles.title}>
        {title}
      </AppText>
      <AppText tone="muted" style={styles.body}>
        {body}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  brandBadge: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontFamily: fonts.extrabold,
    fontSize: 26,
    lineHeight: 32,
  },
  title: {
    fontFamily: fonts.extrabold,
    fontSize: 32,
    lineHeight: 40,
    color: colors.ink,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
});
