import { useCallback, useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';

import { useAppServices } from '../../services/AppServicesProvider';
import { AppButton } from '../../shared/components/AppButton';
import { AppTextField } from '../../shared/components/AppTextField';
import { colors, radii, spacing, type } from '../../shared/theme/tokens';
import type { AiBioGeneration, AiQuota } from '../../shared/domain/ai';
import { useAuth } from '../auth/AuthProvider';
import { hasAiConsent, recordAiConsent } from './aiConsent';
import { ProComingSoonModal } from './ProComingSoonModal';

type BioTone = 'natural' | 'playful' | 'sincere';
const tones: { value: BioTone; label: string }[] = [
  { value: 'natural', label: 'Tự nhiên' },
  { value: 'playful', label: 'Vui vẻ' },
  { value: 'sincere', label: 'Chân thành' },
];

export function AiBioAssistant({ bio, interests, onUseBio }: { bio: string; interests: string[]; onUseBio: (bio: string) => void }) {
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
    const result = await services.ai.generateBio({ requestId, tone, ideas });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      if (result.error.code === 'quota_exhausted') setQuota((current) => current ? { ...current, remaining: 0 } : current);
      if (result.error.code !== 'network' && result.error.code !== 'request_in_progress') setRetryRequestId(undefined);
      return;
    }
    if (consentNeeded) recordAiConsent('profile_bio', user?.id);
    setConsentNeeded(false);
    setRetryRequestId(undefined);
    setSuggestion(result.data);
    setQuota(result.data.quota);
  };

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => void refreshQuota(), 20_000);
    return () => clearInterval(interval);
  }, [refreshQuota, visible]);

  const exhausted = quota?.remaining === 0;
  return <>
    <AppButton label="✨ Viết Bio bằng AI" variant="secondary" onPress={open}
      accessibilityHint="Tạo gợi ý tùy chọn; Bio chỉ được điền vào form, chưa được lưu." />
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
      <View style={styles.backdrop}><View accessibilityViewIsModal style={styles.sheet}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text accessibilityRole="header" style={styles.title}>Viết Bio bằng AI</Text>
          <Text style={styles.body}>AI chỉ tạo gợi ý. Bạn có thể sửa trước khi lưu hồ sơ.</Text>
          <Text style={styles.quota}>{quota ? `Còn ${quota.remaining}/2 lượt miễn phí` : 'Đang kiểm tra lượt miễn phí…'}</Text>
          {suggestion ? <View style={styles.preview}>
            <Text style={styles.previewLabel}>Gợi ý Bio</Text>
            <Text style={styles.previewText}>{suggestion.suggestion}</Text>
            <AppButton label="Dùng Bio này" onPress={() => { onUseBio(suggestion.suggestion); setVisible(false); }} />
            <AppButton label="Tạo lại" variant="secondary" disabled={busy || suggestion.quota.remaining === 0} loading={busy} onPress={() => void generate()} />
          </View> : <>
            <AppTextField label="Ý tưởng về bạn" value={ideas} onChangeText={(value) => { setIdeas(value); setRetryRequestId(undefined); }} multiline maxLength={800}
              placeholder="Ví dụ: thích cà phê, đọc sách và đi dạo cuối tuần" />
            <Text style={styles.label}>Giọng văn</Text>
            <View style={styles.tones}>{tones.map((item) => <AppButton key={item.value} label={item.label}
              variant={tone === item.value ? 'primary' : 'secondary'} disabled={busy || exhausted}
              onPress={() => { setTone(item.value); setRetryRequestId(undefined); }} style={styles.tone} />)}</View>
            {consentNeeded ? <View style={styles.notice}>
              <Text style={styles.noticeText}>Nội dung bạn nhập và sở thích được chọn sẽ được gửi đến dịch vụ Gemini để tạo gợi ý. Không gửi email, tin nhắn riêng tư hoặc vị trí chính xác.</Text>
            </View> : null}
            {exhausted ? <>
              <Text style={styles.error}>Bạn đã sử dụng hết 2 lượt viết Bio miễn phí.</Text>
              <AppButton label="Nâng cấp Pro" onPress={() => setProVisible(true)} />
            </> : <AppButton label={consentNeeded ? 'Đồng ý & tạo' : 'Tạo gợi ý'} loading={busy}
              disabled={busy || !quota} onPress={() => void generate()} />}
          </>}
          {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
          {error && retryRequestId && !exhausted ? <AppButton label="Thử lại an toàn" variant="secondary" disabled={busy} onPress={() => void generate()} /> : null}
          <AppButton label="Hủy" variant="quiet" disabled={busy} onPress={() => setVisible(false)} />
        </ScrollView>
      </View></View>
    </Modal>
    <ProComingSoonModal visible={proVisible} onClose={() => setProVisible(false)} />
  </>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(16,42,51,0.48)' },
  sheet: { maxHeight: '90%', backgroundColor: colors.surface, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { ...type.title, color: colors.ink }, body: { ...type.body, color: colors.inkMuted },
  quota: { ...type.label, color: colors.primaryPressed }, label: { ...type.label, color: colors.ink },
  tones: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }, tone: { flexGrow: 1 },
  notice: { backgroundColor: colors.primarySoft, padding: spacing.md, borderRadius: radii.md },
  noticeText: { ...type.caption, color: colors.ink }, preview: { gap: spacing.sm, padding: spacing.md, backgroundColor: colors.background, borderRadius: radii.md },
  previewLabel: { ...type.label, color: colors.ink }, previewText: { ...type.body, color: colors.ink },
  error: { ...type.caption, color: colors.danger },
});
