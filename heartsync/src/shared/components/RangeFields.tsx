import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { feedback } from '../motion/feedback';
import { colors, fonts, radii, spacing } from '../theme/tokens';
import { AnimatedPressable } from './AnimatedPressable';

type RangeProps = {
  label: string;
  min: number;
  max: number;
  low: number;
  high: number;
  unit?: string;
  onChange: (low: number, high: number) => void;
  disabled?: boolean;
};

type ValueProps = {
  label: string;
  min: number;
  max: number;
  value: number;
  unit?: string;
  onChange: (value: number) => void;
  disabled?: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const AGE_PRESETS = [
  { label: '18 – 24', low: 18, high: 24 },
  { label: '22 – 30', low: 22, high: 30 },
  { label: '25 – 35', low: 25, high: 35 },
  { label: '30 – 50', low: 30, high: 50 },
  { label: 'Mọi lứa tuổi', low: 18, high: 99 },
] as const;

export function RangeSliderField({
  label,
  min,
  max,
  low,
  high,
  unit = 'tuổi',
  onChange,
  disabled = false,
}: RangeProps) {
  const [trackWidth, setTrackWidth] = useState(0);

  const ratio = (value: number) => {
    if (max <= min) return 0;
    return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  };

  const valueFromX = (x: number) => {
    if (!trackWidth) return min;
    const clampedX = Math.max(0, Math.min(trackWidth, x));
    return Math.round(min + (clampedX / trackWidth) * (max - min));
  };

  const handleTrackPress = (locationX: number) => {
    if (!trackWidth || disabled) return;
    const candidate = valueFromX(locationX);
    if (Math.abs(candidate - low) < Math.abs(candidate - high)) {
      onChange(clamp(candidate, min, high), high);
    } else {
      onChange(low, clamp(candidate, low, max));
    }
    feedback('selection');
  };

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .onBegin((event) => {
      if (!trackWidth || disabled) return;
      handleTrackPress(event.x);
    })
    .onUpdate((event) => {
      if (!trackWidth || disabled) return;
      const candidate = valueFromX(event.x);
      if (Math.abs(candidate - low) < Math.abs(candidate - high)) {
        onChange(clamp(candidate, min, high), high);
      } else {
        onChange(low, clamp(candidate, low, max));
      }
    })
    .onFinalize(() => {
      if (!disabled) feedback('selection');
    });

  const lowPercent = ratio(low);
  const highPercent = ratio(high);
  const widthPercent = Math.max(0, highPercent - lowPercent);

  return (
    <View style={styles.group}>
      <View style={styles.heading}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {low} – {high} {unit}
          </Text>
        </View>
      </View>

      {/* Preset Quick Chips */}
      <View style={styles.presetRow}>
        {AGE_PRESETS.map((preset) => {
          const isSelected = low === preset.low && high === preset.high;
          return (
            <AnimatedPressable
              key={preset.label}
              accessibilityRole="button"
              accessibilityLabel={`Khoảng tuổi ${preset.label}`}
              disabled={disabled}
              onPress={() => {
                feedback('selection');
                onChange(preset.low, preset.high);
              }}
              style={[styles.presetChip, isSelected && styles.presetChipActive]}
            >
              <Text style={[styles.presetText, isSelected && styles.presetTextActive]}>
                {preset.label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>

      {/* Slider Track */}
      <GestureDetector gesture={panGesture}>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min, max, now: low, text: `${low} đến ${high} ${unit}` }}
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          style={[styles.sliderContainer, disabled && styles.disabled]}
        >
          <View style={styles.trackBackground}>
            <View
              style={[
                styles.trackFill,
                {
                  left: `${lowPercent}%`,
                  width: `${widthPercent}%`,
                },
              ]}
            />
            {/* Left Thumb */}
            <View style={[styles.thumb, { left: `${lowPercent}%` }]}>
              <View style={styles.thumbDot} />
            </View>
            {/* Right Thumb */}
            <View style={[styles.thumb, { left: `${highPercent}%` }]}>
              <View style={styles.thumbDot} />
            </View>
          </View>
        </View>
      </GestureDetector>
    </View>
  );
}

export function ValueSliderField({
  label,
  min,
  max,
  value,
  unit = 'km',
  onChange,
  disabled = false,
}: ValueProps) {
  const [trackWidth, setTrackWidth] = useState(0);

  const ratio = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  const updateValue = (locationX: number) => {
    if (!trackWidth || disabled) return;
    const clampedX = Math.max(0, Math.min(trackWidth, locationX));
    const raw = min + (clampedX / trackWidth) * (max - min);
    const snapped = Math.round(raw / 5) * 5;
    onChange(clamp(snapped, min, max));
  };

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .onBegin((e) => {
      if (!trackWidth || disabled) return;
      updateValue(e.x);
      feedback('selection');
    })
    .onUpdate((e) => {
      if (!trackWidth || disabled) return;
      updateValue(e.x);
    })
    .onFinalize(() => {
      if (!disabled) feedback('selection');
    });

  return (
    <View style={styles.group}>
      <View style={styles.heading}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {value} {unit}
          </Text>
        </View>
      </View>

      <GestureDetector gesture={panGesture}>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min, max, now: value, text: `${value} ${unit}` }}
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          style={[styles.sliderContainer, disabled && styles.disabled]}
        >
          <View style={styles.trackBackground}>
            <View style={[styles.trackFill, { left: 0, width: `${ratio}%` }]} />
            <View style={[styles.thumb, { left: `${ratio}%` }]}>
              <View style={styles.thumbDot} />
            </View>
          </View>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.ink,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  badgeText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.primaryPressed,
    fontVariant: ['tabular-nums'],
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginVertical: spacing.xxs,
  },
  presetChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  presetText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.inkMuted,
  },
  presetTextActive: {
    fontFamily: fonts.bold,
    color: colors.primaryPressed,
  },
  sliderContainer: {
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  trackBackground: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
    justifyContent: 'center',
  },
  trackFill: {
    position: 'absolute',
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  thumb: {
    position: 'absolute',
    top: -10,
    width: 28,
    height: 28,
    marginLeft: -14,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 2.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 5,
    elevation: 4,
  },
  thumbDot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  disabled: {
    opacity: 0.45,
  },
});
