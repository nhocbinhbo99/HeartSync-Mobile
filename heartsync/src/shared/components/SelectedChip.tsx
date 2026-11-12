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
      <Text style={styles.label}>{label}</Text>
      {onRemove ? (
        <View pointerEvents="none" accessible={false} style={styles.remove}>
          <AppIcon name="close" color={colors.primaryPressed} size={13} />
        </View>
      ) : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    borderRadius: radii.pill,
    backgroundColor: '#FFE8F0',
    borderWidth: 1,
    borderColor: '#F5B5CB',
    paddingHorizontal: 14,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#E6386F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    lineHeight: 18,
    color: colors.primaryPressed,
  },
  remove: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  disabled: { opacity: 0.55 },
});
