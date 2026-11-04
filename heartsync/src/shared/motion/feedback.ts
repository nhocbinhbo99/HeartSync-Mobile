import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

type Feedback = 'selection' | 'confirm' | 'warning' | 'error' | 'toggleOn' | 'toggleOff' | 'dragStart' | 'dragEnd';

/** Small, intentional tactile cues. Calls are deliberately fire-and-forget. */
export function feedback(kind: Feedback) {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;
  const android = (type: Haptics.AndroidHaptics) => void Haptics.performAndroidHapticsAsync(type);

  switch (kind) {
    case 'selection':
      if (Platform.OS === 'android') android(Haptics.AndroidHaptics.Segment_Tick);
      else void Haptics.selectionAsync();
      return;
    case 'confirm':
      if (Platform.OS === 'android') android(Haptics.AndroidHaptics.Confirm);
      else void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    case 'warning':
      if (Platform.OS === 'android') android(Haptics.AndroidHaptics.Reject);
      else void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    case 'error':
      if (Platform.OS === 'android') android(Haptics.AndroidHaptics.Reject);
      else void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    case 'toggleOn':
      if (Platform.OS === 'android') android(Haptics.AndroidHaptics.Toggle_On);
      else void Haptics.selectionAsync();
      return;
    case 'toggleOff':
      if (Platform.OS === 'android') android(Haptics.AndroidHaptics.Toggle_Off);
      else void Haptics.selectionAsync();
      return;
    case 'dragStart':
      if (Platform.OS === 'android') android(Haptics.AndroidHaptics.Drag_Start);
      else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    case 'dragEnd':
      if (Platform.OS === 'android') android(Haptics.AndroidHaptics.Gesture_End);
      else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}
