import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii } from '../theme/tokens';
import { feedback } from '../motion/feedback';
import { AnimatedPressable } from './AnimatedPressable';
import { AppIcon } from './AppIcon';

type Props = { label: string; onRemove?: () => void; disabled?: boolean };

export function SelectedChip({ label, onRemove, disabled = false }: Props) {
  return (
    <AnimatedPressable
      accessibilityRole={onRemove ? 'button' : 'text'}
      accessibilityLabel={onRemove ? `Bỏ chọn ${label}` : label}
      disabled={disabled || !onRemove}
      onPress={() => {
        if (onRemove) {
          feedback('selection');
          onRemove();
        }
      }}
      style={[styles.chip, disabled && styles.disabled]}
    >
      <View style={styles.accentDot} />
      <Text style={styles.label}>{label}</Text>
      {onRemove ? (
        <View pointerEvents="none" accessible={false} style={styles.remove}>
          <AppIcon name="close" color={colors.inkMuted} size={11} />
        </View>
      ) : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E5CAD6',
    paddingHorizontal: 14,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    shadowColor: '#24111A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  accentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    lineHeight: 18,
    color: colors.ink,
  },
  remove: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4EEF1',
    marginLeft: 2,
  },
  disabled: { opacity: 0.55 },
});
