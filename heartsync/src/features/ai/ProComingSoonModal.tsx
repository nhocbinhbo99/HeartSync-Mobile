import { Image, Modal, StyleSheet, View } from 'react-native';

import { AppButton } from '../../shared/components/AppButton';
import { AppIcon } from '../../shared/components/AppIcon';
import { AppText } from '../../shared/components/AppText';
import { colors, fonts, radii, spacing } from '../../shared/theme/tokens';
import { brandAssets } from '../../shared/utils/avatarHelper';

export function ProComingSoonModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.card}>
          <View style={styles.badgeWrap}>
            <View style={styles.badgeCircle}>
              <Image source={brandAssets.pinkButtonGradient} style={StyleSheet.absoluteFill} resizeMode="stretch" />
              <AppIcon name="sparkle" color="#FFFFFF" size={26} />
            </View>
            <View style={styles.proPill}>
              <AppText style={styles.proPillText}>HeartSync Pro</AppText>
            </View>
          </View>

          <View style={styles.copy}>
            <AppText accessibilityRole="header" style={styles.title}>
              HeartSync Pro sắp ra mắt!
            </AppText>
            <AppText tone="muted" style={styles.body}>
              Tính năng nâng cấp và thêm lượt AI sẽ được cập nhật trong phiên bản tới. Bạn vẫn có thể tự chỉnh sửa hồ sơ miễn phí.
            </AppText>
          </View>

          <AppButton label="Đã hiểu" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(38, 14, 26, 0.52)',
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: '#F5D6E2',
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: '#D65B88',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
  },
  badgeWrap: {
    alignItems: 'center',
    gap: 8,
  },
  badgeCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#E6386F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  proPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAD6DF',
  },
  proPillText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.primaryPressed,
  },
  copy: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontFamily: fonts.extrabold,
    fontSize: 22,
    lineHeight: 28,
    color: colors.ink,
    textAlign: 'center',
  },
  body: {
    fontSize: 14.5,
    lineHeight: 22,
    textAlign: 'center',
  },
});
