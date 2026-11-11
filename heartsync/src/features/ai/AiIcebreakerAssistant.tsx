import { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';

import { useAppServices } from '../../services/AppServicesProvider';
import { AppButton } from '../../shared/components/AppButton';
import { colors, radii, spacing, type } from '../../shared/theme/tokens';
import type { AiIcebreakerGeneration, AiQuota } from '../../shared/domain/ai';
import { useAuth } from '../auth/AuthProvider';
import { hasAiConsent, recordAiConsent } from './aiConsent';
import { ProComingSoonModal } from './ProComingSoonModal';

export function AiIcebreakerAssistant({ matchId, enabled, onSelect }: { matchId: string; enabled: boolean; onSelect: (suggestion: string) => void }) {
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

  const refreshQuota = async () => {
    if (!services) return;
    const result = await services.ai.getQuotas();
    if (result.ok) setQuota(result.data.icebreaker);
    else setError(result.error.message);
  };

  const open = () => {
    if (!enabled) return;
    setVisible(true); setError(''); setSuggestion(undefined);
    setConsentNeeded(!hasAiConsent('icebreaker', user?.id));
    void refreshQuota();
  };

  const generate = async () => {
    if (!services || busy || !enabled || quota?.remaining === 0) return;
    setBusy(true); setError('');
    const requestId = retryRequestId ?? randomUUID();
    setRetryRequestId(requestId);
    const result = await services.ai.generateIcebreaker({ requestId, matchId, tone: 'friendly' });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      if (result.error.code === 'quota_exhausted') setQuota((current) => current ? { ...current, remaining: 0 } : current);
      if (result.error.code !== 'network' && result.error.code !== 'request_in_progress') setRetryRequestId(undefined);
      return;
    }
    if (consentNeeded) recordAiConsent('icebreaker', user?.id);
    setConsentNeeded(false); setRetryRequestId(undefined); setSuggestion(result.data); setQuota(result.data.quota);
  };

  const exhausted = quota?.remaining === 0;
  if (!enabled) return null;
  return <>
    <AppButton label="✨ Gợi ý mở đầu" variant="secondary" onPress={open}
      accessibilityHint="Tạo ba câu gợi ý; chọn câu chỉ điền vào ô soạn tin nhắn." />
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
      <View style={styles.backdrop}><View accessibilityViewIsModal style={styles.sheet}>
        <Text accessibilityRole="header" style={styles.title}>Gợi ý mở đầu</Text>
        <Text style={styles.body}>AI chỉ dùng sở thích công khai phù hợp của hai hồ sơ, không đọc nội dung Chat.</Text>
        <Text style={styles.quota}>{quota ? `Còn ${quota.remaining}/2 lượt hôm nay` : 'Đang kiểm tra lượt hôm nay…'}</Text>
        {suggestion ? <View style={styles.options}>{suggestion.suggestions.map((item) => <View key={item} style={styles.option}>
          <Text style={styles.optionText}>{item}</Text>
          <AppButton label="Chọn câu này" variant="secondary" onPress={() => { onSelect(item); setVisible(false); }} />
        </View>)}
          <AppButton label="Tạo lại 3 câu" loading={busy} disabled={busy || suggestion.quota.remaining === 0} onPress={() => void generate()} />
        </View> : <>
          {consentNeeded ? <View style={styles.notice}><Text style={styles.noticeText}>Sở thích công khai phù hợp của hai hồ sơ sẽ được gửi đến Gemini để tạo gợi ý. Không gửi nội dung Chat, số điện thoại hoặc vị trí chính xác.</Text></View> : null}
          {exhausted ? <><Text style={styles.error}>Bạn đã sử dụng hết 2 lượt gợi ý hôm nay. Lượt miễn phí sẽ được làm mới lúc 00:00 (giờ Việt Nam).</Text>
            <AppButton label="Nâng cấp Pro" onPress={() => setProVisible(true)} /></> :
            <AppButton label={consentNeeded ? 'Đồng ý & tạo 3 gợi ý' : 'Tạo 3 gợi ý'} loading={busy} disabled={busy || !quota} onPress={() => void generate()} />}
        </>}
        {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
        {error && retryRequestId && !exhausted ? <AppButton label="Thử lại an toàn" variant="secondary" disabled={busy} onPress={() => void generate()} /> : null}
        <AppButton label="Hủy" variant="quiet" disabled={busy} onPress={() => setVisible(false)} />
      </View></View>
    </Modal>
    <ProComingSoonModal visible={proVisible} onClose={() => setProVisible(false)} />
  </>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(16,42,51,0.48)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: spacing.lg, gap: spacing.md },
  title: { ...type.title, color: colors.ink }, body: { ...type.body, color: colors.inkMuted }, quota: { ...type.label, color: colors.primaryPressed },
  notice: { backgroundColor: colors.primarySoft, padding: spacing.md, borderRadius: radii.md }, noticeText: { ...type.caption, color: colors.ink },
  options: { gap: spacing.sm }, option: { gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.background }, optionText: { ...type.body, color: colors.ink },
  error: { ...type.caption, color: colors.danger },
});
