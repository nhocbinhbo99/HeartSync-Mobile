import { useState } from 'react';
import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { colors, type } from '../theme/tokens';

type Props = {
  label: string;
  uri?: string;
  fallbackSource?: ImageSourcePropType;
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

export function Avatar({ label, uri, fallbackSource, size = 48 }: Props) {
  const [failedUri, setFailedUri] = useState<string>();
  const frame = { width: size, height: size, borderRadius: size / 2 };
  const activeUri = uri && failedUri !== uri ? uri : undefined;
  const source = activeUri ? { uri: activeUri } : fallbackSource;

  if (source) {
    return (
      <Image
        key={activeUri ?? 'fallback'}
        source={source}
        fadeDuration={0}
        onError={() => {
          if (activeUri) setFailedUri(activeUri);
        }}
        accessibilityLabel={label}
        accessibilityRole="image"
        accessibilityIgnoresInvertColors
        style={[styles.image, frame]}
      />
    );
  }

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={[styles.fallback, frame]}>
      <Text style={styles.initials}>{initials(label)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.surfaceMuted, borderWidth: 1.5, borderColor: colors.border },
  fallback: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { ...type.label, color: colors.primaryPressed },
});
