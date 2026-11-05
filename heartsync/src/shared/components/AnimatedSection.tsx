import type { PropsWithChildren } from 'react';
import Animated, { FadeIn, LinearTransition, ReduceMotion } from 'react-native-reanimated';

import { motion } from '../motion/tokens';

export function AnimatedSection({ children }: PropsWithChildren) {
  return <Animated.View entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)}
    layout={LinearTransition.duration(motion.layout.duration).reduceMotion(ReduceMotion.System)}>
    {children}
  </Animated.View>;
}
