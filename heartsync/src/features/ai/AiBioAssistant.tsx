import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { randomUUID } from 'expo-crypto';

import { useAppServices } from '../../services/AppServicesProvider';
import { AnimatedPressable } from '../../shared/components/AnimatedPressable';
import { AppButton } from '../../shared/components/AppButton';
import { AppText } from '../../shared/components/AppText';
import { AppTextField } from '../../shared/components/AppTextField';
import type { AiBioGeneration, AiQuota } from '../../shared/domain/ai';
import { feedback } from '../../shared/motion/feedback';
import { colors, fonts, radii, spacing } from '../../shared/theme/tokens';
import { useAuth } from '../auth/AuthProvider';
import { AiConsentNotice, AiSheetShell, AiTriggerPill } from './AiSheetChrome';
import { hasAiConsent, recordAiConsent } from './aiConsent';
import { ProComingSoonModal } from './ProComingSoonModal';

type BioTone = 'natural' | 'playful' | 'sincere';
const tones: { value: BioTone; label: string }[] = [
  { value: 'natural', label: 'Tự nhiên' },
  { value: 'playful', label: 'Vui vẻ' },
  { value: 'sincere', label: 'Chân thành' },
];

export function AiBioAssistant({
  bio,
  interests,
  onUseBio,
}: {
  bio: string;
  interests: string[];
  onUseBio: (bio: string) => void;
}) {
  const services = useAppServices();
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [proVisible, setProVisible] = useState(false);
  const [ideas, setIdeas] = useState('');
  const [tone, setTone] = useState<BioTone>('natural');
  const [quota, setQuota] = useState<AiQuota>();
  const [suggestion, setSuggestion] = useState<AiBioGeneration>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [consentNeeded, setConsentNeeded] = useState(false);
  const [retryRequestId, setRetryRequestId] = useState<string>();

  const refreshQuota = useCallback(async () => {
    if (!services) return;
    const result = await services.ai.getQuotas();
    if (result.ok) setQuota(result.data.profileBio);
    else setError(result.error.message);
  }, [services]);

  const open = () => {
    setVisible(true);
    setError('');
    setSuggestion(undefined);
    setConsentNeeded(!hasAiConsent('profile_bio', user?.id));
    if (!ideas) setIdeas(bio.trim() || interests.join(', '));
    void refreshQuota();
  };

  const generate = async () => {
    if (!services || busy || quota?.remaining === 0) return;
    setBusy(true);
    setError('');
    const requestId = retryRequestId ?? randomUUID();
    setRetryRequestId(requestId);
    try {
      const result = await services.ai.generateBio({ requestId, tone, ideas });
      if (!result.ok) {
        setError(result.error.message);
        if (result.error.code === 'quota_exhausted') {
          setQuota((current) => (current ? { ...current, remaining: 0 } : current));
        }
        // Reuse IDs only when the original request may still complete on the server.
        if (result.error.code !== 'network' && result.error.code !== 'request_in_progress') {
          setRetryRequestId(undefined);
        }
        return;
      }
      if (consentNeeded) recordAiConsent('profile_bio', user?.id);
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
  const quotaLabel = quota ? `Còn ${quota.remaining}/2 lượt miễn phí` : 'Đang kiểm tra lượt miễn phí…';

  return (
    <>
      <AiTriggerPill
        label="✨ Viết Bio bằng AI"
        hint="Trợ lý AI"
        accessibilityHint="Tạo gợi ý tùy chọn; Bio chỉ được điền vào form, chưa được lưu."
        onPress={open}
      />

      <AiSheetShell
        visible={visible}
        title="Viết Bio bằng AI"
        subtitle="AI chỉ tạo gợi ý. Bạn có thể sửa trước khi lưu hồ sơ."
        quotaText={quotaLabel}
        exhausted={exhausted}
        onClose={() => setVisible(false)}
      >
        {suggestion ? (
          <View style={styles.previewCard}>
            <AppText style={styles.previewEyeline}>GỢI Ý BIO</AppText>
            <AppText style={styles.previewText}>{suggestion.suggestion}</AppText>
            <View style={styles.previewActions}>
              <AppButton
                label="Dùng Bio này"
                trailingIcon="check"
                onPress={() => {
                  onUseBio(suggestion.suggestion);
                  setVisible(false);
                }}
              />
              <AppButton
                label="Tạo lại"
                variant="secondary"
                disabled={busy || suggestion.quota.remaining === 0}
                loading={busy}
                onPress={() => void generate()}
              />
            </View>
          </View>
        ) : (
          <>
            <AppTextField
              label="Ý tưởng về bạn"
              value={ideas}
              onChangeText={(value) => {
                setIdeas(value);
                setRetryRequestId(undefined);
              }}
              multiline
              maxLength={800}
              style={styles.ideasInput}
              placeholder="Ví dụ: thích cà phê, đọc sách và đi dạo cuối tuần"
            />

            <View style={styles.toneSection}>
              <AppText variant="label" style={styles.sectionLabel}>
                Giọng văn
              </AppText>
              <View style={styles.toneRow}>
                {tones.map((item) => {
                  const active = tone === item.value;
                  return (
                    <AnimatedPressable
                      key={item.value}
                      accessibilityRole="radio"
                      accessibilityLabel={item.label}
                      accessibilityState={{ checked: active, disabled: busy || exhausted }}
                      disabled={busy || exhausted}
                      onPress={() => {
                        feedback('selection');
                        setTone(item.value);
                        setRetryRequestId(undefined);
                      }}
                      style={[styles.tonePill, active && styles.tonePillActive]}
                    >
                      <AppText style={[styles.toneText, active && styles.toneTextActive]}>
                        {item.label}
                      </AppText>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>

            {consentNeeded ? (
              <AiConsentNotice text="Nội dung bạn nhập và sở thích được chọn sẽ được gửi đến dịch vụ Gemini để Trợ lý AI tạo gợi ý. Không gửi email, tin nhắn riêng tư hoặc vị trí chính xác." />
            ) : null}

            {exhausted ? (
              <View style={styles.exhaustedBlock}>
                <AppText variant="caption" tone="danger">
                  Bạn đã sử dụng hết 2 lượt viết Bio miễn phí.
                </AppText>
                <AppButton label="Nâng cấp Pro" onPress={() => setProVisible(true)} />
              </View>
            ) : (
              <AppButton
                label={consentNeeded ? 'Đồng ý & tạo' : 'Tạo gợi ý'}
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
  ideasInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  toneSection: {
    gap: spacing.xs,
  },
  sectionLabel: {
    color: colors.ink,
  },
  toneRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  tonePill: {
    flex: 1,
    minHeight: 42,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tonePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: '#E6386F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  toneText: {
    fontFamily: fonts.semibold,
    fontSize: 13.5,
    color: colors.ink,
  },
  toneTextActive: {
    fontFamily: fonts.bold,
    color: '#FFFFFF',
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    borderWidth: 1.4,
    borderColor: '#F4BFD4',
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: '#D67094',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  previewEyeline: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    letterSpacing: 0.6,
    color: colors.primaryPressed,
  },
  previewText: {
    fontSize: 15.5,
    lineHeight: 23,
    color: colors.ink,
  },
  previewActions: {
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  exhaustedBlock: {
    gap: spacing.sm,
  },
  errorText: {
    lineHeight: 19,
  },
});
