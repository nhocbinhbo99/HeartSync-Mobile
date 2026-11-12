import type { ReactNode } from 'react';
import { Image, Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedPressable } from '../../shared/components/AnimatedPressable';
import { AppIcon } from '../../shared/components/AppIcon';
import { AppText } from '../../shared/components/AppText';
import { IconButton } from '../../shared/components/IconButton';
import { feedback } from '../../shared/motion/feedback';
import { colors, fonts, radii, spacing } from '../../shared/theme/tokens';
import { brandAssets } from '../../shared/utils/avatarHelper';

export function AiTriggerPill({
  label,
  hint,
  accessibilityHint,
  compact = false,
  onPress,
}: {
  label: string;
  hint?: string;
  accessibilityHint?: string;
  compact?: boolean;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={() => {
        feedback('selection');
        onPress();
      }}
      style={[styles.triggerBase, compact ? styles.triggerCompact : styles.triggerFull]}
    >
      <View style={[styles.triggerIconCircle, compact && styles.triggerIconCompact]}>
        <AppIcon name="sparkle" color="#FFFFFF" size={compact ? 13 : 15} />
      </View>
      <AppText style={[styles.triggerLabel, compact && styles.triggerLabelCompact]}>
        {label}
      </AppText>
      {!compact && hint ? (
        <View style={styles.triggerRightTag}>
          <AppText style={styles.triggerRightText}>{hint}</AppText>
        </View>
      ) : null}
    </AnimatedPressable>
  );
}

export function AiSheetShell({
  visible,
  title,
  subtitle,
  quotaText,
  exhausted = false,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  subtitle: string;
  quotaText: string;
  exhausted?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const bottomSafePad = Math.max(insets.bottom, Platform.OS === 'android' ? 28 : 16);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.sheet}>
          <View style={styles.handleBar} />
          <View style={styles.sheetHeader}>
            <View style={styles.headerBadge}>
              <Image source={brandAssets.pinkButtonGradient} style={StyleSheet.absoluteFill} resizeMode="stretch" />
              <AppIcon name="sparkle" color="#FFFFFF" size={18} />
            </View>
            <View style={styles.headerCopy}>
              <AppText accessibilityRole="header" style={styles.title}>
                {title}
              </AppText>
            </View>
            <IconButton icon="close" label="Đóng" onPress={onClose} style={styles.closeBtn} />
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomSafePad + spacing.md }]}
          >
            <AppText tone="muted" style={styles.subtitle}>
              {subtitle}
            </AppText>
            <View style={[styles.quotaPill, exhausted && styles.quotaPillExhausted]}>
              <AppIcon
                name={exhausted ? 'warning' : 'sparkle'}
                color={exhausted ? colors.warning : colors.primaryPressed}
                size={15}
              />
              <AppText style={[styles.quotaText, exhausted && styles.quotaTextExhausted]}>
                {quotaText}
              </AppText>
            </View>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function AiConsentNotice({ text }: { text: string }) {
  return (
    <View style={styles.noticeCard}>
      <View style={styles.noticeIcon}>
        <AppIcon name="shield" color={colors.primaryPressed} size={18} />
      </View>
      <AppText style={styles.noticeText}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  triggerBase: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#EAD6DF',
    shadowColor: '#D67094',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  triggerFull: {
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 10,
  },
  triggerCompact: {
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 6,
    alignSelf: 'flex-start',
  },
  triggerIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerIconCompact: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  triggerLabel: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 14.5,
    color: colors.ink,
  },
  triggerLabelCompact: {
    flex: 0,
    fontSize: 13,
  },
  triggerRightTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  triggerRightText: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    color: '#FFFFFF',
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(38, 14, 26, 0.50)',
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    shadowColor: '#230C1A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 10,
  },
  handleBar: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ECCAD8',
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  headerBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.extrabold,
    fontSize: 21,
    lineHeight: 27,
    color: colors.ink,
  },
  closeBtn: {
    width: 36,
    height: 36,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: 4,
    gap: spacing.md,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  quotaPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAD6DF',
  },
  quotaPillExhausted: {
    backgroundColor: colors.warningSoft,
    borderColor: '#F7D89C',
  },
  quotaText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.ink,
  },
  quotaTextExhausted: {
    color: '#A16207',
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAD6DF',
  },
  noticeIcon: {
    marginTop: 1,
  },
  noticeText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.ink,
  },
});

