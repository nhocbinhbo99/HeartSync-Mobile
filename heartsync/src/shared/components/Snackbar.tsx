import { createContext, useCallback, useContext, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, ReduceMotion } from 'react-native-reanimated';

import { colors, radii, spacing, type } from '../theme/tokens';
import { feedback } from '../motion/feedback';
import { AppButton } from './AppButton';
import { AppIcon, type AppIconName } from './AppIcon';

type SnackbarTone = 'success' | 'error' | 'neutral';
type SnackbarOptions = { message: string; tone?: SnackbarTone; actionLabel?: string; onAction?: () => void; duration?: number };
type SnackbarContextValue = { show: (options: SnackbarOptions) => void; dismiss: () => void };
type SnackbarState = SnackbarOptions & { id: number };

const SnackbarContext = createContext<SnackbarContextValue | undefined>(undefined);

const toneMeta: Record<SnackbarTone, { color: string; icon: AppIconName }> = {
  success: { color: colors.success, icon: 'checkCircle' },
  error: { color: colors.danger, icon: 'error' },
  neutral: { color: colors.primaryPressed, icon: 'check' },
};

export function SnackbarProvider({ children }: PropsWithChildren) {
  const [current, setCurrent] = useState<SnackbarState>();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = undefined;
    setCurrent(undefined);
  }, []);
  const show = useCallback((options: SnackbarOptions) => {
    if (timer.current) clearTimeout(timer.current);
    const tone = options.tone ?? 'neutral';
    if (tone === 'success') feedback('confirm');
    if (tone === 'error') feedback('error');
    const next = { ...options, tone, id: Date.now() };
    setCurrent(next);
    timer.current = setTimeout(dismiss, options.duration ?? (options.actionLabel ? 5_500 : 3_400));
  }, [dismiss]);
  const value = useMemo(() => ({ show, dismiss }), [dismiss, show]);
  const meta = current ? toneMeta[current.tone ?? 'neutral'] : undefined;
  return <SnackbarContext.Provider value={value}>{children}
    {current && meta ? <View pointerEvents="box-none" style={styles.layer}>
      <Animated.View entering={FadeInDown.duration(180).reduceMotion(ReduceMotion.System)}
        exiting={FadeOutDown.duration(140).reduceMotion(ReduceMotion.System)} style={styles.snackbar}>
        <AppIcon name={meta.icon} color={meta.color} size={20} />
        <Text accessibilityLiveRegion="polite" style={styles.message}>{current.message}</Text>
        {current.actionLabel && current.onAction ? <AppButton label={current.actionLabel} variant="quiet" onPress={() => { current.onAction?.(); dismiss(); }} style={styles.action} /> : null}
      </Animated.View>
    </View> : null}
  </SnackbarContext.Provider>;
}

export function useSnackbar() {
  const context = useContext(SnackbarContext);
  if (!context) throw new Error('useSnackbar must be used within SnackbarProvider.');
  return context;
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.lg, zIndex: 20 },
  snackbar: { minHeight: 56, backgroundColor: colors.ink, borderRadius: radii.md, paddingLeft: spacing.md, paddingRight: spacing.xs,
    paddingVertical: spacing.xs, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  message: { ...type.label, color: colors.onPrimary, flex: 1 },
  action: { minHeight: 40, paddingHorizontal: spacing.sm },
});
