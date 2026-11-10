import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, type } from '../theme/tokens';

type Props = {
  label: string;
  uri?: string;
  size?: number;
};

function initials(label: string) {
  return label
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase('vi-VN');
}

/** Shows a real profile image when available and a clearly non-photographic fallback otherwise. */
export function Avatar({ label, uri, size = 48 }: Props) {
  const frame = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} accessibilityLabel={label} accessibilityRole="image"
    accessibilityIgnoresInvertColors style={[styles.image, frame]} />;

  return <View accessible accessibilityRole="image" accessibilityLabel={label} style={[styles.fallback, frame]}>
    <Text style={styles.initials}>{initials(label)}</Text>
  </View>;
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
  fallback: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  initials: { ...type.label, color: colors.primaryPressed },
});
