/* Reanimated shared values and the mounted exit lifecycle intentionally mutate outside React state. */
/* eslint-disable react-hooks/immutability, react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { filterChoiceOptions, type ChoiceOption } from '../domain/profileOptions';
import { feedback } from '../motion/feedback';
import { motion } from '../motion/tokens';
import { colors, fonts, radii, spacing, type } from '../theme/tokens';
import { AnimatedPressable } from './AnimatedPressable';
import { AppButton } from './AppButton';
import { AppIcon } from './AppIcon';
import { IconButton } from './IconButton';

type Props = {
  visible: boolean;
  title: string;
  options: readonly ChoiceOption[];
  selectedValues: string[];
  multiple?: boolean;
  searchable?: boolean;
  onChange: (values: string[]) => void;
  onClose: () => void;
};

export function ChoiceBottomSheet({
  visible,
  title,
  options,
  selectedValues,
  multiple = false,
  searchable = true,
  onChange,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const bottomSafePad = Math.max(insets.bottom, Platform.OS === 'android' ? 28 : 16);
  const [query, setQuery] = useState('');
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(visible ? 1 : 0);
  const dragY = useSharedValue(0);
  const filtered = useMemo(() => filterChoiceOptions(options, query), [options, query]);

  const completeClose = useCallback(() => {
    setMounted(false);
    setQuery('');
    onClose();
  }, [onClose]);

  const close = useCallback(() => {
    progress.value = withTiming(
      0,
      { duration: 160, reduceMotion: motion.feedback.reduceMotion },
      (finished) => {
        if (finished) runOnJS(completeClose)();
      },
    );
  }, [completeClose, progress]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      dragY.value = 0;
      progress.value = withSpring(1, motion.overlay);
    } else if (mounted) {
      close();
    }
  }, [close, dragY, mounted, progress, visible]);

  const choose = (value: string) => {
    feedback('selection');
    if (!multiple) {
      onChange([value]);
      close();
      return;
    }
    onChange(
      selectedValues.includes(value)
        ? selectedValues.filter((item) => item !== value)
        : [...selectedValues, value],
    );
  };

  const drag = Gesture.Pan()
    .onUpdate((event) => {
      dragY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY > 92 || event.velocityY > 900) runOnJS(close)();
      else dragY.value = withSpring(0, motion.overlay);
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [440, 0]) + dragY.value }],
  }));

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <View style={styles.layer}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Đóng danh sách lựa chọn"
            onPress={close}
            style={styles.backdropPressable}
          />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          style={[styles.sheet, { paddingBottom: bottomSafePad + 8 }, sheetStyle]}
        >
          <GestureDetector gesture={drag}>
            <View accessible accessibilityLabel="Kéo xuống để đóng" style={styles.handleArea}>
              <View style={styles.handle} />
            </View>
          </GestureDetector>

          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            <IconButton icon="close" label="Đóng" onPress={close} style={styles.closeBtn} />
          </View>

          {searchable ? (
            <View style={styles.searchFrame}>
              <AppIcon name="search" color={colors.inkMuted} size={19} />
              <TextInput
                accessibilityLabel={`Tìm trong ${title}`}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                placeholder="Tìm kiếm..."
                placeholderTextColor={colors.inkMuted}
                style={styles.search}
              />
              {query ? (
                <IconButton
                  icon="close"
                  label="Xóa từ khóa tìm kiếm"
                  onPress={() => setQuery('')}
                  size={16}
                  style={styles.clearSearch}
                />
              ) : null}
            </View>
          ) : null}

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.options}
          >
            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <AppIcon name="search" color={colors.inkMuted} size={24} />
                <Text style={styles.emptyText}>Không có lựa chọn phù hợp.</Text>
              </View>
            ) : (
              filtered.map((item) => {
                const selected = selectedValues.includes(item.value);
                return (
                  <AnimatedPressable
                    accessibilityRole={multiple ? 'checkbox' : 'radio'}
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={item.label}
                    key={item.value}
                    onPress={() => choose(item.value)}
                    style={[styles.option, selected && styles.optionSelected]}
                  >
                    <View style={styles.optionCopy}>
                      <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                        {item.label}
                      </Text>
                      {item.description ? (
                        <Text style={styles.optionDescription}>{item.description}</Text>
                      ) : null}
                    </View>
                    <View
                      pointerEvents="none"
                      accessible={false}
                      style={[styles.marker, selected && styles.markerSelected]}
                    >
                      {selected ? <AppIcon name="check" color={colors.onPrimary} size={14} /> : null}
                    </View>
                  </AnimatedPressable>
                );
              })
            )}
          </ScrollView>

          {multiple ? (
            <View style={styles.footer}>
              {selectedValues.length > 0 ? (
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel="Xóa lựa chọn"
                  onPress={() => onChange([])}
                  style={styles.clearBtn}
                >
                  <AppIcon name="close" color={colors.inkMuted} size={15} />
                  <Text style={styles.clearBtnText}>Xóa hết</Text>
                </AnimatedPressable>
              ) : null}
              <AppButton
                label={
                  selectedValues.length > 0
                    ? `Xong (${selectedValues.length} đã chọn)`
                    : 'Xong'
                }
                trailingIcon="check"
                onPress={close}
                style={styles.done}
              />
            </View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  layer: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(24, 10, 18, 0.52)',
  },
  backdropPressable: { flex: 1 },
  sheet: {
    maxHeight: '86%',
    minHeight: 320,
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    shadowColor: '#24111A',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 12,
  },
  handleArea: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handle: { width: 42, height: 4, borderRadius: radii.pill, backgroundColor: '#DFC9D3' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: { fontFamily: fonts.extrabold, fontSize: 23, lineHeight: 29, color: colors.ink, flex: 1 },
  closeBtn: {
    width: 38,
    height: 38,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchFrame: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  search: {
    minHeight: 46,
    flex: 1,
    fontFamily: fonts.regular,
    color: colors.ink,
    fontSize: 15,
    paddingVertical: 8,
  },
  clearSearch: { width: 34, height: 34 },
  options: { paddingVertical: 4, gap: 8 },
  option: {
    minHeight: 56,
    borderWidth: 1.2,
    borderColor: '#EDE0E6',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
  },
  optionSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.primary,
    borderWidth: 1.6,
    shadowColor: '#E6386F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  optionCopy: { flex: 1, gap: 2 },
  optionLabel: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.ink },
  optionLabelSelected: { fontFamily: fonts.bold, color: colors.ink },
  optionDescription: { ...type.caption, color: colors.inkMuted },
  marker: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    borderWidth: 1.8,
    borderColor: '#D8C2CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  empty: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xl },
  emptyText: { ...type.body, color: colors.inkMuted, textAlign: 'center' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  clearBtn: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clearBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: colors.inkMuted,
  },
  done: { flex: 1 },
});
