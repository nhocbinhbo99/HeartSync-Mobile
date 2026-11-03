import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, type } from '../theme/tokens';
import { AppButton } from './AppButton';

type Props = {
  visible: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
};

export function UnsavedChangesDialog({ visible, onKeepEditing, onDiscard }: Props) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onKeepEditing}>
    <View style={styles.layer}>
      <Pressable accessibilityLabel="Tiếp tục chỉnh sửa" style={styles.backdrop} onPress={onKeepEditing} />
      <View accessibilityViewIsModal style={styles.dialog}>
        <Text accessibilityRole="header" style={styles.title}>Bỏ thay đổi chưa lưu?</Text>
        <Text style={styles.body}>Thông tin bạn vừa chỉnh sửa sẽ không được lưu.</Text>
        <View style={styles.actions}>
          <AppButton label="Tiếp tục chỉnh sửa" variant="secondary" onPress={onKeepEditing} />
          <AppButton label="Bỏ thay đổi" variant="quiet" onPress={onDiscard} />
        </View>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  layer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(16,42,51,0.42)' },
  dialog: { width: '100%', maxWidth: 420, backgroundColor: colors.surface, borderRadius: radii.lg,
    padding: spacing.lg, gap: spacing.md },
  title: { ...type.title, color: colors.ink },
  body: { ...type.body, color: colors.inkMuted },
  actions: { gap: spacing.sm },
});
