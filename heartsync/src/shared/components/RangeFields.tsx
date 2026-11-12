import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { feedback } from '../motion/feedback';
import { colors, fonts, radii } from '../theme/tokens';
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
  { label: '30 – 45', low: 30, high: 45 },
  { label: 'Tất cả', low: 18, high: 99 },
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
  const [activeThumb, setActiveThumb] = useState<'low' | 'high'>('low');

  const ratio = (value: number) => {
    if (max <= min) return 0;
    return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  };

  const valueFromX = (x: number) => {
    if (!trackWidth) return min;
    const clampedX = Math.max(0, Math.min(trackWidth, x));
    return Math.round(min + (clampedX / trackWidth) * (max - min));
  };

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-4, 4])
    .onBegin((event) => {
      if (!trackWidth || disabled) return;
      const candidate = valueFromX(event.x);
      const pickLow = Math.abs(candidate - low) <= Math.abs(candidate - high);
      setActiveThumb(pickLow ? 'low' : 'high');
      if (pickLow) {
        onChange(clamp(candidate, min, Math.max(min, high - 1)), high);
      } else {
        onChange(low, clamp(candidate, Math.min(max, low + 1), max));
      }
      feedback('selection');
    })
    .onUpdate((event) => {
      if (!trackWidth || disabled) return;
      const candidate = valueFromX(event.x);
      if (activeThumb === 'low') {
        onChange(clamp(candidate, min, Math.max(min, high - 1)), high);
      } else {
        onChange(low, clamp(candidate, Math.min(max, low + 1), max));
      }
    })
    .onFinalize(() => {
      if (!disabled) feedback('selection');
    });

  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd((event) => {
      if (!trackWidth || disabled) return;
      const candidate = valueFromX(event.x);
      if (Math.abs(candidate - low) <= Math.abs(candidate - high)) {
        onChange(clamp(candidate, min, Math.max(min, high - 1)), high);
      } else {
        onChange(low, clamp(candidate, Math.min(max, low + 1), max));
      }
      feedback('selection');
    });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const lowPercent = ratio(low);
  const highPercent = ratio(high);
  const widthPercent = Math.max(0, highPercent - lowPercent);

  return (
    <View style={styles.group}>
      <View style={styles.heading}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.valueInline}>
          {low} – {high} {unit}
        </Text>
      </View>

      <GestureDetector gesture={composedGesture}>
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
            <View style={[styles.thumb, { left: `${lowPercent}%` }]} />
            <View style={[styles.thumb, { left: `${highPercent}%` }]} />
          </View>
        </View>
      </GestureDetector>

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
    .activeOffsetX([-4, 4])
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
        <Text style={styles.valueInline}>
          Trong {value} {unit}
        </Text>
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
            <View style={[styles.thumb, { left: `${ratio}%` }]} />
          </View>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 10,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.ink,
  },
  valueInline: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.primaryPressed,
    fontVariant: ['tabular-nums'],
  },
  sliderContainer: {
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  trackBackground: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: '#FADCE6',
    position: 'relative',
    justifyContent: 'center',
  },
  trackFill: {
    position: 'absolute',
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryPressed,
  },
  thumb: {
    position: 'absolute',
    top: -9,
    width: 24,
    height: 24,
    marginLeft: -12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: colors.primaryPressed,
    shadowColor: colors.primaryPressed,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 3,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3D6E2',
  },
  presetChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.ink,
  },
  presetTextActive: {
    fontFamily: fonts.bold,
    color: '#FFFFFF',
  },
  disabled: {
    opacity: 0.45,
  },
});
