/* Reanimated shared values and the mounted exit lifecycle intentionally mutate outside React state. */
/* eslint-disable react-hooks/immutability, react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { filterChoiceOptions, type ChoiceOption } from '../domain/profileOptions';
import { feedback } from '../motion/feedback';
import { motion } from '../motion/tokens';
import { colors, radii, spacing, type } from '../theme/tokens';
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

export function ChoiceBottomSheet({ visible, title, options, selectedValues, multiple = false, searchable = true, onChange, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(visible ? 1 : 0);
  const dragY = useSharedValue(0);
  const filtered = useMemo(() => filterChoiceOptions(options, query), [options, query]);
  const completeClose = useCallback(() => { setMounted(false); setQuery(''); onClose(); }, [onClose]);
  const close = useCallback(() => {
    progress.value = withTiming(0, { duration: 160, reduceMotion: motion.feedback.reduceMotion }, (finished) => {
      if (finished) scheduleOnRN(completeClose);
    });
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
    if (!multiple) { onChange([value]); close(); return; }
    onChange(selectedValues.includes(value) ? selectedValues.filter((item) => item !== value) : [...selectedValues, value]);
  };
  const dragConfig = useMemo(() => ({
    activeOffsetY: 8,
    failOffsetX: [-24, 24] as [number, number],
    onUpdate: (event: { translationY: number }) => { dragY.value = Math.max(0, event.translationY); },
    onDeactivate: (event: { translationY: number; velocityY: number }) => {
      if (event.translationY > 92 || event.velocityY > 900) scheduleOnRN(close);
      else dragY.value = withSpring(0, motion.overlay);
    },
  }), [close, dragY]);
  const drag = usePanGesture(dragConfig);
  const backdropStyle = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0, 1], [0, 1]) }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(progress.value, [0, 1], [440, 0]) + dragY.value }] }));

  if (!mounted) return null;
  return <Modal visible transparent animationType="none" onRequestClose={close} statusBarTranslucent>
    <View style={styles.layer}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <AnimatedPressable accessibilityRole="button" accessibilityLabel="Đóng danh sách lựa chọn" onPress={close} style={styles.backdropPressable} />
      </Animated.View>
      <Animated.View accessibilityViewIsModal style={[styles.sheet, sheetStyle]}>
        <GestureDetector gesture={drag}><View accessible accessibilityLabel="Kéo xuống để đóng" style={styles.handleArea}><View style={styles.handle} /></View></GestureDetector>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <IconButton icon="close" label="Đóng" onPress={close} />
        </View>
        {searchable ? <View style={styles.searchFrame}>
          <AppIcon name="search" color={colors.inkMuted} size={20} />
          <TextInput accessibilityLabel={`Tìm trong ${title}`} value={query} onChangeText={setQuery} autoCorrect={false}
            placeholder="Tìm kiếm" placeholderTextColor={colors.inkMuted} style={styles.search} />
          {query ? <IconButton icon="close" label="Xóa từ khóa tìm kiếm" onPress={() => setQuery('')} size={18} style={styles.clearSearch} /> : null}
        </View> : null}
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.options}>
          {filtered.length === 0 ? <View style={styles.empty}><AppIcon name="search" color={colors.inkMuted} size={24} /><Text style={styles.emptyText}>Không có lựa chọn phù hợp.</Text></View> : filtered.map((item) => {
            const selected = selectedValues.includes(item.value);
            return <AnimatedPressable accessibilityRole={multiple ? 'checkbox' : 'radio'} accessibilityState={{ checked: selected }}
              accessibilityLabel={item.label} key={item.value} onPress={() => choose(item.value)} style={[styles.option, selected && styles.optionSelected]}>
              <View style={styles.optionCopy}>
                <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{item.label}</Text>
                {item.description ? <Text style={styles.optionDescription}>{item.description}</Text> : null}
              </View>
              <View pointerEvents="none" accessible={false} style={[styles.marker, selected && styles.markerSelected]}>
                {selected ? <AppIcon name="check" color={colors.onPrimary} size={16} /> : null}
              </View>
            </AnimatedPressable>;
          })}
        </ScrollView>
        {multiple ? <View style={styles.footer}>
          {selectedValues.length ? <AppButton label="Xóa lựa chọn" variant="quiet" leadingIcon="close" onPress={() => onChange([])} /> : null}
          <AppButton label={`Xong · ${selectedValues.length} đã chọn`} trailingIcon="check" onPress={close} style={styles.done} />
        </View> : null}
      </Animated.View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  layer: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(59,16,36,0.48)' },
  backdropPressable: { flex: 1 },
  sheet: { maxHeight: '88%', minHeight: 320, backgroundColor: colors.surface, borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md },
  handleArea: { alignItems: 'center', paddingVertical: spacing.sm },
  handle: { width: 40, height: 4, borderRadius: radii.pill, backgroundColor: colors.border },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { ...type.title, color: colors.ink, flex: 1 },
  searchFrame: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.background,
    paddingLeft: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  search: { minHeight: 50, flex: 1, color: colors.ink, fontSize: 16, paddingVertical: spacing.sm },
  clearSearch: { marginRight: spacing.xxs },
  options: { paddingBottom: spacing.xs },
  option: { minHeight: 64, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radii.sm },
  optionSelected: { backgroundColor: colors.primarySoft, borderBottomColor: colors.primarySoft },
  optionCopy: { flex: 1, gap: spacing.xxs },
  optionLabel: { ...type.body, color: colors.ink },
  optionLabelSelected: { color: colors.primaryPressed, fontWeight: '600' },
  optionDescription: { ...type.caption, color: colors.inkMuted },
  marker: { width: 24, height: 24, borderRadius: radii.pill, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  markerSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  empty: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xl },
  emptyText: { ...type.body, color: colors.inkMuted, textAlign: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  done: { flex: 1 },
});
