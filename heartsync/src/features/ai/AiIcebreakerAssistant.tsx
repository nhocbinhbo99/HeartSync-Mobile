import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { randomUUID } from 'expo-crypto';

import { useAppServices } from '../../services/AppServicesProvider';
import { AnimatedPressable } from '../../shared/components/AnimatedPressable';
import { AppButton } from '../../shared/components/AppButton';
import { AppIcon } from '../../shared/components/AppIcon';
import { AppText } from '../../shared/components/AppText';
import type { AiIcebreakerGeneration, AiQuota } from '../../shared/domain/ai';
import { feedback } from '../../shared/motion/feedback';
import { colors, fonts, radii, spacing } from '../../shared/theme/tokens';
import { useAuth } from '../auth/AuthProvider';
import { AiConsentNotice, AiSheetShell, AiTriggerPill } from './AiSheetChrome';
import { hasAiConsent, recordAiConsent } from './aiConsent';
import { ProComingSoonModal } from './ProComingSoonModal';

export function AiIcebreakerAssistant({
  matchId,
  enabled,
  onSelect,
}: {
  matchId: string;
  enabled: boolean;
  onSelect: (suggestion: string) => void;
}) {
  const services = useAppServices();
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [proVisible, setProVisible] = useState(false);
  const [quota, setQuota] = useState<AiQuota>();
  const [suggestion, setSuggestion] = useState<AiIcebreakerGeneration>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [consentNeeded, setConsentNeeded] = useState(false);
  const [retryRequestId, setRetryRequestId] = useState<string>();

  const refreshQuota = useCallback(async () => {
    if (!services) return;
    const result = await services.ai.getQuotas();
    if (result.ok) setQuota(result.data.icebreaker);
    else setError(result.error.message);
  }, [services]);

  const open = () => {
    if (!enabled) return;
    setVisible(true);
    setError('');
    setSuggestion(undefined);
    setConsentNeeded(!hasAiConsent('icebreaker', user?.id));
    void refreshQuota();
  };

  const generate = async () => {
    if (!services || busy || !enabled || quota?.remaining === 0) return;
    setBusy(true);
    setError('');
    const requestId = retryRequestId ?? randomUUID();
    setRetryRequestId(requestId);
    try {
      const result = await services.ai.generateIcebreaker({ requestId, matchId, tone: 'friendly' });
      if (!result.ok) {
        setError(result.error.message);
        if (result.error.code === 'quota_exhausted') {
          setQuota((current) => (current ? { ...current, remaining: 0 } : current));
        }
        // Reuse IDs only when a network response may have been lost or the server is still working.
        // A completed provider failure is refunded and must use a new request ID on retry.
        if (result.error.code !== 'network' && result.error.code !== 'request_in_progress') {
          setRetryRequestId(undefined);
        }
        return;
      }
      if (consentNeeded) recordAiConsent('icebreaker', user?.id);
      setConsentNeeded(false);
      setRetryRequestId(undefined);
      setSuggestion(result.data);
      setQuota(result.data.quota);
    } catch {
      setRetryRequestId(undefined);
      setError('Không thể kết nối đến máy chủ AI. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => void refreshQuota(), 20_000);
    return () => clearInterval(interval);
  }, [refreshQuota, visible]);

  const exhausted = quota?.remaining === 0;
  if (!enabled) return null;

  const quotaLabel = quota ? `Còn ${quota.remaining}/2 lượt hôm nay` : 'Đang kiểm tra lượt hôm nay…';

  return (
    <>
      <AiTriggerPill
        label="✨ Gợi ý mở đầu"
        compact
        accessibilityHint="Tạo ba câu gợi ý; chọn câu chỉ điền vào ô soạn tin nhắn."
        onPress={open}
      />

      <AiSheetShell
        visible={visible}
        title="Gợi ý mở đầu"
        subtitle="AI chỉ dùng sở thích công khai phù hợp của hai hồ sơ, không đọc nội dung Chat."
        quotaText={quotaLabel}
        exhausted={exhausted}
        onClose={() => setVisible(false)}
      >
        {suggestion ? (
          <View style={styles.optionsList}>
            {suggestion.suggestions.map((item, idx) => (
              <View key={item} style={styles.optionCard}>
                <View style={styles.optionTopRow}>
                  <View style={styles.indexCircle}>
                    <AppText style={styles.indexText}>{idx + 1}</AppText>
                  </View>
                  <AppText style={styles.optionText}>{item}</AppText>
                </View>
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel={`Chọn câu này: ${item}`}
                  onPress={() => {
                    feedback('selection');
                    onSelect(item);
                    setVisible(false);
                  }}
                  style={styles.pickPill}
                >
                  <AppIcon name="check" color={colors.primaryPressed} size={15} />
                  <AppText style={styles.pickPillText}>Chọn câu này</AppText>
                </AnimatedPressable>
              </View>
            ))}

            <AppButton
              label="Tạo lại 3 câu"
              loading={busy}
              disabled={busy || suggestion.quota.remaining === 0}
              onPress={() => void generate()}
            />
          </View>
        ) : (
          <>
            {consentNeeded ? (
              <AiConsentNotice text="Sở thích công khai phù hợp của hai hồ sơ sẽ được gửi đến dịch vụ Gemini để Trợ lý AI tạo gợi ý. Không gửi nội dung Chat, số điện thoại hoặc vị trí chính xác." />
            ) : null}

            {exhausted ? (
              <View style={styles.exhaustedBlock}>
                <AppText variant="caption" tone="danger" style={styles.errorText}>
                  Bạn đã sử dụng hết 2 lượt gợi ý hôm nay. Lượt miễn phí sẽ được làm mới lúc 00:00 (giờ Việt Nam).
                </AppText>
                <AppButton label="Nâng cấp Pro" onPress={() => setProVisible(true)} />
              </View>
            ) : (
              <AppButton
                label={consentNeeded ? 'Đồng ý & tạo 3 gợi ý' : 'Tạo 3 gợi ý'}
                loading={busy}
                disabled={busy || !quota}
                onPress={() => void generate()}
              />
            )}
          </>
        )}

        {error ? (
          <AppText accessibilityLiveRegion="polite" variant="caption" tone="danger" style={styles.errorText}>
            {error}
          </AppText>
        ) : null}

        {error && !exhausted ? (
          <AppButton
            label="Thử lại"
            variant="secondary"
            disabled={busy}
            onPress={() => void generate()}
          />
        ) : null}

        <AppButton label="Hủy" variant="quiet" disabled={busy} onPress={() => setVisible(false)} />
      </AiSheetShell>

      <ProComingSoonModal visible={proVisible} onClose={() => setProVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  optionsList: {
    gap: spacing.sm,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    borderWidth: 1.2,
    borderColor: '#F3D6E2',
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: '#D67094',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 1,
  },
  optionTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  indexCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  indexText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
  pickPill: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: colors.primary,
  },
  pickPillText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.primaryPressed,
  },
  exhaustedBlock: {
    gap: spacing.sm,
  },
  errorText: {
    lineHeight: 19,
  },
});
