import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';

import { feedback } from '../motion/feedback';
import { colors, radii, spacing, type } from '../theme/tokens';
import { AppIcon } from './AppIcon';
import { IconButton } from './IconButton';

type RangeProps = { label: string; min: number; max: number; low: number; high: number; unit?: string; onChange: (low: number, high: number) => void; disabled?: boolean };
type ValueProps = { label: string; min: number; max: number; value: number; unit?: string; onChange: (value: number) => void; disabled?: boolean };

function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }

export function RangeSliderField({ label, min, max, low, high, unit = 'tuổi', onChange, disabled = false }: RangeProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const latestRange = useRef({ low, high });
  useEffect(() => { latestRange.current = { low, high }; }, [high, low]);
  const ratio = (value: number) => ((value - min) / (max - min)) * 100;
  const valueAt = useCallback((locationX: number) => clamp(Math.round(min + (locationX / trackWidth) * (max - min)), min, max), [max, min, trackWidth]);
  const choosePoint = useCallback((locationX: number) => {
    if (!trackWidth || disabled) return;
    const value = valueAt(locationX);
    const current = latestRange.current;
    const next = Math.abs(value - current.low) <= Math.abs(value - current.high)
      ? { low: clamp(value, min, current.high), high: current.high }
      : { low: current.low, high: clamp(value, current.low, max) };
    if (next.low === current.low && next.high === current.high) return;
    latestRange.current = next;
    onChange(next.low, next.high);
  }, [disabled, max, min, onChange, trackWidth, valueAt]);
  const beginDrag = useCallback((locationX: number) => { feedback('dragStart'); choosePoint(locationX); }, [choosePoint]);
  const endDrag = useCallback(() => { if (!disabled) feedback('dragEnd'); }, [disabled]);
  const dragConfig = useMemo(() => ({
    enabled: !disabled && trackWidth > 0,
    minDistance: 2,
    onBegin: (event: { x: number }) => { scheduleOnRN(beginDrag, event.x); },
    onUpdate: (event: { x: number }) => { scheduleOnRN(choosePoint, event.x); },
    onFinalize: () => { scheduleOnRN(endDrag); },
  }), [beginDrag, choosePoint, disabled, endDrag, trackWidth]);
  const drag = usePanGesture(dragConfig);
  return <View style={styles.group}>
    <View style={styles.heading}><Text style={styles.label}>{label}</Text><Text style={styles.valueSummary}>{low}–{high} {unit}</Text></View>
    <GestureDetector gesture={drag}>
      <View accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min, max, now: low, text: `${low} đến ${high} ${unit}` }}
        accessibilityHint="Kéo hai nút tròn hoặc chạm vào thanh để thay đổi khoảng tuổi" onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        style={[styles.trackTouch, disabled && styles.disabled]}>
        <View style={styles.trackPress}>
          <View pointerEvents="none" style={styles.track}>
            <View style={[styles.selectedTrack, { left: `${ratio(low)}%`, width: `${ratio(high) - ratio(low)}%` }]} />
            <View style={[styles.thumb, { left: `${ratio(low)}%` }]}><AppIcon name="minus" color={colors.onPrimary} size={14} /></View>
            <View style={[styles.thumb, { left: `${ratio(high)}%` }]}><AppIcon name="add" color={colors.onPrimary} size={14} /></View>
          </View>
        </View>
      </View>
    </GestureDetector>
    <View style={styles.controls}>
      <ValueControl label="Tuổi tối thiểu" value={low} min={min} max={high} unit={unit} disabled={disabled} onChange={(value) => onChange(value, high)} />
      <ValueControl label="Tuổi tối đa" value={high} min={low} max={max} unit={unit} disabled={disabled} onChange={(value) => onChange(low, value)} />
    </View>
  </View>;
}

export function ValueSliderField({ label, min, max, value, unit = 'km', onChange, disabled = false }: ValueProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const latestValue = useRef(value);
  useEffect(() => { latestValue.current = value; }, [value]);
  const ratio = ((value - min) / (max - min)) * 100;
  const choosePoint = useCallback((locationX: number) => {
    if (!trackWidth || disabled) return;
    const snapped = Math.round((min + (locationX / trackWidth) * (max - min)) / 5) * 5;
    const next = clamp(snapped, min, max);
    if (next === latestValue.current) return;
    latestValue.current = next;
    onChange(next);
  }, [disabled, max, min, onChange, trackWidth]);
  const beginDrag = useCallback((locationX: number) => { feedback('dragStart'); choosePoint(locationX); }, [choosePoint]);
  const endDrag = useCallback(() => { if (!disabled) feedback('dragEnd'); }, [disabled]);
  const dragConfig = useMemo(() => ({
    enabled: !disabled && trackWidth > 0,
    minDistance: 2,
    onBegin: (event: { x: number }) => { scheduleOnRN(beginDrag, event.x); },
    onUpdate: (event: { x: number }) => { scheduleOnRN(choosePoint, event.x); },
    onFinalize: () => { scheduleOnRN(endDrag); },
  }), [beginDrag, choosePoint, disabled, endDrag, trackWidth]);
  const drag = usePanGesture(dragConfig);
  return <View style={styles.group}>
    <View style={styles.heading}><Text style={styles.label}>{label}</Text><Text style={styles.valueSummary}>{value} {unit}</Text></View>
    <GestureDetector gesture={drag}>
      <View accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min, max, now: value, text: `${value} ${unit}` }}
        accessibilityHint="Kéo nút tròn hoặc chạm vào thanh để thay đổi khoảng cách" onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        style={[styles.trackTouch, disabled && styles.disabled]}>
        <View style={styles.trackPress}>
          <View pointerEvents="none" style={styles.track}>
            <View style={[styles.selectedTrack, { left: 0, width: `${ratio}%` }]} />
            <View style={[styles.thumb, { left: `${ratio}%` }]}><AppIcon name="location" color={colors.onPrimary} size={14} /></View>
          </View>
        </View>
      </View>
    </GestureDetector>
    <View style={styles.singleControl}><ValueControl label="Khoảng cách tối đa" value={value} min={min} max={max} unit={unit} disabled={disabled} onChange={onChange} /></View>
  </View>;
}

function ValueControl({ label, value, min, max, unit, disabled, onChange }: { label: string; value: number; min: number; max: number; unit: string; disabled: boolean; onChange: (value: number) => void }) {
  return <View style={styles.valueControl}>
    <Text style={styles.controlLabel}>{label}</Text>
    <View style={styles.controlRow}>
      <IconButton icon="minus" label={`Giảm ${label}`} disabled={disabled || value <= min} onPress={() => { feedback('selection'); onChange(value - 1); }} />
      <Text accessibilityLiveRegion="polite" style={styles.controlValue}>{value} <Text style={styles.unit}>{unit}</Text></Text>
      <IconButton icon="add" label={`Tăng ${label}`} disabled={disabled || value >= max} onPress={() => { feedback('selection'); onChange(value + 1); }} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  heading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  label: { ...type.label, color: colors.ink }, valueSummary: { ...type.label, color: colors.primaryPressed, fontVariant: ['tabular-nums'] },
  trackTouch: { height: 48, justifyContent: 'center', paddingHorizontal: 10 }, trackPress: { flex: 1, justifyContent: 'center' },
  track: { height: 6, borderRadius: radii.pill, backgroundColor: colors.border, position: 'relative' },
  selectedTrack: { position: 'absolute', height: 6, borderRadius: radii.pill, backgroundColor: colors.primary },
  thumb: { position: 'absolute', top: -9, width: 24, height: 24, marginLeft: -12, borderRadius: radii.pill, backgroundColor: colors.primary,
    borderWidth: 2, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  controls: { flexDirection: 'row', gap: spacing.sm }, singleControl: { maxWidth: 220 },
  valueControl: { flex: 1, gap: spacing.xs, padding: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  controlLabel: { ...type.caption, color: colors.inkMuted }, controlRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  controlValue: { ...type.subtitle, color: colors.ink, fontVariant: ['tabular-nums'] }, unit: { ...type.caption, color: colors.inkMuted },
  disabled: { opacity: 0.48 },
});
