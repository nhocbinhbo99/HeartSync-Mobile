import {
  AndroidHaptics,
  ImpactFeedbackStyle,
  NotificationFeedbackType,
  impactAsync,
  notificationAsync,
  performAndroidHapticsAsync,
  selectionAsync,
} from 'expo-haptics';
import { Platform } from 'react-native';
import { runHapticWithFallback, safelyRunHaptic, type HapticTask } from './safeHaptics';

type Feedback = 'selection' | 'confirm' | 'warning' | 'error' | 'toggleOn' | 'toggleOff' | 'dragStart' | 'dragEnd';

function androidWithFallback(type: AndroidHaptics, fallback: HapticTask) {
  runHapticWithFallback(() => performAndroidHapticsAsync(type), fallback);
}

/** Small, intentional tactile cues. Unsupported hardware is deliberately silent. */
export function feedback(kind: Feedback) {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;

  switch (kind) {
    case 'selection':
      if (Platform.OS === 'android')
        androidWithFallback(AndroidHaptics.Segment_Tick, selectionAsync);
      else safelyRunHaptic(selectionAsync);
      return;
    case 'confirm':
      if (Platform.OS === 'android')
        androidWithFallback(AndroidHaptics.Confirm, () =>
          notificationAsync(NotificationFeedbackType.Success));
      else safelyRunHaptic(() => notificationAsync(NotificationFeedbackType.Success));
      return;
    case 'warning':
      if (Platform.OS === 'android')
        androidWithFallback(AndroidHaptics.Reject, () =>
          notificationAsync(NotificationFeedbackType.Warning));
      else safelyRunHaptic(() => notificationAsync(NotificationFeedbackType.Warning));
      return;
    case 'error':
      if (Platform.OS === 'android')
        androidWithFallback(AndroidHaptics.Reject, () =>
          notificationAsync(NotificationFeedbackType.Error));
      else safelyRunHaptic(() => notificationAsync(NotificationFeedbackType.Error));
      return;
    case 'toggleOn':
      if (Platform.OS === 'android')
        androidWithFallback(AndroidHaptics.Toggle_On, selectionAsync);
      else safelyRunHaptic(selectionAsync);
      return;
    case 'toggleOff':
      if (Platform.OS === 'android')
        androidWithFallback(AndroidHaptics.Toggle_Off, selectionAsync);
      else safelyRunHaptic(selectionAsync);
      return;
    case 'dragStart':
      if (Platform.OS === 'android')
        androidWithFallback(AndroidHaptics.Drag_Start, () =>
          impactAsync(ImpactFeedbackStyle.Light));
      else safelyRunHaptic(() => impactAsync(ImpactFeedbackStyle.Light));
      return;
    case 'dragEnd':
      if (Platform.OS === 'android')
        androidWithFallback(AndroidHaptics.Gesture_End, () =>
          impactAsync(ImpactFeedbackStyle.Light));
      else safelyRunHaptic(() => impactAsync(ImpactFeedbackStyle.Light));
  }
}
