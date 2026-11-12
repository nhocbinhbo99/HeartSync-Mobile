import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from './AppButton';
import { AppIcon, type AppIconName } from './AppIcon';
import { colors, radii, spacing, type } from '../theme/tokens';

type Props = {
  eyebrow?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'neutral' | 'error';
  icon?: AppIconName;
};

export function StatePanel({
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
  tone = 'neutral',
  icon,
}: Props) {
  return (
    <View style={[styles.card, tone === 'error' ? styles.errorCard : undefined]}>
      {icon ? (
        <View style={[styles.iconFrame, tone === 'error' ? styles.errorIconFrame : undefined]}>
          <AppIcon
            name={icon}
            color={tone === 'error' ? colors.danger : '#FFFFFF'}
            size={22}
          />
        </View>
      ) : null}
      {eyebrow ? (
        <Text style={[styles.eyebrow, tone === 'error' ? styles.errorText : undefined]}>
          {eyebrow}
        </Text>
      ) : null}
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction ? (
        <AppButton
          label={actionLabel}
          onPress={onAction}
          variant={tone === 'error' ? 'danger' : 'secondary'}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },
  iconFrame: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    shadowColor: '#E6386F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  errorIconFrame: {
    backgroundColor: colors.dangerSoft,
    shadowOpacity: 0,
    elevation: 0,
  },
  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#F5C2CB',
    padding: spacing.lg,
  },
  eyebrow: {
    ...type.label,
    color: colors.primaryPressed,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  errorText: {
    color: colors.danger,
  },
  title: {
    ...type.title,
    color: colors.ink,
    textAlign: 'center',
  },
  description: {
    ...type.body,
    color: colors.inkMuted,
    textAlign: 'center',
  },
});
