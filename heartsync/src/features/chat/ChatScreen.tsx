import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAppServices } from '../../services/AppServicesProvider';
import { dedupeMessages } from '../../shared/domain/messages';
import { AppButton } from '../../shared/components/AppButton';
import { AppTextField } from '../../shared/components/AppTextField';
import { AsyncStatePanel } from '../../shared/components/AsyncStatePanel';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing, type } from '../../shared/theme/tokens';
import type { ChatMessage } from '../../shared/types/domain.types';

export function ChatScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Chat'>) {
  const services = useAppServices(); const matchId = route.params?.matchId;
  const [messages, setMessages] = useState<ChatMessage[]>([]); const [text, setText] = useState(''); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const load = useCallback(async () => { if (!services || !matchId) return; setLoading(true); const result = await services.chat.listMessages(matchId); setLoading(false); if (result.ok) setMessages(result.data.items); else setError(result.error.message); }, [matchId, services]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  useEffect(() => { if (!services || !matchId) return; const subscription = services.chat.subscribe(matchId, (message) => setMessages((current) => dedupeMessages([...current, message])), (nextError) => setError(nextError.message)); return () => subscription.unsubscribe(); }, [matchId, services]);
  const send = async () => {
    if (!services || !matchId || !text.trim()) return;
    setBusy(true); const result = await services.chat.sendMessage({ matchId, content: text.trim(), clientMessageId: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}` }); setBusy(false);
    if (result.ok) { setMessages((current) => dedupeMessages([...current, result.data])); setText(''); } else setError(result.error.message);
  };
  const startAudio = async () => {
    if (!services || !matchId) return;
    setBusy(true); const result = await services.calls.startAudioCall(matchId); setBusy(false);
    if (result.ok) navigation.navigate('AudioCall', { matchId, callId: result.data.id }); else setError(result.error.message);
  };
  if (!matchId) return <Screen><StatePanel title="Chưa chọn kết nối" description="Hãy mở chat từ danh sách Kết nối." /><AppButton label="Quay lại" variant="quiet" onPress={() => navigation.goBack()} /></Screen>;
  if (!services) return <Screen><StatePanel title="Chưa thể mở trò chuyện" description="Cấu hình dịch vụ đang thiếu." /></Screen>;
  if (loading) return <Screen><AsyncStatePanel state="loading" title="Đang tải cuộc trò chuyện" description="Chỉ participant của match mới đọc được lịch sử." /></Screen>;
  return <Screen keyboardAware>
    <Text accessibilityRole="header" style={styles.title}>Trò chuyện</Text>
    {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
    {messages.length === 0 ? <StatePanel title="Hãy bắt đầu cuộc trò chuyện" description="Tin nhắn chỉ được tạo khi match đang hoạt động." /> : messages.map((message) => <View key={message.id} style={styles.message}><Text style={styles.messageText}>{message.content}</Text><Text style={styles.time}>{new Date(message.sentAt).toLocaleTimeString()}</Text></View>)}
    <AppTextField label="Tin nhắn" value={text} onChangeText={setText} multiline maxLength={4000} placeholder="Viết một lời chào tử tế" />
    <AppButton label={busy ? 'Đang gửi…' : 'Gửi tin nhắn'} disabled={busy || !text.trim()} onPress={() => void send()} />
    <AppButton label="Gọi thoại" variant="secondary" disabled={busy} onPress={() => void startAudio()} />
    <AppButton label="Hủy kết nối" variant="danger" disabled={busy} onPress={() => void services.matches.unmatch(matchId).then((result) => result.ok ? navigation.goBack() : setError(result.error.message))} />
  </Screen>;
}
const styles = StyleSheet.create({ title: { ...type.title, color: colors.ink }, error: { ...type.caption, color: colors.danger }, message: { padding: spacing.sm, gap: spacing.xs, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md }, messageText: { ...type.body, color: colors.ink }, time: { ...type.caption, color: colors.inkMuted } });
