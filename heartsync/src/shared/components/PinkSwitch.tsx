import { Image, Pressable, StyleSheet } from 'react-native';

import { brandAssets } from '../utils/avatarHelper';

type Props = {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  accessibilityLabel: string;
};

/** 3D Pink Romance pill toggle sliced from UI_UX_Design/components. */
export function PinkSwitch({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
}: Props) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      // Support fireEvent(switch, 'valueChange', nextValue) in unit tests
      {...({ onValueChange } as object)}
      style={({ pressed }) => [
        styles.wrap,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Image
        source={value ? brandAssets.toggleOn3d : brandAssets.toggleOff3d}
        style={styles.toggleImg}
        resizeMode="contain"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 64,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleImg: {
    width: 64,
    height: 28,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  disabled: {
    opacity: 0.5,
  },
});

