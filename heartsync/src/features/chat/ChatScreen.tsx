import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { randomUUID } from 'expo-crypto';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ConversationProfile } from '../../shared/components/ConversationProfile';
import { useAuth } from '../auth/AuthProvider';
import { useAppServices } from '../../services/AppServicesProvider';
import { dedupeMessages } from '../../shared/domain/messages';
import { AppIcon } from '../../shared/components/AppIcon';
import { IconButton } from '../../shared/components/IconButton';
import { AppText } from '../../shared/components/AppText';
import { Screen } from '../../shared/components/Screen';
import type { RootStackParamList } from '../../navigation/types';
import { colors, fonts, radii, spacing } from '../../shared/theme/tokens';
import type { ChatMessage, ProfilePublic } from '../../shared/types/domain.types';
import { getCachedPublicProfile, setCachedPublicProfile } from '../../services/photoCache';
import { brandAssets } from '../../shared/utils/avatarHelper';
import { feedback } from '../../shared/motion/feedback';
import { AiIcebreakerAssistant } from '../ai/AiIcebreakerAssistant';

type Message = ChatMessage & { delivery?: 'sending' | 'failed' };
type ComposerTray = 'none' | 'emoji' | 'actions';

const QUICK_EMOJIS = [
  '💕',
  '🥰',
  '😊',
  '😍',
  '😘',
  '😂',
  '🤭',
  '✨',
  '🌸',
  '☕',
  '🧋',
  '🍜',
  '🎬',
  '🎵',
  '🎉',
  '👋',
] as const;

const QUICK_DATING_TEMPLATES = [
  {
    id: 'coffee',
    badge: '☕ Rủ cà phê',
    text: 'Cuối tuần này bạn rảnh không, mình đi cà phê trò chuyện nhé? ☕✨',
  },
  {
    id: 'compliment',
    badge: '🌸 Khen hồ sơ',
    text: 'Mình rất ấn tượng với hồ sơ và năng lượng tích cực của bạn đó 🌸😊',
  },
  {
    id: 'music',
    badge: '🎵 Hỏi sở thích',
    text: 'Dạo này bạn hay nghe nhạc gì hoặc có quán nào chill gợi ý cho mình với! 🎵',
  },
  {
    id: 'movie',
    badge: '🎬 Rủ xem phim',
    text: 'Tuần này có mấy phim mới hay lắm, đi xem cùng mình nhé? 🎬🍿',
  },
] as const;

export function ChatScreen(props: NativeStackScreenProps<RootStackParamList, 'Chat'>) {
  return <Conversation key={props.route.params?.matchId} {...props} />;
}

function Conversation({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Chat'>) {
  const services = useAppServices();
  const { user } = useAuth();
  const matchId = route.params?.matchId;
  const focused = useIsFocused();
  const focus = useRef(focused);
  useEffect(() => {
    focus.current = focused;
  }, [focused]);
  const subscriptionRef = useRef<{ unsubscribe(): void } | null>(null);
  const alive = useRef(true);
  const appActive = useRef(AppState.currentState === 'active');
  const [messages, setMessages] = useState<Message[]>([]);
  const current = useRef(messages);
  useEffect(() => {
    current.current = messages;
  }, [messages]);
  const [recipient, setRecipient] = useState<ProfilePublic | null>(null);
  useEffect(() => {
    let live = true;
    if (services && matchId) {
      void services.chat.getRecipient(matchId).then((r) => {
        if (live && r.ok) {
          setCachedPublicProfile(r.data);
          setRecipient(r.data);
        }
      });
    }
    return () => {
      live = false;
    };
  }, [services, matchId]);

  const [text, setText] = useState('');
  const [composerTray, setComposerTray] = useState<ComposerTray>('none');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const loadingOlder = useRef(false);
  const [enabled, setEnabled] = useState(false);
  const [startingCall, setStartingCall] = useState(false);
  const callStarting = useRef(false);
  const visible = useRef<string[]>([]);

  const merge = useCallback((items: ChatMessage[]) => {
    if (!alive.current || items.length === 0) return;
    setMessages((old) => {
      const next = dedupeMessages([...old, ...items])
        .map((m) => ({
          ...m,
          delivery: m.id.startsWith('local:') ? old.find((o) => o.id === m.id)?.delivery : undefined,
        }))
        .sort((a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt) || b.id.localeCompare(a.id));

      if (
        next.length === old.length &&
        next.every(
          (m, idx) =>
            m.id === old[idx].id &&
            m.readAt === old[idx].readAt &&
            m.content === old[idx].content &&
            m.delivery === old[idx].delivery,
        )
      ) {
        return old;
      }
      return next;
    });
  }, []);

  const markVisible = useCallback(() => {
    if (!services || !matchId || !focus.current || !appActive.current) return;
    const ids = current.current
      .filter((m) => visible.current.includes(m.id) && m.senderId !== user?.id && !m.readAt)
      .map((m) => m.id);
    if (ids.length) {
      void services.chat.markRead(matchId, ids).then((r) => {
        if (!r.ok && alive.current) setError(r.error.message);
      });
    }
  }, [services, matchId, user?.id]);

  const refresh = useCallback(async () => {
    if (!services || !matchId) {
      setLoading(false);
      return;
    }
    const active = await services.chat.isActive(matchId);
    if (!alive.current) return;
    if (!active.ok && active.error.code === 'forbidden') {
      setEnabled(false);
      setMessages([]);
      setError('Cuộc trò chuyện không còn khả dụng.');
      subscriptionRef.current?.unsubscribe();
      setLoading(false);
      return;
    }
    if (active.ok) {
      setEnabled(active.data);
      if (!active.data) subscriptionRef.current?.unsubscribe();
    }
    let next: string | undefined;
    const known = new Set(current.current.filter((m) => !m.delivery).map((m) => m.id));
    do {
      const result = await services.chat.listMessages(matchId, next);
      if (!alive.current) return;
      if (!result.ok) {
        setError(result.error.message);
        setLoading(false);
        return;
      }
      merge(result.data.items);
      if (!next && current.current.length === 0) setCursor(result.data.nextCursor);
      if (!known.size || result.data.items.some((m) => m.id === [...known].at(-1))) break;
      next = result.data.nextCursor ?? undefined;
    } while (next);
    setLoading(false);
  }, [services, matchId, merge]);

  useEffect(() => {
    alive.current = true;
    const sub =
      services && matchId
        ? services.chat.subscribe(
            matchId,
            (m) => merge([m]),
            (e) => setError(e.message),
          )
        : null;
    subscriptionRef.current = sub;
    const initial = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => {
      if (appActive.current) void refresh();
    }, 15_000);
    const state = AppState.addEventListener('change', (s) => {
      appActive.current = s === 'active';
      if (s === 'active') {
        void refresh();
        markVisible();
      }
    });
    return () => {
      alive.current = false;
      clearTimeout(initial);
      clearInterval(timer);
      sub?.unsubscribe();
      state.remove();
    };
  }, [services, matchId, refresh, merge, markVisible]);

  useEffect(() => {
    if (focused) markVisible();
  }, [focused, markVisible]);

  const send = async (message: Message) => {
    if (!services || !matchId || !enabled) return;
    setMessages((old) =>
      old.map((m) => (m.id === message.id ? { ...m, delivery: 'sending' } : m)),
    );
    const result = await services.chat.sendMessage({
      matchId,
      clientMessageId: message.clientMessageId,
      content: message.content,
    });
    if (!alive.current) return;
    if (result.ok) {
      merge([result.data]);
      setError('');
    } else {
      setMessages((old) =>
        old.map((m) =>
          m.clientMessageId === message.clientMessageId && m.id.startsWith('local:')
            ? { ...m, delivery: 'failed' }
            : m,
        ),
      );
      setError(result.error.message);
      if (result.error.code === 'forbidden') setEnabled(false);
    }
  };

  const submit = () => {
    if (!user || !matchId || !text.trim()) return;
    const id = randomUUID();
    const message: Message = {
      id: `local:${id}`,
      clientMessageId: id,
      matchId,
      senderId: user.id,
      content: text.trim(),
      sentAt: new Date().toISOString(),
      readAt: null,
      delivery: 'sending',
    };
    setMessages((old) => [message, ...old]);
    setText('');
    setComposerTray('none');
    void send(message);
  };

  const openRecipientProfile = () => {
    if (!recipient) return;
    feedback('selection');
    navigation.navigate('OtherProfile', { profileId: recipient.id });
  };

  const startCall = async (type: 'audio' | 'video') => {
    if (!services || !matchId || !enabled || callStarting.current) return;
    callStarting.current = true;
    setStartingCall(true);
    try {
      const result =
        type === 'video'
          ? await services.calls.startVideoCall(matchId)
          : await services.calls.startAudioCall(matchId);
      if (!alive.current) return;
      if (result.ok) {
        navigation.navigate(type === 'video' ? 'VideoCall' : 'AudioCall', {
          matchId,
          callId: result.data.id,
        });
      } else {
        setError(result.error.message);
      }
    } catch {
      if (alive.current) setError('Không thể bắt đầu cuộc gọi. Hãy thử lại.');
    } finally {
      callStarting.current = false;
      if (alive.current) setStartingCall(false);
    }
  };

  const older = async () => {
    if (!services || !matchId || !cursor || loadingOlder.current) return;
    loadingOlder.current = true;
    const r = await services.chat.listMessages(matchId, cursor);
    loadingOlder.current = false;
    if (!alive.current) return;
    if (r.ok) {
      merge(r.data.items);
      setCursor(r.data.nextCursor);
    } else setError(r.error.message);
  };

  const [viewability] = useState({ itemVisiblePercentThreshold: 80, minimumViewTime: 300 });
  const visibleCallback = ({ viewableItems }: { viewableItems: { item: Message }[] }) => {
    visible.current = viewableItems.map((i) => i.item.id);
    markVisible();
  };

  if (!matchId || !services) {
    return (
      <Screen safeTop>
        <AppText>Chưa thể mở cuộc trò chuyện.</AppText>
      </Screen>
    );
  }

  const canSend = Boolean(text.trim() && enabled);

  const composer = (
    <View style={styles.composerWrap}>
      {enabled ? (
        <View style={styles.aiStrip}>
          <AiIcebreakerAssistant
            key={`${matchId}:${enabled ? 'active' : 'inactive'}`}
            matchId={matchId}
            enabled={enabled}
            onSelect={setText}
          />
        </View>
      ) : null}

      {composerTray === 'emoji' ? (
        <View style={styles.trayContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
            contentContainerStyle={styles.emojiScroll}
          >
            {QUICK_EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                accessibilityRole="button"
                accessibilityLabel={`Chèn biểu tượng ${emoji}`}
                onPress={() => {
                  feedback('selection');
                  setText((prev) => `${prev}${emoji}`);
                }}
                style={({ pressed }) => [styles.emojiBtn, pressed && styles.pressableFeedback]}
              >
                <Text style={styles.emojiChar}>{emoji}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {composerTray === 'actions' ? (
        <View style={styles.trayContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
            contentContainerStyle={styles.quickActionScroll}
          >
            {QUICK_DATING_TEMPLATES.map((tpl) => (
              <Pressable
                key={tpl.id}
                accessibilityRole="button"
                accessibilityLabel={tpl.badge}
                onPress={() => {
                  feedback('selection');
                  setText(tpl.text);
                  setComposerTray('none');
                }}
                style={({ pressed }) => [styles.quickTemplatePill, pressed && styles.pressableFeedback]}
              >
                <Text style={styles.quickTemplateText}>{tpl.badge}</Text>
              </Pressable>
            ))}
            {recipient ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Xem hồ sơ của ${recipient.displayName}`}
                onPress={() => {
                  setComposerTray('none');
                  openRecipientProfile();
                }}
                style={({ pressed }) => [styles.quickActionPillSecondary, pressed && styles.pressableFeedback]}
              >
                <Text style={styles.quickActionSecondaryText}>👤 Xem hồ sơ</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.composer}>
        <View style={styles.inputCapsule}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chọn biểu tượng cảm xúc"
            disabled={!enabled}
            onPress={() => {
              feedback('selection');
              setComposerTray((cur) => (cur === 'emoji' ? 'none' : 'emoji'));
            }}
            style={({ pressed }) => [
              styles.capsuleIcon,
              composerTray === 'emoji' && styles.capsuleIconActive,
              pressed && styles.pressableFeedback,
            ]}
          >
            <AppIcon
              name="smile"
              color={composerTray === 'emoji' ? colors.primaryPressed : colors.inkMuted}
              size={22}
            />
          </Pressable>
          <TextInput
            accessibilityLabel="Tin nhắn"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={4000}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor={colors.inkMuted}
            editable={enabled}
            style={styles.composerInput}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mở tiện ích trò chuyện"
            disabled={!enabled}
            onPress={() => {
              feedback('selection');
              setComposerTray((cur) => (cur === 'actions' ? 'none' : 'actions'));
            }}
            style={({ pressed }) => [
              styles.capsuleIcon,
              composerTray === 'actions' && styles.capsuleIconActive,
              pressed && styles.pressableFeedback,
            ]}
          >
            <AppIcon
              name={composerTray === 'actions' ? 'close' : 'add'}
              color={colors.primaryPressed}
              size={22}
            />
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Gửi tin nhắn"
          disabled={!canSend}
          onPress={submit}
          style={({ pressed }) => [
            styles.sendCircle,
            !canSend && styles.sendCircleDisabled,
            pressed && canSend && styles.pressableFeedback,
          ]}
        >
          {canSend ? (
            <Image
              source={brandAssets.pinkButtonGradient}
              style={StyleSheet.absoluteFill}
              resizeMode="stretch"
            />
          ) : null}
          <AppIcon name="send" color="#FFFFFF" size={20} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <Screen
      scroll={false}
      keyboardAware
      safeTop
      footer={<View style={styles.composerShell}>{composer}</View>}
      contentStyle={styles.screen}
    >
      <View style={styles.chatHeader}>
        <IconButton
          icon="back"
          label="Quay lại kết nối"
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            recipient ? `Xem hồ sơ của ${recipient.displayName}` : 'Xem hồ sơ người trò chuyện'
          }
          disabled={!recipient}
          onPress={openRecipientProfile}
          style={({ pressed }) => [styles.headerProfileTouch, pressed && styles.pressableFeedback]}
        >
          <View style={styles.avatarOnlineWrap}>
            {recipient ? (
              <ConversationProfile
                profileId={recipient.id}
                profile={getCachedPublicProfile(recipient.id) ?? recipient}
                presentation="avatar"
              />
            ) : null}
            <View style={styles.headerOnlineDot} />
          </View>
          <View style={styles.headerCopy}>
            <AppText numberOfLines={1} style={styles.headerName}>
              {recipient?.displayName ?? 'Trò chuyện'}
            </AppText>
            <View style={styles.statusRow}>
              <View style={styles.statusDotInline} />
              <AppText variant="caption" style={styles.statusText}>
                Đang hoạt động · Xem hồ sơ
              </AppText>
            </View>
          </View>
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Gọi thoại"
            disabled={!enabled || startingCall}
            onPress={() => void startCall('audio')}
            style={({ pressed }) => [styles.callIconCircle, pressed && styles.pressableFeedback]}
          >
            <AppIcon name="phone" color={colors.primaryPressed} size={19} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Gọi video"
            disabled={!enabled || startingCall}
            onPress={() => void startCall('video')}
            style={({ pressed }) => [styles.callIconCircle, pressed && styles.pressableFeedback]}
          >
            <AppIcon name="video" color={colors.primaryPressed} size={20} />
          </Pressable>
        </View>
      </View>

      {error ? (
        <AppText accessibilityLiveRegion="polite" variant="caption" tone="danger" style={styles.error}>
          {error}
        </AppText>
      ) : null}

      <FlatList
        style={styles.messageList}
        contentContainerStyle={styles.messageContent}
        data={messages}
        inverted
        keyExtractor={(m) => m.id}
        refreshing={loading}
        onRefresh={() => void refresh()}
        onEndReached={() => void older()}
        onEndReachedThreshold={0.3}
        maintainVisibleContentPosition={{ minIndexForVisible: 0, autoscrollToTopThreshold: 40 }}
        viewabilityConfig={viewability}
        onViewableItemsChanged={visibleCallback}
        ListEmptyComponent={
          <AppText tone="muted" style={styles.empty}>
            {loading ? 'Đang tải…' : 'Hãy bắt đầu bằng một lời chào dễ thương nhé! 💕'}
          </AppText>
        }
        renderItem={({ item, index }) => {
          const mine = item.senderId === user?.id;
          const date = new Date(item.sentAt).toLocaleDateString('vi-VN');
          const prior = messages[index + 1];
          const timeText = new Date(item.sentAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
          const statusSuffix = mine
            ? item.delivery === 'sending'
              ? ' · Đang gửi'
              : item.delivery === 'failed'
                ? ' · Gửi lỗi'
                : item.readAt
                  ? ' · Đã xem'
                  : ' · Đã gửi'
            : '';

          return (
            <View style={styles.messageGroup}>
              {!prior || new Date(prior.sentAt).toLocaleDateString('vi-VN') !== date ? (
                <View style={styles.dayPill}>
                  <AppText variant="caption" tone="muted" style={styles.dayText}>
                    {date}
                  </AppText>
                </View>
              ) : null}

              <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                  <AppText style={[styles.content, { color: mine ? '#FFFFFF' : colors.ink }]}>
                    {item.content}
                  </AppText>
                  {item.delivery === 'failed' ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void send(item)}
                      style={styles.retryBtn}
                    >
                      <Text style={styles.retryText}>Gửi lại</Text>
                    </Pressable>
                  ) : null}
                </View>
                <Text style={[styles.timestampOutside, mine ? styles.timeRight : styles.timeLeft]}>
                  {timeText}
                  {statusSuffix}
                </Text>
              </View>
            </View>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 0,
    gap: 0,
    backgroundColor: '#FFF7F9',
  },
  chatHeader: {
    minHeight: 68,
    paddingHorizontal: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F6E0E9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    marginRight: -4,
  },
  headerProfileTouch: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: radii.lg,
  },
  pressableFeedback: {
    opacity: 0.78,
    transform: [{ scale: 0.96 }],
  },
  horizontalScroll: {
    flexGrow: 0,
  },
  avatarOnlineWrap: {
    position: 'relative',
  },
  headerOnlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: colors.online,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  headerName: {
    fontFamily: fonts.bold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.ink,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDotInline: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.online,
  },
  statusText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.inkMuted,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 4,
  },
  callIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAD6DF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageList: {
    flex: 1,
    backgroundColor: '#FFF7F9',
  },
  messageContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 8,
    flexGrow: 1,
  },
  messageGroup: {
    gap: 4,
  },
  dayPill: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAD6DF',
    marginVertical: 8,
  },
  dayText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.inkMuted,
  },
  bubbleRow: {
    maxWidth: '80%',
    gap: 3,
  },
  bubbleRowMine: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  bubbleRowTheirs: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 20,
    overflow: 'hidden',
  },
  mine: {
    borderBottomRightRadius: 6,
    backgroundColor: colors.primary,
    shadowColor: '#E6386F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
  theirs: {
    borderBottomLeftRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F5DCE6',
    shadowColor: '#D67094',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  content: {
    fontFamily: fonts.regular,
    fontSize: 15.5,
    lineHeight: 22,
  },
  timestampOutside: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.inkMuted,
    paddingHorizontal: 4,
  },
  timeRight: {
    textAlign: 'right',
  },
  timeLeft: {
    textAlign: 'left',
  },
  retryBtn: {
    marginTop: 4,
    paddingVertical: 2,
  },
  retryText: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  error: {
    color: colors.danger,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  empty: {
    padding: spacing.lg,
    textAlign: 'center',
  },
  composerShell: {
    backgroundColor: '#FFF7F9',
    borderTopWidth: 1,
    borderTopColor: '#F6E0E9',
    paddingBottom: 6,
  },
  composerWrap: {
    width: '100%',
  },
  aiStrip: {
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    paddingBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trayContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: 6,
    paddingBottom: 2,
  },
  emojiScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  emojiBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAD6DF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiChar: {
    fontSize: 20,
  },
  quickActionScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  quickTemplatePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: colors.primary,
  },
  quickTemplateText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.primaryPressed,
  },
  quickActionPillSecondary: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAD6DF',
  },
  quickActionSecondaryText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.ink,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  inputCapsule: {
    flex: 1,
    minHeight: 46,
    maxHeight: 110,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAD6DF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    shadowColor: '#D67094',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  capsuleIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsuleIconActive: {
    backgroundColor: '#F4EEF1',
  },
  composerInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 100,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink,
    paddingHorizontal: 6,
    paddingVertical: 8,
    textAlignVertical: 'center',
  },
  sendCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#E6386F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  sendCircleDisabled: {
    backgroundColor: '#F2CEDD',
    shadowOpacity: 0,
    elevation: 0,
  },
});
