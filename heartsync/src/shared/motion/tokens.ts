import { Easing, ReduceMotion } from 'react-native-reanimated';

export const motion = {
  press: { duration: 110, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System },
  feedback: { duration: 160, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System },
  layout: { duration: 220, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System },
  overlay: { damping: 22, stiffness: 250, mass: 0.7, reduceMotion: ReduceMotion.System },
} as const;
