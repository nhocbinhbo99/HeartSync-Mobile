/* Gesture worklets intentionally mutate Reanimated shared values on the UI thread. */
/* eslint-disable react-hooks/immutability */
import { useCallback, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { feedback } from '../motion/feedback';
import { motion } from '../motion/tokens';
import { colors, componentSize, fonts, radii, spacing, type } from '../theme/tokens';
import type { ProfilePhoto } from '../types/domain.types';
import { AnimatedPressable } from './AnimatedPressable';
import { AppIcon } from './AppIcon';
import { IconButton } from './IconButton';

export type PhotoGridItem = ProfilePhoto & { url?: string; loading?: boolean; error?: boolean };

type Props = {
  photos: PhotoGridItem[];
  busy?: boolean;
  onAdd: () => void;
  onDelete: (photo: ProfilePhoto) => void;
  onReorder: (photoId: string, targetIndex: number) => void;
  onSetPrimary: (photoId: string) => void;
  onRetry: () => void;
};

export function PhotoGrid({ photos, busy = false, onAdd, onDelete, onReorder, onSetPrimary, onRetry }: Props) {
  return (
    <View style={styles.grid}>
      {photos.map((photo, index) => (
        <PhotoTile
          key={photo.id}
          photo={photo}
          index={index}
          total={photos.length}
          busy={busy}
          onDelete={onDelete}
          onReorder={onReorder}
          onSetPrimary={onSetPrimary}
          onRetry={onRetry}
        />
      ))}
      {photos.length < 6 ? (
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="Thêm ảnh hồ sơ"
          accessibilityHint={`Hiện có ${photos.length} trên 6 ảnh`}
          disabled={busy}
          onPress={onAdd}
          style={styles.add}
        >
          <View style={styles.addIconCircle}>
            <AppIcon name="camera" color="#FFFFFF" size={22} />
          </View>
          <Text style={styles.addTitle}>Thêm ảnh</Text>
          <Text style={styles.addBody}>{photos.length}/6 ảnh</Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}

function PhotoTile({
  photo,
  index,
  total,
  busy,
  onDelete,
  onReorder,
  onSetPrimary,
  onRetry,
}: {
  photo: PhotoGridItem;
  index: number;
  total: number;
  busy: boolean;
  onDelete: (photo: ProfilePhoto) => void;
  onReorder: (photoId: string, targetIndex: number) => void;
  onSetPrimary: (photoId: string) => void;
  onRetry: () => void;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const dragging = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    zIndex: dragging.value ? 2 : 0,
    transform: [
      { translateX: dragX.value },
      { translateY: dragY.value },
      { scale: withSpring(dragging.value ? 1.035 : 1, motion.overlay) },
    ],
  }));
  const finishDrag = useCallback(
    (translationX: number, translationY: number) => {
      const columnShift = Math.abs(translationX) > 70 ? (translationX > 0 ? 1 : -1) : 0;
      const rowShift = Math.abs(translationY) > 92 ? (translationY > 0 ? 1 : -1) : 0;
      const target = Math.max(0, Math.min(total - 1, index + rowShift * 2 + columnShift));
      if (target !== index) onReorder(photo.id, target);
      feedback('dragEnd');
    },
    [index, onReorder, photo.id, total],
  );
  const drag = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(180)
        .onBegin(() => {
          dragging.value = 1;
          scheduleOnRN(feedback, 'dragStart');
        })
        .onUpdate((event) => {
          dragX.value = event.translationX;
          dragY.value = event.translationY;
        })
        .onEnd((event) => {
          scheduleOnRN(finishDrag, event.translationX, event.translationY);
        })
        .onFinalize(() => {
          dragging.value = 0;
          dragX.value = withSpring(0, motion.overlay);
          dragY.value = withSpring(0, motion.overlay);
        }),
    [dragX, dragY, dragging, finishDrag],
  );

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      {photo.url ? (
        <Image
          accessibilityLabel={`Ảnh hồ sơ ${index + 1}`}
          source={{ uri: photo.url }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <AppIcon name={photo.error ? 'warning' : 'camera'} color={colors.inkMuted} size={24} />
          <Text style={styles.placeholderText}>
            {photo.error ? 'Không tải được ảnh' : 'Đang tải ảnh…'}
          </Text>
        </View>
      )}
      {photo.isPrimary ? (
        <View accessible accessibilityLabel="Ảnh chính" style={styles.badge}>
          <AppIcon name="star" color={colors.onPrimary} size={12} />
          <Text style={styles.badgeText}>Ảnh chính</Text>
        </View>
      ) : null}
      <View style={styles.cardToolbar}>
        <GestureDetector gesture={drag}>
          <Animated.View
            accessible
            accessibilityLabel={`Sắp xếp ảnh ${index + 1}`}
            accessibilityHint="Giữ trong giây lát rồi kéo để đổi thứ tự"
            style={styles.dragHandle}
          >
            <AppIcon name="drag" color={colors.onPrimary} size={17} />
          </Animated.View>
        </GestureDetector>
        <IconButton
          icon="more"
          label={`Tùy chọn ảnh ${index + 1}`}
          tone="onPrimary"
          onPress={() => setActionsOpen((open) => !open)}
          style={styles.more}
        />
      </View>
      {actionsOpen ? (
        <View style={styles.actions}>
          {photo.error ? (
            <IconButton icon="refresh" label="Thử tải lại ảnh" tone="primary" disabled={busy} onPress={onRetry} />
          ) : null}
          {!photo.isPrimary ? (
            <IconButton
              icon="star"
              label="Đặt làm ảnh chính"
              tone="primary"
              disabled={busy}
              onPress={() => onSetPrimary(photo.id)}
            />
          ) : null}
          <IconButton icon="delete" label="Xóa ảnh" tone="danger" disabled={busy} onPress={() => onDelete(photo)} />
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: {
    width: '48%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  image: { width: '100%', aspectRatio: 0.78, backgroundColor: colors.surfaceMuted },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 0.78,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  placeholderText: { ...type.caption, color: colors.inkMuted, textAlign: 'center' },
  badge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 11, color: colors.onPrimary },
  cardToolbar: { position: 'absolute', top: spacing.xs, right: spacing.xs, flexDirection: 'row', gap: spacing.xxs },
  dragHandle: {
    width: componentSize.minTouchTarget - 8,
    height: componentSize.minTouchTarget - 8,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(32, 12, 24, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  more: {
    width: componentSize.minTouchTarget - 8,
    height: componentSize.minTouchTarget - 8,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(32, 12, 24, 0.72)',
  },
  actions: {
    minHeight: 48,
    paddingHorizontal: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xxs,
    backgroundColor: colors.surface,
  },
  add: {
    width: '48%',
    minHeight: 184,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#DFBECA',
    borderRadius: radii.lg,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    shadowColor: '#24111A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  addIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    shadowColor: '#E6386F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 3,
  },
  addTitle: { fontFamily: fonts.bold, fontSize: 15.5, color: colors.ink },
  addBody: { ...type.caption, color: colors.inkMuted },
});
