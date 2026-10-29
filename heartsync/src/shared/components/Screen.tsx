import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/tokens';

type ScreenProps = PropsWithChildren<{ scroll?: boolean; keyboardAware?: boolean; safeTop?: boolean; contentStyle?: ViewStyle }>;
export function Screen({ children, scroll = true, keyboardAware = false, safeTop = false, contentStyle }: ScreenProps) {
  const content = scroll
    ? <ScrollView contentContainerStyle={[styles.content, contentStyle]} keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>{children}</ScrollView>
    : <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>;
  const keyboardContent = keyboardAware
    ? <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>{content}</KeyboardAvoidingView>
    : content;
  return <SafeAreaView style={styles.fill} edges={safeTop ? ['top', 'left', 'right', 'bottom'] : ['left', 'right', 'bottom']}>
    {keyboardContent}
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, backgroundColor: colors.background, padding: spacing.lg, gap: spacing.md },
});
