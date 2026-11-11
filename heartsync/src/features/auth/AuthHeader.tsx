import { Image, StyleSheet, View } from 'react-native';

import { AppText } from '../../shared/components/AppText';
import { colors, fonts, spacing } from '../../shared/theme/tokens';
import { brandAssets } from '../../shared/utils/avatarHelper';

type Props = {
  title: string;
  body: string;
  align?: 'center' | 'left';
};

/** Pink Romance identity and hierarchy for auth routes. */
export function AuthHeader({ title, body, align = 'center' }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.brandStack}>
        <Image source={brandAssets.logoPink} style={styles.logoImage} resizeMode="contain" />
        <AppText style={styles.brand}>HeartSync</AppText>
      </View>
      <View style={[styles.copyWrap, align === 'left' ? styles.copyLeft : styles.copyCenter]}>
        <AppText
          accessibilityRole="header"
          style={[styles.title, align === 'left' ? styles.textLeft : styles.textCenter]}
        >
          {title}
        </AppText>
        <AppText
          tone="muted"
          style={[styles.body, align === 'left' ? styles.textLeft : styles.textCenter]}
        >
          {body}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  brandStack: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 4,
  },
  logoImage: {
    width: 58,
    height: 44,
  },
  brand: {
    fontFamily: fonts.extrabold,
    fontSize: 22,
    lineHeight: 28,
    color: colors.ink,
  },
  copyWrap: {
    gap: 4,
  },
  copyCenter: {
    alignItems: 'center',
  },
  copyLeft: {
    alignItems: 'flex-start',
  },
  title: {
    fontFamily: fonts.extrabold,
    fontSize: 26,
    lineHeight: 34,
    color: colors.ink,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.inkMuted,
  },
  textCenter: { textAlign: 'center' },
  textLeft: { textAlign: 'left' },
});
