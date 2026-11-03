import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ProfilePhoto } from '../types/domain.types';
import { colors, radii, spacing, type } from '../theme/tokens';

export type PhotoGridItem = ProfilePhoto & { url?: string; loading?: boolean; error?: boolean };

type Props = {
  photos: PhotoGridItem[];
  busy?: boolean;
  onAdd: () => void;
  onDelete: (photo: ProfilePhoto) => void;
  onMove: (photoId: string, direction: -1 | 1) => void;
  onSetPrimary: (photoId: string) => void;
  onRetry: () => void;
};

export function PhotoGrid({ photos, busy = false, onAdd, onDelete, onMove, onSetPrimary, onRetry }: Props) {
  return <View style={styles.grid}>
    {photos.map((photo, index) => <View key={photo.id} style={styles.card}>
      {photo.url ? <Image accessibilityLabel={`Ảnh hồ sơ ${index + 1}`} source={{ uri: photo.url }} style={styles.image} resizeMode="cover" />
        : <View style={styles.imagePlaceholder}><Text style={styles.placeholderText}>{photo.error ? 'Không tải được ảnh' : 'Đang tải ảnh…'}</Text></View>}
      {photo.isPrimary ? <View style={styles.badge}><Text style={styles.badgeText}>Ảnh chính</Text></View> : null}
      <View style={styles.actions}>
        {photo.error ? <SmallAction label="Thử tải lại" disabled={busy} onPress={onRetry} /> : null}
        {!photo.isPrimary ? <SmallAction label="Đặt chính" disabled={busy} onPress={() => onSetPrimary(photo.id)} /> : null}
        <SmallAction label="Lên" disabled={busy || index === 0} onPress={() => onMove(photo.id, -1)} />
        <SmallAction label="Xuống" disabled={busy || index === photos.length - 1} onPress={() => onMove(photo.id, 1)} />
        <SmallAction label="Xóa" danger disabled={busy} onPress={() => onDelete(photo)} />
      </View>
    </View>)}
    {photos.length < 6 ? <Pressable accessibilityRole="button" accessibilityLabel="Thêm ảnh hồ sơ" disabled={busy}
      onPress={onAdd} style={({ pressed }) => [styles.add, pressed && styles.pressed, busy && styles.disabled]}>
      <Text style={styles.addTitle}>Thêm ảnh</Text><Text style={styles.addBody}>{photos.length}/6 ảnh</Text>
    </Pressable> : null}
  </View>;
}

function SmallAction({ label, onPress, disabled = false, danger = false }: { label: string; onPress: () => void; disabled?: boolean; danger?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.smallAction, pressed && styles.pressed, disabled && styles.disabled]}>
    <Text style={[styles.smallActionText, danger && styles.danger]}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: { width: '48%', borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, overflow: 'hidden' },
  image: { width: '100%', aspectRatio: 0.82, backgroundColor: colors.surfaceMuted },
  imagePlaceholder: { width: '100%', aspectRatio: 0.82, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', padding: spacing.sm },
  placeholderText: { ...type.caption, color: colors.inkMuted, textAlign: 'center' },
  badge: { position: 'absolute', top: spacing.xs, left: spacing.xs, backgroundColor: colors.primary, borderRadius: radii.sm, paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs },
  badgeText: { ...type.caption, color: colors.onPrimary, fontWeight: '600' },
  actions: { padding: spacing.xs, gap: spacing.xxs },
  smallAction: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs },
  smallActionText: { ...type.label, color: colors.primaryPressed }, danger: { color: colors.danger },
  add: { width: '48%', minHeight: 180, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary,
    borderRadius: radii.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, padding: spacing.md },
  addTitle: { ...type.subtitle, color: colors.primaryPressed }, addBody: { ...type.caption, color: colors.inkMuted },
  pressed: { opacity: 0.72 }, disabled: { opacity: 0.45 },
});
