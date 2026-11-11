import { Modal, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../../shared/components/AppButton';
import { colors, radii, spacing, type } from '../../shared/theme/tokens';

export function ProComingSoonModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <View accessibilityViewIsModal style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>HeartSync Pro sắp ra mắt!</Text>
        <Text style={styles.body}>Tính năng nâng cấp và thêm lượt AI sẽ được cập nhật trong phiên bản tới. Bạn vẫn có thể tự chỉnh sửa hồ sơ miễn phí.</Text>
        <AppButton label="Đã hiểu" onPress={onClose} />
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(16,42,51,0.48)' },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md },
  title: { ...type.title, color: colors.ink },
  body: { ...type.body, color: colors.inkMuted },
});
