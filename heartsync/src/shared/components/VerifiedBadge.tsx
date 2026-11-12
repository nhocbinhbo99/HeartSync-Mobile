import { Image, StyleSheet } from 'react-native';

import { brandAssets } from '../utils/avatarHelper';

type Props = {
  size?: number;
};

/** 3D Pink Romance Rosette Verified Badge sliced from UI_UX_Design/components. */
export function VerifiedBadge({ size = 24 }: Props) {
  return (
    <Image
      accessible={false}
      source={brandAssets.verifiedBadge3d}
      style={[styles.badge, { width: size, height: size }]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 24,
    height: 24,
  },
});

